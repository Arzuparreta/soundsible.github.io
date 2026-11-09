# Optimizaciones medidas de la biblioteca y el runtime

Referencia: `main` integrado en `3c7e4af39a523141de21f14f3891e935728bc864`.
El criterio de aceptación de esta revisión es una mejora demostrada superior al 0,5 % en
una métrica de extremo a extremo, o una mejora demostrada de funcionalidad o fiabilidad.
Las mejoras pequeñas también cuentan. Medir el tiempo de una función auxiliar aislada no sirve como prueba de aceptación.

## Implementado

- Las huellas públicas usan getters de atributos/elementos implementados en C, con el mismo orden
  de campos y los mismos bytes de pickle. Se siguen ejecutando todas las verificaciones de modelos mutables; una
  edición sin guardar nunca se considera fiable solo porque coincida la revisión de SQLite.
- La construcción de pistas reutiliza el conjunto de campos de su dataclass; las copias públicas reutilizan los nombres
  de los campos y hacen una copia superficial de las listas compuestas exclusivamente por cadenas inmutables.
  Las subclases y otros valores mutables conservan la ruta general. Las copias siguen
  siendo independientes y las rutas privadas de escaneo siguen excluidas.
- El JSON portable selecciona el codificador medido para su intérprete: la ruta plana
  de escalares/listas de cadenas en Python anterior a 3.13 y el codificador C estándar con sangría
  en las versiones más recientes. Ambos producen bytes idénticos, incluidos los valores
  ampliados/anidados. Solo se almacenan en caché los prefijos de claves del esquema, con un límite de 128 nombres.
- Las ediciones explícitas de metadatos verifican el estado anterior a la edición y el candidato reconstruido
  frente a la huella canónica, y después actualizan únicamente el hash de la fila pública modificada.
  Ya no seleccionan ni calculan el hash de todas las filas públicas almacenadas. Las mutaciones no declaradas,
  los cambios de orden, los conflictos de revisión y los fallos de proyección revierten la operación.
  El mantenimiento de búsqueda/catálogo y las exportaciones portables completas conservan sus contratos.
- ODST calcula el hash de los bytes exactos, con los saltos de línea de la plataforma, a medida que los escribe, eliminando
  la relectura posterior a la publicación. La confirmación de una descarga reutiliza la revisión comprobada
  bajo su bloqueo de publicación, en lugar de calcular dos veces el hash de la misma entrada.
- Una publicación ODST correcta conserva un resumen y el desplazamiento en bytes de los
  campos finales de podcasts, nunca una segunda instantánea de podcasts/biblioteca. En un guardado posterior,
  un resumen completo coincidente del archivo permite leer solo ese sufijo.
  Los archivos externos, los reinicios, los modelos no válidos y los resúmenes modificados usan el lector
  completo con validación. Los fallos de publicación conservan los tokens anteriores. También se benefician las bibliotecas
  de música con campos de podcasts vacíos. La serialización y una
  lectura completa para calcular el hash del contenido siguen siendo proporcionales al tamaño de la biblioteca.
- La búsqueda local usa SHA-256 para su comprobación en lugar de BLAKE2b. Su token de formato
  persistido cambia explícitamente; las mismas filas normalizadas se comprueban y se
  vuelven a resumir una vez, sin repetir la normalización. Las coincidencias, la clasificación y el SQL de candidatos no
  cambian. Otros cambios de formato/intérprete/Unicode siguen reconstruyendo el índice.
- La comprobación de vigencia del shell usa una sola pasada de scandir/stat y un pequeño manifiesto de
  entradas en disco. Después de un build correcto, las eliminaciones, los cambios de nombre, las
  adiciones con marcas de tiempo antiguas y los cambios de tamaño invalidan el bundle. Una edición durante un build se
  detecta en el siguiente renderizado. Los bundles existentes sin manifiesto conservan el
  mecanismo anterior basado en mtime hasta su siguiente build. No se introduce ningún observador del código fuente ni hilo
  en segundo plano; el build automático, los bundles externos y los indicadores para omitirlo funcionan
  como antes. No se calcula un hash del contenido de las ediciones del mismo tamaño cuyas marcas de tiempo se hayan restaurado deliberadamente.
- Las carátulas conservan como máximo 256 nombres/plazos, sin datos de imagen ni descriptores abiertos.
  Un acierto reciente comprueba la identidad y las marcas de tiempo del archivo de índice, la ausencia de un journal,
  la cuota actual y los enlaces simbólicos de control antes de omitir SQLite y los bloqueos. Cualquier
  otro escritor, caducidad, cambio de cuota o publicación interrumpida restablece
  la ruta coordinada. Cada respuesta abre su descriptor y es responsable de él. Se mantienen los originales,
  la conciliación de cuotas, la expulsión y las actualizaciones LRU como máximo una vez por minuto.

## Reproducción y evidencias

Todos los fixtures usan directorios desechables. No se modifica ningún servicio de producción, biblioteca del usuario,
sidecar instalado ni proveedor remoto. No ejecutes suites de pruebas
ni builds simultáneos durante las mediciones.

```sh
venv/bin/python scripts/benchmark_runtime_optimizations.py \
  --sizes 200 1000 10000 50000 --repeats 7 \
  --output docs/performance/runtime-optimizations.jsonl
venv/bin/python scripts/benchmark_runtime_candidates.py \
  --output docs/performance/runtime-candidates.jsonl
```

El banco de pruebas de la biblioteca alterna operaciones históricas y actuales, e incluye
SQLite real, exportaciones portables duraderas y respuestas de Flask. Solo la búsqueda en el núcleo se vincula
a la biblioteca sintética; los almacenes de carátulas/sonoridad y las rutas son reales.
Cada copia exportada debe ser igual al JSON público, cada delta debe contener su
edición y cada respuesta debe cumplir el estado/contenido esperado. Los métodos históricos
se compilan desde git contra el banco de pruebas actual; se comparan
esas operaciones, sin arrancar una copia antigua de la aplicación.

El tiempo real transcurrido y la CPU integrada del proceso se registran por separado. Las escrituras duraderas de bibliotecas pequeñas
están dominadas por la latencia física variable de fsync; una reducción de CPU
no implica un menor tiempo real mediano en cada muestra. Los modelos cargados, las
asignaciones nativas de SQLite y otros procesos quedan fuera del alcance de CPU/asignaciones.

El banco de pruebas de candidatos sirve un fixture del shell con los nombres reales de los archivos de entrada
del repositorio, resultados de búsqueda local mediante el selector/clasificador real de SQLite y
el transporte JSON, y 50 carátulas generadas diferentes a través de la ruta de carátulas de producción.
Son operaciones completas del servidor, no mediciones de renderizado del navegador, batería ni
reproducción audible.

La matriz sin procesar de operaciones completas está en [runtime-optimizations.jsonl](runtime-optimizations.jsonl).
Es anterior a la ampliación final de JSON específica de cada intérprete; la exportación completa final
con tres copias se mide por separado en
[Python 3.12](portable-encoder-py312.jsonl) y
[Python 3.14](portable-encoder-py314.jsonl). Cada archivo registra el intérprete y los
hashes del código fuente. La comparación adicional de codificadores usa el modelo de producción y
las funciones auxiliares de archivos atómicos, excluyendo SQLite y los objetos de proveedores.

Siete muestras alternas por operación, 10.000 pistas, milisegundos:

![CPU integrada del proceso para operaciones completas de biblioteca con 10.000 pistas](runtime-cpu.svg)

| Operación completa | Tiempo real de referencia | Tiempo real actual | Reducción de CPU del proceso |
| --- | ---: | ---: | ---: |
| HTTP de biblioteca sin cambios | 32.82 | 19.85 | 39.5% |
| HTTP de biblioteca completa | 150.12 | 112.50 | 25.1% |
| HTTP de biblioteca incremental | 137.36 | 105.21 | 40.4% |
| Edición de título, SQLite + dos exportaciones | 414.23 | 339.65 | 31.1% |
| Guardado canónico completo + dos exportaciones | 494.16 | 464.70 | 15.2% |
| Exportación portable | 339.89 | 283.22 | 25.9% |
| Confirmación de descarga + conservación de podcasts + publicación | 280.57 | 197.43 | 48.7% |
| Carga de instantánea del pool | 144.39 | 124.77 | 13.6% |

Con 50.000 pistas, el HTTP sin cambios pasa de 164.16 a 94.93 ms; las ediciones completas
de títulos, de 1,925.71 a 1,503.55 ms; las confirmaciones de descargas, de 1,283.96 a 887.32 ms.
Con 200 pistas, las reducciones de CPU van del 9,9 % al 42,7 %, pero el tiempo real,
ruidoso y dominado por fsync, incluye regresiones (confirmación de descarga de 35.50 a 38.76 ms y delta
de 55.30 a 58.67 ms). No se afirma que la latencia mejore en todos los casos.

Tras la integración final del codificador y la reparación de la comprobación de filas anulables, una
[nueva ejecución de integración](runtime-final-integration.jsonl) repite ediciones completas,
exportaciones y confirmaciones de descargas con 10.000 pistas. Respectivamente, el tiempo real es
444.45→361.19, 320.67→285.68 y 274.16→187.91 ms; la CPU integrada es
238.85→164.91, 123.09→88.34 y 182.97→94.01 ms. Estas muestras tienen sus propios
hashes del código fuente; no se mezclan con las medianas de la matriz anterior.

Operaciones completas adicionales, [muestras sin procesar](runtime-candidates.jsonl):

| Operación | Mediana de referencia | Mediana actual |
| --- | ---: | ---: |
| Petición HTTP del shell, 693 archivos de entrada (31 muestras) | 2.88 ms | 1.79 ms |
| HTTP de búsqueda local, 50k pistas, `song 4242` (15 muestras) | 25.33 ms | 24.06 ms |
| HTTP de búsqueda local, 50k pistas, consulta ausente (15 muestras) | 21.37 ms | 20.14 ms |
| HTTP de búsqueda local, 50k pistas, consulta densa `so` (15 muestras) | 113.52 ms | 112.29 ms |
| Migración del resumen, 50k pistas (5 muestras) | 909.49 ms renormalizando | 116.59 ms recalculando el hash |
| 50 carátulas distintas a través de la ruta HTTP de producción (15 muestras) | 82.79 ms | 76.15 ms |

Los fixtures de regresión del shell también demuestran la detección de cinco cambios que
la ruta basada solo en mtime no detectaba: eliminación, cambio de nombre, adición con una marca de tiempo antigua, cambio de
tamaño con la marca de tiempo original y eliminación de un recurso público. Un fixture independiente
modifica un archivo fuente durante el build y comprueba que sigue pendiente de actualizar.

La comparación final de codificadores publica tres copias duraderas, con siete muestras
alternas. Con 50.000 pistas, Python 3.12 usa 476.67 ms de CPU del proceso con el codificador
plano frente a 704.21 ms con el codificador estándar (una reducción del 32,3 %); el tiempo real
es de 1,583.18 frente a 1,866.50 ms. Python 3.14 usa 411.81 ms de CPU con su codificador
estándar frente a 570.44 ms con el codificador plano. El runtime selecciona la mejor
ruta; por eso no se conservó el prototipo incondicional.

Reproduce esa comparación con cualquiera de los intérpretes:

```sh
python3.12 scripts/benchmark_portable_encoder.py --repeats 7 \
  --output /tmp/portable-encoder-py312.jsonl
venv/bin/python scripts/benchmark_portable_encoder.py --repeats 7 \
  --output /tmp/portable-encoder-py314.jsonl
```

## Candidatos sin un cambio aceptado

- Un codificador manual incondicional de JSON con formato empeoraba en Python 3.14.
  Se retiró de ese runtime. El escritorio distribuye Python 3.12, así que esa decisión
  también se probó allí antes de cerrarla. El codificador final de escalares/listas de cadenas
  se restringe a las versiones anteriores de Python; las comparaciones finales de intérpretes están enlazadas más arriba.
- Agrupar más exportaciones cambiaría el contrato actual de publicación síncrona
  para los consumidores externos. Los callbacks del ciclo de vida existentes ya
  agrupan las exportaciones repetidas dentro de una misma operación coordinada. Esta revisión mantiene
  disponible el estado portable de cada operación completada al retornar.
- Eliminar las huellas del modelo completo basándose solo en una revisión de la base de datos
  aceptaría mutaciones sin guardar a través de la API pública existente de modelos mutables.
  Las pruebas de regresión reproducen este fallo en campos escalares, valores anidados,
  cabeceras y orden. Los cambios aceptados aceleran estas comprobaciones y eliminan
  trabajo SQL redundante conservando las verificaciones.
- La propuesta histórica de prioridad DJ es anterior a la integración de P14. El trabajo actual
  de las sesiones ya cuenta con ejecutores acotados, intereses que se pueden retirar y cancelación del
  trabajo obsoleto en cola o en ejecución. Esta revisión no introduce otro planificador
  ni cambia la política de audio/transiciones sin pruebas de un nuevo beneficio.

## Transporte concurrente

Los [casos de carga sin procesar](runtime-load.jsonl) usan el controlador Range de producción mientras
ediciones reales de metadatos, exportaciones y un escaneo del sistema de archivos a ritmo controlado compiten sobre 10.000 pistas.
Hay 2.388 respuestas verificadas en nueve casos completados y cero errores de
estado/contenido devueltos. Los nombres `ssd`/`hdd` seleccionan los perfiles existentes de
número de workers; ambos usan el mismo almacenamiento del repositorio, no dispositivos físicos distintos.

Tres pares alternos, dos clientes, doce segundos de trabajo ofrecido por ejecución:

| Métrica, mediana entre ejecuciones (perfil `ssd`) | Referencia | Actual |
| --- | ---: | ---: |
| Retraso del bucle de eventos p95 | 199.99 ms | 133.09 ms |
| Respuesta Range p95 | 3.38 ms | 2.97 ms |
| Respuestas Range completadas | 271 | 321 |

El único par `hdd` mejora el p95 del hub de 341.50 a 296.36 ms y las peticiones
completadas de 195 a 215, pero el p95 de Range aumenta de 7.71 a 10.97 ms. Ese
par es un caso de corrección/carga, no una prueba de reducción universal de la latencia.
Una invocación anterior del banco de pruebas terminó con código de salida 143 y sin salida de
diagnóstico. Se conserva como intento interrumpido en el JSONL; el caso independiente
de sustitución se completó correctamente. No se ha establecido su causa.

Reproduce cada lado por separado (omite `--reference` para el actual):

```sh
venv/bin/python scripts/benchmark_playback_load.py --scenario loaded \
  --tracks 10000 --clients 2 --seconds 12 --profile ssd \
  --reference 3c7e4af39a523141de21f14f3891e935728bc864
```

Estos casos no justifican una nueva política global de admisión: la cola existente
nunca supera un trabajo pendiente en los instantes muestreados. Esto no establece
un límite para ráfagas arbitrarias de múltiples usuarios o de red, ni sustituye las pruebas de sesiones de P14.

## Límites de aceptación

Esto no cierra la matriz completa de escucha real/Live/proveedores remotos/sesiones largas
ni la aceptación en iPhone/CarPlay/Windows físicos. Las pruebas de Linux incluyen
bytes con saltos de línea de Windows y denegaciones de unlink simuladas; no son validación nativa
en Windows. El banco de pruebas de carga informa del transporte HTTP Range verificado y del retraso del hub,
no de la calidad del sonido ni del uso de batería.

## Validación

- Suite final completa de Python, incluido un sidecar recién empaquetado: **2.587 pruebas superadas
  en 613,41 s**. Se conserva el sidecar instalado anterior; el build medido y probado
  reside en un directorio temporal específico de la tarea.
- Frontend: TypeScript y **1.869 pruebas superadas en 228 archivos**. No se realizaron cambios
  en el código fuente de la UI ni se ejecutó manualmente `npm run build`.
- Ruff en todo el repositorio y `git diff --check` pasan.
- La cobertura de regresión incluye ediciones sin guardar de escalares/valores anidados/cabeceras/orden,
  cambios de candidatos no declarados, reparación de comprobaciones de filas anulables, fallos de publicación,
  escritores externos, resúmenes/desplazamientos con saltos de línea de Windows, bytes JSON exactos en ambos
  codificadores, migración de esquema sin repetir la normalización, admisión de cuotas entre múltiples procesos,
  supervivencia de descriptores y metadatos acotados de carátulas.
- Las comprobaciones de GitHub sobre el último HEAD remoto son un requisito de finalización independiente;
  su estado corresponde a la PR, no a estas mediciones locales.
