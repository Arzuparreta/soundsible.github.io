const translations: Record<string, string> = {
  Live: 'En directo',
  'Live now': 'En directo ahora',
  'On a break': 'En pausa',
  Waiting: 'Esperando',
  Reconnecting: 'Reconectando',
  'About to start': 'A punto de empezar',
  'The DJ paused the music.': 'El DJ ha pausado la música.',
  'Listen live': 'Escuchar en directo',
  'Listening live': 'Escuchando en directo',
  'Connecting…': 'Conectando…',
  'Tap to play': 'Pulsa para reproducir',
  'Reconnecting…': 'Reconectando…',
  'Try again': 'Reintentar',
  'The live audio dropped. Reconnecting…': 'Se ha interrumpido el audio. Reconectando…',
  'Your browser blocked playback. Tap to start the audio.':
    'El navegador ha bloqueado la reproducción. Pulsa para iniciar el audio.',
  'The live audio could not be connected.': 'No se ha podido conectar el audio en directo.',
  'Link copied': 'Enlace copiado',
  Share: 'Compartir',
  'Copy this link': 'Copia este enlace',
  blend: 'mezcla',
};
export const liveText = (text: string) =>
  document.documentElement.lang === 'es' ? (translations[text] ?? text) : text;
export const listeners = (count: number) =>
  document.documentElement.lang === 'es'
    ? `${count} ${count === 1 ? 'oyente' : 'oyentes'}`
    : `${count} ${count === 1 ? 'listener' : 'listeners'}`;
export const breakLabel = (time: string) =>
  document.documentElement.lang === 'es'
    ? `Vuelve en un momento · ${time}`
    : `Back in a moment · ${time}`;
