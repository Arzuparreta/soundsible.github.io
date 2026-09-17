import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog } from './catalog.mjs';
import {
  splitBlocks,
  assemble,
  alignBlocks,
  literalsOf,
  translatableText,
  validateBlock,
} from './translate-core.mjs';

describe('block-level translation', () => {
  // The whole design rests on this: a document has to survive being cut into
  // blocks and put back together, or reusing the unchanged ones would rewrite
  // the file every run.
  const manifest = JSON.parse(readFileSync('content/es/manifest.json', 'utf8'));
  for (const item of catalog.filter((d) => manifest[d.slug]))
    it(`${item.slug}: the published Spanish article rebuilds byte for byte`, () => {
      const article = readFileSync(`content/es/${item.slug}.md`, 'utf8');
      expect(assemble(splitBlocks(article))).toBe(article);
    });

  it('reuses the Spanish of blocks an upstream edit did not touch', () => {
    const before = ['# Title', 'Unchanged paragraph.', 'Old paragraph.'];
    const spanish = ['# Título', 'Párrafo sin cambios.', 'Párrafo antiguo.'];
    const after = ['# Title', 'Unchanged paragraph.', 'New paragraph.', 'Appended.'];
    expect(alignBlocks(before, after, spanish)).toEqual([
      { text: '# Title', spanish: '# Título' },
      { text: 'Unchanged paragraph.', spanish: 'Párrafo sin cambios.' },
      { text: 'New paragraph.', spanish: null },
      { text: 'Appended.', spanish: null },
    ]);
  });

  it('translates everything when there is nothing to reuse', () => {
    expect(alignBlocks([], ['# Title'], [])).toEqual([{ text: '# Title', spanish: null }]);
    // A corpus whose two halves disagree cannot be aligned by index.
    expect(alignBlocks(['a', 'b'], ['a'], ['A'])).toEqual([{ text: 'a', spanish: null }]);
  });

  it('spends no request on a block with nothing to translate', () => {
    expect(translatableText('```bash\n# 1. Install prerequisites\nsudo apt install git\n```')).toBe(
      '',
    );
    expect(translatableText('</details>')).toBe('');
    expect(translatableText('Open the player.')).toBe('Open the player.');
  });

  it('keeps code, comments and link targets out of the translation', () => {
    const code = '```bash\n# 1. Install prerequisites\nsudo apt install git\n```';
    expect(validateBlock(code, code).ok).toBe(true);
    expect(
      validateBlock(code, '```bash\n# 1. Instala los requisitos\nsudo apt install git\n```').ok,
    ).toBe(false);
    expect(literalsOf('See [the guide](INSTALL.md) and `run.py`.')).toEqual([
      'INSTALL.md',
      'run.py',
    ]);
    expect(
      validateBlock('See [the guide](INSTALL.md).', 'Consulta [la guía](INSTALACION.md).').ok,
    ).toBe(false);
    expect(
      validateBlock('See [the guide](INSTALL.md).', 'Consulta [la guía](INSTALL.md).').ok,
    ).toBe(true);
  });

  it('refuses a block whose structure moved', () => {
    expect(validateBlock('## First run', '### Primera ejecución').ok).toBe(false);
    expect(validateBlock('## First run', '## Primera ejecución').ok).toBe(true);
    expect(validateBlock('- one\n- two', '- uno').ok).toBe(false);
    expect(
      validateBlock('| A | B |\n| --- | --- |\n| 1 | 2 |', '| A | B |\n| --- | --- |\n| 1 | 2 |')
        .ok,
    ).toBe(true);
    expect(validateBlock('| A | B |\n| --- | --- |\n| 1 | 2 |', 'Una tabla.').ok).toBe(false);
  });

  it('lets raw HTML change only between its tags', () => {
    const html = '<summary><b>More screenshots</b></summary>';
    expect(validateBlock(html, '<summary><b>Más capturas</b></summary>').ok).toBe(true);
    expect(validateBlock(html, '<summary><i>Más capturas</i></summary>').ok).toBe(false);
    expect(
      validateBlock('<img src="a.png" alt="Player">', '<img src="b.png" alt="Reproductor">').ok,
    ).toBe(false);
  });

  it('refuses leaked placeholder tokens', () => {
    expect(validateBlock('Open the player.', 'Abre el ⟦1⟧.').ok).toBe(false);
  });

  it('explains why it refused', () => {
    expect(validateBlock('## First run', '### Primera').reason).toMatch(/structure changed/);
    expect(validateBlock('Run `run.py`.', 'Ejecuta `ejecutar.py`.').reason).toMatch(/identical/);
  });
});
