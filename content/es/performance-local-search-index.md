# Índice de búsqueda local

El proveedor de biblioteca de `/api/catalog/search` normalizaba y puntuaba cada pista de la biblioteca en memoria en cada consulta. Ahora pide a una tabla SQLite por cuenta las pistas que pueden coincidir, en el orden de la biblioteca, y ejecuta el ranking y la selección sin cambios solo sobre ellas. La función de ranking, los presupuestos por forma, la fusión de proveedores, la carga de la respuesta y el respaldo de recorrido completo no cambian. No se guarda ninguna copia de la biblioteca en RAM.

## Flujo de datos y de peticiones

`library_search` en el `library.db` de cada cuenta (`shared/library_search.py`) almacena, por cada pista de la biblioteca, su posición y su título, artista y álbum ya normalizados exactamente como los compara el ranking (`search_title`/`search_text`, que ahora también usa `_text_score`). `library_search_state` contiene un indicador de validez, el `VERSION` del índice y una huella de la biblioteca que describen las filas.

`_load_library_tracks()` devuelve la lista de pistas de la petición vinculada a la base de datos desde la que se cargó. A continuación, `_local_catalog()`, en una sola instantánea de lectura:

1. Devuelve `[]` para una consulta normalizada vacía (todos los campos puntúan cero).
2. Comprueba que el índice es válido y que lo ha construido este `VERSION` (formato del índice, versión del intérprete, versión de los datos Unicode).
3. Calcula la huella de la lista en memoria: blake2b sobre pickles sin memo de los `(title, artist, album_artist, album)` de cada pista en fragmentos de 512. Debe ser igual a la huella almacenada. Los ID no se incluyen; véase más abajo.
4. Lee `(position, title, artist, album)` de las filas cuyos campos normalizados pueden puntuar, ordenadas por posición, y clasifica `tracks[position]` con esos textos.

Si falla cualquier paso (ediciones sin guardar, un índice no válido o desactualizado, una tabla ausente, un error de SQL, una consulta que SQLite no puede enlazar), la petición recorre el modelo desde cero exactamente como antes. Primero se descarta el estado parcial de selección.

## Por qué los resultados y su orden no pueden diferir

- **Mismos candidatos.** Una puntuación positiva requiere que la consulta normalizada esté dentro de un campo (niveles exacto, prefijo y contiene) o que todos los tokens de la consulta estén entre los tokens del campo. El SQL conserva las filas en las que se cumple `instr(field, query)` o en las que cada token es una subcadena del campo. `instr` compara UTF-8 en límites de carácter y maneja NUL, así que equivale al `in` de Python. Los tokens de los textos almacenados son subcadenas de ellos; una fila en la que alguno no lo es (normalización no idempotente) se marca como `loose` y siempre se devuelve. No se encontró ninguna en todo Unicode con CPython 3.14.7 / Unicode 16.0.0, pero se comprueba por fila en lugar de suponerlo. Sin rama de tokens, el filtro es exactamente "algún campo puntúa"; con ella es un superconjunto (un token dentro de una palabra más larga), y el ranking descarta los sobrantes.
- **Mismo orden.** La huella demuestra que la secuencia en memoria de campos de búsqueda es igual a la almacenada, se demuestra que las posiciones son contiguas y cada fila del índice lleva la posición de su pista. Por tanto, los candidatos llegan al ranking en el orden de la biblioteca: los representantes de entidad (la primera pista con la mejor puntuación) y los empates se eligen como antes. El ranking lee los ID, las carátulas y las cargas del propio modelo, así que un cambio de ID que todavía no se ha guardado se sigue devolviendo correctamente.
- **Mismas puntuaciones.** Los textos almacenados son lo que el ranking calcula a partir de los mismos valores sin procesar con las mismas funciones. Una prueba vincula el código fuente de los auxiliares de normalización, `_score_folded` y el filtro SQL a `INDEX_FORMAT`, de modo que cambiar cualquiera de ellos obliga a revisar este razonamiento y, si cambian los valores almacenados, a incrementar el formato.

## Mantenimiento

El índice se deriva solo de filas confirmadas (`tracks` y `library_tracks`), dentro de la transacción del guardado canónico y durante la configuración del esquema, en un savepoint. Un fallo ahí se registra y deja el índice no válido; nunca hace fallar un guardado.

Triggers almacenados en la base de datos (así quedan cubiertos el SQL directo y los motores antiguos):

| Cambio | Efecto |
| --- | --- |
| `tracks` id/title/artist/album_artist/album, inserción, eliminación | elimina esa fila del índice, invalida |
| `library_tracks` inserción, eliminación | invalida |
| `library_tracks` posición | mueve esa fila del índice, invalida |
| `library_search` eliminación o edición de posición | invalida |
| `library_search` valores normalizados escritos fuera de `sync` | reconstrucción completa |
| cualquier otra columna de `tracks` (duración, `added_at`, `album_id`...) | nada |

Un guardado cuyo índice sigue siendo válido cuesta una lectura de estado. En caso contrario, `sync` elimina las filas huérfanas, normaliza solo las que faltan (lotes paginados por clave de 512 leídos desde SQLite, nunca desde el modelo) y hace una pasada ordenada que calcula la huella almacenada y verifica las posiciones. Las posiciones desalineadas, los objetos de índice ausentes o recreados, otra forma de tabla o un `VERSION` nuevo provocan una reconstrucción completa. Las bases de datos anteriores a este cambio se indexan una vez, en su primera configuración de esquema en un proceso nuevo del motor.

## Costes y límites

- La tabla crece con la biblioteca, en disco: unos 90 bytes por pista aquí. La caché de páginas de SQLite y el módulo de ordenación usado para ordenar las coincidencias son memoria nativa y no se miden más abajo.
- Cada consulta indexada calcula la huella de toda la lista en memoria (el coste mínimo fijo que aparece más abajo) y mantiene una conexión del pool y una instantánea de lectura mientras clasifica.
- Las consultas densas siguen clasificando en Python todas las pistas que coinciden; el índice elimina la normalización y las pistas que no coinciden, no el trabajo del ranking por cada coincidencia.
- Los guardados que cambian campos de búsqueda u orden pagan la normalización de las filas cambiadas y una pasada ordenada; mover pistas actualiza una fila del índice por cada pista movida.
- La primera configuración del esquema tras actualizar normaliza toda la biblioteca mientras mantiene el bloqueo de esquema de todo el proceso.
- Las cachés de entidades por petición siguen limitadas a 4,096 entradas, como antes.

## Validación

`tests/test_library_search_index.py` compara los resultados ordenados completos de la ruta indexada, el recorrido actual y el selector de referencia congelado (`tests/fixtures/local_catalog_reference.py`) y comprueba qué ruta respondió. Cubre bibliotecas aleatorias (acentos, marcas combinantes, `ß`/`İ`, CJK, emoji, NUL, puntuación, texto superfluo de lanzamientos, campos vacíos/`None`, respaldo a `album_artist`, empates, orden inverso), el filtro SQL comparado directamente con las puntuaciones, filas `loose` forzadas, ediciones sin guardar de título/artista/`album_artist`/álbum/orden/adición/eliminación, cambios de ID sin guardar, guardados que normalizan solo las filas cambiadas, cambios de ID guardados, reinicio, un subproceso nuevo, cambios de `VERSION`, SQL directo en cada tabla, tablas eliminadas o con formato ajeno, bases de datos anteriores al índice, posiciones desalineadas, fallos de normalización durante un guardado, consultas que no se pueden enlazar, bibliotecas vacías, consultas concurrentes y la ruta HTTP.

## Reproducción y resultados medidos

```sh
venv/bin/python scripts/benchmark_local_search_index.py --sizes 1000 10000 50000 --repeats 5
```

`previous` es `_local_catalog` cargado desde `78acb5e`; `scan` e `indexed` son el código actual sin el índice y con él. Los tres devuelven listas iguales para cada consulta, y se comprueba que las ejecuciones indexadas han usado el índice. Los tiempos son medianas del selector aislado: sin proveedores, HTTP, JSON, red ni reproducción. Los picos son de tracemalloc y excluyen la biblioteca cargada y la memoria nativa de SQLite. Las bibliotecas tienen un artista por cada 100 pistas y un álbum por cada 10, ID uuid4, títulos con `(Official Video)` cada cierto número de pistas y nombres de álbum con acentos. Las escrituras ejecutan el escritor canónico de la revisión anterior y el actual en bases de datos separadas, alternando en cada repetición. Las bases de datos temporales están en el volumen de almacenamiento del repositorio.

Ejecución local del 2026-09-21: [mediciones sin procesar](local-search-index-results.jsonl).
"Coincidentes" cuenta las filas que el índice pasó al ranking.

| Pistas | Consulta | Coincidentes | Anterior ms | Recorrido ms | Indexado ms | Pico MiB (anterior → indexado) |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 50,000 | `so` (densa) | 49,990 | 196.58 | 193.65 | 143.41 | 0.964 → 0.769 |
| 50,000 | `song` | 49,990 | 198.91 | 194.47 | 152.68 | 0.964 → 0.769 |
| 50,000 | `artist 42` | 1,500 | 253.18 | 243.85 | 39.11 | 0.998 → 0.130 |
| 50,000 | `song 4242` | 15 | 256.43 | 241.13 | 32.84 | 0.961 → 0.072 |
| 50,000 | `album 14` (acentos) | 1,990 | 250.46 | 242.46 | 40.84 | 0.997 → 0.121 |
| 50,000 | `14 album` (reordenada) | 1,990 | 264.81 | 238.71 | 39.00 | 0.961 → 0.087 |
| 50,000 | `zzqx` (ausente) | 0 | 253.00 | 238.17 | 28.97 | 0.958 → 0.072 |
| 10,000 | `so` (densa) | 9,990 | 38.27 | 37.73 | 27.30 | 0.231 → 0.188 |
| 10,000 | `artist 42` | 100 | 48.19 | 46.55 | 8.21 | 0.243 → 0.102 |
| 10,000 | `zzqx` (ausente) | 0 | 48.00 | 45.37 | 5.90 | 0.184 → 0.069 |
| 1,000 | `so` (densa) | 990 | 4.37 | 3.91 | 2.95 | 0.072 → 0.089 |
| 1,000 | `zzqx` (ausente) | 0 | 4.35 | 4.21 | 0.70 | 0.025 → 0.068 |

La huella en memoria por sí sola tardó 0.47, 4.33 y 22.16 ms con 1,000, 10,000 y 50,000 pistas: es la mayor parte del tiempo de una consulta indexada con pocas coincidencias. Las bibliotecas pequeñas asignan algo más de memoria (el fragmento de la huella y el cursor de SQLite).

Guardados canónicos, mediana en ms, escritor anterior → escritor actual:

| Pistas | Edición de título | Añadir al final | Edición de duración | Eliminar del medio | Importación (1 ejecución) |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 20,31 → 23,52 | 44,86 → 46,99 | 21,24 → 21,08 | 43,78 → 46,88 | 81,84 → 92,14 |
| 10.000 | 191,34 → 217,83 | 428,42 → 455,77 | 188,82 → 190,46 | 430,40 → 479,96 | 1.193,60 → 1.401,46 |
| 50.000 | 1.084,77 → 1.279,10 | 2.434,18 → 2.590,11 | 1.113,16 → 1.104,86 | 2.476,03 → 2.931,73 | 6.387,67 → 6.862,89 |

Las ediciones de campos que el índice ignora cuestan lo mismo. Con 50.000 pistas, una edición de título cuesta unos 194 ms más (18 %): un plegado más la pasada de verificación ordenada. Eliminar una pista del medio desplaza unas 25.000 posiciones del índice y cuesta unos 456 ms más (18 %). Construir el índice para una base de datos escrita por la revisión anterior tardó 16,55, 155,36 y 1.306,63 ms (una ejecución cada uno).

Las páginas propias del índice ocupaban 90.112, 860.160 y 4.435.968 bytes. La base de datos más los archivos WAL crecieron de 99,26 a 108,17 MB con 50.000 pistas tras la misma secuencia de escrituras; eso incluye WAL al que aún no se ha hecho checkpoint y no es un tamaño estable.

Son mediciones sintéticas del selector en una sola máquina. No son latencia de búsqueda de extremo a extremo, RSS total, consumo energético, capacidad de respuesta del bucle de eventos ni evidencia sobre la reproducción audible.
