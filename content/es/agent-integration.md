# Guía de integración del agente Soundsible

Esta guía es para OpenClaw, agentes de Hermes, asistentes locales y habilidades de agentes que necesitan controlar un motor de estación Soundsible en ejecución.

Soundsible no es una API de música en la nube. Es un Station Engine autoalojado, generalmente en:

```text
http://localhost:5005
```

En LAN o Tailscale, reemplace `localhost` con la IP o el nombre de host de la estación.

En el modo de motor de escritorio, no se supone que la URL base sea `:5005`. Lea el JSON de preparación emitido por `python3 run.py --desktop-engine`/`soundsible_engine.py`, o consulte `/api/health` desde la URL de loopback conocida y utilice su `base_url` informado.

## Reglas del agente

1. Utilice la API del agente para el control de reproducción: `/api/agent/*`.
2. No inventes identificaciones de dispositivos. Lea `/api/devices` y apunte a un `device_id` real o un `device_name` exacto.
3. Si una respuesta incluye `warning: "Device appears offline (no active socket)"`, el comando se emitió pero actualmente no hay ningún reproductor de navegador conectado a esa sala de dispositivos.
4. Deezer son solo metadatos. Soundsible nunca reproduce audio Deezer.
5. Para obtener resultados de búsqueda reproducibles fuera de la biblioteca, utilice la búsqueda YouTube / YouTube Music a través de la ruta ODST / yt-dlp.
6. La cola de reproducción no es la misma que la cola de descarga.
7. Prefiera `/api/agent/play` para "reproducir esto ahora". Prefiera `/api/playback/queue` para "agregar esto a la cola de reproductores".

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
| Cola de reproducción | Cola en memoria consumida por el reproductor web                    | `GET/POST /api/playback/queue` |
| Cola de descarga     | Trabajos en segundo plano que descargan pistas a la biblioteca      | `POST /api/downloader/queue`   |

El reproductor activo normalmente es una pestaña del navegador o PWA en `/player/` o `/player/desktop/`. El reproductor registra un dispositivo y se une a una sala Socket.IO:

```text
playback:{scope}:{device_id}
```

El alcance actual es `default`.

Los comandos HTTP del agente emiten eventos Socket.IO en la sala del dispositivo de destino. Si el navegador de destino no está conectado, Soundsible puede aceptar la solicitud pero el dispositivo no reaccionará.

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
      "device_type": "desktop",
      "scope": "default",
      "active_sid": "abc123",
      "socket_connected": true,
      "last_seen_ts": 1775490830.0
    }
  ]
}
```

Cómo los agentes deben elegir un dispositivo:

1. Prefiere un dispositivo con el conjunto `active_sid`.
2. Prefiera `device_type != "agent"` para la reproducción.
3. Si el usuario dice "Escritorio", seleccione el dispositivo cuyo `device_name` sea exactamente `Desktop`, o utilice su `device_id`.
4. Si no hay dispositivos con `active_sid`, dígale al usuario que abra Soundsible en un navegador o PWA.

Registre un dispositivo de agente, opcional pero útil para el descubrimiento:

```bash
curl -X POST http://localhost:5005/api/devices/register \
  -H 'Content-Type: application/json' \
  -d '{"device_id":"openclaw-agent","device_name":"OpenClaw","device_type":"agent"}'
```

Los reproductores del navegador también se registran a través de Socket.IO. El registro HTTP por sí solo no hace que un dispositivo sea controlable; `active_sid` es la señal de que está conectado un reproductor Socket.IO real.

## Controlar la reproducción

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

La búsqueda utiliza segundos absolutos desde el inicio de la pista actual. Para buscar hasta el 1:15, envíe `position_sec: 75`. Para saltar hacia adelante o hacia atrás, primero lea `/api/playback/state`, sume o reste segundos de `position_sec` y luego envíe el nuevo valor absoluto.

Comandos admitidos:

```json
{"command":"pause"}
{"command":"play"}
{"command":"next"}
{"command":"seek","position_sec":75.5}
```

Para `seek`, se requiere `position_sec` y debe ser un número mayor o igual a `0`. `position_ms` también se acepta para clientes basados ​​en milisegundos. El navegador de destino fija posiciones más allá de la duración de la pista cargada hasta el final de la pista.

Si se omite `device_id`, Soundsible se dirige al dispositivo que no es agente registrado más recientemente, prefiriendo dispositivos con un socket activo.

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
2. Si no se encuentra ninguna coincidencia de biblioteca, busca YouTube Music a través de yt-dlp.
3. El reproductor objetivo recibe una carga útil de pista de biblioteca o una carga útil de vista previa.

Respuesta esperada cuando se envía a un dispositivo en vivo:

```json
{
  "status": "sent",
  "device_id": "dev-...",
  "track": {
    "id": "track-or-video-id",
    "title": "Track title",
    "artist": "Artist"
  }
}
```

Si el dispositivo está registrado pero fuera de línea:

```json
{
  "status": "sent",
  "device_id": "dev-...",
  "warning": "Device appears offline (no active socket)"
}
```

Trátelo como si no se hubiera jugado realmente.

### Limitación de reproducción automática del navegador

Después de recargar el navegador, es posible que la página no tenga activación por parte del usuario. En ese estado, Chrome, Safari y Firefox pueden rechazar llamadas audibles de `audio.play()` que se originan en Socket.IO o comandos de agente activados por HTTP.

Soundsible maneja esto colocando la solicitud remota en el reproductor. El dispositivo de destino muestra el mensaje **La reproducción remota está lista** con la pista solicitada. Un toque inicia la reproducción por etapas y desbloquea la sesión de audio del navegador para comandos posteriores del agente en esa sesión de página.

Comportamiento del agente:

1. Si `/api/agent/play` devuelve `status: "sent"` y el dispositivo tiene `active_sid`, el comando llegó al navegador.
2. Si la reproducción no comienza de manera audible inmediatamente después de una nueva recarga, dígale al usuario que toque el mensaje de reproducción remota en ese dispositivo.
3. Una vez que el usuario ha iniciado cualquier audio en esa sesión de página, los comandos posteriores de reproducción, pausa, reanudación y siguiente del agente deberían funcionar sin este mensaje.

Esta es una política de seguridad del navegador, no una falla de la API Soundsible. Para evitar el mensaje por completo, utilice una superficie de reproducción nativa o un motor de reproducción del lado del servidor en lugar del audio del navegador.

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

| Método   | Camino                                            | Propósito                                                                                                                                                                                            |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/library`                                    | Metadatos completos de la biblioteca                                                                                                                                                                 |
| `GET`    | `/api/library/search?q=...`                       | Buscar biblioteca local                                                                                                                                                                              |
| `GET`    | `/api/library/albums?sort=&genre=&year=`          | Álbumes del catálogo normalizado. `sort` es uno de `newest`, `alphabeticalByName`, `alphabeticalByArtist`, `byYear`, `byGenre`, `random`, `frequent`, `recent`, `highest`; uno desconocido es un 400 |
| `GET`    | `/api/library/albums/<album_id>`                  | Un registro y sus identificadores de pista, en orden de disco y pista                                                                                                                                |
| `GET`    | `/api/library/artists`                            | Artistas con un tema a su nombre, de `track_artists`                                                                                                                                                 |
| `GET`    | `/api/library/artists/<artist_id>`                | Un artista: las pistas en las que actúa y los discos que se le atribuyen                                                                                                                             |
| `GET`    | `/api/library/genres`                             | Géneros presentes, con recuento de canciones y álbumes.                                                                                                                                              |
| `GET`    | `/api/library/years`                              | Años de lanzamiento presentes, con recuento de álbumes y pistas.                                                                                                                                     |
| `POST`   | `/api/library/scan`                               | Inicie una exploración asincrónica de las raíces musicales configuradas; cuerpo opcional `{"path":"..."}` debe permanecer dentro de uno                                                              |
| `GET`    | `/api/library/scan`                               | Contadores y estado de escaneo actual o último                                                                                                                                                       |
| `GET`    | `/api/library/favourites`                         | ID de pistas favoritas (solo aquellas para las que posee un archivo)                                                                                                                                 |
| `GET`    | `/api/library/favourites/entries`                 | Todas las canciones guardadas, descargadas o no: `{"version":2,"favourites":[{"keys":[...],"title","artist",...}]}`                                                                                  |
| `POST`   | `/api/library/favourites/toggle`                  | Alternar favorito, cuerpo `{"track_id":"..."}` o `{"favourite":{"keys":["yt:<video_id>"],"title":"...","artist":"..."}}`                                                                             |
| `POST`   | `/api/library/playlists`                          | Crear lista de reproducción, cuerpo `{"name":"..."}`                                                                                                                                                 |
| `POST`   | `/api/library/playlists/<name>/tracks`            | Agregar pista a la lista de reproducción, cuerpo `{"track_id":"..."}`                                                                                                                                |
| `DELETE` | `/api/library/playlists/<name>/tracks/<track_id>` | Eliminar pista de la lista de reproducción                                                                                                                                                           |

Las rutas de mutación pueden requerir autorización de administrador o acceso LAN/Tailscale confiable.

Los escaneos de carpetas requieren `library:write`. Un inicio exitoso devuelve HTTP `202`; sondee la ruta `GET` hasta que `state` sea `completed` o `failed`. Repetir el inicio durante `queued` o `scanning` devuelve el mismo `scan_id`. Los análisis son aditivos: utilice la ruta de purga separada cuando los archivos fuente faltantes deban eliminarse del catálogo.

## Cola de reproducción

Esta es la cola que consume el reproductor del navegador cuando el usuario o agente pregunta "siguiente".

Cola de lectura:

```bash
curl http://localhost:5005/api/playback/queue
```

Agregar una pista de biblioteca:

```bash
curl -X POST http://localhost:5005/api/playback/queue \
  -H 'Content-Type: application/json' \
  -d '{"track_id":"<library-track-id>"}'
```

Agregue un elemento de vista previa YouTube:

```bash
curl -X POST http://localhost:5005/api/playback/queue \
  -H 'Content-Type: application/json' \
  -d '{
    "preview": {
      "video_id": "dQw4w9WgXcQ",
      "title": "Example",
      "artist": "Artist",
      "duration": 213,
      "thumbnail": "https://..."
    }
  }'
```

Operaciones de cola:

| Método   | Camino                                 | Propósito                                     |         |       |              |
| -------- | -------------------------------------- | --------------------------------------------- | ------- | ----- | ------------ |
| `GET`    | `/api/playback/queue`                  | Contenido de la cola                          |         |       |              |
| `POST`   | `/api/playback/queue`                  | Agregar pista de biblioteca o vista previa    |         |       |              |
| `DELETE` | `/api/playback/queue/<index>`          | Eliminar por índice de cola                   |         |       |              |
| `DELETE` | `/api/playback/queue/track/<track_id>` | Eliminar todas las entradas de la cola con ID |         |       |              |
| `POST`   | `/api/playback/queue/move`             | Cuerpo `{"from_index":0,"to_index":1}`        |         |       |              |
| `DELETE` | `/api/playback/queue`                  | Limpiar cola                                  |         |       |              |
| `GET`    | `/api/playback/next`                   | Pop siguiente elemento                        |         |       |              |
| `POST`   | `/api/playback/repeat`                 | Cuerpo \`{"modo":"apagado"                    | "todos" | "uno" | "una vez"}\` |
| `POST`   | `/api/playback/shuffle`                | Mezclar la cola actual                        |         |       |              |

Importante: `/api/playback/next` muestra un elemento. No lo llames sólo para inspeccionar la cola.

## Cola de descarga

Esta cola descarga audio en la biblioteca persistente. No es lo mismo que la cola de reproducción.

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

No envíe un objeto de elemento desnudo. No envíe un `video_id` desnudo. No utilice aquí objetos `preview` de la cola de reproducción.

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
4. Nunca utilice ID de Deezer, URL de Spotify, objetos de vista previa de la cola de reproducción ni cargas útiles sin formato solo de `video_id` para `/api/downloader/queue`.
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
   - agregar un elemento de vista previa a `/api/playback/queue`, o
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

Los reproductores también pueden publicar un objeto `session` junto a él (la cola, las preferencias de transporte y el espacio de trabajo Auto Mode detrás de la canción), que es lo que permite que otro dispositivo retome la sesión en lugar de solo la pista. Es un delta: omite la clave y lo que esté almacenado para ese dispositivo se conserva, envía `null` para finalizarlo. Los agentes no tienen ningún motivo para escribir una, y un agente que inicia una canción no relacionada en un dispositivo debe enviar `"session": null` para que el dispositivo no restaure una cola en la que esa pista no está. Las sesiones de más de 256 KB se descartan.

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
curl -X POST http://localhost:5005/api/playback/handoff \
  -H 'Content-Type: application/json' \
  -d '{"from_device_id":"dev-phone","to_device_id":"dev-desktop"}'
```

Comportamiento de transferencia:

1. Lee el estado de `from_device_id`.
2. Emite `playback_stop_requested` a `playback:default:<from_device_id>`.
3. Escribe el estado de reproducción de destino con `to_device_id`.
4. Emite `playback_start_requested` a `playback:default:<to_device_id>`.

Si `to_device_id` no tiene ningún socket activo, la respuesta incluye una advertencia fuera de línea.

Comportamiento de búsqueda:

1. `POST /api/agent/command` con `{"command":"seek","position_sec":...}` lee el estado de reproducción del dispositivo de destino.
2. La API escribe el `position_sec` solicitado en estado de reproducción.
3. La API emite `playback_seek_requested` a `playback:default:<device_id>`.
4. El reproductor del navegador establece `audio.currentTime` y conserva la nueva posición.

Si el destino no tiene un estado de reproducción actual, la API devuelve `404` con `No playback state available for target device`.

## Pódcasts

El descubrimiento y la reproducción de podcasts son independientes de la búsqueda de música.

Rutas útiles:

| Método | Camino                                            | Propósito                                     |
| ------ | ------------------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/discovery/podcasts/search?q=...`            | Buscar directorio de podcasts                 |
| `GET`  | `/api/discovery/podcasts/top?country=US&limit=25` | Mejores podcasts                              |
| `GET`  | `/api/podcasts/subscriptions`                     | Feeds suscritos                               |
| `POST` | `/api/podcasts/subscribe`                         | Suscríbete por datos de feed                  |
| `GET`  | `/api/podcasts/feeds/<feed_id>/episodes`          | Episodios para un feed                        |
| `POST` | `/api/podcasts/enclosure/peek`                    | Crear un token de transmisión para un recinto |
| `GET`  | `/api/podcasts/stream/<token>`                    | Transmitir audio de podcasts                  |

Los elementos de la cola de vista previa de podcasts usan `enclosure_url`, no `video_id`.

## Flujo de habilidades del agente recomendado

Para "reproducir X en mi escritorio":

1. Verifique el token con `GET /api/agent/verify`.
2. Leer dispositivos con `GET /api/devices`.
3. Seleccione `Desktop` con `active_sid`; si falta, pida al usuario que abra `/player/desktop/`.
4. Llame a `POST /api/agent/play` con `{"query":"X","device_id":"Desktop"}`.
5. Si la respuesta es `warning`, informe que el dispositivo está fuera de línea.

Para "agregar X a la cola":

1. Buscar biblioteca local: `GET /api/library/search?q=X`.
2. Si existe una buena coincidencia de biblioteca, `POST /api/playback/queue` con `{"track_id":"..."}`.
3. Si no, busque YouTube Music con `/api/downloader/youtube/search`.
4. Agregue el resultado elegido como `{"preview": {...}}`.

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
| `warning: Device appears offline`                                  | El dispositivo está registrado pero no tiene una unión activa a la sala Socket.IO           | Abrir/recargar el reproductor en ese dispositivo                                                                             |
| `Target device not found`                                          | El agente utilizó un ID/nombre de dispositivo desconocido                                   | Llame a `/api/devices` y apunte a un dispositivo real                                                                        |
| El comando devuelve `sent` pero no se reproduce nada.              | Por lo general, no se bloquea ningún socket activo o reproducción automática del navegador. | Marque `active_sid`; después de recargar, toque el mensaje de reproducción remota una vez                                    |
| Buscar retornos `seek requires position_sec`                       | El agente envió `seek` sin posición absoluta                                                | Enviar `{"command":"seek","position_sec":75}`                                                                                |
| La búsqueda no devuelve ningún estado de reproducción              | El dispositivo de destino no ha informado de un seguimiento actual                          | Inicie la reproducción primero o apunte al dispositivo activo desde `/api/devices`                                           |
| La identificación de Deezer falla                                  | Los ID de Deezer son solo metadatos                                                         | Resolver por título/artista mediante YouTube Music                                                                           |
| `/api/playback/next` cambió de cola                                | Aparece el siguiente elemento                                                               | Utilice `GET /api/playback/queue` para inspeccionar                                                                          |
| La cola de descarga rechaza el `video_id` sin procesar             | `/api/downloader/queue` requiere `items[].song_str`                                         | Enviar URL completa de YouTube en `song_str` más `video_id`                                                                  |
| La cola de descarga rechaza `ytmusic_search` con texto sin formato | Los tipos de fuente YouTube explícitos requieren URL de YouTube resueltas                   | Busque primero, luego ponga en cola la URL del resultado seleccionado; u omita `source_type` para utilizar texto sin formato |
| Canción descargada no visible                                      | El trabajo de descarga no ha finalizado o la biblioteca no está sincronizada                | Marque `/api/downloader/queue/status`, luego `/api/library/sync` si es necesario                                             |

## Resumen mínimo de estilo OpenAPI

```text
GET  /api/health
GET  /api/devices
POST /api/devices/register

POST /api/agent/token          admin
GET  /api/agent/verify         agent token
POST /api/agent/play           agent token
POST /api/agent/command        agent token; pause/play/next/seek
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

GET    /api/playback/queue
POST   /api/playback/queue
DELETE /api/playback/queue/<index>
DELETE /api/playback/queue/track/<track_id>
POST   /api/playback/queue/move
DELETE /api/playback/queue
GET    /api/playback/state
PUT    /api/playback/state
POST   /api/playback/handoff
POST   /api/playback/notify-stop

GET  /api/downloader/youtube/search?q=&limit=&source=
GET  /api/downloader/youtube/peek?id=
POST /api/downloader/queue    admin/trusted
GET  /api/downloader/queue/status
POST /api/downloader/start    admin/trusted

GET /api/discovery/deezer/<allowlisted-path>
GET /api/discovery/podcasts/search?q=
GET /api/discovery/podcasts/top
```
