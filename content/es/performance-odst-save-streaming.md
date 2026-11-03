# Guardados de biblioteca de ODST sin una cadena de salida JSON completa

`ODSTDownloader.save_library()` escribe ahora la salida compartida de `iter_json()` por bloques en lugar de construir `to_json()` antes de escribir. El lote de pistas es de 128 y usa el serializador compartido existente. Los archivos guardados con éxito siguen siendo idénticos byte a byte.

El bloqueo sigue cubriendo la lectura, la conservación de los datos de podcasts de Station y la escritura completa. Se conserva el comportamiento existente: los fallos de E/S y el JSON válido que no permite construir el modelo conservan los campos de podcast en memoria; el JSON mal formado devuelve un modelo vacío y borra esos campos. Esta última distinción la confirmaron las pruebas diferenciales posteriores del lector de podcasts. Los errores de escritura y de serialización se propagan. Los bloques se escriben en streaming en un archivo temporal junto al archivo, al que se le hace fsync y que se renombra sobre él (`shared.atomic_file.replace_contents`, ver [Reemplazo atómico](#atomic-replacement) más abajo): Station lee este archivo mientras ODST lo escribe, y un guardado fallido ahora deja intacto el documento anterior.

Esto elimina la cadena de salida completa y la copia completa de la serialización de los diccionarios de pistas. **No** elimina el modelo residente de ODST ni la lectura completa y la reconstrucción del modelo que se usan para conservar los podcasts. El iterador compartido también conserva una lista de referencias a pistas y serializa enteros los campos que no son pistas; la memoria total del guardado no es constante ni se limita a un lote de pistas.

## Mediciones

Línea base `d06bd6469db48e5f6e0e65853fea67c8e2b21a63`; [resultados en bruto](odst-save-results.jsonl). Cinco repeticiones de tiempos, alternando antes/después, sobre archivos temporales en el volumen de almacenamiento del repositorio. Cada invocación parte de bytes de archivo idénticos y comprueba que la salida sea igual. Una invocación aparte con tracemalloc mide las asignaciones temporales de Python, excluidos el modelo precargado y el JSON esperado; no es RSS y excluye las asignaciones nativas. Las cachés de lectura y escritura no están en frío.

| Biblioteca | Antes ms | Después ms | Pico antes MiB | Pico después MiB |
| --- | ---: | ---: | ---: | ---: |
| Copia real, 208 pistas | 9,44 | 9,85 | 2,88 | 2,71 |
| Sintética, 1.000 | 26,55 | 27,00 | 5,02 | 4,70 |
| Sintética, 10.000 | 280,00 | 319,83 | 49,01 | 45,84 |
| Sintética, 50.000 | 1.768,45 | 1.746,02 | 245,14 | 229,11 |

La copia real es el fixture existente de 208 pistas y 719.005 bytes que usa el benchmark de exportación de Station, en sólo lectura; los guardados reales se ejecutan sólo sobre copias temporales. Los resultados no registran metadatos personales ni rutas de origen. El corpus sintético usa el generador determinista de pistas del benchmark de exportación existente.

Con 50k, el pico temporal baja 16,04 MiB (~6,5 %). La memoria del guardado completo sigue siendo alta porque la lectura reconstruye todas las pistas. Con 10k esta ejecución es ~14 % más lenta; con 208 y 1k también es algo más lenta. Es un compromiso aceptado entre memoria y latencia, no una prueba de que todos los guardados sean más rápidos. Los bytes escritos no cambian, y no se afirma ninguna reducción del tráfico físico de disco, del RSS total del proceso ni del coste para la escucha.

Una ejecución de fases instrumentada aparte con 50k registró:

| Fase | Antes ms | Después ms |
| --- | ---: | ---: |
| Leer texto | 19,8 | 19,8 |
| Reconstruir modelo | 782,2 | 785,7 |
| Codificación JSON | 599,3 | 606,6 |
| Llamadas de escritura + cierre | 269,7 | 303,7 |

Los tiempos por fase son ejecuciones de diagnóstico únicas, no las medianas anteriores. Su tiempo de escritura incluye el cierre con búfer, no fsync. Excluyen la apertura del archivo, la adquisición del bloqueo y otras tareas de gestión, y no deben sumarse como si fueran las medianas del guardado completo. Ningún benchmark se ejecutó a la vez que la suite completa de tests.

## Reemplazo atómico

Al principio, el guardado en streaming escribía in situ, como el guardado eager: truncar y después escribir. Con bloques de 128 pistas eso dejaba un intervalo en el que Station podía leer un `library.json` parcial, y un fallo del proceso o un error de codificación dejaba uno así en disco. El guardado pasa ahora por `replace_contents`, que mantiene lo que la escritura in situ ofrecía a sus usuarios:

- un enlace simbólico se sigue y sigue siendo un enlace simbólico; se reemplaza su destino;
- el archivo conserva sus bits de permisos, y un archivo nuevo recibe el valor por defecto de la umask (un temporal `mkstemp` sin más lo habría dejado en 0600);
- una carpeta que no admite un temporal recibe la antigua escritura in situ en lugar de ninguna.

Cambian el inodo y el propietario. Los enlaces duros a `library.json` ya no lo siguen; nada en Soundsible los crea.

Coste, medido frente al escritor in situ `ee94fdb` con el mismo benchmark, cinco repeticiones alternas, en un sistema de archivos ext4 sobre un disco duro mecánico (Seagate ST1000DM010): [resultados en bruto](odst-save-atomic-results.jsonl).

| Biblioteca | In situ ms | Atómico ms | Pico MiB (ambos) |
| --- | ---: | ---: | ---: |
| Sintética, 200 | 4,21 | 57,22 | 0,53 |
| Sintética, 1.000 | 20,22 | 71,71 | 0,69 |
| Sintética, 10.000 | 238,06 | 312,02 | 0,76 |
| Sintética, 50.000 | 1.261,66 | 1.439,97 | 1,07 |

Los ~50–75 ms añadidos son el fsync en este disco. Con 50k la diferencia tiene mucho ruido: una ejecución idéntica anterior midió +2 ms y esta, +178 ms. Se paga una vez por guardado, es decir, una vez por descarga terminada, dentro del bloqueo de ODST. Los picos de memoria no cambian. El desglose por fases del benchmark instrumenta `open` en el módulo de ODST, así que ya no ve las escrituras del candidato; para esta comparación, leer las medianas, no las filas de fases.

## Reproducción y validación

```sh
venv/bin/python scripts/benchmark_pool_save.py --repeats 5 \
  --output /tmp/odst-save.jsonl
# Optional read-only fixture:
venv/bin/python scripts/benchmark_pool_save.py --library PATH/library.json \
  --output /tmp/odst-save-real.jsonl
venv/bin/python -m pytest -q tests/test_pool_library_save.py
```

El método de la línea base se carga desde la revisión de git de confianza; la implementación del modelo compartido se mantiene constante. Se excluyen a propósito los efectos secundarios del constructor, las descargas y la sincronización con la nube. Las pruebas específicas cubren archivos ausentes, JSON antiguo mal formado, bibliotecas vacías y en el límite de lote, bytes exactos, conservación de podcasts, permisos, enlaces simbólicos, propiedad del bloqueo y la conservación del archivo anterior tras errores del temporal, de escritura y de codificación. La validación en Linux no establece el comportamiento nativo en Windows ni la seguridad entre procesos con escrituras concurrentes de Station. Esto último es una limitación existente de los dos escritores y no se ha cambiado aquí.

Validación final: suite completa de Python con **1.521 superados**; Ruff sobre los archivos Python modificados y `git diff --check` pasaron. No cambió ningún archivo del frontend; los tests del frontend no se volvieron a ejecutar. No se modificaron el motor en ejecución ni los archivos de biblioteca del usuario.
