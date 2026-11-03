# Serialización JSON acotada para deltas de biblioteca

La [ruta basada en diarios](journal-library-deltas.md) posterior omite la preparación de la instantánea completa para fuentes canónicas verificadas. Este serializador acotado sigue disponible en el respaldo heredado de comparación completa descrito aquí.

Antes, una respuesta de biblioteca con cambios construía tanto la instantánea pública desacoplada como una respuesta JSON completa de Flask antes de elegir un delta pequeño. Ese cuerpo JSON completo se usaba para calcular su ETag y su longitud en bytes, y luego se descartaba cuando el delta era más pequeño. Con 50,000 pistas, esto suponía construir unos 36 MB de JSON, con asignaciones intermedias adicionales de cadenas/bytes, para enviar una edición de 925 bytes.

Para las peticiones con `delta=1` y un `since` no vacío y de longitud válida, la ruta ahora calcula el hash de la representación compacta exacta de Flask en lotes de 500 pistas y cuenta sus bytes UTF-8. Solo construye la respuesta completa si la comparación de historial o de tamaño lo requiere. No se introduce ninguna caché de cuerpos de respuesta, almacenamiento nuevo en disco, cambio de esquema de base de datos ni cambio de protocolo del cliente.

La firma conserva el ámbito por cuenta, el orden de las claves, el escape de Unicode, los separadores y el salto de línea final. El procesamiento por lotes usa el codificador JSON de Flask en lugar de una representación alternativa. Los proveedores JSON personalizados y los ajustes de salida con sangría usan la ruta existente de respuesta completa. Las descargas iniciales sin base también usan la ruta existente. Las peticiones condicionales con la caché caliente siguen devolviendo respuestas 304 tempranas antes de la copia pública, la anotación o el trabajo JSON.

## Límites y trabajo pendiente

El espacio temporal de serialización es proporcional a un lote de diccionarios de pistas o a una cabecera de nivel superior. Por tanto, una sola pista/cabecera excepcionalmente grande puede seguir ocupando mucho. La instantánea pública desacoplada y las anotaciones siguen siendo proporcionales a la biblioteca; el cálculo de la huella pública, el hash del JSON y la comparación del historial siguen recorriendo todas las canciones. La carga del catálogo y las exportaciones JSON portables no cambian.

Una base caducada/desconocida, un historial no disponible o un delta mayor que el cuerpo completo provocan un respaldo completo. La ruta optimizada ya ha contado los bytes y calculado el hash del JSON, así que estas peticiones pueden pagar una pasada de codificación más al construir el cuerpo completo. No se introduce ninguna pasada de codificación adicional para las descargas iniciales normales, los clientes sin deltas ni las respuestas 304 tempranas.

## Validación

Las pruebas comparan la firma y el recuento de bytes con la respuesta real de Flask, incluidas colecciones vacías, los límites de 499/500/501 pistas, varios lotes, Unicode, cadenas con escapes, campos anidados, ajustes alternativos de ordenación/escape, salida con sangría y proveedores personalizados. Una prueba de regresión HTTP real edita una canción en una biblioteca de 1,001 pistas y falla si la ruta construye la respuesta JSON completa. Las pruebas existentes siguen cubriendo la aplicación exacta de deltas, el aislamiento entre cuentas, la pérdida de historial, el historial bloqueado/corrupto, el respaldo ante deltas grandes y los cambios concurrentes de dependencias.

## Mediciones

Compara la ruta de `5e7994d` con el candidato confirmado junto con este informe:

```sh
venv/bin/python scripts/benchmark_library_deltas.py --reference 5e7994d --sizes 1000 10000 50000 --repeats 3 --memory
venv/bin/python scripts/benchmark_library_deltas.py --sizes 1000 10000 50000 --repeats 3 --memory
```

La opción `--reference` carga solo la ruta desde una revisión local de git; los auxiliares compartidos siguen siendo los del árbol de trabajo. En esta comparación no cambian para la ruta de referencia. `--fallbacks` mide además las respuestas completas por base ausente y por edición masiva. Los tiempos usan tres peticiones sin instrumentar; la memoria se mide en una petición separada con `tracemalloc`. Cada delta se aplica y se compara con una respuesta completa; también se comprueba que los cuerpos de respaldo sean exactamente iguales.

La prueba de rendimiento sintética ejercita Flask y el historial real en disco. Excluye la carga de la base de datos canónica, las consultas reales de anotaciones, la compresión, la red y la reproducción. Las asignaciones adicionales de Python excluyen el modelo de biblioteca existente y la memoria nativa de SQLite. Estas cifras no representan la RAM total del proceso ni el rendimiento de audio en un dispositivo físico.

Registrado localmente el 2026-09-21; [resultados sin procesar](library-delta-serialization-results.jsonl).
Las flechas indican referencia → candidato; los MB son decimales.

| Pistas | Tiempo del delta con cambios (ms) | Pico extra de Python (MB) | Bytes del delta | Bytes del archivo de historial |
| ---: | ---: | ---: | ---: | ---: |
| 1,000 | 151.32 → 151.68 | 2.29 → 1.58 | 925 | 348,160 |
| 10,000 | 413.38 → 445.35 | 22.74 → 9.15 | 925 | 3,264,512 |
| 50,000 | 1615.39 → 1598.25 | 113.90 → 42.79 | 925 | 16,928,768 |

Con 50,000 pistas, el pico de asignación de Python de la respuesta con cambios bajó alrededor de un 62%. Los tiempos no mostraron una mejora consistente entre tamaños; este fragmento se centra en la memoria transitoria. Los bytes transmitidos, el tamaño de los archivos de historial conservado y el número de revisiones no cambiaron. El 304 temprano con 50,000 pistas tardó 157.22 → 154.94 ms, sin cambios en su implementación.

Una ejecución secuencial separada con `--sizes 50000 --repeats 3 --fallbacks` midió el coste del respaldo (con los mismos comandos de referencia y de árbol de trabajo indicados arriba):

| Petición | Referencia (ms) | Candidato (ms) |
| --- | ---: | ---: |
| Base desconocida, respaldo completo | 767.06 | 966.40 |
| Todos los títulos cambiados, respaldo completo | 2255.32 | 2515.04 |

Así, estos respaldos cuestan aproximadamente 0.20–0.26 segundos más con este tamaño. La ventaja es una menor RAM transitoria en las respuestas incrementales, no una mejora general de la latencia. La ruta todavía tiene margen para evitar construir, anotar y calcular el hash de toda la instantánea pública.

Validación: se superaron 73 pruebas focalizadas y la batería completa de Python (1,368 pruebas); se superaron Ruff y `git diff --check`. No ha cambiado ningún archivo del frontend ni ningún contrato del protocolo de red.
