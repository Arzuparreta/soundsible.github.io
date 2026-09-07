import release from '../../content/upstream/release.json';
import { publicAsset } from '../public-asset';
export type Locale = 'en' | 'es';
export { release };
export const repoUrl = 'https://github.com/Arzuparreta/soundsible';
export function href(locale: Locale, path = '') {
  if (path === '404/' && locale === 'en') path = '404.html';
  return publicAsset(`${locale === 'es' ? 'es/' : ''}${path}`);
}
export function pick(locale: Locale, en: string, es: string) {
  return locale === 'es' ? es : en;
}
export const groups = [
  { id: 'install', en: 'Installation', es: 'Instalación' },
  { id: 'use', en: 'Using Soundsible', es: 'Usar Soundsible' },
  { id: 'admin', en: 'Administration', es: 'Administración' },
  { id: 'develop', en: 'Development', es: 'Desarrollo' },
  { id: 'more', en: 'More guides', es: 'Más guías' },
];
