# Integridad y recuperación de la biblioteca

## Propiedad del audio

Una biblioteca posee referencias; el audio gestionado puede pertenecer a varias cuentas. La eliminación de la referencia de una cuenta se confirma antes de la limpieza física. Las intenciones de limpieza residen en `instance.db` y sobreviven a los fallos. Una pasada periódica comprueba todas las bases de datos canónicas de las cuentas (incluidas las cuentas desactivadas); si el estado es desconocido o ilegible, el objeto se conserva. Los cambios de almacenamiento no redirigen las intenciones de limpieza antiguas.

Los reemplazos canónicos y la limpieza usan un único bloqueo reentrante de proceso/archivo, que se adquiere antes de las transacciones de SQLite. Los originales externos escaneados se toman prestados y nunca se eliminan. Las reparaciones conservan sus objetos anteriores hasta que las referencias canónicas se han trasladado. Una reasignación fallida conserva el original e informa del fallo.

Vaciar una biblioteca borra solo esa cuenta; ya no se enumera ni se elimina un bucket compartido. Las carátulas siguen sujetas a su política actual de gestión de referencias.

La validación usa bibliotecas temporales y archivos gestionados. No se usa ninguna biblioteca real para la inyección de fallos; el bloqueo de archivos de Windows sigue necesitando una aceptación nativa en esa plataforma.

## Descargas duraderas

La cola usa ahora `download_jobs` en `instance.db`. El arranque inicializa primero las cuentas, importa `download_queue.json` de forma transaccional y conserva el archivo de origen como `download_queue.json.sqlite.bak`. El marcador de migración hace que los reintentos sean seguros. Un JSON no válido detiene la migración con un error explícito y no se sobrescribe. Las filas heredadas sin propietario se asignan al administrador de la instancia.

La aceptación y las transiciones de estado se confirman antes de la respuesta HTTP correcta. El progreso sigue siendo volátil y nunca reescribe la cola duradera. Cada trabajo reclamado tiene un token de intento: ni un segundo reclamante, ni un trabajo cancelado, ni un worker anterior que llegue tarde pueden confirmar un resultado. Las descargas interrumpidas por un reinicio pasan a pendientes automáticamente; los trabajos fallidos siguen visibles hasta que se reintentan o se borran. Los trabajos de propietarios desactivados o eliminados no se pueden ejecutar.

Una pista descargada se guarda en un punto de control antes de incorporarla. La transacción de la biblioteca también registra el ID del trabajo en `library_operations`; si se repite después de esa confirmación, el trabajo termina sin volver a añadir la música (incluida la música eliminada desde esa confirmación). Una cancelación después de la adquisición pero antes de la incorporación impide la incorporación. Los archivos producidos por una adquisición interrumpida antes de su punto de control pueden requerir una nueva adquisición; no se garantiza reanudar byte a byte una transferencia de red parcial.

Los trabajos completados o cancelados y sus recibos de biblioteca se conservan siete días y se eliminan al arrancar. Los trabajos pendientes o fallidos nunca caducan en silencio. El apagado deja de aceptar reclamaciones y concede cinco segundos a las descargas activas antes de dejar su estado persistido para la recuperación al reiniciar. La salida forzada del proceso se cubre por separado de las pruebas de apagado ordenado; el corte repentino de alimentación y Windows nativo siguen sin probarse.

## Reversión y errores

Una versión anterior no puede ver los trabajos añadidos a SQLite. Antes de volver a una versión anterior, termina o cancela explícitamente los trabajos pendientes; restaurar solo la copia de seguridad JSON repetiría trabajo antiguo y omitiría el nuevo. No ejecutes el motor antiguo y el nuevo a la vez sobre el mismo directorio de estado. Guarda copias de seguridad de la instancia detenida para poder revertir.

Los conflictos de biblioteca devuelven HTTP 409; si la persistencia no está disponible, se devuelve HTTP 503. La vista de descargas espera la confirmación del servidor e informa del fallo en lugar de eliminar una tarea de forma optimista. Los eventos de Socket.IO perdidos se concilian mediante la actualización HTTP existente al reconectar.

Las exportaciones JSON portables siguen derivándose del SQLite confirmado. Los errores de exportación no convierten una confirmación duradera en un fallo; los destinos sin permiso de escritura se vuelven a intentar en las exportaciones posteriores. Si falla una reparación para todos los usuarios, se conserva el audio antiguo y se informa del fallo.

## Exportaciones compartidas y validación

Las exportaciones personales en modo multiusuario usan `users/<account>/library.json` en el proveedor de almacenamiento. El `library.json` global sigue siendo el catálogo del pool; una eliminación personal no debe sobrescribirlo con la colección, más pequeña, de esa cuenta. Las rutas de exportación de usuario único siguen siendo compatibles. La biblioteca SQLite personal sigue siendo la fuente autoritativa.

La comprobación aislada del coste de confirmación usó cinco cambios de título en caliente, SQLite real y exportaciones portables en un directorio temporal de Linux: mediana de 9,13 ms con 200 pistas y de 34,57 ms con 1000 pistas. Esto mide el coste que ahora se paga antes del acuse de recibo. No mide una aceleración respecto a la anterior respuesta diferida, ni el RSS total, ni el rendimiento real del disco en otra instalación, ni la calidad de reproducción. Una prueba de regresión confirma que 100 actualizaciones de progreso no realizan ninguna escritura en la cola duradera.

La aceptación automatizada incluye la propiedad de archivos por cuenta, las confirmaciones fallidas y el reintento de la limpieza física, la reversión de la admisión por lotes, la entrada de migración corrupta, las reclamaciones exclusivas de trabajos, el rechazo de workers tardíos, la recuperación desde el punto de control tras una salida forzada del proceso y la ruta idempotente de incorporación/cancelación del worker real. Las comprobaciones en navegador cubren la recuperación al recargar y el éxito/fallo de la cancelación duradera en Chromium móvil y de escritorio, con respuestas HTTP controladas.

Ejecución de aceptación: suite completa de Python, 1557 pruebas superadas; comprobación de tipos del frontend y 1142 pruebas unitarias superadas; seis casos de navegador en Chromium superados. El tratamiento final de errores de limpieza también superó 49 pruebas específicas de biblioteca/exportación y una nueva prueba de regresión de fallo de caché (nueve pruebas de ciclo de vida en total). Ruff y `git diff --check` pasaron sin errores.

## Escritores portables

El pool de descargas añade una pista adquirida con `commit_track`: vuelve a cargar el manifiesto actual del pool, sustituye solo el hash coincidente de esa adquisición y publica bajo un bloqueo de directorio entre procesos. Con dos descargadores independientes, se conservan las dos adiciones. Las exportaciones locales atómicas de Station y las copias locales del proveedor adquieren el mismo bloqueo de publicación, incluidos los alias mediante enlaces simbólicos. Este bloqueo es independiente del bloqueo del ciclo de vida canónico, de modo que las subidas al proveedor quedan fuera de la sección crítica de toda la instancia.

Los guardados completos del pool de descargas (incluida la sincronización en la nube) comparan la huella del archivo capturada al cargar con el archivo actual mientras mantienen el bloqueo de publicación. Una edición concurrente lanza `library_conflict` en lugar de sobrescribirla; vuelve a cargar y repite la operación. Los manifiestos corruptos fallan al cargar en lugar de reinterpretarse como un pool vacío. Las adquisiciones ya tienen un punto de control duradero antes de este paso y pueden reintentarse. Estas reglas coordinan escritores locales que cooperan entre sí; no son un bloqueo distribuido para programas externos ni para clientes remotos de almacenamiento de objetos. El pool no es una biblioteca personal: la pertenencia canónica a las cuentas sigue en SQLite y las exportaciones personales siguen siendo instantáneas derivadas. La aceptación nativa en Windows sigue pendiente.

La sincronización en la nube mantiene ahora su propio modelo y su propio token de revisión durante toda la operación de red. Una descarga en el mismo descargador no puede avanzar ese token en su nombre; la sincronización sigue teniendo que comparar la revisión exacta que leyó. Las adquisiciones reutilizan un modelo residente solo cuando la huella en disco sigue coincidiendo, lo que evita cargar un segundo modelo completo en cada descarga cuando el manifiesto no ha cambiado.
