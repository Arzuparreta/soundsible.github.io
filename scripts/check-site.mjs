import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseHTML } from 'linkedom';
const [owner, name] = (process.env.GITHUB_REPOSITORY ?? 'Arzuparreta/soundsible.github.io').split(
  '/',
);
const base = name === `${owner}.github.io` ? '' : `/${name}`;
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
      ),
    )
  ).flat();
}
const files = (await walk('dist')).filter((f) => f.endsWith('.html'));
const cache = new Map();
for (const file of files) {
  cache.set(file, parseHTML(await readFile(file, 'utf8')).document);
}
const errors = [];
for (const [file, doc] of cache) {
  const pathname = '/' + file.slice(5).replace(/index\.html$/, '');
  const current = new URL(base + pathname, 'https://site.invalid');
  if (doc.querySelectorAll('main').length !== 1) errors.push(`${file}: expected one main landmark`);
  if (!doc.querySelector('h1')) errors.push(`${file}: missing h1`);
  const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate IDs`);
  for (const el of doc.querySelectorAll(
    'a[href],img[src],script[src],link[rel="stylesheet"][href]',
  )) {
    const raw = el.getAttribute('href') ?? el.getAttribute('src');
    if (!raw || raw === '#') continue;
    const url = new URL(raw, current);
    if (url.origin !== current.origin) continue;
    if (!url.pathname.startsWith(base + '/')) {
      errors.push(`${file}: URL escapes project base: ${raw}`);
      continue;
    }
    let target = 'dist' + decodeURIComponent(url.pathname.slice(base.length));
    if (target.endsWith('/')) target += 'index.html';
    try {
      if (!(await stat(target)).isFile()) throw new Error();
    } catch {
      errors.push(`${file}: missing ${raw}`);
      continue;
    }
    if (
      url.hash &&
      cache.has(target) &&
      !cache.get(target).getElementById(decodeURIComponent(url.hash.slice(1)))
    )
      errors.push(`${file}: missing anchor ${raw}`);
  }
  for (const img of doc.querySelectorAll('img'))
    if (!img.hasAttribute('alt')) errors.push(`${file}: image without alt`);
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${files.length} pages: internal links, anchors, assets, landmarks and image alternatives.`,
  );
