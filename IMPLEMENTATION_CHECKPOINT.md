# Implementation checkpoint — 2026-10-13

The execution environment reconnected and the complete working copy survived. All 38 current local tests passed again. The full source, dependency lock, trained classification head, evaluation reports and generated alpha are being published through the connected GitHub plugin. No rejected historical code was fetched. The user removed review gates; continue without a design or milestone approval pause.

Version: **2.0.0-alpha.1**, an experimental partial implementation. Automatic model exclusions remain disabled because actual evaluation misses the release target. Explicit corrections, exact-wording memories and saved selector rules work independently of that flag.

Read [PROGRESS.md](PROGRESS.md) for every requirement, [VALIDATION.md](VALIDATION.md) for distinct evidence classes, and [INSTALL.md](INSTALL.md) for setup and filename-scoped storage/update limits. Reproduce with `ONNXRUNTIME_NODE_INSTALL=skip npm ci`, `npm test`, and `npm run build`. Generated file hashes are in `dist/build.json`.

Next work:

1. Finish actual filtering quality, independent label audit and a fresh untouched page/site holdout. Current NLI/head regression has one ARTICLE error, 95% precision, 82.6% recall and three abstentions on 85 newer cases. None is a physical iPhone measurement.
2. Reapply personalized heads to cached assessments immediately; make cancellation clear owned system-media handlers; audit picker event order, whole-article guards, touch targets, and long/dynamic-page scan budgets.
3. Capture corrected production-UI light/dark renders. The original study screenshots remain valid desktop evidence. An earlier production preview had a packaging error; its failed renders must not be presented as UI proof.
4. Run physical iPhone Safari and live Azure checklists when device/service access exists. Both remain untested, including worker/CSP/memory, voice response/abort behavior, key setup, sharing, actual updates, touch/VoiceOver and locked-screen transitions.
5. Validate current site adapters and necessary-only cookie consent. No consent-submission adapter ships; no live-site success is asserted.

The original private design study is available at https://master-button-design-study.surebirch18.chatgpt.site. Project `appgprj_6ace6bb660cc8191bb8a7a76834d4b4c` remains private with its existing owner-only access. Do not create a duplicate or alter access. Production preview packaging uses a function replacement and an IIFE; do not use a JavaScript replacement string containing bundled dollar sequences.
