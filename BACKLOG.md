# Master Button staged improvement program

Owner feedback: alpha.6 setup works; filtering is slow/incomplete, audio needs seeking and faster preparation, exports need article titles, X/Reddit still lock scrolling, and the interface needs a substantial slimming redesign. This backlog complements the complete requirement ledger in PROGRESS.md; it does not replace or silently drop deferred features.

Release state: alpha.6 published at `66d367c38d14dbbe97d386455c8b7718b5e221e4` with successful CI and Pages deployment. Local starting commit `dcef75b` has the identical tree. Owner-reported setup success is device evidence for that workflow only, not a full iPhone acceptance pass. Subsequent commits are local until separately released. Preserve the exact trusted setup URL, lexical GM and GM-only key storage.

## Audit findings and acceptance backlog

Source-wide review covers core decisions/source/extraction/learning, platform/storage/model worker, all speech/export modules, site/media/URL/rule tools, UI/CSS, bootstrap/build and tests. Findings below are source evidence or explicit hypotheses, not claims of a full live-site or security certification.

| ID / priority | Evidence and implementation task | Acceptance and coverage | Dependencies / state |
| --- | --- | --- | --- |
| A1 / P0 | Record reproducible CPU baselines and release state before optimization. | `node scripts/benchmark-runtime.mjs`; fixture data only, Node/environment and median timings recorded. | Done locally; benchmarks/alpha6-runtime.json |
| E1 / P1 | `app.mjs` hard-codes both export names despite `controller.inventory.title`. Centralize Unicode-safe, bounded filenames; snapshot the audio title at preparation. | Native sharing and download use same title; no paths/control/bidi chars; blank/reserved/long names safe; title changes cannot rename an old artifact. Unit + runtime tests. | Done locally (E1); 96-test suite passes |
| S1 / P1 | `ScrollRecovery.targets()` walks only the first main branch; fixed HTML, alternate feed ancestors and `pan-x`/`pinch-zoom` locks are missed. | Recover these locks only while a recognized nag is suppressed. Preserve active dialogs, controls, horizontal gestures, reader lock and exact Undo; re-lock/remount tests. Physical X/Reddit trial still required. | Done locally (S1); device acceptance pending |
| S2 / P1 | Watchdog repeatedly queries dialog trees; cleanup scans all nodes/shadow roots. Historical suppressed nodes are retained for the page lifetime. | Dirty-root coalescing, bounded retained detached nodes, no observer feedback loop; stress fixture with repeated SPA/overlay replacement and active dialogs. | After S1 baseline |
| P1 / P1 | `SpeechSession.emit()` repeatedly snapshots/splits all text and touches the LRU for every time event. `speechUpdate()` patches the whole reader. Controller and UI both subscribe and patch on a store change. | Cache sequence derivation by document/revision; player-only time updates; avoid duplicate renders. Count work and benchmark long-reader updates before/after; preserve focus/scroll/selection. | Before redesign and global seeking |
| P2 / P1 | Azure transport serializes requests; first synthesis also validates voices. Export prepares sequentially and playback/prefetch share pending requests with one caller's abort signal. | Measure synthetic cold/warm request counts and latency, define cancellation ownership and playback priority, bound concurrency if supported. Cancel one consumer without breaking another; no stale or excluded text sent. Live latency remains device/service gate. | Before any concurrency change |
| P3 / P1 | MP3 encoding runs on main thread, copies PCM and yields periodically; artifact and buffers can coexist with 64 MB cache and 256 MB export budget. | Worker/cancelable conversion experiment, peak retained bytes, progress responsiveness, output playback/duration checks, detached-artifact cleanup. Do not claim faster service synthesis from CPU tests. | P2, measured export baseline |
| A2 / P1 | Seeking only offers segment-local ±15 seconds; long passages have multiple chunks. | Accessible scrubber with prepared-range/duration semantics, cross-segment seeking, exact boundary handling, paused seek without autoplay, late-result/cancel protection, MediaSession seekto when available. | P1/P2; unknown total stays unknown |
| A3 / P1 | Audio callbacks are anonymous and not removed on stop; playSegment leaves prior audio running while buffering; prefetch flag can be reset by old jobs. | Named listeners removed on disposal; silence on new seek intent; epoch-owned preparation; navigate/cancel/late-play/stop tests. | Can precede A2 |
| F1 / P1 | NLI runs 7 contextual + 3 passage label passes, plus 2 for uncached link groups. Downloads are sequential, initial assets ~123 MB; there is a 40 ms per-passage scan delay. | Measure real cold/warm model download/inference on fixed fixtures; experiment with label batching and bounded asset parallelism; preserve logits/decisions and fallback. Remove delay only after responsive frame-budget validation. | Existing pinned model; real inference required |
| F2 / P1 | Conservative policy previously achieved only 14.9% nuisance recall; broad head falsely excluded references. | Freeze a new independent corpus including owner's failures; keep zero narrative deletions as gate, report precision/recall/abstentions; no URL/text overfitting or broadened exclusion without evidence. | F1; new public captures/device examples |
| L1 / P1 | PageLifecycle rescans entire body and re-extracts after mutations. A callback can continue after URL retirement; asynchronous extraction errors lack recovery. | Stop retired callbacks, handle extraction failure with original text retained; dirty-subtree experiment and bounded task work; mutation/navigation tests. | Audit baseline |
| L2 / P2 | `Settings.load/save` are unbounded unlike key operations; startup can stall on hanging GM. | Bound preference reads, surface retry state, preserve original data, serialize writes without an infinite backlog; slow/failing-GM tests. | Preserve setup isolation |
| L3 / P2 | Model worker factory URL not revoked after session creation; failed worker URL retained until stop; tensor cleanup not in finally. | Success/failure resource accounting and cleanup; no new downloads on warm restart, no orphan workers/timers. | F1 experiments |
| D1 / P1 | Monolithic ~77 KB UI/action module; repeated full-row patching; stacked nav/filter/player/status bands occupy reader space. | Split player, reader rendering and sheets around shared decisions; no duplicate business logic. Keep regression suite green through each extraction. | P1/A2 |
| D2 / P1 | Owner rejects current bulky visual design. Replace stacked panel layout with editorial reader, compact transport, one action rail and contextual inspector; speech diagnostics behind disclosure. | Production UI screenshots in light/dark, 320/390 px and landscape; >=44 px touch targets, focus order, large text/keyboard, no collisions, reader >=70% usable height at 390×844. A material layout redesign, not recoloring. | D1; Chromium available locally; physical Safari separate |
| D3 / P2 | Long lists (voices/media/passages) and error notifications can overwhelm UI; accessibility lacks complete device proof. | Virtualize only after measurement; preserve search/focus/selection. VoiceOver, zoom, reduced motion, offline/error states and touch review. | D2 |
| SEC / P0 ongoing | Credentials isolated, source text escaped through DOM/SSML, URL/voice endpoints validated; setup boundary must never broaden. Closed shadow is not an authorization boundary against page key listeners. | Existing exact-URL/lexical-GM/storage/report regressions; no real keys or Azure network tests. Do not add page scripts/analytics to docs/setup.html. | Every stage |
| R1 / P1 ongoing | Tests cover mocks/recorded features, not current iPhone layout, live X/Reddit markup, paid service latency or locked-screen audio. | Every commit records commands/results/limitations; synchronize dist and preview when runtime changes; separate local, published and deployed states; release approval required. | Every stage |

## Measured baseline and limits

`benchmarks/alpha6-runtime.json` is one Linux Node 24.19 run of synthetic CPU work, median of seven measured rounds (extraction three) after warm-up. It includes 50/200-paragraph inventory/extraction, 100 speech-state emissions, and 20 scroll-recovery passes. JSDOM has no layout engine. Variance/JIT mean different fixture sizes are not directly comparable; use identical workloads for before/after, and rerun paired when optimizing. No network, credentials, real inference, or Azure calls. Baseline: 200-paragraph extraction 286.636 ms, 100 speech emissions 69.582 ms, 20 scroll releases 13.149 ms. These are diagnostic measurements, not iPhone or user-visible load-time claims.

## Staging and next handoff

1. Audit/baseline commit (A1 + backlog).
2. Title-aware exports (E1), with generated bundles and regressions.
3. Targeted scroll recovery (S1), with separate regressions and generated bundles.
4. Playback lifecycle/performance (A3/P1), then seek/queue changes (A2/P2/P3).
5. Filter experiments and correctness (F1/F2) in parallel only if explicitly delegated.
6. Modular UI and substantially slimmer visual redesign (D1/D2), then device acceptance.

Do not bundle all stages into one release or claim the backlog complete after the first slice. Owner can test each independently reviewed release. For the first slice, ask the owner to verify title filenames, touch scrolling after recognized X/Reddit nags, and deliberate compose/login dialogs on their iPhone; no secrets or sensitive page captures needed.

## Local milestone: title-aware exports

Alpha.7 is an unpublished development candidate. E1 uses a shared filename function, UTF-8 byte limits, control/bidi/path-character stripping, reserved-name handling and a fallback only for absent titles. Audio captures the filename at preparation; text uses the current extracted title. 26 focused tests and the full 96-test suite pass; production and implementation preview rebuilt. No paid request, publication, or new device verification.

## Local milestone: targeted scroll recovery

S1 checks up to 24 feed/main ancestors across branches, releases fixed HTML as well as body, restores vertical touch capability and ancestor pointer/inert locks, and drops detached-node leases. No arbitrary overlay deletion was added. Four new regressions failed against alpha.6 recovery and passed after the fix; an additional inert ownership regression passes. Controls with contenteditable/ARIA roles and multi-touch stay outside the swipe guard. Existing intentional-dialog, reader ownership, repeated-lock and Undo tests remain covered.

Physical limits remain: an earlier window touch listener cannot be uncanceled; a leftover lock without an identified suppressed nag is not enough evidence for automatic recovery; unrecognized site prompts require inspection. Do not claim this resolves every current X/Reddit lock until the owner tests it.

Final S1 checks: 101/101 full tests pass; both prototype builds pass; repeated production manifests match (`96e62eae…cf833a`). Optional Chromium layout fixture is blocked by a headless launch timeout; even about:blank produced no DOM. No visual or device pass is claimed. Next implementation milestone is A3/P1 (audio lifecycle and narrow player updates), followed by seek/queue improvements and the larger UI redesign.
