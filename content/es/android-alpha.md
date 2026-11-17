# Alpha de Soundsible para Android

Cliente Android para tu servidor Soundsible: biblioteca, búsqueda/adquisición,
playlists, podcasts, Radio/Autoplay, NORMAL, DJ con mezcla nativa, Live,
Android Auto y copias explícitas de música sin conexión.

## Instalar y actualizar

Descarga `Soundsible-Android-alpha.apk` de la release de la versión y comprueba
`SHA256SUMS-android.txt` (las alphas hasta la 0.21.1 lo llamaban `SHA256SUMS`). Android pide
autorizar la instalación desde el navegador o gestor de archivos. Instala sobre
una alpha anterior para conservar tu cuenta, ajustes y copias offline. No
desinstales para actualizar. Soundsible Dev es una app separada: sus datos no
se migran a la aplicación pública. Las actualizaciones son manuales.

`upgrade-seed-androidTest.apk` es evidencia auxiliar para las pruebas automáticas
de actualización; instala únicamente `Soundsible-Android-alpha.apk`.

Conecta con la dirección de tu servidor y tu cuenta, o escanea el QR de
Ajustes → Dispositivos de una sesión existente. El QR inicia una sesión completa
de esa cuenta y puede revocarse desde Dispositivos. Para escuchar sin conexión,
elige «Disponible sin conexión» en el menú de música adquirida y comprueba que
las copias estén listas antes de desconectar. Cerrar sesión elimina esas copias.

## Compatibilidad y límites

Requiere Android 8 (API 26) o posterior y Android System WebView 120 o posterior.
Android 7 no puede instalar un WebView que cumpla este requisito y ya no es
compatible para la instalación. Un WebView desactualizado abre una pantalla de
actualización en lugar de intentar cargar el reproductor. Actualiza WebView (o
Chrome si es el proveedor seleccionado), y después cierra y vuelve a abrir
Soundsible. La evidencia inicial procede de un emulador API 36; no se presentan
otras versiones de Android como verificadas físicamente.
Se validan servicios, transporte, PCM, controles, reinicios y actualización.
Escucha física, Bluetooth y coches concretos siguen pendientes para beta.
Los fixtures no prueban todos los proveedores públicos. Se necesita un servidor
Soundsible; no hay un servidor embebido en el teléfono.

## Permisos

Internet conecta al servidor y el estado de red permite detectar la conexión;
servicios multimedia y wake lock permiten audio
en segundo plano. Un servicio dataSync prepara las copias solicitadas. En Android
13+ se pide permiso de notificaciones al preparar la primera copia: denegarlo
no bloquea las copias. La cámara sólo se solicita para escanear el QR. Live emite
el programa nativo y no usa micrófono. No se solicitan permisos de archivos
generales: las copias se guardan en el espacio privado de la app.

Para informar de un fallo, incluye versión/build/commit de `android-release.json`,
modelo, Android y WebView, pasos y si ocurre con red o sin ella. No incluyas
contraseñas, códigos QR, cookies ni música privada.


## Pruebas de la comunidad

La aceptación en dispositivos reales corresponde a la comunidad: el mantenedor
no dispone de un Android. Ayuda probando la alpha en tu teléfono y publicando
resultados, incluidos los correctos, en [GitHub Issues](https://github.com/Arzuparreta/soundsible/issues).
Estas pruebas reúnen la evidencia necesaria para beta. Marca como «No probado»
lo que no puedas comprobar; no necesitas disponer de coche ni de todos los accesorios.

| Prueba | Resultado esperado |
| --- | --- |
| Escucha NORMAL, DJ y Live | Audio y controles correctos, sin cortes inesperados; Live recibido audible |
| Emisión Live desde Android a un oyente remoto | El oyente recibe audio NORMAL y DJ, incluidas transiciones; el volumen local del emisor no altera la emisión |
| Pantalla apagada y otra app | Continúa el programa y funcionan controles multimedia |
| Llamada o interrupción de audio | Pausa o reduce según el foco y recupera sin audio duplicado |
| Auriculares y Bluetooth | Controles correctos y desconexión sin reproducción inesperada por altavoz |
| Wi-Fi, datos y pérdida de red | Estado de error visible y recuperación; sin bloqueo |
| Copias listas, modo avión y reinicio | Música preparada audible sin conexión después de reabrir |
| Android Auto, si está disponible | Biblioteca, selección, controles y metadatos correctos; probar con el coche estacionado |
| Actualización cuando exista otra alpha | Instalar encima conserva cuenta, ajustes y copias |

Copia los datos del dispositivo una vez y repite el bloque de prueba para cada
comprobación, incluidas las no probadas. Separa NORMAL, DJ, escucha Live y emisión Live, y los distintos
accesorios o redes si sus resultados difieren. Añade pasos reproducibles para fallos.

```text
Build/commit (android-release.json):
Phone:
Android and WebView:
Soundsible server build:
Headphones/Bluetooth/car used:

Repeat for each check:
Check and mode:
Result: OK | Failed | Not tested
Steps and duration:
Expected and observed:
Network: Wi-Fi / mobile data / offline
```

No compartas credenciales, QR de sesión, cookies ni música privada.
