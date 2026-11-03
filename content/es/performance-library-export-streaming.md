# Exportaciones de library.json por streaming

Después de cada guardado canónico, el motor actualiza las copias portables de `library.json`: el manifiesto por usuario, `<music>/library.json` en instancias de un solo usuario y la réplica del proveedor de almacenamiento. Antes construía el documento completo dos veces por guardado —`to_json()` para las copias locales y otra vez dentro de `provider.save_library()`—, cada vez como un árbol de diccionarios de pistas más una cadena con el archivo completo. Ahora se serializa una sola vez, por partes, y cada una de las demás copias es una copia byte a byte de la primera. El contenido, la ubicación, los permisos y la durabilidad de los archivos no cambian.

## Qué ha cambiado

- `LibraryMetadata.iter_json()` produce `to_json()` por partes. Los valores de cabecera se codifican exactamente igual que antes; las pistas se codifican de 128 en 128 y con un nivel más de sangría. JSON escapa los saltos de línea dentro de las cadenas, así que todo salto de línea en un bloque codificado es de formato. `to_json()` no cambia y ambos comparten una única definición de las claves públicas y su orden.
- `_export_metadata()` recibe el modelo en lugar de una cadena. Escribe en streaming en el primer destino escribible (archivo temporal, fsync, rename, como antes) y después publica las demás copias locales como copias byte a byte de ese archivo, de la misma forma. Los destinos no escribibles se siguen notificando una vez y se omiten; si falla el primero, se serializa en el siguiente.
- El proveedor recibe el archivo terminado (`save_library_file`). En la primera versión, el proveedor local lo copiaba sobre el archivo existente, igual que el `write_text` al que sustituía; eso truncaba la réplica antes de leer el origen, y cuando el almacenamiento apunta a la carpeta de música la réplica *es* el origen, así que `library.json` quedaba vacío. Ahora omite una réplica que sea el mismo archivo que el origen y, en otro caso, la sustituye entera (`replace_contents`: temporal, fsync, rename) conservando su enlace simbólico y sus bits de permisos; solo cambia el inodo. Los proveedores remotos suben el mismo texto que antes (con los finales de línea de la plataforma convertidos de nuevo en `\n`), sin una segunda serialización; su subida sigue manteniendo una vez el texto del archivo en memoria. Si no se ha escrito ninguna copia local, el proveedor serializa el modelo como antes.
- Las exportaciones de una misma biblioteca usan un bloqueo, así que nunca se intercalan: una copia nunca lee un archivo que otra exportación está sustituyendo, algo que Windows rechazaría.
- Cada exportación registra una línea INFO con su tamaño, destinos y duración, de modo que los propios registros de una instancia muestran lo que cuestan allí las exportaciones.

## Validación

`tests/test_library_export.py` comprueba `iter_json()` frente a `to_json()` byte a byte (cabeceras vacías; 0/1/511/512/513/1025 pistas; bloques de 1/2/128/512; caracteres no ASCII, comillas, barras invertidas, caracteres de control, NUL, `None`, listas y diccionarios anidados, podcasts); que un guardado nunca construye el documento completo; que todas las copias son iguales a `to_json()` sin dejar temporales; carpetas de música compartidas; destinos no escribibles y que fallan; renombrados fallidos; que la réplica conserva el enlace simbólico y el modo; una réplica que es el archivo de origen; el respaldo del proveedor; el bloqueo de exportación; subidas remotas, incluidos archivos CRLF; y un límite de memoria. Las pruebas existentes de biblioteca canónica, escaneo de carpetas y multiusuario se superan sin cambios.

## Reproducción y resultados medidos

```sh
venv/bin/python scripts/benchmark_library_export.py --repeats 5 --library PATH/library.json
```

El exportador anterior se carga desde `89493bc`; se incluye el `to_json()` de su llamador, tal como se ejecutaba antes de la llamada. Ambos escriben las tres copias de una instalación predeterminada de un solo usuario en directorios temporales del volumen de almacenamiento del repositorio, y cada copia se comprueba frente a `to_json()`. No se incluye el guardado en SQLite que precede a una exportación. Los picos son de tracemalloc (asignaciones de Python, excluida la biblioteca cargada). `wchar` cuenta los bytes pasados a `write()`; las escrituras en almacenamiento proceden de `/proc/self/io`, no de telemetría del dispositivo.

Ejecución local del 2026-09-22: [mediciones sin procesar](library-export-streaming-results.jsonl).
"Real" es una biblioteca existente de 208 pistas cuyo archivo es en un 60% caché de episodios de podcast.

| Biblioteca | Archivo | Anterior ms | Actual ms | Pico MiB | Serializaciones |
| --- | ---: | ---: | ---: | --- | --- |
| Real, 208 pistas | 719,005 B | 106.57 | 99.73 | 2.197 → 1.347 | 2 → 1 |
| 200 pistas | 234,148 B | 89.91 | 79.41 | 0.809 → 0.531 | 2 → 1 |
| 1,000 pistas | 1.17 MB | 115.05 | 97.49 | 3.483 → 0.689 | 2 → 1 |
| 10,000 pistas | 11.73 MB | 469.68 | 366.89 | 33.693 → 0.759 | 2 → 1 |
| 50,000 pistas | 58.86 MB | 2,470.42 | 1,921.95 | 168.533 → 1.066 | 2 → 1 |

Los bytes escritos no cambiaron (por ejemplo, 2,157,015 con 208 pistas y 176.6 MB con 50,000: tres copias completas). Con tamaños pequeños, el tiempo de una exportación lo ocupan casi todo sus dos fsync, así que el tiempo ahorrado ahí es pequeño y queda dentro del ruido del disco.

## Agrupación de exportaciones: no implementada

Escribir `library.json` como mucho cada N segundos eliminaría exportaciones completas en ráfagas de guardados. Se evaluó y se aplazó:

- En la biblioteca real medida, una exportación tarda ~100 ms, sobre todo por dos fsync, y escribe unos 2.2 MB. Los guardados siguen a acciones del usuario, y las confirmaciones de descargas ya se agrupan (`orchestrator.schedule_metadata_commit`, 2 s).
- ODST también lee `<music>/library.json` (al construirse y en cada uno de sus guardados, para conservar los datos de podcasts) y lo sustituye. Una exportación retrasada de Station alarga el intervalo en el que ODST puede volver a escribir datos de podcasts obsoletos.
- El debounce existente de confirmaciones no escribe lo pendiente al apagar. Una exportación retrasada se perdería al detenerse el motor; solo se vuelve a escribir desde SQLite la próxima vez que se construye el núcleo de la cuenta.

Conviene revisarlo con las líneas INFO de una instancia real: donde compensaría es en bibliotecas grandes que se guardan a menudo (tres copias completas por guardado).

Son mediciones de la exportación aislada en una sola máquina, no de la latencia de guardado de extremo a extremo, el RSS total, el consumo de energía ni el comportamiento de escucha.
