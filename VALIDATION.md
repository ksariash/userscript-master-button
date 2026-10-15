# Validation — alpha.7 local development; alpha.6 published

## Current local improvement checks

Alpha.7 is an experimental owner-test release. Current changes include title-aware exports, targeted scroll recovery, cached playback state, cross-segment prepared seeking, independent synthesis cancellation, playback-priority transport, shared cold voice lookup, bounded parallel model loading, resource cleanup, and modular/slimmer reader and speech views. 142/142 Node 24.19/Linux tests pass; milestone results are recorded in [BACKLOG.md](BACKLOG.md); no keys or live Azure requests are used.

Preparation fixture: 3 concurrent cold syntheses use 4 transport calls instead of 6; synthetic 20 ms-per-request median 85.087 versus 124.053 ms, peak transport concurrency 1. Model-loading fixture: four tiny synthetic responses, median 41.605 versus 82.039 ms, peak downloads 2, warm downloads 0. These are not service, device, real-model or memory benchmarks. Actual inference/accuracy revalidation is blocked because model files are absent and Hugging Face is unavailable through direct DNS and the configured proxy. Classification policy is unchanged.

`node scripts/check-reader-browser.mjs` uses a local mock-GM implementation preview and desktop Chromium DevTools. The [screenshots and layout report](prototype/screenshots/layout.json) cover light/dark, 320 px, 390×844, landscape, reading options, 28 px text, menu, Why, speech and reduced-height speech. Default transcript ratio at 390×844 is 82.1%. Visible controls are checked for 44 px targets and horizontal/fixed-surface overflow. Scrollable offscreen contents are allowed. Screenshots were visually inspected; this does not prove VoiceOver, Safari safe areas, a real keyboard, zoom, or iPhone gestures. Previous dump-DOM browser attempts timed out; the DevTools-based harness is working.

The owner reports alpha.6 setup works on their iPhone. Wider device/live-Azure gates remain pending. Production userscript and implementation preview are rebuilt from the same source; release files must reproduce with `npm run build` and have no diff.

## Dedicated setup repair — 2026-10-14

The reported iPhone Safari / Userscripts 1.8.6 failure is consistent with the raw response's `default-src 'none'; style-src 'unsafe-inline'; sandbox` and [WebKit 221283](https://bugs.webkit.org/show_bug.cgi?id=221283), a duplicate of [218086](https://bugs.webkit.org/show_bug.cgi?id=218086): initial extension injection can succeed while event callbacks are blocked. Native disclosure toggling does not prove JavaScript events work. This diagnosis uses the user's device/header evidence and the WebKit reports; it was not reproduced on a physical device here.

The fix changes the trusted key-entry destination to exactly `https://ksariash.github.io/userscript-master-button/setup.html`. The repository's static `docs/setup.html` has no page scripts, remote resources, or form; its CSP denies page scripts and submissions without a sandbox directive. The old raw URL forms render only a native migration link before any GM access. No sandbox removal, privileged globals, arbitrary-host key entry, or webpage-storage fallback is introduced.

Local checks cover exact URL restrictions (including credentials/query/fragment/lookalikes), raw migration with stalled GM, native link idempotency, mock Done/storage, verified dummy-key save/forget/failure, lexical GM isolation, empty page storage, and the actual generated userscript's metadata/hash and execution against mock GM. JSDOM does not enforce CSP or reproduce Safari's extension world; these tests establish routing and integration, not real callback compatibility. Azure transport is mocked, and only dummy keys are used.

Both production builds matched byte-for-byte manifest hashes. Prototype and implementation-preview builds completed. Source whitespace checks pass; the generated userscript retains a pre-existing trailing space inside a bundled lamejs diagnostic string (dependency source `dist/lamejs.js`, not an authored code change).

Subsequent release state: alpha.6 was published at `66d367c38d14dbbe97d386455c8b7718b5e221e4` with successful Pages deployment, and the owner reports setup works. Alpha.7 retains the same trusted setup boundary. Broader device checks remain pending. No real Azure key or live Azure request was used. Actual model evaluation was not rerun for this routing-only fix; previous results below remain historical evidence.

## Local policy and integration checks

`npm test`: **92 tests** on Node 24.19/Linux x64. Real Defuddle, source/decision/storage/URL tests, JSDOM UI, mock model/extension/Azure/media transport, recorded-feature policy replay and actual local MP3 encoding. JSDOM has no layout engine. CI does not download or execute the model, contact Azure, or check Safari.

New checks cover atomic bulk correction/learning Undo, range and all-included selection, expired wording leases, before/after page-versus-reading scope, no seek during selection, batch export cancellation, immediate key paste/save failures, separation of verified save from failed voices, visible blob/lazy X players and exact delivered media-ID association. They also cover source article scope and dynamic insertions; original linked-group context without assigning closing prose its decision; evidence/title/link-context leases; lost-source late inference; cached head learning/Undo; automatic exclusions/Show skipped/Keep/snapshot consistency; explicit first model load and subsequent Read startup; immediate Stop despite storage failure; article priority within the 200-passage budget; nag fixed-body/inner-container/inert/touch recovery and exact Undo.

Build with `npm run build`; repeat and compare `dist/build.json`. Generated script/metadata share alpha.6 and pinned dependencies. GitHub CI verifies tests, build and generated-file diff separately from actual inference.

## Actual local model evaluation

Actual one-thread ONNX-WASM ran separately with pinned `Xenova/nli-deberta-v3-xsmall`, revision `2a4f614a701367a02d51389039afc998faeda637`, q8. **731 author-labeled blocks, 17 pages: 11 public captures and six authored layouts.** Labels were frozen before their first inference. Later debugging reused all cases; no independent audit or untouched final holdout is claimed.

The broad head fitted to 314 development cases excluded **21/108 ARTICLE rows** in its first 222-case new-page test. That configuration was rejected. Its report remains at `experiments/evaluation/results-positive-v10.json`.

The final conservative policy excludes **0/354 ARTICLE rows and 56/377 nuisances**: finite-corpus precision 100%, recall **14.9%**, 463 abstentions. It is enabled as a limited experimental subset. **The full 85% recall benchmark has not passed.** Broad-head exclusions remain disabled. Uncertain/unavailable decisions include text. Activations are not calibrated probabilities.

### Requested BBC capture

Exact public URL was fetched with HTTP 200 on 2026-10-14 UTC. HTML: 433,097 bytes, SHA256 `283bf62e4c453643690518dbe3c0c7ba92d9514c3206e5157cb1467076bc7314`. The public manifest stores hashes/categories, not prose; the ignored original capture stays local.

| Measure | Observed |
| --- | --- |
| Full source inventory / exact Defuddle members | 195 / 29 |
| Source article reading scope | 64: all 41 ARTICLE rows plus 23 nuisance candidates |
| Conservative model exclusions within reader | 15: 12 related-book intro/link rows and three promotions |
| Enabled reader/narration/export sequence | 49: all 41 ARTICLE rows plus eight remaining nuisances |
| ARTICLE false exclusions | 0; 24 positively identified, 17 uncertain but included |
| Reader nuisance precision / recall | 100% / 65.2% |
| Whole-page nuisance recall | 22.1%; do not substitute reader scope for this measure |

Headlines, date/byline, standfirst, update note, image credits/captions and body wording remain included. The two related-list campaign tags, five topic tags and one promotion remain in the reader. Keep/Skip correct them through the same store. Reading scope is a source selection, not an LM classification: full-page Review and Read full page inventory retain all rows. There are no BBC URL/text/index special cases in production policy.

### Runtime and reproduction

The full 449-case corrected-context WASM run took 618,067 ms, initialization 1,714 ms from cached files, whole-process peak RSS 1,478,139,904 bytes. A subsequent group/new-case run took 329,502 ms and peaked at 1,548,701,696 bytes. Final group refinement: 85 actual unique group inferences, 11,916 ms. These processes include evaluator/JSDOM dependencies; they are **not iPhone memory, browser latency or network download measurements**.

Weights are 87,246,587 bytes; initial weights/tokenizer/runtime downloads total about 123 MB. Native CPU and WASM differ numerically; prior failed parity and model reports remain. See [evaluation instructions](experiments/evaluation/README.md) and final raw feature/result JSON. `evaluate-positive.mjs` runs new tensors using the production tokenizer/input/policy and fixed labels/head. `record-conservative.mjs` only replays recorded genuine features; it is not another inference run.

## Actual codec checks

The Lame path encoded authored mono 24 kHz tones: FFprobe found 2.064 seconds/24,768 bytes; FFmpeg decoded and sought successfully. This proves a desktop codec path, not live speech, native iPhone sharing or locked-screen playback.

## Scroll evidence and limits

The user reported X/Reddit nags now disappear but scrolling stays blocked. This patch releases attributed fixed-body/negative-offset, inner main-ancestor overflow, inert/touch-action and known Reddit class locks only while a recognized app nag is suppressed and no unrelated dialog is open. The observer covers HTML-root locks, inert and open/hidden/modal changes, coalesces without waiting for a quiet page, and checks only scroll ancestors on a 500 ms watchdog and at gesture start. Owned state is restored on Undo; subsequent site writes are preserved. A passive window-capture guard stops later document-level nag handlers from canceling the first vertical movement; controls, horizontal/pinch gestures and the utility reader remain protected.

Mocks passed. **Physical iPhone scrolling has not been run.** Earlier window-capture cancellation, touchstart cancellation and unknown layouts remain limitations. Official background: [WebKit scrolling architecture](https://trac.webkit.org/wiki/Scrolling). No generic event-handler deletion or access bypass is used.

## Physical Safari — outstanding

Record device/iOS/Safari/Userscripts versions, visual viewport, backend/model/cache state. Test X/Reddit scroll before/after recurring nags, normal dialogs, controls/horizontal media gestures, reader open/close and Undo. On X test videos before/after starting the native player and refreshing Media; blob/playlist-only items must not promise a direct download. On BBC check tap/range/all-included selection, before/after scope, one-step Undo, all article words, related lists, Show skipped/Why/Keep/Undo, source mutations and future speech/export selection.

Measure actual worker/CSP support, first/warm downloads, memory pressure/eviction, long-page work, suspension and battery/thermal effects. Check 320px/390×844/landscape, keyboard/browser bars, large text, text selection/focus/VoiceOver, menu height and reader space. No static render or JSDOM check passes these items.

## Azure and key entry — outstanding

No key received and no actual Azure request made. The prior physical key-entry failure is unresolved. Alpha.4’s safe Check extension storage/support report remains the diagnosis path. Alpha.5 preserves lexical GM, key readback, opaque header-safe validation and live-catalogue-only voice selection. Trusted setup permits transient key entry even if the bridge is missing; Save then reports the exact safe failure beside the field without page-storage fallback. Input/paste, saving, verified and failure states are inline and live-announced. Failed saves retain the field; storage writes/readback have a 12-second bound. Voices load separately, with their failures next to the dropdown. These are mock-verified behaviors, not physical success.

With a key entered on the dedicated setup document, independently verify regional voices, actual synthesis/format, first-segment playback, retries/cache, seek/rate, cancellation, demo overlap, exact enabled-text checks, recording playback/native sharing and locked-screen transitions. Keys must stay out of chat/GitHub/page storage/logs. Mock transport successes do not establish live Azure success.

## Visual evidence

Existing light/dark gallery and alpha.3 production-menu/media/setup renders have recorded provenance. They use mock integrations and desktop Sites rendering; the private preview remains that study. Alpha.5 adds a compact filter status/Show skipped row, inline key feedback, and a selection toolbar replacing the player during batch filtering, covered by DOM checks but **no new browser/physical screenshot QA**. Native Chromium and managed browser QA were unavailable in this executor; no alternate browser or login was attempted.

Official platform sources checked for this patch: [Userscripts API/content injection](https://github.com/quoid/userscripts#api), [MDN MediaSource](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource), [MDN resource timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming), and [Azure voices REST](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech). Resource timing is bounded and only exact X media IDs connect an observed URL to its player; no private API, URL guessing or stream reconstruction is used.

## Candidate release review

Commit 3669c31 was independently rerun: 124 tests, production build, original prototype and implementation-preview builds all passed; regeneration had no tracked diff. Review found and fixed two playback state regressions (buffering after an unrelated correction; resume after seeking from ended state). Both new tests failed before the fix and pass after it; the full corrected suite is 126 tests. Existing 20 screenshot/layout cases are UI evidence for the unchanged reader layout. See BACKLOG.md for explicit unfulfilled acceptance gates and benchmarks/release-review.json for fresh synthetic diagnostics. This is an experimental candidate, not full-product acceptance.

## Storage, lifecycle and conversion follow-up

L2 bounded preference operations and coalesced writes passed at 130 tests. S2/L1 retirement, extraction recovery, scoped nag cleanup and bounded detached-node retention passed at 137. Final suite is 142 tests with worker encoding and artifact cleanup. Desktop layout remains 20/20. `benchmarks/lifecycle.json`, `benchmarks/encoding.json`, and `benchmarks/encoding-browser.json` contain workload definitions and observations. Worker encoding reduces main-thread heartbeat gaps but costs additional total duration and process RSS in the synthetic fixture. Total live memory and actual iPhone behavior remain unverified; 64 MB cache plus 256 MB preparation limits do not cap total process memory.
