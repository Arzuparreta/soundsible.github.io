# S2ap — Radio y runway de Autoplay en traspasos

Las instantáneas NORMAL conservan los carriles/fuentes/metadatos de contexto importados de la cola, los campos
de podcast, la identidad musical y los datos de loudness. Radio lleva active/seedId en el
contrato compartido; los peers nativos además conservan el perfil y la semilla pública.
Los receptores del contrato antiguo/común usan balanced cuando no se proporciona perfil.
Las direcciones de fuente y las cookies de cuenta no forman parte de este estado.

Restaurar Radio mantiene el runway recibido en lugar de iniciar otra radio y
eliminar esas entradas. La propiedad de las ocurrencias generadas se vuelve a vincular a claves nativas.
Stop sólo elimina las entradas futuras generadas, conservando el historial consumido/actual y
las canciones manuales. Autoplay restaura sus marcadores/propiedad generados y después obedece
la preferencia confirmada de la cuenta del receptor; si está desactivado, sólo elimina ese
futuro importado. Una continuación vinculada a un podcast se rechaza antes de reemplazar la reproducción.

Aceptación: DeviceRadio + DeviceDj + DeviceSession + DevicesUi8/0 HTTP/TLS,
86.694s; integración exit0, APK normal/test APK/JVM56/lint sin CA de fixture.
Log `/tmp/soundsible-radio-device-native.log`. Radio entra en reproducción nativa/PCM,
su propiedad de intent/seed/profile/generated sale a través del handoff real de Core,
Stop conserva la canción manual y Autoplay desactivado retira sólo el futuro generado.
DJ, NORMAL y los controles visibles del dispositivo se incluyen como regresiones.

El peer valida la metadata saliente en lugar de reproducir sonido. Radio con un
seed fuera de la ventana acotada reconstruye su identidad pública; una nueva
planificación sigue requiriendo Core/proveedores. Los extras nativos de profile/seed
son extensiones; no afirmar que un peer web los conserva a su vuelta. Las entradas
de catálogo diferidas y la reconexión prolongada de la sesión de dispositivo aún
deben completarse. La aceptación física y la publicación siguen siendo gates independientes.
