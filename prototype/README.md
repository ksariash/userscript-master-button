# Mobile design study

Open `review.html` as the self-contained interactive study; `gallery.html` compares four states. Rebuild with `npm run build:prototype` after changing `app.mjs`, `utility.css`, `page.css`, `index.html`, or the shared decision module.

Try Page correction → Skip → Reader → passage menu → Undo. A single `DecisionStore` drives source muting, matching transcript state, explicit examples, and the enabled-content snapshot. Those snapshot consumers stand in for future narration/export integration; no speech/audio/URL/site integration runs.

| View | Intended interaction |
| --- | --- |
| Launcher/menu | Two activations toggle the short list; pointer drag has a movement threshold. Drag position persistence and rotated/keyboard reachability are not implemented. |
| Page correction | One selected passage, quiet safe-margin markers, bottom Previous/Next fallback, Skip/Keep, Undo and Done. No source links are replaced. |
| Reader/player | Editorial column; separate passage-menu correction; source text remains available in gray. Compact player opens speech setup. Transport states are explicitly unconnected. |
| Why | Short excerpt/state/reason, Keep/Skip, Undo, optional in-memory explicit example, collapsed Details. No model score or live classifier claim. |
| Speech setup | Region/voice design rows and adjacent demo. Key entry is disabled; Connect/Demo clearly reports no Azure request. Voice choices are sample design data, not a fetched regional inventory. |

Query options (`view`, `theme`, `page`, `skipped`, `embed`, supported `width`/`height`) produce repeatable design states. The gallery uses 390×844 frames scaled to 70% for the desktop capture; this does not emulate iPhone Safari. Source article text and publisher branding are original authored samples.

Tokens are centralized in `utility.css`: 15px ordinary UI/12–13px supporting text, 19px/1.64 editorial reader, 44px correction targets in a reserved right margin, 260px menu, thin dividers, one quiet blue accent. Transcript occupies a flex column between a 58px navigation row and 94px player, an intended ~82% of the 844px study height; this fraction is a design calculation, not a measured physical-device result. Target collision/reachability still needs device review; do not mark that accessibility gate passed.

Screenshots are native Sites publication renders of the actual gallery, not generated artwork. The standalone cloud browser could not open the private study without a fresh login, and the local/managed preview renderer was unavailable. JSDOM validates some state transitions but does not provide visual or touch QA. Record capture sizes, scaled-frame limits, and unverified states in `screenshots/README.md`.

Before production, test real content, typography/contrast, 320px, 390×844, landscape, safe areas, browser chrome, keyboard, long excerpts/labels, large text, reduced motion, source links, focus/VoiceOver, and reader final passages. The user's aesthetic review remains the deciding gate.
