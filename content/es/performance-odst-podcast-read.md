# Conservación de podcasts en ODST sin reconstruir las pistas del disco

Los guardados de ODST conservan las suscripciones a podcasts y la caché de episodios de Station a partir del JSON portable en disco. Antes, esto exigía leer la cadena completa, decodificar todos los diccionarios y construir un segundo `LibraryMetadata` con todos los `Track`, sólo para usar dos campos. La nueva `read_podcast_fields()` lee de un único descriptor abierto en fragmentos de texto de 64 KiB, decodifica y valida cada pista con el decodificador JSON estándar y después la descarta. Sólo conserva los campos de podcasts. El documento completo se sigue recorriendo: es una optimización de memoria/asignaciones, no una reducción de los bytes leídos ni persistencia incremental.

## Medición y decisión

La línea base `f5a5a8a` ya serializa en streaming. El benchmark compara su método de guardado real con el nuevo guardado completo, alternando cinco repeticiones sobre copias temporales en el sistema de archivos del repositorio. Cada salida debe coincidir con los bytes serializados esperados. La biblioteca real sólo se lee; no se hicieron escrituras en producción ni se reinició el motor. Los [resultados en bruto](odst-podcast-read-results.jsonl) incluyen tiempos, hashes de las fuentes y ejecuciones separadas de asignaciones/fases.

| Biblioteca | Mediana antes → después | Pico temporal de Python antes → después |
| --- | ---: | ---: |
| Copia real, 208 pistas | 9,32 → 10,88 ms | 2,715 → 2,139 MiB |
| Sintética, 1.000 pistas | 26,20 → 18,07 ms | 4,700 → 0,689 MiB |
| Sintética, 10.000 pistas | 325,76 → 231,92 ms | 45,841 → 0,759 MiB |
| Sintética, 50.000 pistas | 1.755,02 → 1.155,98 ms | 229,107 → 1,067 MiB |

Con 50k, los picos de asignación del guardado completo bajan un 99,5 % y la mediana del tiempo transcurrido baja un 34,1 %. La ejecución de fases separada reduce el trabajo de parseo/modelo de 761 a 286 ms. La copia real empeora 1,56 ms (16,7 %): parsear campos seleccionados grandes que ocupan varios fragmentos tiene un coste adicional, así que no es una mejora universal de latencia. Se acepta el cambio por cómo escala la memoria con bibliotecas grandes, con ese coste explícito y pequeño en bibliotecas pequeñas. Las muestras posteriores al cambio con 1k incluyen un valor atípico de 42,72 ms; se conserva en los datos en bruto.

Los picos son asignaciones de tracemalloc durante el guardado completo, excluidos el modelo residente precargado y la cadena de salida esperada. No son RSS del proceso ni mediciones de energía o de escucha. Los tiempos, el trazado y la instrumentación por fases se ejecutan por separado. La caché del sistema de archivos y el hardware afectan a los resultados; no hay fsync.

## Compatibilidad y límites

Las pruebas diferenciales comparan con `LibraryMetadata.from_json`, incluidos límites de fragmento minúsculos, Unicode, valores anidados, exponentes partidos, claves duplicadas (gana la última), campos de pista ausentes, tipos/valores por defecto, datos sobrantes al final, truncamiento y valores de versión no finitos. Los campos de pista obligatorios se toman de la dataclass; este validador tendrá que evolucionar si `Track.from_dict` añade más validaciones.

Se conserva el comportamiento heredado ante fallos, incluida una distinción poco intuitiva: el JSON mal formado devuelve campos de podcast vacíos; el JSON válido con un modelo inválido, o un fallo de E/S, conserva los campos en memoria a través del manejador de excepciones existente del guardado. No se afirma ningún comportamiento de recuperación nuevo. Las pruebas comprueban explícitamente ambos resultados en lugar de compararlos sólo con un modelo ya modificado.

En bibliotecas normales válidas, la memoria del parser es proporcional a una pista o un campo de cabecera decodificado, a los datos de podcast seleccionados y al búfer de lectura. Los valores individuales grandes se siguen decodificando enteros. Una entrada mal formada puede acumularse hasta EOF mientras el decodificador estándar espera un valor completo. La memoria total del guardado también incluye la lista de referencias a pistas del serializador existente y los campos que no son pistas, enteros; no es estrictamente constante. No se ha añadido ninguna caché residente ni ningún parser de terceros.

ODST sigue bloqueando sólo su propia instancia. Cuando se midió esto, reescribía la ruta compartida in situ; ahora la reemplaza entera, igual que Station publica sus exportaciones portables, todavía sin un bloqueo de escritura común. Una prueba POSIX verifica que un reemplazo durante la lectura conserva el contenido del descriptor abierto antiguo y que la siguiente lectura ve el archivo nuevo. Esto no corrige las actualizaciones perdidas ni la carrera entre lectura y escritura. La propiedad entre escritores y la validación nativa en Windows siguen siendo trabajo aparte. Una escritura fallida ahora deja el archivo anterior (ver [guardados de ODST](odst-save-streaming.md#atomic-replacement)).

Validación: **1.532 tests de Python superados**; las comprobaciones de Ruff centradas en los cambios y `git diff --check` pasaron. Una pequeña prueba de humo del benchmark también verificó el hash adicional del lector en sus metadatos. No cambió código del frontend.

## Reproducir

```sh
venv/bin/python scripts/benchmark_pool_save.py --reference f5a5a8a \
  --library /absolute/path/to/library.json \
  --output /tmp/odst-podcast-read-results.jsonl
venv/bin/python -m pytest -q
venv/bin/ruff check shared/downloader/library_podcasts.py shared/downloader/service.py \
  scripts/benchmark_pool_save.py tests/test_pool_podcast_reader.py \
  tests/test_pool_library_save.py
git diff --check
```

`--library` es opcional. Los tamaños sintéticos por defecto son 1k, 10k y 50k. No omitir `--reference f5a5a8a` al reproducir esta comparación: el valor por defecto antiguo del script es la línea base del experimento de serialización.
