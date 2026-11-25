import { it, expect } from 'vitest';
import { mkdtemp, cp, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

it('discovers moved guides from the new release without fetching stale snapshot paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'soundsible-import-test-'));
  try {
    await cp('scripts', join(dir, 'scripts'), { recursive: true });
    await cp('content/upstream', join(dir, 'content/upstream'), { recursive: true });
    await symlink(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
    const releasePath = join(dir, 'content/upstream/release.json');
    const published = JSON.parse(await readFile(releasePath, 'utf8'));
    const current = 'docs/ANDROID_ALPHA.md';
    const retired = 'docs/android/ALPHA.md';
    expect(published.files[current]).toBeDefined();
    await writeFile(join(dir, 'published.json'), JSON.stringify(published));
    // The importer starts with the previous release's discovered navigation.
    await writeFile(
      releasePath,
      JSON.stringify({
        ...published,
        documents: published.documents.map((doc: { source: string }) =>
          doc.source === current ? { ...doc, source: retired } : doc,
        ),
      }),
    );
    await writeFile(
      join(dir, 'fetch-fixture.mjs'),
      `
      import { readFileSync } from 'node:fs';
      const published = JSON.parse(readFileSync('published.json', 'utf8'));
      const files = new Map(Object.keys(published.files).map(path =>
        [path, readFileSync('content/upstream/' + path)]));
      globalThis.fetch = async (url) => {
        if (url.endsWith('/releases/latest'))
          return Response.json({ ...published, tag_name: published.tag, published_at: published.publishedAt, html_url: published.url });
        if (url.endsWith('/commits/main')) return Response.json({ sha: 'main-showcase-sha' });
        if (url.includes('/commits/')) return Response.json({ sha: published.sha });
        if (url.includes('/git/trees/'))
          return Response.json({ tree: [...files.keys()].map(path => ({ path, type: 'blob' })) });
        const releasePrefix = 'https://raw.githubusercontent.com/' + published.repository + '/' + published.sha + '/';
        const showcasePrefix = 'https://raw.githubusercontent.com/' + published.repository + '/main-showcase-sha/';
        const isShowcase = (p) =>
          p.startsWith('docs/images/screenshots/') ||
          p === 'docs/images/readme-dark.png' ||
          p === 'docs/images/readme-light.png' ||
          p === 'docs/images/social-card.png';
        if (url.startsWith(showcasePrefix)) {
          const path = url.slice(showcasePrefix.length);
          if (!isShowcase(path)) throw new Error('Non-showcase file fetched from main: ' + path);
          const data = files.get(path);
          return data ? new Response(data) : new Response('', { status: 404 });
        }
        if (!url.startsWith(releasePrefix)) throw new Error('Unexpected fixture request: ' + url);
        const path = url.slice(releasePrefix.length);
        if (isShowcase(path)) throw new Error('Showcase file fetched from release instead of main: ' + path);
        const data = files.get(path);
        return data ? new Response(data) : new Response('', { status: 404 });
      };
    `,
    );
    execFileSync(process.execPath, ['--import', './fetch-fixture.mjs', 'scripts/sync-docs.mjs'], {
      cwd: dir,
      env: { ...process.env, SOURCE_TAG: '' },
    });
    const result = JSON.parse(await readFile(releasePath, 'utf8'));
    expect(result.files[current]).toBe(published.files[current]);
    expect(result.files[retired]).toBeUndefined();
    expect(
      result.documents.filter((doc: { slug: string }) => doc.slug === 'android-alpha'),
    ).toEqual([expect.objectContaining({ source: current })]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 60000);
