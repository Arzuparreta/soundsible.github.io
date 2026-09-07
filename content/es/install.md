# Instalación y despliegue

Esta guía cubre la ejecución de Soundsible **más allá de la configuración local básica** del [README](../README.md): en un servidor, en segundo plano o accesible desde tu red.

> **¿Solo quieres ejecutarlo en tu propia máquina?** Sigue [Instalación en el README](../README.md#install). Para un servidor en contenedores, utilice el [despliegue con Docker](DOCKER.md). Esta página cubre el autoalojamiento manual (servidor, NAS, Tailscale, proxy inverso, systemd).

El punto de entrada admitido en todas partes es `python3 run.py`. Crea el entorno virtual del proyecto, repara uno roto, instala los requisitos y luego inicia el lanzador y el motor. Los flujos de trabajo de servidor y SSH utilizan el demonio heredado en un puerto fijo (`:5005`); el tiempo de ejecución del dispositivo de escritorio (`--desktop-engine`) escucha en la interfaz de loopback en un puerto aleatorio y está cubierto en [README](../README.md) y [ARCHITECTURE.md](./ARCHITECTURE.md).

***

## 1. Requisitos

- **Python 3.10+** y **git**
- **FFmpeg** — no incluido; instálelo a través del administrador de paquetes de su sistema operativo:
  - Debian/Ubuntu: `sudo apt install ffmpeg`
  - Arch: `sudo pacman -S ffmpeg`
  - Fedora: `sudo dnf install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Windows: `winget install Gyan.FFmpeg` o la [página de descarga FFmpeg](https://ffmpeg.org/download.html)

Opcional: un navegador moderno para la interfaz de usuario de la estación, Tailscale para acceso remoto y un NAS o backend de almacenamiento de objetos (R2/B2/S3) para bibliotecas grandes.

***

## 2. Servidor sin interfaz gráfica (SSH)

Igual que una instalación local, ejecútela a través de SSH:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip ffmpeg git
git clone https://github.com/Arzuparreta/soundsible.git
cd soundsible
python3 run.py          # first run opens setup; then choose "Start Station Engine"
```

Accede al reproductor desde otra máquina de la red:

```text
http://SERVER_LAN_IP:5005/player/
```

Para que siga funcionando después de desconectarse, utilice un administrador de procesos (`systemd`, `supervisord` o un multiplexor como `tmux`/`screen`) configurado según sus estándares habituales. La ruta del servidor asume el demonio heredado:

```bash
python3 run.py --daemon   # fixed port 5005, reachable on the LAN
```

***

## 3. Acceso remoto a través de Tailscale

[Tailscale](https://tailscale.com/) le brinda acceso remoto seguro sin reenvío de puertos ni configuración de VPN.

1. Instale e inicie sesión en Tailscale en la máquina que ejecuta Soundsible.

2. Inicie el motor de la estación.

3. Permita que su usuario administre Tailscale Serve una vez y luego publique el motor:

   ```bash
   sudo tailscale set --operator="$USER"
   tailscale serve --bg --yes --https=443 5005
   ```

4. Desde cualquier dispositivo en su tailnet, abra la URL HTTPS impresa por `tailscale
   serve status`, seguida de `/player/`. Se requiere HTTPS para la transmisión en vivo en navegadores; consulte [Live](LIVE.md#5-broadcasting-needs-https).

5. Si el nombre `.ts.net` no se resuelve en un cliente, habilite el DNS Tailscale allí con `sudo tailscale set --accept-dns=true`.

6. Opcionalmente, instale el reproductor web como PWA (consulte [README](../README.md#listen-everywhere)).

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
# ~/.config/systemd/user/tailscale-funnel-soundsible.service
[Unit]
Description=Tailscale Funnel for Soundsible Station Engine
After=tailscaled.service

[Service]
Type=oneshot
ExecStart=/usr/bin/tailscale funnel --bg --https=443 5005
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now tailscale-funnel-soundsible.service
```

***

## 4. Proxy inverso (opcional)

Sirve Soundsible detrás de Nginx, Caddy o Traefik:

1. Ejecute Station Engine en su puerto predeterminado (`5005`).
2. Reenvíe una ruta pública (por ejemplo, `https://music.example.com`) a `http://127.0.0.1:5005`.
3. Permita conexiones WebSocket/de larga duración en su configuración de proxy.

Dirige el proxy inverso al puerto del **demonio heredado**, no al puerto aleatorio de loopback del motor de escritorio. Consulta la documentación de tu proxy para configurar TLS y sus reglas concretas.

***

## 5. VPS con relé residencial YouTube

Si YouTube clasifica la dirección VPS como tráfico automatizado, Soundsible puede usar un relé oficial exclusivo de Tailscale en una PC Linux confiable. Esto preserva una estación VPS mientras mantiene la resolución de URL y la transferencia de medios en la misma salida residencial.

Siga [Retransmisión VPS verificada](VPS_RELAY.md). No lo sustituya por un proxy abierto con acceso a Internet.

***

## 6. Almacenamiento

De forma predeterminada, Soundsible utiliza el disco local en el host. Para bibliotecas más grandes o compartidas:

- **NAS/almacenamiento compartido**: monte una ruta NFS o SMB y apunte el asistente de configuración hacia ella.
- **Almacenamiento de objetos**: configure Cloudflare R2, Backblaze B2 o S3 genérico en el asistente de configuración.

Consulte [CONFIGURATION.md](./CONFIGURATION.md) para conocer las opciones de almacenamiento.

***

## 7. Seguridad básica

Soundsible está diseñado para un uso confiable **LAN / Tailscale**. Para cualquier cosa más allá de una sola máquina:

1. **No lo expongas públicamente.** Nunca reenvíes el puerto de la Estación (`5005`) o del Lanzador (`5099`) a Internet; usa Tailscale para acceso remoto.

2. **Proteger rutas de administrador con un token:**

   ```bash
   export SOUNDSIBLE_ADMIN_TOKEN='your-long-random-token'
   ```

   Envíelo como `Authorization: Bearer <token>` o `X-Soundsible-Admin-Token: <token>`. En el modo de motor de escritorio, Soundsible también crea un token de propietario de corta duración y lo inyecta automáticamente en `/player/desktop/`.

3. **Dirección de escucha del lanzador.** Por defecto, el lanzador solo escucha en localhost. Para permitir expresamente el acceso desde la LAN:

   ```bash
   export SOUNDSIBLE_LAUNCHER_BIND_ALL=true
   ```

4. **Orígenes CORS.** De forma predeterminada, la API acepta orígenes de navegador localhost, LAN privada y Tailscale. Para restringirlos:

   ```bash
   export SOUNDSIBLE_ALLOWED_ORIGINS='http://localhost:5005,http://192.168.1.10:5005'
   export SOUNDSIBLE_SOCKET_CORS_ORIGINS='http://localhost:5005,http://192.168.1.10:5005'
   ```

***

Para conocer las variables de entorno, el ajuste del descargador y las cookies YouTube, consulte [CONFIGURATION.md](./CONFIGURATION.md).
