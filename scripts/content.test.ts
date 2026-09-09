import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { visit } from 'unist-util-visit';
import { catalog } from './catalog.mjs';
import { markdown, sourceContent, anchorsFor, rewriteLink, translationStatus } from './content.mjs';
describe('release documentation pipeline', () => {
  it('extracts native instructions and refuses an unknown README layout', () => {
    const item = catalog[0];
    const readme = readFileSync('content/upstream/README.md', 'utf8');
    const content = sourceContent(item, readme);
    expect(content).toMatch(/^# Native installation/);
    expect(content).not.toContain('### Docker');
    expect(() => sourceContent(item, '# Changed source')).toThrow('headings changed');
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
  });
  it('detects missing and stale translations without blocking the English release', () => {
    expect(translationStatus('new', undefined)).toBe('missing');
    expect(translationStatus('new', { sourceHash: 'old' })).toBe('outdated');
    expect(translationStatus('new', { sourceHash: 'new' })).toBe('current');
  });
  for (const item of catalog) {
    it(`${item.slug}: Spanish preserves technical literals, links, headings and source identity`, () => {
      const meta = JSON.parse(readFileSync('content/es/manifest.json', 'utf8'))[item.slug];
      if (!meta) {
        expect(translationStatus('source', undefined)).toBe('missing');
        return;
      }
      const translated = { ...meta, content: readFileSync(`content/es/${item.slug}.md`, 'utf8') };
      const source = readFileSync(`content/es/originals/${item.slug}.md`, 'utf8');
      expect(source).toBeTypeOf('string');
      expect(translated.sourceHash).toBe(createHash('sha256').update(source).digest('hex'));
      expect(translated.anchors).toEqual(anchorsFor(source));
      expect(anchorsFor(translated.content)).toHaveLength(translated.anchors.length);
      const literals = (text: string) => {
        const values: string[] = [];
        visit(markdown.parse(text), (node: any) => {
          if (['code', 'inlineCode'].includes(node.type)) values.push(node.value);
          if (['link', 'image', 'definition'].includes(node.type)) values.push(node.url);
        });
        return values.sort();
      };
      expect(literals(translated.content)).toEqual(literals(source));
      expect(translated.content).not.toMatch(/ZXQ\d+QXZ|⟦\d+⟧/);
    });
  }
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
