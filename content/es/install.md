# Instalación y despliegue

Ejecuta Soundsible en tu ordenador o en un servidor y escucha música en el navegador.
Para usar contenedores, consulta la [guía de Docker](DOCKER.md). Si buscas una aplicación empaquetada, consulta
[Beta de escritorio](DESKTOP_BETA.md).

## Formas de ejecutarlo

Una instalación desde el código fuente tiene un único punto de entrada: `run.py`. En cada inicio se prepara el
entorno virtual del proyecto y se instalan los requisitos de Python que hayan cambiado; después, se ejecuta
Soundsible de una de estas tres formas:

| Comando | Qué se ejecuta | Cuándo usarlo |
| --- | --- | --- |
| `python3 run.py` | Un menú de terminal que inicia el motor, abre el reproductor y detiene el motor por ti. | Estás probando Soundsible en el ordenador que tienes delante. Al salir del menú se detiene el motor que haya iniciado. |
| `python3 run.py --daemon` | El motor por sí solo, en primer plano, con los registros en el terminal. `Ctrl+C` lo detiene. | Usas un servidor, una sesión de `tmux` o cualquier otro sistema que supervise procesos. |
| [Un servicio de systemd](#run-it-as-a-systemd-service) | `run.py --daemon` bajo systemd: se inicia al arrancar el sistema, se reinicia tras un fallo y escribe los registros en el diario. | Quieres que Soundsible esté siempre en marcha en Linux. |

Las tres opciones sirven el reproductor en `http://<machine>:5005/player/` y comparten
la misma configuración, biblioteca y cuentas, así que puedes empezar con el menú y
pasarte al servicio más adelante. Sea cual sea la primera que uses, tendrás que completar la
[configuración inicial](#first-run) una sola vez.

---

## 1. Requisitos

- **Python 3.10+**, **git** y **Node.js 24 LTS** con **npm** (también se admiten Node 22.22.2+ y 26)
  (el reproductor web se compila desde el código fuente al iniciar el motor).
- **FFmpeg** — no está incluido; instálalo con el gestor de paquetes de tu sistema operativo:
  - Debian/Ubuntu: `sudo apt install ffmpeg`
  - Arch: `sudo pacman -S ffmpeg`
  - Fedora: `sudo dnf install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: `winget install Gyan.FFmpeg` o la [página de descarga de FFmpeg](https://ffmpeg.org/download.html)

Opcional: Tailscale para el acceso remoto y un NAS o almacenamiento de objetos
(Cloudflare R2 o Backblaze B2) para bibliotecas grandes.

---

## 2. Instalación en tu ordenador

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

### Primera ejecución

La primera vez que ejecutas `python3 run.py`, se crea el entorno virtual del proyecto, se instalan las
dependencias de Python y, como aún no hay nada configurado, se abre la **página de configuración**
en lugar del menú. Abre **<http://localhost:5099/setup>**, elige dónde tienes
la música y guarda los cambios. Vuelve a la página del lanzador y pulsa **Iniciar** para
arrancar el motor; después, abre **<http://localhost:5005/player/>**. Mantén el
terminal abierto mientras escuchas música.

Para volver a abrir la configuración más adelante, ejecuta `python3 run.py --setup`.

### Ejecuciones posteriores

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

---

## 3. Servidor sin entorno gráfico (SSH)

Por SSH, sigue los pasos 1–3 de la instalación en Linux de la
[sección 2](#2-install-on-your-computer). Después, configura Soundsible una vez y
ejecuta el motor con `--daemon`, directamente o como servicio.

### Configuración inicial sin escritorio

La página de configuración solo escucha en el `localhost` del propio servidor. Redirige su puerto al
ordenador que estás usando:

```bash
# On your computer: open an SSH session that forwards port 5099
ssh -L 5099:localhost:5099 you@SERVER

# In that session, from the soundsible checkout on the server
python3 run.py --setup
```

Abre **<http://localhost:5099/setup>** en tu navegador, elige dónde está
la música en el servidor y guarda los cambios. Ignora **Iniciar**: detén la página de configuración
con `Ctrl+C` y arranca el motor como se indica a continuación.

Si prefieres acceder a la página de configuración por la LAN, haz que escuche en la red
expresamente para esta ejecución y abre `http://SERVER_LAN_IP:5099/setup`:

```bash
SOUNDSIBLE_LAUNCHER_BIND_ALL=true python3 run.py --setup
```

### Ejecutar el motor con `--daemon`

```bash
python3 run.py --daemon
```

Este es el modo de servidor: sin menú, con el motor en primer plano, sus registros en
el terminal y `Ctrl+C` para detenerlo. Escucha en todas las interfaces en el puerto
`5005`, así que cualquier dispositivo de la red puede abrir:

```text
http://SERVER_LAN_IP:5005/player/
```

Cambia la dirección con `--host` y `--port` (o `SOUNDSIBLE_HOST` y
`SOUNDSIBLE_PORT`); `--host 127.0.0.1` limita el acceso al propio equipo, por
ejemplo, detrás de un [proxy inverso](#5-reverse-proxy-optional). Si no hay una
configuración, se niega a arrancar y te indica que ejecutes primero `--setup`.

`--daemon` se detiene al cerrar su terminal. Ejecútalo dentro de `tmux` o `screen` para mantener
una sesión manual en marcha después de desconectarte, o deja que lo ejecute systemd.

### Ejecutarlo como servicio de systemd

En Linux, un servicio de systemd inicia Soundsible al arrancar el sistema, lo reinicia si
falla y conserva sus registros en el diario. Ejecuta estos comandos desde la
copia local de soundsible, con el usuario que completó la configuración, no desde una consola de root.
La unidad se escribe con ese usuario y esa carpeta ya incorporados:

```bash
sudo tee /etc/systemd/system/soundsible.service > /dev/null <<EOF
[Unit]
Description=Soundsible Station Engine
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
Environment=PYTHONUNBUFFERED=1
ExecStart=$PWD/venv/bin/python $PWD/run.py --daemon
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now soundsible
```

Es importante ejecutarlo con tu propio usuario: Soundsible guarda su configuración,
las cuentas y la base de datos de la biblioteca en el directorio personal de ese usuario, así que el
servicio utiliza exactamente lo que guardó la configuración inicial. Para ver qué se ha escrito, ejecuta
`cat /etc/systemd/system/soundsible.service`.

Uso cotidiano:

```bash
systemctl status soundsible          # is it running?
journalctl -u soundsible -f          # follow the log
sudo systemctl restart soundsible    # after an update or a config change
sudo systemctl stop soundsible       # stop it until the next boot
sudo systemctl disable --now soundsible   # stop it and stop starting at boot
```

Los ajustes que proceden del entorno —el token de administración, un relé de YouTube o
cualquier variable de [Configuración](CONFIGURATION.md#2-environment-variables)— se añaden a
un archivo de configuración complementaria, en lugar de a tu shell, ya que el servicio nunca lee el
perfil de tu shell:

```bash
sudo systemctl edit soundsible
```

```ini
[Service]
Environment=SOUNDSIBLE_ADMIN_TOKEN=your-long-random-token
```

Guarda los cambios y ejecuta `sudo systemctl restart soundsible`.

Tres cosas que debes saber cuando systemd se encarga del motor:

- **Gestiónalo con `systemctl`, no con el menú.** El menú solo detiene un motor
  que haya iniciado él mismo: salir del menú deja el servicio en marcha, y la opción `4`
  responde con el comando de `systemctl` que debes usar.
- **El servicio no ve el `PATH` de tu shell.** El motor vuelve a compilar el
  reproductor web con `npm` después de una actualización. Si instalaste Node.js con `nvm`, `fnm` u
  otro instalador por usuario, añade su directorio al archivo de configuración complementaria; por ejemplo,
  `Environment=PATH=/home/you/.nvm/versions/node/<version>/bin:/usr/local/bin:/usr/bin:/bin`.
- **Si el motor deja de responder, se reinicia automáticamente.** Si su bucle de peticiones
  no se ejecuta durante 60 segundos, el motor escribe la pila de cada hilo en
  el diario, debajo de una línea `Timeout (0:01:00)!`, y termina con el código de salida 1;
  `Restart=on-failure` inicia uno nuevo cinco segundos después. Esa entrada del diario
  es la que debes adjuntar a un informe de errores.

systemd solo está disponible en Linux. En otros sistemas, [Docker](DOCKER.md) con su
política `restart: unless-stopped` permite mantener Soundsible en marcha incluso después de
reiniciar el equipo.

### Otros comandos de `run.py`

| Comando | Acción |
| --- | --- |
| `python3 run.py --setup` | Abre únicamente la página de configuración en el puerto 5099. |
| `python3 run.py --users list` | Gestiona las cuentas sin navegador; `--users -h` muestra todos los comandos. Consulta [Cuentas](CONFIGURATION.md#6-accounts-multi-user). |
| `python3 run.py --relay …` | Instala o comprueba el relé residencial de YouTube. Consulta [Relé para VPS](VPS_RELAY.md). |
| `python3 run.py --help` | Muestra todas las opciones, incluidas `--host`, `--port` y las que permiten cambiar los directorios. |

`--desktop-engine` existe para la [aplicación de escritorio](DESKTOP_BETA.md), que inicia
su propio motor en un puerto local aleatorio; no debes ejecutarlo manualmente.

---

## 4. Acceso remoto mediante Tailscale

[Tailscale](https://tailscale.com/) le brinda acceso remoto seguro sin reenvío de puertos ni configuración de VPN.

1. Instala Tailscale e inicia sesión en el equipo que ejecuta Soundsible.
2. Inicia el motor de Station.
3. Permite que tu usuario gestione Tailscale Serve una sola vez y, después, publica el motor:

   ```bash
   sudo tailscale set --operator="$USER"
   tailscale serve --bg --yes --https=443 5005
   ```

4. Desde cualquier dispositivo de tu tailnet, abre la URL HTTPS que muestra `tailscale
   serve status`, seguida de `/player/`. HTTPS es obligatorio para emitir con Live
   desde el navegador; consulta [Live](LIVE.md#5-broadcasting-needs-https).
5. Si el nombre `.ts.net` no se resuelve en un cliente, activa allí el DNS de Tailscale
   con `sudo tailscale set --accept-dns=true`.
6. Si quieres, añade el reproductor a la pantalla de inicio: **Compartir → Añadir a pantalla de inicio**
   en iOS o **Menú → Instalar aplicación** en Android.

### Compartir el nodo con otros servicios

El estado `serve` y `funnel` de Tailscale pertenece a la **máquina**, no a Soundsible. Cada puerto HTTPS enruta `/` a exactamente un backend y solo están disponibles los puertos `443`, `8443` y `10000`. La última configuración de un puerto sustituye a la anterior sin avisar al servicio desplazado.

Es por eso que el paso 3 detalla `--https=443` en lugar de confiar en el valor predeterminado: el puerto es una elección, y en un equipo que ya publica otro servicio, debes elegir uno diferente.

```bash
tailscale serve --bg --yes --https=8443 5005   # Soundsible alongside another service
```

Soundsible nunca escribe esta configuración por usted. Lee su dirección Tailscale cuando la necesita, pero publicar la estación sigue siendo un acto deliberado, por lo que su instalación nunca puede ocupar un puerto que ya esté sirviendo otro proyecto.

### La estación está activa pero la URL `.ts.net` devuelve 502

Un `502 Bad Gateway` significa que Tailscale aceptó la solicitud y no encontró nada escuchando detrás del puerto. El motor de Soundsible puede estar funcionando correctamente: comprueba primero a dónde apunta realmente el nodo:

```bash
tailscale serve status                       # which backend owns each port?
curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5005/   # 200 = engine is healthy
```

Si `serve status` muestra un puerto dirigido a otro lugar que no sea `5005`, otro servicio lo reclamó; comúnmente uno instalado como una unidad systemd que recupera el puerto en cada arranque, razón por la cual esto tiende a aparecer justo después de reiniciar en lugar de cuando lo instala. Vuelva a ejecutar el paso 3 para recuperar el puerto y déle al otro servicio un puerto propio para que los dos dejen de intercambiarlo.

Para que su propia elección sobreviva a los reinicios, instálela como una unidad en lugar de dejarla con un comando que ejecutó una vez:

```ini
# /etc/systemd/system/tailscale-serve-soundsible.service
[Unit]
Description=Publish Soundsible on the tailnet
Wants=tailscaled.service
After=tailscaled.service

[Service]
Type=oneshot
ExecStart=/usr/bin/tailscale serve --bg --yes --https=443 5005
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tailscale-serve-soundsible.service
```

Esto publica la estación únicamente en tu tailnet, igual que el paso 3. `tailscale
funnel` la publicaría en todo Internet; lee las
[medidas básicas de seguridad](#8-security-baseline) antes de elegir esa opción.

---

## 5. Proxy inverso (opcional)

Sirve Soundsible detrás de Nginx, Caddy o Traefik:

1. Ejecuta el motor de Station con `--daemon` en su puerto predeterminado (`5005`), o
   con `--host 127.0.0.1` para que solo el proxy pueda acceder a él.
2. Redirige una ruta pública (p. ej., `https://music.example.com`) a `http://127.0.0.1:5005`.
3. Permite WebSocket y conexiones de larga duración en la configuración del proxy.
4. Haz que el proxy envíe la dirección de quien realiza la llamada en `X-Forwarded-For` (Caddy,
   Traefik y `tailscale serve` lo hacen de forma predeterminada; Nginx necesita
   `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
5. **Pon primero una contraseña a la cuenta** (Ajustes → Cuenta → Personas) si el proxy es
   accesible desde Internet.

Sin cuentas, Soundsible concede permisos de propietario a quienes realizan llamadas desde esta máquina, la LAN y la
red de Tailscale. Detrás de un proxy, todas las solicitudes proceden del proxy, así que
el motor decide según la dirección que este reenvía: quien llama desde
Internet no obtiene permisos de propietario, y un proxy que no identifica a quien realiza la llamada se considera
Internet. Un proxy que no reenvía nada en absoluto parece ser esta máquina, por lo que
un proxy público necesita una contraseña.

Dirige el proxy al puerto del servidor, no al motor de la aplicación de escritorio, que escucha en un puerto
local aleatorio. Consulta la documentación de tu proxy para configurar TLS y obtener ejemplos exactos.

---

## 6. VPS con relé residencial de YouTube

Si YouTube clasifica la dirección VPS como tráfico automatizado, Soundsible puede usar un relé oficial exclusivo de Tailscale en una PC Linux confiable. Esto preserva una estación VPS mientras mantiene la resolución de URL y la transferencia de medios en la misma salida residencial.

Siga [Retransmisión VPS verificada](VPS_RELAY.md). No lo sustituya por un proxy abierto con acceso a Internet.

---

## 7. Almacenamiento

De forma predeterminada, Soundsible utiliza el disco local en el host. Para bibliotecas más grandes o compartidas:

- **NAS / almacenamiento compartido** — monta una ruta NFS o SMB e indícasela al asistente de configuración.
- **Almacenamiento de objetos** — configura Cloudflare R2 o Backblaze B2 en el asistente de configuración.

Si la biblioteca está en una unidad de red montada y Soundsible se ejecuta como
[servicio](#run-it-as-a-systemd-service), haz que el servicio espere al montaje
con un archivo de configuración complementaria (`sudo systemctl edit soundsible`):

```ini
[Unit]
RequiresMountsFor=/mnt/music
```

Consulte [CONFIGURATION.md](./CONFIGURATION.md) para conocer las opciones de almacenamiento.

---

## 8. Medidas básicas de seguridad

Soundsible está diseñado para un uso confiable **LAN / Tailscale**. Para cualquier cosa más allá de una sola máquina:

1. **No lo expongas públicamente.** Nunca redirijas los puertos de Station (`5005`) o Launcher (`5099`) a Internet; usa Tailscale para el acceso remoto.

2. **Protege las rutas de administración con un token.** Genera uno con
   `openssl rand -hex 32` y pásaselo al motor, ya sea en el archivo de
   configuración complementaria del servicio (consulta [más arriba](#run-it-as-a-systemd-service)) o exportándolo en la
   shell que lo inicia:

   ```bash
   export SOUNDSIBLE_ADMIN_TOKEN='your-long-random-token'
   ```

   Envíalo como `Authorization: Bearer <token>` o `X-Soundsible-Admin-Token: <token>`. En el modo de motor de escritorio, Soundsible también crea un token de propietario de corta duración y lo inyecta automáticamente en `/player/desktop/`.

3. **Añade una contraseña cuando lo usen otras personas,** y antes de publicarlo con
   `tailscale funnel` o un proxy inverso público. Una instalación con una sola cuenta
   no tiene pantalla de inicio de sesión. Al añadir una segunda persona, se activa el inicio de sesión para todos; consulta
   [Cuentas](CONFIGURATION.md#6-accounts-multi-user).

4. **Dirección de escucha del lanzador.** El lanzador escucha en localhost de forma predeterminada. Para permitir expresamente el acceso por la LAN:

   ```bash
   export SOUNDSIBLE_LAUNCHER_BIND_ALL=true
   ```

5. **Orígenes CORS.** De forma predeterminada, la API acepta orígenes de navegador de localhost, de la LAN privada y de Tailscale. Para restringirlos:

   ```bash
   export SOUNDSIBLE_ALLOWED_ORIGINS='http://localhost:5005,http://192.168.1.10:5005'
   export SOUNDSIBLE_SOCKET_CORS_ORIGINS='http://localhost:5005,http://192.168.1.10:5005'
   ```

---

## 9. Actualización

Desde la copia local de soundsible:

```bash
git pull
cd ui_web && npm ci && cd ..
```

Después, reinicia Soundsible según cómo lo ejecutes: sal del menú y vuelve a abrirlo, detén y
vuelve a ejecutar `--daemon`, o ejecuta `sudo systemctl restart soundsible`. Al iniciarse, `run.py`
instala los requisitos de Python que hayan cambiado y vuelve a compilar el reproductor web, así que
no hay un paso de compilación aparte.

`git pull` sigue `main`, el mismo código que usa la imagen de contenedor `edge`. Si
clonaste una etiqueta de versión —como hacen los comandos rápidos de la web—, cambia a una
[versión](https://github.com/Arzuparreta/soundsible/releases) más reciente con
`git fetch --tags`, seguido de `git checkout` y la nueva etiqueta.

Las actualizaciones de Docker se explican en [Docker → Operaciones](DOCKER.md#operations).

---

Para conocer las variables de entorno, el ajuste del descargador y las cookies YouTube, consulte [CONFIGURATION.md](./CONFIGURATION.md).
