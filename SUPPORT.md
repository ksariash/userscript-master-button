# Site tools and support limits

Every adapter is best effort. No current live-site result is claimed; only URL construction/policy and authored DOM checks have run. No tool bypasses account access or fetches restricted content. Most cleanup starts with inspection and a saved selector; hiding is an explicit separate display option.

| Site/tool | Implemented behavior | Evidence / outstanding |
| --- | --- | --- |
| Any HTML page | Review, gray Skip/Keep, rules, visual picker, Why, reader, selection/edit/paste | DOM/policy tests; physical Safari, collisions, dynamic stress and CSP pending |
| Amazon | `/dp`, `/gp/product`, `/gp/aw/d` ASIN parsing; canonical regional link; camelcamelcamel route for US/UK/DE/FR/IT/ES/CA/AU | URL tests, not destination availability; Japan/India history unavailable |
| Reddit | Known app-upsell selector suggestions; saved selectors handle repeated insertions; optional reveal of already delivered CSS-blurred images/video | Source implemented; current Reddit DOM/access behavior unverified; unattributed global scroll locks are not cleared |
| X / Instagram / Facebook / LinkedIn | Contextual interruption inspection and direct delivered image/video URL picker | Source implemented; current DOM unverified; blob/DRM/restricted media unavailable |
| Facebook comments | One visible accessible native View/See/Load more-comments control | English labels only; not live-tested; no posting or account actions |
| Slashdot | Reader, accessible Older/Next link lookup, explicit search URL editing/open | Source implemented; live navigation/search unverified |
| Google Maps | Explicit destination/query/place → Apple Maps URL; query semantics preserved | URL tests; actual iPhone handoff unverified |
| Cookies | Clearly separates hiding from consent; explains native Reject / Necessary only choices | **No live-validated consent-submission adapter. Required necessary-only automation remains outstanding.** |
| Scroll locks | Utility reader lock owned/restored exactly; site helper only restores a known overlay’s explicit ownership link | Unit/DOM ownership proof only; production site-specific attribution remains outstanding |

Keep rules and exact-wording Keep memories counter broader Skip rules. Turning a rule off restores script-owned display changes. Show all temporarily restores hidden rule matches without enabling their narration/export text. Source passages remain retained for review.

URL cleaning removes a short recognized tracking list, preserves other fields/fragments, and leaves signed/tokenized URLs unchanged. Model assistance proposes parameter names for explicit review; it never applies speculative removals or navigates automatically. Its usefulness has not been evaluated. Sharing never navigates; Open is a separate explicit action.
