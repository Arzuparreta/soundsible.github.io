# Sincronización del catálogo: compartir el trabajo y confirmar la última revisión

Las actualizaciones repetidas de la biblioteca podían solicitar varias veces la misma proyección de artistas/géneros/años. `syncCatalog()` devolvía `false` inmediatamente a los llamadores que llegaban durante una petición en curso y después ejecutaba una ronda de seguimiento cuyo resultado nadie esperaba. Mientras tanto, el éxito del primer llamador se rechazaba si se había producido otra actualización de la biblioteca, aunque su revisión no hubiera cambiado. La siguiente actualización volvía a pedir la proyección.

El coordinador comparte ahora una sola promesa a lo largo de todas las rondas necesarias. Si el token de revisión es igual, se reutiliza la ronda actual; si ha cambiado, se solicita una única ronda de seguimiento para el objetivo más reciente. Los resultados que quedan obsoletos antes de publicarse se descartan. Las tres peticiones se resuelven antes de iniciar otra ronda, también cuando fallan. Solo una ronda completa y correcta publica la proyección.

La biblioteca pasa su revisión aceptada y confirma el éxito usando una generación de invalidación independiente más la igualdad de revisión. Una actualización posterior de la biblioteca sin cambios ya no invalida un éxito útil. El trabajo pendiente sigue recibiendo aviso cuando el manifiesto vuelve de B a una A ya confirmada. La carga de la biblioteca no espera a la carga del catálogo.

La invalidación desvincula la operación antigua inmediatamente. La nueva generación puede empezar mientras terminan las peticiones abandonadas; su contenido y su limpieza se ignoran. Esto permite intencionadamente hasta seis peticiones durante un cambio de cuenta, en lugar de hacer que la nueva cuenta espere detrás de tres peticiones antiguas. Las peticiones existentes no se abortan. La invalidación conserva un catálogo ya disponible, porque las modificaciones de listas de reproducción también invalidan sin volver a pedir los datos inmediatamente; el desmontaje de cuenta existente sigue siendo el responsable de borrar los datos de la cuenta.

Si falla, se conserva el catálogo anterior y se reintenta en la siguiente actualización de la biblioteca, incluso con un manifiesto sin cambios. No hay reintento periódico. Los motores sin revisiones siguen necesitando una ronda de seguimiento tras peticiones de actualización solapadas. No han cambiado los endpoints, los esquemas de respuesta, el análisis ni el comportamiento de la reproducción.

## Mediciones controladas de antes/después

[Observaciones en bruto](catalog-sync-results.jsonl). Línea base:
`64d76c3a2d5f33c36ba45a9d37d17fcfe0ee2cee`; los hashes del código posterior están registrados en el archivo. Ambas ejecuciones usan los stores reales de biblioteca, catálogo y núcleo. Solo se simulan las llamadas a la API. Esto es tiempo virtual determinista, **no latencia de red medida, CPU del servidor, energía ni tráfico de una biblioteca real**.

Tres respuestas de proyección tardan 100 ms cada una, en paralelo. Las actualizaciones del manifiesto se producen a los 0, 10, 20 y 250 ms; las observaciones se detienen a los 500 ms. El caso de fallo hace fallar la petición de artistas a los 10 ms y retiene la de años hasta los 200 ms, y después reintenta a los 250 ms. El caso de llamadores en espera llama directamente al catálogo a los 0 y 10 ms.

| Escenario | Peticiones antes → después | Bytes JSON del fixture antes → después | Publicaciones antes → después |
| --- | ---: | ---: | ---: |
| Misma revisión | 9 → 3 | 483 → 161 | 3 → 1 |
| A → B → C | 9 → 6 | 483 → 322 | 3 → 1 |
| Cambio de cuenta, mismo token | 9 → 6 | 483 → 322 | 2 → 1 |
| Fallo parcial y reintento | 6 → 6 | 247 → 247 | 1 → 1 |
| Sin revisión | 9 → 9 | 528 → 528 | 3 → 2 |
| Dos llamadores en espera concurrentes | 6 → 3 | 322 → 161 | 2 → 1 |

Con la misma revisión, los datos del catálogo están disponibles a los 100 ms en ambas ejecuciones; el cambio elimina trabajo redundante, no reduce la latencia de la primera respuesta. En A → B → C, C está disponible a los 200 ms en ambas; el código nuevo no publica la A obsoleta. La nueva cuenta publica a los 110 ms en lugar de a los 200 ms en este fixture. El segundo llamador en espera devolvía antes `false` a los 10 ms; ahora ambos devuelven `true` a los 100 ms, cuando los datos necesarios existen realmente.

Los bytes son las codificaciones UTF-8 de los cuerpos JSON controlados de las respuestas correctas de los endpoints, sin contar cabeceras, compresión ni cuerpos de respuestas fallidas. Los porcentajes de ahorro de estas trazas no deben generalizarse a todo el uso ni al consumo de recursos del servidor.

## Reproducir y validar

Desde `ui_web/`:

```sh
SOUNDSIBLE_CATALOG_MEASUREMENTS=/tmp/catalog-sync.jsonl \
  npx vitest run src/stores/catalogSync.test.ts -t 'measures controlled'
npm test
npx playwright test tests/browser/catalog-sync.spec.ts \
  tests/browser/library-revisions.spec.ts --project chromium-desktop \
  --workers 1 --output /tmp/catalog-sync-browser
```

La prueba de medición hace intencionadamente solo aserciones compatibles con la línea base; las demás pruebas exigen el comportamiento corregido. Para reproducir la traza histórica, usa un checkout separado de la revisión de la línea base, copia en él el `catalogSync.test.ts` actual, instala las dependencias del lockfile y ejecuta solo `-t 'measures controlled'`. Nunca sustituyas los stores del checkout en uso para medir el comportamiento antiguo. En esa traza se hace un cast del argumento de revisión para que la función antigua, que no recibe argumentos, pueda ejecutar el mismo escenario.

Los casos de regresión cubren además A → B → A, respuestas antiguas que llegan antes y después de la nueva cuenta, una invalidación antes de la microtarea inicial, peticiones fallidas dentro de una misma ronda, la ausencia de reintento automático, excepciones síncronas de la API, suscriptores reentrantes de carga/publicación y la invalidación provocada solo por listas de reproducción.

Validación: comprobación de tipos y 1138 pruebas del frontend en 116 archivos; siete pruebas de escritorio en Chromium, incluida la cobertura existente de 304/revisión con HTTP real. Los cuatro escenarios de navegador nuevos usan el código real de fetch/API/store con respuestas controladas, no un motor en ejecución. Un servidor Vite aislado en el puerto 4187 con el directorio de caché `/tmp/soundsible-catalog-vite` evitó los archivos de caché antiguos propiedad de root; no hizo falta compilar ni reiniciar el motor de producción. `git diff --check` pasa sin errores. No cambió ninguna implementación en Python, así que no se volvió a ejecutar la suite de Python para este cambio, que afecta solo al frontend.

Los endpoints del catálogo siguen sin proporcionar un token de instantánea común. Este cambio coordina las peticiones con la última revisión *observada* de la biblioteca; no añade consistencia transaccional entre endpoints ni detecta mutaciones del servidor antes de la siguiente actualización de la biblioteca.
