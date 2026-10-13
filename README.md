# iPhone Master Button

One floating Safari **Userscripts** drawer with site-aware controls, editable clean links, conservative nuisance hiding, a reviewable article reader, and Azure Speech narration.

## Install on iPhone

1. Install the [Userscripts app](https://github.com/quoid/userscripts), enable its Safari extension, and grant it access to the sites you want to use.
2. In the Userscripts app, choose a scripts folder if one is not already configured.
3. Save [`dist/master-button.user.js`](dist/master-button.user.js) to that folder **as a `.user.js` file**. From GitHub, use the **Raw** view and the iOS Files app, or download the release file from this repository.
4. In Safari, open a normal webpage and look for the translucent **✦** button near the lower-right corner. Drag it to reposition, tap to open the drawer.
5. Turn off the original seven userscripts if they are still installed so their independent modifications and overlays do not compete with the master button.
6. For speech, open **Speech settings**, supply your own Azure Speech resource key and region, save, then **Load voices**. Key is stored via Userscripts extension-specific `GM.setValue`, not `localStorage`.

> Userscripts must run in **content** injection mode because protected storage and cross-origin `GM.xmlHttpRequest` require the grant APIs. Safari website permission is also required. **Reinstall the `.user.js` file for 0.1.1** because the run-at metadata changed from `document-idle` to `document-start`. The storage keys remain unchanged, so the script itself does not migrate or intentionally erase settings.

## Included in 0.1.1

- Redesigned compact, iPhone-style Shadow DOM drawer with a three-column tools grid, tight site-control rows, persistent draggable button, responsive light/dark appearance, filtered-item count and condensed reader/player controls.
- Conservative URL cleaner, URL editor and native share/copy fallback; recognizable Amazon ASIN links and regional camelcamelcamel shortcuts.
- Per-site reversible nuisance hiding, custom CSS selector rules, safe inspect/preview/cancel/save workflow, and dynamic rescanning; user correction token learning is hashed and local.
- Reddit cleanup / best-effort NSFW reveal (no Old Reddit support). The cleanup includes early CSS suppression of known promos, recognition of large timed app interstitials with the “Get the best of Reddit in the app” headline, and recurring restoration of Reddit-imposed scrolling locks. Cleanup rules for X, Facebook, Instagram, and LinkedIn; optional Slashdot reading layout, older articles and search; recognizable Google Maps-to-Apple Maps URL auto-routing.
- A common media picker and temporary click-to-select mode for X, Instagram, Facebook and LinkedIn; sharing/downloading directly accessible image and video files. Facebook comments are expanded via native controls only.
- Article selection/extraction, editable passage list, explicit Keep/Skip corrections, Azure REST neural voice list/demo/synthesis, progressive MP3 preparation, multi-passage play/pause, passage jump, speed, manual seek, text export and best-effort combined MP3 export.
- An update check against the published metadata; Userscripts is responsible for installing updates (the page never evals remote JavaScript).

## Known limitations and incomplete requirements

**This is a first working release, not full acceptance of every requirement.** In particular:

- **No pretrained browser language model or weight fine-tuning yet.** The current on-device classification is conservative structural heuristics plus a bounded, site-scoped hashed-token classifier updated from explicit passage corrections. It is lightweight and private, but is **not an LLM**. Future work: validate candidate local encoders on real iPhone memory budgets before shipping one. The URL cleaner is deterministic, not LLM-based, to avoid breaking meaningful parameters.
- **Social media extraction is best-effort.** Signed video URLs, blobs, MSE streams, dynamic X posts, and login-gated resources may not be downloadable. There is no site-specific authenticated media API scraping. Selecting a media item does not add permanent controls to the webpage.
- **Reddit NSFW reveal** can only show media the website actually delivers. Unblurring relies on visible DOM/custom components and can require reload to undo; it does not bypass server authorization.
- **Cookie consent management** is not implemented: the tool does not silently accept/reject cookie categories or promise to bypass consent walls. Never interpret hiding a banner as giving consent.
- **Article extraction** works best for structured pages. A small article page may require selecting text or editing/pasting text; no third-party DOM extraction package is included. Corrections to article classification are learned locally; automatic hiding is restricted to explicit CSS rules and site prompts to avoid destroying content.
- **Narration** uses the Azure REST API. Cross-origin grants, key/region and network must be configured correctly. First synthesized audio may need an additional user tap to start due to Safari's gesture policy. Voice regions are free-text; voices are loaded for the entered region. Word-level timing is not available; transcript follows at passage level and does not auto-scroll.
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
```

Browser tests use local synthetic HTML, a mocked Userscripts grant layer and headless Chromium. They are **not** iPhone/Safari verification or tests on actual Reddit/Instagram servers. Inspect `tests/` before interpreting the assertions. The failed/stale `tests/browser.cjs` prototype is not used.

**0.1.1 regression:** `python tests/reddit_delayed.py` simulates a delayed full-screen Reddit app upsell, a first body scroll lock, and a subsequent HTML scroll lock. It confirms cleanup, content preservation and a compact drawer in mobile Chromium. This is not verification against live Reddit or real iPhone Safari.

**iPhone checklist:** Confirm Userscripts permissions and one button; drag and rotate; open Reddit anonymously and check scrolling/app nag removal; toggle NSFW; navigate X and Instagram carousel and test both media pickers; test Google Maps opt-in/redirect; verify rule preview/cancel and re-open; try a long article, select/edit text, Azure region/key failure, voices/demo; ensure synthesis charges correspond only to enabled passages; play/pause/minimize; lock the screen; export a prepared MP3 and verify duration in Files/Music/VLC; update manually and check stored settings.

## Updates and development

Edit `src/00-utils.js` through `src/06-main.js`, increase both version constants in `src/00-utils.js` and `build.py`, then run `python build.py` and tests. Commit **both** `dist/master-button.user.js` and `dist/master-button.meta.js`. In Userscripts, use the app's update feature; availability varies by version. If `@grant`, `@connect`, `@match` or other metadata changes, reinstall the `.user.js` file and recheck website access. Settings use `master-button:v1` plus `master-button:v1:azure`, and do not intentionally change across updates.

This project does not run external analytics, relay articles through an untrusted server, or transmit the Azure key to any domain besides the configured Azure Speech endpoint.
