import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { catalog } from './catalog.mjs';
import { sourceContent, anchorsFor } from './content.mjs';
import {
  splitBlocks,
  assemble,
  alignBlocks,
  parseBlock,
  literalsOf,
  translatableText,
  validateBlock,
} from './translate-core.mjs';

// Regenerates the Spanish articles from the imported release. It writes the
// same four things a person would have written by hand — the article, the exact
// English input, and `sourceHash`/`tag`/`sha`/`anchors` in the manifest — so
// `npm test` checks this output exactly as it checked the hand-made corpus.
//
// It never runs inside the deploy build. Translations arrive through a pull
// request, because a site that publishes text nobody has read is worse than a
// site whose Spanish is one release behind.

const MODEL = process.env.TRANSLATE_MODEL ?? 'claude-opus-5';
const EFFORT = process.env.TRANSLATE_EFFORT ?? 'medium';
const CONCURRENCY = Number(process.env.TRANSLATE_CONCURRENCY ?? 4);

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const at = args.indexOf(flag);
  return at < 0 ? undefined : args[at + 1];
};
const options = {
  all: has('--all'),
  slug: value('--slug'),
  force: has('--force'),
  dryRun: has('--dry-run'),
  limit: Number(value('--limit') ?? Infinity),
};
if (!options.all && !options.slug) {
  console.error(
    'Usage: npm run translate -- --slug <slug> | --all [--force] [--dry-run] [--limit N]',
  );
  process.exit(2);
}

const release = JSON.parse(await readFile('content/upstream/release.json', 'utf8'));
const manifest = JSON.parse(await readFile('content/es/manifest.json', 'utf8'));
const glossary = await readFile('content/es/glossary.md', 'utf8');

const SYSTEM = `You translate the documentation of Soundsible, a self-hosted music server, from English into Spanish.

You are given ONE Markdown block at a time, plus the heading it sits under. Return the translated block and nothing else: no preamble, no explanation, no code fence around your answer, no commentary about what you changed.

Rules, in order of importance:

1. Preserve every literal exactly, byte for byte: anything inside backticks or a fenced code block (comments inside code included), every URL, every link target, every file path, every environment variable, every command. A single changed character in any of these fails the build.
2. Preserve the structure of the block. A heading stays a heading of the same level. A table keeps its columns and rows. A list keeps its items and its kind. A block of raw HTML keeps its tags and its attributes unchanged — only the text between the tags is translated.
3. Translate the meaning faithfully. Do not add, remove, soften or strengthen anything. Hedges matter in this project: "beta", "unverified", "not been run on a device", "may", "should" must survive with the same force they have in English.
4. Follow the glossary below without exception.

${glossary}`;

const client = new Anthropic({ maxRetries: 4 });
const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0 };

function record(response) {
  usage.calls++;
  usage.input += response.usage.input_tokens ?? 0;
  usage.output += response.usage.output_tokens ?? 0;
  usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
  usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

// A model that wraps its answer in a fence is answering about Markdown instead
// of returning it. Code blocks are never sent here, so a fence is always spurious.
function unfence(reply, english) {
  if (parseBlock(english)?.type === 'code') return reply;
  const fenced = reply.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
  return fenced ? fenced[1] : reply;
}

async function ask(messages) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: EFFORT },
    // The system prompt carries the whole glossary and never varies within a
    // run, so every block after the first reads it from cache.
    cache_control: { type: 'ephemeral' },
    system: SYSTEM,
    messages,
  });
  record(response);
  if (response.stop_reason === 'refusal')
    throw new Error(`the model declined to translate (${response.stop_details?.category})`);
  if (response.stop_reason === 'max_tokens')
    throw new Error('the reply hit max_tokens; the block is too large to translate in one call');
  return response;
}

async function translateBlock(english, context) {
  const prompt = `Context — this block appears in the article "${context.title}"${
    context.heading ? `, under the heading "${context.heading}"` : ''
  }.

Translate this block:

${english}`;
  const messages = [{ role: 'user', content: prompt }];
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await ask(messages);
    const spanish = unfence(textOf(response), english);
    const verdict = validateBlock(english, spanish);
    if (verdict.ok) return spanish;
    if (attempt === 1) throw new Error(`block rejected twice: ${verdict.reason}`);
    messages.push(
      { role: 'assistant', content: response.content },
      {
        role: 'user',
        content: `That reply is not usable: ${verdict.reason}. Return the same block translated again, obeying the rules. Output only the block.`,
      },
    );
  }
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

async function run(item) {
  const source = sourceContent(item, await readFile(`content/upstream/${item.source}`, 'utf8'));
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const existing = manifest[item.slug];
  if (existing?.sourceHash === sourceHash && !options.force)
    return { slug: item.slug, status: 'current' };

  const blocks = splitBlocks(source);
  const hasPrevious =
    existing &&
    existsSync(`content/es/${item.slug}.md`) &&
    existsSync(`content/es/originals/${item.slug}.md`);
  const plan = hasPrevious
    ? alignBlocks(
        splitBlocks(await readFile(`content/es/originals/${item.slug}.md`, 'utf8')),
        blocks,
        splitBlocks(await readFile(`content/es/${item.slug}.md`, 'utf8')),
      )
    : blocks.map((text) => ({ text, spanish: null }));

  // A block of pure code, or a bare closing tag, has nothing to translate.
  for (const step of plan)
    if (step.spanish === null && translatableText(step.text) === '') step.spanish = step.text;

  const pending = plan.filter((step) => step.spanish === null);
  if (options.dryRun)
    return {
      slug: item.slug,
      status: existing ? 'outdated' : 'missing',
      blocks: blocks.length,
      pending: pending.length,
    };

  let heading = '';
  const title = parseBlock(blocks[0])?.type === 'heading' ? translatableText(blocks[0]) : item.slug;
  const contexts = plan.map((step) => {
    const node = parseBlock(step.text);
    if (node?.type === 'heading') heading = translatableText(step.text);
    return { title, heading };
  });

  const translated = await pool(
    plan.map((step, index) => ({ step, context: contexts[index] })),
    async ({ step, context }) => step.spanish ?? (await translateBlock(step.text, context)),
  );

  const spanish = assemble(translated);
  const englishAnchors = anchorsFor(source);
  if (anchorsFor(spanish).length !== englishAnchors.length)
    throw new Error(`${item.slug}: the assembled translation has a different number of headings`);
  const before = literalsOf(source);
  const after = literalsOf(spanish);
  if (before.length !== after.length || before.some((literal, i) => literal !== after[i]))
    throw new Error(`${item.slug}: code or link targets changed across the assembled document`);

  await writeFile(`content/es/${item.slug}.md`, spanish);
  await writeFile(`content/es/originals/${item.slug}.md`, source);
  manifest[item.slug] = {
    tag: release.tag,
    sha: release.sha,
    sourceHash,
    anchors: englishAnchors,
  };
  return {
    slug: item.slug,
    status: hasPrevious ? 'updated' : 'translated',
    blocks: blocks.length,
    pending: pending.length,
  };
}

const targets = (
  options.slug ? catalog.filter((item) => item.slug === options.slug) : catalog
).slice(0, options.limit);
if (targets.length === 0) {
  console.error(`No catalog document matches --slug ${options.slug}.`);
  process.exit(2);
}

const results = [];
for (const item of targets) {
  try {
    const result = await run(item);
    results.push(result);
    if (result.status !== 'current')
      console.log(
        `${result.slug}: ${result.status} (${result.pending}/${result.blocks} blocks to translate)`,
      );
  } catch (error) {
    console.error(`::error::${item.slug}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (!options.dryRun && results.some((r) => r.status === 'updated' || r.status === 'translated')) {
  // Existing keys keep their order so the diff shows the translations that
  // changed, not a reshuffled file.
  const ordered = {};
  for (const key of Object.keys(JSON.parse(await readFile('content/es/manifest.json', 'utf8'))))
    if (manifest[key]) ordered[key] = manifest[key];
  for (const item of catalog)
    if (manifest[item.slug] && !ordered[item.slug]) ordered[item.slug] = manifest[item.slug];
  await writeFile('content/es/manifest.json', JSON.stringify(ordered, null, 2) + '\n');
}

const counts = results.reduce((all, r) => ({ ...all, [r.status]: (all[r.status] ?? 0) + 1 }), {});
if (results.length)
  console.log(
    `\n${Object.entries(counts)
      .map(([status, n]) => `${n} ${status}`)
      .join(', ')}.`,
  );
if (usage.calls)
  console.log(
    `${usage.calls} requests to ${MODEL} at effort ${EFFORT}: ${usage.input} input, ${usage.cacheWrite} cache write, ${usage.cacheRead} cache read, ${usage.output} output tokens.`,
  );
