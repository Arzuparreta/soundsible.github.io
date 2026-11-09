# Evidencias automáticas de reproducción en iPhone / coche

Estado: propuesta de corrección de la salida en iOS y de la retirada de fuentes, **no es una corrección verificada en un dispositivo**. La recogida sigue siendo automática. Ni un `play()` correcto ni `playbackState=playing`
demuestran qué muestran Now Playing, CarPlay o el equipo multimedia del coche, ni que el sonido llegue
a los altavoces. Sigue siendo necesaria la aceptación en el dispositivo.

## 6 de noviembre: las canciones en escritorio empiezan aceleradas, después sufren cortes y se estabilizan

El oyente informa de que, en un cliente de escritorio recién abierto y en modo normal, una canción
("Free Your Mind") empieza a una velocidad incorrecta, vuelve a la normalidad poco después
y a veces sufre cortes y chasquidos. La captura `209dfe5a` (dispositivo `ac870b49`,
Chromium, modo de salida `carrier`) muestra que todos los elementos tienen `playbackRate` a 1 y
que el reloj del contexto, la posición de la fuente y la posición de la portadora avanzan
a 1,000 respecto al tiempo del cliente. Nada de lo que puede leer la página cambió de velocidad.

El cambio se produjo después de la página: la portadora es un MediaStream reproducido por un
elemento `<audio>`, una segunda salida con su propio reloj, y el navegador corrige
la deriva entre ambos mediante remuestreo. La medición en este equipo (Chromium,
salida nula de PipeWire a 48 kHz, grabada desde su monitor), siguiendo el orden de la aplicación —
contexto en ejecución durante 7 s con la portadora conectada pero en pausa, y después reproducción de la portadora y
la fuente —, mostró que un tono de 1000 Hz salía a 1007,27 Hz (+0,73 %) durante unos seis
segundos, seguido de 30 ms de silencio y después de 998,4 Hz, aún variando. El mismo tono
a través del destino del contexto salió a 1000,00 Hz durante toda la grabación,
sin cortes. Es el mismo mecanismo que las evidencias del iPhone del 9 de septiembre, más abajo,
atribuyen al conversor de WebKit.

Corrección: se elimina la portadora en todas las plataformas. La mezcla se conecta al
destino de AudioContext, como hace iOS desde #166; la toma de Live no cambia.
También se eliminan el modo `direct_fallback`, el reintento de la portadora mediante gestos y la
telemetría `ui_program_output`. El servidor sigue aceptando y mostrando los campos antiguos
para que los clientes antiguos que siguen abiertos y el historial continúen funcionando.

## 29 de septiembre: saltos en pódcasts en la PWA de iPhone

El oyente informa de que los toques de +/-15 segundos vuelven a reproducir brevemente o repiten en bucle el
búfer de audio anterior antes de que se oiga la posición solicitada; en la PWA de escritorio, los saltos
parecen inmediatos. La duración aproximada de 100 ms es una estimación de escucha, no una traza.
La ruta de salto de posición inspeccionada asignaba `currentTime` sin bloquear la salida del programa.
El [fallo 288879 de WebKit](https://bugs.webkit.org/show_bug.cgi?id=288879) documenta un
síntoma similar de búfer antiguo a través de MediaElementAudioSourceNode y se corrigió
en el proyecto original en marzo de 2025. Es un precedente, no una prueba de la causa en este dispositivo.

El cambio propuesto bloquea la salida del plato seleccionado antes de asignar `currentTime`
y después restaura su ganancia existente solo tras `seeked`, `seeking=false` y
`readyState >= HAVE_FUTURE_DATA`. Mantiene en ejecución la reproducción de la fuente y el contexto;
no hay una espera fija, recarga de recursos, suspensión y reanudación ni un `play()` diferido.
El bloqueo se aplica mediante la ganancia de mezcla existente (incluido Live) y mediante
el silencio nativo cuando no hay un grafo disponible. La sustitución o liberación de la fuente, los errores multimedia
y los saltos sin efecto lo eliminan. Una pausa del usuario se mantiene al finalizar.

Las pruebas unitarias cubren el orden de disponibilidad y eventos, los toques repetidos, los cambios de silencio y volumen,
la sustitución de la fuente, los saltos sin efecto y la prioridad de la pausa. La prueba de navegador de pódcasts
también salta durante la reproducción y comprueba que el reloj multimedia continúa, además de
los casos existentes de saltos en pausa y progreso guardado. Su WAV sin sonido no puede demostrar
que las muestras antiguas ya decodificadas estén ausentes de la salida física del iPhone. En concreto,
un búfer de WebKit retenido *después* de sus declaraciones de disponibilidad podría persistir más allá de este
bloqueo; no se debe dar por resuelto el síntoma acústico sin una validación de escucha.

En la PWA del iPhone afectado, repite los toques de avance y retroceso y los toques consecutivos durante
la reproducción, tanto dentro del audio almacenado en el búfer como hacia una posición aún no almacenada. Lo esperado es
silencio durante el salto en lugar de audio antiguo repetido, seguido de la posición
solicitada. Comprueba un salto en pausa, una pausa mientras se llena el búfer, un cambio de episodio durante un
salto y la salida real de altavoces, auriculares o Bluetooth utilizada en el caso notificado.

## 19 de septiembre: regresión al bloquear y correcciones de reconexión rechazadas

El oyente informa de que usa la PWA de Safari en el mismo iPhone con CarPlay por cable. Entre
las 11:00 y las 12:20 de Europe/Madrid del 19 de septiembre, bloquear el teléfono detenía el sonido de inmediato;
Reproducir no lo restablecía de forma fiable. Desconectarlo mientras estaba bloqueado aún podía hacer
que la música se reanudara al desbloquearlo fuera del coche. Al reconectarlo, la
reproducción aún podía avanzar sin sonido. Por ello, el oyente rechaza tanto #197 como
#210 como correcciones verificadas de los problemas de desconexión y reconexión.

Las siete capturas recibidas contienen 3.316 eventos, sin huecos en la secuencia ni pérdidas
notificadas. Hay 19 cambios de estado del contexto seguidos inmediatamente de una pausa del programa,
y 14 fallos de recuperación `needs_play`. A las 11:19:30, 11:19:37 y 12:05:38, un evento de contexto
`interrupted` hace que la aplicación pause antes de que la visibilidad pase a oculta,
sin una pausa previa de Media Session en esas secuencias. A las 11:51 y las 11:58,
los intentos de Reproducir agotan el tiempo de espera mientras el contexto sigue interrumpido. Estas observaciones
demuestran el comportamiento de la aplicación, no la ruta física ni la salida acústica.

Las capturas identifican la huella del cliente
`57eddd9e99a012d76773eeebf72c3bf04691ea32b6bc97681137f50a2f85ac47`.
Difiere del árbol de código fuente actual inspeccionado; no se ha vinculado a una
revisión exacta de git. La regla de pausa inmediata al interrumpirse el contexto y la renovación obligatoria de Reproducir
en iOS están presentes en el código fusionado de #210. No se debe identificar el cliente capturado como
una copia exacta y demostrada de ese commit.

### Corrección propuesta, pendiente de aceptación en un dispositivo físico

Una interrupción solo del contexto ya no revoca la intención de reproducción. El bloqueo puede
interrumpir Web Audio antes de que cambie la visibilidad, así que esta no se usa para
clasificarlo como una desconexión del cable. Si se sigue solicitando la reproducción, los cambios de estado
del contexto y la restauración de la página solicitan `resume()` sin pausar ni reiniciar
la fuente. Las solicitudes se agrupan, notifican su resultado y agotan el tiempo de espera tras cinco
segundos en los que JavaScript puede ejecutarse; un tiempo de espera agotado no programa otro intento.
Un evento posterior o una orden explícita de Reproducir pueden volver a intentarlo. Un inicio de fuente pendiente inicialmente no
se confunde con una pausa nativa durante la restauración de la página.

Las pausas explícitas de la interfaz y de Media Session, así como las pausas nativas de los elementos participantes, siguen revocando
la intención. Los gestos genéricos y el regreso a la página no pueden levantar esa pausa. Las pausas nativas
se registran con origen `platform`; los fallos de recuperación del reloj usan `recovery`, no
una orden inventada de la interfaz o de Media Session. Son orígenes internos adicionales de las órdenes de reproducción
que usan la estructura de telemetría y la lista de campos permitidos existentes.

Reproducir solicita la activación del contexto y de la fuente en el mismo turno de ejecución, sin un
ciclo incondicional de suspensión y reanudación ni esperar primero al reloj del contexto.
Cuando es compatible, el reproductor solicita `navigator.audioSession.type = 'playback'`
antes de la activación. Se tolera que Audio Session no esté disponible o que rechace la solicitud.
Es una indicación explícita de sesión musical descrita en el
[borrador de Audio Session](https://www.w3.org/TR/audio-session/), no una prueba acústica.

La recuperación existente de un solo intento mediante suspensión y reanudación se conserva únicamente para el fallo medido
de reloj bloqueado: la fuente avanza mientras el reloj del contexto en ejecución
permanece inmóvil durante observaciones continuas. Los huecos en las observaciones, los cambios de fuente y
los saltos reinician la medición. Conserva el grafo y la toma de Live; se mantienen la cancelación
y su límite de cinco segundos. El silencio musical no la activa.
No hay un detector automático de pérdida de la ruta cuando ambos relojes avanzan;
`healthy` solo describe las comprobaciones internas, nunca la confirmación de sonido en el coche.

### Aceptación

Los casos automatizados cubren el orden de los eventos de bloqueo, los bloqueos y desbloqueos repetidos, la restauración
mientras Reproducir está pendiente, la prioridad de la pausa explícita, la finalización tardía de la reanudación,
la agrupación y los tiempos de espera, la compatibilidad opcional con Audio Session, la identidad de la fuente, Live,
y los casos existentes de recuperación del reloj bloqueado y control de DJ.

En el iPhone/PWA afectado con CarPlay por cable, repite para NORMAL y DJ:

1. Reproduce durante al menos diez minutos con el teléfono bloqueado, incluidos cambios de canción
   automáticos y manuales. Bloquea y desbloquea repetidamente. El sonido debe continuar sin volver a pulsar Reproducir.
2. Desconecta mientras se reproduce y el teléfono está bloqueado; desbloquéalo fuera del coche. Registra si
   el sonido se reanuda de forma inesperada. Las pausas explícitas deben seguir respetándose.
3. Vuelve a conectar y pulsa Reproducir desde el coche y, por separado, desde el teléfono. El sonido
   debe volver a salir por el coche sin recargar la página, en la posición conservada de la
   canción. Repite con el equipo del coche encendido y apagado y con distintos órdenes de desconexión.
4. Pausa o cambia de canción durante una recuperación pendiente y durante una transición de DJ.
   Las operaciones antiguas no deben reactivar la canción anterior; el volumen y Live deben conservarse.

La continuidad con el teléfono bloqueado y la reconexión audible requieren aceptación en el dispositivo. Una
reanudación espontánea que persista al desconectar es un problema aparte y de menor prioridad: no se deben
restaurar reglas generales de pausa ante cambios del contexto para suprimirla. Las pruebas de navegador no pueden
identificar una desconexión física ni demostrar la salida por los altavoces.

## Evidencias e hipótesis

El trayecto del 9 de septiembre confirmado por el oyente (21:14–21:20 Europe/Madrid)
tiene 548 eventos recibidos, sin huecos internos en la secuencia ni pérdidas notificadas. Todas
las velocidades de reproducción registradas son uno. A las 21:17:34, pausar la fuente saliente cambia
la declaración observada de Media Session de reproducción a pausa; la fuente entrante
y la portadora siguen reproduciéndose. La aplicación vuelve a publicar el estado de reproducción unos
41 ms después. Esto mide las observaciones del navegador, no el retraso del equipo del coche.

Durante 33 intervalos estables en primer plano, la mediana de la relación entre el reloj del contexto y el tiempo real es
0,996618, mientras que las posiciones de la fuente y de la portadora avanzan aproximadamente un
segundo por segundo. Otras dos sesiones de iPhone y las sesiones de escritorio tienen medianas
cercanas a uno. El oyente informa de un sonido normal fuera del coche; el navegador no
identifica la ruta física de salida.

El [AudioSampleDataConverter](https://github.com/WebKit/WebKit/blob/ca3a9f205bcecd15c9d2ed0680acc25b56785109/Source/WebCore/platform/audio/cocoa/AudioSampleDataConverter.mm) de WebKit
compensa un búfer con poco contenido mediante un remuestreo de salida de 1,05, que se activa a los 20 ms y se desactiva
por encima de 60 ms. Con la relación de relojes observada, un modelo simplificado del búfer predice
11,8 segundos de reproducción normal y 0,86 segundos de corrección. Esto se aproxima mucho
a la ralentización y bajada de tono periódicas notificadas, pero no demuestra la
compilación exacta de WebKit ni la actividad del conversor en el teléfono.

La propuesta elimina la portadora MediaStream de la salida del dispositivo en iOS/iPadOS:
el monitor de la mezcla se conecta directamente al destino de AudioContext. El
modo notificado es `direct`, distinto de `direct_fallback`, que corresponde a un fallo de la portadora.
Los gestos no pueden devolver a la portadora una salida directa intencionada. La toma de transmisión
de Live sigue siendo independiente y anterior al volumen y al silencio locales. Las demás
plataformas conservaron su ruta mediante la portadora hasta el 6 de noviembre (véase más arriba).

La habilitación de las fuentes se controla de forma independiente a la ganancia: los platos vacíos, preparados y retirados
permanecen silenciados; el plato entrante deja de estar silenciado antes de reproducirse, incluida la
reproducción previa con ganancia cero. Ambas fuentes participan durante una mezcla. La retirada silencia antes de
pausar, mientras que la fuente canónica en pausa sigue habilitada para reanudarse. Los cambios de
volumen y la finalización de una muestra de desbloqueo antigua no pueden quitar el silencio a una fuente inactiva.
Las operaciones de fuente finalizadas y los eventos nativos inactivos activan una publicación agrupada
del estado canónico en una microtarea, también en segundo plano. Esto
no emite órdenes de reproducción ni se atribuye el control del elemento seleccionado por iOS.

La aceptación en un dispositivo físico requiere comparar las mismas canciones en el mismo iPhone y coche: al menos
cinco minutos de reproducción estable sin bajadas de tono periódicas, varias transiciones automáticas
y manuales en primer plano y con la pantalla bloqueada, pausa y reproducción desde el coche,
y título y estado correctos sin desbloquear. Compara la versión de referencia y la propuesta;
no equipares una mejora en la relación de relojes o unas pruebas correctas con la aceptación auditiva.

### Evidencias anteriores

La franja del trayecto del 8 de septiembre (21:30–23:00 Europe/Madrid) contiene 325 registros de
telemetría del servidor, incluidos 14 relevos completados de la PWA. Todas las proyecciones de relevo
declaran el estado de reproducción con la fuente y la portadora activas. A las 22:27:27 se rechazó la reproducción
de una fuente inactiva; a las 22:30:45 se completó un relevo, seguido de una pausa y
reanudación desde la aplicación a las 22:30:48–49. Son horas de recepción en el servidor, no de ejecución en el cliente.
El origen `media_session` del evento de reproducción de un elemento inactivo lo infiere el código
existente; no demuestra que hubiera una orden remota.

Antes de esta corrección, la fuente que se retiraba se pausaba, pero se dejaba sin silenciar;
las operaciones de precarga y volumen también dejaban sin silenciar los elementos inactivos. WebKit puede seleccionar uno de estos
elementos para los controles de la plataforma aunque la portadora mezclada siga reproduciéndose.
Su comparador de candidatos tiene en cuenta lo reciente que es la interacción del usuario; no siempre
prefiere el elemento que está reproduciéndose. Por ello, los metadatos y el estado de reproducción del elemento seleccionado
pueden discrepar. Esta es una hipótesis sobre este incidente, no una prueba
de que la revisión de WebKit inspeccionada coincida con la del teléfono afectado.

Referencias del código fuente fijadas al commit de WebKit inspeccionado:

- [Selección de candidatos](https://github.com/WebKit/WebKit/blob/ca3a9f205bcecd15c9d2ed0680acc25b56785109/Source/WebCore/html/HTMLMediaElement.cpp)
- [Habilitación de elementos y estado de Now Playing](https://github.com/WebKit/WebKit/blob/ca3a9f205bcecd15c9d2ed0680acc25b56785109/Source/WebCore/html/MediaElementSession.cpp)
- [Proyección de metadatos](https://github.com/WebKit/WebKit/blob/ca3a9f205bcecd15c9d2ed0680acc25b56785109/Source/WebCore/Modules/mediasession/MediaSession.cpp)

## Procedimiento del oyente

Reproduce música normalmente. No hace falta configurar nada, seleccionar experimentos, añadir marcas, exportar ni
conectar un ordenador. La recogida comienza después de la autenticación, cuando se
carga el reproductor. El servidor en ejecución debe contener el endpoint de trazas y el reproductor
debe haber cargado este código fuente; una página antigua que ya esté abierta no puede instrumentarse
retroactivamente. Una apertura normal posterior carga el reproductor actual.

## Recogida y envío automáticos

- Cada sesión de página tiene un ID de captura aleatorio, una huella del código fuente, el ID
  de dispositivo existente, la hora de inicio del cliente y una secuencia estrictamente creciente con milisegundos
  transcurridos monotónicos. La versión de iOS se infiere del agente de usuario y se marca explícitamente
  como declarada, no como una compilación exacta y verificada del sistema operativo. El tipo de conexión y la
  pantalla del coche no están expuestos a la aplicación web y no se inventan.
- Los registros cubren eventos multimedia nativos de la fuente y la portadora, cambios de fuente, resultados de
  las promesas de reproducción, llamadas de pausa y carga, estado del contexto, desbloqueo por gestos, origen de las órdenes de reproducción,
  retirada y Media Session antes y después de la publicación. Las instantáneas incluyen todos
  los elementos observados, silencio, pausa, disponibilidad y posición, categoría de fuente, estado de la mezcla,
  objetivos de ganancia y volumen local. No incluyen URL multimedia, nombres, carátulas ni audio.
- Las actualizaciones de tiempo normales se muestrean cada cinco segundos por elemento; durante los diez
  segundos alrededor de un relevo se muestrean hasta cuatro veces por segundo. Los eventos nativos
  de pausa, reproducción, carga y error no se descartan mediante muestreo. iOS puede suspender la ejecución
  en segundo plano; el registro no da por hecho que un temporizador se ejecute siempre.
- Los eventos se agrupan en lotes y se guardan en IndexedDB en un segundo como máximo (o cuando se
  llena un lote), se envían cada cinco segundos y ante eventos del ciclo de vida o de conexión. Las solicitudes
  usan keepalive y cuerpos de tamaño limitado. Un lote sin confirmación sobrevive a las recargas y
  se reintenta con esperas crecientes. El orden de entrega puede diferir del orden de ejecución; el
  informe usa el ID de captura y la secuencia, no la hora de recepción.
- El servidor guarda cada lote en una base de datos SQLite propia de la cuenta antes de
  confirmar su recepción. Los ID de lote evitan duplicados en los reintentos. Se rechaza una cuenta autenticada
  que no coincida. Las bandejas de salida del navegador también están separadas por cuenta.
- El navegador limita su bandeja de salida a 16 MiB / 8.192 lotes / siete días en cada
  ciclo de envío (normalmente cinco segundos, incluidos los ciclos sin conexión); el servidor
  conserva como máximo 64 MiB de datos / 32.768 lotes durante siete días, según el
  límite que se alcance primero. SQLite puede ocupar espacio adicional para índices y
  páginas reutilizables. Si el navegador rechaza el almacenamiento, se recurre a memoria limitada; una
  terminación repentina del proceso puede perder eventos aún no guardados. Los contadores de pérdidas y los huecos
  en la secuencia son limitaciones de las evidencias, no entregas correctas.
- `SOUNDSIBLE_TELEMETRY_ENABLED=0` desactiva el almacenamiento en el servidor y la confirmación
  detiene el registro de esta página, vaciando la bandeja de salida pendiente de su cuenta.

## Análisis del operador (el oyente no lo ejecuta)

El directorio del usuario autenticado en el servidor contiene
`telemetry/playback-traces.sqlite3`. El agente puede leerlo directamente:

```sh
python scripts/playback_trace_report.py /path/to/user/telemetry/playback-traces.sqlite3 --since 2026-09-08T21:30:00+02:00
```

El informe agrupa por captura, dispositivo y revisión, muestra las pérdidas y los huecos en la secuencia, y
extrae los dos segundos anteriores y los diez posteriores a los relevos y las órdenes de reproducción.
También compara los relojes del contexto y de la fuente con el tiempo monotónico del cliente en
intervalos estables, agrupados por modo de salida y visibilidad. Excluye las operaciones de reproducción
observadas, las pausas, los saltos, los cambios de velocidad, las transiciones y los huecos
 en la secuencia. Se requieren al menos tres intervalos utilizables; una relación de relojes no es una
medición del tono audible. Esto funciona tanto con salida directa como mediante portadora.
También identifica estados declarados de no reproducción mientras avanza la posición multimedia.
Esa marca es una observación que debe investigarse: un salto de posición o una fuente inactiva también pueden
hacer avanzar la posición. No demuestra el estado del coche ni la salida audible.

Un evento `play` sin procesar de un elemento inactivo, sin un `call.play` de la aplicación ni un
`media_session.action` previos, se distingue de una operación emitida por la aplicación. Por sí
solo no identifica el origen como el coche. Las muestras de desbloqueo se distinguen
de las pistas de las fuentes reales y del flujo mezclado. Correlaciona la pausa o descarga de la fuente
saliente y el avance de la entrante y la portadora con las órdenes y la
recuperación posteriores; nunca interpretes una lectura de `playbackState` como una confirmación del sistema operativo.

## Límites de la validación

Las pruebas unitarias y del backend cubren el orden de las observaciones, el comportamiento original de las promesas,
el filtrado de privacidad, la validación, la persistencia, la deduplicación, la discrepancia de cuenta,
los fallos de almacenamiento y la retención. Las pruebas de navegador cubren el inicio automático, los reintentos de IndexedDB
entre recargas, la separación de cuentas y la desactivación voluntaria de la telemetría. No
reproducen el arbitraje de iPhone/Toyota. El trayecto histórico no puede reconstruirse
con este detalle a partir de los registros antiguos del servidor. No se afirma que haya una corrección validada en un dispositivo físico.
