# Recuperación offline verificada

Detén el motor Station **y las herramientas independientes de descarga/sincronización** antes de copiar.
`--stopped` registra tu confirmación; no detiene procesos ni demuestra que
otro contenedor no esté usando los volúmenes. Mantén los escritores detenidos hasta que termine
la copia. Nunca pruebes la recuperación sobre tu única copia activa.

```sh
python -m shared.instance_backup create /backups/before-update \
  --config-dir /path/to/config --data-dir /path/to/data \
  --music-dir /path/to/music --stopped
python -m shared.instance_backup verify /backups/before-update
python -m shared.instance_backup restore /backups/before-update /recovery/instance
```

La copia de seguridad es un directorio privado que contiene `config/`, `data/`, `music/` (opcional)
y un manifiesto con la versión que la generó, las ubicaciones de origen, los tamaños y
las sumas de comprobación SHA-256. Incluye credenciales de cuentas: protégela igual que la instancia.
Las credenciales de almacenamiento cifradas incluyen su clave como `config/.credentials.key`
dentro de la copia privada. El código actual usa esa clave tras la restauración aunque
el contenedor de sustitución tenga otra identidad de máquina. Las versiones antiguas que
no reconocen el archivo de clave siguen necesitando la identidad de máquina original para
descifrar las credenciales. La copia de seguridad nunca reescribe la configuración de origen.
Las bases de datos SQLite se copian mediante la API de backup de SQLite (incluido el contenido
confirmado del WAL) y se comprueba su integridad. Los directorios de caché/registros no son necesarios.
Incluye la música cuando sea la única copia del audio. Las carpetas externas escaneadas,
los buckets remotos y los symlinks necesitan su propia copia; los symlinks se rechazan en lugar
de omitirse o seguirse sin avisar. Es una copia offline, no un snapshot en vivo.

La creación y la restauración preparan y verifican la copia completa antes de publicarla.
Los destinos no deben existir; nada se fusiona con una instalación anterior.
La verificación detecta archivos que faltan, que sobran y que han cambiado. Las sumas de comprobación detectan daños,
no a un atacante que pueda reescribir tanto los datos como el manifiesto. Guarda una copia aparte.

En caso de actualización fallida, detén el nuevo motor, conserva sus directorios para el diagnóstico y restaura la copia de seguridad con la **misma versión que la creó**. El comando de restauración, de forma deliberada, no usa ningún gestor de base de datos ni ejecuta migraciones. Monta `config`, `data` y `music` restaurados en sus rutas originales del contenedor, o devuélvelos a sus rutas originales del host mientras está detenido. Los ajustes de almacenamiento absolutos y las rutas de los archivos escaneados se conservan, no se reescriben; apuntar las variables de tiempo de ejecución a otro directorio no basta para reubicar el audio externo. Inicia la versión antigua solo después de restaurar todas las raíces a la vez. El trabajo pendiente sigue entonces la recuperación normal de descargas. No vuelvas a aplicar un JSON de cola heredado sobre una BD más reciente.

El ensayo de recuperación automatizado crea una cuenta real, una biblioteca canónica, una lista de reproducción y una descarga pendiente; copia ajustes/favoritos/carátulas/audio, daña la base de datos original y vuelve a abrir la biblioteca restaurada pasando por la configuración del esquema. También actualiza y restaura la estructura heredada de usuario único mediante la migración real de cuentas, y verifica el descifrado de credenciales tras cambiar la identidad de la máquina. Por separado, cubre el WAL confirmado, las copias de seguridad dañadas y la negativa a sobrescribir. Esto demuestra la recuperación del fixture con el código actual, no la compatibilidad con todas las versiones históricas, la durabilidad ante cortes físicos de alimentación ni la aceptación en Windows.
