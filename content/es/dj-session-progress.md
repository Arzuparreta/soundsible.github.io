# Progreso de las sesiones DJ: primeras medidas

2026-10-30. Pregunta del oyente: ¿encajan mejor las transiciones y la música
seleccionada a medida que avanza una sesión, sin interacción?

**Resultado: se observa un vecindario de candidatas que evoluciona; no queda
establecida una mejora general de la compatibilidad de las transiciones.** La
hipótesis de la preparación necesita una distinción: la cobertura de análisis
en el momento de seleccionar una ruta no aumenta en general. Que el análisis
esté listo antes de la mezcla real sigue siendo un beneficio plausible que los
registros históricos no pueden medir por completo.

Esto es un estudio observacional más un contrafactual calculado offline. No
cambia la selección, el análisis, la planificación, la ejecución de audio ni la
telemetría. La aceptación física del oyente sigue registrada en HANDOFF; es una
evidencia distinta de una tendencia dentro de las sesiones.

## Evidencia y reproducibilidad

- Base de código: `main` fusionada en `81e331df`; los dos commits locales
  anteriores solo actualizan la instrucción de idioma y la aceptación física
  del oyente.
- Instantánea privada tomada el 2026-10-30 a las 17:10:03 UTC, con evidencia
  desde el 26 de octubre. Los clientes históricos y las versiones de análisis
  difieren entre estos días; no es una población exclusivamente posterior a P16.
- Journal del motor: 43 IDs de sesión DJ registrados; 12 tienen una respuesta
  de apertura no vacía en el segmento 0 y al menos un segmento posterior no
  vacío. Los reintentos en un mismo segmento cuentan una vez, usando su primera
  respuesta no vacía. Cada sesión tiene un voto.
- Registros de entrega locales de la cuenta, incluida su rotación gzip: ocho
  series de handoff inferidas elegibles, 58 intentos de pista completados. Las
  series requieren al menos cinco pistas, con cuatro handoffs, en el mismo
  dispositivo. Sus horas inferidas de inicio/fin deben enlazar con un margen de
  cinco segundos. La selección, la reanudación, las cargas ordinarias por
  ended/next, las entregas ausentes y los huecos mayores dividen las series.
  Cambiar el margen de enlace a dos o diez segundos sigue dando ocho series.
  Estas marcas de tiempo son horas de recepción en el servidor, no horas de
  observación del cliente. Restar el tiempo transcurrido del cliente estima una
  apertura solo si el retraso de entrega es pequeño; las peticiones retrasadas
  pueden dividir series o enlazarlas mal. La coincidencia temporal no es un ID
  de sesión.
- Base de datos de trazas: 42 capturas, 157 eventos de retirada. Solo cinco
  eventos `mix.started` conservan una técnica; los clientes antiguos la omiten.
  Una captura conservada tiene secuencias ausentes. La vida de una captura no es
  la vida de una sesión DJ.
- Caché de análisis actual: 515 análisis. Cuatro de las ocho series de entrega
  tienen análisis actual para todas las pistas, lo que da 31 pares para la
  repetición. Nunca se rellena un análisis ausente con una versión anterior ni
  se salta una pista ausente.

Los [resultados agregados](session-progress-results.json) incluyen hashes de
cada instantánea de entrada y del código Python relevante. Las bases de datos
en bruto, las identidades de dispositivo/sesión/canción y los registros quedan
fuera del repositorio, en `~/.cache/soundsible-dj-session-study/2026-10-30/`.
Las entradas SQLite se congelaron mediante la API de copia de seguridad en
conexiones de solo lectura, incluidos los datos WAL comprometidos. Las entradas
JSONL se copiaron; el estudio lee esas copias. No se adquirió ni decodificó
audio, y no se hicieron peticiones a proveedores.

```sh
.venv/bin/python docs/dj/session_progress_probe.py \
  --snapshot ~/.cache/soundsible-dj-session-study/2026-10-30 \
  --output /tmp/session-progress-results.json
.venv/bin/python -m pytest tests/test_dj_session_progress_probe.py -q
```

`plans.log` contiene solo líneas del journal con `dj-plan session=` desde el
26 de octubre. Las marcas de tiempo del journal usan Europe/Madrid; la
herramienta las convierte con sus reglas de zona horaria. Las marcas de tiempo
de entrega están en tiempo Unix. Los hashes de entrada distinguen una
instantánea nueva de una nueva ejecución. Ningún identificador de semilla ni de
sesión entra en la salida.

## Qué cambia durante una sesión

El cliente web actual llama a `rememberDjExploration` en los eventos reales de
reproducción y en las actualizaciones de reproducción hacia delante
(`stores/runtime.ts`). Admite canciones generadas en la dirección actual y
conserva cuatro raíces recientes distintas (`stores/dj.ts`). Esto no espera al
evento de aprendizaje de escucha de 30 segundos.

`_build_music_set_route` combina las fuentes explícitas con vecinas de estas
raíces. `_exploration_related` llama a `_planner_context_related` con
`personalise=False`: este camino se expande desde las canciones reproducidas;
la evidencia no muestra que se esté entrenando un modelo de gustos en línea
para mejorar esta sesión. También es distinto de usar todas las candidatas
propuestas como nuevas raíces.

La pertenencia se fija antes de leer los análisis. Después, el DJ ordena las
canciones medidas por continuidad; las canciones sin medir conservan sus
posiciones barajadas. Solo las próximas canciones aceptadas obtienen demanda de
preparación. El refinado puede mejorar después el plan de mezcla a medida que
llega su análisis. Por tanto, **una mejor preparación en el momento de ejecutar
y una mejor ordenación en el momento de seleccionar son hipótesis separadas**.

## Planificación: apertura frente a última reposición observada

Son medias emparejadas y con el mismo peso sobre las 12 sesiones elegibles del
planificador. Cada fila compara el primer segmento 0 no vacío de una sesión con
su último segmento no vacío observado. El último segmento observado no tiene
por qué ser el segmento final definitivo de la sesión.

| Medida | Apertura | Posterior | Sentido del cambio por sesión |
| --- | ---: | ---: | --- |
| Canciones candidatas disponibles | 29,5 | 57,75 | 11 crecieron, 1 disminuyó |
| Proporción analizada de la cohorte de planificación | 41,15 % | 29,69 % | 4 subieron, 6 bajaron, 2 empataron |
| Canciones analizadas en esa cohorte | 6,58 | 4,75 | 4 subieron, 6 bajaron, 2 empataron |
| Proporción de aciertos de caché en peticiones del grafo de relacionadas | 87,50 % | 61,25 % | 2 subieron, 10 bajaron |

La cohorte tiene 16 canciones en estas observaciones; incluye posibles
suplentes, así que su cobertura no es la fracción analizada de la ruta audible
final. Los aciertos de caché del grafo de relacionadas describen la búsqueda de
recomendaciones, no el audio descargado ni el análisis DJ. Su descenso es
coherente con raíces encontradas por primera vez; no identifica por sí solo por
qué apareció una candidata.

Todas las sesiones emparejadas conservan una sola fuente en ambos extremos. Los
registros no conservan el contenido de las fuentes ni las revisiones de
dirección, así que ese recuento no puede certificar la ausencia de ediciones
del usuario.

La sesión más reciente es un contraejemplo útil frente a una selección que se
precalienta de forma monótona: las candidatas pasan por 24 → 104 → 97, mientras
que los miembros analizados de la cohorte pasan por 1/16 → 0/16 → 1/16. La
música posterior suele salir de un vecindario más amplio y menos analizado, más
que de un conjunto fijo cada vez más precalentado.

## Entrega y repetición retrospectiva de pares

Para cada serie de entrega elegible, se comparan sus dos primeras pistas
entrantes de handoff con las dos últimas. No se solapan ni siquiera en la serie
más corta. Siete series registran cero rebuffering en ambos extremos. Una
registra 432,5 ms por pista entrante al principio y cero al final. Ningún
extremo comparado registra una recuperación. Estos eventos miden el
comportamiento declarado del transporte, no la fase de pulso ni la salida
física de audio.

Para las medidas musicales por pares, se repite la secuencia real con el
análisis actual en caché y el planificador puro actual. Esto es **un
contrafactual con el estado actual**: no recupera los planes históricos, la
disponibilidad de análisis, los cues manuales, las reservas del cliente ni las
restricciones de velocidad en ejecución. Las entradas de caché se emparejan por
identidad de producción y versión de análisis actual; en este estudio no se
revalidan sus sellos de origen frente a los bytes de audio.

| Serie totalmente repetible (número de serie de entrega) | Pistas | Puntuación: dos primeros → dos últimos pares | Proporción de reserva: dos primeros → dos últimos |
| --- | ---: | ---: | ---: |
| 28 oct., tarde (5) | 17 | 0,696 → 0,200 | 0 % → 50 % |
| 29 oct., mañana (6) | 5 | 0 → 0 | 100 % → 100 % |
| 30 oct., final de la mañana (7) | 5 | 0 → 0 | 100 % → 100 % |
| 30 oct., tarde (8) | 8 | 0,428 → 0,761 | 50 % → 0 % |

Solo la serie de 17 pistas coincide con una apertura de sesión del planificador
observada con un margen de cinco segundos. Las otras tres aparecen dentro de
sesiones existentes. **Cuatro series repetibles no son cuatro inicios de sesión
completos**, y la serie más larga tiene un voto, igual que la más corta. El
subconjunto repetible excluye la mitad de las series elegibles por falta de
análisis actuales; esa selección puede sesgar el resultado.

En las cuatro series, la puntuación media del planificador pasa de 0,281 a
0,240, la proporción de reserva se mantiene en el 62,5 % y el solapamiento
planificado pasa de 12,79 a 15,53 segundos. Los cambios medidos más pequeños
tampoco son coherentes entre sí: la diferencia de sonoridad baja de 1,06 a
0,91 LUFS, la diferencia de tasa de notas sube de 0,432 a 0,525 notas/s y la
diferencia de planitud espectral sube de 0,0302 a 0,0315. La puntuación del
planificador y la duración del solapamiento no son puntuaciones de calidad del
oyente; un solapamiento más largo no demuestra una mezcla mejor.

La herramienta también baraja 256 veces las canciones de cada serie que no son
de apertura, con semilla fija 0, conservando su apertura y su pertenencia. El
JSON agregado conserva las diferencias medias resultantes entre principio y
final. Esto es un control posicional, no una reconstrucción de los conjuntos
históricos de recomendaciones. La muestra es demasiado pequeña y está demasiado
seleccionada para interpretarlo como una prueba de significación de la calidad
de escucha.

## Los mismos pares con y sin análisis

Se replanifican los mismos 31 pares dos veces: con el análisis completo actual,
y solo con la duración de cada pista más la representación de producción de la
ausencia de análisis. La proporción de reserva pasa del 100 % sin análisis al
41,94 % con él: **18 de 31 pares pasan a admitir beatmatch en esta repetición**.

Esto confirma un mecanismo concreto por el que la preparación puede ayudar. No
mide cuántas transiciones reales esperaron al análisis, si eso ocurrió más a
menudo al principio ni si el oyente prefirió esas técnicas. Los valores de
solapamiento del planificador en frío no son duraciones reales de fundido del
cliente: siguen aplicándose las protecciones de confianza, la colocación y el
refinado del cliente.

## Interpretación y próxima medida

Posteriormente, el usuario autorizó la [captura automática enlazada](SESSION_CAPTURE.md).
Mide sesiones futuras; no cambia los resultados retrospectivos de este documento.

La afirmación mejor respaldada es que el vecindario musical de la sesión cambia
y normalmente se amplía. La mejora general del principio al final sigue sin
resolverse. Estos resultados ni demuestran una tendencia universal de
precalentamiento ni refutan la experiencia del oyente.

Para medir la afirmación original de forma prospectiva, la evidencia que falta es un
registro enlazado por sesión y transición, obtenido automáticamente:

1. ID de sesión, revisión de la dirección, ordinal de la transición y cambios de fuente,
   además de marcadores de avance manual frente a automático, pausa/reanudación y reconexión.
2. En la selección de ruta: pertenencia fija a la cohorte, cobertura medida y los
   cambios de características de la secuencia seleccionada, sin que la disponibilidad
   del análisis afecte a la pertenencia a la cohorte.
3. En el refinado/confirmación: si ambos análisis están listos, técnica elegida,
   cues, solapamiento, garantía de alineación y motivo de un plan conservador.
4. En la ejecución: técnica/velocidad real, reserva de señal/reloj y finalización,
   unidas a ese plan y esa pareja exactos en lugar de inferidas a partir de marcas de tiempo.

Comparar las dos primeras transiciones con las posteriores dentro de sesiones
sin cambios y desatendidas, por separado según la revisión del cliente y la
apertura en frío/caliente. Mantener la continuidad de la recomendación, la
preparación y la ejecución como resultados separados. Los registros existentes
no pueden reconstruir esos campos históricos que faltan. Un cambio futuro de la
captura debería recogerlos antes de modificar un algoritmo a raíz de este estudio.
Aquí no se incluye esa instrumentación de producción.

Validación: siete pruebas específicas cubren reintentos y deduplicación de subidas,
aperturas ausentes, límites de sesión, versiones de análisis ausentes, secuencias de
traza ausentes, campos de técnica ausentes y ponderación uniforme. Ruff y las
comprobaciones del diff pasan; los checks de la PR deben pasar en la cabecera remota
final antes de la entrega.
