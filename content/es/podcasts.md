# Descubrimiento de podcasts por país

El ajuste de descubrimiento `podcast_country` de la cuenta selecciona una
storefront de Apple. Las cuentas existentes usan `us` por defecto, lo que
conserva su mercado anterior. El país es independiente del idioma de la
interfaz, el descubrimiento de música, la reproducción automática y la selección
de DJ. No filtra suscripciones, episodios guardados ni programas por país de
origen.

El ajuste está disponible en Ajustes → Reproducción y en el selector con el
globo de Podcasts. En móvil, el selector está en la barra de la app de Podcasts;
en escritorio, a la derecha del campo de búsqueda. Una selección se activa
después de que el motor la confirme. Las búsquedas y ambos rankings se
actualizan cuando cambia. Los resultados antiguos de los rankings se descartan
cuando cambia el país seleccionado o la cuenta con sesión iniciada.

El directorio nativo de podcasts y los ajustes de reproducción de Android
ofrecen la misma selección de país, los rankings de programas/episodios y el
filtro de categoría. El estado del país se aísla por generación de conexión
nativa. La resolución de episodios entrega el episodio exacto al controlador de
reproducción nativo existente, conservando la procedencia RSS y reutilizando
episodios adquiridos; el descubrimiento no importa stores de audio web. Las
recomendaciones nativas personalizadas de programas siguen disponibles junto a
los rankings por país.

## Fuentes de Apple

- Búsqueda: <https://performance-partners.apple.com/search-api>, con `country`.
- Storefronts: <https://rss.marketingtools.apple.com/apple/podcasts/storefronts>.
  La lista de códigos admitidos es una instantánea del generador RSS guardada en
  el repositorio, comprobada el 2026-10-10. Los nombres de países se localizan
  con `Intl.DisplayNames`.
- Programas: `https://rss.marketingtools.apple.com/api/v2/{country}/podcasts/top/{limit}/podcasts.json`.
- Episodios: `https://rss.marketingtools.apple.com/api/v2/{country}/podcasts/top/{limit}/podcast-episodes.json`.

Ambos rankings se probaron con los feeds públicos de España. Se conserva su
orden de clasificación, incluidos los programas seguidos. Las URL de feed de los
programas se resuelven mediante una búsqueda agrupada de iTunes en la misma
storefront. Los datos de los rankings están acotados y se guardan en caché
durante 90 segundos por país y límite.

Un episodio popular se resuelve bajo demanda mediante la búsqueda de iTunes de
su programa, haciendo coincidir los identificadores del episodio y del programa.
La reproducción de audio usa después la ruta existente de token/stream de
podcasts y reutiliza un episodio ya descargado cuando está disponible. Ver un
ranking o reproducir un episodio nunca suscribe a su programa. Un episodio
ausente de los episodios recientes devueltos por Apple, o disponible sólo como
vídeo, se notifica como no disponible; nunca se sustituye por otro capítulo.

El endpoint de rankings retirado `rss.itunes.apple.com` devolvía 503 durante la
investigación inicial. Los rankings de populares usan los feeds actuales de
Marketing Tools y muestran un estado de error/reintento independiente si Apple
falla. Nunca sustituyen los rankings por resultados de búsqueda genéricos. La
API separada de recomendaciones de podcasts conserva su lógica personalizada
existente y su búsqueda de respaldo, y ahora toma su mercado de exploración del
país guardado. Las colecciones editoriales públicas y las recomendaciones
personalizadas de Apple no tienen una API pública confirmada en esta integración.

El selector de categoría filtra los rankings de programas y episodios cargados
usando los identificadores de género devueltos por Apple. Conserva su orden
relativo y deja visibles los programas seguidos. Es un filtro de los resultados
mostrados, no un ranking completo independiente para ese género. Cambiar de país
borra la selección de categoría.
