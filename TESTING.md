# Test scope and status — version 0.1.0

- `node --check`: passed (bundled release parses).
- `node tests/unit.cjs`: passed (9 assertions for URL cleaning, ASINs, Maps parsing, text chunking and site naming).
- `python tests/browser.py`: passed with a mocked grant API and synthetic Reddit-like HTML, headless Chromium mobile viewport: one button, nag cleanup, filter selection highlighting, hide-preview/cancel restoration, reader skip correction. Site detection is intentionally overridden in that fixture because it is loaded from `about:blank`.
- Azure network, device storage isolation, live site DOM and locked-screen playback: **not tested**.
- Fully local pretrained language-model inference: **not implemented**.

The script uses only built-in JavaScript features and does not rely on remotely loaded runtime JavaScript dependencies.
