# Aplicación de escritorio (beta)

La aplicación de escritorio para Windows reúne en un solo instalador el Station
Engine, el reproductor web, FFmpeg y ffprobe. No necesitas Python, Git,
Node.js, FFmpeg ni un terminal.

El instalador también ofrece **Conectar a un servidor**, para una estación que
ya tengas funcionando de forma nativa, en Docker o en otro ordenador. Consulta
[Cliente de escritorio](DESKTOP_CLIENT.md) para los modos de conexión.

En el modo **Usar este ordenador como servidor**, da servicio al ordenador en el que está instalada: su motor escucha en `127.0.0.1`
en un puerto aleatorio, no en tu red. Para escuchar desde un móvil u otro
ordenador, ejecuta Soundsible como servidor — [de forma nativa](INSTALL.md) o
con [Docker](DOCKER.md).

## Descargas

Cada [versión](https://github.com/Arzuparreta/soundsible/releases) adjunta:

| Archivo | Para | Qué comprueba la CI |
| --- | --- | --- |
| `Soundsible_<version>_x64-setup.exe` | Windows 11 x64 | Lo instala, lo ejecuta y lo desinstala a través de la interfaz real de Windows ([más abajo](#what-ci-proves)) |
| `Soundsible_<version>_arm64-setup.exe` | Windows 11 ARM64 | Lo mismo, en un ejecutor ARM64 nativo |

No hay versión para macOS. En un Mac, usa la [instalación nativa](INSTALL.md)
o Docker.

### No hay aplicación para Linux

Linux no tiene aplicación de escritorio. Ejecuta la estación [de forma
nativa](INSTALL.md) — como [servicio de systemd](INSTALL.md#run-it-as-a-systemd-service)
si debe arrancar con el sistema — o con [Docker](DOCKER.md), y abre el
reproductor en un navegador. Chrome y los demás navegadores Chromium lo
instalan como aplicación; Firefox lo reproduce en una pestaña. Ambos manejan
las teclas multimedia y los widgets del escritorio.

Las versiones anteriores adjuntaban una aplicación para Linux (un `.deb`, y más
tarde también un `.rpm` y un Flatpak). Se retiró porque en Linux una aplicación
Tauri dibuja el reproductor con WebKitGTK, no con el motor del navegador: era
más lenta que el mismo reproductor en Chrome o Firefox, se quedaba bloqueada al
abrir Now Playing en un portátil con gráficos Intel y necesitaba un parche por
cada defecto de WebKitGTK (sin sonido a través de un MediaStream, fotogramas
obsoletos de su compositor, una ventana en blanco con NVIDIA, sin decodificador
AAC en Debian y Ubuntu). Una aplicación peor que el navegador no tiene razón de
ser. Para quitar una ya instalada:
`flatpak uninstall io.github.Arzuparreta.Soundsible`, `sudo apt remove
soundsible` o `sudo dnf remove soundsible`.

Los instaladores de Windows vienen con `SHA256SUMS-x64.txt` y
`SHA256SUMS-arm64.txt`, y llevan atestaciones de procedencia de la compilación
que puedes comprobar con
`gh attestation verify <installer> --repo Arzuparreta/soundsible`. **No están
firmados**, así que Windows avisa de un editor desconocido; consulta
[Bloqueos de la versión estable](#stable-release-blockers) para saber por qué.

La aplicación lleva el mismo número de versión que el resto de la versión.
"Beta" describe la madurez del shell de escritorio, no una versión aparte —
consulta [Publicación de versiones](RELEASING.md).

## Uso

- **El primer inicio** ofrece una dirección de servidor o el flujo de la
  carpeta de música local, y ofrece iniciar Soundsible al iniciar sesión.
- **Cerrar la ventana** oculta Soundsible en la bandeja y mantiene la
  reproducción. **Salir** en el menú de la bandeja o de la ventana, o
  `Ctrl+Alt+Q`, sale y detiene solo el motor iniciado por esta aplicación. Las
  estaciones externas siguen funcionando. Sin una bandeja utilizable, cerrar
  sale. El resto de acciones de la bandeja y atajos están en el
  [README del shell de escritorio](../desktop-shell/README.md#architecture).
- **Actualizar**: no hay actualización automática. Instala la versión nueva
  encima de la antigua. La actualización de una instalación existente aún no ha
  tenido una revisión humana (consulta los [bloqueos](#stable-release-blockers)),
  así que copia antes el
  [directorio de configuración](CONFIGURATION.md#7-where-soundsible-keeps-its-files)
  a un lugar seguro.

## Lo que prueba la CI

| Área | Comprobación automatizada |
|------|----------------|
| Windows 11 x64 | Sidecar nativo, FFmpeg, Tauri y NSIS compilados en `windows-latest`; automatización real de la interfaz |
| Windows 11 ARM64 | Compilación nativa en `windows-11-arm`; las comprobaciones de arquitectura PE rechazan binarios x64 |
| Primer inicio | Diálogo de carpeta oficial de Tauri, cancelar/reintentar, ruta Unicode y validación del escaneo |
| Motor | Preparación del sidecar, estado, ruta del reproductor, conversión y análisis de audio incluidos y cierre del proceso |
| Ciclo de vida | Instalación silenciosa con NSIS, inicio, ocultar en la bandeja, restaurar, salir y desinstalar |
| Evidencia | Capturas de pantalla, árbol de accesibilidad de Windows, registros, sumas de verificación y procedencia de la compilación |

Windows se distribuye solo como `.exe` de NSIS; no hay MSI.

`.github/workflows/desktop-build.yml` recorre el camino interactivo en ambas
arquitecturas de Windows mediante el backend de Windows UI Automation de
`pywinauto`:

1. instalar en una ubicación temporal limpia;
2. iniciar con una configuración aislada;
3. abrir y cancelar el diálogo nativo de carpetas;
4. volver a abrirlo y elegir una biblioteca de prueba con nombre Unicode;
5. esperar al escaneo de la carpeta y a que el motor esté sano;
6. salir, volver a iniciar y comprobar que la biblioteca guardada evita la configuración inicial;
7. cerrar a la bandeja, restaurar con el atajo global y salir limpiamente;
8. verificar que no queda ningún motor huérfano;
9. desinstalar y verificar que se eliminan los binarios de la aplicación.

`verify-pe-architecture.ps1` comprueba el campo de máquina de la aplicación, el
motor y FFmpeg. Los artefactos ARM64 no pueden recurrir en silencio a la
emulación x64.

Una batería de pruebas del shell en el navegador comprueba por separado la
cancelación, la localización, el diseño con la ventana mínima y el zoom al 200 %
sin solapamientos. El reproductor compartido mantiene su propia matriz de
accesibilidad Compacta, Normal y Grande.

## Lo que la CI no puede probar

La aplicación sigue en beta hasta que existan estas comprobaciones humanas:

- salida audible a través de hardware de audio real de Windows;
- revisión visual y con teclado de la bandeja en un escritorio normal de Windows 11;
- comportamiento de SmartScreen y Microsoft Defender con el instalador distribuido;
- revisión de la actualización en un perfil de usuario no efímero;
- identidad y reputación de firma de código.

Una compilación sin firmar no debe describirse ni publicarse como una versión
estable de Windows.

## Compilación y publicación

Validación local de la interfaz:

```bash
cd desktop-shell
npm ci
npm test
npm run test:ui
npm run frontend:build
```

Empaquetado nativo de Windows:

```bash
BUNDLE_FFMPEG=1 ./desktop-shell/scripts/build-sidecar.sh
cd desktop-shell
npm run build
```

El flujo de publicación compila los instaladores de Windows x64 y ARM64, genera
los manifiestos SHA-256, añade a los instaladores atestaciones de procedencia
de GitHub y los publica en una etiqueta `v*` junto con las imágenes del
servidor. Una versión candidata — `vX.Y.Z-rc.N` — se marca como prepublicación
y nunca mueve la etiqueta `latest` del contenedor. Consulta
[RELEASING.md](RELEASING.md).

## Bloqueos de la versión estable

1. Firmar la aplicación, el sidecar y el instalador con un certificado de firma
   de código de Windows. **Bloqueado por decisión, no por trabajo.** Un
   certificado cuesta dinero y exige una identidad legal, y Soundsible no va a
   comprarlo. Si la comunidad lo financia, el flujo de publicación añadirá un
   paso de firma; hasta entonces la aplicación de escritorio sigue en beta y sus
   instaladores se publican sin firmar, que es lo que significa el aviso de
   editor desconocido. Nada más de esta lista depende de ello.
2. Completar una ejecución humana en Windows 11 x64 y otra en ARM64.
3. Validar la reproducción real, el comportamiento de la bandeja, Defender y SmartScreen.
4. Validar la actualización desde la última beta pública sin perder la configuración.
5. Decidir e implementar el canal de actualización estable antes de publicar una
   versión de escritorio estable.

## Mismo motor y mismo reproductor

Los instaladores usan las mismas fuentes del Station Engine y del reproductor
web que cualquier otra instalación, para x64 y ARM64; no hay una rama de
funciones separada ni más antigua. El paquete de escritorio sirve en localhost;
el uso en red o como servidor es un modo de instalación distinto.

El paquete multimedia incluye `ffmpeg` y `ffprobe`. La reparación de la
biblioteca usa ffprobe para inspeccionar códecs y contenedores, y el análisis
DJ lo usa para obtener la duración de las pistas. Una instalación independiente
no debe depender de un FFmpeg del sistema para aportar el analizador que falta.
Windows mantiene el sufijo `.exe` en ambas herramientas, también dentro del
motor empaquetado.

La CI de escritorio y las compilaciones de publicación ejercitan esa pareja
generando audio FLAC en una ruta Unicode y analizando su códec y su duración.
Las comprobaciones de escritorio también se ejecutan cuando cambian el
reproductor compartido, el descargador, la configuración inicial o la interfaz
web. Esto comprueba el procesamiento multimedia, no la reproducción audible a
través del hardware de Windows.
