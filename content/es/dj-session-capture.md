# Evidencia automática de sesiones DJ enlazadas

2026-10-30. Continuación del [estudio retrospectivo](SESSION_PROGRESS.md).
El oyente autorizó la captura automática para medir si las sesiones DJ
ininterrumpidas mejoran a medida que avanzan. Esto añade observación, no una
política de mezcla. La implementación pertenece a la PR #409 hasta que se fusione.

## Alcance y propiedad

El reproductor web autenticado, incluida la PWA del iPhone, usa el recorder
local de la cuenta y la bandeja de salida persistente sin conexión ya
existentes. No requiere activación ni exportación. Android nativo queda fuera
de la cobertura de este recorder del navegador.

- `djSession`: ID opaco para un inicio real del DJ. Una selección externa crea
  un ID nuevo. Restaurar una sesión activa marca `startKnown=false`; no puede
  sustituir a una apertura observada.
- `edgeId`: ID opaco que une la primera selección, los refinados y una
  aparición/predecesor entrante concretos. Un predecesor distinto crea una
  arista nueva.
- `transitionId`: ID nuevo para cada intento de armado, que el mezclador real
  lleva durante el inicio, la cancelación, el fallo, la retirada y la reserva
  de retorno de velocidad. Volver a armar una arista refinada conserva su
  ordinal, pero recibe un ID de intento nuevo.
- `ordinal`: orden en que se comprometieron por primera vez aristas distintas
  en la sesión. Las aristas canceladas pueden dejar huecos; el informe no los
  oculta.
- `direction`, `planId`, `plannerSession`, `segment`: correlacionan respuestas
  de ruta aceptadas. Una sesión de medida es distinta de una petición al
  planificador o de la vida de una captura del navegador.

Las identidades de canción siguen siendo estado transitorio de la aplicación.
Estas observaciones no añaden títulos, IDs de canción, URLs de medios ni audio.
Los campos de observación nunca alimentan decisiones de planificación ni de
audio. Los IDs del mezclador pertenecen a esa mezcla, así que un callback
tardío no puede heredar la identidad de la sesión siguiente. El contexto de
sesión reducido se adjunta a eventos de transporte/conexión, no a cada
timeupdate de medios. El registro de aristas está limitado a 64 entradas. Los
cambios de fuente, las peticiones, las reordenaciones, las reparaciones, los
avances manuales, los seeks y las activaciones/desactivaciones de la mezcla
marcan intervenciones. La visibilidad por sí sola no excluye la escucha en
segundo plano.

La implementación del recorder solo se carga cuando se necesita por primera
vez la observación DJ, fuera de la carga inicial de la biblioteca. Mientras se
carga, se almacenan hasta 128 observaciones de preparación. Los IDs y el tiempo
de sesión se asignan de inmediato. Si la reproducción se adelanta a la carga
del módulo, la apertura se marca explícitamente como incompleta; un fallo de
importación emite `dj.capture_unavailable`. Ninguno de los dos casos retiene
la reproducción ni produce una apertura elegible en el informe. El presupuesto
de tamaño de la carga inicial no cambia.

## Etapas y unidades

| Evento | Observación |
| --- | --- |
| `dj.session_started/ended` | Apertura observada/restaurada, tiempo monotónico de sesión, dirección y motivo de fin |
| `dj.route` | Recuentos de candidatas/cohorte de la respuesta aceptada, miembros de la cohorte listos y longitud de la ruta |
| `dj.selected` | Disponibilidad observada del análisis saliente/entrante, puntuación del planificador, técnica, cues, solapamiento, velocidad y alineación |
| `dj.refined` | Respuesta solo de caché y si se adoptó; solo la adopción actualiza la lectura usada al comprometer |
| `dj.committed` | Plan vigente exacto entregado al mezclador, disponibilidad observada, manual/automático y mezcla activada/desactivada |
| `mix.started`, eventos existentes de reserva/suspensión/reanudación | Técnica, velocidad y solapamiento iniciales de ejecución y degradación posterior, ligados al intento armado |
| `dj.outcome`, `mix.cancelled/failed`, `handoff.retirement` | Transferencia de dominio, finalización, preparación, cancelación o fallo |
| `dj.interaction`, `dj.direction_changed`, eventos de transporte/conexión | Intervenciones e interrupciones |

Los cues y el solapamiento se expresan en segundos; la velocidad, como razón;
el tiempo de sesión, en milisegundos monotónicos. Los cambios absolutos de
características usan notas por segundo sonoro, LUFS de la grabación original y
planitud espectral adimensional, procedentes de respuestas normales de la API.
No se hacen análisis adicionales, trabajo especulativo ni peticiones de
recomendación. Las puntuaciones del planificador y la duración del solapamiento
no son valoraciones de calidad del oyente.

Un análisis desconocido es null, distinto de uno explícitamente sin analizar.
La disponibilidad al comprometer describe el análisis observado en su plan
aceptado, no una consulta independiente a la caché. Una arista de
colocación/reparación no observada sigue siendo desconocida; la colocación y la
reparación por el usuario también excluyen la sesión de la comparación
desatendida.

## Informe local

```sh
python3 scripts/dj_session_report.py \
  ~/.local/share/soundsible/users/<account>/telemetry/playback-traces.sqlite3
```

El informe usa el orden de secuencia del cliente e IDs explícitos; nunca
reconstruye sesiones con las horas de recepción de la subida. Elimina los
duplicados de reintentos, calcula el hash de las cargas leídas y emite
agregados numerados sin identificadores de cuenta, dispositivo, sesión,
transición ni canción. Se aplican la retención, el reintento sin conexión y la
exclusión voluntaria de telemetría existentes.

La elegibilidad exige una apertura observada y al menos cuatro transiciones
completadas con ordinales contiguos desde uno. Los huecos de secuencia, la
pérdida notificada, la selección/ejecución ausente, las aperturas desconocidas,
las intervenciones, las transiciones manuales/sin mezcla y las interrupciones
observadas de conexión/transporte son exclusiones explícitas. Se admite un
armado cancelado seguido de un refinado correcto de la misma arista; dos
finalizaciones que reclaman un mismo ordinal son ambiguas y se excluyen. La
configuración inicial de fuentes antes de cualquier selección se trata como
preparación; los cambios de dirección una vez iniciada la selección son
intervenciones.

Se comparan las dos primeras transiciones completadas con las dos últimas del
prefijo observado. Cada sesión tiene un voto; las comparaciones se agrupan por
revisión del código fuente del cliente, plataforma y disponibilidad observada
del análisis del primer par seleccionado (listo, no listo o desconocido). Eso
no afirma que todo el conjunto de candidatas estuviera precalentado. Las
lecturas desconocidas en un extremo retiran esa sesión de esa métrica. Un
inicio con beatmatch seguido de una reserva no cuenta como beatmatch mantenido.
Las sesiones que siguen en curso se etiquetan como abiertas.

Las trazas antiguas producen cero sesiones enlazadas. No se afirma ningún
resultado nuevo de escucha real antes de capturar sesiones nuevas. El sonido
físico y las preferencias quedan fuera de estas medidas. Los recuentos de
candidatas y las apariciones seleccionadas no reconstruyen todo el conjunto no
seleccionado.

## Validación

Las pruebas cubren la adopción/rechazo de refinados, el rearmado, los
predecesores cambiados, el dominio tardío, los valores desconocidos, la
eliminación de duplicados, la pérdida de trazas, las exclusiones por
interrupción y los cálculos emparejados. Una prueba de navegador/store enlaza
una selección en frío con un refinado medido aceptado sin identidades de
canción en los registros nuevos. La suite completa de navegador en los cuatro
perfiles y la CI remota siguen siendo requisitos de entrega.
