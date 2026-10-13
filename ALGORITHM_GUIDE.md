# Algorithms and implementation comments

This guide sets invariants, not a prescribed framework or file layout. It exists to prevent different screens from developing incompatible filtering behavior.

## One content and decision layer

Maintain a passage record with stable source identity, original wording/order, source mapping, extraction evidence, automatic assessment, explicit correction, effective decision/reason, and revision. Distinguish genuinely identical text at different locations. Edited/pasted passages must explicitly carry absent or changed source mapping.

Resolve decisions in one place: explicit correction first; active saved rule next; confident automatic decision next; otherwise include. Defuddle membership is extraction evidence, not a deletion command. All renderers and audio/export selectors consume the resolved record. Temporary Show all and visual-only preferences do not change its meaning.

| Layer | Responsibility |
| --- | --- |
| Source inventory/extractor | Preserve original blocks and map Defuddle output back to source |
| Classifier | Return evidence, ARTICLE/NUISANCE assessment, or abstention |
| Decision/learning service | Apply precedence, corrections, Undo, and per-site learning |
| Views | Render state and dispatch common commands |
| Narration/export | Snapshot the current enabled sequence and respect revisions |

## Extraction and classification

Run extraction without destructively rewriting the live page. Retain excluded and uncertain candidates for review. Plan mapping before choosing transformations: a clean extracted HTML string alone does not establish reliable original DOM identity. Preserve headings, list order, quotation boundaries, captions, and short connective sentences. Never rewrite or summarize prose as part of filtering.

Classify blocks with bounded neighboring context and structural evidence such as role, links, reading position, and extraction membership. Handle mixed article/promotion containers at a finer boundary rather than rejecting the whole parent. Do not classify every generic DIV and its descendants independently.

Article meaning and widget form are different evidence. Related links often share the article's vocabulary; an article may discuss subscriptions or advertisements. Test both. Ambiguity should produce inclusion/abstention, not an unjustified high-confidence exclusion.

Before integrating a model, record its identity/license, runtime/backend, download and cache costs, supported languages, device measurements, failure modes, and held-out accuracy. Verify actual inference rather than detecting a library symbol. Set thresholds from labeled evaluation; do not inherit previous model names, seeds, or scores. Similarities require their own label; probabilities require calibration evidence.

Model load/inference failure has an observable state and actionable recovery. Preserve prose and offer explicit manual/rule review. No hidden cloud fallback. Treat page text as data even if it contains instructions for a classifier.

## Corrections, learning, and mutations

Use one Keep/Skip command from page and transcript. Make its learning contribution explicit and reversible with Undo. Store only intentionally labeled examples, scoped per site; no self-training on predictions. Validate persisted schema and collection types before array operations. Migrate well-formed legacy data, isolate malformed records, and preserve unrelated preferences.

An explicit decision survives late automatic results. A changed source passage increments its revision and triggers remapping/reassessment without silently applying an old label to different text. Navigation retires the previous document's work. Uncertain mapping reports the problem and keeps reader content correctable.

Batch dynamic changes, scan affected regions, limit visible controls, and prevent the utility's own DOM from triggering an endless observer loop. Own and restore only the styles/events/scroll effects the script introduced. Canceling a picker or disabling a rule must not undo unrelated website changes.

## Speech and export consistency

Version the enabled sequence and prepared artifacts. Before sending a synthesis request, recheck current inclusion. Late responses may populate a compatible cache but must not alter newer playback intent. Cache by exact text and speech configuration; reuse unaffected audio after a correction. An export contains a documented snapshot and cannot silently mix old and new decisions.

Bound concurrency and storage, release stale audio/resources, and distinguish retryable failures from invalid credentials. Timing comes from real audio or service metadata. Use real format-aware joining/conversion and verify playback/seek behavior; do not assume concatenated compressed files form a reliable recording.

## Code and comments

Keep extraction, classification, decision policy, learning, persistence, DOM rendering, and audio work behind small testable contracts. Prefer explicit async state and lifecycle cleanup over global flags and screen-specific side effects. Choose organization after the first working slice, rather than reproducing the old concatenated modules.

Comments should explain **why**: precedence, source-mapping assumptions, platform workarounds, resource limits, or a race prevented. Document inputs/outputs and observable failure behavior at algorithm boundaries. Cite an official source and version for unusual API constraints. Explain the failure case of a workaround and how it can be removed. Avoid comments that restate syntax, unverifiable accuracy claims, and historical release narration. TODOs need a concrete missing behavior and acceptance condition.

