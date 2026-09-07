# Soundsible para escritorio — Windows 1.0 RC

La aplicación de escritorio combina una interfaz Tauri, el motor empaquetado con PyInstaller y una copia de FFmpeg. Los usuarios no necesitan Python, Git, FFmpeg ni un terminal.

## Contrato actual de versión candidata

| Área             | Comprobación automatizada                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Windows 11x64    | Sidecar nativo, FFmpeg, Tauri y NSIS se compilan en `windows-latest`; automatización real de la interfaz de usuario       |
| Windows 11 ARM64 | Compilación nativa sobre `windows-11-arm`; Las comprobaciones de la arquitectura PE rechazan los binarios x64     |
| Primer inicio  | Diálogo oficial del directorio Tauri, cancelar/reintentar, ruta Unicode y validación de escaneo                        |
| motor            | Preparación del sidecar, estado, ruta del reproductor, disponibilidad de FFmpeg y cierre limpio del proceso            |
| Ciclo de vida    | Instalación silenciosa de NSIS, inicio, ocultación en bandeja, restauración, cierre y desinstalación                   |
| evidencia        | Capturas de pantalla, árbol de accesibilidad Windows, registros, sumas de verificación y procedencia de la compilación |

La versión del producto Windows es `1.0.0-rc.1`. La distribución para Windows utiliza únicamente NSIS `.exe`. MSI intencionalmente no forma parte de la superficie RC compatible.

## Lo que prueba la CI

`.github/workflows/desktop-shell.yml` ejercita la ruta interactiva en ambas arquitecturas a través del backend de automatización de interfaz de usuario Windows en `pywinauto`:

1. instalar en una ubicación temporal limpia;
2. lanzar con una configuración aislada;
3. abra y cancele el cuadro de diálogo de la carpeta nativa;
4. vuelva a abrirlo y seleccione una biblioteca de prueba Unicode;
5. espere el escaneo de carpetas y el estado del motor;
6. salir, reiniciar y demostrar que la biblioteca persistente omite la incorporación;
7. cerrar la ventana a la bandeja, restaurar con el acceso directo global y salir limpiamente;
8. verificar que no quede ningún motor huérfano;
9. desinstale y verifique que se hayan eliminado los archivos binarios de la aplicación.

`verify-pe-architecture.ps1` verifica el campo máquina de la aplicación, motor y FFmpeg. Es posible que los artefactos ARM64 no vuelvan silenciosamente a la emulación x64.

Las pruebas de la interfaz de escritorio en navegador comprueba por separado la cancelación, la localización, el diseño de ventana mínimo y el zoom del 200% sin superposición. El reproductor compartido mantiene su propia matriz de accesibilidad Compacta, Normal y Grande.

## Lo que CI no puede probar

Esto sigue siendo un versión candidata hasta que existan estas comprobaciones manuales:

- salida audible a través del hardware de audio Windows real;
- revisión visual y de teclado de la bandeja en un escritorio normal Windows 11;
- Comportamiento de SmartScreen y Microsoft Defender para el instalador distribuido;
- revisión de actualización en un perfil de usuario no efímero;
- identidad y reputación de firma de código.

Un RC automatizado sin firmar no debe describirse ni publicarse como la versión estable Windows.

## Compilar y publicar

Validación de interfaz local:

```bash
cd desktop-shell
npm ci
npm test
npm run test:ui
npm run frontend:build
```

Empaquetado nativo Windows:

```bash
BUNDLE_FFMPEG=1 ./desktop-shell/scripts/build-sidecar.sh
cd desktop-shell
npm run build
```

El flujo de trabajo de lanzamiento crea instaladores x64 y ARM64, emite manifiestos SHA-256, agrega certificaciones de procedencia de compilación GitHub y las publica en una etiqueta `v*` junto con las imágenes del servidor. Un candidato de lanzamiento, `vX.Y.Z-rc.N`, está marcado como prelanzamiento y nunca mueve la etiqueta del contenedor `latest`, por lo que publicar una versión candidata es una decisión expresa. Consulte [Publicar versiones](RELEASING.md).

## Requisitos pendientes para una versión estable

1. Firme la aplicación, el sidecar y el instalador con un certificado de firma de código Windows. **Bloqueado por elección, no por trabajo.** Un certificado cuesta dinero y requiere una identidad legal, y Soundsible no compra uno. Si la comunidad lo financia, el flujo de trabajo de lanzamiento obtiene un paso de firma; Hasta entonces, la aplicación de escritorio permanece en versión beta y sus instaladores se envían sin firmar, de ahí el aviso de editor desconocido. Nada más en esta lista lo está esperando.
2. Complete una ejecución humana de Windows 11 x64 y una ejecución de ARM64.
3. Valida reproducción real, comportamiento de bandeja, Defender y SmartScreen.
4. Valide la actualización desde la última versión beta pública sin perder la configuración.
5. Decida e implemente el canal de actualización estable antes de publicar `1.0.0`.
