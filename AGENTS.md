# Implementer guidance

Treat `REQUIREMENTS.md` as the product specification and `DESIGN_SYSTEM.md` as the binding visual/interaction standard for **every future design change**. Preserve the user's per-site preferences and existing extension storage. Keep one installable script at `dist/master-button.user.js`; build from `src/*.js` and publish matching `dist/master-button.meta.js` to the same GitHub commit/release.

Do not call a token-hash classifier a language model, claim pretrained model execution without a successful runtime load, or call embedding-based prototype learning weight fine-tuning. Distinguish model downloads (external) from inference/selected text (local). Treat loaded webpage text as untrusted; never send it to third-party relays. Fail conservatively if the model is blocked on Safari; report state, preserve article prose and request explicit review before narration.

Run syntax, unit, Chromium integration, Reddit delayed-prompt and compact Speech/model-learning tests. Real iPhone Safari and live Azure verification must be labeled separately. Never claim tests not run. Update README/TESTING with material limitations and version-specific metadata/permission changes.


## Non-negotiable interaction invariants (0.1.3+)

Never re-render a reader transcript without preserving scrollTop and touch focus. Correction buttons do not stop or throw away unrelated prepared audio. Playback must show meaningful current-passage elapsed/duration (unknown is `—:—`, not a fabricated total). All floating targets must be at least 56 CSS px in tap area with an unobtrusive visual disk; distinguish taps from drags on touch screens. Do not add permanent site controls. Temporary passage correction controls in explicit Review passages mode are authorized in 0.2.0.

On the filter: one-tap enable/disable and temporary **Show all** preview must remain obvious. Teaching or adding rules restores hidden content while inspecting and includes previously hidden neighboring passages in context, then returns to the page's filtered state when finished/canceled. Both the webpage and transcript use explicit Keep/Skip learning. Explain *why* with the model name/source, Skip/Keep/seed similarity scores, actual thresholds and fallback reason. Scores are similarities, NOT probabilities. Provide separate adjustable thresholds for learned and built-in matches. Never train on model predictions or seeking.

Browser regression `tests/ux_revision.py` is mandatory. Publish `src`, `dist`, `AGENTS.md`, `DESIGN_SYSTEM.md`, README and tests in the same GitHub commit. No chat-only releases; verify raw distribution content after publishing. Preserve `master-button:v1` settings format.

Do not allow the open drawer to cover the floating launcher. Test both first and second touch events in `tests/ux_revision.py` after every menu-position or viewport change.


## 0.2.0 implementation standards

Read `ALGORITHM_GUIDE.md` for shared algorithms and comment conventions and `FRONTEND_GUIDE.md` for compact frontend rules. Both are normative. Build includes the pinned Defuddle vendor bundle. Run `npm test` and `python tests/page_review.py` in addition to previous gates. Preserve original wording and source identity; page review and transcript corrections must update one passage store.
