# Hoja de ruta

Hacia dónde se dirige Soundsible y por qué. Este es el plan orientado al usuario; Los documentos bajo "internos" son notas de trabajo y pueden estar obsoletos o abandonados.

Nada aquí tiene fecha. Las mejoras se publican cuando están listas, aproximadamente en el orden siguiente, porque cada uno depende del anterior.

## ¿Qué es Soundsible?

La mayoría de las herramientas de música autoalojadas resolvieron *servir* música y nunca *obtenerla*. Navidrome es excelente para reproducir una biblioteca que ya tienes. Lidarr recupera álbumes completos. Entre "escuché esta canción" y "está en mi biblioteca, etiquetada, en todos los dispositivos" hay una brecha que la gente todavía cruza con varias herramientas.

Soundsible cierra esa brecha:

> **descubrir → adquirir la pista → guardarla etiquetada en tu biblioteca → escucharla donde quieras.**

La búsqueda consulta tu biblioteca, Deezer, MusicBrainz y YouTube a la vez y devuelve una lista clasificada. Al guardar una canción, Soundsible busca la fuente, evalúa la coincidencia, descarga el audio, lo etiqueta y lo añade a la biblioteca. [Auto Mode](AUTO_MODE.md) luego lo reproduce como un set de DJ editable y basado en análisis en lugar de una cola aleatoria.

## Hacia dónde va

### Atender a cualquier cliente, no sólo al nuestro

Soundsible tiene su propio reproductor responsivo, versión beta de escritorio y cliente iOS nativo. También habla la **API OpenSubsonic**, por lo que Symfonium, Feishin, DSub, Amperfy, Tempo, play:Sub y el resto pueden usar la misma biblioteca, incluidas sus funciones sin conexión, Android Auto, CarPlay y relojes cuando sean compatibles.

Eso necesita primero un esquema de biblioteca real: tablas de álbumes y artistas de primera clase, números de discos, compilaciones, múltiples artistas por pista, conteos de reproducciones, calificaciones y última reproducción. Y SQLite como fuente de verdad en lugar de un índice reconstruido a partir de JSON.

- [x] Esquema de biblioteca: álbumes, artistas, números de discos, compilaciones, recuentos de reproducciones, clasificaciones.
- [x] SQLite canónico; `library.json` se convierte en un formato de exportación
- [x] `POST /api/library/scan`: apunte Soundsible a una carpeta que ya tenga
- [ ] Leer etiquetas ReplayGain/R128 cuando un archivo las lleva
- [x] Escriba los ID de MusicBrainz en la adquisición
- [x] Decida la orientación del artista/título mediante la búsqueda, no por la posición. Un título YouTube se divide en el primer separador y el lado izquierdo se toma como el artista, sin verificar. Por lo tanto, las cargas tituladas "Canción - Artista" se invierten, lo que archiva la pista con el nombre incorrecto y hace que no se pueda encontrar. Los proveedores que podrían solucionarlo (Deezer, MusicBrainz) ya están conectados para la búsqueda, y `shared/resolution_confidence.py` ya puntúa una pareja de artista y título.
- [x] API OpenSubsonic con transcodificación sobre la marcha: consulte [OpenSubsonic](OPENSUBSONIC.md)
- [x] Navegación por álbum, género y año en el reproductor.

### Conectar con el ecosistema musical abierto

- [ ] Scrobbling a ListenBrainz, Last.fm y Maloja
- [ ] ListenBrainz como entrada de recomendación junto con señales locales
- [ ] Biografías de artistas e imágenes de MusicBrainz / Wikidata
- [ ] Listas de reproducción inteligentes sobre recuentos de reproducciones, clasificaciones, año, género y BPM
- [ ] Importación/exportación de M3U y OPML

### Hacer que la adquisición sea duradera

El catálogo depende de que yt-dlp funcione con YouTube, y YouTube cambia.

- [ ] yt-dlp se actualiza solo en el contenedor
- [ ] Una comprobación periódica de CI que avise cuando falle la extracción
- [ ] Una capa de origen conectable, por lo que YouTube es un proveedor y no una suposición.

### Perfeccionar las funciones distintivas

- [x] Auto Mode documentado como el flujo de trabajo de DJ editable y de dos decks del producto.
- [ ] Auto Mode fuera de beta
- [ ] Live se convierte en una opción explícita, con el autoalojamiento del relé documentado
- [ ] Relays federados de Live

## Deliberadamente no planeado

- **Video.** Soundsible es un servidor de música. Utilice Jellyfin.
- **Navegación por estructura de carpetas.** Los metadatos son el principio organizativo.
- **Ser un descargador de uso general.** La adquisición sirve a la biblioteca.
- **Un servicio alojado.** Tú lo ejecutas. Ese es el punto.

## Publicado

Consulte los [lanzamientos](https://github.com/Arzuparreta/soundsible/releases) y el historial de commits.

## Internos

Notas de trabajo, no compromisos. Pueden quedar obsoletas y no se mantienen como documentación para usuarios: [Contratos de capa](LAYER_CONTRACTS.md) · [Contrato de calidad premium](PREMIUM_QUALITY_CONTRACT.md) · [Plan de retrabajo del dispositivo](appliance-rework-plan.md) · [Plan de reconstrucción de UI](UI_REBUILD_PLAN.md).
