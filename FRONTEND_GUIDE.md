# Frontend and visual design

The intended character is a quiet reading instrument: clear type, restrained color, precise alignment, and subtle depth. Beauty must come from composition and interaction, with compact controls preserving space for the article. Study [DESIGN_REFERENCES.md](DESIGN_REFERENCES.md); the rules here are our interpretation, not copied product layouts.

## Visual hierarchy

Use three layers: original article/transcript, a compact functional control surface, and an on-demand inspector. Keep one main task and one obvious primary action per surface. Use typography, spacing, and thin separators before adding containers. Avoid nested cards, large title blocks, oversized metrics, repeated explanatory paragraphs, and equal-weight grids of every feature.

Apply translucency sparingly to floating navigation/player surfaces. Content and forms need dependable backgrounds and contrast. A web userscript does not inherit Apple's native Liquid Glass behavior; do not promise it or imitate it with heavy blur everywhere.

## Proposed starting tokens

These are project starting points to validate in a prototype, not measured values copied from reference products. Keep tokens centralized and reusable; adjust the system coherently during implementation.

| Element | Starting rule |
| --- | --- |
| UI type | System font; 15–16px ordinary labels, 13px secondary text, restrained semibold titles |
| Reader type | User-adjustable, initially 18–20px with approximately 1.5–1.65 line height; comfortable bounded line length |
| Inputs | At least 16px text; native selects where useful |
| Spacing | 4px base rhythm; 8/12/16/24px steps; 16px ordinary surface inset |
| Color | Neutral warm light/cool dark surfaces; one restrained blue accent; semantic error/status colors only when needed |
| Corners/depth | One coherent small/medium/surface radius scale, approximately 8/12/20px; a subtle surface shadow, few borders |
| Icons | One consistent vector icon family, approximately 18–20px; no emoji navigation |
| Touch | At least 44×44 CSS px activation area; small visible glyphs can sit inside larger hit areas |
| Motion | Brief, purposeful transitions; respect reduced motion; no decorative pulsing |

Verify contrast using rendered colors, including on bright/busy host pages. Muted does not mean unreadable. Handle increased text size and longer labels without shrinking controls.

## Surface design

**Idle and launcher.** One restrained floating control, remembered placement, recognizable accessible label. A small exclusion badge is secondary. Keep the hit area reachable and distinguish drag from tap. The launcher must never be hidden behind its own open surface.

**Action surface.** Start with a short, clearly labeled list or small toolbar for Read, Review, Share. Use a single secondary entry for settings/other tools, and show relevant site actions contextually. Aim for a normal menu below roughly 320px tall at a 390×844 viewport. This budget excludes the reader and deliberate expanded inspectors. Compactness comes from fewer simultaneous choices and progressive disclosure, not tiny text.

**Passage review.** Put a quiet marker next to each currently visible candidate in Review mode. Selecting a passage reveals its contextual Skip/Keep action and optional Why. One active passage receives emphasis; avoid a row of prominent buttons on every paragraph. Skip grays text while retaining geometry, Keep restores it, Undo remains easy, and Done removes temporary controls. Keep the marker/hit region clear of links. Full-width passages require a reachable alternate contextual action, not omitted controls.

**Reader.** Use an editorial reading column, a small navigation row, and a compact bottom player. At default text size on 390×844, target at least 70% of usable reader height for transcript; document exceptions at larger accessibility sizes. Controls must not cover its final passages. Indicate current audio with a subtle highlight. Gray excluded text remains readable and correctable. A tap to seek must not be confused with Skip.

**Correction/Why.** Use a short excerpt, simple state/reason, and Skip/Keep. Long selections expand on demand. Diagnostics, model identifiers, thresholds, and scores belong in Details. Avoid the former full-screen stack of selection, reason, action cards, and score cards.

**Settings and speech.** Prefer aligned rows with label/value, native controls, and concise inline help. Region and voice selection plus an adjacent demo should fit naturally. Keep the secret field distinct with replace/forget controls. Advanced model/rule options live behind disclosure. Open one child surface at a time, with consistent Back/Close/Done behavior.

**Audio minimized.** A compact playback bar with pause/resume and reopen is sufficient. Secondary playback/export options can expand. Preparation status belongs near playback, not in a giant modal.

## Interaction and accessibility

Use semantic buttons, associated labels, clear accessible names/state, visible focus, and sensible reading order. Ensure every icon-only action has a label. State must be conveyed through text/control semantics as well as color. Keep graying separate from overlay opacity so correction controls remain legible.

Preserve focus, input drafts, text selection, transcript scroll, and expanded disclosure state on async updates. Patch affected UI rather than replacing whole surfaces. Use an inline actionable error at the failed action; optional toasts must be brief and never display raw exceptions across the article.

Isolate utility styling from the website. Respect safe areas, dynamic/visual viewport, browser bars, keyboard, zoom, landscape, light/dark appearance, and reduced motion. Modal scroll locks need ownership and cleanup; ordinary popovers must not immobilize the site. Minimized work must stay minimized.

## Design proof

Maintain an interactive prototype through implementation covering launcher/menu, page correction, reader/player, Why, and speech setup. Capture light/dark screenshots over both clean and cluttered pages. Inspect 320px width, 390×844, landscape, keyboard, large text, long excerpts, and error states.

Review hierarchy, spacing rhythm, type, balance, alignment, control density, and reading space with the user. Screenshot assertions and a token list cannot prove aesthetic quality. Keep the approved visual direction consistent through implementation, and review screenshots again when real content replaces prototype data.

