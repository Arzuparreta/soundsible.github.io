# Cola de análisis DJ: puerta de decisión sobre la prioridad

## Decisión

**No añadir prioridad en `dj-transition` en este bloque de trabajo.** El cambio propuesto no supera la puerta de aceptación del lado del consumidor: un análisis que se completa después de la respuesta de refinamiento no se consume para ese par. Una espera más corta en la cola, por sí sola, no garantizaría una transición mejor ni un menor uso de recursos.

Verificado contra `b6942eb` el 2026-09-22. No se modificó ninguna implementación del motor, la cola, el análisis, el audio ni los stores del cliente. Lo que se entrega es el script de reproducción, las mediciones en bruto y la caracterización en el navegador. Es un resultado de optimización negativo, no la finalización de la auditoría de recursos de ingeniería.

El endpoint lee primero cada análisis en caché y, si no está en caché, solicita el análisis y devuelve inmediatamente una alternativa conservadora. La función `maybeRefineTransition()` del cliente registra `refinedPair` antes de hacer la petición. Una respuesta `measured: false` deja intacta la transición segura, y los timeupdate posteriores para el mismo par no reintentan. Ni el endpoint ni el cliente esperan al trabajo en segundo plano que se acaba de solicitar. El docstring existente del endpoint, “never triggers a decode”, está desactualizado: el endpoint sí solicita trabajo en segundo plano.

Dar prioridad a ese trabajo después del fallo de caché no puede hacer que la respuesta espere a su resultado. Reordenar el análisis podría ayudar a otros llamadores futuros, pero este experimento no demuestra que les beneficie. Un contrato de reintento o de notificación sería un cambio funcional independiente, no una optimización transparente limitada a la cola.

## Script de reproducción y límites

`python scripts/benchmark_dj_queue.py` lanza un proceso hijo aislado nuevo para cada caso:

- gevent se parchea antes de importar el motor, Flask o las bibliotecas numéricas;
- directorios temporales de configuración, datos, caché, registros y música, y una cuenta aislada;
- la ruta de colección `dj-plan` actual con origen explícito y los manejadores de `dj-transition`;
- ejecutor real de dos workers, decodificación con FFmpeg, análisis numérico y caché SQLite;
- un WAV mono de tres minutos generado (11.025 Hz), reutilizado con identidades de pista
  independientes; cada análisis aceptado debe terminar con características utilizables en caché;
- candidatos relacionados deterministas y búsqueda por ruta local; el precalentamiento del grafo
  externo está desactivado. Sin proveedores externos, descargas reales ni archivos reales del usuario;
- casos en frío, en caliente, dos rutas consecutivas y cuatro sesiones independientes concurrentes
  en una misma cuenta. Cuatro sesiones **no** son cuatro navegadores ni cuatro cuentas.

El cliente de pruebas de Flask ejecuta los manejadores reales, no el transporte HTTP real ni el arranque completo del motor. La caracterización en el navegador es un experimento independiente con la app, el store y el audio reales, pero con respuestas de API controladas y un WAV silencioso con soporte de Range. Estos dos experimentos no constituyen una prueba de escucha conectada de extremo a extremo.

La instrumentación de la cola existe solo dentro del benchmark. Registra tiempos monotónicos de envío/inicio/fin para un máximo de 36 identidades de fixture, además de una sonda acotada del hub cada 10 ms. Las ejecuciones con la instrumentación activada y desactivada mantienen los mismos envoltorios de verificación; su diferencia mide la recogida de eventos, no toda la sobrecarga del arnés de pruebas. No se añadió registro en producción, ni índice persistente en memoria, ni endpoint público.

Cinco repeticiones alternan el orden de la instrumentación. Los datos en bruto contienen la revisión de la aplicación, el SHA-256 del benchmark, Python, el kernel y la CPU. Este host usó FFmpeg `n9.0.1`; las pruebas en navegador usaron Chromium `151.0.7922.34` con un viewport de 1366 × 768. Los archivos y el audio decodificado son sintéticos, no una copia de la biblioteca musical del usuario. La primera repetición coincidió con la breve caracterización en el navegador; se informan las medianas sin eliminar muestras. Esto no es una línea base controlada de los recursos de toda la máquina ni una estimación de la sobrecarga de la instrumentación en producción.

## Resultados

[Refinamiento temprano, datos en bruto](dj-queue-gate-results.jsonl): refinamiento 50 ms después de las respuestas de la ruta. Esto modela un salto temprano en la reproducción o un cambio de dirección, no el retardo normal antes del relevo de una pista de tres minutos.

Medianas de cinco ejecuciones instrumentadas; la espera no incluye la ejecución:

| Caso | Análisis | Máximo en espera | Todos los análisis terminados tras | p95 de espera en cola | Par listo en el primer refinamiento |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ruta en frío | 9 | 7 | 0,446 s | 0,283 s | 0/5 |
| Ruta en caliente | 0 | 0 | ya en caché | — | 5/5 |
| Cambio de ruta | 18 | 16 | 0,854 s | 0,752 s | 0/5 |
| Cuatro sesiones concurrentes | 36 | 34 | 1,549 s | 1,372 s | 0/5 |

Los dos análisis del par actual terminaron en una mediana de 0,109 / 0,593 / 1,269 s en los tres casos en frío. Todas las lecturas de diagnóstico **tras el vaciado de la cola** indicaron que el par estaba medido; esta lectura adicional es una observación, no un reintento que haga el cliente actual. Todos los análisis aceptados se completaron y el conjunto de pendientes quedó vacío. No se insertó ninguna espera artificial en la decodificación ni en el análisis.

[Refinamiento retrasado, datos en bruto](dj-queue-delayed-gate-results.jsonl) repite los tres casos en frío con un retardo de dos segundos. En las cinco ejecuciones de cada caso, el par ya estaba medido en la primera petición, tanto con la instrumentación activada como desactivada. Es una comprobación controlada de disponibilidad, no una propuesta de política de reintento a los dos segundos.

Los manejadores de refinamiento de las ejecuciones tempranas tardaron una mediana de 1,47–1,71 ms. Las medianas del p95 del retraso del hub instrumentado fueron de 1,5–2,0 ms en los casos en frío; son muestras cortas, no SLO de la API ni del hub. El PSS final del proceso fue de aproximadamente 155–161 MiB, **no la memoria pico**. La CPU y la E/S del proceso no incluyen los subprocesos de FFmpeg. No se afirma nada sobre la CPU del cliente, la energía, la continuidad del audio en los altavoces ni el ahorro en el árbol de procesos completo del servidor.

La duración mediana del experimento con la instrumentación activada frente a desactivada difirió en -3,4 %, -0,2 %, +6,7 % y -1,2 % en los cuatro casos. Estas diferencias, de signo variable y en ejecuciones cortas, no justifican afirmar que la sobrecarga sea nula. No se incluye ninguna instrumentación en producción. `wall_s` incluye el retardo intencionado del refinamiento y la observación tras el vaciado; `analysis_finished_at_s` es la última finalización real de un análisis, que es el valor usado arriba.

[Observaciones en Chromium](dj-refinement-browser-results.jsonl): cinco repeticiones de cada caso del consumidor, diez superadas sin reintentos:

- disponible en la primera respuesta: se aplica la confianza medida de 0,95;
- disponible solo después de esa respuesta: tres saltos/timeupdate posteriores para el
  mismo par siguen sin hacer una segunda petición; la confianza se queda en 0,18.

La prueba de navegador es explícitamente una caracterización del contrato actual, no un requisito de mantener para siempre la ausencia de reintento. Actualízala si se cambia deliberadamente ese contrato.

## Reproducción

```sh
venv/bin/python scripts/benchmark_dj_queue.py --repeats 5 --seconds 180 \
  --output /tmp/dj-queue-early.jsonl
venv/bin/python scripts/benchmark_dj_queue.py --repeats 5 --seconds 180 \
  --refine-delay 2 --scenarios cold switch four_sessions \
  --output /tmp/dj-queue-delayed.jsonl
cd ui_web
npx playwright test tests/browser/dj-refinement-audit.spec.ts \
  --project chromium-desktop --workers 1 --repeat-each 5 \
  --output /tmp/dj-refinement-browser
```

En este checkout, unos archivos de caché de Vite antiguos propiedad de root impedían arrancar normalmente el servidor de desarrollo. La ejecución en el navegador reutilizó un servidor aislado en el puerto 4187 con `cacheDir: /tmp/soundsible-dj-audit-vite` y `SOUNDSIBLE_UI_TEST_PORT=4187`. No se cambiaron permisos, no se recompiló el bundle y no se tocó el motor que escucha en el puerto 5005.

## Validación

- 70 ejecuciones aisladas del benchmark: 40 tempranas/en caliente y 30 retrasadas; todos los análisis
  aceptados guardaron en caché resultados utilizables y todas las lecturas de diagnóstico tras el vaciado tuvieron éxito.
- Verificación de los datos en bruto: los hashes de script almacenados coinciden con el script de reproducción confirmado;
  las marcas de tiempo están ordenadas, los totales de trabajos coinciden con las identidades aceptadas y nunca
  hay más de dos análisis activos.
- Chromium de escritorio: 10 superadas, sin reintentos ni casos omitidos.
- Suite completa de Python: 1509 superadas.
- `cd ui_web && npm test`: comprobación de tipos y 1123 pruebas / 115 archivos superados.
- Ruff para el nuevo script y `git diff --check` pasaron sin errores.

## Trabajo pendiente

Esta puerta se ejecutó antes de la matriz prevista de cargas de trabajo largas porque detectó un requisito previo del contrato del consumidor para la intervención propuesta. Las ejecuciones de 30 segundos de calentamiento / 120 segundos de escucha concurrente, el resto de la instrumentación de los ejecutores, los escaneos/descargas con bibliotecas reales, el muestreo separado de los árboles de procesos del cliente y del servidor y el estudio de memoria en sesiones largas **no se ejecutaron**. Siguen siendo trabajo de auditoría, no pruebas de aceptación de este resultado. No hay una comparación del planificador antes/después porque no se introdujo ningún planificador nuevo.

Estos resultados no justifican añadir límites de admisión globales, descartar análisis, fusionar pools ni cambiar las exportaciones. Para volver a plantear la prioridad de las transiciones, define primero cómo se puede consumir un análisis sin terminar antes de la confirmación, con cancelación al cambiar de par o de cuenta y un presupuesto acotado de reintentos/notificaciones. Como alternativa, mide la contención en los demás pools con independencia de este candidato descartado.
