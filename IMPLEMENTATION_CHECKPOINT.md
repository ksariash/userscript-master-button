# Implementation checkpoint — 2026-10-13

Review/approval gates were removed and the foundation merged in PR #2, commit 8621d46e67f9bab65cc76a8a0e5507e1b5835367. Continue implementation without asking for another design, model, architecture or milestone approval. The rejected historical implementation was not retrieved or reused.

## Upload blocked by execution environment

A substantial implementation and alpha bundle were built in the workspace. Before the full source/artifact GitHub commit, the execution environment disconnected. Both command execution and a file-reader recovery attempt failed or hung; the explicit error was environment_offline / Environment is not connected. GitHub authorization still works; no browser login or personal token was requested.

The complete local implementation is NOT published in this repository. Some central source contracts have been recovered from this session's generation commands onto rebuild/implementation. That recovery subset is not an installable release, and its formatting recovery has not been tested in the now-offline executor. Do not claim that the earlier full-suite pass verifies every recovered file.

Expected working copy:
  /workspace/scratch/77edc3f26350/userscript-master-button

Expected source includes core/decisions.mjs; src/core/{source,page-tone,controller,head,site-head,language-features,model-contract,assessment}.mjs; src/core/baseline-head.json; src/platform/{storage,classifier,model-worker}.mjs; src/ui/{app,icons}.mjs and utility.css; src/speech/{azure,audio,session,export}.mjs; src/tools/{rules,urls,sites,owned-styles}.mjs; tests; scripts; experiments/evaluation; licenses; installation/update documents. Reconnect and inspect these files before rewriting or rebuilding them. Workspace availability is currently unconfirmed.

Last observed local bundle:
- dist/master-button.user.js, 1,839,767 bytes
- SHA-256 a3794a29b6d1d88bd2d9418d5f8b8a6bb3315ac5baa26a3648d5aadc257a2a89
- Version 2.0.0-alpha.1, matching .meta.js and dist/build.json
- It was built, not installed or published. Do not link it as an available GitHub release.

## Evidence — separate classes

| Class | Observed result | Limit |
| --- | --- | --- |
| Policy / actual Defuddle / mock DOM and Azure integration | Last full local suite: 38 passed. Covered shared Skip/Keep, late assessments, Undo teaching, mutation leases, missing selected-source preservation, malformed storage, no persisted visit list, selector cancel, drafts/scroll, paid-request rechecks/cache/cancel, retired sessions, URL semantics. | No physical browser geometry or live Azure. A later attribute-observer edit had a successful rebuild, but final full-suite rerun could not finish after disconnection. |
| Actual model evaluation | Real pinned FLAN, Qwen and DeBERTa ONNX inference on desktop Node CPU. Initial 169 labels / 8 pages, then 85 blocks / 3 additional sites. | Author labels; no independent audit. Debugging reused holdout pages, so current results are regression, not a pristine release holdout. |
| Actual audio encoding / decoding | Lame-based single PCM stream → MP3; FFprobe: mono 24 kHz, 2.064 s, 24,768 bytes for two authored test tones. FFmpeg decoded and sought without error. | Not Azure speech, an iPhone player or locked-screen listening. |
| Rendered design | Existing phase-0 light/dark, clean/busy screenshots remain valid. | Desktop publication render, not Safari/touch/physical checks. |
| New implementation preview | Packaging bug caught: string replacement interpreted dollar sequences in bundled code, creating invalid inline JS. Fixed with a function replacer and IIFE; local JSDOM smoke: host and study present, no JS errors. | Corrected final light/dark screenshots were not completed. Broken publication was rolled back to the prior verified design study. |
| Physical iPhone Safari | Not run; device/OS/Userscripts version not supplied or accessible. | No compatibility, memory, touch, CSP, storage or background claim. |
| Live Azure | No key/resource or live synthesis used. | No billing, live voices, synthesis, native sharing or locked-screen verification. |

## Model and learning findings

Qwen3 0.6B q4f16, prompt v5, found 8/9 nuisances without ARTICLE errors in the 37-block probe, but failed expanded development (7 ARTICLE errors; precision 78.8%, recall 100%) and first expanded holdout (11 errors; 71.1%, 96.4%). Desktop whole-process peak was approximately 3.9 GB.

The selected lower-cost experiment uses Xenova/nli-deberta-v3-xsmall, revision 2a4f614a701367a02d51389039afc998faeda637, q8 weights 87,246,587 bytes; SHA-256 3fac2500c45c75af42c7711de0d1b93d59577456100208be0dc1f9e8811946b6. Base cross-encoder/nli-deberta-v3-xsmall is an actual NLI language model, not an embedding similarity substitute. Earlier feature runs peaked around 803–875 MB for the whole desktop process; none is an iPhone measurement.

A small classification head consumes actual entailment activations and structural evidence. Explicit site labels update its weights with real gradient steps; base language-model weights remain frozen. Exact-wording exceptions, inspect/disable/delete/reset and transactional Undo were implemented. No prediction self-training or full-LM fine-tuning is claimed.

NLI/head v5 passed a corrected 88-block regression (0 ARTICLE errors, 100% nuisance precision, 92.9% recall), then failed the first 85-block new set (four ARTICLE translation-link errors; 82.6% precision/recall). Current v7 translation abstention still missed the target: last report had one ARTICLE error, 95% precision, 82.6% recall and three abstentions. Automatic exclusions remained disabled. Do not turn the validation flag on based on the small probe or green unit tests.

An audit also corrected six related-story links on the Saw essay that the initial main-selector labeling had incorrectly marked ARTICLE. Preserve real-pages-initial.json and original Qwen reports. Raw feature/result files and manifests are expected under experiments/evaluation; captures/weights are ignored under .cache. Do not invent missing weights, predictions, hashes, probabilities or timings if recovery fails.

## Implementation coverage and outstanding work

The full requirement ledger is retained in PROGRESS.md. Local implementation covered disjoint original ranges, exact Defuddle evidence, one decision layer, page controls, reader selection/editing, per-site settings/learning, owned selector previews and optional hiding, direct Azure transport and bounded queues, PCM caching/MP3 exports, URL tools, best-effort site utilities, GM migrations, one-instance protection and reproducible metadata/builds.

Before claiming completion:
1. Recover/push the complete source, raw reports, package-lock, trained head, bundle, licenses and tests. The current recovery subset does not substitute for them.
2. Finish filtering quality with a new independent holdout and independent label audit. Initial release targets: zero ARTICLE false exclusions, >=95% nuisance precision, >=85% recall, abstentions counted as misses.
3. Improve whole-document mutation rescans to affected-region work where needed; verify long/dynamic-page budgets. Existing bounds: one inference worker/thread by default, 200 passages per analysis batch, 40 visible controls, one speech request, two prepared later segments, 64 MB PCM cache, 256 MB export conversion.
4. Apply personalized-head changes immediately to cached assessments; an improvement for this was planned but its command failed before execution. Keep/exact memories already override decisions.
5. Fix the Follow control's 28px target to >=44px; the attempted edit did not run. Audit earlier-capture site link handlers in picker mode and legacy whole-article selector protection excluding script text.
6. Clear owned MediaSession handlers/intents on cancellation; preserve retired-session protections. Handle Safari activation errors with a useful prepared-audio retry.
7. Run actual physical iPhone and live Azure checklists, including key setup, original filename-scoped migration, generated update metadata, binary response/abort behavior, playback/seek/share, keyboard/zoom/safe areas/VoiceOver and lock-screen transitions.
8. Validate live site/necessary-only consent adapters. No consent-submission adapter ships. Site tools are best effort and currently unverified; unattributed global scroll locks must not be cleared.
9. Complete implementation light/dark and busy screenshots after fixing packaging; do not use the failed renders as evidence. Reference design study remains available privately.

## Recovery details

Private study project: appgprj_6ace6bb660cc8191bb8a7a76834d4b4c
URL: https://master-button-design-study.surebirch18.chatgpt.site
Prior verified publication restored: version id appgprj_6ace6bb660cc8191bb8a7a76834d4b4c~appgver_58428e7f63448191bf3deae27b753bf1, source 8ab512f39e998ca594241cdb2d8c8493dde74975.
The fixed-preview helper had accepted credential/packaging input before disconnection, but its final commit/archive result was not captured. Do not invent a SHA or redeploy an unknown source. Reopen the existing Site source checkout and read its current state when the executor reconnects; do not create a second Site or alter access.

Known reproduction:
  ONNXRUNTIME_NODE_INSTALL=skip npm ci
  npm test
  npm run build
  npm run build:prototype
  node scripts/build-implementation-prototype.mjs

Node 24.19.0; Transformers.js 4.3.1; native ONNX 1.30.0; web ONNX 1.31.0-dev.20260914-8d85527a0; Defuddle 0.19.5; esbuild 0.28.1; JSDOM 29.0.1; @breezystack/lamejs 1.2.7; Lucide 1.56.0.
Userscripts current official API source confirms GM values are scoped by userscript filename. Preserve the original filename and old master-button:v1 data; old separately stored key names were not retrieved from rejected code.
