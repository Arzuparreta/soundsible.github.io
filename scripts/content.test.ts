import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { catalog } from './catalog.mjs';
import { sourceContent, anchorsFor, rewriteLink, translationStatus } from './content.mjs';
describe('release documentation pipeline', () => {
  it('extracts native instructions and refuses an unknown install layout', () => {
    const item = catalog.find((d) => d.slug === 'native-installation')!;
    const content = sourceContent(item, readFileSync(`content/upstream/${item.source}`, 'utf8'));
    expect(content).toMatch(/^# Native installation/);
    expect(content).toContain('## First run');
    expect(content).not.toContain('Headless server');
    expect(() => sourceContent(item, '# Changed source')).toThrow('review nativeInstall');
  });
  it('keeps stable, unique source heading anchors', () => {
    expect(anchorsFor('# Hello\n\n## A `code` heading\n\n## Hello\n\n## Hello\n')).toEqual([
      'hello',
      'a-code-heading',
      'hello-1',
      'hello-2',
    ]);
  });
  it('maps relative links to the same language and respects the project prefix', () => {
    const item = catalog.find((d) => d.slug === 'dj-mode')!;
    expect(
      rewriteLink('LIVE.md#1-what-goes-on-air', item, 'es', '/soundsible.github.io', 'abc'),
    ).toBe('/soundsible.github.io/es/docs/live/#1-what-goes-on-air');
    expect(
      rewriteLink('images/player.png', item, 'en', '', 'abc', {
        'docs/images/player.png': 'source-assets/docs/images/player.1a2b3c4d.png',
      }),
    ).toBe('/source-assets/docs/images/player.1a2b3c4d.png');
    expect(() => rewriteLink('images/gone.png', item, 'en', '', 'abc')).toThrow(
      /outside the release snapshot/,
    );
    expect(rewriteLink('../shared/main.py', item, 'en', '', 'abc')).toContain(
      '/blob/abc/shared/main.py',
    );
    expect(rewriteLink('https://example.com', item, 'es', '', 'abc')).toBe('https://example.com');
    // An unknown Spanish section falls back to the English article.
    expect(rewriteLink('INSTALL.md#section-not-translated-yet', item, 'es', '', 'abc')).toBe(
      '/docs/install/#section-not-translated-yet',
    );
    expect(rewriteLink('INSTALL.md#7-storage', item, 'es', '', 'abc')).toBe(
      '/es/docs/install/#7-storage',
    );
    expect(rewriteLink('INSTALL.md', item, 'es', '', 'abc')).toBe('/es/docs/install/');
    // The native page is an excerpt of this file; a link to it wants the whole guide.
    expect(rewriteLink('INSTALL.md#7-storage', item, 'en', '', 'abc')).toBe(
      '/docs/install/#7-storage',
    );
  });
  it('detects missing and stale translations without blocking the English release', () => {
    expect(translationStatus('new', undefined)).toBe('missing');
    expect(translationStatus('new', { sourceHash: 'old' })).toBe('outdated');
    expect(translationStatus('new', { sourceHash: 'new' })).toBe('current');
  });
});

describe('release snapshot provenance', () => {
  it('every imported file matches the recorded release hash', () => {
    const release = JSON.parse(readFileSync('content/upstream/release.json', 'utf8'));
    for (const [file, hash] of Object.entries(release.files))
      expect(
        createHash('sha256')
          .update(readFileSync(`content/upstream/${file}`))
          .digest('hex'),
        file,
      ).toBe(hash);
  });
});
