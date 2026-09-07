# Integración del coche

Soundsible tiene tres capas orientadas al automóvil:

1. **Superficies del reproductor nativo del teléfono**: Bluetooth, USB, pantalla de bloqueo y pantallas multimedia del automóvil que reflejan el estado En reproducción del teléfono.
2. **Aplicaciones complementarias nativas**: iOS primero, Android después.
3. **Superficies de proyección oficiales**: CarPlay y Android Auto.

El reproductor web ahora posee la ruta rápida a través de la API de sesión multimedia del navegador. Esto mejora los metadatos y los controles para las superficies multimedia nativas del teléfono, pero no convierte a la PWA en una aplicación automática CarPlay o Android.

## Capa Web/Bluetooth actual

El reproductor web publica las URL absolutas del arte de la sesión multimedia, el estado de reproducción, el estado de posición y los controladores para:

- reproducir
- pausa
- siguiente
- anterior
- buscar hacia atrás/adelante
- buscar posicionarse

Esta es la mejor ruta disponible para las pantallas de bloqueo Safari/Chrome, controles Bluetooth, superficies de medios USB y vistas de "Reproducción en curso" nativas del automóvil que reflejan el teléfono. Todavía está mediado por el navegador, por lo que los automóviles individuales y las versiones del navegador pueden diferir.

## Contrato API

Los clientes de automóviles nativos deben comenzar con:

```text
GET /api/car/home
GET /api/car/items/<item_id>
```

Estos puntos finales requieren `library:read` o un token de propietario. En el modo de compatibilidad avanzada/sin cabeza, también se permiten clientes LAN/Tailscale de confianza.

Cada artículo devuelto utiliza esta forma estable:

```json
{
  "id": "track-or-collection-id",
  "kind": "track",
  "track_id": "optional-library-track-id",
  "title": "Title",
  "subtitle": "Artist - Album",
  "artist": "Artist",
  "album": "Album",
  "duration_sec": 180,
  "artwork_url": "/api/static/cover/<track_id>",
  "stream_url": "/api/static/stream/<track_id>",
  "is_browsable": false,
  "is_playable": true
}
```

Colecciones raíz:

- `recently-played`
- `favourites`
- `playlists`
- `podcasts`
- `radio`
- `all-tracks`

Los ID de las listas de reproducción están codificados como `playlist:<url-encoded-name>`.

## Compañero iOS: construido

El cliente iOS nativo vive en [`ios/`](../ios) y está documentado en [IOS.md](IOS.md). Hace lo que especifica este documento:

- Se empareja a través del flujo existente y mantiene el token del dispositivo emparejado en el llavero.
- Explora `/api/car/home` y `/api/car/items/<item_id>`.
- Reproduce desde `stream_url` hasta `AVPlayer`, con audio de fondo habilitado.
- Publica `MPNowPlayingInfoCenter` y maneja `MPRemoteCommandCenter`.
- Se registra como `device_type: "ios"` y publica el estado en `/api/playback/state`.

Dos cosas que el boceto original no decía, y ambas importan:

**`AVPlayer` no puede transportar un encabezado `Authorization`** a través de ninguna API pública. La aplicación enruta transmisiones autenticadas a través de un `AVAssetResourceLoaderDelegate` en un esquema personalizado, que reenvía rangos de bytes a `URLSession` donde los encabezados son normales. El `AVURLAssetHTTPHeaderFieldsKey` privado no se utiliza.

**Reproducir en curso no es una formalidad.** La barra de progreso de una unidad principal solo se mueve si `MPNowPlayingInfoPropertyElapsedPlaybackTime` y `MPNowPlayingInfoPropertyPlaybackRate` están publicados, y las unidades principales extraen sus botones desde los cuales se habilitan los `MPRemoteCommand`, por lo que los comandos que la cola no puede aceptar se desactivan en lugar de dejarse activados.

## Objetivo CarPlay

**Bloqueado, y no por nosotros.** El derecho `com.apple.developer.carplay-audio` se otorga solo a aplicaciones publicadas en la App Store, y Soundsible no irá allí: la directriz 5.2.3 prohíbe descargar medios desde YouTube, que es lo que hace Soundsible. En su lugar, la aplicación se distribuye mediante descarga (consulte [IOS.md](IOS.md)).

Esto cuesta menos de lo que parece. Una aplicación CarPlay agregaría **buscar en tu biblioteca en la pantalla del auto**. Todo lo demás que muestra un automóvil (título, artista, carátula, una barra de progreso que rastrea, botones de transporte en el volante y la pantalla Now Playing de Soundsible dentro del propio CarPlay) proviene de `MPNowPlayingInfoCenter` y `MPRemoteCommandCenter`, no necesita ningún derecho y ya funciona.

Si Soundsible alguna vez se envía a través de **AltStore PAL** (mercados de la UE, 99 €/año, la certificación notarial verifica la seguridad en lugar del contenido) todavía no es la App Store, por lo que el derecho permanece fuera de su alcance. El siguiente árbol es lo que representaría un objetivo CarPlay si eso alguna vez cambia:

- Inicio
- Favoritos
- Listas de reproducción
- Jugado recientemente
- Pódcasts
- Semillas de radio

Evite la interfaz de usuario enriquecida o de formato libre en la pantalla del automóvil. La búsqueda y el descubrimiento complejo deben permanecer en el teléfono o en el escritorio a menos que las plantillas oficiales CarPlay permitan la interacción de forma segura.

## Objetivo Android

La aplicación Android posterior debería exponer el mismo árbol `/api/car/*` a través de Media3 `MediaLibraryService` y `MediaSession`. Los sistemas operativos Android Auto y Android Automotive pueden luego representar la interfaz de usuario de navegación/reproducción desde la sesión multimedia nativa Android.
