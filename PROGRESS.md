# Progress and remaining scope

**Local development: alpha.7, title exports, targeted scroll recovery, playback caching/seeking, preparation scheduling, bounded model loading, bounded preference storage, coalesced lifecycle/nag tracking, worker MP3 conversion, and slimmer modular interface implemented; 142 tests and 20 desktop screenshot/layout cases pass. Not published.** See [BACKLOG.md](BACKLOG.md).

**Published: experimental 2.0.0-alpha.6 (`66d367c`).** CI and Pages succeeded; owner reports setup now works. The subsequent local audit and implementation program is tracked in [BACKLOG.md](BACKLOG.md). Future releases require separate publication authorization.

The current patch adds immediate key paste/save/readback feedback beside the field, recurring HTML-root/inert scroll recovery, and visible blob-backed X videos with exact delivered-media-ID association. It adds tap/range/all-included passage selection and Skip before/after with one-step batch Undo. Read starts with the complete source article scope. Positive article evidence and bounded linked-group inference now support conservative automatic exclusions. BBC reader: 64 candidates → 49 enabled, preserving all 41 ARTICLE labels and excluding 12 related-book rows plus three promotions; eight nuisances remain. Broader filtering recall is still below target.

## Evidence kept separate

| Evidence class | Observed result | Limit |
| --- | --- | --- |
| Policy / Defuddle / mock DOM and speech integration | 142 local tests passed | No physical geometry, live service or model-accuracy claim |
| Actual model inference | Pinned FLAN, Qwen and NLI ONNX tensors on desktop Node CPU; raw reports under experiments | Author labels; reused regression, no independent audit or pristine final holdout |
| Current filtering quality | 731-case conservative regression: 0 ARTICLE exclusions, 100% finite-corpus precision, 56/377 nuisance exclusions (14.9% recall) | Overall recall target unmet; conservative subset active, broad head disabled |
| Actual MP3 encoding/decoding | One encoder over authored PCM tones; desktop FFmpeg decode/seek succeeded | Not Azure speech or iPhone playback |
| Rendered design | Original light/dark clean/busy study screenshots | Desktop publication; production light/dark capture available |
| Physical iPhone Safari | Not run | Device/extension/runtime/accessibility/background proof pending |
| Live Azure | Not run | Real voices, synthesis, binary transport, native share and playback pending |

Source now includes shared correction/Undo, reader/editing, explicit site learning, rules, Azure transport/queues, encoding/exports, URL and best-effort site tools. Presence and mock tests do not complete their service/device requirements.

## Requirement ledger

Implemented means present in the alpha source, not verified on iPhone. **Blocked** means a measured quality target is unmet; **outstanding** means required functionality or proof remains; **unverified** identifies missing device/service/live-site evidence. This ledger preserves the full scope in REQUIREMENTS.md.

| ID | Requirement coverage | Status / milestone |
| --- | --- | --- |
| F01 | HTML → Defuddle → actual local LM; immutable original text/order and recoverable source inventory | Implemented; real Defuddle and local NLI. Safari runtime unverified. |
| F02 | Headings, ordered/unordered lists, quotations, captions, connective prose; split mixed containers; structural/context evidence | Implemented disjoint ranges and context; complex/live-page mapping remains unverified. |
| F03 | Useful nuisance classification: ads, related stories/books, recommendations, newsletters, promotions, app prompts; retain legitimate discussions/quotes | Partial: conservative evaluated exclusions active; broad head rejected. BBC related links improve, but global recall is 14.9%; target and independent proof remain outstanding. |
| F04 | Uncertainty inclusion; loading/unavailable/failed/ready; explicit deterministic fallback; no hidden cloud inference | Implemented observable model state and inclusion on failure; browser runtime unverified. |
| F05 | Original-page passage overlays, geometry-preserving Skip, Keep, optional explicit collapse | Implemented source ranges and owned gray styles; physical geometry unverified. |
| F06 | Temporary Review, visible controls only; short/nested/full-width/previously excluded/dynamic correction; no covered prose/links; alternate action | Implemented visible markers and Previous/Next fallback; collision/touch proof unverified. |
| F07 | One decision across page, transcript, teaching, narration/export selectors; immediate correction; late-result precedence; Undo contribution | Implemented one store, content/evidence leases, multi-selection/range/all-included corrections and transactional single/batch Undo; mock integration passed. |
| F08 | Automatic off preserves explicit choices; separate clear; Show all changes no decisions | Implemented; policy/DOM tests passed. |
| F09 | Optional visual-only muting while included for narration, without competing classifier | Implemented explicit visual muting without changing inclusion. |
| F10 | Why excerpt/state/reason; actual model/fallback/evidence in collapsed Details; no score dashboard | Implemented contextual Why and collapsed actual evidence; desktop study rendered. |
| L01 | Per-site explicit-only learning; Keep exceptions; inspect/disable/delete/reset; minimal data; no history archive | Implemented explicit memories and gradient-trained head; frozen base LM, no full-LM fine-tuning. Cached reassessment and Undo verified with mock feature inputs. |
| L02 | Remember per-site on/off and rules; inspect/edit/disable/delete/reset; mutation batching/SPA cancellation; no duplicate/stale overlays | Implemented validated storage, rules and navigation retirement; mutation scans need affected-region optimization. |
| S01 | Visual selector picker intercepts links, shows all matches/count/offscreen, flags broad/fragile selectors | Implemented all-match picker; authored DOM passed; document capture handlers covered; earlier window capture handlers remain a platform limit. |
| S02 | Separate reversible preview/Save; exact cancel restoration; protect root/article/utility | Implemented owned preview/cancel and Save; legacy whole-article guards exclude script ballast. |
| S03 | Restore only script-owned locks from nuisance removal; preserve native dialogs | Implemented coalesced HTML-root/body and shadow observation, bounded scroll-ancestor watchdog, fixed-body/overflow/inert/touch recovery with ownership/Undo mocks; physical scrolling unverified. |
| S04 | Necessary-only/reject-ads consent through validated native site adapters; distinguish hiding from consent | Outstanding: no live-validated necessary-only consent adapter; hiding is not consent. |
| U01 | One subtle launcher, 44px hit area, excluded count once, tap/drag distinction, remembered position/reachability | Implemented drag/clamp/persistence; physical touch/viewport proof unverified. |
| U02 | Read/Review/clean-share primary; compact secondary filtering/rules/URL/speech/update/site tools | Implemented compact primary menu and contextual secondary surfaces. |
| U03 | Accessible labels/focus/state; light/dark; isolated styles; safe areas/visual viewport/browser bars/keyboard/zoom/landscape/reduced motion | Implemented isolated styles/labels/themes; physical accessibility/viewport checks unverified; Follow target corrected to 44px; physical target audit pending. |
| R01 | Prefer selection else main article; review/edit/paste; changed/absent mapping visible; no truncation | Implemented source article scope, exact selection, editor/paste and full-inventory option; uncertain scope candidates retained. BBC scope preserves all 41 ARTICLE labels. Arbitrary-layout attribution/mapping remains unverified. |
| R02 | Transcript dominates; compact anchored player; seeking separate from correction; gray reviewable exclusions | Implemented transcript/player and separate correction targets; actual playback unverified. |
| R03 | Preserve scroll, focus, selection, drafts/disclosures on async updates | Implemented incremental patching; mock DOM focus/draft/scroll/disclosure tests passed. |
| R04 | Follow spoken passages or verified words; respect manual scroll; return-to-current; remember text size/rate | Implemented passage follow/manual return and preferences; actual audio/device proof unverified. |
| A01 | User's Azure key in extension-controlled storage; replace/forget; accurate platform limits | Implemented GM-only verified key storage with bounded operations, visible input/save feedback, replace/forget and dedicated setup entry; physical isolation unverified. |
| A02 | Region and useful searchable live voices; adjacent demo; cache demo and no article/demo overlap | Implemented searchable live-list transport and cached cancellable demos; live Azure unverified. |
| A03 | First usable segment playback with later preparation, bounded concurrency/cache reuse | Implemented serial synthesis, first-segment intent and bounded prefetch/cache; mock integration passed. |
| A04 | Pause/resume, back/forward, seek, speed, buffering, retry, cancel; stale jobs cannot replace new intent | Implemented player/retry/cancel/rate; mock races passed; owned MediaSession cancellation mock passed. |
| A05 | Enabled text rechecked at send; late Skip cannot retract sent text; reuse unaffected audio | Implemented just-before-send recheck and exact cache reuse; mock integration passed. |
| A06 | Minimize/reopen without lost state; Media Session/system/locked-screen listening; prepared-recording fallback | Implemented minimized state and best-effort MediaSession; physical locked-screen and recording fallback unverified. |
| E01 | MP3 enabled order, quality options, reuse prepared audio, real format-aware join/convert | Implemented single PCM-stream MP3 encoder and quality choices; actual tone encoded/decoded on desktop, not Azure. |
| E02 | Revision-invalidated exports, progress/cancel, native sharing/save fallback | Implemented revision-bound artifacts, progress/cancel and share/save paths; native sharing unverified. |
| E03 | Transcript and optional verified timings; real current/prepared durations; unknown total instead of estimate | Implemented exact transcript and sample-derived segment timing; no word timing; live playback unverified. |
| T01 | Clean URL preserves necessary query/fragment; recognized tracking; share never navigates; native share/copy fallback | Implemented deterministic cleaning/share/copy; URL policy tests passed; native share unverified. |
| T02 | URL editor clean/copy/share/open explicitly; validate destination/malformed input | Implemented explicit validated editor actions; policy/DOM checks passed. |
| T03 | Local-model URL assistance usefulness/safety, risky-removal review | Implemented local-NLI parameter proposals with manual risk review; usefulness unverified. |
| T04 | Amazon canonical product links and correct supported regional camelcamelcamel; explicit unavailable | Implemented regional canonical/history routes and explicit unavailable states; current destinations unverified. |
| T05 | Reddit repeated app-prompt cleanup with owned lock restoration; optional already-delivered NSFW reveal within access | Implemented direct recurring nag removal and conservative reversible locks; screenshot-derived DOM tests pass, physical Reddit pending. |
| T06 | X/Instagram/Facebook/LinkedIn contextual cleanup and accessible image/video picker, no persistent litter | Implemented direct cleanup and thumbnail/title/filter/source/page media browser; mock integration and light/dark renders pass, live site pending. |
| T07 | Facebook native accessible more-comments controls | Implemented accessible English native more-comments control; live Facebook unverified. |
| T08 | Slashdot clean reading, older-story navigation, search | Implemented source story selection, punctuated pager and search form; actual fetched HTML checked, live navigation pending. |
| T09 | Explicit safe Google Maps → Apple Maps handoff | Implemented safe explicit handoff; query tests passed; physical handoff unverified. |
| T10 | Honest best-effort adapter support matrix, no authorization bypass/false success | Documented in SUPPORT.md; no live-site success or access bypass claimed. |
| P01 | On-device inference/learning, disclosed downloads, no analytics/article relay/history; untrusted content | Implemented local-only model/learning, omitted download credentials/referrer and explicit-site persistence; browser behavior unverified. |
| P02 | Recordings local until sharing; credentials only to intended endpoint, never URL/log/page storage/export/Git | Implemented GM-only direct-Microsoft key transport and local recordings; mock tests passed; platform isolation unverified. |
| P03 | Bounded CPU/memory/storage/network; cancellation and long/dynamic-page limits | Implemented bounded worker/batch/markers/serial speech/PCM/export; real device stress and regional rescans outstanding. |
| D01 | Maintainable source, one userscript, reproducible build/tests, install/setup, matching metadata/update distribution | Implemented source, lock, alpha bundle, build manifest, tests and install docs; reproducibility checked before merge. |
| D02 | Validated migration preserving `master-button:v1`, unrelated preferences and separately stored key; explicit reset/reinstall notices | Implemented non-destructive validated v1 migration and separate-key import; unit tests passed; actual old filename/update unverified. |
| D03 | No duplicate instances or remote-code/eval update mechanisms; supported extension update/recovery | Implemented instance/lifecycle guards and metadata-only update check; extension update behavior unverified. |
| V01 | ≥150 pre-labeled blocks, 8 pages, 4 layouts, page/site-held-out split; narrative exclusions, nuisance precision/recall, abstentions, mapping and latency | Actual 731 labels on 17 pages (11 public captures, six authored layouts); all now reused author regression. Raw/failed/conservative metrics separated; independent audit/holdout and recall target outstanding. |
| V02 | Visual inspection and user feedback plus 320/390/landscape/keyboard/large text/long excerpt/errors/clean/busy checks | Original and production light/dark clean/busy desktop renders available; physical layout matrix pending. |

## Next work

Improve recall without removing supporting references, publication attribution, captions or quotations; obtain independent labels and an untouched final holdout. Measure physical iPhone scrolling, model memory/CSP/latency and keyboard/storage. Diagnose the still-unresolved physical Azure key-entry report using the safe support report; no key received and no live Azure call made. Continue affected-region mutation optimization, live site/media/consent, native sharing and background audio checks.

## Current patch verification

87 local policy/Defuddle/JSDOM/mock transport/recorded-feature tests pass. CI replays recorded genuine-model vectors; it does **not** execute inference. Separate ONNX-WASM runs covered all 731 labels and the final group-context refinement. The broad 222-case test had 21 ARTICLE false exclusions and was rejected. The final conservative subset has zero ARTICLE exclusions on all 354 ARTICLE labels, with low recall disclosed above.

BBC labels were frozen before first inference. All headline, date/byline, standfirst, update note, image credits, captions and original body rows survive the reader scope and conservative decisions. The complete page inventory stays available. No BBC URL/text/index conditions are in production classification.

New mocks cover immediate pasted-key feedback, saved-key versus voice-list failure, atomic batch correction/learning Undo, stale selection leases, page/reading before/after scope, no seek during selection, stale export cancellation, visible blob players and exact matching delivered X sources. Scroll mocks also cover repeated root locks during continuous mutations, fixed body/negative offset, main-container overflow, touch locks, first tiny vertical movement, native default behavior, controls/horizontal gestures, hidden dialog ancestors, reader ownership and exact Undo. Earlier window-capture handlers remain a limitation; physical Safari is untested.

Earlier patches: alpha.2 corrected raw setup URL variants; alpha.3 fixed lexical GM access and introduced direct nag/media tools; alpha.4 separated preferences failures from verified key storage and added key-free support diagnosis. Their successful mock checks do not resolve the reported physical key-entry failure. Alpha.5 makes failure visible at the action and retains the input; real-device key entry/storage remains unresolved until checked. The private visual study remains an alpha.3 mock capture, not a real credential surface.

Alpha.5 build repeated identically: 00d9eca2f944aa5c67ba28c07a6459be511909f5cd60964631fa2ca366b68db6. Source, generated script and update metadata match. The local implementation preview was rebuilt using mock integrations; its private hosted screenshot study remains alpha.3.
