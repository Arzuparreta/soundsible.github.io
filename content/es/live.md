# Live: emitir desde Soundsible

Live convierte tu Soundsible en una emisora de radio. Cualquier persona con un navegador puede escuchar desde la web pública, sin cuenta y sin instalar Soundsible:

**<https://arzuparreta.github.io/soundsible.github.io/live/>**

Tu estación no sirve el audio directamente a los oyentes. Publica una única emisión Opus en el relay comunitario, que se encarga de distribuirla.

***

## 1. Qué se emite

**Todo lo que escuchas.** El audio se toma del bus de programa, después de ambos decks, la ecualización, los filtros, el fundido cruzado, el envío de eco y el limitador. Las transiciones de Auto Mode, la reproducción actual, la reproducción normal, las escuchas previas, los pódcast y la radio pasan por los mismos dos elementos de audio. Todo se emite tal como lo oyes.

El único audio que *no* se emite es el de la sala de otro DJ cuando estás escuchándola.

## 2. Tu volumen no es el de los oyentes

El volumen local y el silencio se aplican **después** del punto de captura de la emisión. Bajar el volumen de Soundsible, silenciarlo, silenciar la pestaña o bajar a cero el volumen del ordenador no cambia nada para tus oyentes: la emisión mantiene su nivel. Es intencionado: puedes monitorizar con auriculares o trabajar en silencio mientras la sala sigue escuchando la sesión.

El único caso en el que no sale audio es un fallo del motor. Si se detiene el procesamiento de la mezcla, también se detiene la captura y la sala lo indica: *«El mezclador se ha detenido y la emisión se ha interrumpido. Recarga Soundsible para volver a emitir»*. Recarga la página e inicia de nuevo la emisión.

## 3. Pausas y descansos

Pausar **no** corta la conexión. La emisión continúa enviando silencio digital, que mantiene la conexión durante el descanso.

Los oyentes ven el estado **«Vuelve en un momento»** con un contador, para distinguir una pausa de una avería. Tu tarjeta de emisor muestra cuánto tiempo llevas en silencio cuando se supera medio minuto. El directorio identifica la sala como **«En pausa»**.

No hay una duración máxima para las pausas. Una sala en pausa sigue siendo una sala en directo.

## 4. Cuánto dura una emisión

No hay límite de tiempo. La sesión continúa mientras la pestaña permanezca abierta y conectada.

- **Tu navegador codifica el audio.** Cerrar la pestaña detiene la emisión.
- **Quince segundos de margen.** Si se cierra la pestaña o se pierde la conexión, la sala se conserva durante 15 segundos y se reanuda automáticamente si vuelves. Después se elimina.
- **Treinta minutos de espera.** Una sala que nunca haya reproducido nada libera su plaza después de 30 minutos, para no ocupar una de las pocas plazas simultáneas disponibles. Una sala en pausa nunca se considera inactiva.
- **Los móviles son emisores frágiles.** Al pasar la pestaña a segundo plano, el sistema puede suspender el motor de audio e interrumpir la emisión. Emite desde un equipo cuya pantalla permanezca encendida.

Límites: 5 sesiones simultáneas, 100 oyentes por sala y 250 oyentes en total. No se graba nada: no hay repeticiones ni archivo, y el chat nunca se almacena.

## 5. Emitir requiere HTTPS

Los navegadores ocultan los candidatos ICE que necesita WebRTC cuando el origen no es de confianza. Por eso, `http://192.168.x.x:5005` no puede emitir. Puedes usar cualquiera de estas opciones:

| Opción                 | Cómo hacerlo                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| En el mismo equipo     | Abre `http://localhost:5005`; localhost es un origen de confianza                           |
| Acceso remoto sencillo | Ejecuta `tailscale serve --bg --yes 5005` y abre la dirección `https://…ts.net` que aparece |
| Con tu propio dominio  | Configura Soundsible detrás de HTTPS y establece `SOUNDSIBLE_HTTPS_URL=https://your.domain` |

Si el origen no es de confianza, la página Live lo indica y ofrece un enlace a la dirección segura cuando puede encontrarla. Ese enlace transfiere la sesión: la página insegura publica su estado al salir y la segura abre la sala al llegar. La sesión que estabas escuchando —cola, modo y espacio de trabajo completo de Auto Mode, si estaba activo— se ofrece mediante el aviso para reanudar. Para el navegador, un origen distinto equivale a otro dispositivo; por eso se ofrece recuperar la sesión en lugar de continuar sin preguntar.

**Escuchar no tiene este requisito adicional**: la web pública ya utiliza HTTPS.

## 6. Comprobar que la emisión se oye

1. Inicia la emisión y pulsa reproducir. Tu tarjeta de emisor cambia a **En directo**.
2. Pulsa **Compartir sala** y envíate el enlace.
3. Ábrelo **en otro dispositivo**. La mejor prueba es un móvil con datos móviles, porque comprueba que la emisión funciona fuera de tu propia red.
4. Pulsa **Escuchar en directo**.

Ten en cuenta dos cosas:

- **No entres en tu propia sala desde el reproductor para comprobarla.** Entrar en una sala pausa tu reproducción, que es precisamente lo que estás emitiendo. Por eso tu sala no se puede seleccionar en el directorio: utiliza el enlace compartido en un segundo dispositivo.
- Otra pestaña o una ventana privada en el mismo equipo sirven para una comprobación rápida, pero no detectan problemas que solo aparecen en otras redes.

Si la escucha falla en una red restrictiva, el navegador intentará reconectar durante un periodo limitado antes de ofrecer un reintento manual.

## 7. Desactivar Live

Live está activado por defecto y utiliza el relay oficial. Para usar uno propio o desactivar la función por completo:

```bash
SOUNDSIBLE_COMMUNITY_URL=https://your-relay.example   # your own HTTPS relay
SOUNDSIBLE_COMMUNITY_DISABLED=true                    # off entirely
```

La instalación de un relay propio se explica en [`deploy/community/README.md`](../deploy/community/README.md).

## 8. Qué sabe el relay sobre ti

Tu estación conserva una clave Ed25519 y firma con ella cada petición de control. Tu identidad en el relay se deriva de esa clave: no hay cuenta, contraseña ni correo electrónico. El relay almacena la sala, tu nombre visible, el color del avatar y las huellas de los tokens de sesión. Los identificadores de las pistas se sustituyen por valores aleatorios antes de publicar, y las carátulas se recodifican y se vuelven a subir en lugar de enlazar a tu biblioteca.
