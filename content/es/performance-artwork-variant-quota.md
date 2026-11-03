# Cuota de disco para variantes de carátulas

Los tamaños/recortes JPEG generados comparten ahora una cuota de 512 MiB por directorio de caché de carátulas. `SOUNDSIBLE_ARTWORK_CACHE_MB` la sustituye por un entero no negativo en MiB, que se lee al construir el almacén. Reinicia el motor después de cambiarla. `0` desactiva la retención; los valores negativos o no válidos registran una advertencia y usan 512 MiB. Las imágenes originales, las referencias y sus tokens de revisión públicos nunca se expulsan.

## Admisión y vida útil

Un `variants.sqlite3` independiente registra nombres de archivo, tamaños y uso reciente; su ordenación indexada y su contador de bytes evitan recorrer el directorio en los aciertos normales. Las lecturas actualizan el uso como máximo una vez por minuto por variante, sin modificar el mtime del JPEG. Python no mantiene en memoria ninguna colección de imágenes en caché ni de nombres de archivo indexados. Las cachés de páginas de SQLite temporales, la principal y la de conciliación, tienen un objetivo de 512 KiB.

Si admitir una imagen superase la cuota, se expulsan los registros de uso más antiguos en páginas indexadas de 100 hasta que los bytes antiguos más la nueva imagen quepan en el 90 % de la cuota. Una imagen mayor que ese objetivo pero dentro de la cuota puede ocupar ella sola la caché. Una imagen mayor que la cuota se sirve sin retenerla.

La conciliación del directorio se ejecuta en el primer acceso a una variante en cada instancia del almacén, tras un reinicio o cuando una operación interrumpida dejó activado el indicador persistente de estado sucio. Usa `scandir` y una tabla temporal de pertenencia en SQLite respaldada en disco, conserva las marcas de tiempo de uso conocidas e importa los archivos heredados usando su mtime como uso inicial. Los archivos que faltan salen del índice; las variantes huérfanas reconocidas entran en él. Los restos conocidos del staging de publicación se eliminan bajo el mismo bloqueo de coordinación. Los índices ausentes o corruptos se reconstruyen; los archivos arbitrarios y los enlaces simbólicos no se limpian. Si los directorios de caché y de originales se solapan, se desactivan la retención y la limpieza.

Un bloqueo de directorio (`flock` en Unix, `msvcrt.locking` de un byte en Windows) coordina la admisión/apertura/desvinculación entre procesos; un bloqueo de hilo gestiona los llamadores locales. La decodificación de imágenes se produce fuera de este bloqueo de cuota. Se mantienen las 64 franjas de bloqueo de imágenes existentes y las dos ranuras de generación por instancia de ArtworkStore. Varios procesos pueden seguir codificando a la vez la misma imagen en frío, pero la admisión vuelve a comprobar cuál ha ganado y nunca contabiliza ni publica la variante dos veces.

HTTP obtiene un descriptor ya abierto mientras se mantiene la coordinación y después envía desde él tras liberar todos los bloqueos. Proporciona explícitamente el tipo MIME JPEG, la longitud, la fecha de última modificación y un ETag derivado del nombre de archivo; se mantienen los rangos, HEAD, el 304 condicional, las redirecciones de revisión y la política de caché. El nuevo ETag puede provocar una única respuesta 200 nueva para un validador antiguo del navegador y después se mantiene estable al regenerar. Los descriptores se cierran al completarse normalmente la respuesta, en 304/HEAD, ante excepciones y ante cancelaciones.

En Unix, un archivo desvinculado sigue siendo legible a través de un descriptor abierto. En Windows, si se deniega una desvinculación porque hay un lector abierto, se omite. Si no se puede recuperar espacio suficiente, la imagen solicitada se entrega desde un archivo temporal en disco que se cierra con la respuesta. Un fallo de coordinación o de indexación también usa la entrega temporal; si falla la generación temporal, la ruta mantiene su alternativa de imagen existente. Ninguna alternativa escribe variantes permanentes sin contabilizar.

## Qué cuenta la cuota

El límite cuenta los bytes de los JPEG generados que se retienen, no los originales, los archivos de índice, los journals de SQLite, los archivos de bloqueo, los archivos temporales de codificación/publicación ni los archivos eliminados que los clientes aún mantienen abiertos. Estos pueden requerir temporalmente disco adicional. Todos los archivos de respuesta generados usan el directorio de caché configurado, también cuando la retención está desactivada; una caché en tmpfs sigue siendo almacenamiento respaldado por RAM. Pillow sigue teniendo que decodificar las imágenes en memoria; esto no es una canalización de imágenes sin uso de memoria.

La conciliación al arrancar y la expulsión pueden retrasar la primera petición de imagen. Los archivos existentes que no se pueden eliminar pueden mantener una caché heredada por encima de la cuota hasta que el sistema operativo permita eliminarlos; los accesos posteriores reintentan la limpieza y las nuevas admisiones no pueden aumentar ese exceso. No hay un limpiador en segundo plano, ni un recorrido del directorio completo en cada acierto, ni un vacuum dentro de las peticiones HTTP. SQLite reutiliza las páginas de índice liberadas.

## Validación

La suite completa de Python superó 1429 pruebas. Las pruebas finales específicas de la cuota superaron 25, incluidos tres casos adicionales de fallo de índice, publicación interrumpida y seguridad de rutas. `npm test` superó la comprobación de tipos y 1123 pruebas del cliente. Ruff y `git diff --check` pasaron sin errores.

La cobertura incluye límites LRU/de tamaño, admisión con cuota cero o de imágenes demasiado grandes, configuración no válida, conservación de los originales y revisiones públicas sin cambios, índices ausentes/corruptos, adopción de archivos heredados, conciliación tras un fallo, archivos ausentes, enlaces simbólicos/rutas desconocidas, ausencia de recorridos o regeneraciones en la ruta crítica, escrituras de uso amortizadas, admisión con varios hilos y con tres procesos, expulsión con lectores activos, alternativa temporal y cierre de descriptores. Las pruebas HTTP cubren bytes/longitud del JPEG, ETag/304, HEAD, rangos de bytes, rangos no válidos y cancelación por parte del cliente, con variantes retenidas y temporales.

Las pruebas se ejecutaron en Linux. La denegación de eliminación de archivos abiertos en Windows está simulada, pero el comportamiento nativo de bloqueo/HTTP en Windows **no se ha validado** en este entorno.

## Medición

```sh
venv/bin/python scripts/benchmark_artwork_variants.py --counts 1000 10000
```

El script usa un directorio temporal en el propio almacenamiento, junto al repositorio, fixtures JPEG reales y decodificación real para una nueva variante de 640 px. Una cuota deliberadamente pequeña fuerza la adopción/expulsión de aproximadamente la mitad de las variantes heredadas. Los tiempos en caliente son medianas de 30 accesos sin instrumentar; la memoria se mide por separado con tracemalloc. El tiempo de conciliación incluye la sobrecarga de tracemalloc. Los fixtures se excluyen de los picos de Python, al igual que las asignaciones nativas de SQLite/Pillow. Son costes locales de la caché; no son afirmaciones sobre la latencia HTTP completa, el RSS total ni el rendimiento del audio.

Registrado localmente después de completar las suites de pruebas; [resultados en bruto](artwork-variant-quota-results.jsonl).
Los valores en bytes son exactos; los tiempos están en milisegundos.

| Variantes heredadas | Límite JPEG | JPEG retenidos | Bytes de índice | Mediana en caliente (ms) | Bytes adicionales de Python en caliente | Conciliación instrumentada (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.000 | 25.556.511 | 23.266.522 | 364.544 | 0,181 | 267.381 | 590,158 |
| 10.000 | 255.071.004 | 229.829.498 | 3.514.368 | 0,181 | 267.381 | 5085,273 |

Los picos de asignaciones de Python durante la conciliación fueron de aproximadamente 1,31 MB / 1,28 MB, respectivamente. Generar la nueva variante de 640 px tardó 218 / 260 ms, incluida la admisión en disco. Estas cifras no se comparan con la implementación anterior de caché sin límite. Demuestran la aplicación de la cuota, la asignación acotada de memoria auxiliar y el coste en la ruta crítica; no afirman que añadir la contabilidad de la cuota haga más rápidos los aciertos de caché.
