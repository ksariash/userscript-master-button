# Product requirements

## Purpose and priorities

Build one discreet browsing utility for **Safari with the Userscripts extension on iPhone**. It should preserve article content, remove distractions reliably, and feel carefully designed. Verify the user's current device and extension capabilities when device-specific decisions matter; previous environment reports are not compatibility evidence.

The user rejected the previous filtering and visual design. Success requires working behavior on realistic pages and a pleasing, compact interface, independently of automated test results.

| Priority | Deliverable |
| --- | --- |
| First | Correct extraction, actual local classification, reversible page corrections, and synchronized reader state |
| First | A coherent mobile design demonstrated with interactive states and screenshots |
| Next | Azure narration, transcript editing, playback, and compact exports |
| Then | Full URL tools, site-specific utilities, preference migration, and reliable updates |

These are sequencing priorities, not permission to omit later requirements.

## Filtering and shared passage behavior

The requested pipeline is webpage HTML → **Defuddle** → **local language model** → ARTICLE/NUISANCE decisions → clean article retaining original wording. Keep an original source inventory so extraction cannot permanently erase rejected or unmapped blocks. Exact model, runtime, build system, and learning method remain open choices.

- Identify passages in reading order, including headings, lists, quotations, captions, and article prose. Consider nearby context and structure; topic overlap alone cannot distinguish a related-story widget from the article.
- Preserve text when uncertain. Provide clear loading, unavailable, failed, and ready states for the model. A deterministic fallback must be labeled as such.
- Target ads, related stories, recommendation lists, promotions, newsletters, app prompts, and similar interruptions without deleting legitimate quoted text or article discussion of these subjects.
- Provide small **overlay buttons attached to passages on the original page**. Skip grays the passage without removing its layout; Keep restores it. The transcript uses the same behavior and shared algorithms. Default to reversible graying; collapsing is an optional explicit preference.
- Support temporary Review mode to avoid covering a page with permanent controls. Every passage, including a short or full-width passage, must be correctable. Keep controls clear of prose, links, and site actions; use an accessible contextual fallback if a margin cannot accommodate them.
- Page review, reader, teaching, narration selection, and export use one source identity and effective decision. Corrections update all views immediately, survive background classification, and support Undo. Seeking or scrolling never teaches the filter.
- Explicit Keep/Skip wins over automatic predictions and custom rules for that passage. Turning automatic filtering off clears its effect while preserving explicit choices; provide a separate clear-corrections action. Show all is a temporary preview that changes no decisions.
- If desired, a separate, explicitly labeled page-display preference may leave a passage visually muted while including it in narration. Do not create contradictory classifiers to achieve this.
- Show Why on demand: short plain-language reason first, actual evidence and model/fallback details second. No large score dashboard during ordinary reading.
- Learn per site only from explicit corrections. Provide inspect, disable, delete, and reset controls. Keep exceptions must counter false exclusions. Store minimal learning data, without a browsing-history archive.

## Filtering controls and selector rules

Remember per-site filtering on/off. Support rule inspection, editing, disabling, deletion, and reset. Handle dynamic insertions and navigation without repeated scans, duplicate overlays, or stale decisions.

A visual picker selects an element without activating its link. Show every proposed selector match, count matches, flag broad/fragile rules, and permit reviewing offscreen matches. Reversible preview and Save are distinct actions. Cancel fully restores script-owned changes. Protect the document root, entire article, and utility UI from broad exclusion. Restore scroll locks only when attributable to a removed nuisance overlay, preserving normal site dialogs.

Cookie handling must distinguish hiding a banner from recording consent. The desired outcome is functional/necessary cookies only and rejection of advertising where the site's legitimate consent interface supports it. Validate a site-specific adapter before submitting choices; never invent consent or silently accept advertising.

## Launcher and navigation

Use one small, subtly translucent floating button with a generous invisible tap area. Allow dragging, remember placement, and keep it reachable after rotation, zoom, keyboard, and browser-chrome changes. A tap opens/closes the action surface reliably; dragging does not activate a tool.

Make Read, Review, and clean-link sharing easy to reach. Filtering on/off, rule configuration, URL editing, speech setup, updates, and contextual site actions remain available through compact secondary controls. Count currently excluded page items without nested duplicate counts. Use clear labels, accessible controls, and light/dark appearance. Isolate utility styles and avoid disrupting website navigation or scrolling.

## Reader, narration, and export

- Prefer selected text; otherwise extract the main article in order. Allow reviewing, editing, and pasting text. Show when edited/pasted passages no longer map to the original page. Never silently truncate long articles.
- Give most of the reader to a comfortable transcript, with a compact anchored player. Tap a passage to seek; provide an unambiguous separate correction action. Gray exclusions remain reviewable with Why/Keep. Preserve scroll, text selection, focus, and editor drafts through corrections and async updates.
- Follow the spoken passage, or words when reliable timing exists. Respect manual scrolling, with an explicit return-to-current action. Remember text size and playback rate.
- Use the user's own **Azure Speech** resource key, stored in extension-controlled storage as far as the platform permits. Support replace/forget, region and voice dropdowns, searchable useful voice labels, and a demo beside the voice selector. Cache reusable demos and prevent demo/article audio overlap.
- Start playback after the first usable segment; prepare later segments while playing. Provide pause/resume, backward/forward, seeking, speed, buffering, retry, and cancellation. Reuse successful audio instead of repeating paid synthesis. Stale jobs cannot take over a new reading.
- Submit only passages enabled at request time. A later Skip cannot retract text already sent. Update future preparation when decisions change while retaining unrelated prepared audio.
- Minimize to a small player and reopen without losing state. Attempt system playback controls and locked-screen listening where supported. Offer a prepared recording for local playback when background preparation/transitions cannot work reliably.
- Export/share enabled passages in order as compact, broadly usable speech audio such as MP3, with sensible quality choices. Reuse prepared audio where possible. Export selection changes invalidate stale files. Show progress/cancel for preparation or conversion; provide native sharing and save fallback.
- Export the enabled transcript, optionally with verified timings. Report real current-segment duration and known prepared duration; use an unknown state rather than fabricated whole-article timing.

## URL and site tools

| Tool | Required outcome |
| --- | --- |
| Clean URL/share | Remove recognized tracking while preserving necessary query parameters/fragments; native share with copy fallback; sharing never navigates the page |
| URL editor | Edit current URL, clean/copy/share/open explicitly, validate destination and malformed input |
| Amazon | Canonical product links and correct supported regional camelcamelcamel routing; unavailable action when identification fails |
| Reddit | Repeated app-prompt cleanup with safe scroll restoration; optional reveal of already delivered NSFW media, respecting access restrictions |
| X, Instagram, Facebook, LinkedIn | Contextual nuisance cleanup and direct accessible image/video selection; no permanent media buttons littering pages |
| Facebook comments | Use the site's accessible native more-comments controls when available |
| Slashdot | Clean reading, accessible older-story navigation, and search |
| Maps | Offer safe Google Maps to Apple Maps handoff with an explicit destination/action |

Site utilities are best-effort adapters with a documented support matrix. They must not bypass authorization or fabricate success when accessible content/controls are absent.

## Privacy, persistence, and delivery

Inference and learning stay on device. Disclose initial model downloads and their size; never silently send passages to a model server. No analytics, third-party article relay, or silent history collection. Recordings remain local until shared. Treat page content as untrusted.

Credentials go directly to the intended speech endpoint, never to page storage, URLs, logs, exports, or source control. State actual userscript sandbox limitations. Bound CPU, memory, storage, network concurrency, and work on long/dynamic pages.

Deliver maintainable source and one installable userscript with matching update metadata, reproducible build, tests, and concise setup. Preserve preferences and keys through updates using validated migrations; document any explicit reset or permission/reinstall requirement. The prior implementation used a `master-button:v1` settings namespace and a separately stored speech key. Do not silently destroy existing extension storage during the rebuild. Avoid duplicate instances and remote-code/eval update mechanisms.

## Decisions to resolve before promising completion

1. **Local model:** choose a genuine model and runtime after testing download, inference, latency, memory, CSP, and Safari/Userscripts feasibility. An embedding classifier is a possible proposal, not a mandated substitute for the user's local-LM request.
2. **Fine-tuning:** the user requested learning/fine-tuning from corrections. Explain whether true weight updates are practical; obtain agreement on an alternative such as retrieval/prototypes if needed. Never relabel it as weight fine-tuning.
3. **Smart URL cleaning:** local-model assistance was requested. Validate its value and safety; deterministic preservation checks remain necessary, and risky removals require user review.
4. **Consent and background audio:** validate platform/site capability and present a practical, honest fallback. Hiding a dialog and providing a recording do not prove consent submission or reliable locked-screen streaming.
