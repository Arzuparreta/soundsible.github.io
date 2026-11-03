# Escrituras incrementales de la biblioteca canónica

`DatabaseManager.replace_library()` sigue reemplazando la instantánea lógica completa en una sola transacción, comprueba `expected_revision` dentro de `BEGIN IMMEDIATE` e incrementa la revisión en cada llamada correcta, incluidas las instantáneas sin cambios. Ahora solo escribe las filas canónicas que han cambiado. Los alias, el primer `added_at`, el estado del usuario, el orden y las entradas repetidas de las listas de reproducción, los ID de listas de reproducción externas y la agregación del catálogo mantienen su semántica anterior. Las marcas de tiempo de las entidades del catálogo solo cambian cuando cambia la entidad; las marcas de tiempo de creación se conservan en las actualizaciones.

Las pistas se comparan con los valores persistidos en lotes de 500. La pertenencia, el orden, las entradas de listas de reproducción y los créditos del catálogo usan tablas SQLite locales a la transacción con `temp_store=FILE` y una caché temporal de páginas de 512 KiB. Las tablas temporales y los ajustes de la conexión se limpian tanto si la operación tiene éxito como si falla. No hay caché de metadatos retenida ni migración de esquema. SQLite elige el directorio de archivos temporales; los despliegues deberían mantenerlo en disco (un `SQLITE_TMPDIR` respaldado por RAM anula esa elección de almacenamiento). El límite de la caché acota las páginas auxiliares, no la memoria total del proceso.

Las ediciones que solo afectan al título, a los datos técnicos o a las listas de reproducción omiten la construcción del catálogo. Los cambios en la pertenencia o el orden de las pistas, o en los campos que determinan el catálogo, siguen usando el constructor de catálogo completo existente, para que la agregación dependiente del orden siga siendo idéntica. Su salida se persiste de forma incremental: los artistas, álbumes, créditos y enlaces de álbumes sin cambios no se tocan, y las entidades huérfanas se eliminan.

## Validación

Las pruebas comparan las tablas canónicas resultantes y el payload público con funciones de escritura congeladas de `2ad6db3`, en guardados sin cambios, adiciones/eliminaciones, bibliotecas vacías, ordenación, cambios de artista/álbum/año/tipo de medio y cabeceras. Los triggers de la base de datos verifican el número real de filas modificadas: un guardado sin cambios solo actualiza `library_state`; una edición de título actualiza una pista; una edición de lista de reproducción actualiza una entrada. Las pruebas también cubren las fechas de primera adición, la conservación del estado del usuario, la reversión, la limpieza y el reintento tras un staging fallido, el límite de 999 parámetros de SQLite, las marcas de tiempo selectivas del catálogo y varios escritores en competencia que comparten una revisión.

## Reproducir las mediciones

```sh
venv/bin/python scripts/benchmark_library_writes.py --sizes 1000 10000 50000 --repeats 3 --memory
```

El benchmark compara el escritor congelado y la implementación actual sobre bases de datos nuevas y separadas en el sistema de archivos de almacenamiento del repositorio. Cada edición parte de la misma biblioteca lógica; el WAL se trunca antes de cada escritura medida y los checkpoints automáticos están desactivados. Los tiempos y los recuentos de bytes son medianas de tres ejecuciones. Las importaciones iniciales son mediciones únicas. Una ejecución separada con `tracemalloc` mide las asignaciones adicionales de Python, sin contar la instantánea de entrada que ya existía ni las asignaciones nativas de SQLite; los tiempos no incluyen esa instrumentación. Los contadores de Linux `/proc/self/io` incluyen la E/S temporal: `wchar` cuenta los bytes pasados a las llamadas de escritura, mientras que `write_bytes` cuenta las escrituras en almacenamiento imputadas a este proceso, no el tráfico del dispositivo físico tras la caché del sistema de archivos.

Son mediciones sintéticas de escritura canónica. No miden la exportación JSON, la serialización/deltas de la API, el trabajo del navegador ni la reproducción audible. Las bibliotecas pequeñas pueden usar más memoria temporal de Python que el escritor antiguo debido al tamaño fijo del lote de comparación; los guardados grandes que cambian el catálogo siguen construyendo la proyección completa. Las importaciones iniciales también generan E/S temporal adicional, así que este cambio mejora sobre todo los guardados repetidos y las ediciones pequeñas.

Ahora un guardado solo reconstruye la proyección de artistas/álbumes cuando cambian los campos de catálogo o el orden de una canción. El escritor antiguo la reconstruía en cada guardado, lo que además aplicaba cualquier cambio en las reglas de proyección en el siguiente guardado. Esa tarea corresponde ahora a `shared.library_catalog.PROJECTION_VERSION`: increméntala con cualquier cambio que haga que las mismas pistas se proyecten de forma distinta, y cada biblioteca se reconstruirá una vez, en el orden del manifiesto, la próxima vez que el motor la abra. La misma comprobación reconstruye las canciones que no tienen ningún enlace de catálogo. En caso contrario, un arranque cuesta dos lecturas pequeñas. Medido en tmpfs con las pistas sintéticas del benchmark de exportación: un arranque normal tarda ~1,2 ms con cualquier tamaño; un arranque que reconstruye tarda ~115 ms con 1k pistas, ~1,2 s y 30 MiB de asignaciones de Python con 10k, y ~6,4 s y 151 MiB con 50k, una sola vez por cada incremento.

## Resultados registrados (2026-09-21)

Mediciones en bruto: [JSONL](incremental-library-writes-results.jsonl). Linux, archivos temporales de SQLite observados en `/var/tmp` (ext4), bases de datos en el volumen de almacenamiento (ext4). La línea base es `2ad6db3`; la candidata es la implementación confirmada junto con este informe. Las primeras mediciones con bibliotecas pequeñas coincidieron con la ejecución de la suite de pruebas de Python; las mediciones con 50.000 pistas se ejecutaron después de que terminara. Toma los tiempos absolutos como observaciones locales, no como garantías válidas en otras máquinas.

Para 50.000 pistas, las flechas indican línea base → escritor incremental. Los MB son decimales.

| Guardado | Tiempo (ms) | Bytes de WAL | Escrituras de almacenamiento del proceso (MB) | Pico adicional de Python (MB) |
| --- | ---: | ---: | ---: | ---: |
| inicial | 2768 → 3018 | 27.550.472 → 27.550.472 | 27,67 → 36,50 | no medido |
| sin cambios | 2922 → 450 | 19.388.752 → 4152 | 19,39 → 2,95 | 19,65 → 0,85 |
| título | 2976 → 467 | 19.594.752 → 28.872 | 24,22 → 2,97 | 19,65 → 0,86 |
| lista de reproducción | 2927 → 446 | 19.652.432 → 8272 | 19,66 → 2,95 | 19,66 → 0,85 |
| álbum | 2936 → 1471 | 19.565.912 → 57.712 | 19,61 → 6,62 | 19,66 → 18,69 |
| orden | 2987 → 1469 | 21.893.712 → 927.032 | 21,90 → 8,40 | 19,66 → 18,69 |

Los guardados sin cambios con 1000 / 10.000 / 50.000 pistas usaron unos 0,83 / 0,84 / 0,85 MB de asignaciones adicionales de Python, frente a 0,40 / 3,92 / 19,65 MB en la línea base. En los guardados normales hay una sobrecarga acotada en las bibliotecas pequeñas, en lugar de una representación adicional en Python que crece con cada canción.

La importación inicial fue aproximadamente un 9 % más lenta con 50.000 pistas y las escrituras de almacenamiento imputadas al proceso subieron de 27,67 a 36,50 MB. Los bytes de las llamadas al sistema de escritura aumentaron de 61,49 a 534,73 MB, incluidas las escrituras auxiliares y de journal; no equivalen a escrituras en el dispositivo físico. Las reducciones de WAL, por sí solas, no deben presentarse como reducciones totales de E/S. Los guardados normales posteriores redujeron tanto el WAL como las escrituras de almacenamiento medidas del proceso; los guardados que cambian el catálogo mantienen un coste de memoria mayor.

Validación: suite completa de Python, 1331 superadas; suite específica final, 23 superadas (incluida una prueba adicional de reversión ante un staging malformado); Ruff y `git diff --check` pasaron sin errores. No cambió ningún código del frontend.
