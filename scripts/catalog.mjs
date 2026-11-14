import { readFileSync } from 'node:fs';
export const repository = 'Arzuparreta/soundsible';
// User guides only. Soundsible keeps its user guides directly in `docs/` and
// everything written for developers and agents under `docs/internal/`, which
// this site never publishes.
const curatedCatalog = [
  [
    'native-installation',
    'docs/INSTALL.md',
    'install',
    'Native installation',
    'Instalación nativa',
    'Run Soundsible on Linux, macOS or Windows.',
    'Ejecuta Soundsible en Linux, macOS o Windows.',
  ],
  [
    'install',
    'docs/INSTALL.md',
    'install',
    'Server deployment',
    'Instalación en servidor',
    'Networks, storage, remote access and services.',
    'Redes, almacenamiento, acceso remoto y servicios.',
  ],
  [
    'docker',
    'docs/DOCKER.md',
    'install',
    'Docker',
    'Docker',
    'Containers, volumes, backups and upgrades.',
    'Contenedores, volúmenes, copias de seguridad y actualizaciones.',
  ],
  [
    'desktop',
    'docs/DESKTOP_BETA.md',
    'install',
    'Desktop app',
    'Aplicación de escritorio',
    'Install and use the desktop beta.',
    'Instala y utiliza la versión beta de escritorio.',
  ],
  [
    'ios',
    'docs/IOS.md',
    'install',
    'iPhone and iPad',
    'iPhone y iPad',
    'Native app, installation and availability.',
    'Aplicación nativa, instalación y disponibilidad.',
  ],
  [
    'opensubsonic',
    'docs/OPENSUBSONIC.md',
    'use',
    'Other music clients',
    'Otros clientes musicales',
    'Connect an OpenSubsonic app to your library.',
    'Conecta una aplicación OpenSubsonic a tu biblioteca.',
  ],
  [
    'dj-mode',
    'docs/AUTO_MODE.md',
    'use',
    'DJ Mode',
    'Modo DJ',
    'Start a set, choose sources and edit its route.',
    'Inicia una sesión, elige fuentes y edita su recorrido.',
  ],
  [
    'live',
    'docs/LIVE.md',
    'use',
    'Live broadcasting',
    'Emisiones en directo',
    'Broadcast your music and share a listening room.',
    'Emite tu música y comparte una sala de escucha.',
  ],
  [
    'music-migration',
    'docs/MUSIC_MIGRATION.md',
    'use',
    'Move your music',
    'Trae tu música',
    'Import a music profile from Spotify or Apple Music.',
    'Importa tu perfil musical de Spotify o Apple Music.',
  ],
  [
    'car',
    'docs/CAR_INTEGRATION.md',
    'use',
    'Listening in the car',
    'Escuchar en el coche',
    'Playback controls and car integration.',
    'Controles de reproducción e integración con el coche.',
  ],
  [
    'configuration',
    'docs/CONFIGURATION.md',
    'admin',
    'Configuration',
    'Configuración',
    'Settings, environment variables and storage.',
    'Ajustes, variables de entorno y almacenamiento.',
  ],
  [
    'privacy',
    'docs/TELEMETRY_PRIVACY.md',
    'admin',
    'Telemetry and privacy',
    'Telemetría y privacidad',
    'What is recorded and where it stays.',
    'Qué se registra y dónde se guarda.',
  ],
  [
    'troubleshooting',
    'docs/troubleshooting-yt-dlp-formats.md',
    'admin',
    'Download troubleshooting',
    'Problemas de descarga',
    'Resolve extractor and format errors.',
    'Resuelve errores de formatos y extracción.',
  ],
  [
    'legal',
    'docs/LEGAL.md',
    'admin',
    'Acceptable use',
    'Uso aceptable',
    'License context and responsibilities.',
    'Contexto de licencia y responsabilidades.',
  ],
  [
    'agent-integration',
    'docs/AGENT_INTEGRATION.md',
    'use',
    'Agent integration',
    'Integración con agentes',
    'Connect assistants using the scoped API.',
    'Conecta asistentes mediante la API con permisos limitados.',
  ],
  [
    'relay',
    'docs/VPS_RELAY.md',
    'admin',
    'Residential relay for VPS',
    'Relay residencial para VPS',
    'Resolve and transfer media through your trusted residential network.',
    'Resuelve y transfiere audio a través de tu red residencial de confianza.',
  ],
  [
    'roadmap',
    'docs/ROADMAP.md',
    'project',
    'Roadmap',
    'Hoja de ruta',
    'Product direction and planned work.',
    'Dirección del producto y trabajo previsto.',
  ],
].map(([slug, source, group, en, es, descriptionEn, descriptionEs]) => ({
  slug,
  source,
  group,
  title: { en, es },
  description: { en: descriptionEn, es: descriptionEs },
}));

// Releases up to v0.33.0 mixed internal documents into `docs/` and kept the
// Android alpha guide in `docs/android/`. These two lists classify that older
// layout; a release with `docs/internal/` no longer contains any of their paths.
const legacyInternal = new Set([
  'docs/ANDROID.md',
  'docs/ARCHITECTURE.md',
  'docs/ARTWORK.md',
  'docs/LAYER_CONTRACTS.md',
  'docs/LYRICS_RECOVERY.md',
  'docs/MOBILE_LISTS.md',
  'docs/PERFORMANCE.md',
  'docs/PLAYBACK_DIAGNOSIS.md',
  'docs/PLAYBACK_QUEUE_CONTRACT.md',
  'docs/PREMIUM_QUALITY_CONTRACT.md',
  'docs/RELEASING.md',
  'docs/UI_REBUILD_PLAN.md',
  'docs/appliance-rework-plan.md',
]);
const legacyUserGuides = new Set(['docs/android/ALPHA.md']);
// A user guide is a Markdown file directly in `docs/`. Subfolders, including
// `docs/internal/`, hold material for developers and agents.
export function isUserGuide(path) {
  if (legacyUserGuides.has(path)) return true;
  return /^docs\/[^/]+\.md$/.test(path) && !legacyInternal.has(path);
}

// Newly published public guides remain available even before editorial labels arrive.
let discovered = [];
try {
  discovered =
    JSON.parse(readFileSync(new URL('../content/upstream/release.json', import.meta.url), 'utf8'))
      .documents ?? [];
} catch {}
export const catalog = [
  ...curatedCatalog,
  ...discovered.filter(
    (doc) => isUserGuide(doc.source) && !curatedCatalog.some((item) => item.source === doc.source),
  ),
];
// `native-installation` republishes one section of `docs/INSTALL.md`, so a
// link to that file has to resolve to the complete guide, not to the excerpt.
export const excerptSlugs = new Set(['native-installation']);
