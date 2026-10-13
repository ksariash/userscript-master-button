# Actual local filtering evaluation

These runs execute real pinned ONNX tensors locally on desktop Node CPU. They are not Safari checks, mock inference, independently audited labels, or a guarantee about arbitrary sites.

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

The published alpha imports `src/core/baseline-head.json`; its validation flag remains false. Current model identity, descriptions, structural features and abstention policy are shared in `src/core/` and by the executable evaluation. Changing them requires new measurements, not inherited metrics from a prior configuration.
