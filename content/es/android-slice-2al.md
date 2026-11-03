# S2al — Dispositivo nativo y traspaso NORMAL

PlaybackService es propietario de una sesión de dispositivo Socket.IO de Core. Verifica la cookie
contra auth/state y el perfil nativo antes de unirse a playback_register;
su UUID estable está acotado por origen/cuenta. La generación, la identidad de la cookie, el perfil,
la identidad del socket y la revisión protegen los comandos y las respuestas tardías del worker. Reset
cancela las peticiones y cierra el socket fuera del looper del reproductor. Los fallos de verificación
no purgan las copias offline completas. Una credencial rechazada espera a que cambie la
identidad; los errores de transporte se reintentan con cooldown.

Los eventos reales de reproducción ejecutan pause/play/seek/next/previous sin Activity. El estado NORMAL
usa el formato de transmisión compartido de playbackSession, limitado a cinco ocurrencias anteriores y cuarenta
posteriores. Las direcciones de fuente y las cookies de Core nunca entran en ese estado.
El handoff de Core restaura cola/índice, posición y shuffle/repeat mediante fuentes nativas.
El envío frecuente de posición se limita a 15s, serializado/agrupado; las escrituras fallidas
tienen un cooldown de 8s y los cambios de propietario invalidan todos los efectos en cola.

El alcance actual es NORMAL con entradas resueltas. DJ, el workspace de Radio, las entradas de catálogo
pendientes, la UI de lista de dispositivos y el traspaso saliente iniciado por el usuario aún deben completarse;
no afirmar paridad multidispositivo sólo con esta slice. Guest Live sigue aparte.

DeviceSessionTest usa cookies reales de Core independientes para una segunda sesión de miembro
y una cuenta distinta. Verifica el registro nativo en Core, controles en segundo plano/PCM,
ocurrencias duplicadas, 404 de cuenta ajena, handoff real de Core y
logout. Las primeras ejecuciones expusieron dos fallos reales de Core: los eventos de socket playback_register
se saltaban la vinculación de usuario de Flask y se registraban en el scope por defecto; la pausa remota
reemplazaba pista/posición con null/cero, de modo que la reanudación inmediata competía con la
publicación del estado nativo. El registro ahora resuelve y vincula su cuenta autenticada para
ese evento; la pausa conserva todo el estado existente del destino. Los tests dirigidos de Core
cubren scope de cuenta/restauración de contexto, registro sin propietario y conservación en pausa/reanudación:
14/0. La reanudación nativa reutiliza las ocurrencias coincidentes de la cola acotada en lugar
de reconstruir claves o truncar el resto de la cola.

Aceptación final: HTTP/TLS 2/0 en 15.639s, integración exit0; APK normal, test
APK, JVM56/0 y lint pasan sin CA temporal de fixture. Log:
`/tmp/soundsible-device-session-final-native.log`. HTTP ya había pasado antes; TLS
detectó la condición de carrera de la pausa. Sin cambios de UI en esta slice.
