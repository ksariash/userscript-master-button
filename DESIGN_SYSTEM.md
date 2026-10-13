# Compact iPhone UI design system

This document is normative for all future LLM-assisted changes to Master Button.
Read it before editing UI. Implement and test against it rather than adding another ad hoc screen.

## Sources and design rationale

Based on Apple's Human Interface Guidelines for [menus](https://developer.apple.com/design/human-interface-guidelines/menus), [layout](https://developer.apple.com/design/human-interface-guidelines/layout), [sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), and [settings](https://developer.apple.com/design/human-interface-guidelines/settings). In particular: menus conserve space, prioritize frequently used commands, and apply uniform icon treatment; grouping and progressive disclosure prevent a long wall of controls. This script is a website overlay, so system native menus cannot always be used; respect the interaction principles rather than imitating full-screen Settings.

## Rules

1. **Information density first, not tiny tap targets.** Interactive rows and buttons remain at least 44 CSS pixels high. Achieve compactness by eliminating duplicate labels, oversized cards, explanatory paragraphs, and vertical gaps — never by shrinking touch targets.
2. **One floating control only.** No permanently injected social-site buttons. Drawer is max ~352px wide and should fit its ordinary six main actions and contextual controls in 360–400px of height at 390px viewport width.
3. **Navigation rail:** one compact header, one short title, back and close controls. No prominent repeated branding or large hero headings.
4. **Small tool vocabulary:** a maximum of six frequently used actions in a 3-column icon grid. Put site-specific functions in a compact 2-column group below. Put infrequent settings in their own views.
5. **Grouped, single-line settings:** put `Label | control` in a single shared surface, one 44–48px row per setting. Use native iOS `<select>` for enumerated fields such as Azure region, rate, and voice; don't fake an input as a dropdown. Attach demo playback directly next to voice selection.
6. **Progressive disclosure:** only show a brief 1–2 line explanation when needed. Errors/progress/status appear next to the affected setting. Provide one line of privacy disclosure, not a wall of text.
7. **Spacing scale:** group gap 7px; inner gap 4–6px; outer gutters 10–12px. Corner radii 11–13px for groups and 19px for floating drawer. Avoid double borders and needless nesting.
8. **Type scale:** 15px semibold titles, 12–14px controls, 10–11px section labels and guidance. Use system SF font stack, dark/light dynamic colors, meaningful contrast, no externally loaded font.
9. **Color and icons:** one blue accent for interactive/selected state, muted neutral surface for the rest. Only use green/amber/red for real readiness/warnings/errors. Use consistent simple stroke SVG icons; no mixed emoji styles for related actions.
10. **Native accessibility:** labels and value reading order, dynamic type where feasible, 44px minimum touch, visible keyboard focus, clear VoiceOver labels, safe-area/keyboard boundaries, reduced motion.
11. **Safety cues:** distinguish heuristic versus active on-device model with an explicit status indicator. Never imply the model is running unless weights were loaded and inference is available; show actionable failure.
12. **Privacy by design:** API keys stay in extension storage; no sensitive text in query strings or analytics. Only local model weights may be downloaded for ML. Explicit user labels only for learning, with clear delete/reset.
13. **Respect site styles:** isolate presentation with Shadow DOM. Avoid page body replacements, fragile global selectors and input capture outside explicit picker modes.
14. **Screenshots are release criteria:** run `tests/experience.py` and `tests/reddit_delayed.py` at 390×844; confirm speech panel height <= 530px, default drawer <= 450px, no content clipping, and adequate touch targets.

## Component recipes

- **Drawer:** `mb-head` + `mb-body` containing a `mb-tiles` grid, optional `mb-compact-grid`, and quiet footer.
- **Settings:** uppercase `mb-kicker`, contiguous `mb-settings-group` with `mb-setting` rows, compact inline status, secondary footer action.
- **Filtering:** a grouped on/off row, explicit on-device status, 2-column action grid, optional selection preview and a reason chooser.
- **Player:** full-screen transcript with unobstructed reading area and small fixed bottom audio strip. No marketing/hero layout.

## Visual review before shipping

Does the default drawer fit on an iPhone without scrolling? Are routine settings editable in one touch? Is an icon used consistently? Are actionable controls at least 44px high? Can the user determine whether the on-device model is loaded? Is the selected phrase and its learning reason visible? Are warnings honest? Does the screen remain usable with a keyboard and VoiceOver?
