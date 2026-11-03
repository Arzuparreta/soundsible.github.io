# Ediciones explícitas de metadatos de pistas

`LibraryManager.patch_track_metadata` declara una edición pequeña en lugar de pedir a SQLite que vuelva a descubrir las diferencias en toda una biblioteca mutable. El fallback manual sólo de metadatos y los flags de metadatos/carátula usan esta operación. Las reescrituras de audio, los cambios de clave, las descargas, las eliminaciones y las ediciones de playlists mantienen sus contratos existentes y el escritor completo.

Sólo se aceptan título, artista, álbum, artista del álbum, origen de la carátula y el flag de modificado por el usuario. La revisión de la biblioteca y la huella pública previa a la edición deben coincidir dentro de la transacción. La pista activa en memoria sólo cambia después del commit. Un conflicto o un fallo de almacenamiento recarga el estado canónico e informa del fallo. Los comprobantes invalidados usan una recarga canónica y el escritor completo establecido para esa operación; una instantánea sucia pero supuestamente verificada se rechaza, no se certifica en silencio.

La transacción específica actualiza una pista y la revisión de la biblioteca. Conserva los journals de filas públicas y los comprobantes de búsqueda; los cambios de artista/álbum siguen reconstruyendo la proyección del catálogo. No se sustituyen el orden de las pistas, las playlists, los alias, las fechas de adquisición ni el estado del usuario. Esto elimina el staging y las comparaciones de pistas/playlists, no todas las operaciones O(N): comprobar los modelos mutables, las huellas de búsqueda, los comprobantes públicos y las exportaciones portables sigue requiriendo pasadas completas. No se introduce ningún debounce.

Reproducir sobre directorios temporales en el sistema de archivos del repositorio:

```sh
PYTHONPATH=. .venv/bin/python scripts/benchmark_track_metadata_patch.py \
  --sizes 200 1000 10000 --repeats 3
```

[Muestras en bruto](track-metadata-patch.jsonl), edición de título incluidas dos exportaciones locales, tres repeticiones por ruta en Linux:

| Pistas | Mediana con instantánea completa | Mediana con edición explícita |
| --- | ---: | ---: |
| 200 | 92,8 ms | 83,6 ms |
| 1.000 | 133,9 ms | 133,9 ms |
| 10.000 | 600,8 ms | 517,7 ms |

Estas muestras secuenciales cortas incluyen la variabilidad de los vaciados del sistema de archivos. No establecen una aceleración universal, una reducción de memoria ni una mejora audible. Las pruebas diferenciales comparan la salida canónica con el escritor completo establecido y cubren proyecciones/commits fallidos, comprobantes inválidos y un manager recién cargado.
