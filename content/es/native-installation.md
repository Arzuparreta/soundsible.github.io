# Instalación nativa

<details>
<summary><b>🐧 &nbsp; Linux</b></summary>
<br>

```bash
# 1. Install prerequisites (Debian / Ubuntu)
sudo apt install -y git ffmpeg python3 python3-venv python3-pip nodejs npm

# 2. Get Soundsible
git clone https://github.com/Arzuparreta/soundsible.git
cd soundsible

# 3. Install web player deps (one-time; dist builds on engine start)
cd ui_web && npm ci && cd ..

# 4. Run it
python3 run.py
```

Comprueba `node --version`: se recomienda Node.js 24 LTS (la versión del proyecto
está registrada en `.nvmrc`). También se admiten Node 22.22.2+ y 26. Si tu distribución
incluye una revisión anterior, actualiza Node.js antes de ejecutar `npm ci`.

**Otras distribuciones** — cambia el paso 1:

- **Arch:** `sudo pacman -S git ffmpeg python python-pip nodejs npm`
- **Fedora:** `sudo dnf install git ffmpeg python3 python3-pip nodejs npm`

</details>

<details>
<summary><b>🍎 &nbsp; macOS</b></summary>
<br>

Requiere [Homebrew](https://brew.sh).

```bash
# 1. Install prerequisites
brew install git ffmpeg python node

# 2. Get Soundsible
git clone https://github.com/Arzuparreta/soundsible.git
cd soundsible

# 3. Install web player deps (one-time; dist builds on engine start)
cd ui_web && npm ci && cd ..

# 4. Run it
python3 run.py
```

</details>

<details>
<summary><b>🪟 &nbsp; Windows</b></summary>
<br>

En **PowerShell**:

```powershell
# 1. Install prerequisites
winget install Git.Git Python.Python.3.12 Gyan.FFmpeg OpenJS.NodeJS.LTS

# 2. Close and reopen PowerShell so the new tools are on PATH, then:
git clone https://github.com/Arzuparreta/soundsible.git
cd soundsible

# 3. Install web player deps (one-time; dist builds on engine start)
cd ui_web; npm ci; cd ..

# 4. Run it
python run.py
```

¿No tienes `winget`? Instala [Git](https://git-scm.com/download/win), [Python](https://www.python.org/downloads/) (marca *"Add to PATH"*), [Node.js](https://nodejs.org/) (LTS) y [FFmpeg](https://ffmpeg.org/download.html) manualmente.

En Windows, escribe `python` donde esta guía indique `python3`.

</details>

## Primera ejecución

La primera vez que ejecutas `python3 run.py`, se crea el entorno virtual del proyecto, se instalan las
dependencias de Python y, como aún no hay nada configurado, se abre la **página de configuración**
en lugar del menú. Abre **<http://localhost:5099/setup>**, elige dónde tienes
la música y guarda los cambios. Vuelve a la página del lanzador y pulsa **Iniciar** para
arrancar el motor; después, abre **<http://localhost:5005/player/>**. Mantén el
terminal abierto mientras escuchas música.

Para volver a abrir la configuración más adelante, ejecuta `python3 run.py --setup`.

## Ejecuciones posteriores

`python3 run.py` abre el menú del terminal:

| Tecla | Acción |
| --- | --- |
| `1` | Inicia el motor y abre el reproductor en tu navegador |
| `2` | Inicia el motor sin abrir el navegador |
| `3` | Abre el reproductor (el motor debe estar en marcha) |
| `4` | Detiene el motor |
| `5` | Busca en tu biblioteca desde el terminal |
| `6` | Vuelve a abrir la página de configuración |
| `q` | Sale del menú y también detiene el motor que este haya iniciado |

El menú está pensado para usarlo mientras estás delante del ordenador: mantén el terminal abierto mientras
escuchas música.

No necesitas usar el menú. Para ejecutar el motor sin él —en un servidor, en
`tmux` o con systemd—, usa `--daemon`:

```bash
python3 run.py --daemon   # Ctrl+C stops it
```

[Ejecución en un servidor](INSTALL.md#3-headless-server-ssh) explica ese modo y
el servicio de systemd. ¿Prefieres un panel en el navegador al terminal? Ejecuta
`./venv/bin/python start_launcher.py` (en Windows,
`.\venv\Scripts\python start_launcher.py`), abre **<http://localhost:5099>**
y pulsa **Iniciar**.
