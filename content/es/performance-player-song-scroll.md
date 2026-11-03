# Desplazamiento de la lista de canciones del reproductor: diagnóstico en X270 y corrección acotada

El navegador de canciones del reproductor de escritorio mantiene ahora reservada
su barra de desplazamiento vertical mientras haya montada una lista virtual de
canciones no vacía. Antes, su cuerpo compartido usaba `overflow: auto` en ambos
ejes. Sustituir filas virtuales de forma repetida provocaba un trabajo costoso
de layout y paint en Chrome nativo en el ThinkPad X270.

El modificador se aplica a la pestaña Songs de Library y a colecciones de
canciones como Favourites y las listas de reproducción. Los álbumes, los
artistas, las colecciones vacías y el contenido de edición de listas de
reproducción conservan sus reglas de overflow actuales. La regla es solo para
escritorio (`min-width: 1024px`); el comportamiento del paginador móvil y el
overflow horizontal siguen igual que antes. Las carátulas, los materiales, los
efectos, el tamaño de las filas y el overscan no cambian. Las colecciones de
escritorio cortas y no vacías también reservan el espacio de la barra de
desplazamiento fina; por ello, su texto puede disponer de un ancho ligeramente
menor.

## Evidencias y límites

Medido en i5-6300U, Intel HD 520/i915/Mesa, Chrome nativo con ventana visible y
con composición y rasterización por hardware activadas. La ventana ocupaba sola
el espacio de trabajo 1: 1533 × 755 px CSS con zoom/DPR 1.25. La reproducción
estaba en pausa. Los desplazamientos repetidos con caché caliente usaron gestos
de rueda nativos de CDP a una velocidad solicitada de 2400 px CSS/s.

| Superficie del reproductor | Distancia | p95 del intervalo rAF original | Control con desplazamiento vertical |
| --- | ---: | --- | --- |
| Library | 6000 px | 50 / 50 / 50 ms | 33.4 / 33.4 / 33.4 ms |
| Favourites | 2400 px | 66.6 / 50 / 66.5 ms | 33.4 / 33.3 / 33.3 ms |

Estas muestras, en orden alterno original/control, no descargaron imágenes
nuevas. La geometría, la distancia de desplazamiento y las mutaciones de la
lista de hijos coincidieron dentro de cada superficie. Fijar solo el overflow
horizontal no reprodujo la mejora. En un par trazado anterior, fijar el overflow
vertical y horizontal redujo el tiempo acumulado del hilo de Layout de 600.0 a
219.8 ms y el de Paint de 345.3 a 125.7 ms. Son tiempos inclusivos específicos
de cada evento, no la utilización total de CPU o GPU.

Se compararon capturas nativas de la superficie completa (1916 × 944) del
original y del control solo vertical en Library y Favourites, con los temas CSS
claro y oscuro. Los cuatro pares tenían píxeles y rectángulos de fila idénticos.
Las animaciones se pausaron solo para esa comparación de fotogramas, no en las
ejecuciones de rendimiento. Esto no valida todos los tamaños, las listas cortas
ni la interacción en un iPhone físico.

Los percentiles de rAF describen intervalos de planificación, no FPS
presentados. El retardo persiste tras este cambio. Quitar temporalmente los
backdrop filters no hizo que el desplazamiento restante fuera fluido de forma
constante, así que esta corrección conserva esos materiales. El retardo con
caché caliente también persistió con el HTTP del cliente sin conexión; la
latencia del servidor/Samba no puede explicarlo por sí sola. La decodificación
de carátulas en frío y los placeholders visibles siguen siendo una investigación
aparte, no un beneficio atribuido a esta corrección.

Firefox se midió por separado, con la aceleración WebRender verificada. Su
implementación nativa de la rueda es distinta, y algunos filtros de panel se
calculan como `none` en el bundle servido porque esas reglas solo contienen la
declaración con prefijo WebKit. Sus cifras no son una comparación con el mismo
renderizado que Chrome.

Las trazas y capturas sin procesar que contienen datos de la cuenta se guardan
fuera del repositorio; el archivo local de auditoría registra cada ejecución,
cada script y cada control descartado. No se deben generalizar estas mediciones
a otro hardware ni prometer 60 FPS constantes.
