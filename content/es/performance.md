# Uso de recursos y validación del rendimiento

Soundsible puede ejecutar su servidor y el cliente web instalado en el mismo equipo que un
juego limitado por la GPU. Diagnostica esos procesos por separado: un uso total bajo de la CPU
no descarta un hilo de renderizado costoso ni demuestra que la decodificación de audio
sea responsable de los tirones.

## Hallazgos y límites

Las mediciones del 2026-09-11/12 se hicieron con un Ryzen 5800X, una RTX 3060, 32 GiB de RAM y
FirefoxPWA en X11/i3. Las comparaciones reanudadas se ejecutaron **sin Arma Reforger**,
con un viewport de cliente de 1760 × 990 píxeles CSS. Los porcentajes de CPU siguientes se refieren a una
CPU lógica; el 100% no es la máquina completa de 16 hilos. Las cifras del cliente suman el
árbol de procesos del navegador. Las cifras del servidor incluyen sus descendientes.

Lo siguiente son cambios controlados en la temporización de la animación del fondo en el mismo
cliente, con la misma pista reiniciada antes de cada muestra. No son una comparación
entre dos versiones completas de la aplicación.

| Escenario | Desplazamiento continuo existente | Desplazamiento a 10 actualizaciones/segundo |
| --- | ---: | ---: |
| NORMAL en reproducción, tres muestras alternas de 40 segundos por variante | 48,46–49,62% de CPU | 19,43–19,77% de CPU |
| Vista DJ en reproducción, una muestra de 30 segundos por variante | 46,23% de CPU | 19,80% de CPU |
| Reproductor completo en pausa, una muestra de 30 segundos por variante | 44,98% de CPU | 6,27% de CPU |
| Potencia de toda la tarjeta gráfica en la comparación en pausa | 38,77 W | 21,78 W |

La aceptación final repitió NORMAL con tres muestras alternas de **60 segundos**
por variante sobre la implementación terminada. La CPU del cliente en la referencia fue del 48,25,
48,35 y 48,78%; en la versión actualizada fue del 19,03, 19,07 y 19,65% (alrededor de un 60% menos).
La CPU del servidor osciló entre el 0,75 y el 1,42% en estas ejecuciones. La potencia de toda la tarjeta fue de
38,91–39,61 W en las muestras de referencia y de 31,92–33,43 W en las actualizadas.
La comparación en reproducción ahorra menos potencia de la tarjeta que el control en pausa anterior,
porque la interfaz de reproducción que sigue animada todavía genera trabajo gráfico. Ambas comparaciones
usan el mismo viewport de 1760 × 990. La reproducción siguió activa y las modificaciones temporales
de la animación se restauraron después.

Durante la reproducción estable, el servidor usó aproximadamente un 0,7–1,3% de una CPU.
El cliente contraído usó un 0,07% en pausa y un 11,80% en reproducción, en muestras separadas
de 30 segundos. Un control en pausa con el fondo congelado usó un 0,73%; congelar un
fondo visible es un control de diagnóstico, **no un comportamiento del producto**.

Las frecuencias de reloj de la GPU cambiaron de forma notable con la carga de trabajo. La utilización por proceso de `nvidia-smi`
no mostró una mejora proporcional consistente, porque no mide
fracciones sumables de la capacidad total de la GPU. Las cifras de potencia describen
toda la tarjeta, incluidas otras aplicaciones. La PSS del cliente fue de aproximadamente
722–739 MiB en las muestras alternas; no se constató ninguna mejora sostenida
de la memoria del cliente.

La ocultación de la página provocada por el navegador usó la activación del contexto de navegación de Firefox, que
produjo un evento `visibilitychange` real y `document.hidden === true`. La CPU del cliente
promedió un 2,82% durante 30 segundos. La posición mostrada se quedó en 20 segundos
mientras la página estaba oculta y se puso al día hasta 73 segundos al volver, con la reproducción aún
activa. Esto valida el comportamiento del ciclo de vida de la página, no la audibilidad física ni la
detección de oclusión del gestor de ventanas. En esta configuración de i3, mover la PWA a otro
espacio de trabajo podía dejar su página notificada como visible. La pérdida de foco nunca debe
usarse como sustituto de la ocultación.

La automatización exploratoria inicial cambió las preferencias recomendadas en el perfil original
del navegador. Las comparaciones posteriores usaron un perfil copiado aparte con los cambios automáticos
de preferencias recomendadas desactivados. La exploración inicial no debe tratarse como
una línea base con un perfil sin modificar. Los perfiles de navegador sin procesar y las trazas locales de cada cuenta
no son artefactos del repositorio.

La caída notificada en el juego, de unos 90 a 40 FPS, no se reprodujo con una
grabación controlada de tiempos de fotograma. Las capturas anteriores del HUD variaban según la escena
del juego y las condiciones del servidor. Estos resultados demuestran un menor uso de recursos de Soundsible;
**no** demuestran una recuperación concreta de FPS ni atribuyen un
porcentaje de los tirones del juego al cliente o al servidor.

### Chromium: el escenario abierto en una GPU modesta

Las mediciones del 2026-10-14 se centraron en portátiles de doble núcleo con gráficos integrados
que ejecutan la PWA de Chrome. El Chromium de Playwright se ejecutó en el mismo Ryzen 5800X con un
viewport de 1366 × 768, una vez en la RTX 3060 (ANGLE sobre Vulkan) y otra en
SwiftShader, como sustituto de un navegador sin aceleración por GPU. La CPU es el
árbol completo de procesos del navegador según `/proc`, como fracción de una CPU lógica; la tasa
de fotogramas cuenta los eventos `DrawFrame` de viz. Las dos builds se sirvieron en paralelo y
se alternaron en la misma sesión; las cifras son medianas de cuatro muestras alternas
por build en cada configuración.

| Estado | GPU antes | GPU después | Fotogramas/s | SwiftShader antes | SwiftShader después |
| --- | ---: | ---: | ---: | ---: | ---: |
| Biblioteca, en reproducción | 5,2% | 3,2% | 60 → 11 | 4,8% | 3,5% |
| Reproductor completo, en reproducción | 29,1% | 13,4% | 60 → 20 | 103% | 99% |
| Reproductor completo, en pausa | 10,2% | 5,2% | 10 → 2 | 64% | 15% |

Cada fotograma en el que cambia cualquier cosa del escenario obliga al compositor a rehacer
cada superficie con backdrop-filter situada sobre el fondo, así que el coste seguía la
tasa de fotogramas de los elementos en movimiento más pequeños. De mayor a menor, durante la reproducción: el
ecualizador de tres barras de la cola, que repintaba la tarjeta de la cola a 60 fps; un segundo desenfoque
en cada panel del escenario sobre un fondo ya desenfocado 62px; los pasos de 10 Hz
del fondo, y la barra de progreso del minirreproductor, cuya transición
repintaba la página que tenía debajo ocho veces por segundo. Ahora el ecualizador avanza a
unos 17 fps con todas las barras cambiando en el mismo fotograma, el cristal solo
satura, el fondo avanza dos veces por segundo y la barra se mantiene en su propia
capa y se mueve en dos pasos por actualización.

Las capturas de pantalla de ambas builds con el mismo fotograma congelado difieren en un ΔE CIE76
inferior a 2,3 (la diferencia apenas perceptible habitual) en al menos el 99,9% de los píxeles
en los temas oscuro, claro, pizarra y verde bosque, con un máximo de 3,3;
en el negro puro, que no tiene cristal, son idénticas.

Los desenfoques anidados dentro de los paneles (la barra superior del navegador, las cabeceras de sección
de la cola) se mantienen. Quitarlos ahorraba aproximadamente un punto más en Chromium, pero en el
diseño móvil el WebKit de Playwright, que compone por software, dejaba de
estabilizarse: los elementos de los paneles seguían «no estables» durante 30 segundos y se perdía la
restauración del desplazamiento, en CI y en local con dos CPU. WebKit es el motor del
iPhone, así que se mantienen hasta que se entienda la causa.

Con SwiftShader, el reproductor en reproducción sigue limitado por el propio desenfoque de 62px del fondo,
que se recalcula en cada fotograma en el que cambia algo por encima: quitar
solo ese filtro llevó el proceso de GPU del 92% al 17% con la misma tasa de fotogramas.
En una GPU por hardware, el mismo filtro no produjo ninguna diferencia medible. Por tanto, una imagen de fondo
ya desenfocada es el siguiente paso solo para los navegadores que componen
por software; hay que comprobar `chrome://gpu` antes de abordarlo.

## Trabajo por subsistema

| Subsistema | Trabajo y política |
| --- | --- |
| Fondo del reproductor y paneles translúcidos | El fondo lento que ocupa todo el viewport provoca composición repetida. Conservar la carátula, el desenfoque, la escala y el fundido cruzado; cuantizar solo su desplazamiento de 38 segundos en 76 pasos. El cristal de los paneles sobre el fondo lo satura, pero no vuelve a desenfocarlo. |
| Animaciones pequeñas en el escenario | Cualquier cosa que se mueva dentro o debajo del cristal cuesta una composición de todo el escenario por fotograma. Presupuestar estas animaciones en fotogramas: el ecualizador de la cola avanza cada 60 ms, con retardos que son múltiplos del paso para que todas las barras cambien en el mismo fotograma. |
| Barra de progreso del minirreproductor | Transform compuesto en una capa propia (`will-change`), dos pasos por timeupdate. |
| Presentación con la página oculta | Pausar la animación CSS decorativa y desuscribir del reloj la presentación del progreso y de las letras. Ponerse al día inmediatamente al recuperar la visibilidad. |
| Audio y transporte DJ | Mantener los relojes multimedia, los traspasos con la página oculta, la recuperación, Media Session y la sincronización entre dispositivos independientes de la visibilidad de la presentación. |
| Diagnóstico de reproducción | Llevar la cuenta del tamaño serializado pendiente de forma incremental en lugar de serializar el lote acumulado en cada evento. Conservar el orden, el almacenamiento acotado, los reintentos y el aislamiento entre cuentas. |
| Análisis DJ | Calcular las características espectrales en lotes de 256 fotogramas como máximo. Arrastrar el flujo entre fotogramas adyacentes a través de los límites de lote y conservar el espectro medio. Evitar equipos de workers de BLAS para reducciones pequeñas. La pasada de ritmo es una STFT float32 acotada más; sus bandas y clases de altura se suman con `np.add.reduceat`, no con un producto de matrices, y los ataques se miden por ventana de pulso sin una copia de la señal a longitud completa. |
| Planificación cooperativa del servidor | El daemon parchea threading con gevent. Trasladar la composición numérica pura a su pool de hilos nativos; mantener sin cambios la propiedad de los subprocesos y de SQLite y conservar dos trabajos de análisis simultáneos. Los procesos normales sin parchear la ejecutan directamente. |
| Streaming y prefetch de previews | Las transferencias compartidas, las colas acotadas, la cancelación y la prioridad de primer plano existentes ya evitan descargas redundantes que compitan entre sí. Conservarlas. |
| Carátulas, sonoridad y trabajos de fondo | Se mantienen la generación acotada de carátulas, las mediciones en caché y los límites de workers según el disco que ya existen. No se introducen límites de recursos generales ni reducciones de calidad. |

Rasterizar el fondo en un canvas no redujo el coste sostenido en comparaciones repetidas
con el navegador nativo y se descartó. En Firefox, pausar las pequeñas
barras del ecualizador o forzar su composición aportó poco; en
Chromium, esas mismas barras eran el mayor coste del reproductor abierto (ver arriba).
Ocultar explícitamente el minirreproductor, que ya estaba tapado, tampoco redujo el coste.
Estos experimentos no justifican añadir complejidad al producto.

## Pruebas de rendimiento del servidor

La referencia es el commit `f597171`; los procesos de comparación ejecutan su
`shared/dj_engine.py` de confianza directamente con las mismas dependencias instaladas y los
helpers compartidos actuales; así se aísla el cambio del análisis sin hacer checkout de un
segundo servidor completo. Usar procesos nuevos evita que los máximos de memoria del asignador
pasen de una ejecución a otra. El PCM sintético y los WAV temporales no tocan
la biblioteca ni las cachés de la estación. La equivalencia numérica se comprueba de forma recursiva con
`rtol=atol=1e-10`; las cadenas, las claves y las longitudes de las listas deben coincidir.

Medianas de tres ejecuciones para la extracción de características, sin contar FFmpeg ni el tráfico de proveedores:

| Audio sintético | Tiempo de pared de referencia | Tiempo de pared actualizado | Pico de RSS de referencia | Pico de RSS actualizado |
| --- | ---: | ---: | ---: | ---: |
| 18 segundos | 12,2 ms | 10,9 ms | 60,6 MiB | 52,5 MiB |
| 120 segundos | 52,2 ms | 32,4 ms | 149,6 MiB | 61,9 MiB |
| 480 segundos | 207,6 ms | 82,0 ms | 507,5 MiB | 122,7 MiB |

El análisis completo de WAV sintéticos, con FFmpeg incluido, también conservó todos los campos de salida.
Las medianas de tiempo de pared de tres ejecuciones fueron 43,5 → 42,8 ms (18 segundos), 88,6 → 69,7 ms
(120 segundos), 249,9 → 129,7 ms (480 segundos) y 152,9 → 113,3 ms
(900 segundos). Los archivos largos ya usan ventanas de inicio y final, así que no se espera
que escalen como las FFT de canciones completas. Ocho archivos de música reales en caché, de 159–361 segundos,
produjeron un análisis completo equivalente al de la referencia; una segunda llamada
reutilizó cada caché temporal de análisis sin decodificar. No se modificaron
las cachés personales. Estos tiempos son observaciones locales, no promesas de rendimiento fijas.

El RSS incluye las bibliotecas importadas y la construcción de la entrada sintética, no solo el espacio
de trabajo de la FFT. En concreto, construir una entrada sintética larga puede dominar
el máximo de memoria aunque el análisis real ya use ventanas de inicio y final.
El tiempo de CPU indicado es el del proceso de Python; excluye el tiempo de CPU del proceso hijo de FFmpeg.
Esos campos no deben interpretarse como uso de recursos de toda la estación.

Un cliente HTTP en un proceso separado consultó un servidor WSGI de gevent aislado mientras se ejecutaban dos
análisis sintéticos de 480 segundos. En tres repeticiones exploratorias, el mayor
retardo de respuesta bajó de 395–402 ms a 5–13 ms. La latencia típica fue similar: el
cambio elimina un bloqueo intermitente del bucle. Esto aísla el trabajo numérico;
no mide el daemon de producción, las descargas en frío de proveedores ni TLS.
El benchmark HTTP permanente repitió el resultado con máximos de 398–402 ms en la referencia
y de 2,6–5,4 ms en la versión actualizada. No se reinició el daemon personal en ejecución para
obtener estos resultados del servidor.

### Analizador de la rejilla de pulsos (versión de análisis 4)

Medido contra `origin/main` en `0ee18af0` con `--allow-changes`, porque la
salida cambia a propósito. Medianas de tres ejecuciones en esta estación de trabajo Linux:

| Audio sintético | Características, referencia → actual | Pipeline completo con FFmpeg | Pico de RSS |
| --- | ---: | ---: | ---: |
| 18 segundos | 13 → 21 ms | 43 → 54 ms | 55,2 → 57,3 MiB |
| 120 segundos | 35 → 89 ms | 69 → 152 ms | 65,3 → 66,3 MiB |
| 480 segundos | 84 → 292 ms | 131 → 337 ms | 127,3 → 127,3 MiB |
| 900 segundos (ventanas de inicio y final) | — | 110 → 203 ms | 199,5 → 199,6 MiB |

El tiempo de CPU es igual al tiempo de pared: la pasada se ejecuta en un solo hilo. Con dos análisis simultáneos
de 480 segundos bajo el benchmark HTTP de gevent, el mayor retardo de
respuesta fue de 1,4–3,1 ms (referencia: 3,8–6,9 ms). Las 53 previews en caché de la
estación de trabajo tardaron 18,2 s en total, frente a 11,5 s antes, FFmpeg incluido.

### Magnitudes medidas (versión de análisis 6)

Medido contra `origin/main` en `f0135129` con `--allow-changes`, porque la
salida cambia a propósito: notas por segundo (`_note_onsets`, con su propia STFT de 46 ms
en bloques de 256 fotogramas), planitud espectral a partir de los espectros que
`_spectral_features` ya recibe, y sonoridad EBU R128 a partir del medidor de FFmpeg
en una rama de la misma decodificación. Medianas de tres ejecuciones en esta estación de trabajo Linux:

| Audio sintético | Características, referencia → actual | Pipeline completo con FFmpeg | Pico de RSS |
| --- | ---: | ---: | ---: |
| 18 segundos | 20 → 31 ms | 51 → 71 ms | 65,8 → 68,5 MiB |
| 120 segundos | 85 → 138 ms | 120 → 190 ms | 75,4 → 78,9 MiB |
| 480 segundos | 289 → 495 ms | 337 → 607 ms | 137,6 → 137,4 MiB |
| 900 segundos (ventanas de inicio y final) | — | 199 → 330 ms | 210,0 → 209,7 MiB |

El contador de notas por sí solo tarda 0,19 s en una canción de ocho minutos. Con dos análisis simultáneos
de 480 segundos bajo el benchmark HTTP de gevent, el mayor retardo de
respuesta fue de 2,8–2,9 ms (referencia: 2,3–3,7 ms). Las 224 canciones de la biblioteca de menos de ocho
minutos tardaron 42,7 s con ocho procesos, FFmpeg incluido.

### Analizador de tonalidad (versión de análisis 7)

Medido contra `956e5344` con `--allow-changes`. La FFT de Hann adicional
usa 16384 muestras para distinguir los semitonos del bajo, saltos de media ventana y bloques de
32 fotogramas como máximo. La estimación de la tonalidad usa la correlación de Pearson con los perfiles
de Krumhansl existentes. Medianas de tres ejecuciones, PCM sintético, solo extracción de características:

| Audio sintético | Tiempo de pared, referencia → actual | CPU de Python, referencia → actual | Pico de RSS, referencia → actual |
| --- | ---: | ---: | ---: |
| 18 segundos | 33,8 → 32,1 ms | 33,6 → 32,0 ms | 55,7 → 56,8 MiB |
| 120 segundos | 145,5 → 150,9 ms | 145,1 → 150,4 ms | 63,9 → 65,3 MiB |
| 480 segundos | 506,6 → 528,5 ms | 505,4 → 527,3 ms | 123,4 → 123,3 MiB |

Para reproducirlo: `OPENBLAS_NUM_THREADS=1 python scripts/benchmark_dj_analysis.py
--reference 956e5344 --seconds 18 120 480 --repeats 3 --allow-changes`.
Esto excluye FFmpeg y el tráfico de proveedores y de red; las pequeñas diferencias a 18 s
son variación de la medición. La salida del análisis cambia intencionadamente e invalida
la caché anterior. Las mediciones con tonalidad conocida y las limitaciones pendientes del detector están
en `docs/dj/HANDOFF.md`, P6; `docs/dj/key_probe.py` las reproduce sin
escribir en la caché de la estación.

## Reproducir de forma segura

Ejecutar las comparaciones de recursos por separado de las pruebas, las builds y los benchmarks de análisis.
Localizar los PID padre reales del servidor y del navegador antes de cada sesión. Usar un perfil
de navegador separado para la automatización y conservar las preferencias del perfil normal.
Anotar el viewport, la densidad del dispositivo, la visibilidad, el foco, el estado NORMAL/DJ, la posición
de reproducción, si la caché está caliente y los trabajos simultáneos en la etiqueta de la muestra o en las notas
que la acompañan. Mantener equivalentes la posición de la pista y el contenido visual entre variantes.

```sh
python scripts/resource_sample.py --group server=123 --group client=456 \
  --seconds 60 --label 'NORMAL playing; visible; warm cache; fixed viewport' \
  --output /tmp/soundsible-normal.json

.venv/bin/python scripts/benchmark_dj_analysis.py --reference f597171 \
  --repeats 3 --output /tmp/soundsible-dj-features.json

.venv/bin/python scripts/benchmark_dj_analysis.py --reference f597171 \
  --pipeline --seconds 18 120 480 900 --repeats 3 \
  --output /tmp/soundsible-dj-pipeline.json

.venv/bin/python scripts/benchmark_dj_analysis.py --reference f597171 \
  --http --seconds 480 --repeats 3 --output /tmp/soundsible-dj-http.json
```

El muestreador de recursos escribe la CPU, la PSS y la E/S de los procesos y la presión del sistema en JSON,
los contadores de GPU por proceso sin procesar en `.gpu.txt`, y la potencia, la utilización,
las frecuencias, la memoria y la temperatura de toda la tarjeta en `.gpu.csv`. Los contadores que faltan se dejan vacíos.
Un PID raíz desaparecido o reutilizado invalida su grupo, y los intervalos incompletos
se excluyen de las medias de CPU impresas. Los subprocesos de vida corta pueden no registrarse;
usar contabilidad de procesos o un profiler cuando se sospeche que esos trabajos son la causa.
Los grupos pueden solaparse y no deben sumarse sin comprobarlo.

El benchmark HTTP solo expone un servidor de loopback temporal en un proceso hijo
y lo apaga después. Su p95 puede no reflejar una única parada larga; hay que revisar el
retardo máximo además del percentil y el número de peticiones. Las cargas de trabajo mayores
pueden requerir ampliar la ventana de observación. Mide dos trabajos numéricos,
no un arranque completo de la estación.

## Aceptación y cobertura de regresiones

- Alternar la temporización original y la actualizada en tres muestras de 60 segundos cada una tras el
  calentamiento; incluir los estados NORMAL, DJ, en pausa, contraído y oculto. Comprobar ambos
  temas, los fundidos cruzados de carátulas, las letras, el movimiento reducido y los gestos de apertura y cierre.
- Verificar que las ventanas visibles pero sin foco siguen animándose. La presentación oculta debe
  detenerse mientras la reproducción avanza; al volver, el progreso y las letras se ponen al día. El comportamiento
  nativo del gestor de ventanas y las pruebas sintéticas del ciclo de vida son evidencias distintas.
- Verificar los traspasos con la página oculta en NORMAL y DJ, el seek, pausa/reanudación, la recuperación y los controles
  multimedia. Los resultados automatizados de Chromium/WebKit no demuestran el comportamiento con el iPhone bloqueado ni en el coche;
  la limitación de la presentación no cambia el pipeline de audio.
- Verificar silencio, pulsos, límites de bloques espectrales y el análisis largo de inicio y final;
  comparar los resultados completos del análisis, la reutilización de la caché y los lectores simultáneos. Confirmar
  que HTTP sigue respondiendo durante el trabajo numérico sin reducir la fidelidad musical.
- Ejecutar `npm test` desde `ui_web`, las pruebas de Python, el lint y las suites de Playwright afectadas.
  Usar la actualización automática normal de UI-dist del proyecto; no compilarla manualmente.
- Completar más adelante una sesión de juego con tiempos de fotograma registrados, la misma escena/cámara
  y las mismas condiciones del servidor, y cachés calientes. Comparar distribuciones de tiempos de fotograma y
  paradas largas, no capturas de FPS instantáneos. Incluir solo servidor,
  cliente en pausa, NORMAL en reproducción, DJ y un cliente realmente oculto.

Las mediciones de rendimiento son evidencia para la revisión, no aserciones de tiempo fijas en CI sobre
runners compartidos. Las invariantes funcionales y los tamaños acotados de FFT van en las pruebas.
