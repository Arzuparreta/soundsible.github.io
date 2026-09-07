# Pasar de Spotify o Apple Music a Soundsible

Soundsible importa los archivos de exportación de tu cuenta. No requiere una suscripción de pago a un servicio de streaming ni que quien administra la estación mantenga claves de API de terceros.

No necesitas saber qué tipo de archivo genera cada servicio. Abre **Trae tu música** en Soundsible, elige Spotify o Apple Music y sigue las instrucciones. Conserva el archivo tal como te lo entrega el servicio: Soundsible se encarga de abrirlo.

El archivo se sube únicamente a tu propia estación Soundsible. Soundsible no envía el archivo, su contenido ni estadísticas de migración a un servicio alojado de Soundsible o a terceros.

## Spotify

1. En Soundsible, elige **Spotify** y abre el enlace a su página de privacidad.
2. En **Descargar tus datos**, solicita **Datos de la cuenta**. No hace falta el historial ampliado de reproducción y basta con una cuenta gratuita.
3. Spotify te enviará un correo cuando la descarga esté lista. Descarga el archivo sin abrirlo ni extraerlo.
4. Vuelve a Soundsible y pulsa **Elige el archivo que te envió Spotify**.

Soundsible recuerda localmente que estás esperando. Al volver a la página de migración desde el mismo navegador, te llevará directamente al último paso.

## Apple Music

Apple permite exportar la biblioteca completa desde sus aplicaciones de escritorio:

- **Mac:** abre Música y selecciona **Archivo → Biblioteca → Exportar biblioteca**. Apple explica el proceso en [Guardar una copia de una lista de reproducción en Música en el Mac](https://support.apple.com/guide/music/save-a-copy-of-a-playlist-mus27cd5060f/mac).
- **Windows:** abre la biblioteca correspondiente en iTunes y selecciona **Archivo → Biblioteca → Exportar biblioteca**. Apple explica el proceso en [Guardar una copia de las listas de reproducción en iTunes en el PC](https://support.apple.com/guide/itunes/save-a-copy-of-your-playlists-itns2998/windows). Actualmente, Apple no documenta una exportación equivalente de la biblioteca completa en la aplicación más reciente de Apple Music para Windows.
- **Móvil o tableta:** continúa en un Mac o PC. La aplicación móvil de Apple Music no permite la exportación completa que necesita Soundsible. La guía te permite copiar la dirección de tu estación para abrirla fácilmente en ese ordenador.

Una vez guardada la exportación, vuelve a Soundsible y pulsa **Elige el archivo de Apple Music**. No lo abras ni lo modifiques antes.

## Compatibilidad técnica

- Archivos ZIP de datos de la cuenta de Spotify y archivos `Playlist*.json`. Spotify documenta que el paquete contiene los nombres de las listas y sus canciones, artistas, álbumes, pistas locales y canciones guardadas: <https://support.spotify.com/article/understanding-your-data/>.
- Archivos XML de bibliotecas o listas de Apple Music, además de las variantes de texto/CSV exportadas por Música. En macOS, utiliza **Archivo → Biblioteca → Exportar biblioteca** para obtener el XML completo o **Exportar lista de reproducción** para XML/texto: <https://support.apple.com/guide/music/save-a-copy-of-a-playlist-mus27cd5060f/mac>.

El importador omite intencionadamente el historial de reproducción, los pódcast, las películas y los vídeos musicales. Una exportación contiene metadatos, no el audio de los servicios de streaming.

## Cómo funciona la importación

1. Subir una exportación crea un trabajo de análisis persistente, asociado al usuario.
2. Soundsible busca coincidencias primero en la biblioteca del usuario, mediante índices acotados, y después en el conjunto de pistas compartido de la estación.
3. El usuario selecciona la biblioteca guardada y las listas individuales. Las pistas duplicadas del archivo de origen se procesan una sola vez.
4. Las pistas existentes se reutilizan. Las que faltan se buscan mediante el proceso habitual de catálogo/YouTube. Solo se descargan automáticamente las coincidencias de alta confianza; las dudosas se detienen para su revisión.
5. Se conservan los nombres de las listas y el orden original. Si un nombre ya existe, se añade un sufijo del proveedor en lugar de sobrescribir la lista existente.
6. Las canciones favoritas de Spotify y las entradas `Loved` de Apple se convierten en favoritos de Soundsible. Importar una biblioteca normal de Apple no marca todas sus canciones como favoritas.

Los trabajos sobreviven a las recargas de página y a los reinicios del proceso. Una descarga en curso termina antes de aplicar una pausa o cancelación; después, el trabajo se detiene antes de la siguiente pista. Las descargas fallidas se pueden reintentar. Subir otra vez la misma exportación reabre el trabajo existente sin duplicarlo.

## Por qué se usan exportaciones de cuenta

Desde julio de 2026, el modo de desarrollo de Spotify exige que el propietario de la aplicación tenga Premium y limita las aplicaciones nuevas a cinco usuarios: <https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide>.
Las peticiones a la biblioteca de un usuario de Apple Music requieren autorización de MusicKit y configuración de tokens del servicio: <https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit>.

Más adelante se puede añadir un conector directo para las instalaciones que cumplan estos requisitos. Debería ser un acceso opcional al mismo motor de trabajos de migración, no un requisito para trasladar una biblioteca.
