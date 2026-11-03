# Soundsible website

The bilingual project home, documentation reader and public Live listener for
[Soundsible](https://github.com/Arzuparreta/soundsible).

Production: https://arzuparreta.github.io/soundsible.github.io/

## Develop and verify

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

The development server prepares the documentation from the checked-in source
snapshot. Search is generated from the final HTML; use a production preview to
exercise it:

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run preview
```

`build` runs Astro diagnostics, generates pages and both Pagefind indexes, then
checks all internal links, fragment targets, images and main landmarks.
Browser checks cover navigation, languages, themes, search, installation,
shared tracks, Live states and WCAG A/AA rules. Remote CI additionally installs
Chromium's operating-system dependencies.

## Content and release provenance

- `content/upstream/` is a reproducible snapshot from a published stable release,
  including its original Markdown, screenshots, commit and file hashes. It is
  imported, never edited as an independent English documentation source.
- `scripts/catalog.mjs` defines public reading order, routes and localized labels.
  Working plans and internal contracts are intentionally excluded. Newly published
  public Markdown guides appear under More guides until curated labels are added.
- `content/es/` contains full Spanish articles with their original content hash,
  release, commit and stable heading anchors. Translations were drafted with
  machine assistance and edited for terminology; commands and link targets are
  checked against the originals. Translation corrections are welcome as PRs.
- `src/content/docs/`, `src/generated/` and `public/source-assets/` are generated
  before development and builds. They are not edited or committed.

To import the latest published stable release:

```sh
npm run docs:sync
npm run docs:prepare
```

To reproduce a specific published stable release:

```sh
SOURCE_TAG=vX.Y.Z npm run docs:sync
npm run build
```

The importer resolves a tag to one commit before fetching any source. It replaces
the snapshot only after every required file has downloaded successfully. CI
keeps the exact source and translation inputs alongside the generated website.

The scheduled job, pushes to main and manual dispatch import the latest
release before building, preventing a later website change from restoring old
documentation. Pull requests build the checked-in snapshot for reproducible review. The workflow publishes only after all checks succeed; a failed
update leaves the previously deployed website intact. There is no runtime
GitHub dependency for reading documentation.

### Translation updates

Translations are part of the deploying agent's work. Asking an agent to deploy
means updating the latest stable documentation, translating pending changes,
validating the website, and publishing it. The complete instructions are in
[AGENTS.md](AGENTS.md); no additional user involvement is needed.

The agent compares current English articles with `content/es/originals/`, translates
only changed passages in existing Spanish articles, and translates new guides in
full. Spanish Markdown, exact English originals, and release metadata are committed
together. There is no translation API dependency, watcher, human approval, or
translation quality gate. Missing and outdated translations show no warning;
users can report problems through GitHub issues. GitHub's scheduled builds can
refresh English independently; Spanish catches up at the next agent deployment.

The original installation guide clones `main`. The Get started page derives its
commands from the release README and pins the clone to that release's tag. The
rendered original remains intact, with an explicit link to those commands. The
server guide also shows a sourced clarification for the Node.js prerequisites
listed in the release README.

## Routes and compatibility

English remains at the existing root; Spanish uses `/es/`. Astro's configured
base supports both GitHub project pages and account-root pages, including forks.
Set `GITHUB_REPOSITORY=owner/repository` locally to test a different deployment.

`/live/?session=…` and `/open/#t=…` retain their existing contracts. Language
changes preserve query strings and fragments. Live updates its labels in place,
without replacing its audio element, peer or chat connection. Theme preferences
are optional browser-local storage; the site works when storage is unavailable.

`PUBLIC_COMMUNITY_URL` overrides the existing public Community relay. No new
backend, account system, hosted translator or analytics service is required.

## Deployment

GitHub Pages must use **GitHub Actions** as its source. Pull requests upload a
`site-preview` artifact and browser results; pushes to `main` publish the
validated build. Scheduled refreshes are requested hourly at minute 17 (GitHub may delay runs) and manual dispatch
can choose a release tag. After publication, check the deployed navigation,
search, languages, Live and `docs-release.json` before calling it verified.
