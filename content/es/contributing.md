## Contribuir a Soundsible

Gracias por su interés en contribuir: cada informe de error, idea y pull request ayuda.

### Requisitos previos

- **Python 3.10+**, **git**, **FFmpeg**
- **Node.js 22+** y **npm**: necesarios para compilar o desarrollar el reproductor SolidJS de `ui_web/` (el paquete de producción de `ui_web/dist/` no se incluye en el repositorio)

### Cómo empezar

1. **Crea un fork y clona**

   ```bash
   git clone https://github.com/Arzuparreta/soundsible.git
   cd soundsible
   ```

2. **Entorno de Python**

   Deja que `run.py` prepare el entorno virtual en el primer inicio o créalo manualmente:

   ```bash
   python3 -m venv venv
   ./venv/bin/pip install -r requirements.txt
   ```

3. **Dependencias del reproductor web** (una sola vez). El motor recompila `ui_web/dist` automáticamente cuando cambia el código fuente.

   ```bash
   cd ui_web && npm ci && cd ..
   ```

   También puedes compilarlo explícitamente: `python3 scripts/ensure_ui_dist.py --force`
4. **Ejecuta las pruebas**

   ```bash
   PYTHONPATH=. ./venv/bin/python -m pytest tests/ -q
   ```

   Pruebas unitarias del frontend:

   ```bash
   cd ui_web && npm test
   ```

5. **Ejecuta la aplicación en desarrollo**

   Configúrala una vez con `python3 run.py --setup`
   (`http://localhost:5099/setup`) y después ejecuta el motor en primer plano para
   tener su registro a la vista:

   ```bash
   python3 run.py --daemon    # Ctrl+C lo detiene
   ```

   El menú de la terminal (`python3 run.py`) y el lanzador del navegador
   (`./venv/bin/python start_launcher.py` y después **Iniciar** en
   `http://localhost:5099`) arrancan el mismo motor. Todas las formas de ejecutarlo
   se enumeran en [Instalación → Formas de ejecutarlo](docs/INSTALL.md#ways-to-run-it).

   URL del reproductor: `http://localhost:5005/player/` (predeterminada) y `http://localhost:5005/player/desktop/` (arranque del contenedor de escritorio).

   Si tu propia instancia ya escucha en el puerto 5005, ejecuta el motor de
   desarrollo en otro puerto y con directorios separados: pasa `--port 5006` y
   `--config-dir`, `--data-dir` y `--cache-dir` tanto a `--setup` como a
   `--daemon`. Crea antes esos directorios: si alguno aún no existe,
   se rellena con una copia de tu propio `~/.config/soundsible`,
   `~/.local/share/soundsible` o `~/.cache/soundsible`. El servidor de desarrollo de Vite
   que aparece a continuación siempre actúa como proxy hacia el puerto 5005.

### Desarrollo front-end

Con el motor de Station ejecutándose en el puerto 5005 (`python3 run.py --daemon`):

```bash
cd ui_web
npm install    # or npm ci
npm run dev
```

Abra `http://localhost:5173/player/`: Vite redirige `/api` y `/socket.io` en el motor. Consulte [ui\_web/README.md](ui_web/README.md) para obtener detalles de compilación y verificación.

### Desarrollo de Android

Consulta [la guía de Android](docs/ANDROID.md) para ver los comandos de compilación local del APK y del emulador,
y [el documento de traspaso](docs/android/HANDOFF.md) antes de continuar la adaptación. El APK es
un cliente de desarrollo que permite explorar en modo de solo lectura; no se publicará ninguna versión alfa antes de alcanzar la paridad y tomar la decisión sobre el funcionamiento sin conexión.

### Informar errores y solicitar funciones

- Utiliza las incidencias de GitHub.
- Al informar un error, incluya:
  - SO, versión Python, versión Node.js (si está relacionado con el frontend).
  - Cómo instaló e inició Soundsible.
  - Lo que esperabas vs lo que pasó.
  - Cualquier registro o seguimiento de pila relevante.

### Enviar pull requests

1. Crea una rama para la funcionalidad a partir de **`main`**. Todo llega a `main` mediante una pull request; no se hacen commits directamente en ella.
2. Haz cambios pequeños y centrados en un objetivo.
3. Añade o actualiza las pruebas cuando modifiques lógica de cierta complejidad:
   - Python: `PYTHONPATH=. ./venv/bin/python -m pytest tests/ -q`
   - Frontend: `cd ui_web && npm test`
4. Ejecuta la aplicación localmente para verificar los flujos principales (inicio, reproducción de música y navegación básica).
5. Abre una PR dirigida a **`main`**, con una descripción clara de lo que has cambiado y por qué. CI se ejecuta en la pull request, así que deja que terminen las comprobaciones antes de pedir una revisión.
6. Cada pull request lleva exactamente una etiqueta de impacto, que determina el siguiente número de versión: `impact:major` (actualizar requiere una acción manual), `impact:minor` (nueva capacidad), `impact:patch` (una corrección) o `impact:none` (nada que el usuario pueda percibir). CI falla si no tiene ninguna. Si no puedes asignar etiquetas en el repositorio, indica en la descripción cuál corresponde. Consulta [Publicación de versiones](docs/RELEASING.md).

### Estilo de código

- Usa patrones modernos de Python (3.10+).
- Utilice nombres descriptivos y mantenga las funciones enfocadas.
- Haga coincidir el estilo existente de los archivos que toque.
