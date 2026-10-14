# Actual local filtering evaluation

These runs execute real pinned ONNX tensors locally on desktop Node CPU or one-thread WASM. They are not Safari checks, mock inference, independently audited labels, or a guarantee about arbitrary sites.

## Inputs and results

The initial expanded set has 169 labels on eight pages: four public captures and four original authored layouts. Labels and capture hashes were frozen before benchmark inference. A later semantic audit found six related-story links incorrectly labeled ARTICLE by the initial main-selector rule on the Saw essay. `real-pages-initial.json` retains that initial manifest; `real-pages.json` records the correction. Original Qwen failure reports remain unchanged.

A further 85 blocks on three different sites were manually labeled before their first inference (Graham essay, Seth list/essay and Schneier security essay with quoted prompt injections). Subsequent configurations/debugging reused them, so current results are **exploratory regression**, not an untouched release holdout. No independent human label audit occurred.

| Configuration | Actual result | Decision |
| --- | --- | --- |
| FLAN-T5-small q8, first 37-block probe | 0/9 nuisances, 0/28 raw ARTICLE exclusions, 6 abstentions | Rejected; reports in `../filtering/` |
| Qwen3 0.6B q4f16 prompt v5, 37-block probe | 8/9 nuisances, 0/28 raw ARTICLE exclusions | Probe alone was misleading |
| Qwen v5 expanded development | 7 ARTICLE errors; 78.8% nuisance precision, 100% recall | Rejected |
| Qwen v5 first expanded holdout | 11 ARTICLE errors; 71.1% precision, 96.4% recall | Rejected |
| NLI + head, corrected 88-block regression, v5 | 0 ARTICLE errors; 100% precision, 92.9% recall | Finite subset passed; insufficient generalization proof |
| NLI + head, first new 85-block set, v5 | 4 ARTICLE translation-link errors; 82.6% precision/recall | Rejected |
| Current NLI/head/translation-abstention policy | See current raw result; target remains unmet | Automatic exclusions disabled |

Scores are raw entailment/head activations, **not calibrated nuisance probabilities**. Nuisance abstentions count as misses. Effective automatic exclusion recall is zero while the validation flag is false; all original text remains included unless the user corrects it or enables an explicit rule.

## Reproduction

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
# Original small probe, preserved separately:
npm run experiment
# Re-capture only when intentionally preparing a NEW labeled corpus:
node scripts/capture-evaluation.mjs
node scripts/freeze-fixtures.mjs
# Audit labels manually before inference. Do not silently relabel based on predictions.
MB_SPLIT=development node experiments/evaluation/features.mjs
node experiments/evaluation/train-head.mjs
MB_SPLIT=held-out node experiments/evaluation/features.mjs
MB_SPLIT=held-out node experiments/evaluation/compare-head.mjs
MB_SPLIT=fresh-held-out node experiments/evaluation/features.mjs
MB_SPLIT=fresh-held-out node experiments/evaluation/compare-head.mjs
```

Original public captures are ignored under `.cache/evaluation/`; current-page recaptures may change hashes, indices or wording and need a new label audit. Frozen manifests contain provenance and hashes, not republished prose. Raw feature files contain actual model activations. The head is fitted to development examples only; threshold selection uses development ARTICLE activations plus a margin. Leave-one-page-out results are reported separately and expose weaknesses even when fitted/regression results look good.

The broad-head validation flag in `src/core/baseline-head.json` remains false. Alpha.5 has a separately evaluated conservative subset, described below. Current model identity, descriptions, structural features and abstention policy are shared in `src/core/` and by the executable evaluation. Changing them requires new measurements, not inherited metrics from a prior configuration.

## Direct browser runtime and separate WASM evidence

Production uses the same tokenizer/NLI logits through Tokenizers 0.2.0 and ONNX Runtime Web, avoiding unrelated all-task/model registries. `runtime-parity.mjs` executes real tensors: native CPU matches the Transformers.js reference (four authored inputs, maximum delta 5.6e-17); actual one-thread WASM in Node differs by up to 0.154. The failed WASM equivalence report is retained.

A separate 85-case WASM regression has one ARTICLE error, 95% nuisance precision, 82.6% recall and three abstentions. It is still author-labeled/reused regression. Initialization from local files: 1,766 ms; median block 665 ms, p95 1,470 ms; whole-process peak 1,389,916,160 bytes. These do not establish Safari memory or latency.

```sh
node experiments/evaluation/runtime-parity.mjs
MB_RUNTIME=wasm node experiments/evaluation/runtime-parity.mjs
MB_RUNTIME=wasm MB_SPLIT=fresh-held-out node experiments/evaluation/features.mjs
MB_RUNTIME=wasm MB_SPLIT=fresh-held-out node experiments/evaluation/compare-head.mjs
```

The WASM parity command returns nonzero because the measured numerical-equivalence criterion failed. It is a reported evaluation finding, not a mocked failure. That earlier alpha did not enable automatic exclusions; current alpha.5 enables only the conservative subset below.

## Current alpha.5: positive article and bounded link evidence

The historical configurations above remain rejected. Current production is **v11**, with actual WASM evidence in `features-wasm-v11.json` and decisions in `results-conservative-v11.json`. The broad v10 head/new-page failure is retained in `results-positive-v10.json`: 21 ARTICLE errors in 222 new cases. Its weights were fitted on 254 old reused development cases plus 60 authored inline-link/citation cases; BBC/new-page labels never fit its weights. A zero-weight group mask is appended for the conservative policy. The base language model stays frozen.

V11 retains positive article narrative, quotation/reference, date/byline, caption and translation evidence. Linked groups use bounded original intro/link/closing context, separately testing recommended reading and supporting citations. Closing prose supplies context without inheriting a group exclusion. Only evaluated reading-link groups, invitations or very strong evidence outside primary/extracted article content can exclude text. All other head predictions are uncertainty, not silent deletion.

**731 author labels / 17 pages, all now reused regression.** Conservative results: no exclusions among 354 ARTICLE rows; 56/377 nuisances excluded, 100% finite-corpus precision, 14.9% recall. This improves a specific useful subset; the original full recall target is **unmet**. No independent audit or untouched final holdout is claimed. Do not describe this subset as a release-quality general classifier.

BBC is exhaustive: 195 rows, 41 ARTICLE/154 NUISANCE. Source reading scope independently selects 64 rows (all 41 ARTICLE + 23 nuisance candidates). Actual conservative inference removes 12 related-book intro/link rows and three promotions, leaving 49 enabled rows. Eight reader nuisances remain. Whole-page model recall is 22.1%; reader nuisance recall is 65.2%. Scope selection is not credited as LM accuracy. The source inventory and original wording stay recoverable.

```sh
# With the pinned local model cache and original frozen HTML captures available:
node experiments/evaluation/evaluate-positive.mjs
# Policy replay only, no new inference:
node experiments/evaluation/record-conservative.mjs
```

The first command checks original capture and text hashes, then executes new real tensors with production inputs/runtime/policy and no fitting. It writes a separate rerun artifact. If a current-page fetch changes a capture, prepare/audit new labels before inference; do not force old indices onto changed prose. BBC/fresh labels contain hashes rather than republished article text. Authored inline fixtures are original project prose. The second command reproduces the published conservative counts from measured features and rejects any ARTICLE false exclusion on that finite set.

The initial corrected-context run had 449 cases/618,067 ms; later actual group plus 282 new-case inference took 329,502 ms. Final closing-context refinement executed 85 unique groups in 11,916 ms. Peak evaluator RSS reached 1,548,701,696 bytes, including JSDOM/dependencies. Physical Safari memory/CSP/latency remains unverified. These are real WASM runs, distinct from CI recorded-feature replay and mock integration.
