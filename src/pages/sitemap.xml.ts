import type { APIRoute } from 'astro';
import entries from '../generated/catalog.json';
import { href } from '../lib/site';
export const prerender = true;
export const GET: APIRoute = ({ site }) => {
  const pages = [
    '',
    'start/',
    'docs/',
    'live/',
    'project/',
    ...entries.filter((e) => e.locale === 'en').map((e) => `docs/${e.slug}/`),
  ];
  const absolute = (locale: 'en' | 'es', page: string) => new URL(href(locale, page), site).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.flatMap((page) => (['en', 'es'] as const).map((locale) => `<url><loc>${absolute(locale, page)}</loc><xhtml:link rel="alternate" hreflang="en" href="${absolute('en', page)}"/><xhtml:link rel="alternate" hreflang="es" href="${absolute('es', page)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${absolute('en', page)}"/></url>`)).join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
