# Transporte de reproducción bajo carga en segundo plano

El banco de pruebas aislado usa el manejador HTTP Range local de producción, el orden de patch de gevent, ediciones canónicas y exportaciones portables reales, lecturas/hash del sistema de archivos y el análisis DJ de un archivo PCM sintético. Crea raíces temporales nuevas de runtime/caché en el sistema de archivos del repositorio. No se toca ninguna biblioteca real, servicio en vivo ni proveedor. Los clientes HTTP verifican cada rango devuelto contra los bytes de origen.

```sh
PYTHONPATH=. .venv/bin/python scripts/benchmark_playback_load.py \
  --scenario loaded --tracks 1000 --clients 2 --seconds 60
PYTHONPATH=. .venv/bin/python scripts/benchmark_playback_load.py \
  --scenario loaded --tracks 200 --seconds 10 --blocking-fsync
```

Los escenarios son `idle`, `normal`, `loaded` (ediciones y recorrido del sistema de archivos) y `dj` (loaded más seis peticiones de análisis en frío). `--profile hdd` ejercita el perfil de admisión con un solo worker; no emula otro disco físico. Los trabajos finitos usan el orquestador real, así que el perfil HDD ejecuta ambas cargas de trabajo. No hay sleeps sintéticos *dentro* del trabajo medido de sistema de archivos/base de datos. El ritmo entre operaciones y peticiones define la carga ofrecida.

El control `--blocking-fsync` sustituye sólo el helper de vaciado por su implementación síncrona anterior. Por lo demás, el código de la aplicación es idéntico. Los resultados registran hashes de las fuentes, tiempo transcurrido, latencia de los rangos verificados, retardo del bucle de eventos, CPU/PSS del proceso, contadores de escritura física, ocupación de las colas y trabajo completado. Que las cachés de la aplicación sean nuevas no implica que la caché de disco del SO esté en frío. Comparar los casos en un host sin otra actividad; no ejecutar suites de tests a la vez que las mediciones.

## Cambio justificado por la medición

Las exportaciones portables llamaban a `os.fsync` en el hub de gevent. Los vaciados duraderos lentos detenían peticiones no relacionadas aunque la reproducción no adquiriera el bloqueo de escritura de la biblioteca. Los procesos del motor con patch esperan ahora de forma cooperativa a que un worker nativo haga ese mismo fsync. La publicación sigue esperando a que tenga éxito y después renombra; los errores de fsync conservan el archivo anterior. Un descriptor duplicado pertenece al worker, así que cancelar al llamador no puede cerrar ni reutilizar un descriptor con un vaciado activo. Los procesos CLI sin patch mantienen la implementación directa.

El orquestador expone un `resource_snapshot()` agregado sin conservar el historial de trabajos completados. Cancelar un future en cola borra ahora su identidad y su registro de tiempos para que pueda admitirse un trabajo de sustitución. Los pools siguen siendo independientes; no se ha introducido ninguna política de prioridad arbitraria ni expulsión de la cola.

## Evidencias y límites

La [matriz en bruto](playback-load.jsonl) contiene ejecuciones alternas de control/candidato, transporte idle y normal, análisis DJ en frío, admisión HDD y una ejecución con carga de un minuto. Ver el resumen de la auditoría para la comparación medida y la validación final.

Son mediciones de transporte HTTP y de planificación del servidor, **no mediciones de reproducción audible ni de batería**. La autenticación, el core y la búsqueda de rutas están ligados al fixture aislado; el streaming de producción y la generación de respuestas Range se ejecutan sin cambios. La carga del sistema de archivos calcula el hash del fixture, no un pipeline completo de importación de carpetas. No están representados las descargas remotas, los proveedores lentos, el navegador en primer/segundo plano, la corrección del traspaso NORMAL/DJ, Live ni la aceptación en iPhone/CarPlay físicos. Eso requiere cargas de trabajo y dispositivos aparte. SQLite, el trabajo con JSON, FFmpeg y otras rutas síncronas todavía pueden detener el hub. Este cambio elimina la causa medida, el vaciado de las exportaciones; no garantiza que no haya ninguna parada.
