import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { repository, catalog, excludedSources } from './catalog.mjs';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'soundsible-site' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function json(path) {
  const r = await fetch(`https://api.github.com/repos/${repository}/${path}`, { headers });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status}`);
  return r.json();
}
const release = await json(
  process.env.SOURCE_TAG
    ? `releases/tags/${encodeURIComponent(process.env.SOURCE_TAG)}`
    : 'releases/latest',
);
if (release.draft || release.prerelease)
  throw new Error('Documentation requires a stable, published release.');
const commit = await json(`commits/${encodeURIComponent(release.tag_name)}`);
const tree = await json(`git/trees/${commit.sha}?recursive=1`);
const temp = 'content/.upstream-next';
await rm(temp, { recursive: true, force: true });
await mkdir(temp, { recursive: true });
const files = {};
const documents = [];
const publicDocs = tree.tree
  .filter(
    (x) =>
      x.type === 'blob' &&
      x.path.startsWith('docs/') &&
      x.path.endsWith('.md') &&
      !excludedSources.has(x.path),
  )
  .map((x) => x.path);
const sources = [...new Set([...catalog.map((x) => x.source), ...publicDocs])];
const assets = new Set([
  'branding/logo-app.png',
  ...tree.tree
    .filter((x) => x.path.startsWith('docs/images/') && x.type === 'blob')
    .map((x) => x.path),
]);
try {
  for (const path of [...sources, ...assets]) {
    const response = await fetch(
      `https://raw.githubusercontent.com/${repository}/${commit.sha}/${path}`,
    );
    if (!response.ok) throw new Error(`Missing source ${path}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (publicDocs.includes(path) && !catalog.some((d) => d.source === path)) {
      const title =
        bytes.toString('utf8').match(/^#{1,2}\s+(.+)$/m)?.[1] ??
        path.split('/').at(-1).replace(/\.md$/, '');
      const slug = path
        .slice(5)
        .replace(/\.md$/, '')
        .toLowerCase()
        .replaceAll('_', '-')
        .replaceAll('/', '-');
      if (catalog.some((d) => d.slug === slug) || documents.some((d) => d.slug === slug))
        throw new Error(`Duplicate new guide route: ${slug}`);
      documents.push({
        slug,
        source: path,
        group: 'more',
        title: { en: title, es: title },
        description: {
          en: 'Guide from the current Soundsible release.',
          es: 'Guía de la versión actual de Soundsible.',
        },
      });
    }
    files[path] = createHash('sha256').update(bytes).digest('hex');
    if (path.includes('/'))
      await mkdir(`${temp}/${path.slice(0, path.lastIndexOf('/'))}`, { recursive: true });
    // Root-level sources have no parent directory.
    await writeFile(`${temp}/${path}`, bytes);
  }
  const manifest = {
    documents: [...catalog.filter((d) => d.group === 'more'), ...documents],
    repository,
    tag: release.tag_name,
    sha: commit.sha,
    publishedAt: release.published_at,
    url: release.html_url,
    assets: release.assets.map((a) => ({ name: a.name, url: a.browser_download_url })),
    files,
  };
  await writeFile(`${temp}/release.json`, JSON.stringify(manifest, null, 2) + '\n');
  await rm('content/upstream', { recursive: true, force: true });
  await rename(temp, 'content/upstream');
  console.log(
    `Imported ${Object.keys(files).length} source files from ${release.tag_name} (${commit.sha.slice(0, 8)}).`,
  );
} catch (error) {
  await rm(temp, { recursive: true, force: true });
  throw error;
}
