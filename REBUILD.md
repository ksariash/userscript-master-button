# Implementation direction

The user removed design, model-choice, architecture and milestone approval gates on 2026-10-13. Continue work and report evidence without pausing for approval. Validation standards remain.

## Architecture

- `src/core/source.mjs`: disjoint original text ranges, stable live-node identities, inline/BR/mixed-container handling, exact Defuddle membership evidence, batched mutations and document retirement. Extraction never directly deletes text.
- `core/decisions.mjs`: explicit correction → saved Keep/Skip rules/memory → validated automatic exclusion → inclusion. It owns Undo, teaching contributions, content/evidence leases, reader mapping, and enabled-sequence revisions. Diagnostic-only updates do not invalidate audio or exports.
- `src/platform/model-worker.mjs`: real pinned DeBERTa NLI inference in a local worker, one-thread WASM by default. Bounded neighboring/group/control/link context; full oversize blocks abstain. Public downloads omit credentials/referrer; no article-model server.
- `src/core/head.mjs`, `site-head.mjs`: trained classification head using actual entailment activations plus structure. Explicit site corrections update head weights by gradient descent. Base language-model weights remain frozen; predictions never self-train. Exact-wording Keep/Skip memories are independent of inference availability.
- `src/ui/`: restrained isolated launcher, contextual page review, editorial reader, compact player and child inspectors. Views dispatch shared commands. Selection/edits with no source mapping say so.
- `src/speech/`: direct Azure GM transport, serial paid requests with immediate inclusion rechecks, exact-text/config PCM cache, first-segment playback and bounded preparation, cancellation/stale-intent checks, local format-aware MP3 encoding and revision-bound exports.
- `src/tools/`: previewed selector rules, owned-style restoration, deterministic URL preservation, model-reviewed proposals and contextual best-effort site utilities.
- `src/platform/storage.mjs`: filename-scoped GM storage, non-destructive v1 migration, separate speech key, explicit-site-only persistence. No newly collected browsing archive.

## Chosen alternatives and unresolved proof

Qwen3 0.6B improved the small probe but failed wider accuracy and peaked near 3.9 GB on desktop. The selected smaller NLI language model is a genuine encoder language model, not an embedding similarity substitute. It requires about 87 MB of weights and has substantially lower measured desktop process memory. Browser memory/CSP/latency remain unverified.

Classifier-head learning is implemented; **full base-LM weight fine-tuning is not**. Keep memories and the personalized head can make inclusion more conservative. They cannot silently enlarge an unvalidated automatic exclusion policy.

The model still misses the complete target, including article translation-link errors and missed short widget headings. Automatic exclusions remain disabled. Existing regression pages were used during debugging; an independent final holdout and independent label audit remain outstanding. Do not turn on the exclusion flag for appearance or green CI.

Native sharing, playback activation, locked-screen transitions, model execution and key setup require a physical iPhone/extension check. REST supplies PCM and no verified word events; only real segment/sample durations are used. No consent adapter submits choices until validated on a live site.

## Remaining phases

1. Improve filtering/generalization and collect a new independent holdout; verify actual Safari runtime and memory. Replace whole-document mutation rescans with affected-region work where needed.
2. Run live Azure and real-player/locked-screen trials; fix observed platform behavior without creating a second decision layer.
3. Validate current site/consent adapters, native sharing/handoffs, accessibility/viewport cases, and real old-filename storage/update behavior. Preserve every outstanding row in PROGRESS.md.

These are implementation priorities, not review gates. Installable alpha source/builds can be published with honest limits while those proofs remain outstanding.
