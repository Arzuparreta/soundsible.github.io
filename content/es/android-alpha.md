# Alpha de Soundsible para Android

Cliente Android para tu servidor Soundsible: biblioteca, búsqueda/adquisición,
playlists, podcasts, Radio/Autoplay, NORMAL, DJ con mezcla nativa, Live,
Android Auto y copias explícitas de música sin conexión.

## Instalar y actualizar / Instalar y actualizar

Descarga `Soundsible-Android-alpha.apk` de la release de la versión y comprueba
`SHA256SUMS-android.txt` (las alphas hasta la 0.21.1 lo llamaban `SHA256SUMS`). Android pide
autorizar la instalación desde el navegador o gestor de archivos. Instala sobre
una alpha anterior para conservar tu cuenta, ajustes y copias offline. No
desinstales para actualizar. Soundsible Dev es una app separada: sus datos no
se migran a la aplicación pública. Las actualizaciones son manuales.

Descarga `Soundsible-Android-alpha.apk` de la release de la versión y verifica
`SHA256SUMS-android.txt` (las alphas hasta la 0.21.1 lo llamaban `SHA256SUMS`). Permite la instalación
desde tu navegador o gestor de archivos cuando Android lo pida. Instala encima de una alpha
anterior para conservar tu cuenta, tus ajustes y tus copias sin conexión; no desinstales antes.
Soundsible Dev es una app separada; sus datos no se migran. Las actualizaciones son manuales.

`upgrade-seed-androidTest.apk` es evidencia auxiliar para las pruebas automáticas
de actualización; instala únicamente `Soundsible-Android-alpha.apk`.
`upgrade-seed-androidTest.apk` sirve para las pruebas automáticas de actualización; instala únicamente
`Soundsible-Android-alpha.apk`.

Conecta con la dirección de tu servidor y tu cuenta, o escanea el QR de
Ajustes → Dispositivos de una sesión existente. El QR inicia una sesión completa
de esa cuenta y puede revocarse desde Dispositivos. Para escuchar sin conexión,
elige «Disponible sin conexión» en el menú de música adquirida y comprueba que
las copias estén listas antes de desconectar. Cerrar sesión elimina esas copias.

Conéctate a tu servidor con su dirección y tu cuenta, o escanea el QR de emparejamiento
de Ajustes → Dispositivos en una sesión existente. El emparejamiento concede una sesión completa
de la cuenta, revocable desde Dispositivos. Prepara la música adquirida con «Disponible sin conexión»
en su menú y comprueba que las copias estén listas antes de desconectar. Cerrar sesión las elimina.

## Compatibilidad y límites / Compatibilidad y límites

Mínimo técnico: Android API 24 y WebView Chrome 120. La evidencia inicial es
en emulador API 36; versiones antiguas no se presentan como verificadas.
Se validan servicios, transporte, PCM, controles, reinicios y actualización.
Escucha física, Bluetooth y coches concretos siguen pendientes para beta.
Los fixtures no prueban todos los proveedores públicos. Se necesita un servidor
Soundsible; no hay un servidor embebido en el teléfono.

Mínimo técnico: Android API 24 y Chrome WebView 120. La evidencia automatizada
inicial usa API 36; las versiones anteriores no se han verificado. Se prueban servicios, transporte,
PCM, controles, reinicios del proceso y actualizaciones. La escucha física, el
Bluetooth y los coches concretos siguen siendo trabajo de aceptación para beta. Los fixtures no
validan todos los proveedores públicos. Se necesita un servidor Soundsible.

## Permisos / Permisos

Internet conecta al servidor y el estado de red permite detectar la conexión;
servicios multimedia y wake lock permiten audio
en segundo plano. Un servicio dataSync prepara las copias solicitadas. En Android
13+ se pide permiso de notificaciones al preparar la primera copia: denegarlo
no bloquea las copias. La cámara sólo se solicita para escanear el QR. Live emite
el programa nativo y no usa micrófono. No se solicitan permisos de archivos
generales: las copias se guardan en el espacio privado de la app.

Internet conecta con tu servidor; el acceso al estado de red detecta la conectividad.
Los servicios multimedia y el wake lock permiten el audio en segundo
plano; un servicio dataSync prepara las copias sin conexión solicitadas. El permiso de notificaciones
se solicita en la primera preparación en Android 13+; denegarlo no bloquea las
copias. El acceso a la cámara se solicita solo para el emparejamiento por QR. Live emite el programa
nativo sin acceso al micrófono. Las copias usan el almacenamiento privado de la app.

Para informar de un fallo, incluye versión/build/commit de `android-release.json`,
modelo, Android y WebView, pasos y si ocurre con red o sin ella. No incluyas
contraseñas, códigos QR, cookies ni música privada.

Para informar de un fallo, incluye la versión/build/commit de `android-release.json`, el dispositivo,
las versiones de Android y WebView, los pasos para reproducirlo y si ocurre con conexión o sin ella. No
incluyas contraseñas, códigos de emparejamiento, cookies ni música privada.


## Pruebas de la comunidad / Pruebas de la comunidad

La aceptación en dispositivos reales corresponde a la comunidad: el mantenedor
no dispone de un Android. Ayuda probando la alpha en tu teléfono y publicando
resultados, incluidos los correctos, en [GitHub Issues](https://github.com/Arzuparreta/soundsible/issues).
Estas pruebas reúnen la evidencia necesaria para beta. Marca como «No probado»
lo que no puedas comprobar; no necesitas disponer de coche ni de todos los accesorios.

La aceptación en dispositivos físicos procede de la comunidad: el mantenedor no
tiene un dispositivo Android. Prueba la alpha en tu teléfono y comunica los resultados, incluidas
las comprobaciones correctas, en [GitHub Issues](https://github.com/Arzuparreta/soundsible/issues).
Esto aporta evidencia de aceptación para beta. Marca como «No probado» las comprobaciones que no puedas hacer;
no se necesita un coche ni todos los accesorios para participar.

| Prueba / Prueba | Resultado esperado / Resultado esperado |
| --- | --- |
| Escucha NORMAL, DJ y Live / Escucha en NORMAL, DJ y Live | Audio y controles correctos, sin cortes inesperados; Live recibido audible / Audio y controles correctos, sin cortes inesperados; audio Live recibido audible |
| Emisión Live desde Android a un oyente remoto / Emisión Live desde Android a un oyente remoto | El oyente recibe audio NORMAL y DJ, incluidas transiciones; el volumen local del emisor no altera la emisión / El oyente oye el audio NORMAL y DJ, incluidas las transiciones; el volumen local del emisor no cambia la emisión |
| Pantalla apagada y otra app / Pantalla apagada y otra app | Continúa el programa y funcionan controles multimedia / El programa continúa y los controles multimedia funcionan |
| Llamada o interrupción de audio / Llamada o interrupción de audio | Pausa o reduce según el foco y recupera sin audio duplicado / Pausa o baja el volumen según el foco y se recupera sin audio duplicado |
| Auriculares y Bluetooth / Auriculares y Bluetooth | Controles correctos y desconexión sin reproducción inesperada por altavoz / Controles correctos y ninguna reproducción inesperada por el altavoz al desconectar |
| Wi-Fi, datos y pérdida de red / Wi-Fi, datos móviles y pérdida de red | Estado de error visible y recuperación; sin bloqueo / Estado de fallo visible y recuperación; sin bloqueos |
| Copias listas, modo avión y reinicio / Copias listas, modo avión y reinicio | Música preparada audible sin conexión después de reabrir / La música preparada se reproduce sin conexión tras reabrir |
| Android Auto, si está disponible / Android Auto, si está disponible | Biblioteca, selección, controles y metadata correctos; probar con el coche estacionado / Navegación, reproducción, controles y metadatos correctos; probar con el coche aparcado |
| Actualización cuando exista otra alpha / Actualización cuando haya otra alpha disponible | Instalar encima conserva cuenta, ajustes y copias / Instalar encima de la alpha anterior conserva la cuenta, los ajustes y las copias |

Copia los datos del dispositivo una vez y repite el bloque de prueba para cada
comprobación, incluidas las no probadas. Separa NORMAL, DJ, escucha Live y emisión Live, y los distintos
accesorios o redes si sus resultados difieren. Añade pasos reproducibles para fallos.
Copia los datos del dispositivo una vez y repite el bloque de comprobación para cada comprobación, incluidas
las no probadas. Informa por separado de NORMAL, DJ, escucha Live y emisión Live, y separa accesorios o
redes cuando los resultados difieran. Incluye pasos para reproducir los fallos.

```text
Build/commit (android-release.json):
Teléfono / Phone:
Android y WebView / Android and WebView:
Servidor Soundsible / Soundsible server build:
Auriculares/Bluetooth/coche usados / Headphones/Bluetooth/car used:

Repetir por prueba / Repeat for each check:
Prueba y modo / Check and mode:
Resultado / Result: OK | Fallo / Failed | No probado / Not tested
Pasos y duración / Steps and duration:
Esperado y observado / Expected and observed:
Red: Wi-Fi / datos / sin conexión — Network: Wi-Fi / mobile data / offline
```

No compartas credenciales, QR de sesión, cookies ni música privada.
No compartas credenciales, códigos QR de sesión, cookies ni música privada.
