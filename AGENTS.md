# Instructions for the fresh build

Read README, REQUIREMENTS, ALGORITHM_GUIDE, FRONTEND_GUIDE, DESIGN_REFERENCES, and ACCEPTANCE. The user's current instructions take precedence. Product requirements describe outcomes; proposed design tokens, benchmarks, and implementation approaches may be revised with evidence.

## Work sequence

1. Summarize the goals, open choices, architecture, and planned validation briefly. Research current official library/platform documentation before choosing dependencies.
2. Make a small executable filtering experiment using Defuddle and a real local model. Separately create an interactive mobile design prototype for the launcher, passage review, and reader. Show screenshots in light and dark appearance and explain model feasibility findings.
3. Continue implementation autonomously. The user removed review/approval gates on 2026-10-13. Present evidence and accept feedback without pausing for design, architecture, model-choice, or milestone approval. Quality and validation requirements remain; report unverified capabilities honestly.
4. Build a working slice: extraction → classification → page Skip/Keep → transcript synchronization → Undo. Then integrate narration and the remaining requirements in explicit milestones.
5. Publish maintainable source, a reproducible installable userscript, tests, installation/update instructions, and honest validation results when implementation is ready. Keep source and generated release files synchronized.

## Boundaries

- The specification reset is complete. Build executable, useful functionality from these documents; do not add scaffold code merely to make the repository look active.
- Do not retrieve or reuse the rejected implementation from history unless the user explicitly requests it. Existing settings compatibility can be planned from the documented behavior without restoring old code.
- Use the connected GitHub plugin for repository operations. Reuse its authorization; do not request a separate browser login or personal token for operations it supports. If a necessary operation is unavailable, identify the exact limitation and complete the supported work.
- Keep one authoritative passage decision layer. UI components dispatch actions and render state; they never implement competing classifiers, learning algorithms, or export-selection policies.
- Preserve original prose and source identity. Uncertain or unavailable classification keeps text included. Model failure must remain visible.
- Do not call heuristics a language model, similarity a probability, or stored examples/prototypes weight fine-tuning. No fabricated scores or timings.
- Do not count mock inference, desktop screenshots, or simulated audio as real model accuracy, physical Safari validation, or live Azure verification.
- Keep credentials out of code, logs, webpage storage, and public artifacts. Article text stays local except explicit Azure synthesis or user sharing.
- Retain every feature in REQUIREMENTS in a completion/deferred/blocked record. A core milestone is not full product completion.
- Keep documentation concise and current. Record decisions and limitations where the next session can find them; avoid piles of historical plans or release-specific CSS overrides.

