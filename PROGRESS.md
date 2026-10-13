# Progress and remaining scope

**Implementation authorized; phase 0 evidence retained.** Built fresh from the reset specifications, without retrieving the rejected implementation. Changes are proposed on `rebuild/phase-0-review`; no replacement userscript is released. Implementation continues under the user’s authorization; there is no design/architecture approval gate.

## Evidence, kept separate

| Evidence class | Observed status | What it does not prove |
| --- | --- | --- |
| Decision unit tests | Passed: precedence, late results, duplicate identity, correction/Undo teaching transaction, automatic off versus clear, source/document retirement, snapshots, malformed learning/rules. | Live userscript persistence, mutations, device interaction, model accuracy. |
| Defuddle integration | Actual 0.19.5 extraction of authored fixture and two public pages; 25 source fixture blocks preserved, duplicate IDs distinct, mixed prose/promotion split into leaf blocks. Some legitimate mixed prose was removed by extraction and retained by inventory. | Reliable mapping on arbitrary pages or live DOM changes. |
| Mock/design DOM integration | Passed in JSDOM: page → reader → enabled snapshot, Undo/learning, disclosure/scroll preservation, source-link preservation, keyboard launcher open/close, explicit unconnected speech error. No layout engine or service was involved. | Touch/drag collisions, appearance, live Azure, Safari. |
| Actual local model evaluation | Real pinned FLAN-T5-small q8, native ONNX CPU. 37 author-labeled blocks: 25 authored cases, 12 blocks from two real pages. 0/9 nuisances found; 0/28 raw narrative exclusions; six abstentions. Candidate rejected in this configuration. | Independent held-out accuracy, useful filtering, multilingual support, calibrated confidence, iPhone feasibility. |
| Rendered design | Interactive study and gallery; actual platform-rendered snapshots are recorded under `prototype/screenshots/`. These are desktop publication renders. | Physical iPhone, browser interaction QA, keyboard/landscape/zoom/safe-area success. |
| Physical iPhone Safari | **Unverified:** no device access or device/OS/extension specification supplied. Checklist in `VALIDATION.md`. | Any target-platform acceptance. |
| Live Azure | **Unverified:** no speech resource or live request used. Prototype key field is disabled. | Speech, timings, export playback/seek, locked-screen transitions. |

Cold cache was 97,526,182 bytes; startup including model download/initialization was 49,656 ms; median block inference 55 ms, p95 82 ms. Whole-process peak RSS was 451,248,128 bytes; current RSS was inaccessible in the restricted environment. None is an iPhone measurement. See the raw cold/warm reports, source hashes, prompt version, and limitations in `experiments/filtering/`.

Cached initialization still took 24,679 ms (warm median 62 ms, p95 97 ms). A separate deliberate actual-loader failure run produced a visible failed-state report and included all 37 labeled passages. It executed no inference and contributes no accuracy measurements.

## Requirement ledger

Statuses apply to the product, not merely a prototype: **experiment** = bounded proof exists; **deferred** = planned during implementation; **blocked** = an unmet feasibility/quality gate; **unverified** = implementation or device/service evidence absent. This ledger preserves the full scope in REQUIREMENTS.md.

| ID | Requirement coverage | Status / milestone |
| --- | --- | --- |
| F01 | HTML → Defuddle → actual local LM; immutable original text/order and recoverable source inventory | Experiment; production phase 1 |
| F02 | Headings, ordered/unordered lists, quotations, captions, connective prose; split mixed containers; structural/context evidence | Experiment leaf subset; ranges/complex HTML deferred phase 1 |
| F03 | Useful nuisance classification: ads, related stories/books, recommendations, newsletters, promotions, app prompts; retain legitimate discussions/quotes | Blocked by model's 0% probe recall; phase 1 model comparison and corpus |
| F04 | Uncertainty inclusion; loading/unavailable/failed/ready; explicit deterministic fallback; no hidden cloud inference | Inclusion policy experiment; production lifecycle deferred phase 1 |
| F05 | Original-page passage overlays, geometry-preserving Skip, Keep, optional explicit collapse | Design/in-memory experiment; live userscript deferred phase 1 |
| F06 | Temporary Review, visible controls only; short/nested/full-width/previously excluded/dynamic correction; no covered prose/links; alternate action | Design margin/fallback route; physical and live-DOM proof unverified phase 1 |
| F07 | One decision across page, transcript, teaching, narration/export selectors; immediate correction; late-result precedence; Undo contribution | Experiment store + DOM tests; real preparation/export integration deferred phases 1–2 |
| F08 | Automatic off preserves explicit choices; separate clear; Show all changes no decisions | Off/clear experiment; Show all deferred phase 1 |
| F09 | Optional visual-only muting while included for narration, without competing classifier | Deferred phase 1, optional preference |
| F10 | Why excerpt/state/reason; actual model/fallback/evidence in collapsed Details; no score dashboard | Design experiment; model-linked inspector deferred phase 1 |
| L01 | Per-site explicit-only learning; Keep exceptions; inspect/disable/delete/reset; minimal data; no history archive | In-memory explicit examples/Undo experiment; persistence/rules/retrieval deferred phase 1; weight-update choice unresolved |
| L02 | Remember per-site on/off and rules; inspect/edit/disable/delete/reset; mutation batching/SPA cancellation; no duplicate/stale overlays | Deferred phase 1 |
| S01 | Visual selector picker intercepts links, shows all matches/count/offscreen, flags broad/fragile selectors | Deferred phase 3 |
| S02 | Separate reversible preview/Save; exact cancel restoration; protect root/article/utility | Deferred phase 3 |
| S03 | Restore only script-owned locks from nuisance removal; preserve native dialogs | Deferred phases 1/3; physical/site proof unverified |
| S04 | Necessary-only/reject-ads consent through validated native site adapters; distinguish hiding from consent | Deferred phase 3; site feasibility unverified |
| U01 | One subtle launcher, 44px hit area, excluded count once, tap/drag distinction, remembered position/reachability | Design experiment; drag persistence/device behavior deferred phase 1 |
| U02 | Read/Review/clean-share primary; compact secondary filtering/rules/URL/speech/update/site tools | Design experiment; secondary integrations deferred phases 1–3 |
| U03 | Accessible labels/focus/state; light/dark; isolated styles; safe areas/visual viewport/browser bars/keyboard/zoom/landscape/reduced motion | Design styles/labels; actual platform/accessibility validation unverified |
| R01 | Prefer selection else main article; review/edit/paste; changed/absent mapping visible; no truncation | Reader display experiment; selection/editor/remapping deferred phase 2 |
| R02 | Transcript dominates; compact anchored player; seeking separate from correction; gray reviewable exclusions | Design experiment; real seeking/player proof deferred phase 2 |
| R03 | Preserve scroll, focus, selection, drafts/disclosures on async updates | Prototype scroll/disclosure DOM checks; complete live async/editor checks deferred phases 1–2 |
| R04 | Follow spoken passages or verified words; respect manual scroll; return-to-current; remember text size/rate | Deferred phase 2; no timing/audio claim |
| A01 | User's Azure key in extension-controlled storage; replace/forget; accurate platform limits | Deferred phase 2; existing key preserved by no storage writes |
| A02 | Region and useful searchable live voices; adjacent demo; cache demo and no article/demo overlap | Speech design only; live provider/demo deferred phase 2 |
| A03 | First usable segment playback with later preparation, bounded concurrency/cache reuse | Deferred phase 2; live Azure unverified |
| A04 | Pause/resume, back/forward, seek, speed, buffering, retry, cancel; stale jobs cannot replace new intent | Player design only; actual playback deferred phase 2 |
| A05 | Enabled text rechecked at send; late Skip cannot retract sent text; reuse unaffected audio | Snapshot contract experiment; synthesis integration deferred phase 2 |
| A06 | Minimize/reopen without lost state; Media Session/system/locked-screen listening; prepared-recording fallback | Minimized design state; physical background/recording proof unverified phase 2 |
| E01 | MP3 enabled order, quality options, reuse prepared audio, real format-aware join/convert | Deferred phase 2; no compressed concatenation shortcut |
| E02 | Revision-invalidated exports, progress/cancel, native sharing/save fallback | Deferred phase 2 |
| E03 | Transcript and optional verified timings; real current/prepared durations; unknown total instead of estimate | Snapshot experiment; exports/timing/duration deferred phase 2 |
| T01 | Clean URL preserves necessary query/fragment; recognized tracking; share never navigates; native share/copy fallback | Deferred phase 3 |
| T02 | URL editor clean/copy/share/open explicitly; validate destination/malformed input | Deferred phase 3 |
| T03 | Local-model URL assistance usefulness/safety, risky-removal review | Choice unresolved; deferred phase 3 |
| T04 | Amazon canonical product links and correct supported regional camelcamelcamel; explicit unavailable | Deferred phase 3 support matrix |
| T05 | Reddit repeated app-prompt cleanup with owned lock restoration; optional already-delivered NSFW reveal within access | Deferred phase 3; live-site unverified |
| T06 | X/Instagram/Facebook/LinkedIn contextual cleanup and accessible image/video picker, no persistent litter | Deferred phase 3; live-site unverified |
| T07 | Facebook native accessible more-comments controls | Deferred phase 3; live-site unverified |
| T08 | Slashdot clean reading, older-story navigation, search | Deferred phase 3; live-site unverified |
| T09 | Explicit safe Google Maps → Apple Maps handoff | Deferred phase 3 |
| T10 | Honest best-effort adapter support matrix, no authorization bypass/false success | Deferred phase 3 |
| P01 | On-device inference/learning, disclosed downloads, no analytics/article relay/history; untrusted content | Local Node inference experiment; browser privacy/runtime proof deferred phase 1 |
| P02 | Recordings local until sharing; credentials only to intended endpoint, never URL/log/page storage/export/Git | Deferred phase 2; no credentials accepted in phase 0 |
| P03 | Bounded CPU/memory/storage/network; cancellation and long/dynamic-page limits | Bounded model context/threads experiment; production budgets deferred phase 1 |
| D01 | Maintainable source, one userscript, reproducible build/tests, install/setup, matching metadata/update distribution | Deferred phase 3; current artifact is not installable |
| D02 | Validated migration preserving `master-button:v1`, unrelated preferences and separately stored key; explicit reset/reinstall notices | Deferred phase 3; old implementation not retrieved |
| D03 | No duplicate instances or remote-code/eval update mechanisms; supported extension update/recovery | Deferred phase 3 |
| V01 | ≥150 pre-labeled blocks, 8 pages, 4 layouts, page/site-held-out split; narrative exclusions, nuisance precision/recall, abstentions, mapping and latency | Deferred phase 1; current 37-block set is not this benchmark |
| V02 | Visual inspection and user feedback plus 320/390/landscape/keyboard/large text/long excerpt/errors/clean/busy checks | Feedback welcome; rendered subset only, other layout/device checks unverified |

## Next session

Read REBUILD.md, RESEARCH.md, VALIDATION.md, and this ledger. Prioritize a useful model and physical Safari feasibility before integrating more features. Preserve failed evaluations and avoid tuning on the held-out set. Update status/evidence as each gate actually passes.
