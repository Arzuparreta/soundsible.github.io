# Guía de integración del agente Soundsible

Esta guía es para OpenClaw, agentes de Hermes, asistentes locales y habilidades de agentes que necesitan controlar un motor de estación Soundsible en ejecución.

Soundsible no es una API de música en la nube. Es un Station Engine autoalojado, generalmente en:

```text
http://localhost:5005
```

En LAN o Tailscale, reemplace `localhost` con la IP o el nombre de host de la estación.

En el modo de motor de escritorio, no se supone que la URL base sea `:5005`. Lea el JSON de preparación emitido por `python3 run.py --desktop-engine`/`soundsible_engine.py`, o consulte `/api/health` desde la URL de loopback conocida y utilice su `base_url` informado.

## Reglas del agente

1. Usa la API de agentes para controlar la reproducción: `/api/agent/*`, o los puntos finales generales de comandos de dispositivo `/api/devices/<device_id>/commands` y `/api/devices/transfer` (con el alcance `playback:control`).
2. No inventes identificadores de dispositivo. Consulta `/api/devices` y elige un `device_id` real o un `device_name` exacto.
3. Cada comando devuelve un estado final: `200` `{"status": "applied", "rev": n}`, `400`/`404`/`409` `{"status": "rejected", "reason": "..."}` o `503`/`504` `{"status": "unreachable", "reason": "offline" | "timeout"}`. Los comandos nunca responden `"sent"` y nunca escriben estado de reproducción en nombre de un dispositivo.
4. Deezer solo aporta metadatos. Soundsible nunca reproduce audio de Deezer.
5. Para obtener resultados de búsqueda reproducibles fuera de la biblioteca, usa la búsqueda de YouTube / YouTube Music mediante la ruta de yt-dlp del descargador.
6. Cada reproductor mantiene su propia lista de próximas canciones; el motor no tiene una cola de reproducción a la que un agente pueda añadir elementos. La cola de descargas solo descarga.
7. Usa `/api/agent/play` para «reproducir esto ahora» y `/api/agent/command` (`next`, `previous`, `pause`, `play`, `seek`) para recorrer lo que tiene en cola el reproductor.

## Autenticación

Los puntos finales del agente requieren un token de agente Soundsible.

Los tokens de agente ahora se almacenan en registros `auth_tokens` con alcance. La compatibilidad heredada con `agent_tokens` todavía existe internamente, pero las nuevas integraciones deberían tratar el modelo de token con alcance como la fuente de verdad.

Crea una ficha:

```bash
curl -X POST http://localhost:5005/api/agent/token \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>' \
  -d '{"name":"openclaw"}'
```

Si `SOUNDSIBLE_ADMIN_TOKEN` no está configurado, las rutas de administración solo se permiten desde redes LAN/Tailscale confiables.

La respuesta incluye el token sin formato una vez:

```json
{
  "token": "raw-token-value",
  "token_id": "uuid",
  "name": "openclaw",
  "created_at": "2026-05-05 18:00:00"
}
```

Guarde el token sin procesar en el almacén secreto del agente. Soundsible almacena sólo un hash.

Opcionalmente, puedes solicitar un conjunto de alcance más limitado al crear un token:

```bash
curl -X POST http://localhost:5005/api/agent/token \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>' \
  -d '{"name":"openclaw","scopes":["library:read","playback:control"]}'
```

Utilice uno de estos encabezados en rutas de agentes protegidas:

```text
Authorization: Bearer <agent-token>
X-Soundsible-Agent-Token: <agent-token>
```

Verificar un token:

```bash
curl http://localhost:5005/api/agent/verify \
  -H 'Authorization: Bearer <agent-token>'
```

## Modelo mental

Soundsible tiene tres conceptos independientes:

| Concepto             | Propósito                                                           | Punto final importante         |
| -------------------- | ------------------------------------------------------------------- | ------------------------------ |
| Biblioteca           | Pistas y listas de reproducción persistentes descargadas/importadas | `GET /api/library`             |
| Sesión del reproductor | Lo que reproduce un dispositivo, informado por ese dispositivo; el reproductor web y Android también informan de las próximas canciones (`session.queue`), pero la aplicación de iOS todavía no | `GET /api/playback/state` (solo lectura) |
| Cola de descarga     | Trabajos en segundo plano que descargan pistas a la biblioteca      | `POST /api/downloader/queue`   |

El reproductor activo normalmente es una pestaña del navegador, PWA, aplicación de escritorio o aplicación de Android. Cada copia en ejecución se registra como una instancia de su `device_id` mediante Socket.IO (`playback_register`), declarando su versión de protocolo y los comandos admitidos.

Los comandos HTTP del agente envían `device_command` directamente a la instancia de Socket.IO propietaria del dispositivo y esperan su confirmación (5 segundos, o 10 segundos para `session.import` durante una transferencia). Si el dispositivo está desconectado, no admite el protocolo, no declara el comando o no confirma a tiempo, el motor devuelve `unreachable` o `rejected` directamente en lugar de fingir que el comando tuvo éxito.

## Dispositivos

Listar dispositivos:

```bash
curl http://localhost:5005/api/devices
```

Respuesta de ejemplo:

```json
{
  "devices": [
    {
      "device_id": "dev-1775490811387-hu7wrzro8",
      "device_name": "Desktop",
      "device_type": "web",
      "form_factor": "computer",
      "online": true,
      "socket_active": true,
      "protocol": 1,
      "commands": ["transport.play", "transport.pause", "transport.next", "transport.previous", "transport.seek", "play.tracks"],
      "playing": {
        "track": { "id": "track-id", "title": "One More Time", "artist": "Daft Punk" },
        "is_playing": true,
        "position_sec": 42.1,
        "measured_at_ms": 1763820000000,
        "mode": "normal",
        "rev": 17
      }
    }
  ],
  "server_now_ms": 1763820001000
}
```

Cómo los agentes deben elegir un dispositivo:

1. Prefiere un dispositivo con `online: true` y `protocol` definido (no nulo).
2. Prefiera `device_type != "agent"` para la reproducción.
3. Si el usuario dice "Escritorio", seleccione el dispositivo cuyo `device_name` sea exactamente `Desktop`, o utilice su `device_id`.
4. Si no hay dispositivos en línea, dígale al usuario que abra Soundsible en un navegador, PWA o aplicación.

Registre un dispositivo de agente, opcional pero útil para el descubrimiento:

```bash
curl -X POST http://localhost:5005/api/devices/register \
  -H 'Content-Type: application/json' \
  -d '{"device_id":"openclaw-agent","device_name":"OpenClaw","device_type":"agent"}'
```

Los reproductores del navegador y las aplicaciones también se registran a través de Socket.IO. El registro HTTP por sí solo no hace que un dispositivo sea controlable; `online: true` con un `protocol` no nulo es la señal de que una instancia activa del reproductor está conectada y acepta comandos.

## Controlar la reproducción

Tanto `/api/agent/command` como `/api/agent/play` pasan por el despachador de comandos remotos (`POST /api/devices/<device_id>/commands`) y devuelven sus códigos de estado HTTP y respuestas JSON:

| HTTP | Cuerpo | Significado |
|---|---|---|
| `200` | `{"status": "applied", "rev": 18}` | El destino ejecutó el comando y publicó su estado actualizado |
| `400` | `{"status": "rejected", "reason": "invalid"}` | Comando desconocido o argumentos no válidos |
| `404` | `{"status": "rejected", "reason": "unknown_device"}` | Dispositivo de destino no encontrado (o ningún dispositivo registrado) |
| `404` | `{"status": "rejected", "reason": "not_found"}` | La pista solicitada o la búsqueda no devolvió ningún elemento reproducible |
| `409` | `{"status": "rejected", "reason": "update_required" \| "unsupported" \| "invalid_state" \| "not_found" \| "locked" \| "needs_gesture" \| "nothing_playing"}` | El destino rechazó el comando o no admite el protocolo/comando |
| `503` | `{"status": "unreachable", "reason": "offline"}` | El destino no tiene ninguna instancia de Socket.IO conectada |
| `504` | `{"status": "unreachable", "reason": "timeout"}` | El destino no confirmó a tiempo |

Los puntos finales heredados `POST /api/playback/remote-command` y `POST /api/playback/handoff` permanecen durante una versión como envoltorios ligeros sobre `POST /api/devices/<device_id>/commands` y `POST /api/devices/transfer`, devolviendo estas mismas formas de respuesta.

Pausar un dispositivo de destino:

```bash
curl -X POST http://localhost:5005/api/agent/command \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"command":"pause","device_id":"Desktop"}'
```

Reanudar la pista actual en un dispositivo de destino:

```bash
curl -X POST http://localhost:5005/api/agent/command \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"command":"play","device_id":"Desktop"}'
```

Saltar al siguiente:

```bash
curl -X POST http://localhost:5005/api/agent/command \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"command":"next","device_id":"Desktop"}'
```

Buscar una posición absoluta en la pista actual:

```bash
curl -X POST http://localhost:5005/api/agent/command \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"command":"seek","position_sec":75.5,"device_id":"Desktop"}'
```

La búsqueda utiliza segundos absolutos desde el inicio de la pista actual. Para buscar hasta el 1:15, envíe `position_sec: 75`. Para saltar hacia adelante o hacia atrás, primero lea `/api/playback/state` o `/api/devices`, sume o reste segundos de `position_sec` y luego envíe el nuevo valor absoluto.

Comandos admitidos:

```json
{"command":"pause"}
{"command":"play"}
{"command":"next"}
{"command":"previous"}
{"command":"seek","position_sec":75.5}
```

Para `seek`, se requiere `position_sec` y debe ser un número finito mayor o igual a `0`. `position_ms` también se acepta para clientes basados en milisegundos. El reproductor de destino ajusta posiciones más allá de la duración de la pista cargada hasta el final de la pista.

Si se omite `device_id`, Soundsible se dirige al dispositivo que no es agente visto más recientemente, prefiriendo dispositivos en línea.

## Reproducir música ahora

Reproducir una pista de la biblioteca por ID:

```bash
curl -X POST http://localhost:5005/api/agent/play \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"track_id":"<library-track-id>","device_id":"Desktop"}'
```

Reproducir por consulta de búsqueda:

```bash
curl -X POST http://localhost:5005/api/agent/play \
  -H 'Authorization: Bearer <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"query":"Daft Punk One More Time","device_id":"Desktop"}'
```

Comportamiento de búsqueda:

1. Soundsible busca primero en la biblioteca local.
2. Si no se encuentra ninguna coincidencia de biblioteca, busca en YouTube a través de yt-dlp.
3. El motor envía `play.tracks` con el descriptor de pista acotado a la instancia propietaria del reproductor de destino.

Respuesta esperada cuando la aplica un dispositivo en vivo:

```json
{
  "status": "applied",
  "rev": 19
}
```

Si el dispositivo está registrado pero fuera de línea, el motor devuelve HTTP `503`:

```json
{
  "status": "unreachable",
  "reason": "offline"
}
```

### Limitación de reproducción automática del navegador

Después de recargar el navegador, es posible que la página no tenga activación por parte del usuario. En ese estado, Chrome, Safari y Firefox pueden rechazar llamadas audibles de `audio.play()` que se originan en comandos remotos.

Cuando el navegador bloquea el inicio del audio, el destino responde con HTTP `409`:

```json
{
  "status": "rejected",
  "reason": "needs_gesture"
}
```

Comportamiento del agente:

1. Si `/api/agent/play` o `/api/agent/command` devuelve `status: "applied"`, el destino ejecutó la acción y publicó su nuevo estado.
2. Si devuelve `409` con `reason: "needs_gesture"`, dígale al usuario que toque reproducir en ese dispositivo para desbloquear el audio del navegador.
3. Una vez que el usuario ha iniciado audio en esa sesión de página, los comandos remotos posteriores de reproducción, pausa, reanudación, salto y búsqueda funcionan sin este aviso.

Esta es una política de seguridad del navegador, no un fallo de la API de Soundsible. Para evitarla por completo, utilice una superficie de reproducción nativa como la aplicación de Android o la aplicación de escritorio.

## Biblioteca

Obtenga la biblioteca completa:

```bash
curl http://localhost:5005/api/library
```

Biblioteca de búsqueda:

```bash
curl 'http://localhost:5005/api/library/search?q=radiohead'
```

La respuesta de la biblioteca incluye pistas persistentes. Una pista normal tiene un Soundsible `id` estable. Utilice ese `id` para:

```json
{"track_id":"<id>"}
```

Rutas útiles de la biblioteca:

| Método | Ruta | Finalidad |
|---|---|---|
| `GET` | `/api/library` | Metadatos completos de la biblioteca |
| `GET` | `/api/library/search?q=...` | Buscar en la biblioteca local |
| `GET` | `/api/library/albums?sort=&genre=&year=` | Álbumes del catálogo normalizado. `sort` es uno de `newest`, `alphabeticalByName`, `alphabeticalByArtist`, `byYear`, `byGenre`, `random`, `frequent`, `recent`, `highest`; un valor desconocido devuelve un 400 |
| `GET` | `/api/library/albums/<album_id>` | Un disco y sus identificadores de pista, ordenados por disco y pista |
| `GET` | `/api/library/artists` | Artistas con alguna pista a su nombre, obtenidos de `track_artists` |
| `GET` | `/api/library/artists/<artist_id>` | Un artista: las pistas en las que participa y los discos en cuyos créditos figura |
| `GET` | `/api/library/genres` | Géneros presentes, con el número de canciones y álbumes |
| `GET` | `/api/library/years` | Años de publicación presentes, con el número de álbumes y pistas |
| `POST` | `/api/library/scan` | Iniciar un análisis asíncrono de los directorios raíz de música configurados; el cuerpo opcional `{"path":"..."}` debe quedar dentro de uno de ellos |
| `GET` | `/api/library/scan` | Estado y contadores del análisis actual o del último |
| `GET` | `/api/library/saved-entities` | Álbumes y artistas marcados de esta cuenta, con los más recientes primero: `{"entities":[...]}` |
| `PUT` | `/api/library/saved-entities` | Guardar o quitar de forma idempotente, con el cuerpo `{"saved":true,"entry":{"kind":"album","name":"Record","artist":"Band","destination":"/album/Record?artist=Band&deezer_id=123","cover":"https://..."}}`; requiere `library:write` |
| `GET` | `/api/library/favourites` | Identificadores de pistas favoritas (solo aquellas de las que tienes un archivo) |
| `GET` | `/api/library/favourites/entries` | Todas las canciones guardadas, descargadas o no: `{"version":2,"favourites":[{"keys":[...],"title","artist",...}]}` |
| `POST` | `/api/library/favourites/toggle` | Marcar o desmarcar como favorita, con el cuerpo `{"track_id":"..."}` o `{"favourite":{"keys":["yt:<video_id>"],"title":"...","artist":"..."}}` |
| `POST` | `/api/library/saved/set` | Guardar o quitar varias canciones a la vez, con el cuerpo `{"saved":true,"entries":[{"keys":[...],"title":"...","artist":"..."}]}`, hasta un máximo de 500 entradas. Nunca invierte el estado de una canción: al guardar, omite las que ya están guardadas; al quitar, conserva los favoritos y las canciones que tienen archivo. Devuelve `{"changed":N}`; requiere `library:write` |
| `POST` | `/api/catalog/album/download` | Descargar todas las canciones de un álbum de Deezer que aún no estén en la biblioteca, con el cuerpo `{"deezer_id":"302127"}`. Devuelve `202` con el trabajo. Si hay un trabajo abierto para el álbum, lo devuelve tal cual; si está detenido, lo reanuda; si ha terminado, crea una nueva pasada; requiere `library:write` |
| `GET` | `/api/catalog/album/download?deezer_id=` | La última descarga de ese álbum, canción por canción (`state`, `candidates`), o `null`. Las coincidencias dudosas esperan en `needs_review`: resuélvelas con `POST /api/migration/jobs/<id>/decision` y reanuda con `POST /api/migration/jobs/<id>/control` `{"action":"resume"}` |
| `GET` | `/api/catalog/artist/discography?deezer_id=` | Los álbumes de un artista, seguidos de sus sencillos y EP, en una única `tracklist` con cada grabación una sola vez (un ISRC); se excluyen los recopilatorios. También incluye `releases` (con sus `track_ids`), `partial_failures` (lanzamientos que no se han podido leer) y `truncated` (si se superan las 2000 canciones) |
| `POST` | `/api/catalog/artist/download` | Descargar esa discografía: todas las canciones que falten en la biblioteca, cada una archivada en su propio lanzamiento. Se aplican las mismas reglas de trabajo que en la ruta de álbumes; requiere `library:write` |
| `GET` | `/api/catalog/artist/download?deezer_id=` | La última descarga de ese artista, canción por canción, o `null` |
| `POST` | `/api/library/playlists` | Crear una lista de reproducción, con el cuerpo `{"name":"..."}` |
| `POST` | `/api/library/playlists/<name>/tracks` | Añadir una pista a una lista de reproducción, con el cuerpo `{"track_id":"..."}` |
| `DELETE` | `/api/library/playlists/<name>/tracks/<track_id>` | Quitar una pista de una lista de reproducción |

Los marcadores de álbumes y artistas son referencias de navegación, independientes de las canciones guardadas,
los favoritos y las descargas. `kind` es `album` o `artist`; `name` y un
`destination` interno son obligatorios. Los campos opcionales `artist` y `cover` conservan los metadatos de presentación.
El servidor deriva las claves de identidad de `album_id`/`artist_id` y `deezer_id` en el
destino, y asigna `id` y `added_at`. Las referencias sin identificadores quedan
sin resolver; los nombres por sí solos nunca se fusionan con ediciones o artistas identificados. Ambos
métodos devuelven la colección completa. Usa `saved: false` con la misma entrada para
quitarla. El evento por usuario `saved_entities_updated` invalida las lecturas en caché.
La ruta y los controles de marcadores del reproductor web solo modifican el marcador.
Añadir todas las canciones a Canciones y descargar una colección son comandos separados y explícitos
del menú de opciones de la página del álbum o del artista. El mismo panel se abre desde
la foto o el nombre de la cabecera con un clic izquierdo o derecho, mediante el teclado o con una
pulsación prolongada en el móvil. Quitar un marcador nunca
elimina canciones guardadas ni descargas.
Si falla el guardado persistente, se devuelve un error sin descartar la colección anterior;
las copias de seguridad de la instancia incluyen automáticamente el archivo `saved_entities.json` de la cuenta.

La raíz de Biblioteca en la web (`#/`, también `#/library`) contiene accesos directos a las colecciones y
filas de álbumes y artistas guardados. Las canciones, los álbumes y los artistas se abren en
`#/library?view=songs|albums|artists`; las colecciones guardadas se abren en
`#/?saved=albums|artists`. Todas estas subentradas se pueden seleccionar en los ajustes de la barra
inferior. Seleccionar Biblioteca siempre devuelve a su raíz. El explorador de NORMAL/DJ
conserva sus secciones actuales, con una sección adicional de Guardados. En
escritorio, las subentradas de la barra lateral permiten cambiar entre canciones, álbumes y artistas;
el buscador de la biblioteca aparece debajo del título, junto al control de ordenación.

Las rutas de mutación pueden requerir autorización de administrador o acceso LAN/Tailscale confiable.

Los escaneos de carpetas requieren `library:write`. Un inicio exitoso devuelve HTTP `202`; sondee la ruta `GET` hasta que `state` sea `completed` o `failed`. Repetir el inicio durante `queued` o `scanning` devuelve el mismo `scan_id`. Los análisis son aditivos: utilice la ruta de purga separada cuando los archivos fuente faltantes deban eliminarse del catálogo.

## Cola de descarga

Esta cola descarga audio en la biblioteca persistente. No reproduce nada.

Utilice este punto final solo cuando el usuario quiera **descargar/importar música a la biblioteca**:

```http
POST /api/downloader/queue
```

El cuerpo de la solicitud es siempre un objeto con una matriz `items`:

```json
{
  "items": [
    {
      "song_str": "..."
    }
  ]
}
```

No envíe un objeto de elemento desnudo. No envíe un `video_id` desnudo. No envíe aquí objetos `preview`.

Buscar YouTube / YouTube Music:

```bash
curl 'http://localhost:5005/api/downloader/youtube/search?q=Daft%20Punk%20One%20More%20Time&limit=5&source=ytmusic'
```

Valores válidos de `source`:

```text
ytmusic
music
youtube
```

`source=ytmusic` y `source=music` buscan YouTube Music. `source=youtube` busca YouTube normal.

Eche un vistazo a una URL o ID de YouTube, sin hacer cola ni descargar:

```bash
curl 'http://localhost:5005/api/downloader/youtube/peek?id=dQw4w9WgXcQ'
```

### Descargar formatos de elementos de cola

Hay tres formas de elementos musicales compatibles.

#### 1. Recomendado: resultado YouTube / YouTube Music resuelto

Utilícelo cuando el agente haya buscado `/api/downloader/youtube/search` y haya seleccionado un resultado. Envíe una URL YouTube completa en `song_str` e incluya `video_id`.

Si el resultado de la búsqueda tiene `webpage_url`, úselo. Si solo tiene un `id` de 11 caracteres, compila:

```text
https://www.youtube.com/watch?v=<id>
```

Ejemplo:

```bash
curl -X POST http://localhost:5005/api/downloader/queue \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>' \
  -d '{
    "items": [
      {
        "source_type": "ytmusic_search",
        "song_str": "https://www.youtube.com/watch?v=FGBhQbmPwH8",
        "video_id": "FGBhQbmPwH8",
        "display_title": "One More Time",
        "display_artist": "Daft Punk",
        "duration_sec": 320,
        "thumbnail_url": "https://img.youtube.com/vi/FGBhQbmPwH8/mqdefault.jpg",
        "metadata_evidence": {
          "title": "One More Time",
          "artist": "Daft Punk",
          "album": "Discovery"
        }
      }
    ]
  }'
```

Utilice `source_type: "ytmusic_search"` para obtener un resultado seleccionado de la búsqueda YouTube Music. Utilice `source_type: "youtube_search"` para obtener un resultado seleccionado de la búsqueda normal de YouTube. Utilice `source_type: "youtube_url"` para obtener una URL YouTube proporcionada por el usuario.

Importante: los tipos de fuente YouTube explícitos requieren una URL YouTube en `song_str`. Esto no es válido:

```json
{
  "items": [
    {
      "source_type": "ytmusic_search",
      "song_str": "Daft Punk One More Time"
    }
  ]
}
```

#### 2. URL YouTube proporcionada por el usuario

Úselo cuando el usuario proporcione una URL YouTube directamente. `source_type` es opcional porque Soundsible puede inferir las URL de YouTube, pero incluirlo es más claro.

```bash
curl -X POST http://localhost:5005/api/downloader/queue \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>' \
  -d '{
    "items": [
      {
        "source_type": "youtube_url",
        "song_str": "https://www.youtube.com/watch?v=FGBhQbmPwH8",
        "video_id": "FGBhQbmPwH8"
      }
    ]
  }'
```

No envíes solo la identificación del video:

```json
{
  "items": [
    {
      "video_id": "FGBhQbmPwH8"
    }
  ]
}
```

Esto se rechaza porque el descargador necesita que `song_str` diga qué descargar.

#### 3. Reserva de texto sin formato

Use esto solo cuando el agente aún no haya resuelto el resultado de YouTube y quiera que Soundsible busque durante el procesamiento. No configure `source_type`.

```bash
curl -X POST http://localhost:5005/api/downloader/queue \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>' \
  -d '{
    "items": [
      {
        "song_str": "Daft Punk - One More Time",
        "metadata_evidence": {
          "title": "One More Time",
          "artist": "Daft Punk"
        }
      }
    ]
  }'
```

Este camino es menos preciso. Para los flujos de trabajo de los agentes, prefiera buscar primero, seleccionar un resultado y luego poner en cola el formato de URL resuelto.

### Respuesta aceptada

ID de artículos aceptados para devoluciones exitosas en cola:

```json
{
  "status": "queued",
  "ids": ["download-job-id"],
  "accepted": [
    {
      "index": 0,
      "id": "download-job-id",
      "source_type": "ytmusic_search"
    }
  ],
  "rejected": []
}
```

Es posible un fallo parcial. Inspeccione siempre tanto `accepted` como `rejected`.

Razones comunes de rechazo:

| Razón                                                    | Significado                                                                                       | Arreglar                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `No JSON data received`                                  | El cuerpo estaba vacío o no era JSON.                                                             | Enviar `Content-Type: application/json` y un objeto JSON |
| `Item must be an object`                                 | Una entrada `items` no era un objeto                                                              | Poner objetos dentro de `items`                          |
| `Missing source_type/song_str`                           | No hay entrada utilizable                                                                         | Incluir `song_str`                                       |
| `Invalid or unsupported YouTube URL or missing video_id` | El tipo de fuente YouTube explícito no tenía ninguna URL/identificación de video YouTube completa | Enviar URL completa en `song_str` y `video_id`           |
| `Playlist-only or invalid YouTube URL (missing v=)`      | La URL no es la URL de un único vídeo.                                                            | Elige un vídeo específico                                |
| `This link type is not supported`                        | Enlace Spotify o fuente no compatible                                                             | Resolver primero a través de YouTube Music               |

Iniciar procesamiento:

```bash
curl -X POST http://localhost:5005/api/downloader/start \
  -H 'Authorization: Bearer <SOUNDSIBLE_ADMIN_TOKEN>'
```

Verificar cola de descarga:

```bash
curl http://localhost:5005/api/downloader/queue/status
```

Cuando finalizan las descargas, Soundsible emite `library_updated` y la pista aparece en `/api/library`.

### Reglas de decisión del agente para descargas

1. Si el usuario dice "descargar este enlace YouTube", ponga en cola `source_type: "youtube_url"` con `song_str` como URL completa.
2. Si el usuario dice "descargar canción por artista", primero llame a `/api/downloader/youtube/search?source=ytmusic`, elija el mejor resultado y luego ponga en cola el formato de URL resuelto.
3. Si la búsqueda no está disponible o no es concluyente, ponga en cola el texto sin formato solo con `song_str` y `metadata_evidence` opcional; no agregue `source_type`.
4. Nunca utilice ID de Deezer, URL de Spotify, objetos de vista previa ni cargas útiles sin formato solo de `video_id` para `/api/downloader/queue`.
5. Después de hacer cola, llame a `/api/downloader/start`; la cola por sí sola no comienza a procesarse.

## Descubrimiento Deezer

Las rutas Deezer son solo metadatos.

Rutas de proxy permitidas:

```text
chart
search
playlist/<numeric-id>
track/<numeric-id>
artist/<numeric-id>/top
```

Ejemplos:

```bash
curl 'http://localhost:5005/api/discovery/deezer/search?q=daft%20punk'
curl 'http://localhost:5005/api/discovery/deezer/chart'
curl 'http://localhost:5005/api/discovery/deezer/playlist/3155776842'
```

Los ID de pista Deezer no son ID de pista Soundsible reproducibles. Una fila Deezer es una sugerencia de metadatos. Para jugarlo:

1. Extraiga `title` y `artist.name` de la respuesta Deezer.
2. Buscar YouTube Music: `/api/downloader/youtube/search?q=<artist title>&source=ytmusic`.
3. Elija el mejor resultado.
4. O:
   - juega ahora con `/api/agent/play` usando la consulta, o
   - agréguelo a `/api/downloader/queue` para descargarlo en la biblioteca.

No llame a `/api/agent/play` con `track_id: "deezer_123"` o una identificación numérica sin formato Deezer.

## Estado de reproducción, reanudación y transferencia

Los reproductores escriben periódicamente el estado:

```http
PUT /api/playback/state
```

El estado incluye:

```json
{
  "track_id": "track-or-video-id",
  "position_sec": 42.5,
  "is_playing": true,
  "device_id": "dev-...",
  "device_name": "Desktop",
  "device_type": "desktop"
}
```

Los reproductores también pueden publicar junto a él un objeto `session`: la cola, las
preferencias de reproducción y el espacio de trabajo de DJ de la canción. Esto
permite que otro dispositivo retome la sesión en lugar de solo la pista. Es una
actualización parcial: si se omite la clave, se conserva lo que haya almacenado para ese dispositivo; si se envía `null`,
se finaliza. Los agentes no tienen motivos para escribir este objeto, y un agente que inicie una
canción ajena a la sesión en un dispositivo debe enviar `"session": null` para que el dispositivo no
restaure una cola que no contenga esa pista. Se descartan las sesiones de más de 256 KB.

Estado de lectura:

```bash
curl http://localhost:5005/api/playback/state
```

Leer el estado de otro dispositivo, excluyendo el dispositivo actual:

```bash
curl 'http://localhost:5005/api/playback/state?exclude_device=<device-id>'
```

Mover la reproducción de un dispositivo a otro:

```bash
curl -X POST http://localhost:5005/api/devices/transfer \
  -H 'Content-Type: application/json' \
  -d '{"from_device_id":"dev-phone","to_device_id":"dev-desktop"}'
```

(`POST /api/playback/handoff` permanece durante una versión como envoltorio sobre `POST /api/devices/transfer` con el mismo cuerpo y respuestas.)

Comportamiento de transferencia:

1. Envía `session.export` a `from_device_id` (o usa su último estado publicado si está desconectado o no tiene protocolo). Si no se reproduce ninguna pista, devuelve `409` `{"status": "rejected", "reason": "nothing_playing", "step": "export"}`.
2. Envía `session.import` a `to_device_id` (tiempo de espera de 10 s). Si falla, devuelve el error con `"step": "import"` y deja a `from_device_id` reproduciendo.
3. Solo después de que `to_device_id` responda `applied`, envía `session.release` a `from_device_id` si está en línea (los fallos aquí se registran y la respuesta sigue siendo `applied`).

Comportamiento de búsqueda:

1. `POST /api/agent/command` con `{"command":"seek","position_sec":...}` envía `transport.seek` a la instancia propietaria del destino y espera su confirmación.
2. El motor nunca escribe el estado de reproducción en nombre del dispositivo; el reproductor busca y publica su estado actualizado antes de confirmar `applied`.
3. Si no suena nada en el destino, el destino responde `409` `{"status": "rejected", "reason": "nothing_playing"}` (o `invalid_state`).

## Pódcasts

El descubrimiento y la reproducción de podcasts son independientes de la búsqueda de música.

Rutas útiles:

| Método | Ruta | Finalidad |
|---|---|---|
| `GET` | `/api/discovery/podcasts/search?q=...` | Buscar en el directorio de pódcasts |
| `GET` | `/api/discovery/podcasts/top?country=US&limit=25` | Pódcasts más populares |
| `GET` | `/api/podcasts/subscriptions` | Canales suscritos |
| `POST` | `/api/podcasts/subscribe` | Suscribirse con los datos del canal |
| `GET` | `/api/podcasts/feeds/<feed_id>/episodes` | Episodios de un canal |
| `GET` | `/api/podcasts/episodes-by-url?rss_url=...` | Programa de un canal (`title`, `author`, `image_url`) y episodios, sin suscribirse |
| `POST` | `/api/podcasts/enclosure/peek` | Crear un token de transmisión para un archivo adjunto |
| `GET` | `/api/podcasts/stream/<token>` | Transmitir audio del pódcast |

Los elementos de la cola de vista previa de podcasts usan `enclosure_url`, no `video_id`.

## Flujo de habilidades del agente recomendado

Para "reproducir X en mi escritorio":

1. Verifique el token con `GET /api/agent/verify`.
2. Leer dispositivos con `GET /api/devices`.
3. Seleccione `Desktop` con `online: true` y `protocol` definido; si falta, pida al usuario que abra `/player/desktop/`.
4. Llame a `POST /api/agent/play` con `{"query":"X","device_id":"Desktop"}`.
5. Compruebe la respuesta: `applied` significa que el destino reprodujo y publicó el estado; `unreachable` (`offline`/`timeout`) o `rejected` (`needs_gesture`, `update_required`, etc.) explica por qué no lo hizo.

Para «añadir X a la cola»: la lista de próximas canciones pertenece al reproductor y
no existe un punto de acceso que permita añadir elementos. Ofrece reproducir X ahora
(`/api/agent/play`) o descargarlo en la biblioteca (`/api/downloader/queue`).

Para "buscar a 1:15" o "saltar a 75 segundos":

1. Lea dispositivos con `GET /api/devices` y apunte a un reproductor de navegador activo.
2. Envíe `POST /api/agent/command` con `{"command":"seek","position_sec":75,"device_id":"Desktop"}`.
3. Para búsqueda relativa, lea `/api/playback/state`, calcule la nueva posición absoluta y luego envíe `seek`.

Para "descargar X":

1. Buscar YouTube Music: `GET /api/downloader/youtube/search?q=X&source=ytmusic&limit=5`.
2. Elija el mejor resultado. Utilice `webpage_url` como `song_str`; si falta, compila `https://www.youtube.com/watch?v=<id>`.
3. Póngalo en cola con `POST /api/downloader/queue` como `{"items":[{"source_type":"ytmusic_search","song_str":"https://www.youtube.com/watch?v=<id>","video_id":"<id>","display_title":"...","display_artist":"..."}]}`.
4. Comience a procesar con `POST /api/downloader/start`.
5. Encuesta `/api/downloader/queue/status`.
6. Actualizar la biblioteca una vez finalizada.

Para "descargar esta URL YouTube":

1. Póngalo en cola con `POST /api/downloader/queue` como `{"items":[{"source_type":"youtube_url","song_str":"<full-youtube-url>"}]}`.
2. Comience a procesar con `POST /api/downloader/start`.

Para "reproducir esta pista Deezer":

1. Trate a Deezer únicamente como metadatos.
2. Busque YouTube Music para `artist + title`.
3. Juega el partido YouTube Music o agrégalo como vista previa.

## Solución de problemas

Verifique el estado del dispositivo/enchufe:

```bash
curl http://localhost:5005/api/agent/debug/socketio \
  -H 'Authorization: Bearer <agent-token>'
```

Problemas comunes:

| Síntoma                                                            | Significado                                                                                 | Arreglar                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `503 unreachable` (`offline`) | El dispositivo está registrado pero no tiene ninguna instancia Socket.IO conectada | Abrir/recargar el reproductor en ese dispositivo |
| `504 unreachable` (`timeout`) | La instancia de destino no confirmó el comando a tiempo | Reintentar o comprobar la pestaña/aplicación del reproductor |
| `404 rejected` (`unknown_device`) | El agente utilizó un ID/nombre de dispositivo desconocido o no hay ningún dispositivo registrado | Llame a `/api/devices` y apunte a un dispositivo real |
| `409 rejected` (`update_required`) | El dispositivo está en línea sin protocolo de control remoto (aplicación antigua) | Actualizar Soundsible en ese dispositivo |
| `409 rejected` (`needs_gesture`) | La política de reproducción automática del navegador bloqueó el audio tras una recarga reciente | Pedir al usuario que toque reproducir una vez en ese dispositivo |
| `400 rejected` (`invalid`) en búsqueda | El agente envió `seek` sin un `position_sec` válido no negativo | Enviar `{"command":"seek","position_sec":75}` |
| `409 rejected` (`nothing_playing`) | El dispositivo de destino no tiene ninguna pista actual | Inicie la reproducción primero o apunte al dispositivo activo desde `/api/devices` |
| La identificación de Deezer falla                                  | Los ID de Deezer son solo metadatos                                                         | Resolver por título/artista mediante YouTube Music                                                                           |
| La cola de descarga rechaza el `video_id` sin procesar             | `/api/downloader/queue` requiere `items[].song_str`                                         | Enviar URL completa de YouTube en `song_str` más `video_id`                                                                  |
| La cola de descarga rechaza `ytmusic_search` con texto sin formato | Los tipos de fuente YouTube explícitos requieren URL de YouTube resueltas                   | Busque primero, luego ponga en cola la URL del resultado seleccionado; u omita `source_type` para utilizar texto sin formato |
| Canción descargada no visible                                      | El trabajo de descarga no ha finalizado o la biblioteca no está sincronizada                | Marque `/api/downloader/queue/status`, luego `/api/library/sync` si es necesario                                             |

## Resumen mínimo de estilo OpenAPI

```text
GET  /api/health
GET  /api/devices
POST /api/devices/register
POST /api/devices/<device_id>/commands
POST /api/devices/transfer

POST /api/agent/token          admin
GET  /api/agent/verify         agent token
POST /api/agent/play           agent token
POST /api/agent/command        agent token; pause/play/next/previous/seek
GET  /api/agent/debug/socketio agent token

GET  /api/library
GET  /api/library/search?q=
GET  /api/library/albums
GET  /api/library/albums/<album_id>
GET  /api/library/artists
GET  /api/library/artists/<artist_id>
GET  /api/library/genres
GET  /api/library/years
GET  /api/library/favourites
GET  /api/library/favourites/entries
POST /api/library/favourites/toggle
POST /api/library/playlists
POST /api/library/playlists/<name>/tracks

GET    /api/playback/state
PUT    /api/playback/state
POST   /api/playback/remote-command   wrapper over /api/devices/<id>/commands
POST   /api/playback/handoff          wrapper over /api/devices/transfer

GET  /api/downloader/youtube/search?q=&limit=&source=
GET  /api/downloader/youtube/peek?id=
POST /api/downloader/queue    admin/trusted
GET  /api/downloader/queue/status
POST /api/downloader/start    admin/trusted

GET /api/discovery/deezer/<allowlisted-path>
GET /api/discovery/podcasts/search?q=
GET /api/discovery/podcasts/top
```
