# Solución de problemas de descarga

Soundsible busca y descarga mediante [yt-dlp](https://github.com/yt-dlp/yt-dlp).
Cuando falla una descarga, el motivo aparece en el registro del motor:

| Ejecutas Soundsible con | Consulta el registro con |
| --- | --- |
| `python3 run.py --daemon` | La terminal en la que se ejecuta |
| systemd | `journalctl -u soundsible -f` |
| Docker | `docker compose logs -f soundsible` |

## Cómo se intenta una descarga

Cada descarga intenta, por este orden:

1. el flujo de audio nativo **sin cookies**: la extracción pública suele
   ofrecer los formatos solo de audio más limpios;
2. lo mismo **con tus cookies**, si las has configurado y YouTube ha solicitado
   iniciar sesión, confirmar la edad o usar un formato solo disponible con cookies, o ha respondido
   «El formato solicitado no está disponible» o HTTP 403;
3. una descarga **recodificada**, con cookies si las tienes.

Las consultas de metadatos siguen el mismo orden: primero de forma anónima, después `cookies.txt`
y, por último, las cookies del navegador. Las cookies nunca son obligatorias para la música pública; son una
alternativa cuando falla lo anterior.

## «El formato solicitado no está disponible»

Las cookies pueden hacer que YouTube devuelva una lista de formatos distinta, por eso
Soundsible empieza sin ellas y solo vuelve a intentarlo con ellas cuando hace falta. Si este
error persiste tras los tres intentos:

- **Actualiza yt-dlp.** YouTube cambia a menudo y una versión antigua de yt-dlp es la
  causa más habitual. En una instalación nativa, activa **Configuración → Descargas →
  Actualizar yt-dlp automáticamente** (solo administradores) y reinicia Soundsible: a partir de entonces
  la estación actualizará yt-dlp antes de empezar a servir, siempre que ningún otro motor
  esté utilizando el mismo entorno de Python. La descarga de la actualización tiene un
  límite de dos minutos; la instalación desde los paquetes wheel descargados termina antes
  del arranque. Si otro motor utiliza ese entorno, la actualización espera a un reinicio
  posterior con esos motores detenidos. La actualización automática exige bloqueo nativo
  de archivos y un entorno con permisos de escritura; de lo contrario, se omite y se
  registra un mensaje. Durante la instalación, Ctrl+C y el cierre normal esperan a que
  pip termine de sustituir paquetes. Arrancar desde el código fuente después de cambiar
  las dependencias también exige detener los otros motores que usen ese entorno.
  La aplicación de escritorio y Docker ignoran este ajuste: la aplicación incluye su
  propio yt-dlp en cada versión y, con Docker, debes descargar la imagen más reciente.
- Exporta un `cookies.txt` nuevo; una sesión caducada puede fallar del mismo modo.

## «Inicia sesión para confirmar que no eres un bot», búsquedas vacías en un VPS

Las direcciones de centros de datos suelen tratarse como tráfico automatizado. De menor a mayor esfuerzo:

1. Si has establecido `SOUNDSIBLE_YT_SEARCH_SOURCE=ytmusic` y las búsquedas no devuelven
   resultados, elimínalo para volver al valor predeterminado, `youtube`.
2. Añade cookies de YouTube; consulta [Configuración → Cookies de YouTube](CONFIGURATION.md#youtube-cookies).
3. Dirige el tráfico de YouTube a través de un ordenador doméstico de confianza con el
   [repetidor para VPS](VPS_RELAY.md).

## Las descargas se bloquean o agotan el tiempo de espera

Soundsible ya fuerza IPv4 y reintenta con esperas crecientes; los valores predeterminados y cómo
ajustarlos se explican en
[Configuración → YouTube y descargas](CONFIGURATION.md#youtube-and-downloads).

El orden de los intentos está definido en `download_audio`, en
[`shared/downloader/youtube/download.py`](../shared/downloader/youtube/download.py).
