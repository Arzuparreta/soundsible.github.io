import { visit } from 'unist-util-visit';
import { markdown } from './content.mjs';

// A translation is invalidated by the hash of the whole document, so a release
// that changes two lines of a 27 KB guide invalidates all of it. Retranslating
// everything by hand is what nobody did, which is why every Spanish article sat
// at v0.5.0 while the site served v0.10.0. These helpers cut both documents
// into top-level blocks so the cost of an update is proportional to the change.
//
// The reassembly rule is `blocks.join('\n\n') + '\n'`: verified byte-exact
// against all 22 published Spanish articles before this was written.
export function splitBlocks(source) {
  return markdown
    .parse(source)
    .children.map((node) => source.slice(node.position.start.offset, node.position.end.offset));
}

export function assemble(blocks) {
  return blocks.join('\n\n') + '\n';
}

// Code is never translated: `npm test` requires every code and inline-code
// value to survive translation byte for byte, comments included.
export function parseBlock(text) {
  const children = markdown.parse(text).children;
  return children.length === 1 ? children[0] : null;
}

export function literalsOf(text) {
  const values = [];
  visit(markdown.parse(text), (node) => {
    if (node.type === 'code' || node.type === 'inlineCode') values.push(node.value);
    if (node.type === 'link' || node.type === 'image' || node.type === 'definition')
      values.push(node.url);
  });
  return values.sort();
}

// Everything that is not a literal, so a block of pure code or a bare `</details>`
// can be reused without spending a request on it.
export function translatableText(text) {
  const parts = [];
  visit(markdown.parse(text), (node) => {
    if (node.type === 'text') parts.push(node.value);
    if (node.type === 'html') parts.push(node.value.replace(/<[^>]*>/g, ' '));
  });
  return parts
    .join(' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .trim();
}

// Only the text between tags may change; an attribute carries paths and URLs
// that nothing rewrites downstream.
function htmlSkeleton(text) {
  return (text.match(/<[^>]*>/g) ?? []).join('');
}

function shape(node) {
  if (!node) return 'multiple-blocks';
  if (node.type === 'heading') return `heading:${node.depth}`;
  if (node.type === 'list')
    return `list:${node.ordered ? 'ordered' : 'bullet'}:${node.children.length}`;
  if (node.type === 'table')
    return `table:${node.children.length}:${node.children[0]?.children.length ?? 0}`;
  return node.type;
}

// Structure is checked, not prose: a translation may reorder emphasis inside a
// sentence, but it may not lose a table column, a list item or a heading level.
export function validateBlock(english, spanish) {
  const source = parseBlock(english);
  const target = parseBlock(spanish);
  if (shape(source) !== shape(target))
    return { ok: false, reason: `structure changed: ${shape(source)} became ${shape(target)}` };
  if (source?.type === 'html' && htmlSkeleton(english) !== htmlSkeleton(spanish))
    return { ok: false, reason: 'the HTML tags or their attributes changed' };
  const before = literalsOf(english);
  const after = literalsOf(spanish);
  if (before.length !== after.length || before.some((value, i) => value !== after[i]))
    return {
      ok: false,
      reason: `code and link targets must be identical. Expected ${JSON.stringify(before)}, got ${JSON.stringify(after)}`,
    };
  if (/ZXQ\d+QXZ|⟦\d+⟧/.test(spanish))
    return { ok: false, reason: 'the output still contains placeholder tokens' };
  return { ok: true };
}

// Longest common subsequence over block text. Blocks that survived an upstream
// edit untouched keep the Spanish they already have; only what actually moved
// is sent to the model.
export function alignBlocks(previousEnglish, currentEnglish, previousSpanish) {
  const reusable = previousEnglish.length === previousSpanish.length && previousEnglish.length > 0;
  if (!reusable) return currentEnglish.map((text) => ({ text, spanish: null }));
  const n = previousEnglish.length;
  const m = currentEnglish.length;
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      table[i][j] =
        previousEnglish[i] === currentEnglish[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
  const plan = [];
  let i = 0;
  let j = 0;
  while (j < m) {
    if (i < n && previousEnglish[i] === currentEnglish[j]) {
      plan.push({ text: currentEnglish[j], spanish: previousSpanish[i] });
      i++;
      j++;
    } else if (i < n && table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      plan.push({ text: currentEnglish[j], spanish: null });
      j++;
    }
  }
  return plan;
}
