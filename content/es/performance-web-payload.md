# Payload web y runtime autenticado

Este cambio separa el bootstrap de login/invitación del cliente autenticado y mantiene sin cargar el reproductor NORMAL completo hasta que su superficie se abre por primera vez. Cerrar esa superficie conserva su vista montada y no detiene la reproducción. Las rutas y los paneles no son dueños del runtime de reproducción. La autenticación es dueña de su ciclo de vida: cerrar sesión cierra el socket, los handlers de Media Session, los reporters, los temporizadores, los decks/grafo de audio y la captura; el trabajo diferido de ese ciclo de vida no puede modificar la siguiente cuenta. Los cambios de identidad de cuenta sustituyen el runtime aunque ambas cuentas estén autenticadas; el precalentamiento de descubrimiento también descarta las respuestas antiguas antes de cambiar señales o la caché de la cuenta.

Los stores se componen en `src/stores/index.ts` mediante puertos de dominio tipados. Sus acciones públicas siguen siendo compatibles. El audio se compone en `src/lib/audio.ts` a partir de los módulos de transporte, grafo, mezclador y captura; se conservan los algoritmos existentes de transición, interrupción, nivelación y podcasts. El estado puro y las preferencias visuales no pueden alcanzar estáticamente el runtime de audio/socket. Las pruebas de límites lo hacen cumplir.

## Presupuesto del bundle

`web-payload-baseline.json` registra la entrada previa al cambio y su cierre de dependencias estáticas en `d608588`. `web-payload-after.json` registra el cierre del bootstrap del manifiesto de producción y su unión con `AuthenticatedPlayer`. Ambos cuentan JS/CSS, excluidos HTML, fuentes, diccionarios de idioma, rutas diferidas y API. La comprobación de CI `node scripts/check-payload.mjs` exige al menos un 50 % de reducción gzip para el login y un 15 % para la biblioteca autenticada, con gzip de nivel 9. `--record` actualiza el artefacto de revisión tras la actualización automática del bundle del motor.

Los archivos gzip/Brotli generados en el build eliminan el trabajo de compresión en el momento de la petición. La negociación HTTP mantiene los tipos MIME, los ETag específicos de cada representación, `Vary: Accept-Encoding` y los rangos de bytes sobre la representación identity. Los bundles existentes sin sidecars siguen funcionando. La API/medios y el HTML de escritorio con el token de propietario inyectado no entran en la ruta de assets comprimidos.

## Medición de red repetible

Ejecutar el fixture contra la línea base y contra el dist de producción actual; después:

```sh
PYTHONPATH=. .venv/bin/python docs/performance/payload_fixture.py --dist /path/to/baseline/dist --port 4181
PYTHONPATH=. .venv/bin/python docs/performance/payload_fixture.py --dist ui_web/dist --port 4182
cd ui_web
node scripts/measure-payload.mjs http://127.0.0.1:4181 http://127.0.0.1:4182 ../docs/performance/web-payload-network.json
```

Usar terminales separadas para los dos servidores fixture. Para reproducir el bundle antiguo, usar un worktree detached en la revisión de la línea base e invocar `ensure_ui_dist` con su ruta `ui_web`. El fixture nunca arranca un motor ni cambia datos reales del usuario. Cinco contextos nuevos de Chromium por pantalla miden la navegación en frío y la recarga en el mismo contexto. Los service workers se bloquean en esta medición para aislar la caché HTTP; se evita interceptar peticiones porque la interceptación de Playwright desactiva la caché. El informe de recursos separa JS, CSS, fuentes, API, socket y otras transferencias. `--constrained` registra tres repeticiones con 150 ms de latencia, 1,6 Mbit/s de bajada, 0,75 Mbit/s de subida y la CPU de Chromium ralentizada 4x; las condiciones se guardan en su JSON. `ready_ms` espera al evento load de la navegación y al locator visible de login/navegación; no es una medición de first paint ni de LCP. Es un resultado de laboratorio local, no una promesa sobre Internet ni sobre dispositivos físicos.

Medianas locales medidas en `web-payload-network.json` (todas las transferencias de respuestas de recursos, excluido el documento de navegación):

| Pantalla | Antes en frío | Después en frío | Antes en caliente | Después en caliente |
| --- | ---: | ---: | ---: | ---: |
| Login | 971.243 B | 201.870 B | 636 B | 636 B |
| Biblioteca | 920.328 B | 262.408 B | 3.737 B | 3.737 B |

El fixture antiguo sirve el bundle original sin sidecars; el nuevo negocia las variantes Brotli generadas reales. Esto mide la mejora combinada del bundle y de HTTP, mientras que el presupuesto del manifiesto aísla el tamaño gzip del bundle. Las medianas locales en frío desde la navegación hasta la UI visible fueron 72 -> 42 ms (login) y 78 -> 118 ms (biblioteca). El retraso local de la biblioteca se debe a la importación autenticada diferida y no es una afirmación sobre la velocidad del dispositivo. La pantalla autenticada pide más módulos pequeños (22 frente a 14 recursos JS), así que la evidencia con red limitada se registra por separado.

En las condiciones limitadas registradas, las medianas en frío hasta la UI visible fueron 4.793 -> 971 ms para el login y 4.837 -> 2.080 ms para la biblioteca. Las medianas en caliente fueron 559 -> 441 ms y 565 -> 454 ms respectivamente. Son tres repeticiones contra un fixture con la biblioteca vacía, registradas en `web-payload-network-constrained.json`; no son mediciones en móviles físicos ni con proveedores en vivo.

## Shell offline acotado

El worker identifica cada shell por un hash de build basado en el contenido fuente, fija sólo sus recursos de bootstrap y sólo se activa cuando todo el bootstrap está en caché. Conserva la generación completa actual y la anterior; cada generación admite como máximo 8 MiB de cuerpos de recursos y 256 entradas de recursos, más su pequeño registro de metadatos. Los recursos opcionales sólo se admiten después de usarse, con expulsión FIFO y rechazo de los que superan el tamaño. Adopta los recursos usados antes del primer controlador sin precargar otras rutas. Las respuestas de la API de cuenta, los medios, las peticiones de rango y el HTML de escritorio se omiten. Nunca se eliminan entradas de CacheStorage no relacionadas. Un fallo de almacenamiento deja intactas las respuestas de red utilizables. Los cambios en worker/public/branding invalidan el bundle automático de producción.

El shell anterior puede volver a abrirse sin conexión y usar los chunks visitados previamente; una primera sesión sin conexión muestra la recuperación sin importar la reproducción. Las cargas fallidas de módulos nativos pueden quedar rechazadas en el mapa de módulos del navegador, incluso entre recargas de WebKit. El bootstrap y la vista NORMAL compilan cada uno una URL de entrada de recuperación distinta. Su primer reintento usa esa entrada; un reintento posterior del bootstrap recarga el shell para recuperarse de despliegues obsoletos. Un fallo de la vista diferida mantiene la reproducción en marcha y ofrece reintentar sin recargar la página. Sus controles de recuperación quedan apartados de los controles del reproductor flotante.

El shell y los assets públicos en caché se emparejan con independencia de las cabeceras `Vary` del transporte, porque su contenido decodificado no varía según Origin ni según la compresión. Las respuestas de cuenta y de escritorio nunca entran en estas cachés.

## Límite de aceptación

Las pruebas unitarias/de servidor y los perfiles completos de navegador Chromium/WebKit cubren los contratos existentes de reproducción, cola, DJ, podcasts, biblioteca, accesibilidad y rutas. Las pruebas de arranque de producción ejercitan recursos retrasados/fallidos y la reapertura sin conexión en Chromium. La navegación de documentos sin conexión en Playwright WebKit sigue excluida porque su navegador falla antes de devolver el documento en caché; la política del worker se prueba por separado. La aceptación acústica en iPhone, Bluetooth y CarPlay físicos sigue siendo una comprobación en dispositivo, no una conclusión que se pueda sacar de la automatización del navegador.

Bundle final validado: 1.320 tests unitarios; suites completas de navegador con 278 superados en Chromium y 269 en WebKit (66/75 exclusiones por perfil); arranque de producción/PWA con 78 superados y 6 exclusiones en los cuatro perfiles. Las comprobaciones de Python relevantes y `ruff check .` pasan. Las suites de navegador se ejecutaron en secuencia con un worker.
