# Progress and remaining scope

**Fresh implementation recovered; experimental 2.0.0-alpha.1.** The user removed review gates. The complete source and generated artifact are published through GitHub after the executor reconnect; no rejected implementation was retrieved. This is a partial alpha, not a validated full-product release.

## Evidence kept separate

| Evidence class | Observed result | Limit |
| --- | --- | --- |
| Policy / Defuddle / mock DOM and speech integration | 44 tests passed again after recovery | No physical geometry, live service or model-accuracy claim |
| Actual model inference | Pinned FLAN, Qwen and NLI ONNX tensors on desktop Node CPU; raw reports under experiments | Author labels; reused regression, no independent audit or pristine final holdout |
| Current filtering quality | 85-case NLI/head regression: 1 ARTICLE error, 95% precision, 82.6% recall, 3 abstentions | Target unmet; automatic exclusions disabled |
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
| F03 | Useful nuisance classification: ads, related stories/books, recommendations, newsletters, promotions, app prompts; retain legitimate discussions/quotes | Blocked: current real-model quality misses targets; automatic exclusions disabled. |
| F04 | Uncertainty inclusion; loading/unavailable/failed/ready; explicit deterministic fallback; no hidden cloud inference | Implemented observable model state and inclusion on failure; browser runtime unverified. |
| F05 | Original-page passage overlays, geometry-preserving Skip, Keep, optional explicit collapse | Implemented source ranges and owned gray styles; physical geometry unverified. |
| F06 | Temporary Review, visible controls only; short/nested/full-width/previously excluded/dynamic correction; no covered prose/links; alternate action | Implemented visible markers and Previous/Next fallback; collision/touch proof unverified. |
| F07 | One decision across page, transcript, teaching, narration/export selectors; immediate correction; late-result precedence; Undo contribution | Implemented one store, content/evidence leases and transactional Undo; mock integration passed. |
| F08 | Automatic off preserves explicit choices; separate clear; Show all changes no decisions | Implemented; policy/DOM tests passed. |
| F09 | Optional visual-only muting while included for narration, without competing classifier | Implemented explicit visual muting without changing inclusion. |
| F10 | Why excerpt/state/reason; actual model/fallback/evidence in collapsed Details; no score dashboard | Implemented contextual Why and collapsed actual evidence; desktop study rendered. |
| L01 | Per-site explicit-only learning; Keep exceptions; inspect/disable/delete/reset; minimal data; no history archive | Implemented explicit memories and gradient-trained head; frozen base LM, no full-LM fine-tuning. Cached reassessment and Undo verified with mock feature inputs. |
| L02 | Remember per-site on/off and rules; inspect/edit/disable/delete/reset; mutation batching/SPA cancellation; no duplicate/stale overlays | Implemented validated storage, rules and navigation retirement; mutation scans need affected-region optimization. |
| S01 | Visual selector picker intercepts links, shows all matches/count/offscreen, flags broad/fragile selectors | Implemented all-match picker; authored DOM passed; document capture handlers covered; earlier window capture handlers remain a platform limit. |
| S02 | Separate reversible preview/Save; exact cancel restoration; protect root/article/utility | Implemented owned preview/cancel and Save; legacy whole-article guards exclude script ballast. |
| S03 | Restore only script-owned locks from nuisance removal; preserve native dialogs | Partial: owned utility locks restored; current site-specific ownership unverified. |
| S04 | Necessary-only/reject-ads consent through validated native site adapters; distinguish hiding from consent | Outstanding: no live-validated necessary-only consent adapter; hiding is not consent. |
| U01 | One subtle launcher, 44px hit area, excluded count once, tap/drag distinction, remembered position/reachability | Implemented drag/clamp/persistence; physical touch/viewport proof unverified. |
| U02 | Read/Review/clean-share primary; compact secondary filtering/rules/URL/speech/update/site tools | Implemented compact primary menu and contextual secondary surfaces. |
| U03 | Accessible labels/focus/state; light/dark; isolated styles; safe areas/visual viewport/browser bars/keyboard/zoom/landscape/reduced motion | Implemented isolated styles/labels/themes; physical accessibility/viewport checks unverified; Follow target corrected to 44px; physical target audit pending. |
| R01 | Prefer selection else main article; review/edit/paste; changed/absent mapping visible; no truncation | Implemented exact selection, editor/paste and explicit absent mapping; DOM tests passed. |
| R02 | Transcript dominates; compact anchored player; seeking separate from correction; gray reviewable exclusions | Implemented transcript/player and separate correction targets; actual playback unverified. |
| R03 | Preserve scroll, focus, selection, drafts/disclosures on async updates | Implemented incremental patching; mock DOM focus/draft/scroll/disclosure tests passed. |
| R04 | Follow spoken passages or verified words; respect manual scroll; return-to-current; remember text size/rate | Implemented passage follow/manual return and preferences; actual audio/device proof unverified. |
| A01 | User's Azure key in extension-controlled storage; replace/forget; accurate platform limits | Implemented GM-only key storage, replace/forget and dedicated setup entry; physical isolation unverified. |
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
| V01 | ≥150 pre-labeled blocks, 8 pages, 4 layouts, page/site-held-out split; narrative exclusions, nuisance precision/recall, abstentions, mapping and latency | Actual 169 labels/8 pages/4 layouts plus 85 new cases; author labels only, reused regression; independent audit/holdout and targets outstanding. |
| V02 | Visual inspection and user feedback plus 320/390/landscape/keyboard/large text/long excerpt/errors/clean/busy checks | Original and production light/dark clean/busy desktop renders available; physical layout matrix pending. |

## Next work

Improve filtering with independent labels and a fresh holdout; retain the exclusion safety flag until targets pass. Cached-head reassessment, owned MediaSession cancellation and the observed touch target were fixed. Continue mutation optimization and physical picker/layout validation. Run the separate physical Safari, live Azure and live-site/necessary-only consent checklists. Keep this ledger current when evidence changes.

## Azure key setup correction — alpha.2

The setup allowlist previously recognized only `/main/SETUP.txt`; the equivalent `/refs/heads/main/SETUP.txt` raw URL left entry and Save disabled. Both exact repository/main file paths are now accepted. Setup automatically opens Speech, and unavailable storage or an unsupported page gets an actionable explanation. Other hosts, repositories, branches and files remain blocked. The reported device URL was not captured, so this is a reproduced URL-policy defect rather than a confirmed physical-device diagnosis.

47 local tests pass, including positive key entry/focus/save/forget on both raw URL forms, negative URL checks, unavailable extension storage and canonical navigation. Storage/network are mocks; no actual credential was used, no Azure call was made, and no physical Safari check was performed. No model or inference logic changed. Alpha.2 source, metadata and generated bundle match.

## Current alpha.3 correction

The user’s physical Safari screenshot confirmed setup auto-opening but showed storage unavailable. The first URL-only patch did not address the actual GM bridge defect: Userscripts injects GM lexically, while the bundle read globalThis.GM. Startup now captures the lexical API without exposing it on the webpage; an injection-wrapper mock regression saves a fake key without a window.GM property. Key setup puts the key field first. Voices load from the region API after saving or reopening setup, use validated language groups/searchable labels, reject stale region responses and prevent synthesis with a voice absent from the catalogue. No live credential/service verification was performed.

X/Reddit screenshot-wording app nags now use direct, reversible removal, recurrence observation and conservative scroll release while preserving other dialogs. Excluded source text resolves in the authoritative decision store, narration/transcript/export omit it, and explicit Keep restores the overlay. Cleanup/Media moved into the launcher menu. The nonmodal manual-popover host avoids ordinary page stacking contexts where supported; physical touch/top-layer behavior remains unverified.

Slashdot uses source story title/byline/body IDs, a punctuation-tolerant same-site pager and dedicated fhfilter search. A current public HTML capture parsed on desktop yielded 199 source rows, 70 story rows, all 15 story titles, zero footer rows in the selected reading and a valid older route. This is actual fetched markup, not live browser interaction. Reddit fetch was denied; X’s fetched initial HTML had no interactive app modal. Their modal fixtures are authored from screenshot wording.

The media browser now has post titles, thumbnails, image/video/search filters, source alternatives grouped per item, a link-safe on-page picker, preview with native video controls, Previous/Next, source-page location and explicit Prepare → Save/share. File transport is cancellable with an 80 MB bound and rejects HTML/error/playlist responses. Detached preview audio is released. Actual website downloads/native iPhone sharing remain unverified.

59 local tests pass, including new mock wrapper, voice/region, screenshot-derived nag/recurrence/Undo, source/pager, media browser/picker/transport and invalid-voice-before-paid-synthesis checks. Automatic model exclusions remain disabled; the filtering model and its earlier accuracy evidence did not change. Physical Safari and live Azure checks remain separate outstanding work.

[Light](prototype/screenshots/tools-light.png) / [dark](prototype/screenshots/tools-dark.png) production-UI desktop renders were viewed. Menu/media list/preview/key-first Speech layouts remain compact at the authored 390×844 iframe viewports. [Provenance](prototype/screenshots/tools-provenance.json) records the exact Sites source/versions. Images/voices are mock fixtures; the preview explicitly disables key entry. Browser automation and the broader physical layout matrix were not run. The existing owner-private preview was updated without changing its audience. Repeated alpha.3 build hash: `af678eb2d950651fad9f5c49c4da0a003e23d77b185662c10876299d3c465c9d`.

## Alpha.4 storage diagnosis

The user reports alpha.3 still fails before entering/saving the key. No key or secure credential-entry channel is available in this session; no live Azure call was made. A preferences-load failure had disabled storage globally; this now leaves present APIs usable for explicit key-save attempts. Key writes and deletion require readback confirmation, and storage error text is replaced with fixed safe messages. Opaque printable header-safe key formats are accepted; Azure, rather than a hexadecimal guess, determines their validity.

Speech displays installed/manager versions and provides on-demand Check extension storage, Test Azure connection and Copy support report. The storage probe needs no key, checks read/write/readback/delete, cleans its own random probe and reports fixed stage codes. The report whitelists fields and excludes keys, values, error bodies/headers/URLs/page text. Azure connection testing performs only a voice-list GET with the saved key. No API is exposed on the host page.

64 local tests pass, including startup preferences failure with a still-usable key form, verified save, probe cleanup/failure stages, safe report contents and no-key/no-network Azure diagnostics. The previous distributed alpha.3 bundle was also executed under a lexical GM injection mock: it initialized storage and launcher without a window.GM property. These findings do not establish the user’s device cause. Physical Safari key entry/persistence and live Azure remain unverified until an actual on-device report/service result is available. Model and site-adapter logic are unchanged.

Alpha.4 repeated build SHA256: `ddc757a9e7f08defbfd83410dad97a3581bba263b02fc157414b83c04860a2d4`. Source and generated metadata/bundle are synchronized. The existing private design preview remains the alpha.3 mock design capture; it is not the credential setup surface.
