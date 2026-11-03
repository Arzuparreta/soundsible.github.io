# Deploying the Soundsible website

A request to deploy this website authorizes the complete workflow below. Do it
without asking the user to manage translations, choose a translation service,
provide API credentials, approve AI translations, or run commands themselves.

## Update and translate as part of deployment

1. Check the working tree and fetch `origin/main`. Preserve unrelated work.
2. Run `npm run docs:sync`. This imports documentation from the latest published
   stable Soundsible release, never an open PR or unreleased development branch.
3. Translate the imported documentation into Spanish yourself, as the deploying
   agent. No translation API integration, background watcher, scheduled local job,
   provider-specific pipeline, human review, or translation approval is required.
   Use the capabilities available in your current session; a local AI CLI is also
   fine. Do not add an automatic translator to the website or GitHub Actions.
4. For each article in `scripts/catalog.mjs`, compare its current English source
   (extracted with `sourceContent` from `scripts/content.mjs`) with its last
   translated English input in `content/es/originals/<slug>.md`. Use a diff to
   translate only added or changed passages, apply deletions, and retain unchanged
   Spanish passages. Do not send an entire existing guide to a model again when
   a small diff is sufficient. Translate a genuinely new English guide in full.
   Some upstream guides are already in Spanish: reuse those passages directly.
5. Save Spanish Markdown in `content/es/<slug>.md`, its exact extracted English
   source in `content/es/originals/<slug>.md`, and update `content/es/manifest.json`:
   `sourceHash` is the SHA-256 of that source; `tag` and `sha` come from
   `content/upstream/release.json`; `anchors` come from `anchorsFor(source)`.
   If the content is unchanged, reuse the translation and advance release
   provenance without retranslating it. Include newly discovered guides, not
   just the original curated navigation entries. Translate their page titles too.
6. Trust AI translations. Preserve code, command lines, inline code, URLs,
   identifiers, Markdown structure, and section order. Do not add a translation
   quality gate or an outdated/missing-translation banner. Users can report
   translation problems in GitHub issues. Do not label old text as updated merely
   by changing its metadata.

## Validate and publish

Run `npm test`, `npm run build`, and the existing browser tests. Fix functional
build problems; do not introduce a separate translation approval step. Commit the
source snapshot, Spanish articles, originals, and manifest together. Fetch again
before publishing and ensure the change contains current `origin/main`. A deploy
request authorizes pushing the completed change to `main` and publishing Pages.
If repository protection requires a PR, follow that mechanism.

Wait for the Pages workflow to finish and verify the public `docs-release.json`,
release shown on the landing, and updated Spanish articles. Report the public URL
and actual result. Never call a local build or a pushed commit a completed deploy.

The hourly GitHub workflow can continue refreshing English documentation between
agent-driven deployments. It has no AI credentials and does not translate. The
next agent asked to deploy catches up Spanish using the saved originals and diffs.
