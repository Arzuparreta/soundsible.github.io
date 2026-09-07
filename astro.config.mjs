import { defineConfig } from 'astro/config';
import { stableHeadings } from './scripts/content.mjs';
import tailwind from '@astrojs/tailwind';

/**
 * GitHub Pages URL rules:
 * - Repo ORG/ORG.github.io → https://ORG.github.io/ (site root; no subpath)
 * - Repo USER/anything-else → https://USER.github.io/REPO/ (project page)
 *
 * GITHUB_REPOSITORY is set automatically in GitHub Actions (owner/repo).
 * For local dev, set locally if your fork differs, e.g.:
 *   GITHUB_REPOSITORY=soundsible/soundsible.github.io npm run dev
 */
const slug = process.env.GITHUB_REPOSITORY ?? 'Arzuparreta/soundsible.github.io';
const [owner, repo] = slug.split('/');
const isOrgOrUserRootPagesSite = Boolean(owner && repo === `${owner}.github.io`);

const site = `https://${owner}.github.io`;
const base = isOrgOrUserRootPagesSite ? undefined : `/${repo}`;

// https://astro.build/config
export default defineConfig({
  site,
  ...(base ? { base } : {}),
  markdown: {
    remarkPlugins: [stableHeadings],
    shikiConfig: {
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' },
      defaultColor: false,
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
