# Grabaciones de álbumes y audio propio

Un listado de álbum y un archivo descargado pueden describir la misma grabación
aunque lleven metadatos de edición distintos. Antes, una descarga de YouTube sin
álbum se excluía de las pistas que se poseen del álbum antes de tener en cuenta
su grabación. Al reproducir la fila del catálogo se podía entonces usar el audio
de ese mismo vídeo con la instantánea de edición de Deezer, y el registro
canónico del archivo propio quedaba vacío.

El endpoint del álbum ahora superpone las pistas que posee la cuenta en ese
momento mediante IDs de grabación portables o una resolución en caché de alta
confianza al vídeo de YouTube propio. El artista, el título completo de la
grabación y las duraciones conocidas, con una diferencia máxima de diez
segundos, deben corroborar la asociación. Si hay IDs en conflicto, candidatos
propios duplicados, versiones distintas o falta evidencia, se abstiene. Se
conserva el título completo de Deezer porque su título corto omite las
etiquetas de versión en directo.

GET solo describe la asociación y si se puede reparar un huérfano. Cuando hace
falta, el cliente compartido de la API de álbumes envía a continuación un POST
autenticado, con ámbito de escritura de biblioteca, a
`/api/catalog/album/reconcile`. El servidor vuelve a leer el listado autoritativo
del álbum, vuelve a comprobar la biblioteca actual bajo el bloqueo del ciclo de
vida y confirma juntas todas las reparaciones sin ambigüedad. El llamante no
puede proporcionar etiquetas de sustitución ni un ID de pista local. Los
clientes de solo lectura pueden seguir navegando si el POST está prohibido; los
fallos de almacenamiento y los conflictos siguen siendo errores.

Solo se completan las pistas sin álbum y sin ediciones manuales de metadatos.
El registro de la edición sustituye a la vez los valores por defecto de posición
y fecha de la subida; no mezcla una fecha de subida ni la pista 1 con el álbum
recién identificado. Se conserva el ISRC de la grabación cuando se proporciona.
Los bytes de audio, los hashes, la duración real, las fechas de adquisición, las
listas de reproducción, las canciones guardadas y las referencias de favoritos
se mantienen intactos. SQLite y su exportación portable derivada persisten la
reparación; las etiquetas incrustadas en el archivo no se reescriben. Un evento
`library_updated` actualiza los clientes conectados.

Se trata de una reconciliación con un álbum que abre el oyente, no de un
escaneo por red de toda la biblioteca ni de un permiso para mover un sencillo
existente a un álbum.

## Evidencia de reproducción

La pista de Robe notificada, "Contra Todos", no tenía álbum, tenía un archivo
local de 420.072 segundos, un año con forma de fecha de subida y número de
pista 1. Deezer la lista como pista 8, disco 1 de "Lo Que Aletea en Nuestras
Cabezas", con fecha de 2015, duración de 427 segundos e ISRC `ES71G1502918`. La
resolución de alta confianza existente para esa duración del catálogo ya
seleccionaba el vídeo propio `4Rh2Hzz24xc`. Las regresiones aisladas reproducen
ese caso sin modificar una biblioteca real.

"Por Ser un Pervertido" fallaba antes, durante la resolución en el catálogo: la
búsqueda ordinaria de vídeos de YouTube no devolvía filas para la consulta
completa de artista/título, y el motor local respondía `404 not_found`. La misma
consulta en YouTube Music devolvía la grabación de estudio. Ahora, solo cuando
la búsqueda principal de coincidencias no devuelve resultados, Soundsible prueba
la búsqueda de música y después extrae metadatos de un máximo de tres
coincidencias plausibles de artista/título para obtener sus duraciones reales
antes de la puntuación normal. Los errores de la fuente se propagan, y las
duraciones ausentes nunca se sustituyen por la duración esperada del catálogo.
Las búsquedas principales con resultados no suponen trabajo adicional.

Una investigación en vivo recuperó `8lbGTPi60TA`, de 344 segundos, para la
grabación esperada de 343 segundos en unos cuatro segundos, resolvió su stream
y leyó bytes de audio con HTTP 206 y `audio/mp4`. Las pruebas automatizadas usan
respuestas controladas del proveedor; no se garantiza que una subida pública
siga disponible.
