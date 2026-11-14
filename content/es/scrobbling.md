# Scrobbling

Soundsible puede enviar cada canción que escuchas a **ListenBrainz**, **Last.fm**
y **Maloja**. Está desactivado hasta que conectas un servicio, y cada cuenta
conecta los suyos.

Abre **Ajustes → Scrobbling** en el reproductor.

<picture><source media="(prefers-color-scheme: light)" srcset="images/scrobbling/settings-light.webp"><img src="images/scrobbling/settings-dark.webp" alt="Ajustes → Scrobbling con ListenBrainz conectado y Last.fm pendiente de conectar" width="100%"></picture>

## Qué se envía y cuándo

Los scrobbles los envía el **servidor**, no el dispositivo en el que escuchas.
Todos los clientes de Soundsible ya le dicen al servidor qué están reproduciendo,
así que una sola conexión cubre a la vez el reproductor web, la aplicación de
Windows y la aplicación de Android. La [aplicación de iOS](IOS.md) informa de la
reproducción del mismo modo, pero nunca se ha ejecutado en un dispositivo. Una
canción reproducida en una [aplicación OpenSubsonic](OPENSUBSONIC.md) también se
envía, cuando esa aplicación la notifica.

| | |
| --- | --- |
| **Escuchando ahora** | Se envía cuando empieza una canción y cuando se reanuda. |
| **Una reproducción** | Se envía cuando has escuchado la mitad de la canción, o cuatro minutos de ella, lo que ocurra antes. Las canciones de treinta segundos o menos nunca cuentan. Es la regla que publican ListenBrainz y Last.fm. |
| **Qué contiene** | Artista, título, álbum, artista del álbum, número de pista, duración, la hora a la que empezó la canción y, cuando el archivo los tiene, su ID de grabación de MusicBrainz y su ISRC. |
| **Qué no se envía nunca** | Podcasts. Canciones sin artista o sin título. Vídeos cuyo único crédito es el canal que los subió, porque ese no es el intérprete. |

El tiempo en pausa no cuenta, y saltar dentro de la canción tampoco. Pasar una
canción a otro dispositivo continúa la misma escucha en vez de empezar una
segunda. Una canción en repetición cuenta en cada vuelta.

Si no se puede contactar con un servicio, la reproducción espera en el servidor
y se envía más tarde, en orden, también después de un reinicio. Ajustes muestra
cuántas hay esperando y por qué. El servidor guarda hasta 10.000 reproducciones
sin enviar por servicio; a partir de ahí se descartan las más antiguas.

## ListenBrainz

1. Copia tu **token de usuario** desde <https://listenbrainz.org/settings/>.
2. Pulsa **Conectar ListenBrainz** y pégalo.

Un administrador también puede conectar un servidor ListenBrainz que aloje él
mismo, con **Conectar otro servidor ListenBrainz**.

## Last.fm

Last.fm identifica a la aplicación además de a quien escucha, y Soundsible no
incluye una clave de aplicación. El servidor necesita una, una sola vez:

1. Un **administrador** crea una cuenta de API en <https://www.last.fm/api/account/create>.
   Es gratuita. La URL de callback del formulario puede quedarse vacía.
2. En **Ajustes → Scrobbling**, el administrador pulsa **Añadir una clave de API de Last.fm**
   y pega la clave de API y el secreto compartido. O bien defínelas donde arranca
   el motor, como `SOUNDSIBLE_LASTFM_API_KEY` y `SOUNDSIBLE_LASTFM_API_SECRET`.

Después, cada persona conecta su propia cuenta de Last.fm:

1. Pulsa **Conectar Last.fm** y luego **Abrir Last.fm**.
2. En Last.fm, pulsa **Yes, allow access**.
3. Vuelve a Soundsible. La conexión termina sola cuando vuelves a la página;
   **Terminar la conexión** hace lo mismo a mano.

El enlace es válido durante sesenta minutos. Si revocas el acceso en Last.fm
(**Settings → Applications**), se detecta en el siguiente scrobble: Ajustes te
pide entonces que vuelvas a conectar, y lo que estaba esperando se envía en
cuanto lo haces.

## Maloja

Maloja siempre es un servidor propio, así que solo un **administrador** puede
conectarlo:

1. Crea una clave de API en el panel de administración de tu Maloja.
2. Pulsa **Conectar Maloja**, introduce la dirección de tu servidor (por ejemplo
   `http://192.168.1.10:42010`) y pega la clave.

Soundsible se comunica con Maloja a través de su interfaz compatible con
ListenBrainz (`/apis/listenbrainz`). Maloja no tiene «escuchando ahora»; solo
guarda reproducciones.

## Pausar y desconectar

- **Enviar lo que escucho** pausa un servicio sin desconectarlo. Las canciones
  reproducidas mientras está desactivado no se registran para ese servicio.
- **Desconectar** elimina el acceso guardado y descarta lo que aún estaba
  esperando. Lo que el servicio ya recibió se queda allí.

## Quién puede hacer qué

| | Cualquier cuenta | Administrador |
| --- | --- | --- |
| Conectar su propio ListenBrainz o Last.fm | ✓ | ✓ |
| Añadir o quitar la clave de API de Last.fm del servidor | | ✓ |
| Conectar un servidor por su dirección (Maloja, ListenBrainz alojado por ti) | | ✓ |

Una dirección está reservada a los administradores porque el servidor le envía
peticiones desde dentro de tu red.

## Dónde se guarda

| Archivo | Contiene |
| --- | --- |
| `users/<account>/scrobble.sqlite3` en el directorio de configuración | Las conexiones de esa cuenta y sus reproducciones sin enviar. Se borra con la cuenta. |
| `scrobble.key` en el directorio de configuración | La clave con la que se cifran los tokens guardados. Sin ella no se pueden leer, y Ajustes pide volver a conectar. |
| `lastfm_app.json` en el directorio de configuración | La clave de API de Last.fm del servidor, con su secreto cifrado. |

Los tokens no se vuelven a mostrar después de pegarlos y nunca salen del
servidor salvo hacia el servicio al que pertenecen.
