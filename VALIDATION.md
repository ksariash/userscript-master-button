# Validation record — experimental alpha

## Reproduce local checks

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm test
npm run build
npm run build:prototype
node scripts/build-implementation-prototype.mjs
```

All **44 tests passed again after recovery**, on Node 24.19.0/Linux x64. These include actual Defuddle extraction, policy/storage/URL tests, JSDOM state checks, mocked Azure/cancellation/cache tests and actual local MP3 encoding. JSDOM has no layout engine. Mock assessments are deliberate contract inputs and provide no model-accuracy evidence. GitHub Actions also passed the 44-test/source-build workflow on commit `855426e7eb4beab7cb79b6a47c26dc06160bac1e` ([run 38482945224](https://github.com/ksariash/userscript-master-button/actions/runs/38482945224)). It ran npm ci, tests, build and a clean generated-file diff; no model download/evaluation, live Azure or physical Safari check.

## Actual model evaluation

Real pinned ONNX inference ran separately on desktop CPU: FLAN-T5-small, Qwen3 0.6B and DeBERTa NLI. The initial 169 labels cover eight pages/four layouts; an additional 85 cases cover three new sites. Six initially mislabelled related links were corrected by semantic audit; initial manifests and Qwen results remain. Labels were set by the implementation author, without independent audit. Later debugging reused regression inputs; current reports are not an untouched final holdout.

The current 85-case NLI/head report has **one ARTICLE false exclusion, 95% NUISANCE precision, 82.6% recall and three abstentions**. Abstentions count as nuisance misses. Targets are unmet; `baseline-head.json` keeps `validatedExclusion: false`. Automatic exclusion recall is therefore zero, and original text remains included unless explicitly corrected or matched by a saved rule. Scores are uncalibrated activations.

Weights: 87,246,587 bytes, pinned revision and integrity in the evaluation/docs. Desktop feature runs took roughly nine seconds to initialize and peaked around 803–875 MB for the whole process. These are not Safari or iPhone resource measurements. See [the raw evaluation record](experiments/evaluation/README.md).

## Actual browser-runtime code in Node

The smaller browser worker uses Hugging Face Tokenizers 0.2.0 and ONNX Runtime Web directly. It omits unrelated model/task registries and embeds only one worker. Against Transformers.js/native CPU on four authored inputs, its native-CPU feature values matched within 5.6e-17 with equal token counts.

Real one-thread WASM execution in Node differed from native CPU by up to 0.154 on those inputs. The separate 85-case WASM regression still had one ARTICLE error, 95% precision, 82.6% recall and three abstentions. It took 1,766 ms to initialize from local cached files; median block 665 ms, p95 1,470 ms, total 71,722 ms. Whole-process peak RSS was 1,389,916,160 bytes, including the evaluation process and its imported dependencies. This is actual WASM execution, **not browser or physical iPhone validation**, and not a new independent holdout. Do not transfer native performance/calibration claims to Safari or WebGPU.

Reproduce with `node experiments/evaluation/runtime-parity.mjs`, `MB_RUNTIME=wasm node experiments/evaluation/runtime-parity.mjs`, and `MB_RUNTIME=wasm MB_SPLIT=fresh-held-out node experiments/evaluation/features.mjs`. The WASM parity report deliberately fails the numerical-equivalence criterion; preserve it. The production exclusion validation flag remains false.

## Actual codec verification

The local Lame encoder produced a mono 24 kHz MP3 from two authored tones: FFprobe reported 2.064 s and 24,768 bytes. FFmpeg decoded and sought without error. This proves a desktop codec path, not live Azure output, native iPhone sharing or locked-screen playback. Current speech tests use mock PCM and transport.

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

## Alpha.2 key setup patch evidence

`npm test`: 47/47 pass. Three added mock DOM tests exercise both exact raw setup URL forms, automatic form opening, field focus, Save/Forget, GM-only storage with empty page storage and no transport calls, rejected URL variants, unavailable extension storage and `GM.openInTab` navigation. The fake fixture uses a repeated character, never a real resource key. Build repeated with identical SHA256 `368b1d0c1b23cac7884e423c04cb0cee12a5dd3d013fcd74fbbadf63aa9e2097`.

Official platform reference checked: [Userscripts README/API](https://github.com/quoid/userscripts), which documents async granted storage/open-tab APIs, content injection and opening the popup after external file edits. This patch does not establish physical Safari injection, touch/keyboard behavior, extension-storage persistence or live Azure success. Those remain separate outstanding checks. Model evaluation was not rerun because inference is unchanged.
