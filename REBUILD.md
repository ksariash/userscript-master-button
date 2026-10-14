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

The broad head is rejected: it excluded 21 legitimate supporting/metadata rows in a new 222-case run. A separately evaluated conservative subset now applies reading-link groups, invitations and very strong evidence outside primary/extracted article content. Across 731 reused author labels it excludes no ARTICLE rows, but detects only 56/377 nuisances. The full benchmark has not passed. Independent labels/holdout and physical Safari remain outstanding.

Read selects the full primary content container plus exact Defuddle members; this is reading scope, not a nuisance decision. Uncertain rows inside that scope stay included. Read full page inventory restores every source row. A compact reader status exposes model loading/progress/failure. Show skipped changes only visibility; Keep/Skip/Undo, narration and exports still consume the same store.

Link inference uses bounded original introductory/link/closing context. Closing prose informs inference but is never automatically assigned its group’s label. Positive article/caption/reference evidence is recorded separately. Site head gradients can veto conservative exclusions, never enable the rejected broad policy.

Native sharing, playback activation, locked-screen transitions, model execution and key setup require a physical iPhone/extension check. REST supplies PCM and no verified word events; only real segment/sample durations are used. No consent adapter submits choices until validated on a live site.

## Remaining phases

1. Improve filtering/generalization and collect a new independent holdout; verify actual Safari runtime and memory. Replace whole-document mutation rescans with affected-region work where needed.
2. Run live Azure and real-player/locked-screen trials; fix observed platform behavior without creating a second decision layer.
3. Validate current site/consent adapters, native sharing/handoffs, accessibility/viewport cases, and real old-filename storage/update behavior. Preserve every outstanding row in PROGRESS.md.

These are implementation priorities, not review gates. Installable alpha source/builds can be published with honest limits while those proofs remain outstanding.
