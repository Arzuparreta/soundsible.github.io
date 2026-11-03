# Native installation

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

Check `node --version`: Node.js 24 LTS is recommended (the project version
is recorded in `.nvmrc`). Node 22.22.2+ and 26 are also supported. If your distribution
ships an older patch, update Node.js before `npm ci`.

**Other distros** — swap step 1:

- **Arch:** `sudo pacman -S git ffmpeg python python-pip nodejs npm`
- **Fedora:** `sudo dnf install git ffmpeg python3 python3-pip nodejs npm`

</details>

<details>
<summary><b>🍎 &nbsp; macOS</b></summary>
<br>

Requires [Homebrew](https://brew.sh).

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

In **PowerShell**:

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

No `winget`? Install [Git](https://git-scm.com/download/win), [Python](https://www.python.org/downloads/) (tick *"Add to PATH"*), [Node.js](https://nodejs.org/) (LTS), and [FFmpeg](https://ffmpeg.org/download.html) manually.

On Windows, type `python` wherever this guide says `python3`.

</details>

## First run

The first `python3 run.py` creates the project virtualenv, installs Python
dependencies and, because nothing is configured yet, starts the **setup page**
instead of the menu. Open **<http://localhost:5099/setup>**, choose where your
music lives and save. Go back to the launcher page and click **Launch** to
start the engine, then open **<http://localhost:5005/player/>**. Keep the
terminal open while you listen.

To reopen setup later, run `python3 run.py --setup`.

## Every run after that

`python3 run.py` opens the terminal menu:

| Key | Does |
| --- | --- |
| `1` | Start the engine and open the player in your browser |
| `2` | Start the engine without opening a browser |
| `3` | Open the player (the engine must already be running) |
| `4` | Stop the engine |
| `5` | Search your library from the terminal |
| `6` | Open the setup page again |
| `q` | Quit — this also stops the engine the menu started |

The menu is for a session at your computer: keep its terminal open while you
listen.

You do not need the menu. To run the engine without it — on a server, in
`tmux`, or under systemd — use `--daemon`:

```bash
python3 run.py --daemon   # Ctrl+C stops it
```

[Running on a server](INSTALL.md#3-headless-server-ssh) covers that mode and
the systemd service. Prefer a browser panel to the terminal? Run
`./venv/bin/python start_launcher.py` (on Windows,
`.\venv\Scripts\python start_launcher.py`), open **<http://localhost:5099>**
and click **Launch**.
