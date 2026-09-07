# OpenSubsonic

Soundsible habla la **API OpenSubsonic** en `/rest`. Las aplicaciones creadas para ello (Symfonium, Feishin, Amperfy, DSub, Tempo, play:Sub y el resto) exploran y reproducen su biblioteca sin saber nada sobre Soundsible, que es también la forma en que el proyecto obtiene la reproducción móvil sin conexión, Android Auto y una aplicación de reloj sin escribir ninguna de ellas.

La superficie es servida por el mismo motor en el mismo puerto. No hay nada que habilitar: se puede acceder a una cuenta en el momento en que tiene una credencial y se detiene en el momento en que se revoca esa credencial.

## Conectar una aplicación

1. Abra **Configuración → Otros clientes** en el reproductor.
2. Pulsa **Generar una contraseña**. Se muestra una vez; cópielo ahora.
3. En su aplicación, agregue un servidor con la dirección y el nombre de usuario que se muestran en esa pantalla y la contraseña que acaba de copiar.

Si un cliente pregunta qué protocolo o versión, es Subsonic **1.16.1**.

## La contraseña

La contraseña en esa pantalla **no es la contraseña de su cuenta**. Existe solo para este protocolo, pertenece a una cuenta y revocarlo no afecta a nada más.

También es el único secreto en Soundsible que el servidor puede leer, y eso no es un descuido. El protocolo de enlace Subsonic envía `t = md5(password + salt)`; un servidor sólo puede comprobarlo calculando el mismo resumen, lo que significa conservar la contraseña. Cada contraseña de cuenta aquí es un hash pbkdf2 y nunca podría responder esa pregunta.

Por lo tanto, la credencial se almacena cifrada con una clave en el directorio de configuración (`subsonic.key`, modo 0600), separada de la base de datos que contiene el texto cifrado. Una copia de `instance.db` por sí sola no le proporciona a nadie acceso a la biblioteca. La pérdida del archivo de clave tampoco corrompe nada: las credenciales existentes simplemente dejan de verificarse y Configuración creará una nueva.

Se aceptan cuatro formas de autenticación y los clientes eligen la que prefieran:

| Forma                | Parámetros                                                  |
| ------------------------- | ----------------------------------------------------------- |
| Texto plano                     | `u`, `p`                                                    |
| codificado en hexadecimal | `u`, `p=enc:<hex>`                                          |
| Token con salt              | `u`, `t`, `s`                                               |
| clave API                 | `apiKey` (la extensión OpenSubsonic `apiKeyAuthentication`) |

No hay **ninguna excepción de autenticación para redes de confianza**. Algunas rutas de `/api/` permiten acceso desde la red doméstica; `/rest` nunca omite la autenticación por ese motivo. Detrás de Tailscale Funnel no se puede asumir una red de confianza, y esta API puede quedar expuesta a Internet.

## Funciones implementadas

**Sistema** · `ping` · `getLicense` · `getOpenSubsonicExtensions` · `getUser` · `getScanStatus` · `startScan`

**Navegando** · `getMusicFolders` · `getIndexes` · `getArtists` · `getArtist` · `getAlbum` · `getAlbumList` · `getAlbumList2` · `getSong` · `getGenres` · `getSongsByGenre` · `getRandomSongs` · `getStarred` · `getStarred2` · `getArtistInfo2` · `getAlbumInfo2`

**Buscar** · `search2` · `search3`

**Medios** · `stream` · `download` · `getCoverArt` · `getLyrics` · `getLyricsBySongId`

**Anotación** · `star` · `unstar` · `setRating` · `scrobble`

**Listas de reproducción** · `getPlaylists` · `getPlaylist` · `createPlaylist` · `updatePlaylist` · `deletePlaylist`

Extensiones anunciadas: `apiKeyAuthentication`, `formPost`, `songLyrics`, `transcodeOffset`.

Las respuestas regresan como XML (el valor predeterminado), JSON (`f=json`) o JSONP (`f=jsonp&callback=`), y tanto la forma simple como la variante `.view` de cada método funcionan. Los errores se devuelven con HTTP 200 y el propio código de error del protocolo dentro del documento, porque un cliente que ve un 4xx informa "servidor inalcanzable" en lugar de "contraseña incorrecta".

`startScan` inicia el mismo análisis asincrónico de carpetas configuradas que Configuración. `getScanStatus` lo informa como escaneo mientras está en cola o leyendo archivos y usa `count` para archivos procesados ​​durante la ejecución. Una vez inactivo, `count` vuelve al número de pistas en la biblioteca de la cuenta. Al iniciarlo de nuevo mientras hay un análisis activo, se une a la ejecución existente en lugar de iniciar otro trabajo que compita por el acceso al disco.

## Correspondencia con Soundsible

| Subsonic                            | Soundsible                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Artistas y álbumes                  | el catálogo normalizado en `library.db` (`artists`, `albums`, `track_artists`)          |
| `artists[]` en una canción          | artistas ordenados de `track_artists`, nunca una división de la cadena de visualización |
| Destacado                           | Los favoritos que el reproductor ya mantiene: una marca, no dos listas.                 |
| `userRating`, `playCount`, `played` | `track_user_state`                                                                      |
| `scrobble`                          | una reproducción registrada en esa misma tabla                                                |
| `replayGain`                        | las medidas EBU R128 que toma el motor para nivelar el volumen                          |
| Listas de reproducción              | las listas de reproducción ordenadas en el canónico `library.db` de la cuenta           |
| Arte de portada                     | La misma carátula que muestra el reproductor, arte incrustado extraído a pedido.        |
| `startScan`, `getScanStatus`        | escaneo de carpetas configuradas reales de la cuenta y progreso en vivo                 |

El `path` de una canción se construye a partir de sus metadatos (`Artist/Album/01 - Title.mp3`), no se lee del disco: el diseño del directorio del servidor no es asunto del cliente.

Los episodios de pódcast comparten la biblioteca canónica con las canciones, pero se excluyen de esta API. Un programa de pódcast no es un álbum.

## Transcodificación

`stream` acepta `format`, `maxBitRate`, `timeOffset` y `estimateContentLength`.

La mayoría de las solicitudes no se transcodifican y esa ruta es importante: el archivo recibe el mismo código que `/api/static/stream`, con rangos de bytes reales, respuestas `206` y desplazamiento por la pista funcional. Soundsible vuelve a codificar solo cuando la solicitud realmente lo requiere (un límite de velocidad de bits inferior al del archivo o un formato que el archivo no tiene) y nunca para `format=raw`.

Cuando lo hace, ffmpeg codifica en una tubería y los bytes se reenvían tal como aparecen. Esta respuesta no tiene longitud ni rangos de bytes, que es como funciona el protocolo: un cliente busca dentro de una transmisión transcodificada preguntando nuevamente con `timeOffset`, y eso es compatible. `estimateContentLength=true` devuelve una estimación para los clientes que desean una barra de progreso.

Dos límites que vale la pena conocer. El proceso de codificación se detiene en cuanto el oyente se desconecta, por lo que saltar pistas en una mala conexión no deja los procesos en ejecución. Y no se ejecutan más de dos codificaciones a la vez (`SOUNDSIBLE_SUBSONIC_MAX_TRANSCODES`); pasado eso, y siempre que ffmpeg no esté disponible, se entrega el archivo original en lugar de un error.

## Funciones no implementadas

Vídeo, máquina de discos, chat, recursos compartidos, marcadores, radio por Internet, administración de usuarios y podcasts a través de esta API. Soundsible tiene su propia superficie de podcast bajo `/api/podcasts`, y el resto está fuera de lo que necesita un servidor de música para un hogar. Las llamadas a ellos responden con el error genérico del protocolo en lugar de un HTML 404, por lo que un cliente informa que falta una característica en lugar de un servidor inactivo.
