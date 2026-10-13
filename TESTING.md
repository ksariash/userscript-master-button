# 0.2.0 validation

## Verified locally

- `python build.py`: builds the pinned Defuddle vendor bundle and nine source modules into one installable userscript and matching metadata.
- `node --check dist/master-button.user.js`: passed.
- Existing utility suite: passed.
- `tests/pipeline.cjs`: passed with jsdom, actual Defuddle 0.19.5, deterministic fake embeddings and simulated audio/GM requests. Covers extraction-to-original-node mapping, malformed saved data, shared page/reader overrides, single prototype replacement, Undo while inference is pending, style restoration, dynamic insertion/text changes, classification beyond the first batch, buffering continuation and skipped queued requests.
- Python browser test files compile.

## Browser/device boundary

All five Chromium suites were attempted locally. Chromium exits with SIGTRAP before a page can open in this environment. **No local screenshot, layout or touch verification is claimed.** The GitHub workflow runs these suites on Ubuntu and uploads light/dark mobile screenshots; its actual result must be checked before merging.

Real MiniLM runtime/weights, live Azure synthesis, actual website DOMs and physical iPhone Safari have not been verified by these tests. jsdom does not measure layout. Fake vectors establish state transitions, not classifier quality.

## New release checklist

1. At 390x844, inspect menu, Filter, Teach, Speech, Reader and on-page controls in both themes. Confirm compact Teach <=360px, Speech <=530px and main menu <=450px, without clipping or overlapping targets.
2. On iPhone, review an article, Skip on the page, open the transcript and Keep the same passage. Verify synchronization, scroll preservation, Undo, Done, source links, keyboard and launcher taps.
3. Test multiple short adjacent passages and edge-to-edge article layouts for control overlap. Review controls may be omitted when two 44px targets cannot fit within their source blocks; the transcript remains the complete correction surface.
4. Edit/add source content dynamically and navigate within an SPA. Confirm new content is reviewed and stale transcript chunks cannot be narrated.
5. Load the actual MiniLM model, test unrelated articles and related-story blocks, and inspect false positives before changing thresholds.
6. Use real Azure credentials for multi-passage playback, buffering, pause while buffering, cancel, voice change, skipped queued passages and exported MP3 duration. Skipping an already-submitted request cannot retract the transmitted text.
7. Update over an existing 0.1.x install and verify rules, settings and Azure key persist. Inspect malformed example recovery separately from semantic accuracy.

---

## Historical 0.1.x results (not evidence for 0.2.0)

# Test scope and status — v0.1.3 (prior regressions retained)

- `node --check dist/master-button.user.js`: passed.
- `node tests/unit.cjs`: passed (9 URL, routing, and text utility assertions).
- `python tests/browser.py`: passed in headless Chromium with a mocked Userscripts GM interface; covers the single launcher, known Reddit prompt removal, filter selection/preview/cancel, and reader corrections.
- `python tests/reddit_delayed.py`: passed. Inserts a synthetic full-viewport interstitial after a timer with the exact “Get the best of Reddit in the app” headline and a CTA. Applies both `body` and later `html` scroll locks. Checks the prompt becomes hidden, feed content stays visible, both locks clear, and the compact drawer fits within 450px at a 390×844 mobile viewport.
- Updated CSS/UI and early `@run-at` metadata have **not** been tested in Mobile Safari. Test page does not reproduce Reddit's private DOM or closed shadow roots.
- Azure synthesis, third-party media downloads, iOS Userscripts permissions, lock-screen behavior and on-device local ML have not been retested.

## iPhone regression checklist

1. Replace the installed `.user.js` file with 0.1.1 and regrant Safari permissions if requested. Temporarily disable the old standalone Reddit script.
2. Open a Reddit subreddit anonymously, wait at least 60 seconds, then navigate to several posts. Confirm the delayed app upsell stays gone and touch scrolling continues.
3. Open Reddit's normal menus and deliberate sign-in flow. Confirm ordinary dialogs still work; disable Auto cleanup to check that hidden content reappears.
4. Test another site and verify the compact drawer, safe-area placement, visual element picker, and audio reader all remain usable.

Known tradeoff: the timed upsell has only been validated against a synthetic approximation. If the live page uses a closed shadow DOM or a full-page server redirect, it will require further site-specific work.

## 0.1.2 additions

Run `python tests/experience.py`. It verifies 30+ Azure region values, three **mock** Azure voices, inline filtering of options, compact speech screen (<530px in Chromium at 390×844), and explicit sample-label training using a **fake deterministic embedding** model. It DOES NOT verify the 23 MB MiniLM download, Transformers.js operation in iPhone Safari or Azure credentials. Chromium UI screenshots: `dist/speech-compact.png`. Physical iPhone validation is mandatory before claiming real model operation or background narration.


## v0.1.3 release checks

- `python tests/ux_revision.py`: Chrome mobile emulation verifies reader scroll restoration after Skip/Keep, elapsed/total time elements, passage Why navigation, toggleable reveal of hidden page content during review, live site sensitivity value, and 56px launcher target. Uses artificial article content and fake, deterministic embedding inference.
- Rerun `python tests/experience.py` to check region picker and mock voice list; its 530px limit is part of the design standard.
- `node --check dist/master-button.user.js` and nine utility tests, Chromium browsing and Reddit-delay regressions remain mandatory.
- **Not yet tested:** actual iPhone tap handling, actual MiniLM model code/weights download in iOS Safari Userscripts, live Azure playback/duration, real website prompt behavior. A synthetic embedding does not verify actual LLM inference or semantic accuracy.
- The two similarity thresholds govern learned Skip examples (default 0.79) and built-in nuisance seeds (default 0.89); Keep examples can protect candidate prose. Similarity is not a posterior probability or calibrated certainty.
- If local inference fails on the device, capture the exact status/error from Filter rather than assuming filtering is active.


## 0.1.4 touch-panel anchor

`tests/ux_revision.py` now verifies first mobile touchscreen tap opens and second tap closes; panel must not cover the 56px launcher hit area. The actual Safari/Userscripts app is still unverified.

