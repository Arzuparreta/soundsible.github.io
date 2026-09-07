# Instalación nativa

Las instalaciones nativas requieren **Python 3.10+**, **git**, **FFmpeg** y **Node.js 22+**. Node se utiliza para la compilación inicial del reproductor SolidJS; el paquete de producción no se incluye en el repositorio. Los instaladores **beta de escritorio** incluyen el reproductor, por lo que se saltan el paso de compilación de Node.js.

## Elige tu sistema operativo

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
# or force a rebuild anytime: python3 scripts/ensure_ui_dist.py --force

# 4. Run it
python3 run.py
```

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
# or force a rebuild anytime: python3 scripts/ensure_ui_dist.py --force

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

</details>

## Primera ejecución nativa

Al ejecutar `python3 run.py` por primera vez, se crea el entorno virtual del proyecto y se instalan las dependencias de Python. Si aún no has configurado el almacenamiento, se abre el **asistente de configuración** en **<http://localhost:5099/setup>**; el menú de terminal todavía no aparece. Completa la configuración en el navegador y pulsa **Iniciar** en el lanzador para arrancar el motor.

En los siguientes inicios aparecerá un menú de terminal. Para empezar a escuchar:

```bash
python3 run.py          # choose "Start Station Engine & Open Station"
```

Eso arranca el motor y abre **<http://localhost:5005/player/>**. Mantén la terminal abierta mientras escuchas; al cerrarla se detiene el motor.
