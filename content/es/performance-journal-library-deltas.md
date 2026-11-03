# Deltas públicos de la biblioteca basados en journal

La ruta anterior preparaba y anotaba todas las pistas públicas y después calculaba el hash de todas las filas para descubrir un delta pequeño. Esta implementación registra en SQLite las claves que cambian y prepara solo las filas públicas afectadas cuando puede demostrar cuál es la base del cliente y cuál es el origen actual. No introduce ninguna caché de metadatos local al proceso.

## Flujo de datos y de peticiones

Los guardados canónicos mantienen `library_public_rows`: un hash del valor público y una identidad de sonoridad por cada pista actual. Se comparan estas filas en lotes de 500 y se actualizan solo las diferencias. `library_public_source` almacena una huella de los valores públicos codificados exactos y una generación de ordenación. La demostración y el journal se confirman en la misma transacción que la biblioteca canónica, conservando las comprobaciones de revisión, los alias, las fechas y el estado del usuario. Si algo falla, se revierte todo. Los cambios mediante SQL directo en las tablas de origen o de catálogo invalidan la demostración; solo un guardado canónico verificado posterior vuelve a habilitar el atajo. Las bases de datos existentes empiezan sin verificar tras la migración y usan la ruta completa hasta que se produce un guardado de ese tipo.

Los journals transaccionales de claves también registran las referencias de carátulas, las dimensiones de los objetos y las identidades de sonoridad, incluidos los cambios y eliminaciones mediante SQL directo. Los hashes de objetos que cambian se asignan a pistas mediante las referencias de carátulas indexadas; las identidades de sonoridad que cambian se asignan mediante el índice canónico de identidades. Las consultas de sonoridad selectivas cargan solo las identidades solicitadas, en lugar de todas las mediciones.

Una base de delta conserva solo la demostración canónica, los tokens/cursores de anotación y los hashes de las cabeceras en la base de datos de historial desechable existente. Ante una petición compatible, la ruta:

1. Verifica el modelo mutable en memoria contra su huella confirmada.
2. Carga conjuntos acotados de claves cambiadas desde la base del cliente y resuelve las posiciones
   canónicas actuales. Al fusionar se conserva la primera operación, de modo que una canción añadida
   y eliminada entre dos sondeos no produce una eliminación no válida.
3. Copia solo las pistas afectadas y las cabeceras desvinculadas. Una segunda huella usa
   esas copias exactas, lo que protege frente a ediciones durante la copia y ediciones aún no guardadas.
4. Anota solo esas pistas, vuelve a comprobar todos los cursores de origen y devuelve un delta
   solo si se puede demostrar que es más pequeño que la representación JSON completa.

Los cambios de pertenencia u orden incluyen una lista completa y ordenada de ID, tal como exige el protocolo de cliente existente. Las ediciones que solo afectan a las cabeceras incluyen los bloques de cabecera cambiados, no diccionarios de pistas. Las anotaciones eliminadas desaparecen porque los upserts siguen siendo diccionarios públicos de pistas completos. El reinicio, el aislamiento de cuentas y los clientes con una base de la implementación anterior usan el mismo formato de transmisión y la misma alternativa.

## Validadores y compatibilidad

Para los orígenes canónicos verificados, los ETag débiles calculan ahora el hash de los tokens de dependencia del origen público y de las anotaciones con ámbito de cuenta, no de los bytes JSON serializados. El ETag sigue siendo una cadena opaca; las respuestas completas y las parciales para el mismo estado verificado coinciden. Los tokens de anotación pueden cambiar de forma conservadora incluso por una canción no relacionada. La caché de validadores existente sigue conteniendo solo cadenas cortas y mantiene el comportamiento de 304 temprano. Los proveedores JSON personalizados o con formato legible, las bibliotecas vacías, los modelos sin verificar, los fallos de anotación, el historial ausente o caducado, los journals podados y los conjuntos de cambios grandes recurren de forma segura a la alternativa. La ruta heredada basada en el hash del contenido sigue disponible para los modelos sin un origen canónico verificado.

La huella pública ignora ahora la topología de objetos compartidos de Python. Las cadenas o los contenedores anidados iguales deben producir la misma demostración tanto si se cargan de nuevo desde SQLite como si los comparte un modelo existente. Las huellas codifican los valores con un Pickler acotado y sin memo; los valores codificados nunca se retienen ni se deserializan. Los modelos cíclicos o no admitidos no pueden establecer una demostración válida para la optimización.

## Límites de recursos y trabajo pendiente

- Cada diario conserva como máximo 10,255 eventos (10,000 más un intervalo de poda). Las claves de evento están limitadas a 512 bytes UTF-8; las claves más grandes registran un hueco que obliga a un respaldo completo. Las épocas distinguen los almacenes recreados. Los diarios almacenan claves y operaciones, nunca cuerpos de metadatos de pistas.
- Una petición admite como máximo 2,000 claves cambiadas. La propagación amplia a objetos de carátula y las identidades de sonoridad compartidas también respetan este límite.
- Se conservan cuatro bases ligeras por cuenta y 256 en total, durante 24 horas como máximo; cada prueba ocupa como máximo 8 KiB. La limpieza se hace en la admisión. Comparten el límite físico de páginas de 64 MiB de la base de datos de historial existente. Los fallos del historial no impiden servir la biblioteca. Los diarios canónicos y las filas actuales de hash/índice por pista están en la base de datos de la biblioteca; los diarios de anotaciones están en sus propios almacenes.
- El índice canónico de hashes actuales crece con la biblioteca, en disco, en lugar de mantener metadatos adicionales en RAM. Se sigue aplicando el comportamiento normal de SQLite y de la caché de páginas; estos límites no describen la RAM total del proceso ni del sistema operativo.
- Las peticiones siguen calculando dos veces la huella del modelo en las respuestas con cambios que se completan correctamente. En conjunto **no son O(número de canciones cambiadas)**. Eliminar estos recorridos requiere controlar todas las mutaciones en memoria. Las recargas de la biblioteca desde SQL pueden seguir materializando el modelo cuando otro escritor lo ha cambiado.
- Las cabeceras y el orden opcional de ID se copian cuando hace falta; por tanto, las listas de reproducción muy grandes o los cambios de orden necesitan memoria proporcional a esos campos de la respuesta. Los guardados canónicos ahora asumen el coste de calcular los hashes y mantener la prueba/índice. Es un compromiso medido entre escritura y lectura, no una optimización gratuita.
- La normalización de números/cadenas y la proyección del catálogo pueden hacer que un modelo recargado difiera de un modelo guardado anteriormente. Una discrepancia desactiva la preparación parcial hasta un guardado canónico posterior; la corrección tiene prioridad sobre la tasa de aciertos.

## Validación

La batería completa de pruebas de Python superó 1,397 pruebas; una ejecución final focalizada superó 32 pruebas, incluidos tres casos adicionales de reversión/escritura concurrente/migración. La comprobación `npm test` del cliente superó la verificación de tipos y 1,123 pruebas. Se superaron las comprobaciones de Ruff y de espacios en blanco. No ha cambiado ningún código fuente del frontend ni código de audio.

Las pruebas HTTP fallan si un delta elegible construye la instantánea pública completa o carga toda la tabla de sonoridad. Comparan la aplicación de cada delta con una respuesta completa incondicional y comparan los validadores, cubriendo cambios de título/adición/eliminación/orden/cabecera, dimensiones/eliminación de carátulas, eliminación de sonoridad/identidades compartidas, adición y eliminación transitorias, ediciones sin guardar, SQL directo, respaldo ante cambios masivos/vacíos, TTL/cuotas, poda del diario/claves demasiado grandes/cambios de época, reversión transaccional, confirmaciones concurrentes de anotaciones/biblioteca y un subproceso nuevo sin caché en memoria. La migración deja los datos existentes utilizables antes de que exista ninguna prueba nueva.

## Reproducción y resultados medidos

```sh
venv/bin/python scripts/benchmark_library_journals.py --reference cd2311b --sizes 1000 10000 50000 --repeats 3 --memory
```

El script carga la ruta anterior y el escritor/esquema canónico desde git local para la comparación. Los demás auxiliares compartidos usan el código candidato, incluidos la huella basada en valores y el esquema del diario de anotaciones. Es una comparación controlada de las rutas antigua/completa y nueva/parcial, no la ejecución de una copia histórica completa del repositorio. Las bibliotecas/historiales temporales y los almacenes de anotaciones reales están en el volumen de almacenamiento del repositorio. Cada delta se aplica y se compara con una respuesta completa. Los tiempos usan tres repeticiones; una petición separada de edición de título usa `tracemalloc`. La importación/petición inicial es una sola observación.

Las mediciones excluyen la recarga del modelo SQL canónico, la red, la compresión, la exportación JSON portable y la reproducción. Los picos de asignación de Python excluyen el modelo ya cargado y las asignaciones nativas de SQLite. Las escrituras en almacenamiento proceden de `/proc/self/io`, no de telemetría del dispositivo físico. Las mediciones son evidencia local de coste sintético, no latencia real de escucha ni RAM total de la aplicación.

Ejecución local del 2026-09-21: [mediciones sin procesar](journal-library-deltas-results.jsonl).
Las flechas indican anterior → candidato; los MB son decimales.

| Pistas | Petición de título (ms) | Pico adicional de Python (MB) | Guardado de título (ms) |
| ---: | ---: | ---: | ---: |
| 1,000 | 157.28 → 100.19 | 1.679 → 0.042 | 65.77 → 78.43 |
| 10,000 | 573.69 → 172.93 | 10.041 → 0.043 | 160.51 → 244.08 |
| 50,000 | 2187.21 → 550.05 | 49.344 → 0.042 | 688.13 → 1187.41 |

Con 50,000 pistas, la respuesta de título se mantuvo en 930 bytes. Su pico adicional de Python bajó de 49.34 MB a 42,481 bytes. El guardado más una petición con cambios tardó 2,875.34 → 1,737.46 ms (alrededor de un 40% menos); el guardado en sí fue más lento. Esto no incluye la exportación JSON ni otro trabajo que rodea a un guardado en la aplicación.

| Otra petición con 50,000 pistas | Anterior (ms) | Candidato (ms) |
| --- | ---: | ---: |
| lista de reproducción | 2773.24 | 512.36 |
| carátula | 2608.65 | 499.73 |
| sonoridad | 2788.9 | 574.73 |
| eliminación | 2682.46 | 592.4 |
| orden | 2216.64 | 539.81 |

En ese guardado de título, el WAL creció 28,872 → 49,472 bytes; las escrituras en almacenamiento imputadas al proceso fueron 2,973,696 → 2,994,176 bytes. La importación canónica inicial costó 4.11 → 5.58 segundos y el WAL 27.43 → 31.80 MB, incluidos el nuevo índice de hashes actuales y el diario acotado. La respuesta HTTP inicial costó 2.29 → 1.58 segundos.

El archivo de historial de respuestas en esta prueba de rendimiento desde cero ocupó 16.93 MB con el historial anterior de filas de cuatro revisiones, frente a 49,152 bytes con las bases ligeras. Eso **no es el uso total de disco**: los diarios/índices canónicos y de anotaciones están en bases de datos separadas. Este cambio no ejecuta VACUUM sobre el historial heredado existente. El 304 temprano tras ediciones de título se mantuvo en torno a 253 → 249 ms.
