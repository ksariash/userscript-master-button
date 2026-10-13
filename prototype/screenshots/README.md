# Screenshot evidence

Actual native Sites publication snapshots, not generated mock screenshot artwork. The capture service uses a desktop viewport of 1200×750. The gallery contains four 390×844 design frames scaled to 70% to fit that capture; each frame is interactive HTML/CSS/JS with authored data. Inspect at full image size or open the unscaled study.

The gallery covers launcher/menu, page correction, reader/player, and on-demand Why. Light/dark and clean/busy comparisons are captured as separate files. These states demonstrate the visual direction; no physical-device, touch, standalone browser-interaction or live speech test is claimed.

The first `platform-overview.png` captured the original interactive study and cropped its lower edge. It is an intermediate render, not acceptance evidence. The four gallery captures are the review evidence. Minor scaling/desktop font substitution is expected; actual iPhone typography and geometry require device screenshots.

Uncaptured physical checks remain pending: 320px, landscape, actual keyboard, increased accessibility text, long excerpts/labels, safe areas/browser chrome/zoom and speech setup errors. See `VALIDATION.md` for the checklist. JSDOM tests only state changes and do not render geometry.

## Production UI

`implementation-light.png`, `implementation-dark.png`, `implementation-light-busy.png`, and `implementation-dark-busy.png` show the production launcher/menu, page correction, reader/player and on-demand explanation in four 390×844 frames scaled to 0.7. They are real 1200×750 desktop publication renders with authored source and mock integrations. Exact version/source provenance is in `implementation-provenance.json`.

The first production capture revealed a title collision; Review controls were consolidated into the bottom contextual surface. A previous broken inline-JavaScript capture was replaced and is not evidence. These images do not validate physical iPhone behavior, real model execution or live Azure.

The dark/busy comparison was recaptured after isolating iframe layout viewports and waiting one frame before positioning. The replacement shows the reader/player; the incomplete earlier render is not distributed.
