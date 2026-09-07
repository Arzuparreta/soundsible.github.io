# Relé VPS verificado

YouTube clasifica algunas direcciones de centros de datos como tráfico automatizado. En esa topología, Soundsible puede mantener Station Engine en un VPS mientras resuelve y transfiere medios YouTube a través de una computadora Linux confiable en la red Tailscale del usuario.

Esta es una función de implementación avanzada. No es un proxy público, un servicio Soundsible alojado ni una forma de exponer una red doméstica a Internet.

## Topología soportada

```text
browser -> Station Engine on VPS -> Tailscale -> Soundsible relay on home PC -> YouTube
```

La URL de Googlevideo resuelta y sus bytes siempre usan la misma salida. El audio de vista previa en caché permanece en el VPS y ya no necesita la retransmisión.

Requisitos verificados v1:

- Linux y systemd en las máquinas de relé y estación.
- Tailscale conectado en ambas máquinas.
- El relé está vinculado únicamente a su IPv4 Tailscale.
- El IPv4 Tailscale de la estación es el único cliente permitido del relé.

## Instalar

En la PC de casa, desde su caja Soundsible:

```bash
sudo python3 run.py --relay install --station 100.x.y.z
python3 run.py --relay status
```

Reemplace `100.x.y.z` con el VPS Tailscale IPv4. El instalador crea y habilita `soundsible-relay.service`. Espera a `tailscaled.service` y a una dirección de tailnet utilizable en lugar de fallar repetidamente durante el arranque.

El instalador inspecciona la máquina antes de escribir algo, por lo que no puede tomar algo que ya pertenece a otro proyecto:

- **El puerto está ocupado.** Se niega a instalar y nombra el proceso que lo contiene. Pase `--port` para elegir uno gratis. Un puerto retenido por un relé que ya se está ejecutando en el mismo puerto es una reinstalación, no un conflicto, y continúa normalmente.
- **`/etc/systemd/system/soundsible-relay.service` ya existe y es diferente**; por ejemplo, porque lo editaste a mano. Se detiene en lugar de sobrescribir su archivo; Vuelva a ejecutar con `--force` una vez que lo haya revisado. Una unidad idéntica se deja sola, por lo que las instalaciones repetidas son idempotentes.

El comando imprime el valor a configurar en el VPS:

```bash
SOUNDSIBLE_YT_PROXY=http://100.a.b.c:8888
```

Agréguelo al entorno systemd de la estación, haga que la estación espere a `tailscaled.service`, luego vuelva a cargarla y reinicie:

```bash
sudo systemctl daemon-reload
sudo systemctl restart soundsible.service
```

No coloque el relé detrás de un proxy inverso público ni abra su puerto en el firewall de Internet.

## Verificar

Ejecute el verificador en el VPS, donde el relé ve la IP esperada de la estación:

```bash
python3 run.py --relay verify --proxy http://100.a.b.c:8888
```

El verificador comprueba el estado de la retransmisión, resuelve varios vídeos, recupera los primeros 256 KiB a través de la misma salida y realiza transmisiones simultáneas. Un informe legible por máquina está disponible con `--json`; repita `--video-id` para utilizar opciones locales buenas y conocidas.

Objetivos operativos:

- todas las sondas válidas completadas;
- resolución p95 igual o inferior a 3,5 segundos;
- primeros 256 KiB después de una resolución igual o inferior a 1 segundo;
- cuatro flujos concurrentes sin fallas de transporte.

Utilice el informe de reproducción local para obtener datos de escucha reales:

```bash
python3 scripts/playback_report.py \
  ~/.local/share/soundsible/users/USER_ID/telemetry/play-timing.jsonl
```

## Contrato de seguridad

El relé aplica todo esto en código:

- Tailscale Enlace IPv4 y lista permitida de estaciones;
- puertos 80/443 únicamente;
- YouTube, Googlevideo, ytimg y los sufijos de host de la API de Google requeridos únicamente;
- sin destinos literales de IP;
- sin respuestas DNS de loopback, privadas, de enlace local, reservadas o de multidifusión;
- sin registro de URL firmadas, cookies o parámetros de consulta.

`GET /healthz` es visible solo para una estación permitida y devuelve contadores operativos limitados. No contiene credenciales.

## Solución de problemas y reversión

Verifique ambos extremos por separado:

```bash
systemctl status soundsible-relay.service
journalctl -u soundsible-relay.service -n 100 --no-pager
tailscale ping 100.x.y.z
python3 run.py --relay verify --proxy http://100.a.b.c:8888
```

Si falla una actualización, restaure el servicio de retransmisión anterior o elimine `SOUNDSIBLE_YT_PROXY` y reinicie la estación. La extracción directa del centro de datos puede permanecer bloqueada por bots, pero los archivos locales y las vistas previas ya almacenadas en caché continúan reproduciéndose.
