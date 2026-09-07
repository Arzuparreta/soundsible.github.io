import { it, expect } from 'vitest';
import { mkdtemp, cp, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
it('builds a newer English release with an old translation and a new untranslated guide', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'soundsible-release-test-'));
  try {
    await cp('scripts', join(dir, 'scripts'), { recursive: true });
    await cp('content', join(dir, 'content'), { recursive: true });
    await symlink(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
    const release = JSON.parse(await readFile(join(dir, 'content/upstream/release.json'), 'utf8'));
    release.tag = 'v99.0.0';
    release.sha = '1234567890abcdef';
    const file = join(dir, 'content/upstream/docs/AUTO_MODE.md');
    const updated = (await readFile(file, 'utf8')) + '\nNew English release content.\n';
    await writeFile(file, updated);
    release.files['docs/AUTO_MODE.md'] = createHash('sha256').update(updated).digest('hex');
    release.documents = [
      {
        slug: 'new-guide',
        source: 'docs/NEW_GUIDE.md',
        group: 'more',
        title: { en: 'New guide', es: 'New guide' },
        description: { en: 'A new guide', es: 'Guía nueva' },
      },
    ];
    const newSource = '# New guide\n\nAn untranslated public guide.\n';
    await writeFile(join(dir, 'content/upstream/docs/NEW_GUIDE.md'), newSource);
    release.files['docs/NEW_GUIDE.md'] = createHash('sha256').update(newSource).digest('hex');
    await writeFile(join(dir, 'content/upstream/release.json'), JSON.stringify(release));
    execFileSync(process.execPath, ['scripts/prepare-docs.mjs'], {
      cwd: dir,
      env: { ...process.env, GITHUB_REPOSITORY: 'Arzuparreta/soundsible.github.io' },
    });
    const en = await readFile(join(dir, 'src/content/docs/en/dj-mode.md'), 'utf8');
    const es = await readFile(join(dir, 'src/content/docs/es/dj-mode.md'), 'utf8');
    const pending = await readFile(join(dir, 'src/content/docs/es/new-guide.md'), 'utf8');
    expect(en).toContain('New English release content.');
    expect(en).toContain('tag: "v99.0.0"');
    expect(es).toContain('status: "outdated"');
    expect(es).not.toContain('New English release content.');
    expect(es).not.toContain('tag: "v99.0.0"');
    expect(pending).toContain('status: "missing"');
    expect(pending).toContain('An untranslated public guide.');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 15000);
