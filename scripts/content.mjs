import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import path from 'node:path';
import { catalog, repository } from './catalog.mjs';
export const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', fences: true });
export function sourceContent(item, source) {
  if (item.slug !== 'native-installation') return source;
  const start = source.indexOf('### Native installation');
  const end = source.indexOf('### Docker', start);
  if (start < 0 || end < 0)
    throw new Error('README installation headings changed; review the extraction.');
  return (
    source
      .slice(start, end)
      .trim()
      .replace(/^### Native installation/m, '# Native installation')
      .replace(/^#### /gm, '## ') + '\n'
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
  const target = catalog.find((x) => x.source === resolved);
  if (resolved === 'README.md') {
    return `${base}/${locale === 'es' ? 'es/' : ''}${hash && /install|native|linux|macos|windows|first-native/.test(hash) ? `docs/native-installation/${hash ? '#' + (hash === 'install' ? 'native-installation' : hash) : ''}` : 'docs/'}`;
  }
  if (target)
    return `${base}/${locale === 'es' ? 'es/' : ''}docs/${target.slug}/${hash ? '#' + hash : ''}`;
  if (resolved.startsWith('docs/images/')) {
    const published = images[resolved];
    if (!published) throw new Error(`Image outside the release snapshot: ${resolved}`);
    return `${base}/${published}`;
  }
  return `https://github.com/${repository}/blob/${sha}/${resolved}${hash ? '#' + hash : ''}`;
}
export function transform(source, item, locale, base, sha, images) {
  const tree = markdown.parse(source);
  visit(tree, (node) => {
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition')
      node.url = rewriteLink(node.url, item, locale, base, sha, images);
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
