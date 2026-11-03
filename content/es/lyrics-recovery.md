# Recuperación de letras

El reproductor mantiene abierta una búsqueda de letras durante un minuto como
máximo. Consulta periódicamente un trabajo activo del motor y, si ese trabajo
informa de que el proveedor no está disponible, inicia otro tras 2, 4 y luego
8 segundos, con hasta 250 ms de jitter. Las esperas posteriores se mantienen en
8 segundos. Los fallos temporales de transporte usan la misma ventana de
recuperación; los errores de autenticación, de permisos y de pista inexistente
se detienen inmediatamente.

La primera consulta pendiente conserva su retardo anterior de 750 ms. Las
consultas siguientes esperan 1,5 segundos, por debajo del límite de 60
peticiones/minuto del endpoint de metadata. Las letras listas, las pistas
instrumentales y las respuestas genuinas de no encontrado se devuelven de
inmediato. El temporizador de un minuto cubre conjuntamente peticiones, consultas
periódicas y backoff, y aborta una petición en curso cuando vence. Una caída
continuada muestra entonces el mensaje de no disponible existente y el botón de
reintento manual.

Cambiar de canción, cerrar el panel o sustituir la cuenta cancela el trabajo del
cliente. Los trabajos cortos existentes del motor, sus dos ranuras dedicadas de
búsqueda, las claves single-flight, la caché y la política de cero acumulación
no cambian. Sus ranuras quedan libres entre trabajos completados mientras el
cliente espera; la recuperación de un oyente no reserva una ranura durante todo
el minuto. El trabajo de servidor que ya está en ejecución conserva su margen
corto existente tras la cancelación del cliente.

Esta política está en `ui_web/src/lib/lyricsLookup.ts`, que usa el
`LyricsPanelView` compartido por la web, el shell de escritorio y la UI de
Android. No introduce ningún contrato de API, dependencia, cola, planificador ni
integración de proveedor nuevos.

## Por qué se amplió la recuperación

El reproductor anterior se detenía en la primera respuesta `unavailable`. El
motor ya reintentaba las respuestas 503/429 de LRCLIB dentro de su margen corto
de búsqueda, pero una sobrecarga prolongada podía rechazar todos los intentos de
ese trabajo. La corrección original fue
[PR #369](https://github.com/Arzuparreta/soundsible/pull/369); seguía sin
cambios cuando se midió esta mejora.

El mantenedor de LRCLIB describió sus respuestas 503 como
[rechazo global por sobrecarga](https://github.com/tranxuanthang/lrclib/issues/130#issuecomment-6522399481),
y por separado informó de una
[migración fallida y una base de datos dañada](https://github.com/tranxuanthang/lrclib/issues/138#issuecomment-6554255725).
Una recuperación más larga puede obtener letras cuando vuelve la capacidad; no
puede reparar el proveedor ni garantizar el éxito durante una caída sostenida.

## Mejora medida, 2026-11-02

[Los resultados registrados](measurements/lyrics-recovery-2026-11-02.json)
contienen diez canciones reales seleccionadas, solicitadas secuencialmente desde
una sola máquina y red. El resolver de producción se ejecutó detrás de rutas de
biblioteca Flask aisladas con directorios de runtime desechables, usando LRCLIB
en vivo. La versión final de `lookupLyrics` en TypeScript llamó a la ruta de
metadata sin persistir letras. No se usó ninguna base de datos de usuario ni
sesión de reproducción.

Cada búsqueda se observó en su **primer trabajo completado del motor**, donde el
reproductor antiguo se habría detenido, y después continuó con la recuperación
automática. Este método emparejado evita calentar una consulta en ejecuciones
separadas de antes/después:

- Cinco de los diez primeros trabajos completados devolvieron letras; cinco
  informaron de no disponible.
- La recuperación automática obtuvo letras para las diez canciones de esta muestra.
- Las cinco consultas recuperadas tardaron 11,1, 12,7, 14,2, 41,5 y 56,4 segundos
  en total. Dos se habrían perdido igualmente con una ventana de 30 segundos.
- Las respuestas durante la muestra final incluyeron respuestas explícitas
  `503 ServerOverloaded` de LRCLIB. El resolver en sí no cambió.

Estas observaciones demuestran la recuperación de fallos reales, no una
afirmación de disponibilidad del 100 % en otros casos. En una ejecución
exploratoria anterior, una canción siguió sin estar disponible durante todo el
minuto. Los resultados dependen del estado del proveedor.

## Verificación repetible

`npm test` cubre un trabajo del motor fallido de ocho segundos seguido de
recuperación, con latencias de API de 0, 300, 1.500 y 4.000 ms. También cubre
timeouts de transporte lentos, caídas continuadas, un motor completamente
ocupado, cancelación, respuestas tardías, errores permanentes, reintento manual
y la detención en el plazo compartido. Estas pruebas usan tiempo controlado en
lugar de depender de la conexión del desarrollador.

La suite completa de navegador se ejecuta en Chromium y WebKit, en móvil y
escritorio. Su prueba de letras abre el panel real y sirve
`unavailable → pending → ready` sin pulsar reintentar. Las fixtures de API se
limitan a URL de API para que no puedan interceptar el nuevo módulo fuente en el
servidor de desarrollo de Vite.

No se deduce de estas pruebas ninguna aceptación de velocidad de red física,
dispositivo Android ni iOS. El panel compartido web/Android está cubierto por la
suite de UI existente; el cliente iOS independiente en Swift queda fuera de este
cambio.
