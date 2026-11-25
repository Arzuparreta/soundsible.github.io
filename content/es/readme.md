# Guías de Soundsible

[Volver a Soundsible](../README.md)

## Instalación y configuración

| Guía | Úsala para… |
| --- | --- |
| [Instalación y despliegue](INSTALL.md) | Instalar en tu ordenador o servidor, elegir entre el menú, `--daemon` y un servicio de systemd, configurar el acceso remoto, el almacenamiento y un proxy inverso, y actualizar. |
| [Docker](DOCKER.md) | Ejecutar con Compose, montar una biblioteca existente, hacer copias de seguridad y actualizar. |
| [Beta de escritorio](DESKTOP_BETA.md) | Descargar la aplicación de Windows y consultar qué se ha verificado y por qué no hay aplicación para Linux. |
| [Ajustes y fuentes](CONFIGURATION.md) | Ajustes, variables de entorno, cuentas, descargas, cookies de YouTube y dónde se guardan los archivos. |
| [Trae tu música](MUSIC_MIGRATION.md) | Importar exportaciones de Spotify y Apple Music. |

## Guías de funciones

| Guía | Qué contiene |
| --- | --- |
| [DJ](AUTO_MODE.md) | Iniciar un set, elegir influencias, pedir canciones y editar transiciones. |
| [Dispositivos y control remoto](DEVICES.md) | Controlar otro dispositivo Soundsible, mover música entre dispositivos y gestionar aplicaciones sin conexión o antiguas. |
| [Live](LIVE.md) | Emitir, compartir una sala y entender el relay y los requisitos del navegador. |
| [OpenSubsonic](OPENSUBSONIC.md) | Conectar otras aplicaciones a tu biblioteca de música guardada. |
| [Scrobbling](SCROBBLING.md) | Enviar lo que escuchas a ListenBrainz, Last.fm o Maloja. |
| [Aplicación Android](ANDROID_ALPHA.md) | Instalar el APK alfa, emparejarlo con tu servidor, permisos y limitaciones. |
| [Estado de iOS](IOS.md) | Instrucciones de compilación e instalación; el comportamiento en dispositivos sigue sin verificar. |
| [Integración con el coche](CAR_INTEGRATION.md) | Controles multimedia web y la ruta nativa para el coche, sin verificar. |
| [Hoja de ruta](ROADMAP.md) | Capacidades actuales, prioridades y compatibilidad prevista con dispositivos. |
| [Privacidad](TELEMETRY_PRIVACY.md) | Qué datos de escucha se quedan en tu servidor y cómo desactivar el aprendizaje. |
| [Aviso legal y uso aceptable](LEGAL.md) | Responsabilidades al descargar y compartir música. |

## Solución de problemas e integraciones

- [Solución de problemas de descarga](troubleshooting-yt-dlp-formats.md)
- [Relay de YouTube en VPS](VPS_RELAY.md)
- [Conexiones del cliente de escritorio](DESKTOP_CLIENT.md)
- [Descubrimiento de pódcast por país](PODCASTS.md)
- [API para agentes](AGENT_INTEGRATION.md)

## Contribuir

Los documentos para quienes trabajan en Soundsible —arquitectura, contratos,
traspasos, auditorías y mediciones— están en [`internal/`](internal/README.md).
Empieza por [Contribuir](../CONTRIBUTING.md) y la
[política de seguridad](../SECURITY.md).

## Hecho con

FFmpeg se instala en el host; las dependencias de Python vienen de `pip`, y el
reproductor se compila con `npm` en `ui_web/`.

| Proyecto | Licencia | Función |
| --- | --- | --- |
| [SolidJS](https://www.solidjs.com/) + [Vite](https://vite.dev/) | MIT | El reproductor web (`ui_web/`) |
| [Flask](https://flask.palletsprojects.com/) + [Socket.IO](https://socket.io/) | BSD / MIT | API de Station Engine y eventos en tiempo real |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Unlicense (dominio público) | Búsqueda y descarga en YouTube y YouTube Music |
| [LRCLIB](https://lrclib.net/) | API pública | Letras sincronizadas y sin sincronizar |
| [lrc.red](https://lrc.red/) | API pública | Letras sincronizadas para las que LRCLIB no ofrece tiempos adecuados; se muestra su atribución junto a ellas |
| [API pública de Deezer](https://developers.deezer.com/) | API pública | Solo metadatos de descubrimiento; no se obtiene ningún audio de Deezer |
| [MusicBrainz](https://musicbrainz.org/) | API pública | Identificación de grabaciones y lanzamientos |
| [ListenBrainz](https://listenbrainz.org/), [Last.fm](https://www.last.fm/api) y [Maloja](https://github.com/krateng/maloja) | API públicas | [Scrobbling](SCROBBLING.md) opcional, por cuenta |
| [FFmpeg](https://ffmpeg.org/) | LGPL / GPL | Conversión y extracción de audio |
