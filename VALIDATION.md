# Validation record and next checks

## Reproduce the work that was run

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run build:prototype
npm test
npm run experiment
MB_RESULTS=experiments/filtering/results-warm.json npm run experiment
```

Node v24.19.0 on Linux x64; Transformers.js 4.3.1, native ONNX 1.30.0, Defuddle 0.19.5, linkedom 0.18.12. Test DOM uses JSDOM 29.0.1 with only our authored script executed; no external resource loading. All eleven tests passed. No GitHub Actions run was claimed.

The model test uses a revision-pinned downloaded language model and real tensor execution. Policy tests supply assessments intentionally; they are not model evaluation. The GUI study uses authored article data and explicit corrections; its speech controls make no network requests. Node model inference and the prototype remain separate.

The real-page labels cover twelve ARTICLE blocks from two public pages (WebKit's Safari 26.0 article and Steph Ango's saw essay). The nuisance cases, including the related-books trap, are authored fixtures. Labels were set by the implementation author before inference and are not independently audited. There is no held-out precision/recall claim. Source page hashes and exact source IDs are in the raw results; captures stay ignored and are not republished.

## Rendering and browser limits

Sites publication renders provide screenshot evidence for the actual HTML/CSS/JS study; they are desktop snapshots. The local native Chromium process could not start successfully in this restricted executor (SIGTRAP). The managed preview supervisor mailbox was absent. The separate cloud browser reached the private preview's sign-in gate and required a fresh account login; that path was stopped without collecting credentials. No browser security or private access configuration was changed. Native private publication and its returned screenshot assets used existing connector authorization.

Accordingly, publication screenshots do not establish interaction QA, small/landscape viewport results, keyboard behavior, actual touch, or Safari compatibility. JSDOM state checks do not establish geometry or contrast. Native renders have their own capture dimensions and may scale 390×844 study frames; keep that distinction in screenshot records.

## Physical iPhone gate — not run

Record iPhone model, iOS/Safari version, Userscripts app version (`GM.info`), actual visual viewport, backend, model revision/dtype, cache state, and power/thermal conditions. Do not infer any from desktop emulation.

1. Install a dedicated feasibility userscript with Userscripts content-scope grants and a harmless local fixture. Record key-storage isolation and GM request/abort types without displaying secrets.
2. Attempt real WASM inference with matching assets, one thread, and no hidden cloud fallback. Repeat under permissive and strict CSP, then test WebGPU only on a supported device. Measure first download, warm reload, model/init latency, long-page work, memory pressure/eviction and recovery, suspension/resume, battery/thermal effects.
3. Exercise page Skip → matching reader → future enabled selection → Undo, with late inference, duplicate text, short/full-width/nested passages, injected recommendations, source edits and SPA navigation. Ensure links remain operable, utility-owned style/lock cleanup is exact, and malformed saved examples never block correction.
4. Capture idle/menu, page correction, Why/full excerpt, reader/player, speech/settings in both appearances over clean and cluttered pages. Inspect 320px, 390×844, landscape, keyboard, safe areas/browser chrome, zoom, large text, long labels, reduced motion, focus/VoiceOver, two launcher taps, drag/tap, scroll/selection/drafts, and final reader passages.
5. Record measured normal menu height (target below roughly 320px) and reader text viewport fraction (target ≥70% at default 390×844). Record exceptions for accessibility sizes. Numerical measures accompany aesthetic review, not replace it.

## Live Azure/audio gate — not run

During speech implementation, use the user's speech resource directly and record region, live voice ID, supported output format, request/response conditions, real duration, and provider event provenance. Keep the key out of page storage, URLs, logs, reports, recordings and repository files.

Verify first-segment start, bounded preparation, caching/retry/429/401 behavior, pause/resume/back/forward/seek/rate, cancellation/stale intent, exact selection rechecks, correction cache reuse, and no demo/article overlap. Test transcript follow/manual return behavior using only real timing. Verify format-aware exports in a real player, including seek, enabled order, size and snapshot invalidation.

On a physical iPhone, lock the screen before and during passage transitions, introduce buffering, then unlock/minimize/reopen. Separately play the prepared recording locally. Record unsupported behavior and the practical fallback; neither mock transport nor static player controls pass this gate.

## Release gate — outstanding

Populate the independent regression corpus and page/site-held-out split; meet the agreed finite-corpus accuracy target or obtain an explicit revision. Complete every ledger row or label a release as partial. Verify migration without deleting unrelated preferences/keys, reproducible source/build/metadata and extension-supported update/reinstall behavior. Publish visual evidence with real content replacing the authored study and incorporate feedback without pausing implementation.
