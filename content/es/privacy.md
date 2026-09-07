# Contrato de telemetría y privacidad Soundsible

**Estado:** Activo. Este contrato se aplica al aprendizaje de recomendaciones y observabilidad **local primero**.

## Qué recopilamos (cuando está habilitado)

Todos los eventos son **líneas JSON de solo agregar** en el **directorio de datos** del tiempo de ejecución, nunca en la configuración:

| categoría                               | Archivo(s) bajo `data_dir/telemetry/` | Propósito                                                                                  |
| --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Configuración                           | `setup-events.jsonl`                  | Embudo de configuración, tiempo hasta la primera jugada, errores (puerta de la Fase 1).    |
| Migración                               | `migration-events.jsonl`              | Importar progreso, decisiones, finalización (puerta de la Fase 1).                         |
| Tiempo de juego                         | `play-timing.jsonl`                   | Segmentos de latencia para la línea base de la Fase 2 (instrumentación solo en la Fase 1). |
| Escucha y comentarios de recomendación. | `listening-events.jsonl`              | Resultados positivos por cuenta y comentarios negativos suaves explícitos.                 |

**Versiones de esquema:** Los registros de configuración y migración utilizan `"v": 1`. Los intentos de reproducción utilizan `"v": 2`; El historial de escucha utiliza `"v": 2`. Las formas de eventos se catalogan en [LAYER\_CONTRACTS.md](./LAYER_CONTRACTS.md) §3. Los campos futuros son acumulativos dentro de una versión o superan `v` con una migración documentada.

**Esquema del historial de escucha:** los registros activos utilizan `"v": 2`. Los escritores graban reproducciones reales de 30 segundos, acciones explícitas de guardados/listas de reproducción/suscripción y comentarios de `not_interested`. El texto de búsqueda y los clics en los resultados de la búsqueda nunca se escriben. Los saltos nunca crean una señal negativa.

## Donde vive

- **Raíz:** `{SOUNDSIBLE_DATA_DIR or platform user-data}/users/<account>/telemetry/`
- **No** en `config_dir`: la telemetría son datos operativos duraderos, no configuraciones del usuario (revise §5 D5).

## Retención y rotación

- **Rotación:** Los archivos JSONL activos rotan a **16 MB** por archivo; **se retienen hasta 5** segmentos rotados; Los archivos rotados más antiguos pueden estar **comprimidos con gzip** (detalle de implementación).
- **Retención efectiva:** Limitada por rotación + límite (aproximadamente del orden de decenas de MB por categoría en una instalación típica). Los operadores pueden eliminar `data_dir/telemetry/` manualmente para restablecer las métricas locales.
- **Este contrato no crea copias remotas** a menos que se envíe y documente más adelante una función de suscripción explícita **separada**.

## Optar por no participar

- **Entorno:** Si `SOUNDSIBLE_TELEMETRY_ENABLED` está configurado en `0`, `false` o `off` (no distingue entre mayúsculas y minúsculas), el motor **no debe** agregar eventos de telemetría locales (la implementación debe tratar esto como un interruptor de apagado).
- **Predeterminado:** Telemetría local **activada** (solo local, sin red) para que los umbrales de calidad de la Fase 1 se puedan medir en la máquina del operador.
- **Alternancia de la interfaz de usuario personal:** "Aprender de mi actividad" controla a los redactores de recomendaciones para la cuenta iniciada. "Restablecer el aprendizaje de recomendaciones" elimina el perfil transaccional y la auditoría de comentarios de esa cuenta.

## Nunca recogido (Fase 1)

Lo siguiente está **fuera del alcance** para receptores JSONL locales y no debe escribirse mediante el código de telemetría de Fase 1:

- Contraseñas, secretos de API, tokens de OAuth, tokens de propietario/administrador, cookies de sesión.
- Cuerpos completos de solicitud/respuesta de API de terceros.
- Contenido sin formato del portapapeles, rutas de sistemas de archivos no relacionados fuera de los directorios de configuración/música declarados o contenidos de archivos de usuario arbitrarios.
- **ID de seguimiento entre servicios** o identificadores de teléfono de casa; **sin carga de red** de escritores de telemetría.
- **Texto completo** exacto de las comunicaciones del usuario o notas personales no musicales.

Los campos relacionados con el seguimiento (por ejemplo, `track_id`, `source`, tiempo) se permiten **solo** según sea necesario para las métricas de calidad del producto definidas en los esquemas congelados. No se permiten consultas de búsqueda en eventos de escucha ni en el perfil de recomendación.

## Derechos del operador

- Los datos permanecen en el host que ejecuta Soundsible (autoalojado).
- Los operadores pueden **inspeccionar, exportar, realizar copias de seguridad o eliminar** `data_dir/telemetry/` como cualquier otro dato local.
- Este documento es el **contrato publicado**; los cambios requieren una actualización de documento explícita y una nota de registro de cambios.

## Reproducir segmentos de tiempo (`play-timing.jsonl`)

Los eventos `play_timing` de la versión 2 correlacionan el trabajo del navegador y la estación con un `attempt_id` opaco. Pueden incluir:

- `source_kind`: local, vista previa o podcast;
- `cache_state`: disco, URL cálida, fría o desconocida;
- `egress`: directo, retransmitido o desconocido;
- disparador, carril de cola, estado terminal y motivo de falla acotado;
- reproducción por clic, resolución, TTFB ascendente y recuentos de recuperación;
- cómo se entregó una respuesta: el tamaño del archivo, el tamaño de lo prometido, el desplazamiento de bytes solicitado, la forma del encabezado `Range`, si se redujo a un fragmento y por qué no cuando no lo fue, y la extensión del contenedor. Todo describe la transferencia, nada del audio;
- una vez por reproducción audible (`ui_play_delivery`): cuánto tiempo sonó, y con qué frecuencia y durante cuánto tiempo se detuvo después de comenzar;
- pausa/reanudación de todo el programa y reproducción rechazada de deck inactivo (`ui_program_transport`, `ui_inactive_deck_play`): si el comando vino de la interfaz de usuario o de la sesión multimedia, la fase de mezcla, la visibilidad, el deck dominante y un estado de reproducción booleano para cada deck. Estos campos diagnostican transferencias de Bluetooth y pantalla de bloqueo; no contienen audio, títulos ni identificadores de control;
- ciclo de vida de salida del programa (`ui_program_output`): si el portador de salida estable o el respaldo de compatibilidad directa estaban activos, su estado listo/en pausa, el estado del contexto de Web Audio y un motivo de falla limitado;
- Proyección de sesión de medios (`ui_media_session_sync`): el estado de reproducción de la plataforma declarado, por qué se actualizó, una revisión monótona de metadatos y registros booleanos de si el estado del operador/fuente coincidió. Los títulos de las pistas, los artistas, las URL de las carátulas y otros metadatos nunca se escriben en la telemetría.

El almacenamiento en búfer antes del primer sonido y el almacenamiento en búfer después se registran como campos separados. Solían ser un contador emitido en el momento del primer sonido, mientras que el segundo tipo no puede haber sucedido todavía, por lo que informaba la espera de apertura que `click_to_playing_ms` ya describió, y leía lo mismo en prácticamente todas las jugadas, independientemente de lo que hiciera la entrega.

Los intentos cancelados y reemplazados se escriben explícitamente y no se cuentan como muestras de latencia exitosas. Los valores de tiempo que terminan en `_ms` fuera del rango aceptado de 0 a 300 segundos se rechazan en lugar de percentiles contaminantes. Las filas de la versión 1 siguen siendo inspeccionables, pero no se mezclan en el informe SLO de la versión 2.

Las URL de medios firmadas, las direcciones de retransmisión, las cookies, los tokens y los contenidos de audio nunca se registran. Genere un informe local de siete días con:

```bash
python3 scripts/playback_report.py /path/to/play-timing.jsonl
```

## Relación con las reclamaciones de privacidad del producto

Soundsible sigue **sin seguimiento de anuncios de terceros**. Este contrato agrega telemetría técnica **transparente y solo local** para que las puertas de calidad de fase (éxito de la configuración, precisión de la migración) se puedan medir **sin** contradecir la postura de privacidad.
