# Algorithm and implementation guide

Normative for new work. Read with REQUIREMENTS.md and AGENTS.md. Version 0.2.0 establishes one passage decision pipeline; do not reintroduce independent page and reader classifiers.

## Data flow and ownership

1. Inventory the original article's leaf blocks in reading order. Retain original wording and live node references in a page-scoped store.
2. Parse a detached document with the pinned, bundled Defuddle build. `useAsync:false` prevents external extraction fallbacks. `standardize:false` preserves temporary source IDs. Never insert extracted HTML into the live page.
3. Treat extraction membership as structural evidence, not proof of nuisance content. Missing mappings fail open: retain original prose and report structural fallback.
4. Run bounded batches through the local MiniLM embedding classifier. For a long block, inspect every text chunk and exclude the block only when every chunk is excluded. Automatic decisions are separate from manual overrides.
5. Resolve effective inclusion centrally: an explicit Keep/Skip overrides the automatic decision. Model-unavailable and uncertain states preserve content. A similarity is not a probability.
6. Page controls, reader chunks, speech requests and exports consume the same source decision. Speech chunks refer to a source ID; they are not new independent training examples.

`src/02-passages.js` owns source records and corrections. `src/02-semantic.js` owns embedding inference and examples. `src/04-reader.js` owns audio resources and preparation. UI code dispatches actions and renders state; it does not implement a second decision policy.

## Identity, navigation and asynchronous work

- IDs distinguish identical text at different positions. Text hashes alone are not node identity.
- Retain identity across unchanged DOM refreshes. Changed text gets a new record; old reader chunks become excluded until re-extraction. Navigation clears page-scoped overrides and cancels audio jobs.
- Extraction epochs, semantic revisions, training tickets and audio generations guard their respective asynchronous boundaries. Check again after every awaited operation before committing results.
- Explicit corrections teach once. New corrections replace the matching prototype rather than incrementing a second token model. Legacy token statistics remain readable but are not updated by the new correction path.
- Undo restores the previous override and prototype, and invalidates in-flight training. Keep raw passage text and the undo history in memory only.
- Storage reads normalize nested types and recover valid array entries from supported legacy object shapes. Preserve other settings and the separate Azure key. Serialize snapshot writes so older promises cannot overwrite newer preferences.
- Never log keys or article text. Debug fixtures use synthetic text and fake credentials.

## Reversibility and page safety

- Gray is the default; collapse requires explicit preference. Review temporarily reveals script-owned hidden content and pauses site cleanup.
- Change only owned attributes/properties. Do not restore an entire stale style string over a site's later changes.
- Protect body, main, article and interface roots from broad hiding. Keep overrides prevent script-owned rules from hiding their containing block.
- Ignore UI mutations, debounce page mutations, process bounded model batches, and render controls only near the viewport.
- DOM extraction and site cleanup are separate concerns. Defuddle's failure must not disable URL sharing or speech configuration.

## Audio invariants

- Recheck inclusion immediately before every Azure request. Skipping cannot retract a request already sent; explain that limitation.
- Allow one preparation job, including its model preflight. Canceling invalidates late completions.
- Maintain user playback intent separately from `audio.paused`: buffering must resume when ready, while a user pause must remain paused.
- Preserve unrelated prepared chunks after corrections. Voice/region/quality changes invalidate incompatible cached audio.
- Export only enabled chunks and validate generation/selection after asynchronous assembly. No second synthesis merely for export.

## Comments and code style

- Comment the reason for a guard, ownership boundary, migration or ordering constraint. Do not narrate obvious assignments.
- Document input/output shape, state ownership and failure behavior for new algorithm boundaries.
- Name the actual technology: Defuddle extraction, MiniLM embeddings, nearest-prototype learning. Do not call token hashes a language model or prototype updates model-weight fine-tuning.
- Prefer small named functions and explicit state transitions over UI-specific flags and duplicated handlers.
- Keep third-party code in `vendor/`, with version, license and provenance. Never hand-edit a vendor bundle; review and test upgrades independently.

## Required evidence

Run build, syntax, utility, pipeline, Chromium, delayed Reddit, speech, UX and page-review regressions. Cover malformed storage; duplicated text; source changes; navigation; Keep protection; correction/Undo races; disabled inference; extraction failure; multiple model batches; buffering; cancellation; excluded queued requests; and export changes during assembly.

Mocked vectors validate orchestration only. Real model loading, semantic accuracy, Azure output and physical iPhone Safari behavior require separate evidence. Never claim those from jsdom or mobile Chromium emulation.
