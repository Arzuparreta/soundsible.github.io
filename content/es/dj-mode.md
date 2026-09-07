# Modo DJ

El modo DJ (denominado Auto Mode en las API internas) es el DJ automático integrado en Soundsible. No se limita a aplicar un fundido cruzado a una cola aleatoria: construye un recorrido musical editable, analiza cómo enlazar cada pareja de canciones, prepara la pista entrante en un segundo deck y realiza la transición en un punto de entrada elegido.

El reproductor identifica actualmente el modo DJ como **beta**. La mezcla y la edición del recorrido ya están disponibles; la etiqueta indica que la planificación y la interfaz siguen perfeccionándose.

## Iniciar una sesión

- Cuando no haya nada en reproducción, pulsa **Iniciar una sesión de DJ** en el reproductor inferior y elige una fuente. El DJ seleccionará una primera canción de esa colección e iniciará el recorrido.
- Si ya está sonando una pista, abre el reproductor y cambia de **NORMAL** a **DJ**. La canción actual será el inicio de la sesión.
- Usa **Fuentes** para orientar la sesión con una pista, artista, álbum, lista, favoritos u otra selección. Las fuentes influyen en lo que genera Auto; añadir una no sustituye de golpe lo que está sonando.

Las tres partes del espacio de trabajo tienen funciones diferentes:

| Parte                  | Qué controla                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Fuentes**            | El material musical y la dirección que debe seguir Auto                                         |
| **Escenario / Cabina** | Lo que suena, lo que viene después, la energía, la profundidad y el estilo del DJ               |
| **Recorrido**          | El orden de las próximas canciones, incluidas tus pistas fijas y los puentes generados por Auto |

## Qué analiza el DJ

Cuando una pista se puede analizar, Soundsible mide su tempo, rejilla rítmica, tonalidad, energía, secciones musicales, introducción y cierre. Usa estas características tanto para ordenar las candidatas como para elegir la transición. Según el material y el estilo del DJ, el motor de dos decks puede realizar:

- mezclas largas con ritmos sincronizados;
- intercambios de graves y mezclas con filtros;
- cortes con eco y cortes entre secciones musicales;
- fundidos conservadores cuando falta el análisis o una mezcla más elaborada sonaría peor.

El motor limita los cambios de tempo y recurre a una transición segura antes que forzar la unión de dos grabaciones incompatibles. La nivelación de sonoridad forma parte del mismo recorrido de audio, por lo que una transición no necesita un salto brusco de volumen para tener energía.

## Personalizar la sesión

- **Orienta la sesión sin reiniciarla.** Añade o elimina fuentes en cualquier momento. La transición ya cargada en el segundo deck se conserva; Auto vuelve a planificar lo que vendrá después.
- **Coloca una canción imprescindible.** Añádela al recorrido o suéltala en un hueco concreto. Soundsible puede insertar un puente si así consigue llegar a tu petición de forma más segura.
- **Reordena libremente.** Mover pistas modifica el recorrido de inmediato. Las uniones que ya no encajen con su transición original usarán un fundido sencillo hasta que pulses **Reparar mezcla**.
- **Repara sin perder tus elecciones.** **Reparar mezcla** reconstruye las transiciones y los puentes generados alrededor de tus pistas, manteniendo el orden y la profundidad que hayas elegido.
- **Salta de canción sin salir de Auto.** Siguiente solicita al DJ una transición corta hacia el próximo elemento del recorrido, en lugar de volver a la reproducción normal.
- **Elige música desde cualquier lugar.** Mientras el indicador **DJ** esté activo, reproducir una canción individual significa **Mezclar ahora** y utiliza una transición musical corta. Elegir un álbum, artista, lista, favoritos u otra colección significa **Usar como fuente**. Estas acciones nunca devuelven el modo a Normal.

Auto da prioridad a las peticiones explícitas frente a la música generada. Al salir de Auto desaparecen sus ramificaciones y puentes, pero las pistas que colocaste explícitamente se conservan como una cola manual normal.

El indicador **NORMAL / DJ** del minirreproductor muestra siempre quién controla la reproducción. La elección se mantiene durante la sesión de escucha y se incluye en su estado cuando se transfiere a otro dispositivo. Solo se sale del modo DJ al seleccionar **NORMAL** expresamente o aceptar el aviso previo a una reproducción incompatible de pódcast o radio. Si eliges otra canción mientras ya se oye una mezcla, esta termina y después se mezcla la selección más reciente.

## Diferencias entre Auto, Radio y Autoplay

| Modo          | Uso principal                                                  | Qué controlas                                                                                |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Autoplay**  | Una continuación breve y discreta al terminar un álbum o lista | Una preferencia de la cuenta; no tiene un espacio de trabajo independiente                   |
| **Radio**     | Música continua relacionada con un punto de partida            | Iniciar o detener la selección generada                                                      |
| **Auto Mode** | Una sesión continua con transiciones planificadas              | Fuentes, recorrido, peticiones concretas, energía, profundidad, estilo del DJ y reparaciones |

Los tres utilizan las señales de escucha locales de Soundsible. Auto también valora si las pistas permiten una transición musical coherente y la ejecuta en el motor de audio de dos decks del navegador.

## Emitir el resultado

Live captura el bus de programa después de ambos decks, la nivelación de sonoridad, la ecualización, los filtros, el fundido cruzado y el eco. Por tanto, los oyentes escuchan la misma sesión de Auto Mode que oye el DJ. Consulta [Live](LIVE.md) para configurar HTTPS y la sala.

## Privacidad y almacenamiento

El análisis de audio es local. Soundsible guarda características medidas y compactas en su caché de DJ, no copias del audio decodificado. El historial de escucha y las señales de recomendación permanecen asociados a la cuenta en tu estación.

Las reglas detalladas de la cola y el recorrido se recogen en el [contrato de la cola de reproducción](PLAYBACK_QUEUE_CONTRACT.md). La implementación y el flujo de datos se describen en [Arquitectura](ARCHITECTURE.md).
