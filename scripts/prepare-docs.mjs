import { readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { catalog } from './catalog.mjs';
import { sourceContent, anchorsFor, transform, translationStatus } from './content.mjs';
const release = JSON.parse(await readFile('content/upstream/release.json', 'utf8'));
for (const [file, hash] of Object.entries(release.files)) {
  const bytes = await readFile(`content/upstream/${file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== hash)
    throw new Error(`Source snapshot changed outside the importer: ${file}`);
}
const repo = process.env.GITHUB_REPOSITORY ?? 'Arzuparreta/soundsible.github.io';
const [owner, name] = repo.split('/');
const base = name === `${owner}.github.io` ? '' : `/${name}`;
await rm('src/content/docs', { recursive: true, force: true });
await mkdir('src/content/docs', { recursive: true });
await mkdir('src/generated', { recursive: true });
// Imported images keep their release name in the repository but are published
// under a content fingerprint, so a reader who cached an older capture at the
// same path is never served it again.
await rm('public/source-assets', { recursive: true, force: true });
await mkdir('public/source-assets/docs/images', { recursive: true });
const images = {};
for (const name of (await readdir('content/upstream/docs/images')).sort()) {
  const bytes = await readFile(`content/upstream/docs/images/${name}`);
  const fingerprint = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
  const published = name.replace(/(\.[^.]+)$/, `.${fingerprint}$1`);
  await writeFile(`public/source-assets/docs/images/${published}`, bytes);
  images[`docs/images/${name}`] = `source-assets/docs/images/${published}`;
}
await writeFile('src/generated/images.json', JSON.stringify(images, null, 2) + '\n');
const entries = [];
const translationManifest = JSON.parse(await readFile('content/es/manifest.json', 'utf8'));
for (const item of catalog) {
  const source = sourceContent(item, await readFile(`content/upstream/${item.source}`, 'utf8'));
  const sourceHash = createHash('sha256').update(source).digest('hex');
  let translated;
  if (translationManifest[item.slug]) {
    translated = {
      ...translationManifest[item.slug],
      content: await readFile(`content/es/${item.slug}.md`, 'utf8'),
      original: await readFile(`content/es/originals/${item.slug}.md`, 'utf8'),
    };
  }
  if (
    translated &&
    createHash('sha256').update(translated.original).digest('hex') !== translated.sourceHash
  )
    throw new Error(`Translation source fingerprint mismatch: ${item.slug}`);
  const status = translationStatus(sourceHash, translated);
  for (const locale of ['en', 'es']) {
    const useTranslation = locale === 'es' && translated;
    const body = useTranslation ? translated.content : source;
    const anchors = useTranslation ? translated.anchors : anchorsFor(source);
    if (anchorsFor(body).length !== anchors.length)
      throw new Error(`Translation heading mismatch: ${item.slug}`);
    const data = {
      ...item,
      title: item.title[locale],
      description: item.description[locale],
      locale,
      status: locale === 'en' ? 'current' : status,
      sourceHash,
      tag: useTranslation ? translated.tag : release.tag,
      sha: useTranslation ? translated.sha : release.sha,
      anchors,
    };
    await mkdir(`src/content/docs/${locale}`, { recursive: true });
    await writeFile(
      `src/content/docs/${locale}/${item.slug}.md`,
      `---\n${Object.entries(data)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n')}\n---\n\n${transform(body, item, locale, base, data.sha, images)}`,
    );
    entries.push({ ...data, id: `${locale}/${item.slug}` });
  }
}
await writeFile('src/generated/catalog.json', JSON.stringify(entries, null, 2) + '\n');
await writeFile(
  'public/docs-release.json',
  JSON.stringify({ tag: release.tag, sha: release.sha, publishedAt: release.publishedAt }) + '\n',
);
console.log(`Prepared ${entries.length} localized articles for ${release.tag}.`);
