# Instantáneas condicionales de la biblioteca

`GET /api/library` devuelve un ETag débil y opaco calculado sobre la instantánea pública serializada más la identidad de la cuenta autenticada. Enviar ese ETag en `If-None-Match` devuelve un 304 sin cuerpo cuando la representación no ha cambiado. Las respuestas usan `Cache-Control: private, no-cache` y varían según Cookie y la cabecera del token de propietario de escritorio. La autenticación se ejecuta antes de la ruta. La carga JSON no cambia; los clientes sin peticiones condicionales reciben instantáneas completas.

## Revalidación temprana

Una revisión de la base de datos no basta por sí sola: el manifiesto se puede modificar entre guardados, y las carátulas y la sonoridad cambian de forma independiente. La ruta rápida combina:

- Una huella calculada en streaming de todos los campos públicos de metadatos, incluidos ajustes anidados, listas de reproducción, podcasts, orden de las pistas y listas estructuradas de artistas. Se excluyen las rutas y los mtimes locales de la máquina.
- Tokens persistentes de invalidación de SQLite para referencias/objetos de carátulas y filas de sonoridad. Los triggers cambian los tokens dentro de cada transacción de escritura, incluidas las escrituras desde otra conexión u otro proceso. La reversión revierte también el token; las bases de datos nuevas reciben tokens independientes. Los registros internos de recuperación no invalidan las carátulas. Las bibliotecas vacías no necesitan tokens ni consultas de anotaciones.
- La identidad de la cuenta autenticada.

Una caché acotada local al proceso (128 entradas, TTL de 10 minutos) asocia estas claves a ETag. No conserva pistas, instantáneas ni cuerpos de respuesta. Una petición que coincide termina antes de la copia pública, la anotación de sonoridad/carátulas y la serialización JSON. Los fallos de caché usan la ruta de respuesta completa y alimentan la caché con la huella de la **instantánea desacoplada**. Así, una edición de metadatos durante la copia no puede guardar en caché la respuesta bajo un contenido de origen distinto. Los tokens de anotación deben coincidir antes y después de la construcción; los fallos y las confirmaciones concurrentes impiden la admisión. Si los almacenes de revisiones no están disponibles o el modelo tiene una forma no admitida, se recurre a la ruta completa. La expulsión y los reinicios del proceso solo afectan al rendimiento.

La huella usa pickle únicamente como codificador interno de bytes con tipos que alimenta un digest. Nunca conserva ni deserializa los bytes. El memo del codificador se vacía entre pistas, así que las asignaciones temporales dependen de los metadatos de cabecera y de la pista más grande, no del número de pistas. El manifiesto se sigue recorriendo en cada petición condicional; esto no es una comprobación O(1) de la revisión de la base de datos.

## Comportamiento web

El almacén web mantiene en memoria un único validador para su última instantánea aceptada. Las peticiones condicionales explícitas usan `cache: no-store`. Con un 304 conserva las identidades de pistas/listas y los metadatos de carátulas, actualiza las entradas guardadas y omite una proyección del catálogo ya cargada correctamente para esa revisión. Las cargas del catálogo fallidas se reintentan. Los motores sin ETag siguen funcionando; las instantáneas mal formadas no pueden borrar el estado aceptado.

La invalidación borra el validador y la actualización programada, abandona la generación de petición anterior y permite que la siguiente petición empiece de inmediato. Las respuestas obsoletas no pueden instalar pistas, metadatos de carátulas ni validadores. Iniciar y cerrar sesión recargan la página, que empieza sin validador. Las llamadas de sincronización concurrentes comparten una promesa que incluye la actualización posterior agrupada.

## Evidencias y límites

Ejecuta `venv/bin/python scripts/benchmark_library_revisions.py --memory` para pasar metadatos sintéticos por la ruta real de Flask. Se excluyen la actualización de la base de datos, las consultas de anotaciones/lecturas de tokens, la compresión y el transporte de red. No se lee ni se escribe ningún dato de usuario. Los tiempos y tracemalloc se miden en ejecuciones separadas. Ejemplo de ejecución local del 2026-09-21, mediana de tres peticiones:

| Pistas | Bytes del cuerpo completo | Bytes del cuerpo sin cambios | Completo ms | Sin cambios en caliente ms | Bytes del pico de Python completo | Bytes del pico de Python en caliente |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 712,815 | 0 | 15.88 | 3.63 | 2,285,261 | 22,920 |
| 10,000 | 7,156,815 | 0 | 156.08 | 32.23 | 22,735,659 | 22,096 |
| 50,000 | 35,916,815 | 0 | 785.33 | 163.03 | 113,894,228 | 21,616 |

Como contexto, la implementación anterior `93902d4` midió unos 651 ms para una respuesta sin cambios con 50,000 pistas: serializaba antes de devolver el 304. Su respuesta completa tardaba unos 648 ms. La ruta rápida añade trabajo de huella en las respuestas completas a cambio de un menor coste de validación repetida. Una petición condicional con cambios realiza tanto la comprobación del origen como la huella desacoplada. Son ejecuciones sintéticas, no una prueba controlada de latencia en producción ni de audio. Las cabeceras se siguen enviando con un 304. Los picos de asignación no son el RSS del proceso; las bibliotecas con listas de reproducción o cachés de podcasts grandes requieren más espacio temporal para la huella.

La cobertura del backend ejercita la omisión temprana, mutaciones en memoria sin guardar, adiciones, eliminaciones, orden, anotaciones, aislamiento entre cuentas, construcción concurrente, reversión, escrituras externas, reapertura, fallos y presupuestos de conexiones. Las pruebas del frontend y de Chromium/WebKit del fragmento anterior cubren HTTP condicional, recarga, respuestas obsoletas y conservación de la identidad de objetos; la ruta temprana del servidor no cambia su protocolo.

El transporte incremental ahora está cubierto por [deltas de biblioteca almacenados en disco](library-deltas.md).
La caché de validadores descrita aquí sigue sin conservar instantáneas; el historial opcional de deltas solo almacena en disco ID ordenados y hashes. Una revisión del manifiesto totalmente transaccional y la construcción incremental en el servidor siguen siendo trabajo aparte.
