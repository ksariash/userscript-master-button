# Real local filtering probe — rejected candidate

This executes Defuddle and real FLAN-T5-small tensor inference on the local computer. It is a bounded experiment, not a userscript or useful finished filter. The separate mobile study does not run this model.

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run experiment
MB_RESULTS=experiments/filtering/results-warm.json npm run experiment
MB_FORCE_LOAD_FAILURE=1 MB_RESULTS=experiments/filtering/results-load-failure.json npm run experiment
```

The last command deliberately forbids both local and remote model loading in the actual loader; it should exit nonzero and produce a failed-state report. It is fault injection, not model evaluation or a physical CSP test. Source blocks remain included.

## Configuration and provenance

- Base `google/flan-t5-small`, Apache 2.0; ONNX conversion `Xenova/flan-t5-small`, revision `311454e83bc784267fd7eef5940ee854144abbec`.
- Transformers.js 4.3.1 / native ONNX Runtime 1.30.0, CPU, two intra-op threads, one inter-op thread, q8. Node v24.19.0, Linux x64. CPU identity/current RSS unavailable; peak process RSS was returned by resource usage.
- Frozen prompt `block-v1`, greedy generation, six output tokens, strict ARTICLE/NUISANCE/UNCERTAIN parser. No probabilities or confidence scores. Oversized inputs (>512 tokens) abstain; no silent truncation.
- Twenty-five original authored blocks with nine nuisances and sixteen ARTICLE blocks. Includes a BBC-style related-books widget, shared vocabulary, mixed containers, duplicate text, an ad discussion, a quoted subscription prompt, headings, list items, caption, connective sentence, and text discussing classifier manipulation.
- Twelve real ARTICLE blocks fetched directly from [WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) and [Steph Ango](https://stephango.com/saw). Corpus labels/selectors were authored before any inference. They were not audited by an independent human. These real-page cases contain no nuisance labels; only the authored fixture tests nuisance recall.
- `corpus.json` is the label specification; raw results contain source IDs and SHA-256 hashes, never the complete republished real articles. Captures/model binaries are ignored. Live-source changes can prevent exact reproduction of a capture hash; this is not a frozen release corpus. No original prose is rewritten by filtering.

## Observed results

| Measure | Cold run | Warm run |
| --- | ---: | ---: |
| Model/tokenizer cache | 97,526,182 bytes | 97,526,182 bytes |
| Download/initialization or cached initialization | 49,656 ms | 24,679 ms |
| Median block latency | 55 ms | 62 ms |
| p95 block latency | 82 ms | 97 ms |
| Raw ARTICLE → NUISANCE errors | 0 / 28 | 0 / 28 |
| Nuisances detected | 0 / 9 | 0 / 9 |
| Abstentions (including invalid generated labels) | 6 / 37 | 6 / 37 |
| Nuisance precision | Undefined: no nuisance predictions | Undefined |
| Nuisance recall (abstentions count as misses) | 0% | 0% |

The cold run's whole-process peak RSS was 451,248,128 bytes. That includes extraction and runtime work; it is not isolated model memory, browser memory, or iPhone memory. The 95,098,458 bytes of quantized encoder/merged-decoder weights are only part of the 97.5 MB cache. No supported-language claim is evaluated beyond English.

**Decision: reject this model/prompt configuration.** Every automatic exclusion remains unvalidated and therefore included. Zero article exclusions resulting from an include-only effective gate is not evidence of useful filtering. A stronger model or a separately agreed trained/classifier approach still needs development, calibration, a page/site-held-out corpus, and physical Safari checks.

## Extraction findings and limits

The original fixture inventory has 25 blocks; Defuddle retains 13 extraction members. Clone IDs give distinct identity to repeated wording. Some legitimate prose in a mixed container disappears from extracted HTML; it remains in the inventory and is classified/reviewable. This demonstrates why Defuddle membership alone cannot drive deletion.

Identity here is stable within a static capture, not through live navigation/mutations. Only leaf semantic blocks are covered. Direct text surrounding nested blocks, shadow/virtualized article content, media/table fidelity and live range mapping remain gates. Neighbor strings are bounded to 280 characters and are evidence only; long target text is checked in tokenizer space.

Before changing prompts, preserve these failed results. Use a development set separate from the held-out benchmark. Do not relabel output similarity/agreement as calibrated probability, self-train from predictions, or claim correction memory performs weight updates.
