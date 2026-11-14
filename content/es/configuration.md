# Configuración

La mayor parte de Soundsible se configura en el reproductor: abre **Ajustes** o busca
un ajuste desde el cuadro de la parte superior. Lo que el reproductor no puede cambiar —dónde
escucha el motor, dónde guarda sus archivos o cómo accede a YouTube— se configura
mediante variables de entorno. Esta página explica ambas cosas.

## 1. Configuración inicial y Ajustes

### Página de configuración

Una instalación desde el código fuente hace unas pocas preguntas una sola vez en la página de configuración de
`http://localhost:5099/setup` (consulta [Primera ejecución](INSTALL.md#first-run)):

- **Dónde está tu música** — una carpeta de este ordenador, que puede ser un NAS o
  un recurso compartido de Samba montado en el equipo, o un bucket de Cloudflare R2 o Backblaze B2.
- **La carpeta o la cuenta** que se va a usar y, para el almacenamiento en la nube, el bucket.
- **Ajustes opcionales** — calidad de descarga y ubicación de la caché de
  copias temporales.

La configuración inicial escribe `config.json` en el
[directorio de configuración](#7-where-soundsible-keeps-its-files). Vuelve a abrirla con
`python3 run.py --setup`. Docker y la aplicación de escritorio omiten esta página: el
contenedor configura `/music` en su primer arranque y la aplicación de escritorio pide una
carpeta de música en su propia pantalla de primera ejecución.

### Ajustes

Todo lo demás está en **Ajustes**, dentro del reproductor: tema, idioma, reproducción,
descargas, nuevos escaneos de la biblioteca, cuentas, dispositivos vinculados e
importación de música. Algunos ajustes son personales y otros están reservados a un administrador;
[Cuentas](#6-accounts-multi-user) indica cuáles.

### Preferencias de navegación

La barra inferior del móvil incluye inicialmente **Biblioteca, Favoritos, Buscar y Ajustes**.
Abre **Ajustes → Apariencia → Barra inferior** para elegir entre tres y cinco
secciones y establecer su orden. Si eliges una sección ya asignada a otra
posición, ambas se intercambian. Los cambios se aplican de inmediato y se guardan en este navegador
o instalación; **Restaurar valores predeterminados** recupera los cuatro botones originales.

El menú de la cabecera abre la navegación completa, incluidas Listas de reproducción, Pódcast,
Live, Descargas y las vistas Canciones, Álbumes y Artistas de la biblioteca. Ajustes sigue
estando accesible ahí aunque lo quites de la barra inferior. En escritorio, la barra lateral permanente
usa esa misma navegación completa; personalizar la barra inferior no
reordena esa barra lateral.


## 2. Variables de entorno

Defínelas donde se inicia el motor y después reinícialo: se leen al arrancar.

| Ejecutas Soundsible con | Dónde poner las variables |
| --- | --- |
| `python3 run.py` o `python3 run.py --daemon` | En la shell que lo inicia: primero `export NAME=value`, o bien `NAME=value python3 run.py --daemon`. |
| systemd | En un archivo de configuración complementaria: `sudo systemctl edit soundsible` y después `Environment=NAME=value` dentro de `[Service]`. Consulta [la guía del servicio](INSTALL.md#run-it-as-a-systemd-service). |
| Docker Compose | En el archivo `.env` junto a `compose.yaml` o en la sección `environment:`. Consulta [Docker](DOCKER.md#configuration-and-security). |

### Red y acceso

| Variable | Valor predeterminado | Efecto |
| --- | --- | --- |
| `SOUNDSIBLE_HOST` | `0.0.0.0` | Dirección en la que escucha el motor; equivale a `--host`. La aplicación de escritorio usa `127.0.0.1`. |
| `SOUNDSIBLE_PORT` | `5005` | Puerto en el que escucha el motor; equivale a `--port`. El menú del terminal siempre usa 5005. |
| `SOUNDSIBLE_ADMIN_TOKEN` | sin definir | Cuando está definido, las rutas de administración lo exigen como `Authorization: Bearer <token>` o `X-Soundsible-Admin-Token: <token>`. Consulta las [medidas básicas de seguridad](INSTALL.md#8-security-baseline). |
| `SOUNDSIBLE_ALLOWED_ORIGINS` | localhost, direcciones de la LAN privada y de Tailscale | Orígenes de navegador autorizados para llamar a la API, separados por comas. |
| `SOUNDSIBLE_SOCKET_CORS_ORIGINS` | cualquiera | Orígenes autorizados para abrir la conexión en tiempo real, separados por comas. |
| `SOUNDSIBLE_HTTPS_URL` | sin definir | Tu propia dirección HTTPS, para que [Live](LIVE.md#5-broadcasting-needs-https) pueda dirigir allí un navegador para emitir. |
| `SOUNDSIBLE_LAUNCHER_BIND_ALL` | `false` | `true` hace que la página de configuración y el lanzador respondan en la red, no solo en `localhost`. |
| `LAUNCHER_PORT` | `5099` | Puerto de la página de configuración y del lanzador. |
| `SOUNDSIBLE_LAN_ENABLED` | activado, salvo que la dirección de escucha sea de bucle local | Indica si se esperan navegadores de otros equipos; equivale a `--lan-enabled` / `--no-lan`. |
| `SOUNDSIBLE_ADVANCED_MODE` | activado para `--daemon`, desactivado para la aplicación de escritorio | Mientras la instancia tenga una sola cuenta y ninguna contraseña, confía en los navegadores de la LAN y de la tailnet como si fueran su propietario. No tiene efecto una vez que se exige iniciar sesión. |

### Rutas

Cada una tiene una opción equivalente en `run.py` (`--config-dir`, `--data-dir`, …). Los
valores predeterminados se indican en la [sección 7](#7-where-soundsible-keeps-its-files).

| Variable | Contiene |
| --- | --- |
| `SOUNDSIBLE_CONFIG_DIR` | `config.json`, la base de datos de la instancia con sus cuentas y la biblioteca, las listas de reproducción y los favoritos de cada persona. Haz una copia de seguridad. |
| `SOUNDSIBLE_DATA_DIR` | Colas, trabajos de importación, telemetría de escucha e imágenes conservadas. |
| `SOUNDSIBLE_CACHE_DIR` | Portadas, audio de previsualización y análisis de DJ. Todo lo que hay aquí se puede regenerar. Cuando Soundsible pasa de la ubicación antigua `~/.cache/soundsible` a un directorio de caché propio de la plataforma, traslada las portadas y los análisis de DJ, pero **no** `previews/` ni `media/`: son archivos de audio voluminosos que se vuelven a descargar cuando se necesitan. |
| `SOUNDSIBLE_LOG_LEVEL` | Nivel de registro en consola para los motores nativos y en contenedores; el valor predeterminado es `INFO`. La planificación del DJ informa aquí de los aciertos de caché, las obtenciones pendientes y los resultados de las rutas. |
| `SOUNDSIBLE_LOG_DIR` | El directorio de registros que el motor indica en `/api/health`. El propio motor escribe los registros en su terminal: el diario de systemd o `docker compose logs` en Docker. |
| `SOUNDSIBLE_MUSIC_DIR` | La carpeta de música, cuando no es la elegida durante la configuración inicial. |
| `SOUNDSIBLE_UI_DIST` | Un reproductor web ya compilado que se sirve en lugar de `ui_web/dist`. Lo establecen el contenedor y la aplicación de escritorio; una instalación desde el código fuente no lo necesita. |
| `SOUNDSIBLE_OWNER_TOKEN_FILE` | Dónde se escribe el token de propietario de la aplicación de escritorio. |

### YouTube y descargas

| Variable | Valor predeterminado | Efecto |
| --- | --- | --- |
| `SOUNDSIBLE_YT_SEARCH_SOURCE` | `youtube` | `youtube` o `ytmusic`. La búsqueda normal de YouTube devuelve el título, el creador y la duración en una sola petición; YouTube Music solo devuelve identificadores y títulos, y no siempre es accesible desde una IP de un centro de datos. |
| `SOUNDSIBLE_YT_PROXY` | sin establecer | Repetidor HTTP privado que se usa tanto para resolver las URL de YouTube como para transferir el contenido multimedia resultante. Para la topología de VPS compatible, usa el repetidor de Soundsible accesible solo por Tailscale; consulta [VPS_RELAY.md](VPS_RELAY.md). |
| `SOUNDSIBLE_YTDLP_COOKIE_FILE` | `cookies.txt` en el directorio de configuración | Archivo de cookies de YouTube; consulta [Cookies de YouTube](#youtube-cookies). |
| `SOUNDSIBLE_YTDLP_FORCE_IPV4` | `true` | Fuerza el uso de IPv4 en yt-dlp, porque algunas rutas IPv6 de VPS se bloquean durante la extracción de YouTube. |
| `SOUNDSIBLE_YTDLP_SOCKET_TIMEOUT` | `30` | Tiempo de espera del socket de yt-dlp, en segundos. |
| `SOUNDSIBLE_YTDLP_HTTP_CHUNK_SIZE` | `10M` | Tamaño de los fragmentos HTTP de yt-dlp. |
| `SOUNDSIBLE_YTDLP_RETRY_SLEEP` | exponencial, de 1 a 20 s | Expresión de `--retry-sleep` de yt-dlp, por ejemplo, `linear=2:10`. |
| `SOUNDSIBLE_PREVIEW_CACHE_MB` | `2048` | Espacio en disco (no en RAM) para la caché LRU del audio de previsualización. `0` desactiva la caché de audio, pero permite seguir preparando las URL de antemano. |
| `SOUNDSIBLE_ARTWORK_CACHE_MB` | `512` | MiB de portadas JPEG redimensionadas o recortadas que se conservan por directorio de caché. Se excluyen los originales; `0` sirve variantes temporales desde el disco sin conservarlas. Reinicia después de cambiarlo. Consulta los [detalles de la cuota](performance/artwork-variant-quota.md). |
| `SOUNDSIBLE_FFMPEG` | FFmpeg en `PATH` | Ruta explícita al binario de FFmpeg. |

### Funciones

| Variable | Valor predeterminado | Efecto |
| --- | --- | --- |
| `SOUNDSIBLE_COMMUNITY_DISABLED` | `false` | `true` desactiva Live. |
| `SOUNDSIBLE_COMMUNITY_URL` | Servicio oficial de Soundsible | Origen HTTPS de tu propio repetidor de Live, sin credenciales, ruta, parámetros de consulta ni fragmento. El conjunto de servicios autoalojados se documenta en [deploy/community/README.md](../deploy/community/README.md). |
| `SOUNDSIBLE_TELEMETRY_ENABLED` | activado | `0`, `false` u `off` detiene el registro de la telemetría de escucha local. Consulta [Privacidad](TELEMETRY_PRIVACY.md). |
| `SOUNDSIBLE_LOUDNESS_ANALYSIS` | activado | `false` deja de medir las pistas nuevas para nivelar la sonoridad; las pistas ya medidas conservan sus niveles. |
| `SOUNDSIBLE_SUBSONIC_MAX_TRANSCODES` | `2` | Transcodificaciones simultáneas de [OpenSubsonic](OPENSUBSONIC.md). |
| `SOUNDSIBLE_LASTFM_API_KEY`, `SOUNDSIBLE_LASTFM_API_SECRET` | sin definir | La cuenta de la API de Last.fm a través de la que este servidor hace [scrobbling](SCROBBLING.md#lastfm). Hay que definir las dos. Sustituyen a la que un administrador guarda en **Ajustes → Scrobbling**, que entonces ya no se puede editar ahí. |
| `SOUNDSIBLE_SKIP_UI_BUILD` | sin establecer | `1` impide que el motor vuelva a compilar el reproductor web al iniciarse; sirve lo que contenga `ui_web/dist`. |

Para activar los registros detallados de conexión y reproducción en un navegador, añade
`?debug=1` a la URL del reproductor o establece `localStorage.soundsible_debug` en `1`.

Una instalación desde el código fuente nunca necesita compilar manualmente el reproductor web: el motor
lo vuelve a compilar desde `ui_web/` cada vez que cambia el código fuente. Para desarrollar la interfaz,
consulta [ui_web/README.md](../ui_web/README.md).

## 3. Descargas

Elige la calidad de descarga en **Configuración → Descargas**; se aplica a las descargas
nuevas. La fuente de búsqueda se define con la [variable](#youtube-and-downloads)
`SOUNDSIBLE_YT_SEARCH_SOURCE`.

Lo que guarda Configuración → Descargas —carpeta de destino, calidad, credenciales
del bucket en la nube y actualizaciones automáticas de yt-dlp / curl-cffi— se conserva en
`downloader.env`, en el
[directorio de configuración](#7-where-soundsible-keeps-its-files). Una variable de entorno
real con el mismo nombre tiene prioridad. Las instalaciones anteriores a este
archivo guardaban la misma configuración en `odst_tool/.env`, dentro de la copia del repositorio; el
motor copia ese archivo a la nueva ubicación la primera vez que se inicia y deja el antiguo
en su sitio.

### Cookies de YouTube

En despliegues en VPS o centros de datos, YouTube puede exigir cookies de autenticación.
Exporta un archivo de cookies de YouTube y colócalo como `cookies.txt` en el
[directorio de configuración](#7-where-soundsible-keeps-its-files) —en Linux,
`~/.config/soundsible/cookies.txt`— o indica su ubicación a Soundsible explícitamente:

```bash
export SOUNDSIBLE_YTDLP_COOKIE_FILE=/path/to/cookies.txt
```

Primero se intenta la extracción pública porque normalmente ofrece formatos
solo de audio más limpios. Se vuelve a intentar automáticamente con las cookies configuradas cuando YouTube
exige autenticación, confirmación de edad o un formato que solo está disponible con cookies. Consulta
[Solución de problemas de descarga](troubleshooting-yt-dlp-formats.md) si las descargas siguen
fallando.

### Comportamiento de red

Las descargas prolongadas de YouTube usan de forma predeterminada un perfil de red robusto: el
tiempo de espera del socket, el tamaño de los fragmentos y la espera entre reintentos de la
[tabla anterior](#youtube-and-downloads). Estos ajustes afectan a la transferencia saliente
de YouTube del Station Engine; la conexión del navegador por LAN, Tailscale, Funnel o
proxy inverso solo transporta el control de la cola y el progreso.

Cuando hay un repetidor configurado, cada flujo resuelto registra si se obtuvo
mediante una salida directa o a través del repetidor. La reproducción en streaming de previsualizaciones y la precarga reutilizan exactamente esa ruta;
nunca la deducen del entorno actual una vez resuelta la URL.


## 4. Descubrir (metadatos de Deezer)

- **No hace falta una clave de API de Deezer** para la función Descubrir integrada. Station actúa como proxy de los endpoints GET **públicos** de Deezer (consulta [ARCHITECTURE.md](ARCHITECTURE.md)).
- El motor debe poder establecer conexiones salientes con **`https://api.deezer.com`**. Si no puede, las listas y la búsqueda de Descubrir estarán vacías o mostrarán un error.
- La reproducción sigue dependiendo de la **búsqueda de YouTube / YouTube Music** y de tu configuración actual de descargas; Descubrir no añade un motor de audio independiente.

## 5. Almacenamiento

El almacenamiento se elige durante la [configuración inicial](#setup-page):

- **Disco local**: la opción predeterminada; los archivos se guardan en el equipo que ejecuta
  Soundsible.
- **NAS o almacenamiento compartido**: una ruta de red que monta el equipo y se usa como
  carpeta de la biblioteca. Con systemd, haz que el servicio
  [espere al montaje](INSTALL.md#7-storage).
- **Almacenamiento de objetos**: Cloudflare R2 o Backblaze B2. No se han implementado
  otros servicios compatibles con S3.

## 6. Cuentas (varios usuarios)

Una instancia de Soundsible sirve a varias personas. Cada cuenta tiene su propia biblioteca, listas de reproducción, favoritos, cola, suscripciones a podcasts, historial de escucha y preferencias. Los **archivos de audio se comparten**: los identificadores de pista son hashes de contenido, por lo que una canción que alguien ya descargó se agrega a su biblioteca instantáneamente, sin una segunda descarga o una segunda copia en el disco.

**Nada cambia para una instalación de un solo usuario.** En el primer arranque después de la actualización, su biblioteca existente es adoptada por una cuenta de administrador `owner` sin contraseña y el motor sigue comportándose exactamente como antes: sin pantalla de inicio de sesión. Los originales permanecen en el disco con el nombre de `*.singleuser.bak` en caso de que desee retroceder.

**Agregar a la segunda persona activa la autenticación.** Configuración → Cuenta → Personas → *Agregar a alguien*. Primero se le pedirá que establezca una contraseña en su propia cuenta; de lo contrario, agregar una segunda biblioteca dejaría la instancia abierta a cualquier persona en la red. A partir de ese momento todos inician sesión.

| Ajuste | Quién lo controla |
|---------|-----------------|
| Biblioteca, listas de reproducción, favoritos, cola, pódcasts, historial, tema, idioma | Cada persona, para sí misma. En la aplicación de escritorio, el tema también se aplica a sus propias pantallas de primer inicio, carga y error, para que toda la ventana tenga un aspecto uniforme |
| Carpeta de música, sistema de almacenamiento, calidad de descarga, cookies y actualización automática de yt-dlp, sincronización en la nube, cuentas | Solo los administradores |

**Agregar personas de forma remota.** Configuración → Cuenta → Personas → *Crear enlace de invitación* crea un enlace de un solo uso válido por 7 días. Envíalo como quieras; quien lo abre elige su propio nombre de usuario y contraseña y llega directamente a su reproductor (vacío). No se les muestra nada sobre el servidor ni sobre las otras cuentas. De un caparazón hay `python run.py --users invite --display-name "…" --base-url http://…`.

**Administración sin cabeza.** `python run.py --users <command>` administra cuentas sin navegador: `list`, `create`, `invite`, `invites`, `passwd`, `rename`, `role`, `disable`, `enable`, `logout`, `delete`. Esta es la forma de establecer la primera contraseña después de actualizar una instalación de un solo usuario y la forma de volver a ingresar si alguien olvida la suya.

Puntos finales:

- `GET /api/auth/state`—público; le dice al reproductor si debe mostrar una pantalla de inicio de sesión.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/password`: cambia tu propia contraseña.
- `GET|POST /api/users`, `PATCH|DELETE /api/users/<id>`, `POST /api/users/<id>/password`, `DELETE /api/users/<id>/sessions`: solo administrador.
- `GET|POST /api/invites`, `DELETE /api/invites/<id>`: solo administrador.
- `GET /api/invites/<token>/preview`, `POST /api/invites/<token>/accept` — público; el token es la credencial.

Las sesiones son cookies HttpOnly de 90 días (`sb_session`), almacenadas en el lado del servidor solo como hashes y revocables por cuenta desde la pantalla Personas. Al eliminar una cuenta, se eliminan los directorios de esa persona; Los archivos de música compartidos nunca se tocan.

### Vinculación y autenticación de administradores

Superficies de autenticación de tiempo de ejecución/emparejamiento actual:

- Fichas de agente: `POST /api/agent/token`
- Tokens de dispositivo emparejado: creados por el flujo de la sesión de emparejamiento
- Token de propietario: credencial de propietario local del motor de escritorio

Puntos finales de emparejamiento actuales:

- `GET/POST /api/pairing/sessions`
- `POST /api/pairing/sessions/claim`
- `POST /api/pairing/sessions/<id>/confirm`
- `POST /api/pairing/sessions/<id>/cancel`
- `POST /api/pairing/sessions/<id>/display-open`
- `POST /api/pairing/sessions/<id>/display-close`
- `GET /api/paired-devices`
- `POST /api/paired-devices/<token_id>/revoke`

Configuración → Dispositivos muestra el QR con el formato `qr_text` del servidor, pero con la dirección desde la que se ha abierto el panel (si es una dirección de bucle local, se recurre a la sugerencia de LAN del motor). Una solicitud de vinculación con `"credential": "session"` inicia sesión en el teléfono con esa cuenta mientras el panel está visible; consulta ARCHITECTURE.

## 7. Dónde guarda Soundsible sus archivos

Una instalación desde el código fuente y la aplicación de escritorio determinan sus directorios según la plataforma.
El contenedor usa `/config`, `/data`, `/cache`, `/logs` y `/music` en su lugar.

| | Linux | macOS | Windows |
| --- | --- | --- | --- |
| Configuración | `~/.config/soundsible` | `~/Library/Application Support/soundsible` | `%LOCALAPPDATA%\soundsible` |
| Datos | `~/.local/share/soundsible` | `~/Library/Application Support/soundsible` | `%LOCALAPPDATA%\soundsible` |
| Caché | `~/.cache/soundsible` | `~/Library/Caches/soundsible` | `%LOCALAPPDATA%\soundsible\Cache` |
| Música (predeterminado) | `~/Music/Soundsible` | `~/Music/Soundsible` | `%USERPROFILE%\Music\Soundsible` |

Pertenecen al usuario que ejecuta el motor, por lo que un
[servicio de systemd](INSTALL.md#run-it-as-a-systemd-service) debe ejecutarse con el
usuario que completó la configuración inicial. Las instalaciones antiguas usaban `~/.config/soundsible`,
`~/.cache/soundsible` y `~/.local/share/soundsible` en todas las plataformas; su contenido
se copia a las nuevas ubicaciones en el primer inicio. Las opciones de `run.py` y las
[variables de rutas](#paths) permiten sustituir cualquiera de estas ubicaciones.

El directorio de configuración también contiene `downloader.env`, con los
[ajustes guardados del descargador](#3-downloads), y lo que guarda el
[scrobbling](SCROBBLING.md#where-it-is-stored): `scrobble.key`,
`lastfm_app.json` y el `users/<account>/scrobble.sqlite3` de cada cuenta.

La aplicación de escritorio también guarda dos archivos en el directorio de configuración:

- `desktop-owner-token`: la credencial de propietario para la interfaz local de escritorio.
- `desktop-engine-state.json`: el proceso y la dirección del motor en ejecución, para que
  la aplicación detenga el proceso correcto en lugar de matar un proceso por su puerto.
