# Rediseño coherente de las vistas

Registro de trabajo de la auditoría y la aceptación del rediseño de las vistas.
Referencia inicial: `origin/main` integrado en `60e66f1b`. Revisores: tres agentes
GPT 6.1 Sol, esfuerzo alto. Implementación e iteración del diseño: Claude Opus
5.5, esfuerzo alto, coordinadas en una única rama de trabajo y una única pull
request. Esta es una revisión de la interfaz, no un cambio en la identidad de
la música, el transporte de audio, la clasificación de recomendaciones ni las
transiciones de DJ.

## Cobertura y hallazgos

| Área | Hallazgos de la referencia inicial | Respuesta de diseño |
| --- | --- | --- |
| Barra lateral de escritorio / panel móvil | Todos los destinos tienen un peso similar; las subvistas de Biblioteca consumen gran parte de la barra; tanto el elemento padre como el hijo pueden anunciar la página actual | Jerarquía secundaria compacta, destino actual inequívoco, conservar todas las rutas y la memoria de pestañas |
| AppBar / TabBar | Título móvil, menú y navegación inferior configurable ya establecidos | Conservar la responsabilidad de cada componente, los ajustes y los objetivos de teclado/táctiles |
| Descubrir / Buscar | No hay h1 en escritorio; búsqueda y secciones desconectadas; tarjetas inconsistentes; los resultados filtrados vacíos y las secciones ampliadas vacías del feed aparecen en blanco; una consulta de un carácter informa de que no hay resultados | Cabecera de página reconocible, ritmo coherente de tarjetas/secciones, estados explícitos del contenido visible |
| Interacciones de búsqueda | El modo YouTube no tiene una ruta de vuelta visible; las sugerencias desaparecen al pulsar Tab; la elección de versión elude los mecanismos de foco/Escape del modal; semántica de pestañas incompleta | Salida visible del modo, sugerencias accesibles con teclado, capa superpuesta compartida, grupo de filtros accesible |
| Artista / Álbum | Cabecera principal y contenido desalineados; los títulos móviles se truncan; selección solo en CSS; Guardar precede a Reproducir; la desambiguación es frágil | Lenguaje común para entidades, título completo, filtro de modo accesible, escucha primero, capa de candidatos robusta |
| Artista / álbum local | Un fallo al obtener la pertenencia se convierte en un estado vacío y fuerza Descubrir; el recuento del álbum siempre describe el catálogo; se omite la portada local si falla la remota | Distinguir carga/error/vacío, conservar la vista de biblioteca prevista con reintento, metadatos según el modo, imagen local efectiva |
| Discografía / artistas relacionados | Carruseles pequeños de 120px sin controles de escritorio; secciones vacías repetidas | Tarjetas coherentes y legibles, exploración accesible de catálogos largos, un único estado vacío útil |
| Listas / PlaylistDetail | El menú puede recibir el foco mientras es invisible; el detalle omite la imagen elegida | Foco visible y cabecera de entidad coherente que conserve la imagen manual |
| Biblioteca / LibraryHome / Favoritos | Diseño de lista y filtros maduros; las secciones guardadas ocultan la carga inicial y los fallos; varios estados vacíos sin salida | Conservar filas virtualizadas, orden y filtros; estados compactos y veraces; coherencia sobria |
| Entidades guardadas / cuadrículas de álbumes y artistas | Múltiples dimensiones/radios de tarjeta sin relación; el menú reserva demasiado ancho del texto | Métricas de tarjeta compartidas, títulos y metadatos secundarios legibles, objetivo de acción separado |
| Reproduciendo / superficie del reproductor / colas | Diseño, restauración del foco y comportamiento de paneles maduros; las pestañas de modo tienen una semántica de teclado incompleta | Conservar geometría, transporte y semántica de la cola; completar la accesibilidad del modo |
| Pódcast | Falta h1 de escritorio y el ritmo de búsqueda es distinto | Cabecera de página y barra de herramientas coherentes con Descubrir |
| PodcastShow | Imagen diminuta, título truncado, la gestión compite con el contenido; el filtro de descargas no anuncia su estado; un fallo al cancelar la suscripción navega de todos modos | Cabecera de entidad, título legible, estado explícito del filtro, comportamiento veraz de actividad/error |
| Descargas | Cabecera h2 y presentación de vacío/error específicas; cabecera y columna estrecha desalineadas | Cabecera de página y estados compartidos, alineación de lectura deliberada |
| En directo | Solo se puede renombrar con doble clic y la entrada de edición no tiene nombre | Acción de edición visible para teclado/táctil y entrada etiquetada; conservar la identidad de sala y audio |
| Ajustes | División de escritorio/índice móvil, enlaces profundos buscables y permisos maduros | Conservar la arquitectura; alinear el vocabulario de página compartido sin cambios decorativos |
| Inicio de sesión / Invitación | Las etiquetas, el autocompletado y los controles de contraseña existentes son adecuados | Conservar los flujos accesibles y alinear solo cuando sea beneficioso |
| Importar / Migrar | La entrada de archivo web usa display:none y su etiqueta no es accesible con teclado | Selección de archivos realmente operable con teclado, conservar el análisis previo a la importación y las decisiones de ambigüedad |
| Ruta desconocida | La demostración de capas superpuestas de desarrollo se usa como 404 real | Recuperación útil hacia Biblioteca / Descubrir |
| Vistas Android compartidas | ArtistDiscoveryView y varios componentes de presentación se comparten con controladores nativos | Leer el documento de traspaso de Android; conservar el límite del adaptador y verificar la interfaz compartida sin importar los almacenes web |

Las auditorías de origen distinguen los defectos de interacción confirmados de
las recomendaciones estéticas. La revisión renderizada usa un adaptador HTTP
aislado en torno al catálogo de demostración, nunca una cuenta ni una biblioteca
reales. La aceptación final se vincula al commit final de la PR; la evidencia de
navegador no equivale a aceptación física en iOS/Android.

## Contrato de diseño común

- Usar los tokens existentes de tipografía, espaciado, color de texto, radio y
  controles. Las portadas de álbumes y listas son cuadradas con `--radius-md`;
  las de artistas siguen siendo circulares.
- Métricas compartidas de exploración: `--browse-card-min: 144px`,
  `--browse-card-width: 156px`, `--browse-card-gap: var(--space-lg)`.
  En escritorio usar un mínimo de 160px, un ancho de carrusel de 180px y una
  separación de `--space-xl`. Poner estas variables en la hoja de estilos de
  tokens compartida, a cargo de la implementación de navegación. Los demás
  agentes pueden consumirlas con valores alternativos hasta que estén presentes.
- Las vistas raíz usan ViewHeader. La estructura táctil es responsable del título
  de página/volver, evitando controles de estructura duplicados. Las cabeceras de
  entidad pueden mostrar la identidad musical completa y la imagen.
- Alinear la cabecera principal de entidad, el selector y el contenido con el
  mismo margen. Preferir una cabecera móvil compacta en paralelo, una composición
  de escritorio mayor, títulos completos que se ajusten en varias líneas y una
  única barra de contenido/acciones. La reproducción principal sigue siendo
  directa; la gestión secundaria permanece en el menú de opciones.
- Usar botones `aria-pressed` agrupados para los filtros de búsqueda y el selector
  nativo etiquetado para seleccionar contenido de entidad de forma compacta.
  Conservar el patrón completo de teclado y paneles para las pestañas reales. El
  estado activo tiene geometría además de color. Los controles conservan objetivos
  de foco y táctiles utilizables con el tamaño de interfaz Grande.
- Títulos de exploración de dos líneas y metadatos secundarios estables; foco y
  estado al pasar el cursor claros sin mover las tarjetas. La imagen aporta
  identidad; evitar contenedores decorativos adicionales.
- El esqueleto inicial, el contenido conservado durante la revalidación, el error
  compacto + Reintentar y el vacío con una acción son estados distintos. Evaluar
  el contenido seleccionado, no secciones ajenas en otras partes de la respuesta.
- Conservar los destinos reales de MusicLink, los enlaces independientes de los
  créditos de artista, el contexto y la pulsación prolongada; abrir una entidad
  nunca la reproduce. Conservar los ID canónicos, las apariciones en la cola, el
  modo seleccionado en los destinos de reproducción, las portadas manuales de
  listas, el estado guardado frente a adquirido, la restauración del
  desplazamiento y los ajustes de navegación inferior.
- Los cambios en la presentación compartida también deben funcionar en el
  adaptador nativo de Android. No cambiar los almacenes de audio web/nativos ni
  la planificación de DJ para respaldar cambios visuales.

## Validación y revisión final

La implementación y la aceptación renderizada en escritorio/móvil/claro/oscuro/
Grande están completas. TypeScript y las 1941 pruebas unitarias pasan. El árbol
estable inicial pasa la suite completa de Chromium móvil/escritorio (414 pruebas
superadas, 74 omisiones específicas de perfil) y la de WebKit móvil/escritorio
(401 pruebas superadas, 87 omisiones específicas de perfil). WebKit se ejecuta en
el contenedor de Playwright fijado con un montaje de solo lectura y un único
trabajador; los dos motores se ejecutan secuencialmente contra el backend de
fixtures de puerto cerrado.

La primera ejecución de Chromium reveló selectores obsoletos de marcadores
directos, el cambio previsto de la instantánea de barra lateral/cabecera y un menú
de pódcast que usaba una semántica distinta en escritorio. Las especificaciones
de colecciones ahora entran por el menú de opciones explícito; la instantánea se
inspeccionó visualmente y se regeneró en la imagen de CI; la gestión de pódcast
usa el diálogo compartido con gestión del foco en ambos diseños. Pasan tanto las
comprobaciones de las áreas afectadas como ambas suites finales completas. La
nueva suite de geometría de entidades cubre directamente la composición rechazada
por el usuario, en lugar de depender solo de capturas de pantalla.

La verificación de la base remota actual, las comprobaciones de GitHub del commit
final y la posterior revisión de Codex siguen siendo requisitos de revisión de
publicación para esta PR abierta. La evidencia de CI nativa es independiente de
la aceptación en navegador; no se afirma aceptación en dispositivos físicos.

## Revisión independiente de Claude: simplificación de vistas secundarias

Un nuevo revisor Claude Opus 5.5 con esfuerzo alto examinó el código fuente, las
pruebas y los estilos sin recibir la auditoría de implementación ni la
justificación del diseño. Veredicto: una mejora sustancial respecto a la
referencia integrada, con un nuevo defecto de foco de gravedad baja.

| Hallazgo | Resolución |
| --- | --- |
| Un fallo al renombrar en En directo enfoca una entrada que sigue deshabilitada | Corregido: la entrada es de solo lectura durante el envío, con una prueba de regresión que comprueba el foco tras el fallo |
| Un fallo al dejar de seguir un pódcast queda silenciado después de abandonar la página | Corregido: se mantiene la notificación global de fallo; la finalización tardía no puede navegar desde la página nueva |
| API y estilos de volver de ViewHeader sin uso | Eliminados tras verificar que ningún punto de llamada los usa; el comportamiento de volver en las rutas sigue a cargo de AppBar/las cabeceras de entidad |
| Los enlaces de recuperación repiten estilos de enlaces con aspecto de botón | Se trasladó text-decoration al estilo compartido de botones; se conservó el espaciado significativo de la acción Favoritos |
| Lectores de PostCSS duplicados en las nuevas pruebas | Se reutilizó el lector de declaraciones de hojas de estilo existente |
| El texto y el límite del título nativo de En directo difieren de web/servidor | Se alinearon el valor predeterminado traducido y el límite de 96 caracteres del servidor; el contrato del servicio nativo no cambió |
| Se podría eliminar la aserción CSS de ajuste de línea de ViewHeader | Conservada: pequeña comprobación de regresión junto a la aceptación de geometría en navegador; sin nueva abstracción de pruebas |
| Sangría de las acciones de pódcast | Cosmético; no requiere comportamiento ni abstracción adicional |
| Los controles de pódcast desaparecen al desplazarse en escritorio | Aceptado con el patrón común de cabecera de entidad; se conservaron el acceso por teclado y la actualización explícita |

El revisor validó de forma independiente el margen medido de la cabecera del
pódcast y la activación manual de las pestañas NORMAL/DJ; ambos se conservan. Esta
revisión solo del código fuente no sustituye a la revisión independiente de UX
renderizada ni a la suite de cuatro perfiles.

## Revisiones independientes de Claude: UX renderizada, navegación y colecciones

Otros tres revisores nuevos Opus 5.5 con esfuerzo alto inspeccionaron la aplicación
renderizada y el código fuente sin los informes anteriores. Cubrieron los modos
oscuro/claro, escritorio, teléfonos de 320/360/390px y tamaños de interfaz
Normal/Grande. Todos juzgaron su ámbito claramente mejorado respecto a la
referencia integrada. Sus pestañas se cerraron después.

| Hallazgo | Resolución |
| --- | --- |
| El texto para dejar de seguir un pódcast tiene contraste insuficiente en oscuro | Corregido: color de texto secundario y un borde visible en reposo |
| Pódcast duplica la cuadrícula y la tipografía de la cabecera de entidad | Corregido: usa EntityHero directamente; una tipografía compartida menor en teléfonos reduce la altura de los títulos largos |
| El estado vacío de Descargas nombra el antiguo destino Buscar y no tiene una acción siguiente | Corregido: texto traducido de Descubrir y un enlace de navegación real |
| Un 404 al dejar de seguir puede significar que la suscripción ya se eliminó | Se mantiene como error: el endpoint también usa 404 para una biblioteca no cargada, por lo que tratar todos los 404 como éxito ocultaría un fallo real. El texto de error ahora pide comprobar las suscripciones sin afirmar que se sigue siguiendo el programa |
| Ampliar/volver en Descubrir pierde la posición del teclado | Corregido en la vista compartida: enfocar el encabezado de la sección y restaurar su enlace Ver todo, sin anular la restauración del desplazamiento |
| Borrar la búsqueda pierde el foco de la entrada | Corregido en SearchField compartido; se siguen admitiendo referencias externas de entrada |
| Tres copias de la lógica del feed visible divergen | Sustituidas por una única función pura discoveryHasVisible usada por la web, el controlador nativo y la vista compartida |
| Los carruseles táctiles parecen recortados en lugar de deslizables | Los carruseles se extienden hasta el borde de la pantalla y conservan el espaciado de contenido y foco |
| La barra lateral de escritorio Grande puede requerir desplazamiento en pantallas bajas | Se conservaron el desplazamiento accesible y los tamaños de objetivo; reducir los objetivos para eliminar una barra de desplazamiento perjudicaría el comportamiento del tamaño de interfaz seleccionado |
| Las búsquedas vacías siguen ofreciendo filtros de resultados | Se conservaron la ubicación estable de los filtros mientras trabaja el proveedor y el estado explícito del filtro seleccionado por el usuario; sin nuevas consultas de red |
| Varias cuadrículas de colecciones se reducen a una columna a 320px | Corregido en los cinco consumidores con un mínimo que tiene en cuenta las dos columnas |
| La heurística de tamaño del título no detecta nombres reales de una sola palabra | Se eliminó la función de recuento de caracteres; una única regla de título adaptable gestiona todas las entidades, con ajuste de línea como alternativa |
| Las filas de artista/álbum/lista tienen márgenes distintos | Se añadió una variable acotada de relleno de lista, conservando la geometría compacta del reproductor existente; las filas de artista anidadas compensan el relleno de sección |
| Las acciones de entidad en teléfonos ocupan demasiadas filas | Reproducir conserva su etiqueta; Aleatorio y el marcador usan controles de icono con nombre y al menos 44px de ancho, conservando la altura y el estado de los controles |
| Artista repite el recuento de elementos propios y puede dejar un separador suelto | Se eliminaron los metadatos duplicados; el recuento permanece en el control de la colección seleccionada |
| Lista carece de reproducción aleatoria junto a reproducir | Se añadió reproducción aleatoria que conserva el contexto, oculta en DJ, con una prueba de regresión del contexto de reproducción |
| La cabecera principal y la entidad guardada obtienen imágenes diferentes | Ambas usan ahora el mismo accesor de imagen efectiva |
| Renombrar Placeholder / cambiar los nombres accesibles del selector / cambiar el enrutamiento de Ver todo | Preferencias opcionales de nomenclatura/interacción; se conservaron las rutas y la semántica establecidas |

La integración también mide la cabecera del pódcast para la virtualización en
lugar de depender del renderizado adicional fuera del área visible. La cobertura
de regresión comprueba un encabezado largo en tamaño Grande, el acceso al primer
y último episodio y un número limitado de filas montadas. No se ha cambiado el
transporte de audio, la planificación de DJ ni ninguna preferencia persistente de
navegación.

## Rechazo del usuario a la composición de las vistas de detalle

El usuario rechaza la familia actual Álbum/Artista: el área entre la imagen/título
y las canciones todavía contiene tres filas separadas de controles. Los
veredictos positivos de las revisiones anteriores no constituyen aceptación. Se
reabre el diseño de detalle antes de las suites de navegador o la creación de la
PR. Dos nuevas revisiones independientes de Opus se centran en la composición
misma, en reducir las filas de controles y priorizar la música visible. Los
archivos fuente se mantienen estables para esa revisión. Las correcciones
anteriores de comportamiento y accesibilidad siguen formando parte de la tarea,
pero el diseño de la cabecera de entidad no se considera definitivo.

Ambas revisiones centradas de Claude agotaron después la cuota de cinco horas
del proveedor antes de producir recomendaciones finales. Se recuperaron mensajes
parciales y mediciones del DOM. Algunos cambios del área de visualización no se
aplicaron realmente, por lo que esas cifras experimentales no son evidencia final
de aceptación. El usuario autorizó explícitamente la alternativa GPT 6.1 Sol con
esfuerzo alto; dos nuevos revisores independientes de Sol cubren ahora la
composición visual y la jerarquía de información. En esta fase no hay ninguna PR
ni despliegue listos.

## Composición final del detalle tras los comentarios del usuario

Dos revisores independientes GPT 6.1 Sol con esfuerzo alto completaron la revisión
interrumpida por la cuota. La composición elegida es identidad seguida de una
única fila de cuadrícula explícita: contenido actual, comando principal, opciones.
Álbum y Artista sustituyen la barra segmentada separada por un selector nativo
etiquetado. El comando principal conserva su nombre accesible completo y el
símbolo de DJ específico del contexto; su etiqueta textual aparece en escritorio.
Aleatorio, marcador, adquisición masiva y desambiguación permanecen en el mismo
menú de opciones. Un trabajo activo de colección marca ese menú, anuncia su estado
y abre desde allí su detalle existente de progreso/revisión/elementos faltantes.

El encabezado inicial de pistas de Artista sigue siendo semántico sin otra banda
visual de controles. Los encabezados posteriores de discografía siguen visibles.
Lista tiene una única fila de recuento/reproducir/opciones y ningún menú duplicado
en la barra superior. Pódcast conserva su filtro de episodios y una acción Seguir
explícita para programas nuevos; actualizar/dejar de seguir pasan a opciones. Su
imagen más pequeña se alinea con la parte superior del título completo. La
presentación de entidades en Android usa el mismo selector puro y diseño,
conservando los controladores nativos, los ID y las acciones sin conexión.

Una nueva suite de regresión de navegador comprueba directamente la geometría
rechazada a 360px en español/Grande, el cambio de contenido sin volver a obtener
el perfil ni reproducir, las acciones de gestión accesibles, los títulos largos
completos, la discografía de dos columnas a 320px y un primer episodio visible
bajo un título largo de pódcast. Los fallos iniciales revelaron un margen negativo
del selector fuera de la barra de herramientas; se eliminó. La protección de
reproducción cuenta la selección/transmisión real de pistas en lugar de una
publicación inactiva del reloj de desbloqueo de audio sin pista ni sesión.
Validación unitaria/de tipos: 234 archivos, 1938 pruebas. Los perfiles finales
completos de navegador pasan según lo registrado arriba. Las comprobaciones de
GitHub del commit final y la posterior revisión de Codex siguen pendientes antes
de la entrega.

## Revisión de Codex tras la CI verde inicial

Las 36 comprobaciones de GitHub pasaron en `bc9a7ca7`, incluidos todos los perfiles
de navegador, las particiones de emulador nativo de Android, las compilaciones de
escritorio y las compilaciones de Docker. La revisión remota de Codex solicitada
identificó entonces un hallazgo P2, confirmado en lugar de descartado: Solid
conserva el resultado de un recurso cuando la navegación elimina su ID de
catálogo. Álbum podía heredar la portada, el ID del crédito de artista y el año
del registro anterior; tanto Álbum como Artista podían conservar un error de
pertenencia anterior sobre pistas válidas identificadas solo por nombre.

Los accesores de pertenencia ahora requieren el ID de catálogo de la ruta actual.
Los enlaces identificados solo por nombre recuperan la alternativa de nombre
establecida; los fallos con ID siguen conservando su error y reintentan exactamente
el mismo ID. Tres pruebas de regresión de navegación entre rutas fallan en la
implementación revisada y pasan tras la corrección. La validación completa de
TypeScript/pruebas unitarias pasa (234 archivos, 1941 pruebas), seguida de las
especificaciones de navegador de colección y detalle afectadas en los cuatro
perfiles (18 Chromium y 18 WebKit, sin fallos). La corrección se presenta a la CI
del commit final y a una nueva revisión posterior de Codex; la PR sigue abierta
para revisión manual.
