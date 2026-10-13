# Proposed direction — review before implementation

## Architecture

One immutable source inventory plus one decision store is the center of the application. Views issue commands; all enabled-content selectors use the same resolved passages. Page identity, source node/range identity, source revision, and exact original wording travel together. Identical words at different locations remain different passages.

| Boundary | Proposed contract |
| --- | --- |
| Inventory | Snapshot relevant source blocks, weakly associate live nodes/ranges, preserve original wording/order, split mixed containers at semantic boundaries. Never inventory a parent and all descendants as competing passages. |
| Defuddle | Extract from an annotated clone, disable async remote extractors, map surviving source IDs back; use unique exact text only when unambiguous. Extraction membership is evidence. Removed, changed, or ambiguous blocks remain available for review. |
| Local model | Bounded neighbor/structure/extraction evidence in; ARTICLE, NUISANCE, or abstention out. Strict output validation, no rewriting, no cloud fallback. Invalid, oversized, unavailable, or unvalidated assessments stay included. |
| Decision store | Explicit correction → enabled saved rule → validated automatic exclusion → include. Revision-check late work. Keep/Skip and teaching contribution are one undoable transaction. |
| Page/reader | Subscribe and patch only affected passages; retain geometry when graying. Review markers use safe margins; Previous/Next context controls reach short/full-width passages when no margin fits. Why is on demand. |
| Speech/export | Snapshot exact enabled text, IDs, source revisions, and sequence revision. Recheck before each request; discard stale playback intent/export assembly. Cache exact text plus speech configuration. |
| Platform | Userscripts content scope for granted GM APIs; isolated UI styling, one-instance/lifecycle owner, validated storage adapter and migrations, no page storage for secrets. |

The experimental source identity is stable within a captured document only. Live weak-node identity, source ranges, mutation batching, SPA retirement, and dynamic remapping remain part of phase 1. Current parser coverage is leaf semantic blocks, not all possible inline/nested HTML. No production compatibility is claimed.

## Phases and gates

1. **Phase 0 — this review:** official research, a runnable real local-model probe, author-labeled realistic cases, separate interactive design study, rendered evidence, and an explicit requirement ledger. No installable release.
2. **Phase 1 — prove the slice:** select a useful model on a predeclared calibration/held-out corpus; then prove extraction → inference → original-page Skip/Keep → reader synchronization → reversible teaching/Undo, including races, duplicates, mutations, full-width passages, and navigation. Run physical iPhone CSP/backend/cache tests before claiming Safari support. Gate: visual review plus zero narrative exclusions, ≥95% nuisance precision, ≥85% held-out recall on the agreed finite corpus.
3. **Phase 2 — speech and export:** direct Azure transport and voice list, secure key adapter, first-segment start, bounded preparation/cache, seek/rate/follow/minimize, cancellation/revision safety; then format-aware MP3 export and transcript/timing snapshots. Mock integration, live Azure, real-player recordings, and physical locked-screen tests are separate gates.
4. **Phase 3 — the rest:** conservative clean/share/edit URL tools and reviewed model-assisted suggestions; selector picker and consent adapters; all requested site utilities; validated legacy migration; reproducible userscript, matching metadata/build/source, supported update flow and recovery. Every requirement has a ledger row.

## Choices that still need resolution

| Choice | Evidence and proposed next decision |
| --- | --- |
| Model | FLAN-T5-small q8 is a genuine local generative language model, but the frozen probe found 0/9 nuisances. Reject it as a release candidate in this configuration. Compare a stronger compact instruction model on a separate development set, then lock prompts/thresholds before held-out evaluation. SmolLM2-135M q4 was researched (about 181 MB for its ONNX weight file), not executed. An embedding classifier would require an explicit product choice and its own evaluation. |
| Runtime/device | Proposed browser probe: matching bundled Transformers.js/ONNX WASM assets, one thread and no proxy worker first; WebGPU only after real capability/inference tests. Safari 26 support in WebKit is not Userscripts compatibility evidence. Need actual iPhone model, iOS/Safari and Userscripts versions, download/memory budget, CSP/worker tests, origin/cache behavior, eviction/reload tests, and thermal/battery measurements. |
| Learning | Immediate corrections and per-site labeled examples are practical to implement. Proposed retrieval of explicit examples/structural rules is **not weight fine-tuning** and needs agreement. True local weight updates remain research: the current quantized inference pipeline supplies no training implementation. Do not self-train on predictions. Keep exceptions and Undo must reverse the same contribution. |
| Speech | Prefer direct Azure REST for a small adapter; evaluate SDK only if verified word-boundary events are required. Never fabricate timestamps. GM storage is extension controlled, not a promised encrypted vault. Physical background transitions and Media Session remain unverified; a prepared recording is a separately tested fallback. |
| Consent | Per-site, visible native reject/necessary-only controls and verified outcomes. Hiding a banner cannot establish consent. Unsupported interfaces stay explicit. |
| Smart URL cleaning | Model-assisted proposals require evidence of usefulness. Preserve required query/fragment semantics deterministically; require review of risky removals. Never auto-navigate from a share action. |
| Updates | Bundle application code in one userscript. Match documented extension metadata/update support to the installed version; do not promise automatic checking when release notes have disabled it. Preserve `master-button:v1` preferences and the separate key until a validated migration is available. |

## Visual direction

Editorial serif reading text, system-font commands, warm light/cool dark surfaces, one muted blue accent, thin separators, and one shallow functional surface. A 260px menu presents Read, Review, Share, and More. A selected passage receives one correction bar; Why opens a short excerpt/state/reason with Details collapsed. The reader uses one column and a compact player, without fabricated playback or whole-article timing. Speech setup is an unconnected design state with a disabled secret field.

Obsidian informs content hierarchy/typography and actions in both source and reader. Readwise informs local contextual correction and honest matching uncertainty. Apple materials/toolbars guidance informs restraint and command grouping, not a promise of native Liquid Glass. See [RESEARCH.md](RESEARCH.md) and [prototype/README.md](prototype/README.md).

**Review gate:** approve or revise the visual/interaction direction and architectural invariants before phase 1. The model is deliberately unresolved; approving the direction does not certify filtering accuracy or accept retrieval as fine-tuning.
