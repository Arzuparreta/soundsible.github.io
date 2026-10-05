/** The player's palettes, in the order its settings list them. The page wears
 *  each one and shows the screenshots taken in it. `color` is the page
 *  background, which the browser paints its own chrome with. */
export const themes = [
  { id: 'light', en: 'Light', es: 'Claro', color: '#f8f8f5' },
  { id: 'dark', en: 'Dark', es: 'Oscuro', color: '#151715' },
  { id: 'slate', en: 'Slate', es: 'Pizarra', color: '#252d38' },
  { id: 'pure-black', en: 'Pure black', es: 'Negro puro', color: '#000000' },
  { id: 'forest-green', en: 'Forest green', es: 'Verde bosque', color: '#0b110d' },
] as const;

export type Theme = (typeof themes)[number]['id'];
