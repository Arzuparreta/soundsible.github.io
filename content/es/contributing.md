## Contribuir a Soundsible

Gracias por su interés en contribuir: cada informe de error, idea y pull request ayuda.

### Requisitos previos

- **Python 3.10+**, **git**, **FFmpeg**
- **Node.js 20+** y **npm**: necesarios para crear o desarrollar el reproductor SolidJS en `ui_web/` (el paquete de producción en `ui_web/dist/` no se incluye en el repositorio)

### Cómo empezar

1. **Crear un fork y clonar**

   ```bash
   git clone https://github.com/Arzuparreta/soundsible.git
   cd soundsible
   ```

2. **Entorno Python**

   Deje que `run.py` inicie el venv en el primer lanzamiento o créelo manualmente:

   ```bash
   python3 -m venv venv
   ./venv/bin/pip install -r requirements.txt
   ```

3. **Dependencias del reproductor web** (una sola vez). El motor reconstruye `ui_web/dist` automáticamente cuando cambian las fuentes.

   ```bash
   cd ui_web && npm ci && cd ..
   ```

   O compilar explícitamente: `python3 scripts/ensure_ui_dist.py --force`

4. **Ejecutar pruebas**

   ```bash
   PYTHONPATH=. ./venv/bin/python -m pytest tests/ -q
   ```

   Pruebas unitarias de front-end:

   ```bash
   cd ui_web && npm test
   ```

5. **Ejecute la aplicación en desarrollo**

   **Lanzador (panel de control del navegador):**

   ```bash
   ./venv/bin/python start_launcher.py
   ```

   Abra `http://localhost:5099` y haga clic en **Iniciar**. Solo configuración por primera vez: `python3 run.py --setup`.

   **Menú terminal:**

   ```bash
   python3 run.py          # choose "Start Station Engine & Open Station"
   ```

   Dirección del reproductor: `http://localhost:5005/player/` (predeterminado) y `http://localhost:5005/player/desktop/` (arranque del shell de escritorio).

### Desarrollo front-end

Con Station Engine ejecutándose en el puerto 5005:

```bash
cd ui_web
npm install    # or npm ci
npm run dev
```

Abra `http://localhost:5173/player/`: Vite redirige `/api` y `/socket.io` en el motor. Consulte [ui\_web/README.md](ui_web/README.md) para obtener detalles de compilación y verificación.

### Informar errores y solicitar funciones

- Utiliza las incidencias de GitHub.
- Al informar un error, incluya:
  - SO, versión Python, versión Node.js (si está relacionado con el frontend).
  - Cómo instaló e inició Soundsible.
  - Lo que esperabas vs lo que pasó.
  - Cualquier registro o seguimiento de pila relevante.

### Enviar pull requests

1. Cree una rama de funciones desde **`main`**. Todo llega a `main` a través de una pull request; no se hacen commits directamente en esa rama.
2. Haga cambios pequeños y enfocados.
3. Agregue o actualice pruebas al tocar la lógica no trivial:
   - Python: `PYTHONPATH=. ./venv/bin/python -m pytest tests/ -q`
   - Interfaz: `cd ui_web && npm test`
4. Ejecute la aplicación localmente para verificar los flujos principales (inicio, reproducción de música, navegación básica).
5. Abra un PR contra **`main`**, con una descripción clara de lo que cambió y por qué. CI se ejecuta en la pull request, así que deje que finalicen las comprobaciones antes de solicitar una revisión.

### Estilo de código

- Usa patrones modernos de Python (3.10+).
- Utilice nombres descriptivos y mantenga las funciones enfocadas.
- Haga coincidir el estilo existente de los archivos que toque.
