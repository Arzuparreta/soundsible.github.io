# Listas móviles centradas en el contenido

Por debajo de 1024 píxeles CSS, las filas de contenido usan `MusicListRow`: título y subtítulo alineados a la izquierda, carátula y un único botón de más opciones. La carátula y el texto conservan la acción principal existente. El botón de más opciones y el botón principal son elementos hermanos, con gestión independiente del teclado y de los eventos táctiles. La composición de escritorio y las cuadrículas de tarjetas se mantienen separadas.

## Comportamiento

- La biblioteca, los favoritos, las pistas de artistas y álbumes, la búsqueda local mixta, la búsqueda en línea, el explorador del reproductor, las listas de reproducción, los resultados y episodios de pódcasts, la cola, la ruta de DJ y las fuentes de DJ usan la composición móvil compartida.
- Los controles de las colecciones, la eliminación de elementos de la cola y las acciones de las filas de DJ están en la hoja de acciones existente. Los adaptadores de catálogo y descarga conservan las claves de identidad guardadas y los manejadores de descarga específicos de cada interfaz. Abrir una hoja no guarda, resuelve ni descarga ningún elemento.
- Los indicadores de favorito sobre la carátula solo aparecen donde aportan información. Las listas de favoritos los ocultan. La resolución o descarga en curso ocupa temporalmente el lugar del indicador; disponer de un archivo no añade ningún indicador permanente.
- El estado funcional de la ruta permanece en el subtítulo. La reproducción actual conserva su tratamiento existente. Los marcadores de posición de las carátulas, las dimensiones y la geometría del botón de más opciones permanecen estables cuando cambia el estado.
- El desplazamiento nativo gestiona los arrastres. Un movimiento que supere el margen existente para los toques, la cancelación del puntero y una pulsación prolongada completada suprimen el clic de compatibilidad posterior. La activación mediante teclado sigue disponible.
- Una pulsación prolongada abre el menú. **Mover** en la cola muestra controles para subir, bajar y finalizar debajo del contenido; **Mover** en DJ inicia el flujo existente de selección del destino. Los relevos preparados no pueden entrar en modo de movimiento. La eliminación y el movimiento en la cola se aplican a una aparición concreta de la pista, no solo a su ID.
- Las zonas de interacción del menú miden al menos 44 píxeles CSS. Los tamaños de las filas y las carátulas siguen los valores existentes de tamaño de interfaz. El punto de corte es independiente del punto de corte de la barra lateral para la interfaz grande.

## Desarrollo y revisión

`/player/#/preview` incluye filas representativas con títulos largos, carátulas ausentes, ocultación del indicador en el contexto de favoritos, carátulas con operaciones en curso y estado de DJ. Los ejemplos usan manejadores locales de la vista previa.

Ejecuta `npm test` desde `ui_web` y después:

```sh
SOUNDSIBLE_UI_TEST_PORT=4175 npm run test:ui-scale -- tests/browser/mobile-lists.spec.ts
```

El puerto opcional aísla las ejecuciones del navegador en árboles de trabajo separados. Vite se inicia desde esa copia de trabajo; las dependencias deben estar instaladas allí para que las fuentes autoalojadas se sirvan correctamente. CI comprueba el paquete.

La cobertura automatizada incluye 320/390/430 píxeles CSS, orientación horizontal, todos los tamaños de interfaz, ambos temas, el límite 1023/1024, Chromium/WebKit, el aislamiento del teclado y del menú, el desplazamiento táctil nativo de Chromium, los indicadores contextuales de favoritos y la disponibilidad de acciones. Las baterías de pruebas de cola, reproductor y pulsación prolongada cubren las interacciones existentes.

## Sigue siendo necesaria la aceptación en un dispositivo físico

En un teléfono real, recorre listas largas sujetándolo como de costumbre con una mano, frena el desplazamiento por inercia, reproduce una canción, usa el menú, marca un favorito, descarga y reordena. Repite con ambas manos y con el texto más grande. Confirma que las acciones intencionadas siguen siendo cómodas y que el desplazamiento no las activa. La emulación del navegador verifica la disposición y la gestión de eventos; no demuestra la ventaja ergonómica de este diseño. Extender el lenguaje visual al escritorio es una decisión independiente que se tomará después de esta revisión.
