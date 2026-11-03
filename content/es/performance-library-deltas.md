# Deltas de biblioteca almacenados en disco

La [ruta basada en diarios](journal-library-deltas.md) ahora sirve las bibliotecas canónicas verificadas a partir de diarios de claves cambiadas y pruebas ligeras de base. Este documento describe la comparación original por hash de filas, que se conserva como respaldo para las fuentes sin esa prueba, y sus mediciones originales. Los ETag de fuentes verificadas representan dependencias; las fuentes no verificadas conservan los hashes del cuerpo serializado.

Los clientes lo activan con `GET /api/library?delta=1`. Una respuesta completa mantiene la forma JSON existente y el ETag débil. Las peticiones siguientes incluyen `since=<unquoted ETag>` e `If-None-Match`. Las bibliotecas sin cambios mantienen la ruta existente de 304 temprano, sin abrir la base de datos de historial. Los clientes heredados que no lo activan no cambian.

En su lugar, una respuesta con cambios puede contener:

```json
{
  "kind": "delta",
  "base_revision": "<base digest>",
  "revision": "<target digest>",
  "upserts": [{"id": "song", "title": "complete changed track and its public fields"}],
  "removed": ["deleted-song"],
  "order": ["song", "other-song"],
  "fields": {"playlists": {}, "settings": {}}
}
```

`upserts` contiene las pistas públicas añadidas/cambiadas completas, incluidas la carátula y la sonoridad. Por tanto, un campo eliminado también se elimina en el cliente. `order` solo está presente cuando cambia la secuencia ordenada de ID; indica el nuevo orden completo. Cada entrada de `fields` sustituye todo ese campo de nivel superior, incluidas las colecciones vacías de listas de reproducción/ajustes/podcasts. Los bloques sin cambios se omiten. La revisión de destino es el digest del ETag de la instantánea pública completa. Las respuestas delta llevan `Cache-Control: private, no-store` y no llevan ETag: representan una transición, no el recurso completo que usa el validador.

Un historial ausente, caducado, de otra cuenta o no disponible da lugar a una respuesta completa en la misma petición. Un delta al menos tan grande como el JSON completo se descarta en favor de la respuesta completa. El frontend valida la base, los ID, el orden y los campos antes de aplicarlo. Un delta no válido provoca un único reintento completo incondicional; las generaciones obsoletas se comprueban antes de que cualquiera de las dos respuestas pueda tocar el estado o las carátulas.

## Almacenamiento y límites de recursos

El historial está en `get_cache_dir()/library-deltas.sqlite3`, con modo 0600. Se puede reconstruir, pero sobrevive a los reinicios. Cada revisión almacena los ID ordenados y los hashes SHA-256 de los diccionarios públicos completos de las pistas y de los demás campos públicos. No se conservan títulos de pistas, cuerpos de metadatos ni instantáneas completas. Las claves numéricas de revisión evitan repetir los ID de cuenta y los ETag en cada pista. No hay ninguna caché de historial nueva local al proceso ni ninguna conexión permanente.

La retención es como máximo de cuatro revisiones por cuenta, con una antigüedad máxima de 24 horas, y de 64 MiB en total para registros contabilizados de forma conservadora. SQLite también impone un límite de páginas de 64 MiB a la base de datos principal. Las bases más antiguas se expulsan antes de insertar datos nuevos. La caducidad se limpia al acceder al historial, no mediante un temporizador en segundo plano. La base de datos reutiliza las páginas liberadas; no ejecuta VACUUM dentro de las peticiones HTTP. Por tanto, el tamaño asignado del archivo no tiene por qué bajar cuando caducan los registros, pero no puede seguir creciendo más allá de su límite. Los diarios de reversión (rollback journals) y las tablas temporales de comparación respaldadas en archivo son uso transitorio adicional de disco, no historial conservado, y se liberan al cerrar la conexión. El sistema operativo puede guardar páginas de disco en su caché de páginas normal.

Las cachés de páginas principal y temporal de SQLite tienen cada una un objetivo de 512 KiB. Los hashes actuales se calculan una vez en una tabla temporal respaldada en archivo, se comparan con JOIN de SQL indexados y las posiciones seleccionadas se consumen en lotes de 500. Las revisiones completas anteriores no se cargan en mapas de Python. Las listas de la aplicación contienen solo las filas cambiadas de la respuesta, las eliminaciones y el nuevo orden opcional. La instantánea pública actual existente sigue requiriendo memoria proporcional al tamaño de la biblioteca. El hash del JSON de destino del delta usa lotes de 500 pistas en lugar de conservar un cuerpo completo; las respuestas completas y los deltas grandes aún pueden añadir memoria transitoria de respuesta. Consulta [serialización acotada](library-delta-serialization.md) para ver las mediciones y los costes del respaldo.

La inicialización y la admisión son transaccionales. Las admisiones duplicadas concurrentes son idempotentes. Los escritores esperan como máximo 100 ms por cada adquisición de bloqueo de SQLite; los errores, la corrupción, una admisión demasiado grande o el agotamiento del disco hacen que se recurra a la biblioteca completa. El cierre de la conexión se ejecuta tanto si hay éxito como si hay fallo. Un archivo de historial corrupto queda sin usar hasta que se borra o se sustituye; nunca pasa a ser un requisito para servir la biblioteca. Recrear la caché solo hace perder la optimización.

## Aplicación en el cliente

Los deltas reutilizan los objetos de fila no modificados y aplican el resultado en un lote mediante la reconciliación por claves de Solid. La reconciliación también elimina los campos anidados obsoletos. Los deltas que solo afectan a cabeceras conservan el array de la biblioteca. Los metadatos de carátulas solo se modifican para las filas cambiadas/eliminadas. Su diccionario de señales existente se copia de forma superficial al modificarlo; no se introduce una segunda biblioteca persistente. Las pistas y los pequeños mapas temporales usados durante la validación son necesarios para la interfaz actual, no para el historial.

Las ediciones de metadatos, las respuestas a mutaciones de listas de reproducción, las eliminaciones y las reversiones invalidan la base aceptada cuando cambian el estado local fuera de la sincronización de la biblioteca. El respaldo completo también reconcilia filas/colecciones, por lo que las claves eliminadas de listas de reproducción o de anotaciones no pueden sobrevivir a él. Se mantienen la actualización de entradas guardadas y el comportamiento de reintento del catálogo.

## Validación y mediciones

`venv/bin/python scripts/benchmark_library_deltas.py --memory` ejercita la ruta real de Flask y el historial real de SQLite en un directorio temporal junto al repositorio (en el almacenamiento, no en el `/tmp` respaldado en RAM de este equipo). Excluye la carga de la BD canónica, las consultas de anotaciones/tokens, la red, la compresión y la reproducción. Cada delta se aplica y se compara con una respuesta completa incondicional. Los tiempos y tracemalloc se miden en ejecuciones separadas; el tiempo con cambios es la mediana de tres ediciones. Implementación original de deltas, antes de la serialización JSON acotada, medida localmente el 2026-09-21:

| Pistas | Bytes completos | Bytes del delta con una edición | Completo sin historial ms | Primer completo + historial ms | Delta con cambios ms | Bytes del archivo con cuatro revisiones |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 712,815 | 925 | 16.75 | 189.15 | 146.40 | 348,160 |
| 10,000 | 7,156,815 | 925 | 158.48 | 457.45 | 414.68 | 3,264,512 |
| 50,000 | 35,916,815 | 925 | 781.90 | 1,470.12 | 1,682.60 | 16,928,768 |

En esa implementación original, con 50,000 pistas, el pico de asignación adicional de Python de la respuesta con cambios fue de 113,896,531 bytes: este fragmento no elimina la construcción de la instantánea completa en el servidor. Las peticiones sin cambios seguían tardando unos 168 ms por la ruta existente de 304 temprano. La ventaja aquí está en la transferencia y en el trabajo del cliente, a cambio de más cálculo de hashes en el servidor, escrituras en SQLite y uso de disco. Estos resultados no demuestran una mejora de la CPU, de la continuidad del audio ni de la latencia de extremo a extremo en producción. El [fragmento de serialización acotada](library-delta-serialization.md) posterior reduce ese pico de memoria. Evitar la construcción de la instantánea completa, la anotación y el hash por fila en las respuestas con cambios sigue siendo un trabajo aparte.

Las pruebas cubren la equivalencia ordenada exacta, la desaparición de anotaciones, adiciones y eliminaciones, cambios de cabecera/podcast, aislamiento entre cuentas, reinicio en un proceso nuevo, cuotas de TTL/número/bytes, reversión, admisión concurrente, historial bloqueado/corrupto, límites físicos de páginas y cierre de conexiones. Las pruebas del frontend verifican la validación, la identidad de objetos, la aplicación atómica, el respaldo y las respuestas obsoletas. Chromium y WebKit ejercitan HTTP condicional, recarga, carátulas, deltas y recuperación ante una base incorrecta.
