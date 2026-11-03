# S2aq — Reconexión de dispositivo tras agotar Socket.IO

El gestor de socket del servicio reintenta cinco veces. Cuando se agotan esos
intentos, NativeDeviceSession retira ese manager y su transporte, aplica un cooldown
de 30s y verifica la cookie/perfil actuales antes de una nueva conexión. El UUID
estable de dispositivo por origen/cuenta se conserva; la reproducción nativa es
independiente de este socket. Reset elimina los listeners del manager además de
los del socket, lo que impide que callbacks de reconexión retirados registren otra
cuenta o reactiven trabajo antiguo.

DeviceReconnectTest usa un fallo real del transporte Socket.IO de Core, no un evento
de desconexión sintético. Activity permanece cerrada, un fixture PCM de 20s se repite
durante la caída, los reintentos se agotan y pasan a cooldown, el transporte vuelve,
el mismo dispositivo se registra y se vuelve a publicar, y pause/resume remotos
vuelven a entregar PCM nativo.
HTTP/TLS2/0; runner exit0 y APK normal/test APK/JVM56/lint sin CA de fixture.
Log `/tmp/soundsible-device-reconnect-final-native.log`. La prueba inicial nunca llegó
a la caída: las rutas exclusivas del fixture deben usar el cliente de test raw porque
EngineConnection.execute de producción acepta correctamente sólo rutas /api; corregido.

Sin afirmaciones sobre red física/coche. La publicación de Core acaba actualizándose
tras la reconexión; las copias offline completadas no se modifican. El catálogo
diferido y la cobertura final de la suite completa aún deben completarse.
