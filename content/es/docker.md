# Despliegue con Docker

Soundsible incluye una imagen de producción construida en varias etapas y una configuración de Compose. La imagen contiene FFmpeg, Chromaprint, las dependencias de Python y el reproductor SolidJS compilado; Node.js y las herramientas de compilación no forman parte de la imagen final.

Las imágenes se publican en GitHub Container Registry para `linux/amd64` y `linux/arm64`, por lo que un NAS, un Raspberry Pi o un Apple Silicon Mac ejecuta la misma imagen que un servidor x86 sin compilar nada.

| Etiqueta                                        | que es                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| `ghcr.io/arzuparreta/soundsible:edge`           | Cada commit que llega a `main`. Es la opción predeterminada actual. |
| `ghcr.io/arzuparreta/soundsible:latest`         | La versión etiquetada más reciente.                       |
| `ghcr.io/arzuparreta/soundsible:X.Y.Z` · `:X.Y` | Una versión concreta, fijada.                         |

Cada imagen publicada lleva una certificación firmada de procedencia de compilación. Verifique uno antes de ejecutarlo:

```bash
gh attestation verify oci://ghcr.io/arzuparreta/soundsible:edge --repo Arzuparreta/soundsible
```

## Inicio rápido

Sin clonar el repositorio ni instalar herramientas de compilación:

```bash
curl -O https://raw.githubusercontent.com/Arzuparreta/soundsible/main/compose.yaml
docker compose up -d
docker compose ps
```

O sin utilizar Compose:

```bash
docker run -d --name soundsible \
  -p 5005:5005 \
  -v soundsible-config:/config \
  -v soundsible-data:/data \
  -v soundsible-cache:/cache \
  -v soundsible-logs:/logs \
  -v soundsible-music:/music \
  ghcr.io/arzuparreta/soundsible:edge
```

Fije una versión en lugar de rastrear `main` configurando `SOUNDSIBLE_TAG` en un archivo `.env` al lado de `compose.yaml`, o nombrando la etiqueta directamente en `docker run`.

Cuando el servicio informe `healthy`, abra <http://localhost:5005/player/>. El primer arranque crea una configuración de proveedor local para `/music`. Los inicios posteriores reutilizan `/config/config.json` y nunca lo reemplazan.

La pila predeterminada utiliza cinco volúmenes con nombre. Con el nombre de proyecto de Compose predeterminado, Docker los almacena como `soundsible_soundsible-*`:

| Volumen                        | Ruta del contenedor | Contenidos                                                     |
| ------------------------------ | ------------------- | -------------------------------------------------------------- |
| `soundsible_soundsible-config` | `/config`           | Configuración de instancias, cuentas y bibliotecas de usuario. |
| `soundsible_soundsible-data`   | `/data`             | Colas persistentes, base de datos de instancias y telemetría   |
| `soundsible_soundsible-cache`  | `/cache`            | Portadas reconstruibles, vistas previas y caché multimedia     |
| `soundsible_soundsible-logs`   | `/logs`             | Registros de tiempo de ejecución                               |
| `soundsible_soundsible-music`  | `/music`            | Audio importado y descargado                                   |

`docker compose down` conserva los cinco volúmenes. No utilice `down --volumes` a menos que desee eliminar intencionalmente la instancia completa administrada por Docker.

## Usar una biblioteca existente en el equipo anfitrión

Reemplace el volumen de la música en `compose.yaml` con un montaje de una ruta absoluta del equipo anfitrión:

```yaml
services:
  soundsible:
    volumes:
      - /srv/music:/music
```

Soundsible se ejecuta como UID/GID `1000:1000`. El directorio montado debe poder ser leído y escrito por esa identidad si desea que Soundsible guarde las descargas:

```bash
sudo chown -R 1000:1000 /srv/music
```

Si el directorio debe permanecer como de sólo lectura, móntelo como `/music:ro`; la reproducción y el escaneo funcionan, pero las descargas y modificaciones de la biblioteca que escriben audio no. Abra **Configuración → Biblioteca → Volver a escanear archivos** después de montarlo. Soundsible indexa los archivos compatibles en su lugar; no copia ni cambia el nombre de los originales.

## Configuración y seguridad

Compose lee valores opcionales de un archivo `.env` al lado de `compose.yaml`:

```dotenv
SOUNDSIBLE_TAG=edge
SOUNDSIBLE_PORT=5005
SOUNDSIBLE_ADMIN_TOKEN=replace-with-a-long-random-value
SOUNDSIBLE_YT_SEARCH_SOURCE=ytmusic
SOUNDSIBLE_PREVIEW_CACHE_MB=2048
SOUNDSIBLE_COMMUNITY_DISABLED=false
```

Genere un token de administrador con `openssl rand -hex 32`. Soundsible está diseñado para una red LAN o Tailscale confiable; no exponga el puerto 5005 directamente a la Internet pública. Coloque un proxy inverso TLS o Tailscale delante cuando se requiera acceso remoto.

Para proporcionar una configuración existente en lugar de la local automática, móntela en `/config` y configure:

```yaml
environment:
  SOUNDSIBLE_CONTAINER_AUTO_CONFIGURE: "false"
```

Todas las variables de entorno de ejecución documentadas en [Configuración](CONFIGURATION.md) se pueden agregar a la sección Compose `environment`. Las rutas dentro del contenedor deben utilizar las rutas del contenedor (`/config`, `/data`, `/cache`, `/logs`, `/music`).

## Operaciones

La instalación con Docker se compila y arranca continuamente en GitHub Actions para cada pull request y cambio a `main` o `dev`. Una reconstrucción limpia programada también lo compara con imágenes base e índices de paquetes recién extraídos. Una marca verde `docker` significa que la implementación real de Compose arrancó correctamente, sirvió al reproductor, se ejecutó como su usuario sin privilegios y mantuvo la configuración de primera ejecución en una recreación de contenedor. Solo después de pasar esas comprobaciones, el trabajo `publish` envía la imagen de arquitectura múltiple, de modo que nada llegue a `edge` que no se haya iniciado y servido al reproductor en CI.

Ver estado y registros:

```bash
docker compose ps
docker compose logs -f soundsible
curl --fail http://localhost:5005/api/health
```

Actualice a una imagen más nueva y vuelva a crear el servicio sin tocar volúmenes:

```bash
docker compose pull
docker compose up -d
```

`docker compose up -d` reemplaza el contenedor cuando la imagen cambia y conserva los cinco volúmenes con nombre. No utilices actualizadores automáticos de imágenes: revisa y aplica las versiones de Soundsible de forma deliberada, de modo que un cambio en las dependencias no pueda alterar silenciosamente su servidor de música en ejecución.

### Actualizaciones de dependencia del mantenedor

La imagen de producción se instala desde el `requirements.docker.lock` con comprobación de hash, generado para su tiempo de ejecución Python 3.13. Evita que el mismo commit se resuelva mañana en un conjunto de dependencias Python diferente. Al cambiar `requirements.txt` o actualizar dependencias deliberadamente, regenéralo y confirme ambos archivos:

```bash
python3 -m pip install 'pip-tools==7.5.3'
pip-compile --upgrade --generate-hashes --strip-extras \
  --output-file requirements.docker.lock requirements.txt
```

CI rechaza un bloqueo Docker que no satisface un requisito directo. La reconstrucción diaria limpia de Docker sigue siendo responsable de los cambios en la imagen base y en el paquete Debian.

Haga una copia de seguridad del estado persistente mientras el servicio está detenido:

```bash
docker compose stop soundsible
docker run --rm \
  -v soundsible_soundsible-config:/source:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/soundsible-config-backup.tgz -C /source .
docker run --rm \
  -v soundsible_soundsible-data:/source:ro \
  -v "$PWD":/backup \
  alpine tar czf /backup/soundsible-data-backup.tgz -C /source .
docker compose start soundsible
```

Haga una copia de seguridad del volumen de la música por separado cuando contenga la única copia de su audio. Los volúmenes de caché y registros son opcionales en las copias de seguridad.

## Compilar desde el código fuente

`compose.yaml` deliberadamente no tiene sección `build:`, por lo que nunca puede compilar silenciosamente en hardware que no pueda permitírselo. Añade `compose.build.yaml` a la configuración cuando desee que la imagen se construya desde su árbol de trabajo:

```bash
git clone https://github.com/Arzuparreta/soundsible.git
cd soundsible
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

Configúrelo una vez para el shell en lugar de repetir ambos indicadores `-f`:

```bash
export COMPOSE_FILE=compose.yaml:compose.build.yaml
```

Esto es lo que hace CI, por lo que la prueba de humo de pull request ejercita el commit que se está revisando en lugar de la última imagen publicada.

## Construir la imagen directamente

```bash
docker build \
  --build-arg SOUNDSIBLE_VERSION=dev \
  --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
  -t soundsible:dev .
docker run --rm -p 5005:5005 \
  -v soundsible-config:/config \
  -v soundsible-data:/data \
  -v soundsible-cache:/cache \
  -v soundsible-logs:/logs \
  -v soundsible-music:/music \
  soundsible:dev
```
