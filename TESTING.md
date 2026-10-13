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
