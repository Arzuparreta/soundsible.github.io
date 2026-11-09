# Almacenamiento y distribución de carátulas

Soundsible conserva la mejor carátula disponible fuera del archivo de audio. La
reparación del audio puede seguir reduciendo las imágenes incrustadas sin disminuir la calidad de la interfaz.
Los bytes originales se almacenan una sola vez, según su SHA-256, en `data_dir/artwork/objects`;
`data_dir/artwork/index.sqlite3` contiene las referencias, dimensiones, procedencia,
revisiones, elecciones específicas de cada cuenta, observaciones de las fuentes y progreso de recuperación. Haz copias de seguridad y restaura **todo el directorio de
carátulas**, junto con la biblioteca y `config_dir/.artwork-selection-key`. La copia de seguridad documentada del volumen de datos de Docker
ya lo incluye. Detén el servicio durante una copia de seguridad del sistema de archivos.

Las variantes se guardan en `cache_dir/artwork` y se pueden eliminar mientras el servicio está
detenido. Los originales no se pueden reconstruir a partir de estas imágenes más pequeñas. Los originales
retirados se conservan, incluso después de que una pista cambie de identidad; este cambio no incluye
una limpieza automática destructiva de elementos sin referencias.

## Bibliotecas existentes

Un proceso automático en segundo plano se inicia tras el arranque de la API. Primero conserva las
carátulas locales incrustadas y las imágenes coincidentes de mayor tamaño de la caché antigua. Para las pistas
marcadas como carátulas de YouTube, comprueba la imagen de mayor resolución de ese vídeo
y solo acepta una imagen más grande con proporciones compatibles y una coincidencia
perceptual conservadora. No busca por título ni sustituye la carátula por la oficial del álbum.
Las carátulas manuales, eliminadas o de origen desconocido nunca activan la recuperación externa.
Una edición manual tiene prioridad sobre un resultado de recuperación en curso.

La recuperación se puede reanudar: un solo proceso, como máximo una solicitud externa por segundo,
periodos de reintento limitados con espera exponencial y compatibilidad persistente con `Retry-After` del proveedor.
Los fallos y las mejoras no disponibles se registran con fechas límite de reevaluación en lugar de reintentarse en cada arranque. Nuevas evidencias relevantes sobre la fuente pueden reabrir la evaluación. Si no hay una fuente mejor disponible, se conserva la imagen existente.
Una coincidencia perceptual es una heurística conservadora, no una prueba de identidad de la imagen.
Los diagnósticos del índice distinguen conservación, mejora y fallos;
los registros de depuración muestran los totales por estado, los bytes almacenados y el tiempo transcurrido. El proceso no
descarga audio remoto y las solicitudes HTTP de imágenes nunca consultan a los proveedores.

## Contrato HTTP

`GET /api/static/cover/<track_id>` conserva el comportamiento de imagen original y
devuelve el tipo MIME real. `size=thumb` sigue siendo compatible. Los nuevos valores de `size`
son `160`, `320`, `640`, `960` y `1280`; `fit` es `original` (predeterminado) o
`square`. Las variantes cuadradas se recortan antes de redimensionarse. Ninguna variante amplía la imagen de origen.
Las variantes JPEG usan calidad 90 y orientación normalizada.

Las respuestas de la biblioteca añaden los campos opcionales `artwork_revision`, `artwork_width` y
`artwork_height`, además de `artwork_scope`, específico de cada cuenta. La interfaz los usa para crear `srcset` con la resolución cuadrada realmente
disponible. `rev` identifica la revisión de la carátula; las respuestas de la revisión
actual se pueden almacenar en una caché privada durante un año con `ETag`. Una revisión obsoleta
redirige a la actual sin almacenamiento inmutable en caché. Las solicitudes sin versión y los marcadores de posición se revalidan de forma privada, incluso después de un cambio de cuenta. Un fallo temporal de procesamiento devuelve 503 con `no-store` y `Retry-After`, en lugar de almacenar en caché una carátula ausente. El contenido original se deduplica; las variantes
se generan una sola vez por hash de contenido, tamaño, recorte y revisión de transformación, con
una sola transformación activa en un proceso hijo que se inicia bajo demanda, con admisión limitada y un plazo máximo que incluye la espera en cola. El mismo proceso hijo valida las nuevas imágenes maestras fuera del bucle HTTP cooperativo. Las herramientas de línea de órdenes sin gevent mantienen el procesamiento local.

El componente de imagen compartido mide su espacio, deja que el navegador elija la densidad
y carga de forma diferida las carátulas fuera de pantalla. NORMAL y DJ comparten la misma ruta de renderizado.
Está reservado para superficies grandes (zona principal del reproductor, cuadrículas de álbumes, artistas y listas de reproducción,
tarjetas de búsqueda). Las filas de las listas mantienen un fondo CSS con la variante `thumb` de 320 px:
su carátula mide como máximo 60 píxeles CSS, que esa variante ya cubre a 3x, y
las filas de las colas no están virtualizadas: un `<img>` medido por fila bastó
para dejar a WebKit sin tiempo para generar fotogramas en un ejecutor móvil.
Las imágenes de catálogos externos conservan las URL proporcionadas por sus proveedores. Una adquisición desde un catálogo
puede conservar la imagen del álbum elegida explícitamente tras la verificación del servidor y
un comprobante autenticado vinculado a la cuenta. La publicación del audio no espera a que termine;
el proceso de recuperación trata esa elección persistente. Las carátulas editadas o eliminadas por el usuario
pertenecen a esa cuenta y prevalecen sobre la fuente compartida. Se conservan las referencias manuales
globales antiguas cuya atribución es ambigua. No se introduce ningún proxy de URL arbitrarias.
Los cambios de identidad de pistas personales copian solo las elecciones de esa cuenta; los comprobantes pendientes se verifican
respecto al vídeo actual de la pista entrante. El trabajo persistente de la cola se marca como completado
solo después de registrar su elección opcional de carátula, también al repetir la operación tras un cierre inesperado.

Las descargas de imágenes públicas usan un proceso hijo independiente que se inicia bajo demanda, con una sola admisión y una
sesión con conexiones reutilizables, sin credenciales ni proxies heredados del entorno. El proceso padre supervisa
la operación completa, incluidos el DNS y las cabeceras de la respuesta, y termina el proceso hijo y recoge su estado
al alcanzar el plazo máximo o cancelarse. Una descarga lenta nunca ocupa el proceso hijo de
transformación. Puede haber dos intérpretes relacionados con las imágenes; ambos terminan cuando quedan inactivos.
El plazo máximo de la operación excluye un margen limitado para recoger el estado del proceso terminado. Las reservas de los
archivos de preparación abarcan tanto al proceso padre como al hijo, incluso si el padre termina.

La búsqueda de YouTube usa las miniaturas candidatas declaradas que ya figuran en las respuestas
del extractor. La resolución conserva las observaciones de las fuentes públicas; la respuesta existente del estado de
la vista previa puede incluir una miniatura principal mejor del mismo vídeo. Si una mejora opcional
falla, se conserva la imagen anterior. Las URL del extractor deducidas sin dimensiones y los
fotogramas alternativos del vídeo no tienen prioridad sobre las referencias principales conocidas.
Las filas pequeñas de vista previa conservan su miniatura original en lugar de solicitar la
mejora de gran tamaño. Las superficies CSS grandes colocan la imagen anterior debajo de la mejorada.

Consulta [arquitectura y validación](audits/2026-11-07-artwork-requests.md) para conocer
la responsabilidad sobre los recursos, la cancelación, la recuperación y los límites restantes de las plataformas.

## Muestra histórica de validación local

Una muestra de 100 imágenes de la caché local existente tuvo una media de 289,9 KiB por
original. Las variantes JPEG cuadradas tuvieron una media de 8,2 KiB a 160 px, 25,9 KiB a 320 px,
56,0 KiB a 640 px y 65,3 KiB a 960/1280 px (estos últimos tamaños convergen porque
las imágenes de origen no se amplían). El tiempo medio de generación local fue de 7,89 ms por variante;
una consulta de una variante ya en caché tardó 0,019 ms. Son mediciones del sistema de archivos en el
equipo de desarrollo, no latencia HTTP ni una garantía para otra biblioteca.
