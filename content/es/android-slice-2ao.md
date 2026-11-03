# S2ao — Workspace DJ multidispositivo

El handoff de Core ahora marca los eventos de inicio como traspasos. Una reanudación de transporte reutiliza
las ocurrencias nativas; un traspaso genuino reconstruye el workspace recibido aunque sus
IDs de cola coincidan con la cola local pausada. Esto evita perder ediciones de dirección/fuente hechas
en otro dispositivo mientras tenía esa misma cola. Los demás clientes ignoran el marcador
opcional y mantienen su contrato de estado/pista existente.

La sesión auto compartida restaura una ruta acotada, índice/posición actual, perfil técnico
de DJ, dirección, política explícita de fuentes, bandejas de fuentes, identidades escuchadas/evitadas,
exploración y propuestas de transición. Las claves de ocurrencia nativas reasignan la propiedad del bridge;
fromKey de la transición usa la identidad musical compartida en el formato de transmisión y la ocurrencia
anterior real dentro del motor nativo. Se conservan las etiquetas públicas de plan/fuente y los metadatos
de ruta. Los datos de la cola nativa llevan el loudness del programa al DSP.

Un planificador restaurado conserva las exclusiones/exploración del workspace para peticiones posteriores;
un START nuevo borra el envoltorio restaurado anterior. La sesión de doble decodificador puede
empezar en un índice restaurado con historial en lugar de descartar todo lo anterior.
La reanudación remota mantiene el programa nativo actual; el traspaso genuino pasa por la
misma ruta de instalación nativa que un inicio planificado. Los perfiles/colas/propiedad del bridge inválidos
se rechazan antes de reemplazar la reproducción. Las entradas de catálogo sin resolver siguen pendientes.

Aceptación: Core16/0; DeviceDj + DeviceSession + DevicesUi 6/0 HTTP/TLS, 51.706s;
integración exit0 y APK normal/test APK/JVM56/lint sin CA de fixture. Log
`/tmp/soundsible-dj-device-final-native.log`. Se validan DJ nativo entrante/saliente, PCM,
pause/play/seek/next/previous con Activity cerrada, claves duplicadas, propiedad de fuente/dirección/plan/
bridge, una edición de dirección devuelta con la misma cola y el rechazo de un perfil malformado.
Se incluyen regresiones de NORMAL y de los controles visibles de dispositivo.

El peer comprueba el contrato del socket saliente, no la salida acústica. La ruta validada
tiene música local resuelta y una transición planificada; no están representadas todas las combinaciones
de transición musical/fuente. Radio, la resolución de catálogo pendiente, el agotamiento de reconexión
y más casos negativos de DJ todavía necesitan gates. Los tests NORMAL ahora hacen
seek dentro de pistas sintéticas cortas para no depender de fixtures PCM anteriores;
la evidencia anterior de posiciones largas sigue registrada en sus slices previas.
