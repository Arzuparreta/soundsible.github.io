import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const docs = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/docs',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    source: z.string(),
    group: z.string(),
    locale: z.enum(['en', 'es']),
    status: z.enum(['current', 'outdated', 'missing']),
    sourceHash: z.string(),
    tag: z.string(),
    sha: z.string(),
    anchors: z.array(z.string()),
  }),
});
export const collections = { docs };
