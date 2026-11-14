# Hoja de ruta

Soundsible es un servicio de música autoalojado para descubrir, escuchar,
guardar, organizar, mezclar y compartir música mediante sus propios clientes
conectados. El servidor contiene tu biblioteca y tu perfil de escucha; los clientes
llevan esa experiencia a tus dispositivos.

> **descubrir → escuchar → guardar y organizar → mezclar con DJ → compartir**

OpenSubsonic te ofrece otra forma de usar tu biblioteca. La compatibilidad con
otras aplicaciones complementa la experiencia propia de Soundsible; por sí sola no cumple nuestros
compromisos con la escucha sin conexión, los coches o los relojes.

## Bases disponibles

- Biblioteca y búsqueda externa unificadas, adquisición y etiquetado, importación de carpetas,
  y exploración por álbum, artista, género y año. SQLite es la biblioteca de referencia;
  JSON es una exportación. Los metadatos del catálogo y la resolución de artista y título sustentan
  todo el producto.
- Reproducción NORMAL y el [flujo de trabajo de DJ](AUTO_MODE.md) editable con dos platos,
  actualmente en beta, con recomendaciones locales, Autoplay y Radio.
- Web/PWA y beta de escritorio. El [código nativo de iOS](IOS.md) incluye descarga sin conexión
  y gestión del almacenamiento, pero nadie ha instalado ni ejecutado la aplicación en un dispositivo.
  Su comportamiento sigue siendo teórico; generar un IPA no lo valida.
- [Contenedor de desarrollo de Android](ANDROID.md): recursos compartidos de Solid y una base de compilación
  nativa. La conexión, la reproducción y la experiencia en el dispositivo aún no están implementadas;
  consulta el [documento de traspaso de la adaptación](android/HANDOFF.md) para conocer los requisitos de entrega.
- [Live](LIVE.md) transmite el programa a una sala de escucha en el navegador.
- [OpenSubsonic](OPENSUBSONIC.md) da acceso a la biblioteca musical a clientes compatibles,
  con búsqueda en la biblioteca, listas de reproducción y transmisión con transcodificación.
- [Scrobbling](SCROBBLING.md) envía las reproducciones de cada cuenta a ListenBrainz,
  Last.fm y Maloja, desde cualquier cliente, cuando esa cuenta conecta un servicio.

Estas capacidades están implementadas, pero eso no significa que se hayan validado todas las combinaciones
de dispositivos. Las guías de cada cliente describen sus límites específicos; el comportamiento
real en teléfonos, coches y relojes necesita pruebas en esos dispositivos.

## Prioridades y rumbo

La prioridad inmediata es un uso cotidiano fiable en las interfaces existentes, seguido
de una adquisición resistente a fallos y mejoras del DJ. La compatibilidad con nuevos dispositivos es un compromiso
a largo plazo. El trabajo puede avanzar de forma independiente cuando las dependencias lo permitan; estas
secciones no son una secuencia en la que cada elemento bloquee al siguiente. No hay
fechas de entrega prometidas.

### 1. Escucha cotidiana fiable

Hacer fiables la reproducción, los saltos de posición, la pausa y reanudación, la navegación por la biblioteca y la búsqueda
en las interfaces existentes de web/PWA, escritorio e iOS. Mantener claros el estado de reproducción y
los controles ante interrupciones, el uso en segundo plano y la reconexión.

La aceptación requiere comprobaciones reproducibles de esos recorridos en cada
interfaz afectada. La automatización del navegador por sí sola no demuestra la fiabilidad con el teléfono bloqueado o en el
coche. Resolver los fallos de los recorridos de escucha existentes antes de ampliar
la compatibilidad con dispositivos.

### 2. Descubrir y guardar música

Hacer que el recorrido desde un resultado de búsqueda hasta una pista de la biblioteca correctamente
identificada y reproducible resista los fallos de los proveedores, con un progreso claro y errores recuperables.
Una biblioteca duradera sirve para escuchar, descubrir música y usar DJ, así como para los clientes externos.

Próximos trabajos:

- Leer las etiquetas ReplayGain / R128 existentes en los archivos junto con el análisis de sonoridad del motor.
- Mantener yt-dlp actualizado en los contenedores y añadir una prueba de extracción programada que
  detecte y notifique fallos en los servicios de origen.
- Ampliar la selección de fuentes de adquisición para que YouTube sea sustituible. Los módulos
  de proveedores de búsqueda existentes son una base útil; todavía no hacen que el
  recorrido principal de adquisición sea independiente de YouTube.

Entre las mejoras posteriores están las listas inteligentes basadas en el historial de escucha, las valoraciones,
el año, el género y los BPM, además de biografías e imágenes de artistas más completas.

### 3. Un DJ integrado

Mejorar la dirección musical, las peticiones, la edición de rutas y las transiciones como parte del
uso normal de Soundsible. Para salir de beta hacen falta pruebas de que las pistas solicitadas
se conservan tras los cambios de dirección, las ediciones de ruta producen una reproducción predecible, los conjuntos
de candidatos agotados se recuperan y los fallos de preparación preservan la sesión audible
y ofrecen una vía de recuperación. Evaluar la calidad de las transiciones mediante la escucha y
comprobaciones automatizadas, incluidos relevos conservadores cuando no haya análisis disponible.

La [guía de DJ](AUTO_MODE.md) describe lo que está disponible hoy. Estas condiciones de aceptación
no implican que el flujo de trabajo existente falte ni que ya se haya demostrado que está
listo para salir de beta.

### 4. Soundsible en tus dispositivos

Consolidar web/PWA y escritorio, e instalar y validar iOS por primera vez,
antes de ampliar la compatibilidad. Nuestro rumbo a largo plazo incluye un
cliente propio de Android, interfaces para coches y una experiencia para relojes, con interacciones adecuadas
para cada dispositivo. Un reloj no tiene por qué reproducir el espacio de trabajo de DJ del escritorio.

Evaluar la escucha sin conexión en nuestros propios clientes: descargar música de tu
servidor Soundsible, escuchar sin conexión y sincronizar al recuperarla.
El servidor sigue formando parte del producto aunque un cliente esté temporalmente sin conexión.
En Android, el alcance y la interfaz siguen siendo una
[decisión de producto pendiente](android/OFFLINE_DECISION.md) explícita; aún no se ha aprobado ninguna implementación
sin conexión.
Tratar el código existente de iOS como no validado y comprobar las descargas, los límites de almacenamiento,
la reproducción sin conexión y la reconexión en cada cliente compatible.

La [integración con coches](CAR_INTEGRATION.md) distingue los controles multimedia existentes de
la futura navegación por la biblioteca en las pantallas de los coches. Los permisos de las plataformas, la distribución y
la validación en dispositivos físicos siguen siendo dependencias para la entrega. La vía de AltStore PAL para iOS
sigue **sin verificar**; consulta [Distribución de iOS](IOS.md).

### 5. Compartir la experiencia de escucha

Live ya transmite el programa real, incluidas las transiciones de DJ. Lo siguiente es
hacer que la participación requiera una elección explícita y aclarar la selección del relé. Actualmente está
activado por defecto; [Live](LIVE.md) documenta ese comportamiento y enlaza a las instrucciones existentes
para alojar tu propio relé.

Los relés federados de Live siguen en fase exploratoria, sin compromiso de entrega.

### 6. Interoperabilidad y portabilidad

Mantener OpenSubsonic como otra forma de explorar y reproducir la misma biblioteca,
sin que sea necesario para disfrutar de la experiencia completa de Soundsible. Sus funciones estándar de biblioteca
no dan acceso a la búsqueda externa, la adquisición ni la sesión de DJ de Soundsible.

Incorporaciones previstas:

- Recomendaciones de ListenBrainz junto con las señales locales.
- Importación y exportación de M3U y OPML, junto con el flujo de trabajo existente de
  [migración de música](MUSIC_MIGRATION.md).

Las funciones sin conexión, para coches o para relojes de aplicaciones de terceros dependen de esas aplicaciones y
necesitan validación específica para cada cliente. Son opciones útiles, no sustitutos de
los planes de Soundsible para sus propios dispositivos.

## Límites del producto

- **Servicio basado en un servidor.** Un cliente independiente que no necesite un servidor Soundsible
  queda fuera del alcance. El servidor puede ejecutarse en el mismo equipo que el reproductor.
- **Autoalojado.** No se prevé un servicio de suscripción a Soundsible alojado por nosotros.
- **Música y el soporte existente para pódcasts.** El vídeo queda fuera del alcance.
- **Organización basada en metadatos.** No se prevé la navegación por un árbol de carpetas.
- **Adquisición para la escucha y la biblioteca.** Un descargador de propósito general
  queda fuera del alcance.

## Publicado

Consulta las [versiones publicadas](https://github.com/Arzuparreta/soundsible/releases) y el historial de commits
para ver los cambios entregados. Los compromisos futuros anteriores no son afirmaciones de funciones ya publicadas.

## Internos

Notas de trabajo, no compromisos. Pueden quedar obsoletas y no se mantienen como documentación para usuarios: [Contratos de capa](LAYER_CONTRACTS.md) · [Contrato de calidad premium](PREMIUM_QUALITY_CONTRACT.md) · [Plan de retrabajo del dispositivo](appliance-rework-plan.md) · [Plan de reconstrucción de UI](UI_REBUILD_PLAN.md).
