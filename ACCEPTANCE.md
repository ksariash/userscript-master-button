# Acceptance and validation

The old code passed automated checks but did not satisfy the user. A new release needs distinct evidence for policy correctness, real model behavior, usability, aesthetic quality, and the target platform.

## First milestone

- Extract a realistic article and its surrounding nuisance candidates with preserved wording, order, and source mapping.
- Execute a real local model; measure download/startup/inference/resource costs. Demonstrate failure with text preserved and an honest unavailable state.
- Skip a passage on the original page: it grays in place, the matching transcript changes, future narration/export selection updates, and Undo restores both state and learning contribution. Keep survives late automatic results.
- Correct short, nested, full-width, already excluded, and dynamically inserted passages without covering prose or activating a link.
- Present the compact interactive design prototype and rendered light/dark states for feedback alongside broader implementation.

## Filtering evaluation

Create a small, independently labeled regression corpus before tuning. Include news features, link-heavy blogs, lists, technical articles, promotional inserts, and dynamically inserted recommendations. Specifically reproduce a BBC-style related-books block that shares article vocabulary; also include legitimate article prose mentioning ads/subscriptions.

Proposed initial benchmark: at least 150 labeled blocks from eight pages across four distinct layouts, with a held-out portion. Report ARTICLE false exclusions, NUISANCE precision/recall, abstentions, mapping failures, and latency. Count nuisance abstentions as missed nuisances for recall; do not hide them from results. Record corpus provenance/date, model/configuration, and thresholds.

Initial release targets to validate during planning: zero narrative ARTICLE exclusions on the regression set, at least 95% NUISANCE precision, and at least 85% recall on held-out blocks. These finite-corpus targets are not a guarantee about all websites. Publish failures honestly; improve the model/policy or agree on revised targets, rather than hand-tuning individual test pages or replacing real inference with mocks.

## Functional verification

| Area | Required evidence |
| --- | --- |
| Decisions | Precedence, shared page/reader state, reversible learning, malformed storage, disable vs clear, Show all preview |
| Mapping/lifecycle | Duplicate text, mixed containers, DOM mutation, changed passages, SPA navigation, canceled/stale jobs |
| Selector picker | All matches, offscreen inspection, broad-rule protection, no link activation, exact preview/cancel restoration |
| Speech | Live Azure when credentials are available; first-segment start, retry/cache, seek/speed, cancellation, no overlapping demos |
| Export | Actual audio plays and seeks in a real player; enabled order, stale selection invalidation, transcript accuracy, format/size |
| URL/site tools | Necessary URL semantics preserved; supported adapters work on current live pages; unsupported cases are explicit |
| Updates/privacy | No duplicate interface; validated storage migration; no secret leakage; no unintended text requests |

Use focused unit tests for policy/races and browser integration for interaction. Mocked services can verify integration and failure paths, but cannot satisfy actual model or audio claims. Test legacy learning data represented as malformed objects/strings so an array-method failure cannot block correction.

## Visual and platform verification

Capture main menu, page review, Why/long excerpt, reader/player, and speech settings in light/dark. Inspect small width, 390×844, landscape, safe areas, keyboard, enlarged text, busy backgrounds, and long labels. Check two successive launcher taps, drag/tap distinction, control collisions, accessible labels/focus, scroll preservation, and the reading-space budgets in FRONTEND_GUIDE.

Record the device/OS, Safari, Userscripts version, viewport, actual model backend, and live-service conditions for physical iPhone verification. Desktop browser emulation and WebKit automation must be labeled separately. If device access or credentials are unavailable, provide a concrete manual checklist and mark those gates pending; do not claim them passed.

Locked-screen playback needs a real device trial, including buffering and passage transitions. Prepared recordings need a local-player trial. User feedback on screenshots/prototype remains useful for aesthetic evaluation and does not gate implementation; a numerical layout test alone cannot provide it.

## Release record

List completed, deferred, blocked, and unverified requirements; reproducible test commands; model benchmark results; screenshot evidence; installation/update instructions; and platform limitations. A partial milestone must be labeled accordingly. Never retain a green CI badge as a substitute for these results.

