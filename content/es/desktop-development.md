# Carcasa de escritorio Soundsible

Envoltorio de consumo Tauri para Soundsible. Utiliza el cuadro de diálogo oficial de la carpeta nativa, supervisa el motor incluido, expone los controles de la bandeja y entrega la vista web a `/player/desktop/`.

## Flujo de trabajo de desarrollo

**Departamentos Linux (una vez):** `webkit2gtk-4.1`, `gtk3`, `libappindicator-gtk3`, `librsvg`, `base-devel`\
Arch: `sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg base-devel`

Desde la raíz del repositorio, asegúrese de que los departamentos Python estén instalados (`venv/` existe).

```bash
cd desktop-shell
npm install
export SOUNDSIBLE_REPO_ROOT="$(cd .. && pwd)"
npm run dev
```

Anulaciones opcionales:

- `SOUNDSIBLE_PYTHON` — Binario Python (predeterminado: `venv/bin/python3`)
- `SOUNDSIBLE_ENGINE_BIN`: sidecar de PyInstaller para compilaciones empaquetadas
- `SOUNDSIBLE_CONFIG_DIR`: directorio de configuración (predeterminado: directorio de configuración de plataforma `soundsible`)

## Arquitectura

```
Tauri (Rust)  →  spawn soundsible_engine.py  →  poll desktop-engine-state.json
              →  health watchdog (3× fail @ 5s)  →  navigate webview to player
Tray: Open | Pair phone… | Restart engine | Stop engine | Quit
```

**Teclado (DT5):** Los atajos globales funcionan incluso cuando la ventana está oculta:

| Atajo        | acción                                                       |
| ------------ | ------------------------------------------------------------ |
| `Ctrl+Alt+O` | Abrir/enfocar la ventana principal                           |
| `Ctrl+Alt+P` | Emparejar teléfono (QR + lista de dispositivos emparejados)  |
| `Ctrl+Alt+R` | Reiniciar el motor                                           |
| `Ctrl+Alt+S` | Detener el motor (vuelve a la interfaz de usuario del shell) |
| `Ctrl+Alt+Q` | Salir (detiene el motor y sale)                              |

El icono de la bandeja al hacer clic con el botón izquierdo también enfoca la ventana. Al hacer clic derecho, se abre el menú de la bandeja (convención de plataforma).

Al cerrar la ventana, se oculta Soundsible en la bandeja y se mantiene la reproducción. Utilice **Salir** o `Ctrl+Alt+Q` para detener el motor y salir.

## Accesibilidad

- Los botones del shell utilizan objetivos táctiles mínimos de 44 px (`DESIGN.md` DT5)
- Contorno `:focus-visible` en los botones del shell; el foco se mueve a la acción principal al cambiar de vista (primera ejecución → cargando → error)
- La vista web carga el reproductor SolidJS responsivo compartido desde `/player/desktop/`.

La fuente de Shell reside en `shell-ui/` y Vite escribe el paquete `shell-ui-dist/` sin seguimiento consumido por Tauri. La interfaz de usuario del reproductor es el paquete `ui_web` existente que ofrece el sidecar.

## Emparejamiento de teléfono (§6)

IU de emparejamiento nativo en el shell (bandeja **Emparejar teléfono…** o `Ctrl+Alt+P`):

- Crea una sesión de emparejamiento a través de la API del motor (token de propietario en loopback)
- Muestra código QR + código de emparejamiento + URL de reclamo
- Estado de la sesión de encuestas hasta que el teléfono esté emparejado
- Enumera los teléfonos emparejados con revocación

Requiere que el motor esté en marcha (`Ready`). La pantalla de configuración del reproductor web todavía muestra el mismo flujo para los usuarios avanzados.

## Compilar

```bash
npm run build
```

El seguimiento del empaquetado del sidecar de PyInstaller se realiza por separado (revisión de inglés 4A). El modo de desarrollo ejecuta el motor de repositorio Python directamente.

### Construcción de sidecar (PyInstaller)

Requiere un venv con `requirements.txt` instalado más `librsvg` solo para la generación de íconos (no el sidecar).

```bash
./desktop-shell/scripts/build-sidecar.sh
```

Agrupe un **FFmpeg** estático junto al motor (recomendado para versiones de lanzamiento):

```bash
BUNDLE_FFMPEG=1 ./desktop-shell/scripts/build-sidecar.sh
```

Esto ejecuta `fetch-ffmpeg.sh`, integra FFmpeg en el sidecar cuando es posible y coloca `binaries/ffmpeg-<target-triple>` para Tauri `externalBin`. `/api/health` informa `ffmpeg.available`.

Esto escribe `desktop-shell/src-tauri/binaries/soundsible-engine-<target-triple>`, que Tauri incluye a través de `externalBin`. El shell prefiere el sidecar al repositorio Python cuando está presente.

**Validación de Windows RC:** [docs/DESKTOP\_BETA.md](../docs/DESKTOP_BETA.md) **Versión CI:** los instaladores se envían con el producto completo en una etiqueta `v*`; consulte [docs/RELEASING.md](../docs/RELEASING.md). Para una compilación sin versión, ejecute `.github/workflows/desktop-build.yml` manualmente.

Banderas de sidecar utilizadas por el shell:

| Bandera                 | Propósito                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `--bootstrap MUSIC_DIR` | Escriba al consumidor `config.json` antes del primer inicio.                                         |
| `--music-dir MUSIC_DIR` | Ruta de la biblioteca en tiempo de ejecución (también arranque automático si falta la configuración) |

**Usuarios recurrentes:** si `config.json` y `music_dir.json` ya existen, el shell omite la primera ejecución y arranca automáticamente el motor al iniciarse.

**Comenzar al iniciar sesión:** casilla de verificación opcional en la primera ejecución (utiliza las API de inicio automático de la plataforma a través de `tauri-plugin-autostart`).

### Prueba de humo

Comprobación sin cabeza del estado del motor + ruta del reproductor de escritorio:

```bash
./desktop-shell/scripts/smoke-test.sh              # Python engine
./desktop-shell/scripts/smoke-test.sh --with-sidecar
./desktop-shell/scripts/smoke-test.sh --with-sidecar --with-tauri
```

CI ejecuta las mismas comprobaciones en `.github/workflows/desktop-shell.yml` (trabajos Linux + Windows sidecar/Tauri).

**Sidecars Windows:** los corredores nativos producen `soundsible-engine-x86_64-pc-windows-msvc.exe` y `soundsible-engine-aarch64-pc-windows-msvc.exe`. CI verifica que el shell, el motor y FFmpeg coincidan con la arquitectura anunciada.

La entrega Windows RC es únicamente NSIS `.exe`. Cerrar la ventana principal la oculta en la bandeja; **Quit** detiene el motor y sale.

## Iconos (DT3)

Los iconos de bandeja y paquete se generan a partir de `branding/logo-mark.svg`:

```bash
./desktop-shell/scripts/generate-icons.sh
```

Requiere `rsvg-convert` (librsvg) y `@tauri-apps/cli`.

| Activo                                | Uso                                              |
| ------------------------------------- | ------------------------------------------------ |
| `src-tauri/icons/tray-idle.png`       | Glifo inactivo de la bandeja del sistema (32×32) |
| `src-tauri/icons/icon.{ico,icns,png}` | Paquete de aplicaciones/icono de ventana         |

**Notas de plataforma:**

- **Linux:** Glifo estático coloreado en la bandeja AppIndicator (animación del vúmetro aplazada).
- **Windows:** `.ico` de varios tamaños del conjunto.
- **macOS:** Glifo coloreado para v1; Icono de plantilla (barra de menú monocromática) diferido hasta que funcione la bandeja del medidor VU.
