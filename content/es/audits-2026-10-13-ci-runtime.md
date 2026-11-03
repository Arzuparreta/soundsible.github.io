# Tiempo de ejecución del CI en la nube

Los runners alojados en GitHub siguen siendo el entorno de validación de merges.
Ninguna suite pasa a una máquina de desarrollador y no se elimina ninguna prueba
ni comprobación smoke de despliegue.

## Línea base

Duraciones de jobs y pasos obtenidas de la API de Actions de GitHub el 2026-10-13:

| Run | Carga de trabajo | Duración observada |
| --- | --- | --- |
| 38416233386 | Desarrollo Android | Shard más lento 22m21s; job estático 4m27s |
| 38416233380 | Instaladores Windows | x64 20m06s; ARM64 16m03s |
| 38416233180 | CI de PR de Core | Unos 7m; paso de cobertura Python 6m36s |

La suite principal de Android asignó 40/50/67/58 casos a los cuatro emuladores.
El shard más lento pasó unos 16 minutos ejecutando sus casos. La evidencia JUnit
subida contiene 215 casos principales únicos, más evidencia separada de smoke y
de reinicio de proceso. Más runners reducen el trabajo en serie de los
dispositivos sin acortar las observaciones de reproducción ni debilitar las
aserciones.

Windows x64 pasó 11m57s en el empaquetado de Tauri, y ninguna de las dos
arquitecturas encontró su caché de Rust. Los fallos de caché están observados;
su causa individual no está demostrada. La instantánea de caché del repositorio
contenía unos 3,25 GB de Rust, 3,49 GB de BuildKit y 3,83 GB de contenido Gradle
entre ámbitos de rama/tag. Las cachés aisladas de PR/tag no pueden alimentar la
siguiente PR no relacionada y compiten con las entradas reutilizables de main.

## Cambios

- Ocho emuladores Android ejecutan la misma suite de instrumentación. El shard
  cero conserva el smoke offline y los protocolos ordenados de reinicio de
  proceso. El gate de release exige los ocho nombres de check; una prueba de
  regresión lo compara con la matriz del workflow.
- Activar la caché de tareas de Gradle en el CI de Android. El job estático y el
  shard cero del emulador alimentan la caché compartida de main; los demás jobs
  de emulador sólo la leen. Las pruebas en dispositivo siguen ejecutándose en
  todos los jobs, también cuando se reutilizan tareas de compilación.
- Las cachés de Rust y Docker sólo se escriben en main. Las PR y los tags de
  release siguen leyendo las cachés de main coincidentes, compilan las fuentes
  actuales y ejecutan sus checks.
- Construir la imagen Docker ARM64 en el runner nativo Ubuntu ARM de GitHub, en
  paralelo con amd64. Se mantienen los pulls frescos de upstream, el build
  nocturno sin caché, la verificación del lock de dependencias y el smoke de
  despliegue Compose en amd64.

La matriz de emuladores más grande puede sufrir colas de runners cuando se
solapan workflows. Hay que validar el tiempo real y todos los casos en la PR, en
lugar de suponer que duplicar los shards reduce a la mitad la duración total del
CI. Las mejoras de caché de Windows necesitan ejecuciones posteriores para
establecer un beneficio estable; una sola ejecución con caché caliente no basta.
