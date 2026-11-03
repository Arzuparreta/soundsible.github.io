# Recuperación, propiedad de los escritores y calidad bajo carga en segundo plano

Alcance: cuatro objetivos de calidad de construcción en una sola rama, basada en
`main` fusionado en `66fa34d`. No se reinició ni se modificó ninguna instancia de producción. Toda
la inyección de fallos y las pruebas de carga usan directorios desechables.

## Entregado

1. **Copia de seguridad y restauración offline verificadas.** El nuevo `python -m shared.instance_backup`
   crea un directorio privado con sumas de comprobación, copia el WAL confirmado de SQLite mediante
   la API de backup de SQLite, valida las bases de datos y restaura solo en una raíz nueva.
   Los ensayos cubren estado real de cuenta/contraseña/favoritos/listas/descargas,
   audio/carátulas, estado dañado después de la copia, migración del formato antiguo de cuentas,
   copias corruptas, destinos recursivos y credenciales de almacenamiento cifradas
   con una identidad de máquina distinta. [Contrato](../engineering/instance-recovery.md).
2. **Propiedad explícita del escritor portable.** Un lock local compartido de publicación,
   revisiones optimistas de archivo y commits de adquisición dirigidos impiden que snapshots
   ODST obsoletos borren ediciones intermedias de Station/descargas. La sincronización en la nube tiene
   su propio snapshot/token independiente incluso cuando una descarga usa el mismo downloader.
   Las pruebas incluyen procesos independientes y manifiestos corruptos.
3. **Mejora medida de la carga en segundo plano.** El manejo de HTTP Range de producción
   con SQLite/exportación y trabajo DJ reales expuso bloqueos del hub en los vaciados
   durables de la exportación. El fsync en un worker nativo mantiene el hub disponible y conserva la semántica
   de fallos del vaciado. La vida útil de los descriptores y la cancelación se prueban en un
   proceso hijo parcheado. Los diagnósticos de cola retienen solo registros de tiempos activos
   y contadores agregados; cancelar trabajo en cola libera su identidad de tarea.
4. **Operación explícita de edición de pistas.** Las ediciones de metadatos y marcas actualizan una
   fila y una revisión conocidas en lugar de preparar cada pista/lista/cabecera. Se conservan los invariantes
   existentes de catálogo/búsqueda/fuente pública y las exportaciones portables;
   si la prueba no es válida, se recurre al escritor completo canónico ya establecido.
   [Contrato y coste](../performance/track-metadata-patch.md).

## Evidencia medida

[Matriz de reproducción](../performance/playback-load.jsonl): 11 casos aislados, 5.382
respuestas de rango verificadas, sin fallos de respuesta ni de contenido. Alternando fsync síncrono
y en worker nativo con 200 pistas, dos clientes y tres ejecuciones de diez segundos por
ruta, se obtienen estas medianas entre ejecuciones:

| Métrica | Vaciado síncrono | Vaciado en worker nativo |
| --- | ---: | ---: |
| Retraso del bucle de eventos p95 | 99,19 ms | 1,09 ms |
| Petición de rango p95 | 4,39 ms | 3,19 ms |
| Peticiones de rango completadas | 200 | 369 |

Esto mejora la disponibilidad del bucle de eventos, no necesariamente la reproducción audible. La
ejecución con carga de un minuto y 1.000 pistas sirvió 2.086 rangos correctos, p95 3,82 ms,
con p95 del bucle de eventos de 19,89 ms y máximo de 175,15 ms. El caso DJ en frío aún alcanzó
un retraso máximo del hub de 293,96 ms. Estos costes síncronos residuales siguen visibles;
no se afirma que no haya bloqueos ni se introduce una nueva política global de admisión.

El benchmark de edición de título incluye dos exportaciones locales. Con 10.000 pistas, la mediana
del guardado completo fue de 600,8 ms frente a 517,7 ms con ediciones explícitas. Con 1.000 pistas
ambos fueron de 133,9 ms. Unas muestras secuenciales pequeñas son evidencia de coste, no una aceleración
universal; las huellas públicas/de búsqueda y las exportaciones siguen recorriendo la biblioteca.

## Límites de aceptación

- La copia de seguridad requiere que todos los escritores estén detenidos; `--stopped` es una afirmación del operador,
  no un control automático del servicio. El audio remoto, las carpetas externas escaneadas y
  los symlinks requieren copias separadas. Se conservan las rutas absolutas de almacenamiento.
- La restauración no ejecuta migraciones. Las versiones antiguas necesitan su identidad de máquina original
  si no pueden leer el nuevo archivo opcional de clave de credenciales.
- La revisión/bloqueo de archivos coordina escritores locales que cooperan. No es una
  transacción de un almacén de objetos remoto ni una protección frente a ediciones externas arbitrarias.
- El arnés de carga ejecuta código real de transporte/edición/exportación/análisis, pero con búsqueda de
  identidad/ruta de fixtures y un escaneo sintético del sistema de archivos. No reproduce
  descargas remotas, visibilidad del navegador, Live, transiciones DJ completas, sesiones de
  muchas horas ni el comportamiento físico en iPhone/CarPlay/Windows.
- No se ejecutó ningún build del bundle de la interfaz; la validación del frontend usa el gate
  `npm test` del repositorio. No se cambió manualmente ninguna declaración de versión.

## Validación

- Suite Python completa: `1616 passed in 70.79s (0:01:10)`.
- Frontend `npm test`: typecheck y 1.179 pruebas en 121 archivos correctas.
- Ruff en todo el repositorio y `git diff --check` correctos.
- Pruebas de durabilidad/cancelación/lock de publicación con procesos parcheados correctas.
- El estado de CI se informa por separado en la PR; el éxito local no equivale a completar CI.
