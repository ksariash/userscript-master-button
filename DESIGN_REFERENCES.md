# Design references and derived rules

Researched 2026-10-13 using official product documentation, public product visuals, and source code. These references inform general patterns. Their assets, branding, exact layouts, and native implementation details are not a template to copy.

## Similar products

| Reference | What was observed | Rule derived for Master Button |
| --- | --- | --- |
| [Obsidian Web Clipper](https://obsidian.md/clipper), [capture interface](https://obsidian.md/help/web-clipper/capture) | Documented header/properties/content/footer hierarchy; inspected popup HTML/CSS uses compact action icons, flexible content space, separators, and a primary footer action | Keep content dominant; group controls by task and reveal advanced properties on demand |
| Obsidian [Reader](https://obsidian.md/help/web-clipper/reader) and [Highlighter](https://obsidian.md/help/web-clipper/highlight) | Reader preserves article formatting and offers typography/width/appearance choices; highlighting works on both the original page and Reader | Offer a comfortable reading surface and consistent contextual actions across both views |
| [Readwise Reader](https://readwise.io/read), [annotation documentation](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes) | Inspected official mobile and annotation visuals: restrained dark surfaces, clear type hierarchy, compact symbols, and contextual annotation. Documentation describes original-page/Reader synchronization and admits source-matching failures | Corrections belong near passages; maintain one meaning across views and surface mapping uncertainty gracefully |

Obsidian source inspected: [popup HTML](https://github.com/obsidianmd/obsidian-clipper/blob/main/src/popup.html), [popup styles](https://github.com/obsidianmd/obsidian-clipper/blob/main/src/styles/popup.scss), and [mobile styles](https://github.com/obsidianmd/obsidian-clipper/blob/main/src/styles/mobile.scss). Its native extension UI is evidence of composition, not proof that identical dimensions or behavior suit an injected userscript.

Readwise visuals were public images on its official product page, including mobile reading/navigation and highlighted text/figures. Annotation-bar behavior was reviewed in its documentation. This was a visual/documentation review, not a signed-in usability test.

## Platform guidance

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) separates control/navigation materials from content and recommends restrained use of glass effects. Our application: subtle depth on one functional surface; opaque, readable article/forms; no nested glass cards.
- [Apple HIG: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) emphasizes deliberate command selection, recognizable controls, and logical grouping. Our application: prioritize reading, reviewing, and sharing; move occasional configuration out of the main reading area.

These are design principles. Browser CSS does not provide the complete native Apple material system, and our proposed sizes/colors in FRONTEND_GUIDE are project choices.

## Filtering reference

[Defuddle official repository/documentation](https://github.com/kepano/defuddle) is the requested extraction foundation. Extraction improves article structure; it does not by itself prove a local semantic classifier works or solve mapping back to the original DOM. Validate both separately.

## Synthesis

Adopt typography-led hierarchy, short control groups, one focused contextual action surface, comfortable reading space, and clear reversible annotations. Avoid a dashboard of every feature, large diagnostic panels, excessive rounded containers, and icons without understandable meaning. Validate this interpretation through the fresh prototype rather than assuming familiarity with a reference guarantees a beautiful result.

