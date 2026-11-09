# Modo DJ

El reproductor tiene dos modos: **NORMAL** para la reproducción habitual y **DJ** para
sesiones con mezclas automáticas.

**DJ** es el DJ automático integrado de Soundsible. No se limita a aplicar un fundido cruzado a
una cola aleatoria. Construye una ruta musical editable, analiza cómo puede enlazar cada pareja
de canciones, prepara la pista entrante en un segundo plato y realiza la transición
en un punto de entrada elegido.

El modo DJ está etiquetado actualmente como **beta** en el reproductor. Sus funciones principales de mezcla y
planificación de rutas ya están disponibles; la etiqueta indica que su
planificación y su interfaz siguen perfeccionándose.

## Iniciar una sesión

- Sin nada en reproducción, pulsa **Iniciar una sesión de DJ** en el reproductor inferior y
  elige música. El DJ escoge un inicio entre esa selección y empieza
  la ruta desde ahí.
- Con una pista en reproducción, abre el reproductor y cambia de **NORMAL** a **DJ**.
  La pista actual se convierte en la primera influencia visible en **Sesión**.
- Desde el menú de una canción en NORMAL o dentro del panel del reproductor, **Iniciar DJ desde esta canción** convierte esa canción en la
  fuente de la sesión. Será la siguiente canción que el DJ introduzca en la mezcla, igual que mezcla cualquier
  otra, y a partir de entonces servirá de origen para la música.
- Mientras DJ está activo, reproducir una canción desde cualquier lugar fuera del panel del reproductor inicia
  inmediatamente una nueva sesión de DJ desde esa canción en 0:00. Su fuente y su ruta
  sustituyen a las de la sesión anterior, incluidas todas las peticiones e influencias anteriores.
  Reproducir una colección empieza por su primera canción y usa la colección como
  fuente. Los controles de la sesión están dentro del panel del reproductor.
- En **Sesión**, usa **Mezclar con…** para añadir una influencia o **Cambiar…** para
  elegir una nueva dirección con el mismo explorador musical.

### Una fuente es un único elemento musical

Una canción, un álbum, un artista, una lista de reproducción o los favoritos constituyen **una fuente**.
Elegir una colección fuera del panel del reproductor inicia una nueva sesión de DJ a partir de ella.
Dentro del panel, su botón principal orienta la sesión actual hacia esa fuente mientras
la canción sigue sonando: el DJ elige las siguientes canciones de ella. Nunca convierte la colección en una lista de peticiones. La opción de pedir todas las canciones
de una colección sigue disponible, con su nombre (**Añadir a la sesión**), en el
menú de la colección dentro del panel, y esas canciones van juntas: pertenecen a la sesión
para la que se pidieron.

Las tres partes del espacio de trabajo tienen funciones diferentes:

| Parte | Qué controla |
| --- | --- |
| **Sesión** | El material musical y la dirección en los que debe basarse el DJ |
| **Escenario / Cabina** | Lo que está sonando y lo que viene después |
| **Ruta** | El orden real de las próximas canciones, incluidas las pistas que has fijado y los puentes generados por el DJ |

## Qué analiza el DJ

Cuando una pista se puede analizar, Soundsible mide su tempo y su rejilla de pulsos, la tonalidad,
las secciones musicales, la introducción y el cierre, y tres magnitudes que se pueden comparar
entre canciones: notas por segundo, sonoridad integrada (EBU R128, en LUFS) y
planitud espectral, que distingue un tono puro (0) del ruido (aproximadamente 0.56). El DJ
no dirige la sesión según ninguna de ellas: las fuentes y el sistema de recomendación
eligen la música, y el DJ la mezcla. Según el material, el motor de dos platos
puede realizar:

- mezclas largas con ritmos sincronizados;
- intercambios de graves y mezclas con filtros;
- cortes con eco y cortes entre secciones musicales;
- fundidos conservadores cuando falta el análisis o una mezcla más elaborada sonaría peor.

El servidor elige automáticamente la técnica para cada pareja, con el mismo
plan para la web y Android. Una mezcla con los pulsos sincronizados debe ajustarse al tempo local dentro
del límite de velocidad de los reproductores y mantener un pulso compartido estable durante todo el solapamiento.
Lo único que lo decide es si los pulsos de la pareja pueden sincronizarse: se pueden
mezclar dos tonalidades cualesquiera. La proximidad de tonalidad y tempo determina qué canción viene después y qué mezcla
se utiliza, nunca un corte con eco o un fundido en lugar de una mezcla.
Ambas canciones se acercan a un tempo compartido, cada una con el mismo cambio porcentual y
nunca superior al 8 % (el margen de ajuste de tono de un tocadiscos): 120 y 132 BPM se encuentran en
125,7 BPM, a un 4,8 % del tempo propio de cada una. La canción que está sonando alcanza ese tempo
gradualmente en los segundos anteriores a la entrada de la siguiente, y esta última
vuelve a su propio tempo gradualmente después de la mezcla. Si no hay margen para esa
rampa, solo cambia la canción entrante, dentro del mismo límite. Dos canciones comparten pulso cuando un número
entero de pulsos de cada una dura lo mismo: uno
a uno, dos a uno, tres a dos (116 y 174 BPM) o cuatro a tres (90 y
120 BPM). Interpretar una canción en dos o en tres es una elección de nivel: un 12/8 es un
4/4 con pulsos ternarios, así que la mezcla no depende de ello.
El plan indica qué alineación garantiza: los pulsos, o también los compases cuando
se confirma el primer tiempo de ambas canciones y sus compases duran lo mismo. Incluso cuando
solo se garantiza la alineación de pulsos, la mezcla empieza en el primer tiempo estimado de cada
canción. Una grabación sin pulso estable usa un corte con eco o un fundido. Una mezcla más
larga también necesita tonalidades compatibles y suficiente material de baja intensidad medido al principio y al final de
ambas canciones, con una rejilla de pulsos regular durante todo el tramo; nunca atraviesa un
hueco sin medir para alargar la mezcla.

Cuando no es posible mezclar pulsos fiables a la velocidad permitida, el DJ puede elegir
un corte con eco. Su retardo dura un pulso medido de la canción saliente cerca del punto de salida, corregido
según la velocidad de reproducción del plato. Si el pulso no es fiable, se usa un fundido estructural;
si falta el análisis, se mantiene un fundido conservador.

En cada reposición de la ruta, el DJ elige hasta ocho canciones antes de consultar sus análisis
y después ordena las canciones medidas según la calidad de las transiciones y la continuidad de notas
por segundo, sonoridad, timbre y tempo. Las escalas se obtienen de las mediciones de esa misma
reposición y tienen la misma influencia una vez ajustadas. Las canciones sin analizar conservan
sus posiciones aleatorias, de modo que la música ya descargada no pueda desplazarlas.
Una sesión vacía sigue empezando dentro de la fuente añadida más recientemente.

El servidor prepara hasta dieciséis candidatas por reposición en segundo plano,
incluidas muestras que aún no se han descargado. La elección sigue el
orden aleatorio de la sesión, por lo que una canción descargada no tiene ventaja para incorporarse a la ruta.
Una vez medido todo el conjunto elegido, el DJ puede insertar un puente compatible
entre dos canciones que de otro modo se mezclarían mal, conservando todas las canciones
originales. También analiza toda la biblioteca musical local en segundo plano.

Una muestra recién adquirida se analiza en cuanto está listo todo su audio.
La web y Android vuelven a intentar las mediciones de transición pendientes antes de cargar el siguiente
plato; si una medición no está disponible, se mantiene el fundido conservador.

El motor limita los cambios de tempo y recurre a una transición segura antes que forzar la unión de dos grabaciones incompatibles. La nivelación de sonoridad forma parte del mismo recorrido de audio, por lo que una transición no necesita un salto brusco de volumen para tener energía.

Las secciones medidas ayudan a situar la mezcla: puede empezar durante un cierre o terminar
antes de un breakdown. Una frase empieza en un compás donde el arreglo cambia de forma
medible, al entrar o salir un sonido; entre cambios, las frases se cuentan en
compases completos, con la longitud a la que se repiten los cambios, o en tramos de ocho compases que se
marcan como una suposición. Un breakdown es un tramo en el que la sonoridad del bombo y el bajo cae a menos
de la mitad, y un drop es el momento en el que vuelven después de uno; un pasaje que
solo suena más fuerte no es ninguna de las dos cosas. Cuando el pulso es fiable y encaja una frase
medida, la canción entrante empieza de forma que su drop coincida con el inicio de una frase de la
canción saliente al final de la mezcla; solo se usa una frase supuesta cuando no encaja ninguna
medida. En caso contrario, se mantiene la introducción habitual. Tanto la web como Android
siguen el mismo plan del servidor.

El pulso y el primer tiempo de cada compás se obtienen de Beat This!, un detector neuronal
de pulsos abierto (licencia MIT) que se ejecuta localmente con ONNX Runtime; después, sus
decisiones se ajustan a los ataques con suficiente precisión para mantener sincronizados los bombos durante la mezcla.
La red puede situar un primer tiempo uno o dos pulsos fuera de su lugar, y
su nivel de confianza no indica cuándo ocurre, por lo que solo se garantiza la alineación de compases cuando
coincide con una medición independiente de los cambios de armonía y los acentos. Las frases y
secciones se cuentan sobre esos compases, así que un primer tiempo mal situado también las desplaza;
cuando los niveles no muestran claramente una función, el DJ no le atribuye ninguna.

El modelo añade unos 4 segundos de tiempo de procesador por minuto de audio, en un solo
núcleo, y consume hasta unos 0.5 GB de memoria mientras se analiza una canción. Por tanto, el primer
análisis de una biblioteca grande tarda horas en segundo plano; las canciones
se reproducen con fundidos conservadores hasta que se miden. Las imágenes de Docker y la
aplicación de escritorio incluyen el modelo. Una instalación desde el código fuente lo descarga una sola vez
(84 MB), la primera vez que analiza una canción, y verifica su suma de comprobación.
Una grabación cuyo tempo fluctúa,
como la de una banda en directo, recibe una rejilla que sigue la interpretación y un fundido a
velocidad normal en lugar de una sincronización de pulsos a velocidad fija. Tras una actualización que cambia
el análisis, la biblioteca y las muestras seleccionadas se vuelven a medir en
segundo plano; hasta que llegan esas mediciones, sus transiciones son fundidos sencillos.

### Canciones completas, sin mezclas

**Ajustes → DJ → Mezclar entre canciones** está activado de forma predeterminada. Si lo desactivas, el DJ
sigue eligiendo la misma música en la misma ruta, pero cada canción se reproduce hasta el
final de su archivo y la siguiente empieza desde el principio, sin fundidos, efectos ni
cambios de tempo entre ellas. **Siguiente** y **Reproducir ahora** pasan directamente a su
canción, y **Reparar mezcla** se oculta: no hay transiciones que reconstruir.

El interruptor es una preferencia de la cuenta. Se aplica a partir de la siguiente canción que el DJ
aún no haya preparado; una mezcla ya preparada se reproduce igualmente.

## Personalizar la sesión

- **Añadir a la sesión** pide canciones concretas sin cambiar la dirección musical.
- **Mezclar en la sesión** añade una influencia junto a las existentes.
- Dentro del panel del reproductor, **Cambiar sesión** (e **Iniciar DJ desde…**) orienta la sesión hacia una nueva
  fuente de inmediato. Las fuentes anteriores, las elecciones y los puentes del DJ, y las canciones
  pedidas como una colección completa se van con la sesión anterior; las canciones que
  hayas pedido de una en una se quedan. La canción actual continúa y el DJ hace la transición
  desde ella cuando lo considera oportuno; una mezcla que ya se esté oyendo termina. Después se planifica
  la nueva ruta como en cualquier reposición, con reintentos automáticos mientras la música sigue sonando.
- El bloque Sesión muestra las influencias activas. Elimina una influencia mientras
  quede otra, o usa **Cambiar…** para sustituir la última.
- **Coloca una pista que tenga que sonar.** Añade una canción a la Ruta o suéltala en un
  hueco concreto. Soundsible puede insertar un puente si así se obtiene un camino más seguro
  hasta la petición.
- **Reordena libremente.** Mover pistas cambia la ruta de inmediato. Las uniones que ya
  no coincidan con su transición original usan un fundido sencillo hasta que pulses
  **Reparar mezcla**.
- **Repara sin perder tus elecciones.** **Reparar mezcla** reconstruye las transiciones y
  los puentes generados alrededor de las pistas que has colocado, manteniéndolas
  en el orden y la posición elegidos.
- **Salta sin salir de DJ.** Siguiente pide al DJ una transición corta al siguiente
  elemento de la ruta en lugar de volver a la reproducción habitual. Siguiente siempre hace
  algo: una mezcla que ya se esté oyendo termina en ese momento, y una canción siguiente
  que aún no pueda entrar en la mezcla empieza de la forma habitual.
- **Guarda lo que encuentra el DJ.** Cada fila de la Ruta tiene un menú ⋯ visible (también
  disponible con clic derecho o una pulsación larga en el móvil). El menú permite guardar la canción en tu
  biblioteca, descargarla, marcarla como favorita o añadirla a una lista de reproducción
  sin moverla en la ruta, incluida la canción que ya esté preparada.
- **Elige música desde cualquier lugar.** Los menús de canciones y colecciones ofrecen las mismas
  acciones de sesión. **Reproducir ahora** sigue siendo una transición inmediata explícita.
  Elegir una influencia musical no implica pedir también esa canción concreta.


El DJ da prioridad a las peticiones explícitas frente a la música generada. Salir de DJ elimina sus
ramas y puentes generados, pero las pistas que hayas colocado expresamente se conservan como una
cola manual normal.

El indicador **NORMAL / DJ** del minirreproductor siempre muestra quién controla la reproducción. La
elección se mantiene durante la sesión de escucha actual y se incluye en el estado que se transfiere al cambiar de dispositivo.
Solo se sale del modo DJ al seleccionar **NORMAL** expresamente o al aceptar el aviso
que aparece antes de iniciar una reproducción incompatible de pódcast o radio.
Si se selecciona otra canción mientras ya se oye una mezcla, esa mezcla
termina y la selección más reciente entra en la mezcla a continuación.

## DJ, Radio y Reproducción automática son diferentes

| Modo | Ideal para | Qué controlas |
| --- | --- | --- |
| **Reproducción automática** | Una continuación breve e invisible cuando termina un álbum o una lista de reproducción | Una preferencia de la cuenta; sin espacio de trabajo propio |
| **Radio** | Música sin fin relacionada con un punto de partida | Iniciar o detener el flujo generado |
| **DJ** | Una sesión continua con transiciones deliberadas | Las influencias de la sesión, la ruta, las peticiones concretas y las transiciones |

El DJ explora las influencias activas junto con las últimas cuatro canciones automáticas
que hayan empezado a sonar en la dirección actual. Una recomendación pendiente
no es una raíz de descubrimiento. Las peticiones concretas y los puentes no se convierten en raíces solo
por haber sonado. **Mezclar con…** conserva esta exploración; **Cambiar…** la borra,
sin incorporar como raíz la canción saliente. Estas raíces de descubrimiento no aparecen como
influencias adicionales en **Sesión**.

Un cambio de dirección se aplica de inmediato: las nuevas influencias, una nueva
revisión de la exploración y el vaciado de la ruta se guardan juntos, y cualquier
respuesta aún en curso para la dirección anterior se descarta cuando llega.

### Toda transición se resuelve

Una transición se prepara en el segundo plato y no empieza ningún fundido hasta que ese plato
está sonando de verdad. Cuando no es así —el flujo sigue cargándose, se ha bloqueado
o ha terminado a los pocos segundos—, la transición se resuelve igualmente:

- si la canción saliente llega antes al final, se da paso a la siguiente
  de la forma habitual, desde el plato que ya la tenía cargada, con la misma
  supervisión de inicio y recuperación ante bloqueos que en cualquier otro cambio de pista;
- si la siguiente canción no puede reproducirse en absoluto, se descarta y se pasa a la posterior;
- si el flujo de la siguiente canción se detiene durante una mezcla audible, se abandona y la
  canción saliente sigue sonando; si aquella ya había asumido la reproducción, se recupera
  como cualquier canción bloqueada.

Las grabaciones de más de veinte minutos —sesiones de DJ, tomas en directo o álbumes completos en un
archivo— no se eligen como canciones de una ruta salvo que una fuente no contenga nada más.

Si una petición a un proveedor falla temporalmente, el DJ vuelve a intentarlo con esperas cada vez mayores. Si
no quedan nuevas candidatas, el DJ deja de repetir la misma búsqueda y ofrece **Reintentar**.
Las nuevas influencias, raíces de exploración o exclusiones permiten volver a planificar.
Las entradas de la ruta que ya se puedan reproducir continúan con normalidad en ambos casos.

Las instantáneas de sesión conservan la exploración por separado del historial de repeticiones. Las instantáneas
antiguas mantienen su cola y sus peticiones, pero el historial sin información fiable sobre la dirección
de origen no se incorpora a la exploración.

### Validación de la continuidad

Una prueba de regresión determinista recorre treinta rutas sucesivas con conjuntos de recomendaciones
relacionadas que se solapan, además de pruebas independientes de cambios de dirección,
aislamiento de peticiones, preparación interrumpida y reintentos cuando se agotan las entradas.
Una repetición local de solo lectura con 204 pistas de la biblioteca y resultados relacionados en caché
produjo 1,090 ampliaciones de ruta tanto con el selector corregido como con la versión de referencia
`2b5a365`, frente a 972 con `34d95f1`. Cuatro pistas no tuvieron ruta inicial en
ninguna de las tres ejecuciones. Las entradas de caché ausentes se trataron como vacías; no se hicieron peticiones
a proveedores en directo ni se reprodujo audio. Esto comprueba la continuidad de la selección,
no la calidad audible de las transiciones ni la reproducción en dispositivos físicos.

## Emitir el resultado

Live captura el bus de programa después de ambos platos, la nivelación de sonoridad, la ecualización, los filtros,
el fundido cruzado y el eco. Por tanto, los oyentes escuchan la misma sesión de DJ que oye el DJ,
no una aproximación independiente. Consulta [Live](LIVE.md) para configurar HTTPS y la
sala.

## Privacidad y almacenamiento

El análisis de audio es local. Soundsible guarda características medidas y compactas en su caché de DJ, no copias del audio decodificado. El historial de escucha y las señales de recomendación permanecen asociados a la cuenta en tu estación.

Las reglas detalladas de la cola y el recorrido se recogen en el [contrato de la cola de reproducción](PLAYBACK_QUEUE_CONTRACT.md). La implementación y el flujo de datos se describen en [Arquitectura](ARCHITECTURE.md).
