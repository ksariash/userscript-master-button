# Compact frontend development guide

Normative for every interface change, alongside DESIGN_SYSTEM.md. Optimize for an iPhone webpage overlay: the article remains the primary surface.

## Components and density

Use the tokens in `src/05-ui.js`: system type, one blue accent, neutral light/dark surfaces, 7px group gaps, 10px outer gutters, 12px component radii and a 19px drawer. Keep one stylesheet; replace outdated definitions instead of appending release-specific overrides.

- Launcher: one 44px visible disk inside a 56px target. Distinguish intentional dragging from tapping; a second touch closes the drawer. Never anchor a drawer over its launcher.
- Header: 48px, short 15px title, 44px Back and Close targets. No repeated branding in subviews.
- Main tools: at most six actions in a three-column grid. Contextual site actions form compact rows.
- Ordinary controls: at least 44px touch area. Reduce nested cards, duplicate labels and explanatory text rather than shrinking targets.
- Teach: short expandable selection, one reason row, Skip/Keep actions, inline recoverable error, collapsed Details. Target <=360px collapsed at 390x844 with an ordinary selection.
- Filter: site toggle, model state, Show all/Teach/Pick and Review passages. Thresholds and collapse preference belong behind Advanced filtering.
- Reader: full-height transcript with compact anchored player. Preserve scroll and focus during corrections and asynchronous updates.
- Page review: temporary viewport controls plus a small Done/Undo bar. Use source IDs and the same correction action as the reader. A selected passage's Why action opens the shared explanation. Buttons disappear on exit; skipped text remains gray unless the user chooses collapse. Keep marker DOM nodes stable during status updates to preserve focus. When margins or spacing cannot fit the controls, show a native passage chooser and Skip/Keep action in the small review bar; every source remains reachable.

## Consistent state language

Use Keep, Skip, Undo, Review passages and Show all consistently. Show skipped state through both text styling and a labeled control. An unavailable model is not a ready model; an unclassified passage has no fabricated score. Similarity details stay accessible without dominating routine tasks.

Use a concise inline error at the affected action. Preserve entered keys, selections, editor drafts and disclosure state across background renders. Disable duplicate submissions while saving. A status toast supplements persistent errors; it must not dump raw exceptions over the article.

## Accessibility and host-page behavior

- Use actual buttons for actions, native selects for enumerations, associated labels, visible focus, meaningful accessible names and `aria-pressed`/`aria-checked` where appropriate.
- Keep editable inputs at 16px on iPhone to avoid focus zoom. Respect safe areas, keyboard and visual viewport resizing, dark mode and reduced motion.
- Do not rewrite website HTML or wrap paragraphs in layout-changing containers. Isolate overlay controls in Shadow DOM.
- Preserve readable contrast when graying passages. Do not use low opacity on an entire paragraph and its controls.
- Keep controls from overlapping each other; prefer page margins. Edge-to-edge and tightly spaced passages use the chooser fallback; controls must not cover text or links. Verify the selected source outline and chooser labels on a physical device.
- Automatic updates must not steal focus, move transcript scroll or reopen a minimized reader.

## Release review

At 390x844, inspect default menu, Filter, Teach with a long selection, Speech, page review and Reader in light and dark mode. Check smaller widths, landscape, keyboard, zoom, long labels and dynamic insertions. Main menu should stay below 400px in ordinary use (450px maximum regression bound); Teach <=360px collapsed; Speech <=530px.

Test both launcher taps, draggable placement, pointer hit areas, passage links, controls near viewport edges, scroll restoration, Back/Close/Done and error recovery. Capture browser screenshots in CI artifacts. Do not label Chromium screenshots as physical Safari verification.

The launcher is hidden while the full-screen reader is open; the reader’s Close and Minimize controls provide navigation without covering the player. Count gray and collapsed passages consistently in the filtered-item badge, deduplicating nested blocks.
