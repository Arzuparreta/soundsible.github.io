# Selección del catálogo local

Este fragmento reduce la puntuación repetida de artistas/álbumes y la ordenación de todas las coincidencias en `_local_catalog`. No introduce un índice de búsqueda persistente ni cambia la función de ranking, la fusión de proveedores, los presupuestos por forma ni la carga de la respuesta. Un fragmento posterior añade uno: consulta [índice de búsqueda local](local-search-index.md).

Cada petición tiene dos cachés LRU (4,096 entradas cada una): puntuaciones de campos de entidades y claves de entidades normalizadas. Los títulos se puntúan directamente. Las cachés contienen cadenas/números, no instantáneas de la biblioteca, y desaparecen al terminar la petición. La selección de pistas usa `heapq.nsmallest`, que es estable, y mantiene en el montículo de selección solo el presupuesto de pistas. Los mapas de artistas/álbumes siguen conservando un representante por cada entidad coincidente; la selección de sus ganadores finales ya no ordena todo el mapa. Se sigue recorriendo la biblioteca completa. Las peticiones simultáneas tienen cachés separadas.

## Reproducción

Ejecuta `venv/bin/python scripts/benchmark_local_catalog.py --repeats 3`.
La referencia es el selector congelado de `e6b1a4e` en `tests/fixtures/local_catalog_reference.py`. Ambos selectores usan los auxiliares de carga actuales y deben devolver listas exactamente iguales. La prueba de rendimiento genera 100 canciones por artista y 10 por álbum, mide la mediana del tiempo real de la ruta de CPU de la petición y, por separado, usa tracemalloc para el pico de asignaciones adicionales de Python. La construcción de la biblioteca queda fuera de la medición. Cada repetición empieza desde cero.

Ejemplo de ejecución local del 2026-09-21, 50,000 pistas:

| Consulta | Antes ms | Después ms | Pico antes MiB | Pico después MiB |
| --- | ---: | ---: | ---: | ---: |
| artist | 535.08 | 261.10 | 10.77 | 2.32 |
| song | 398.85 | 165.96 | 9.96 | 0.96 |
| album 17 | 450.48 | 218.72 | 0.25 | 1.00 |
| ausente | 431.65 | 216.60 | <0.01 | 0.96 |

Las cachés usan memoria extra en consultas con pocas coincidencias o sin ninguna a cambio de menos trabajo de CPU repetido. Lo que se limita es el número de entradas, no los bytes de las cadenas. Los mapas de deduplicación de entidades siguen siendo proporcionales a las entidades únicas coincidentes. Son mediciones sintéticas del selector, no evidencia de la latencia de búsqueda de extremo a extremo, del RSS, de la latencia de los proveedores, de la capacidad de respuesta del bucle de eventos ni de la reproducción audible. La normalización/indexación persistente, las revisiones/deltas de la biblioteca y la admisión global de recursos siguen siendo trabajo aparte.

La cobertura de regresión compara las cargas ordenadas completas con el selector congelado para acentos, palabras reordenadas, consultas vacías y ausentes, coincidencias de subcadenas, respaldo de metadatos, ID duplicados/empates, orden inverso de la biblioteca, expulsión de la caché con entidades únicas y consultas concurrentes. Otra comprobación verifica que la puntuación repetida de entidades se reutiliza y que las ediciones de metadatos son visibles en la siguiente petición.
