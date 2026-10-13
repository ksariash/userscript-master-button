# iPhone Master Button

[![CI](https://github.com/ksariash/userscript-master-button/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/ksariash/userscript-master-button/actions/workflows/test.yml)

A compact Safari userscript for iPhone with local article filtering, synchronized passage review, clean-link tools, and Azure Speech narration.

Master Button brings everyday browsing controls into one movable launcher. Review an article on the original page or in a dedicated reader, correct unwanted passages, and prepare narration from the text you choose to keep.

[Download the userscript](https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.user.js) · [Implementation guide](ALGORITHM_GUIDE.md) · [Frontend guide](FRONTEND_GUIDE.md) · [Validation](TESTING.md)

## Features

- **Shared passage review.** Page controls, transcript, teaching, narration, and export use one passage decision store. Skip grays a passage in place; Keep restores it; Undo reverses a correction and its learning contribution.
- **Local article filtering.** Bundled Defuddle extracts article structure without rewriting the live page. MiniLM embeddings and structural evidence identify likely distractions, while uncertain prose remains included. Explicit choices take precedence over automatic and CSS-rule decisions.
- **Compact controls.** A draggable launcher, light/dark interface, expandable details, and accessible touch targets keep the article visible. Crowded or full-width layouts use a passage chooser instead of overlaying text.
- **Azure narration.** Search regional voices, preview a voice, prepare audio progressively, control playback and speed, and export enabled text or prepared MP3 audio.
- **Link utilities.** Remove recognized tracking parameters, edit destinations, share clean links, and open supported Amazon price-history pages.
- **Site tools.** Per-site cleanup, reversible CSS-rule previews, direct media selection, and contextual controls for supported social, shopping, and map pages.

## Installation

1. Install the [Userscripts app](https://github.com/quoid/userscripts), enable its Safari extension, and allow it on the websites you want to use.
2. Choose a script folder in Userscripts.
3. Save [`master-button.user.js`](https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.user.js) to that folder, keeping the `.user.js` extension.
4. Open a webpage in Safari and tap the **✦** launcher. Drag it to reposition it.
5. Disable older standalone scripts that perform the same functions to avoid competing overlays and page changes.

The script uses content injection and Userscripts grant APIs for protected storage and cross-origin requests. Safari website access is required.

### Updates

Use Userscripts' update feature, when available, or replace the installed file with the latest distribution from `main`. If metadata permissions change, reinstall the script and check website access.

Preferences remain under `master-button:v1`; the Azure key is stored separately. Valid legacy examples are normalized without clearing unrelated settings.

## Usage

### Review an article

Open **Filter → Review passages on page**. Tap a passage control to Skip or Keep it, use **Why** to inspect its decision, and select **Done** to remove the controls. Skipped text remains gray by default; **Advanced filtering** offers optional collapse.

The reader uses the same decisions. Corrections preserve other prepared audio and update future narration requests. **Show all** temporarily restores script-owned hidden content for inspection. Explicit corrections remain active when automatic filtering is disabled.

### Configure speech

Open **Speech**, enter your Azure Speech resource key, choose its region, then save and load voices. Search for a voice and use the adjacent preview control to hear it.

Open the reader, review the enabled passages, and select **Prepare**. Playback begins when the first enabled passage is ready while later passages prepare. Text and MP3 export use the enabled selection.

Only enabled text is submitted for synthesis. Skipping a passage cannot retract a request already sent. Changing voice, region, or quality invalidates incompatible prepared audio.

## Architecture

| Component | Responsibility |
| --- | --- |
| Passage store | Original source identity, decisions, corrections, Undo, and view synchronization |
| Defuddle | Local extraction from a detached document; original wording and DOM mapping retained |
| Semantic filter | Local MiniLM embeddings, site-scoped prototypes, conservative classification |
| Page and reader UI | Render shared decisions and dispatch correction actions |
| Speech pipeline | Azure requests, progressive preparation, playback intent, and export |
| Userscripts storage | Preferences, learned vectors, and separately stored Azure credentials |

Defuddle rejection alone does not exclude a passage; corroborating clutter evidence is required. New examples come exclusively from explicit corrections. MiniLM is an embedding model, and prototype learning does not fine-tune its weights.

## Privacy

Article extraction and semantic inference run in the browser. Defuddle is bundled; the MiniLM runtime and weights download externally. Learned prototypes retain numeric vectors rather than article text or browsing history.

Speech text and the resource key go directly to the configured Azure Speech service. Credentials use extension-controlled storage. The project includes no analytics or third-party article relay.

## Compatibility and limits

The target environment is Safari with the Userscripts extension on iPhone. Automated checks use synthetic pages in Chromium and simulated model/audio services. Physical iPhone Safari, actual MiniLM loading and accuracy, live Azure, and live social-site behavior require separate device validation; see [TESTING.md](TESTING.md).

| Capability | Practical limit |
| --- | --- |
| Local model | Initial download, CSP, device memory, and WASM availability can affect loading; failure is reported visibly |
| Dynamic articles | Changed source text invalidates old transcript chunks; re-extract to include updated wording |
| Background playback | Safari may suspend preparation or passage transitions while locked; export a prepared recording for a local player |
| Combined MP3 | Frame concatenation reuses prepared audio; gapless playback, duration, and seeking vary by player |
| Media downloads | Require accessible direct files; login-gated, signed, blob, or segmented streams may be unavailable |
| Site cleanup | Site DOMs change; NSFW reveal only affects delivered media and does not bypass authorization |
| Cookie consent | Consent management is not implemented; hiding a banner does not submit a consent choice |

## Development

Requirements: Node.js 22+, Python 3, and Playwright/Chromium for browser regressions.

```sh
npm ci
python3 build.py
node --check dist/master-button.user.js
npm test
python3 -m pip install playwright==1.58.0
python3 -m playwright install chromium
python3 tests/browser.py
python3 tests/reddit_delayed.py
python3 tests/experience.py
python3 tests/ux_revision.py
python3 tests/page_review.py
```

Maintain source in `src/` and generate the installable script and matching metadata in `dist/`. Keep the pinned Defuddle bundle and its license in `vendor/`. GitHub Actions verifies reproducible distribution files, decision-policy tests, mobile regressions, and UI screenshots.

Before contributing, read [AGENTS.md](AGENTS.md), [ALGORITHM_GUIDE.md](ALGORITHM_GUIDE.md), and [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md). Product behavior is specified in [REQUIREMENTS.md](REQUIREMENTS.md); visual conventions are defined in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
