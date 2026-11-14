import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { catalog, excerptSlugs, repository } from './catalog.mjs';
// A Spanish article keeps the anchors of the English release it translated.
// When an English guide gains a section, an older translation of its target
// has no element for it, so a Spanish link to that section goes to the English
// article, which does. Read on first use, from the root like every other
// `content/` path: Astro also bundles this module, and only links need it.
let translations;
const translatedAnchors = new Map();
function spanishAnchors(slug) {
  translations ??= JSON.parse(readFileSync('content/es/manifest.json', 'utf8'));
  const meta = translations[slug];
  if (!meta) return;
  if (translatedAnchors.has(slug)) return translatedAnchors.get(slug);
  const actual = anchorsFor(readFileSync(`content/es/${slug}.md`, 'utf8'));
  const anchors = meta.anchors?.length === actual.length ? meta.anchors : actual;
  translatedAnchors.set(slug, anchors);
  return anchors;
}
export const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', fences: true });
// The steps for installing on your own machine lived in the README until
// v0.10.0 moved them into `docs/INSTALL.md`. Two places looked for the old
// README headings — this extraction and the start page's quick commands — so
// the move failed every build for two days and the site kept announcing the
// previous release. The span is named once, here, and read from one place.
export const nativeInstall = {
  source: 'docs/INSTALL.md',
  first: '## 2. Install on your computer',
  after: '## 3. Headless server (SSH)',
};
export function nativeInstallSection(source) {
  const start = source.indexOf(nativeInstall.first);
  const end = source.indexOf(nativeInstall.after, start);
  if (start < 0 || end < 0)
    throw new Error(
      `${nativeInstall.source} no longer runs from "${nativeInstall.first}" to "${nativeInstall.after}"; review nativeInstall in scripts/content.mjs.`,
    );
  // The rule closing the upstream section belongs to the document it divides,
  // not to a page that ends there.
  return source
    .slice(start, end)
    .trim()
    .replace(/\n+---$/, '');
}
export function sourceContent(item, source) {
  if (item.slug !== 'native-installation') return source;
  // Upstream numbers its sections; standing alone, this one is the whole page.
  return (
    '# Native installation' +
    nativeInstallSection(source).slice(nativeInstall.first.length).replace(/^### /gm, '## ') +
    '\n'
  );
}
export function plain(node) {
  return node.value ?? (node.children ?? []).map(plain).join('');
}
export function anchorsFor(source) {
  const slugger = new GithubSlugger();
  const result = [];
  visit(markdown.parse(source), 'heading', (node) => {
    result.push(slugger.slug(plain(node)));
  });
  return result;
}
export function translationStatus(sourceHash, translation) {
  return !translation ? 'missing' : translation.sourceHash === sourceHash ? 'current' : 'outdated';
}
export function rewriteLink(url, item, locale, base, sha, images = {}) {
  const publicSite = 'https://arzuparreta.github.io/soundsible.github.io/';
  if (url.startsWith(publicSite))
    return `${base}/${locale === 'es' ? 'es/' : ''}${url.slice(publicSite.length).replace(/^es\//, '')}`;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || url.startsWith('#')) return url;
  const [file, hash] = url.split('#');
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(item.source), file));
  const target = catalog.find((x) => x.source === resolved && !excerptSlugs.has(x.slug));
  if (resolved === 'README.md') {
    return `${base}/${locale === 'es' ? 'es/' : ''}${hash && /install|native|linux|macos|windows|first-native/.test(hash) ? `docs/native-installation/${hash ? '#' + (hash === 'install' ? 'native-installation' : hash) : ''}` : 'docs/'}`;
  }
  if (target) {
    const anchors = locale === 'es' && hash ? spanishAnchors(target.slug) : undefined;
    const spanish = locale === 'es' && !(anchors && !anchors.includes(hash));
    return `${base}/${spanish ? 'es/' : ''}docs/${target.slug}/${hash ? '#' + hash : ''}`;
  }
  if (resolved.startsWith('docs/images/')) {
    const published = images[resolved];
    if (!published) throw new Error(`Image outside the release snapshot: ${resolved}`);
    return `${base}/${published}`;
  }
  return `https://github.com/${repository}/blob/${sha}/${resolved}${hash ? '#' + hash : ''}`;
}
// Guides also embed raw HTML, such as a `<picture>` with a light and a dark
// capture. Its URLs are relative to the guide just like Markdown ones.
const htmlUrl = /\b(src|srcset|href)\s*=\s*(["'])(.*?)\2/gi;
export function rewriteHtml(html, item, locale, base, sha, images) {
  const rewrite = (url) => rewriteLink(url, item, locale, base, sha, images);
  return html.replace(htmlUrl, (whole, name, quote, value) => {
    if (!value.trim()) return whole;
    const rewritten =
      name.toLowerCase() === 'srcset'
        ? value
            .split(',')
            .map((candidate) => {
              const [url, ...descriptor] = candidate.trim().split(/\s+/);
              return [rewrite(url), ...descriptor].join(' ');
            })
            .join(', ')
        : rewrite(value);
    return `${name}=${quote}${rewritten}${quote}`;
  });
}
export function transform(source, item, locale, base, sha, images) {
  const tree = markdown.parse(source);
  visit(tree, (node) => {
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition')
      node.url = rewriteLink(node.url, item, locale, base, sha, images);
    else if (node.type === 'html')
      node.value = rewriteHtml(node.value, item, locale, base, sha, images);
  });
  return markdown.stringify(tree);
}
// Astro gives remark plugins frontmatter before compiling each collection entry.
export function stableHeadings() {
  return (tree, file) => {
    const anchors = file.data.astro?.frontmatter?.anchors;
    if (!Array.isArray(anchors)) return;
    let index = 0;
    visit(tree, 'heading', (node) => {
      const id = anchors[index++];
      if (!id) throw new Error(`Heading mismatch in ${file.path}`);
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.id = id;
    });
    if (index !== anchors.length) throw new Error(`Heading count mismatch in ${file.path}`);
  };
}
