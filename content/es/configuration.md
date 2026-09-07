## Configuración: opciones y entorno

Este documento resume las principales opciones de configuración para Soundsible.

Los nombres exactos de las opciones pueden evolucionar. En caso de duda, prefiera el asistente de configuración de la aplicación y la interfaz de usuario de configuración.

### 1. Asistente de configuración (recomendado)

La forma principal de configurar Soundsible es mediante la configuración guiada en la interfaz de usuario de la estación.

Opciones clave:

- Ruta de la biblioteca: donde se encuentran tus archivos de música.
- Backend de almacenamiento: disco local, NAS o almacenamiento de objetos.
- Backends en la nube: Cloudflare R2, Backblaze B2, S3 genérico (opcional).
- Valores predeterminados del descargador: preferencias de calidad y fuente de búsqueda.

Los cambios realizados aquí persisten para que las sesiones futuras los recojan automáticamente.

### 2. Variables de entorno

Dependiendo de cómo implemente Soundsible, puede exponer ciertos valores a través de variables de entorno.

Categorías típicas:

- Rutas: rutas base para almacenamiento o directorios de trabajo temporales.
- Indicadores y ajustes de funciones: indicadores opcionales para límites de simultaneidad o comportamiento de depuración.
- Depuración del reproductor web: agregue `?debug=1` a la Dirección del reproductor, o configure `localStorage.soundsible_debug` en `1`, para habilitar registros detallados de conexión/reproducción del cliente (desactivado de forma predeterminada).

Consulte el código y cualquier archivo `.env` de muestra en el repositorio para obtener la lista actual de variables admitidas.

### 2A. Variables de tiempo de ejecución y ruta

La capa de tiempo de ejecución actual admite estas variables de entorno de nivel superior:

- `SOUNDSIBLE_HOST`
- `SOUNDSIBLE_PORT`
- `SOUNDSIBLE_CONFIG_DIR`
- `SOUNDSIBLE_DATA_DIR`
- `SOUNDSIBLE_CACHE_DIR`: aquí todo es reconstruible. Cuando Soundsible pasa del `~/.cache/soundsible` heredado a un directorio de caché de la plataforma, migra las carátulas y los análisis de DJ, pero **no** `previews/` o `media/`: son audio masivo que se vuelve a descargar cuando se necesita y copiarlos duplica el uso del disco en el primer lanzamiento.
- `SOUNDSIBLE_LOG_DIR`
- `SOUNDSIBLE_MUSIC_DIR`
- `SOUNDSIBLE_UI_DIST`
- `SOUNDSIBLE_OWNER_TOKEN_FILE`
- `SOUNDSIBLE_LAN_ENABLED`
- `SOUNDSIBLE_ADVANCED_MODE`
- `SOUNDSIBLE_YT_SEARCH_SOURCE` — `ytmusic` (predeterminado) o `youtube`. YouTube Music proporciona metadatos más limpios, pero no siempre es accesible desde la IP de un centro de datos; configúrelo en `youtube` en un VPS cuyas búsquedas resulten vacías.
- `SOUNDSIBLE_YT_PROXY`: retransmisión HTTP privada utilizada tanto para la resolución YouTube como para la transferencia de Googlevideo resultante. Para la topología VPS compatible, utilice el relé exclusivo Tailscale de Soundsible; consulte [VPS\_RELAY.md](VPS_RELAY.md).
- `SOUNDSIBLE_PREVIEW_CACHE_MB`: caché de disco de audio de vista previa de LRU, `2048` de forma predeterminada. Este límite corresponde al disco, no a memoria RAM reservada; `0` desactiva el almacenamiento en caché de audio mientras el calentamiento de URL permanece disponible.
- La comunidad funciona sin configuración a través del servicio oficial de Soundsible. Configure `SOUNDSIBLE_COMMUNITY_DISABLED=true` para deshabilitar Live, o configure `SOUNDSIBLE_COMMUNITY_URL` en el origen HTTPS simple de su propia retransmisión. Los orígenes personalizados no pueden contener credenciales, una ruta, una consulta o un fragmento. La pila autoalojada admitida y su contrato de privacidad/capacidad están documentados en [deploy/community/README.md](../deploy/community/README.md).

Notas:

- `python3 run.py --daemon` todavía tiene de forma predeterminada la ruta de estilo de servidor heredado (`0.0.0.0:5005` a menos que se anule).
- `python3 run.py --desktop-engine` tiene como valor predeterminado `127.0.0.1` y un puerto libre aleatorio.
- Los directorios de aplicaciones de la plataforma se resuelven a través de `platformdirs`, y los `~/.config/soundsible`, `~/.cache/soundsible` y `~/.local/share/soundsible` heredados se migran o leen automáticamente.

### 2B. Archivos de token de tiempo de ejecución de escritorio

El modo de motor de escritorio crea y utiliza:

- `desktop-owner-token` en el directorio de configuración Soundsible de forma predeterminada
- `desktop-engine-state.json` en el directorio de configuración Soundsible

`desktop-owner-token` es la credencial de propietario actual para la interfaz de usuario del escritorio local y el trabajo del shell del dispositivo. `desktop-engine-state.json` registra los detalles del proceso/tiempo de ejecución de su propiedad para que un shell futuro pueda detener el PID correcto sin localizarlo únicamente por el puerto.

### 3. Configuración del descargador/ODST

El descargador ODST se puede ajustar desde la configuración y la interfaz de usuario.

Controles principales:

- Seleccionando la fuente de búsqueda y descarga (YouTube vs YouTube Music).
- Elegir ajustes preestablecidos de calidad (sin pérdidas de forma predeterminada cuando esté disponible, con selección manual).

### Fuentes opcionales sin pérdidas

El actualizador sin pérdidas funciona sin credenciales a través de Wikimedia Commons e Internet Archive. La cobertura de Jamendo se habilita con el `client_id` de solo lectura asignado a una aplicación registrada en [`devportal.jamendo.com`](https://devportal.jamendo.com/).

Un administrador de instancia puede ingresar ese valor en **Configuración → Descargas → Actualizaciones sin pérdida → Jamendo Client ID**. Soundsible lo valida con Jamendo antes de almacenarlo en el archivo `odst_tool/.env` ignorado, nunca devuelve el valor a través de la API de estado y recarga el proveedor sin reiniciar el demonio. OAuth `client_secret` y tokens de acceso no son necesarios y no se deben ingresar.

- Controlar el paralelismo y la concurrencia para descargas más rápidas (sujeto a su ancho de banda y hardware).

Consulte `odst_tool/README.md` para obtener más detalles sobre el uso de ODST independiente.

Si las descargas fallan con yt‑dlp "El formato solicitado no está disponible" cuando se utilizan cookies, consulte [troubleshooting-yt-dlp-formats.md](troubleshooting-yt-dlp-formats.md).

Para implementaciones de VPS o centros de datos, YouTube puede requerir cookies autenticadas. Coloque un archivo de cookies YouTube exportado en:

```bash
~/.config/soundsible/cookies.txt
```

O apúntelo explícitamente con Soundsible:

```bash
export SOUNDSIBLE_YTDLP_COOKIE_FILE=/path/to/cookies.txt
```

Soundsible fuerza yt-dlp a través de IPv4 de forma predeterminada porque algunas rutas IPv6 de VPS se bloquean durante la extracción de YouTube. Para desactivar eso:

```bash
export SOUNDSIBLE_YTDLP_FORCE_IPV4=false
```

Las descargas de YouTube de larga duración utilizan un perfil de red sólido de forma predeterminada:

- tiempo de espera del socket: `30` segundos
- Tamaño del fragmento HTTP: `10M`
- espera entre reintentos: incremento exponencial de 1 a 20 segundos

Anule estos valores cuando lo requiera una red específica:

```bash
export SOUNDSIBLE_YTDLP_SOCKET_TIMEOUT=45
export SOUNDSIBLE_YTDLP_HTTP_CHUNK_SIZE=4M
export SOUNDSIBLE_YTDLP_RETRY_SLEEP=linear=2:10
```

La expresión de reintento utiliza la sintaxis `--retry-sleep` de yt-dlp. Estas configuraciones afectan la transferencia saliente YouTube de Station Engine; la conexión LAN, Tailscale, Funnel o proxy inverso del navegador solo transporta el control y el progreso de la cola. Primero se intenta la extracción pública porque normalmente expone formatos de solo audio más limpios. Las cookies configuradas se reintentan automáticamente cuando YouTube requiere autenticación, confirmación de edad o un formato de solo cookies.

Cuando se configura una retransmisión, cada flujo resuelto registra si proviene de una salida directa o de retransmisión. Obtenga una vista previa de la transmisión y reutilice esa ruta exacta; nunca adivinan del entorno actual una vez resuelta la URL.

### 3A. Nota sobre el origen y la compilación de la interfaz de usuario web

El reproductor SolidJS debe construirse antes de que Flask lo entregue (`cd ui_web && npm run build`). Para el desarrollo interactivo, utilice el servidor de desarrollo Vite (`npm run dev`), que representa la API del motor y la conexión Socket.IO.

Eso incluye actualmente:

- `socket.io-client.esm.min.js`
- `qrcode.esm.js`

`npm install` y `npm run build` actualizan esos archivos de proveedores automáticamente a través de:

- `ui_web/scripts/sync-vendor-socket.mjs`
- `ui_web/scripts/sync-vendor-qrcode.mjs`

### 4. Descubrir (metadatos Deezer)

- **No se requiere ninguna clave API Deezer** para la experiencia Discover integrada. La estación representa puntos finales **públicos** Deezer GET (consulte [ARCHITECTURE.md](ARCHITECTURE.md)).
- El motor debe poder alcanzar **`https://api.deezer.com`** de salida. Si eso falla, las listas de Discover y la búsqueda estarán vacías o se producirá un error.
- La reproducción aún depende de la **búsqueda YouTube / YouTube Music** (ODST) y de la configuración de descarga existente; Discover no agrega un backend de audio separado.

### 5. Descripción general de la configuración de almacenamiento

En un nivel alto, el almacenamiento se puede configurar de tres maneras:

- Disco local: modo predeterminado; archivos almacenados en la misma máquina que ejecuta Soundsible.
- NAS o almacenamiento compartido: una ruta de red montada que se utiliza como ubicación de la biblioteca.
- Almacenamiento de objetos: proveedores compatibles, como Cloudflare R2, Backblaze B2 o S3 genérico.

El asistente de configuración y la interfaz de usuario de configuración manejan los casos comunes. Si necesita un backend personalizado, busque la capa de abstracción de almacenamiento en el código e implemente la misma interfaz que utilizan los backends existentes.

### 6. Cuentas (multiusuario)

Una instancia de Soundsible sirve a varias personas. Cada cuenta tiene su propia biblioteca, listas de reproducción, favoritos, cola, suscripciones a podcasts, historial de escucha y preferencias. Los **archivos de audio se comparten**: los identificadores de pista son hashes de contenido, por lo que una canción que alguien ya descargó se agrega a su biblioteca instantáneamente, sin una segunda descarga o una segunda copia en el disco.

**Nada cambia para una instalación de un solo usuario.** En el primer arranque después de la actualización, su biblioteca existente es adoptada por una cuenta de administrador `owner` sin contraseña y el motor sigue comportándose exactamente como antes: sin pantalla de inicio de sesión. Los originales permanecen en el disco con el nombre de `*.singleuser.bak` en caso de que desee retroceder.

**Agregar a la segunda persona activa la autenticación.** Configuración → Cuenta → Personas → *Agregar a alguien*. Primero se le pedirá que establezca una contraseña en su propia cuenta; de lo contrario, agregar una segunda biblioteca dejaría la instancia abierta a cualquier persona en la red. A partir de ese momento todos inician sesión.

| Configuración                                                                                                                                                                | quien lo controla          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Biblioteca, listas de reproducción, favoritos, cola, podcasts, historial, tema, idioma                                                                                       | Cada persona, por sí misma |
| Carpeta de música, backend de almacenamiento, calidad de descarga, cookies yt-dlp y actualización automática, optimización de biblioteca, sincronización en la nube, cuentas | Sólo administrador         |

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

### 6A. Emparejamiento y autenticación de administrador

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

El modo de emparejamiento del reproductor de escritorio ahora consume este flujo directamente y genera un código QR desde la carga útil `qr_text` del backend.
