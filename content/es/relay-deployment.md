# Pila en vivo de la comunidad Soundsible

Esta pila transmite audio de programa en vivo desde una estación Soundsible a los oyentes. Deliberadamente no graba audio, no reconstruye pistas, no ingiere micrófonos, no almacena el historial de chat ni implementa solicitudes de canciones. El chat es una sala transitoria de texto plano; un oyente puede escribir una solicitud como cualquier otro mensaje.

## Componentes y límites

- `community-api`: sesiones de DJ firmadas, directorio, metadatos de programas sincronizados, presencia, caché de portadas efímeras y chat Socket.IO.
- `mediamtx`: un editor WHIP Opus y lectores WHEP por sesión activa.
- `coturn`: descubrimiento STUN más respaldos TURN autenticados en TLS/TCP 443, UDP 443 y TCP 3478 para navegadores detrás de redes restrictivas.
- Nginx: TLS y el origen público único.
- Valores predeterminados: 5 sesiones simultáneas, 100 oyentes por sesión, 250 oyentes en total, 90 segundos para que el DJ se vuelva a conectar y 30 minutos antes de que una sala que nunca reprodujo una nota libere su espacio (`COMMUNITY_IDLE_SESSION_SECONDS`). Un DJ en un descanso sigue informando del programa, por lo que un descanso nunca cuenta como inactivo.

El servicio no mantiene ninguna repetición. Al cerrar una sesión se elimina el arrendamiento de la base de datos y el arte cargado; Los mensajes de chat solo se emiten a los clientes que se encuentran actualmente en la sala.

## Implementación de host

Copie `community_service/` y `deploy/community/` a un host con Docker Compose. Cree `deploy/community/.env` a partir de `.env.example`, reemplace `COMMUNITY_SECRET_KEY` y `COMMUNITY_TURN_SECRET` con valores aleatorios largos separados, instale `nginx-bootstrap.conf`, obtenga el certificado TLS correspondiente y reemplácelo con `nginx.conf`. El host oficial de IP única también instala `libnginx-mod-stream`, incluye `stream { include
/etc/nginx/streams-enabled/*.conf; }` en el nivel superior de Nginx, instala `nginx-turn-stream.conf` y mueve sus hosts virtuales HTTPS IPv4 a `127.0.0.1:8443`. Luego, el enrutador de transmisión envía el nombre de host TURN a Coturn y todos los demás nombres SNI a HTTPS. Adapte el nombre de host y la IP pública en ambos archivos para otra implementación. Luego ejecuta:

```bash
docker compose --env-file deploy/community/.env \
  -f deploy/community/docker-compose.yml up -d --build
```

Antes de comenzar y después de cada renovación del certificado TURN, coloque copias legibles en contenedor dentro de un directorio protegido por raíz:

```bash
install -d -m 700 deploy/community/certs
install -m 644 /etc/letsencrypt/live/turn.example.org/fullchain.pem deploy/community/certs/turn.crt
install -m 644 /etc/letsencrypt/live/turn.example.org/privkey.pem deploy/community/certs/turn.key
docker compose --env-file deploy/community/.env \
  -f deploy/community/docker-compose.yml restart coturn-tls
```

Exponga TCP 80/443/3478, UDP 443/3478, UDP y TCP 8189 y UDP 49152–50687. TLS/TCP 443 es la ruta TURN principal porque sobrevive a las redes que bloquean el tráfico 3478 y no HTTPS; UDP 443 y TCP 3478 siguen siendo alternativas. El rango UDP limitado se utiliza sólo para asignaciones de retransmisión autenticadas. Los puertos 18080, 18889 y TURN TLS 5349 se vinculan intencionalmente solo al bucle detrás de Nginx.

El estado y la capacidad se pueden verificar con:

```bash
curl -fsS https://live.84-247-161-82.sslip.io/health
docker compose --env-file deploy/community/.env \
  -f deploy/community/docker-compose.yml ps
```

## Conectar una estación

No se requiere configuración de estación para el servicio oficial Soundsible. La apertura **Live** se conecta a él a pedido; El inicio ordinario no realiza ninguna solicitud comunitaria externa a menos que la estación tenga una transmisión activa para reanudar.

Los operadores pueden configurar `SOUNDSIBLE_COMMUNITY_DISABLED=true` para eliminar el acceso o `SOUNDSIBLE_COMMUNITY_URL=https://live.example.org` para usar su propio relé. Un valor personalizado debe ser solo un origen HTTPS: se rechazan las credenciales, rutas, consultas y fragmentos.

Cuando se abre la comunidad por primera vez, cada cuenta local Soundsible recibe una identidad Ed25519 almacenada con la configuración de su cuenta. Sólo salen de la Estación las solicitudes de control firmadas; la clave privada y las credenciales Soundsible no.

Para una prueba de humo real del relé WebRTC después de activar la pila, ejecute ambos motores del navegador y solicite un pase de relé TURN como puerta de liberación:

```bash
cd ui_web
COMMUNITY_SMOKE_API=http://127.0.0.1:18080 COMMUNITY_SMOKE_BROWSERS=chromium,firefox node scripts/community-smoke.mjs
COMMUNITY_SMOKE_API=http://127.0.0.1:18080 COMMUNITY_SMOKE_BROWSERS=firefox COMMUNITY_SMOKE_FORCE_RELAY=1 node scripts/community-smoke.mjs
```
