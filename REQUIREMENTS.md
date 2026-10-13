# iPhone Master Button — Product Requirements

## Instructions for the implementing LLM

Build an all-in-one userscript from these requirements. Treat this as a product specification, not a prescribed architecture. Choose the code organization, libraries, storage format, audio pipeline, and filtering algorithms that best satisfy the requirements on the target device. Do not reproduce an existing implementation merely because it exists.

Deliver usable code, installation and update instructions, and a short account of what was tested. Distinguish completed functionality from experiments and device-dependent limitations. Explain material platform constraints and propose the closest practical behavior instead of silently omitting a requirement. Do not claim physical iPhone verification from desktop browser tests.

For semantic filtering, discuss the proposed approach and its tradeoffs before implementing it. Routine engineering choices do not require approval.

## Purpose and target environment

Create a discreet tool available while browsing that combines URL utilities, article narration, and controllable removal of nuisance content. It should feel like a polished iOS utility and require little ongoing maintenance.

- Target Safari using the **Userscripts app on iPhone**.
- The user's device is an **iPhone 16** running **iOS 27.0.1**, as reported by the user.
- Work across ordinary websites where the extension has permission to run, including dynamically updated pages.
- Source code belongs in the public GitHub repository: <https://github.com/ksariash/userscript-master-button>.
- Keep credentials and personal settings on the device. No private key or personal browsing data belongs in the repository.
- If working in the existing repository, preserve installed users' settings and provide any necessary migration instructions.

## Floating button and menu

- Show one small, semi-transparent floating button. It should be unobtrusive when idle and easy to tap.
- Allow repositioning and remember the chosen position. Keep it accessible after rotation, viewport changes, and use of the on-screen keyboard.
- Expand into an icon-based menu. Show site-specific actions only when relevant.
- Include actions for clean URL sharing, URL editing, reading aloud, nuisance filtering, filter configuration, speech settings, and checking for updates.
- On a supported Amazon product page, include a camelcamelcamel action.
- Show a badge for the number of currently filtered page items. Use a consistent counting policy that avoids counting the same hidden content repeatedly through nested elements.
- Use accessible labels, usable touch targets, readable contrast, and light/dark appearance. Icon-only controls must remain understandable to assistive technology.
- Avoid disrupting the host website's styles, navigation, scrolling, and controls.

## URL tools

### Share clean URL

- Remove known tracking information while preserving parameters and fragments needed to identify or use the page.
- Use a local language model for "smart" URL cleaning
- Produce a short product URL for recognizable Amazon products.
- Prefer the native iOS share sheet. Provide a useful copy fallback.
- Do not navigate away from the page just to share its URL.

### URL editor

- Start with the current URL and allow editing before acting on it.
- Offer cleaning, copying, sharing, and opening the edited URL.
- Make the destination clear and handle malformed or unsupported URLs gracefully.

### Amazon price history

- Identify the current product and open the appropriate camelcamelcamel page in a new tab/window.
- Handle supported regional Amazon sites correctly; do not send the user to an unrelated product or marketplace.
- Hide the action or explain the limitation when no supported product can be identified.

## Speech setup

- Support Azure Speech Services using the user's own resource key.
- Ask for the key on first use, remember it locally, and provide a way to replace or forget it.
- Make the resource region and voice dropdown selections.
- Offer relevant voices for the selected configuration, with useful language/voice labels.
- Put a demo control beside the voice selector so the user can hear a sample before choosing.
- Avoid overlapping demo and article audio. Replaying an already prepared sample should not unnecessarily synthesize it again.
- Remember speech preferences. Clearly report invalid credentials, incompatible region/key combinations, connectivity failures, and service errors.

## Reading and audio player

### Extracting content

- Prefer selected text when the user has selected text; otherwise identify the main article in reading order.
- Avoid treating navigation, page chrome, advertisements, and recommendation widgets as article prose.
- Let the user review, edit, or paste text before narration.
- Preserve the relationship between extracted passages and their original page elements when available, so filtering decisions can be shared between the webpage and reader.
- Do not silently truncate long articles. Explain practical resource limits and offer a way to read a smaller selection.

### Playback

- Begin playing as soon as the first usable audio is ready. Do not wait for the whole article to finish synthesizing.
- Prepare later passages while earlier passages play. Show preparation, buffering, and error states clearly.
- Include play/pause, rewind, forward, seeking, and playback speed controls.
- Remember and re-apply speed controls between usage.
- Allow retries without unnecessarily regenerating successful audio.
- Support canceling preparation and changing the reading without stale requests taking over playback.
- Minimize the player while audio continues, and allow it to be reopened.
- While audio is playing, the button drawer should have a "mini" mode to expand only to the relevant audio controls before expanding to the full set of controls.

### Transcript and layout

- Use a large, expandable reading view that occupies most or all of the screen, rather than a cramped mini-player.
- Give most of the space to the transcript, with consistent, sleek, iOS-style playback controls remaining easy to reach.
- Highlight and follow the passage currently being spoken with word-level synchronization, or passage-level synchronization if that is not possible.
- Allow tapping a passage to jump to that part of the audio.
- Respect manual scrolling instead of constantly forcing the transcript back to the current passage.
- Allow comfortable text sizing and remember the preference.
- Gray out excluded passages, show why they were excluded, and allow the user to include them again.
- Make filtering rules accessible for viewing and editing from the player.

### Locked-screen listening

- Aim to support continued listening with the screen locked, including system playback controls where supported.
- Account for Safari suspending background page activity. Do not assume ongoing JavaScript, downloads, or passage transitions will always work while locked.
- Provide a practical prepared-recording mode or equivalent when progressive playback cannot reliably continue in the background.
- Explain when audio is ready for that mode and any remaining requirement to keep the source tab open.

## Audio sharing and export

- Include share/export controls in the player.
- Offer a compact, broadly compatible compressed format suitable for speech, such as MP3. Large uncompressed WAV files should not be the only option or the default sharing experience.
- Offer a sensible quality-versus-size choice. Original-quality export may remain available.
- Reuse prepared audio where practical; exporting should not require another paid synthesis request merely to change the file format.
- Show preparation progress and allow cancellation if compression takes time.
- Export the currently enabled passages in the correct order. Changes to that selection must invalidate stale exports.
- Prefer native file sharing, with a usable save/download fallback.
- Offer transcript export with the option to include useful timing information when available.
- Do not export skipped passages with the transcript.

## Nuisance filtering

### Shared goals

- Remove distractions from the webpage and omit corresponding content from automatic narration.
- Target advertisements, cookie overlays, newsletter promotions, related-story inserts, recommendation lists, and similar non-article material.
- Use shared evidence for webpage and reader decisions, while allowing a reader passage to be included without necessarily restoring it visually on the page.
- Explain automatic decisions in plain language and make corrections easy.

### Per-site controls

- Provide a quick filtering on/off toggle and remember it per site.
- Provide a configuration interface to inspect, edit, disable, delete, and reset rules.
- Account for frameworks that generate changing class names or use identical styling for both article paragraphs and nuisance inserts.
- Reapply relevant rules when content is added or changed dynamically.
- Make hiding reversible. Disabling or canceling a filter should restore the page changes owned by the script.
- Hiding a cookie dialog may silently submit consent choices for functional cookies only. Always reject advertising cookies. Where appropriate, restore scrolling left disabled by a hidden overlay.
- Protect the main document, entire article, and userscript interface from accidental broad hiding.

### Visual “select to filter” workflow

- Let the user tap an element to select it without activating its link or button.
- Highlight the selected target before committing a rule.
- Highlight **all elements matched by the proposed rule**, not just the element tapped.
- Show the match count and explain when a rule seems broad or fragile.
- Allow inspection of matches outside the current viewport.
- Provide a reversible hide preview so the user can see how the page flows after removal.
- Keep preview and saving distinct. Canceling, leaving the picker, or updating the application must not leave accidental rules or temporary page changes behind.

### Learning from corrections

- Learn per site from explicit “skip this passage” and “include this passage” actions.
- Fine tune the local LLM based on passages the user explicitly disables or enables.
- Do not treat seeking, rewinding, listening position, or the filter's own predictions as training labels.
- Explicit keep choices must counter incorrect automatic exclusions.
- Let the user inspect, override, disable, and reset learned preferences.
- Minimize locally stored learning data. Do not retain complete browsing histories, article text, or audio merely to learn nuisance patterns.

## Privacy and reliability

- Keep credentials in extension-controlled local storage, inaccessible to ordinary page scripts as far as the platform permits. Do not put them in webpage storage, URLs, logs, exports, or source control.
- Send credentials directly to the intended speech service. Only text enabled for narration should be sent for synthesis; skipping after synthesis cannot undo an earlier request.
- Do not add analytics, third-party text relays, or silent browsing-data collection.
- Keep recordings local unless the user explicitly shares them.
- Treat webpage text, markup, and attributes as untrusted input.
- Keep expensive work bounded so long pages and dynamic sites do not freeze Safari or drain the battery unnecessarily.
- Handle missing browser capabilities gracefully and explain actionable failures.

## Hosting, caching, and updates

- Keep the maintainable source and installable release in the public GitHub repository.
- Preserve local preferences and credentials across updates. Avoid duplicate floating interfaces or abandoned event handlers.
- Explain when a userscript metadata or permission change requires reinstalling/updating the installed script separately.
- Keep the repository organized so another LLM can make, test, and publish future changes without rewriting the whole project.

## Acceptance and delivery

Deliver the userscript, maintainable source, concise setup instructions, update instructions, and documented limitations. Include relevant automated tests and a short physical-device test checklist.

Verify at least these scenarios:

1. Installation produces one unobtrusive button; menu actions, dragging, preferences, and accessibility labels work.
2. Clean URL sharing preserves useful URL information, and Amazon routing identifies the correct product.
3. First-use speech setup, region and voice selection, demos, invalid credentials, and remembered settings work.
4. Audio starts before full synthesis completes; pause, resume, seeking, transcript following, retry, cancellation, and minimizing behave consistently.
5. Compact exports contain the chosen passages and can be shared or saved on iPhone.
6. Picker previews show all matches, avoid activating page controls, and restore the page on cancel.
7. Rule edits, keep exceptions, learning, dynamic content, and reset/disable controls behave predictably.
8. Updates preserve preferences, activate only a valid working version, and recover safely from failures.

Prioritize accurate content preservation, responsive playback, easy correction, and reliable updates over cleverness or unnecessary complexity.

