# iPhone Master Button — 0.2.0

A compact Safari Userscripts overlay with shared page/transcript corrections, local article extraction, and Azure narration.

## What changed

- Bundled Defuddle 0.19.5 extracts from a detached document while source IDs map back to original passages. Original wording remains intact; extraction membership alone never deletes prose.
- **Filter → Review passages on page** closes the drawer and adds temporary Skip/Keep controls. Skipped passages gray in place and update the transcript immediately. Undo reverses page, transcript, or teaching corrections and their prototype learning. Crowded/full-width passages use a native passage chooser rather than overlapping text. Done removes controls. Use Advanced filtering to opt into collapsing skipped passages.
- One passage store drives page styling, reader inclusion, speech requests and exports. Source text changes invalidate stale reader chunks until re-extraction. Saved CSS exclusions are also excluded from narration. Explicit corrections remain active when automatic filtering is off.
- Compact Teach view, expandable explanations, consolidated styling, usable touch targets and preserved form drafts.
- Repair for malformed saved examples, broken mutation observation, duplicate training, transcript tap handling, buffering continuation and skipped queued speech requests.

## Install or update

Save `dist/master-button.user.js` in the iPhone Userscripts script folder and enable the Safari extension on your chosen sites. Disable earlier standalone scripts. The distribution metadata and install permissions are unchanged apart from version 0.2.0. Settings stay under `master-button:v1`; the Azure key remains under its separate extension-storage key. Valid legacy object-shaped examples are normalized; malformed entries are ignored without clearing unrelated settings.

Until this PR is merged, use its branch's distribution to try the candidate. The automatic update URL still tracks `main`.

## Filtering and speech

Manual Keep/Skip wins over automatic classification. New corrections train one local prototype per sample; legacy token statistics are preserved but no longer double-incremented. MiniLM is an embedding model, not a generative model or weight fine-tuning. Its runtime/weights still download externally, while inference runs locally. If unavailable, review the retained text or disable Local AI before narration. Defuddle is bundled and uses no third-party extraction fallback.

Speech settings require your own Azure key and region. Only enabled text is submitted; skipping after a request was sent cannot retract it. Already prepared unrelated audio is retained. Changing voice, region or quality invalidates prepared audio. Background/locked Safari transitions and combined MP3 seeking remain device-dependent.

## Development

```sh
npm ci
python3 build.py
node --check dist/master-button.user.js
npm test
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/browser.py
python3 tests/reddit_delayed.py
python3 tests/experience.py
python3 tests/ux_revision.py
python3 tests/page_review.py
```

Read **ALGORITHM_GUIDE.md** and **FRONTEND_GUIDE.md** before making changes. Build from `src/`, retain the licensed pinned vendor bundle, and commit source, matching distribution/metadata, documentation and tests together. See TESTING.md for verified scope and remaining device checks.

## Limitations

DOM and simulated model/audio tests do not establish physical iPhone behavior, real model accuracy or live Azure connectivity. Review controls use page margins when available; full-width or crowded blocks use a complete passage chooser. Actual iPhone touch and keyboard behavior still needs device review. Source mapping is conservative and falls back to retained original blocks. Dynamically changed article content requires re-extraction in an already-open reader. Site-specific media download, Reddit cleanup, consent handling and MP3 export retain the limitations described below.

---

## Historical release notes (0.1.x; superseded above where different)

# iPhone Master Button

One floating Safari **Userscripts** drawer with site-aware controls, editable clean links, conservative nuisance hiding, a reviewable article reader, and Azure Speech narration.

## Install on iPhone

1. Install the [Userscripts app](https://github.com/quoid/userscripts), enable its Safari extension, and grant it access to the sites you want to use.
2. In the Userscripts app, choose a scripts folder if one is not already configured.
3. Save [`dist/master-button.user.js`](dist/master-button.user.js) to that folder **as a `.user.js` file**. From GitHub, use the **Raw** view and the iOS Files app, or download the release file from this repository.
4. In Safari, open a normal webpage and look for the translucent **✦** button near the lower-right corner. Drag it to reposition, tap to open the drawer.
5. Turn off the original seven userscripts if they are still installed so their independent modifications and overlays do not compete with the master button.
6. For speech, open **Speech settings**, supply your own Azure Speech resource key and region, save, then **Load voices**. Key is stored via Userscripts extension-specific `GM.setValue`, not `localStorage`.

> Userscripts must run in **content** injection mode because protected storage and cross-origin `GM.xmlHttpRequest` require the grant APIs. Safari website permission is also required. **The 0.1.1 `document-start` metadata remains unchanged in 0.1.4.** The storage keys remain unchanged, so the script itself does not migrate or intentionally erase settings.

## Included in 0.1.4

- Redesigned compact, iPhone-style Shadow DOM drawer with a three-column tools grid, tight site-control rows, persistent draggable button, responsive light/dark appearance, filtered-item count and condensed reader/player controls.
- Conservative URL cleaner, URL editor and native share/copy fallback; recognizable Amazon ASIN links and regional camelcamelcamel shortcuts.
- Per-site reversible nuisance hiding, custom CSS selector rules, safe inspect/preview/cancel/save workflow, and dynamic rescanning; user correction token learning is hashed and local, augmented by an experimental local pretrained MiniLM embedding model and site-scoped learned prototype vectors (only explicit corrections teach it).
- Reddit cleanup / best-effort NSFW reveal (no Old Reddit support). The cleanup includes early CSS suppression of known promos, recognition of large timed app interstitials with the “Get the best of Reddit in the app” headline, and recurring restoration of Reddit-imposed scrolling locks. Cleanup rules for X, Facebook, Instagram, and LinkedIn; optional Slashdot reading layout, older articles and search; recognizable Google Maps-to-Apple Maps URL auto-routing.
- A common media picker and temporary click-to-select mode for X, Instagram, Facebook and LinkedIn; sharing/downloading directly accessible image and video files. Facebook comments are expanded via native controls only.
- Article selection/extraction, editable passage list, explicit Keep/Skip corrections, Azure REST neural voice list/demo/synthesis, progressive MP3 preparation, multi-passage play/pause, passage jump, speed, manual seek, text export and best-effort combined MP3 export.
- An update check against the published metadata; Userscripts is responsible for installing updates (the page never evals remote JavaScript).

## Known limitations and incomplete requirements

**This is a first working release, not full acceptance of every requirement.** In particular:

- **Pretrained language-model embeddings are now implemented but still device-dependent.** The script tries to load the quantized `Xenova/all-MiniLM-L6-v2` pretrained transformer through Transformers.js, runs inference in-browser via WASM (not a text-generation LLM), uses conservative semantic similarity to nuisance examples, and learns per-site prototypes when you explicitly Skip/Keep a selected phrase or transcript passage. The model and runtime download from a CDN/Hugging Face; webpage text is not intentionally sent to them. Model downloads are roughly tens of MB and may fail due to iPhone Safari memory, Userscripts CSP, blocked CDN, network, or cache. The filter explicitly shows **loading / ready / unavailable**; no offline inference can occur until the weights are loaded and cached. There is **no model-weight fine-tuning**; a small trainable local nearest-prototype classification layer adapts on the embeddings and stores numeric vectors (not raw text). Structural rules still provide a fallback. Models were not verified on a physical iPhone. URL cleaning remains conservative and deterministic.
- **Social media extraction is best-effort.** Signed video URLs, blobs, MSE streams, dynamic X posts, and login-gated resources may not be downloadable. There is no site-specific authenticated media API scraping. Selecting a media item does not add permanent controls to the webpage.
- **Reddit NSFW reveal** can only show media the website actually delivers. Unblurring relies on visible DOM/custom components and can require reload to undo; it does not bypass server authorization.
- **Cookie consent management** is not implemented: the tool does not silently accept/reject cookie categories or promise to bypass consent walls. Never interpret hiding a banner as giving consent.
- **Article extraction** works best for structured pages. A small article page may require selecting text or editing/pasting text; no third-party DOM extraction package is included. The local semantic scan examines at most 90 leaf blocks, favoring false negatives over deleting legitimate prose. Explicit selection can train the model with an optional interruption-reason category. Model availability is visible in Filter. Corrections to article classification are learned locally; automatic hiding is restricted to explicit CSS rules and site prompts to avoid destroying content.
- **Narration** uses the Azure REST API. Cross-origin grants, key/region and network must be configured correctly. First synthesized audio may need an additional user tap to start due to Safari's gesture policy. Azure region is a native dropdown, not free text. The voice picker loads all available voices returned by Azure for that region; it supports searching and a small adjacent demo button. A single fallback voice appears before the authenticated list is fetched. Word-level timing is not available; transcript follows at passage level and does not auto-scroll.
- **Audio continuity while locked is not guaranteed.** JavaScript passage transitions/preparation may stop. Prepare all enabled passages, share the resulting recording and play it from a local background-capable player. Keep the source tab open for Safari playback.
- **Combined MP3** is experimental frame concatenation for identical Azure output settings. It avoids second synthesis charges but is not guaranteed gapless, and duration/seeking behavior varies by player. No post-synthesis bitrate conversion; select 48 or 96 kbps before preparation. A changed passage selection invalidates playback and requires preparing its enabled passages again.
- **Stored key secrecy** depends on the Userscripts extension granting isolated content-script storage. It is not an operating-system keychain or guaranteed hardware-backed secret. Do not place a key in the public repository or webpage text.
- Per-site automatic nag detection, map routing, sharing and full-screen layouts **have not been tested on a physical iPhone**; sites change their DOM frequently. No live Azure key was available for an end-to-end synthesis test.

## Testing

Requirements: Python 3, Node 22+; optionally Python Playwright and Chromium.

```sh
python build.py
node --check dist/master-button.user.js
node tests/unit.cjs
python tests/browser.py
python tests/reddit_delayed.py
python tests/experience.py
python tests/ux_revision.py
```

Browser tests use local synthetic HTML, a mocked Userscripts grant layer and headless Chromium. They are **not** iPhone/Safari verification or tests on actual Reddit/Instagram servers. Inspect `tests/` before interpreting the assertions. The failed/stale `tests/browser.cjs` prototype is not used.

**0.1.1 regression (retained):** `python tests/reddit_delayed.py
python tests/experience.py` simulates a delayed full-screen Reddit app upsell, a first body scroll lock, and a subsequent HTML scroll lock. It confirms cleanup, content preservation and a compact drawer in mobile Chromium. This is not verification against live Reddit or real iPhone Safari.

**iPhone checklist:** Confirm Userscripts permissions and one button; drag and rotate; open Reddit anonymously and check scrolling/app nag removal; toggle NSFW; navigate X and Instagram carousel and test both media pickers; test Google Maps opt-in/redirect; verify rule preview/cancel and re-open; try a long article, select/edit text, Azure region/key failure, voices/demo; ensure synthesis charges correspond only to enabled passages; play/pause/minimize; lock the screen; export a prepared MP3 and verify duration in Files/Music/VLC; update manually and check stored settings.

## Updates and development

Edit `src/00-utils.js` through `src/06-main.js`, increase both version constants in `src/00-utils.js` and `build.py`, then run `python build.py` and tests. Commit **both** `dist/master-button.user.js` and `dist/master-button.meta.js`. In Userscripts, use the app's update feature; availability varies by version. If `@grant`, `@connect`, `@match` or other metadata changes, reinstall the `.user.js` file and recheck website access. Settings use `master-button:v1` plus `master-button:v1:azure`, and do not intentionally change across updates.

This project does not run external analytics, relay articles through an untrusted server, or transmit the Azure key to any domain besides the configured Azure Speech endpoint.

## 0.1.3 interaction changes

- **No jumping when correcting transcript passages.** Skipping or including the visible passage keeps the transcript scroll offset and preserves audio already prepared for other passages. Skipping the currently playing passage pauses it and moves to the next prepared passage if possible.
- **Audio clock.** The reader displays elapsed / duration for the current MP3 passage when metadata is available; an unknown time displays `—:—`. Article-wide total runtime is **not** computed, so do not interpret the right-hand duration as the whole article.
- **Filtering overview.** Filter opens with per-site Enable, automatic local AI, model status, **Show all** (reversible preview), Teach, Pick and a learned Skip similarity threshold. Advanced Rules & learning includes a separate built-in nuisance threshold. Similarity scores range approximately -1 to 1, are not probabilities, and do not imply a reasoned generative-model explanation. The Why control in the reader reports whether a decision came from MiniLM embeddings or fallback structural rules, the matching sources, and available scores.
- **Teaching and context.** While choosing a new rule or teaching text, the script temporarily restores hidden elements. It preserves previously hidden neighboring blocks as context for selected-phrase embeddings. Your explicitly pressed Keep/Skip labels drive updates; scores and model predictions never train themselves. A site-scoped record stores numerical vectors, not source article text.
- **Model startup.** Enabled on-device MiniLM begins loading when an article/main region is detected after initialization. Safari Userscripts may block third-party module loading or allocate too little WASM memory; the filter will display an actionable error and retain non-semantic fallback. It has **not** been verified on the user's iPhone.
- **Launcher.** A 56px transparent interaction target around a 44px visual disk supports a single touch to open; dragging requires intentional movement. The drawer and settings use one translucent, grouped iOS-inspired surface and consistent typography and iconography.

### Site test priority

On iPhone, visit a normal article and open Filter. Check whether the status advances from *Loading* to *On-device MiniLM ready* or reports an error, then select a nuisance phrase with nearby hidden text, Teach → Skip, and confirm similar content is excluded. In Reader, scroll down, tap × on a mid-article passage, and verify the scroll position stays unchanged. Play prepared audio and confirm the current-passage elapsed and total times update. Preview should show hidden content and return to filtered state on exit. For a clean test, use an article page with no other userscripts running.

## 0.1.2 design and ML notes

Future LLM implementers: read **`AGENTS.md`** and **`DESIGN_SYSTEM.md`** before touching any UI. Sources and measurable density/accessibility criteria are in the design system. To teach a phrase, select text on the webpage, open Filter → Teach a phrase, choose a reason and Skip similar/Keep similar. To train from the reader, toggle Skip/Keep beside the transcript passage; only explicit choices are training labels. The model learning display is not a claim of generative AI or model-weight fine-tuning.

Speech: choose the Azure region in the region dropdown; save your key, then allow the voice request to finish. The list is fetched from that region only and is searchable; a voice sample plays next to the picker. Voice tests mock Azure API results and do not prove actual Azure connectivity on iPhone.


## v0.1.4 follow-up: touch-target overlap

Position the compact drawer adjacent to (not over) the draggable launcher. It opens above the launcher when room permits and below it near the top of the screen. Two physical touch events in the mobile Chromium simulation now **open and close** reliably with no overlapping overlay intercepting the second tap. The actual iPhone Safari gesture still requires device verification. All v0.1.3 filter and reader improvements are included.

