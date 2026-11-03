# Conexiones del cliente de escritorio

El instalador de escritorio para Windows incluye un shell Tauri y el motor de estación local opcional. También puede conectarse a una estación que ya ejecutes de forma nativa, en Docker, en tu LAN o detrás de HTTPS. El audio suena en el ordenador que ejecuta el cliente. La interfaz y el motor de audio son el reproductor compartido SolidJS/Web Audio, renderizado por WebView2, así que las teclas multimedia y el panel multimedia de Windows proceden de la Media Session del reproductor, igual que en un navegador.

No hay cliente para Linux; ver [Aplicación de escritorio](DESKTOP_BETA.md#no-linux-app).

## Elegir una conexión

En el primer arranque, introducir la dirección HTTP/HTTPS de la estación y elegir **Conectar al servidor**, o elegir **Usar este ordenador como servidor** para seleccionar una carpeta de música local. Funcionan direcciones como `http://localhost:5005`, una IP de la LAN o un dominio. También se pueden pegar las entradas conocidas `/player/` y `/player/desktop/`. Soundsible debe servirse en la raíz del origen; no se admiten subrutas de proxy inverso. Los certificados TLS deben validarse con normalidad.

La aplicación recuerda un servidor y el modo seleccionado. **Cambiar conexión…** está disponible en el menú de la ventana y en la bandeja. Seleccionar otra conexión cierra el reproductor de este cliente. No detiene la estación externa. Los controles del motor y las acciones de emparejamiento de teléfono de la bandeja están desactivados para conexiones externas; usar los Ajustes existentes de la estación para su gestión y su emparejamiento.

La estación proporciona el reproductor y su login existente. Las cookies son persistentes y están aisladas por origen de la estación, incluido su puerto. La aplicación no guarda contraseñas ni obtiene la credencial de propietario del motor local para estaciones externas.

Al cerrar, la aplicación se oculta si hay una bandeja utilizable. Sin soporte de bandeja, cerrar sale de la aplicación. Los atajos globales del shell funcionan en la medida de lo posible, sin garantía.

## Aislamiento y compatibilidad

`desktop-client.json` guarda las preferencias de conexión y `desktop-appearance.json` guarda la paleta de la ventana del cliente en el directorio de configuración de Soundsible. Ninguno de los dos cambia la configuración de la estación externa. Los datos de sesión de WebView están en `desktop-webviews/`, particionados por origen. El `config.json` o el `music_dir.json` de una estación no prueban por sí solos que haya una instalación de escritorio: la restauración del modo local heredado también exige el marcador propio del escritorio `desktop-owner-token` y una carpeta de música guardada válida.

La ventana de configuración incluida tiene permisos locales de escritorio. Cada ventana del reproductor sólo tiene los permisos de handshake y de apariencia para su origen seleccionado y su propia generación de conexión. Cambiar de conexión destruye esa ventana; los llamadores obsoletos se rechazan. Todos los comandos de la aplicación tienen ACL de Tauri explícitas en `build.rs`, incluidos los que usa la pantalla de configuración local. El supervisor sólo detiene procesos representados por el handle de proceso hijo que él mismo conserva; un PID encontrado en disco nunca establece la propiedad.

El puente de escritorio que recibe una ventana del reproductor responde a un handshake y fija la paleta de la ventana. Antes también transportaba instantáneas del programa y comandos de transporte para el servicio MPRIS de la aplicación de Linux; los reproductores de estaciones de esa época todavía los llaman, así que el shell mantiene ambos como no-ops y responde al handshake con `media: false`, lo que deja a esos reproductores con su Media Session.

Automatización del instalador y lo que todavía requiere intervención humana: [Aplicación de escritorio](DESKTOP_BETA.md#what-ci-proves).
