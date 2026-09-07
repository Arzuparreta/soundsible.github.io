# Project hub review

The site replaces the scrolling marketing landing page with a compact project
home, installation choices, a documentation reader, Live and project resources.
Both English and Spanish are available throughout, with system/light/dark themes.

## Captures

| Desktop home                        | Spanish mobile home                |
| ----------------------------------- | ---------------------------------- |
| [Full screenshot](home-desktop.png) | [Full screenshot](home-mobile.png) |

| Documentation in dark mode  | Mobile installation                 |
| --------------------------- | ----------------------------------- |
| [Screenshot](docs-dark.png) | [Full screenshot](start-mobile.png) |

Captured from the production build in Chromium at 1440 × 1000 and 390 × 844.

## Local verification

- 49 unit/pipeline tests passed, including all existing WHEP/shared-track tests,
  preservation of technical literals in translations, source hashes, a simulated
  new release, outdated Spanish content and a newly discovered untranslated guide.
- 15 browser tests passed. They cover both languages and themes, keyboard and
  mobile navigation, article-fragment continuity, search and empty results, code
  copying, release-pinned native/Docker instructions, invalid shared links, and
  localized Live states.
- Automated WCAG A/AA checks passed on the home, installation, documentation
  index, installation and DJ articles, project page and shared-link page in all
  four language/theme combinations, plus mobile documentation.
- Production builds passed for the project subpath and an account-root Pages
  configuration. Both checked all 58 pages for internal links, fragments, assets,
  duplicate IDs, main landmarks and image alternatives.
- Live language/theme tests use a simulated WebRTC peer: the audio element and
  peer remain unchanged, and user-provided names are never translated.
- The existing public relay responded with an empty directory during the check.
  No live broadcast was available for an end-to-end listening test.

## Source corrections and publication

The site includes explicit, sourced clarifications where the release documents
are inconsistent: source-install prerequisites, development-default commands,
and iOS assets already present in the release. The original snapshot remains
unchanged. Upstream corrections are proposed in
[Soundsible PR #143](https://github.com/Arzuparreta/soundsible/pull/143).

The site PR is a review handoff, not a production deployment. Merging into main
runs the publication workflow. After that deployment, check its docs-release.json,
both language routes, search and the Live directory before calling the public
site verified. Real listening requires a live session and remains a separate
acceptance check from the simulated connection test.
