# Master Button

A discreet Safari utility for reading, reviewing unwanted passages, sharing clean links, and listening to articles on iPhone.

**Status: requirements only.** The previous implementation was withdrawn because filtering and visual quality did not meet the user's expectations. This repository is the specification for a fresh build. It currently contains no executable code, installable userscript, dependencies, tests, or CI workflows.

## Start here

Use [START_HERE.md](START_HERE.md) to begin a new implementation session. Read [AGENTS.md](AGENTS.md) before proposing changes.

| Document | Purpose |
| --- | --- |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Product behavior, priorities, and unresolved feasibility choices |
| [ALGORITHM_GUIDE.md](ALGORITHM_GUIDE.md) | Shared decisions, extraction, local inference, learning, and code comments |
| [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) | Visual direction, compact interactions, and reusable components |
| [DESIGN_REFERENCES.md](DESIGN_REFERENCES.md) | Primary sources and the design principles derived from them |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Functional, visual, model, and device validation gates |

The central workflow is **webpage HTML → Defuddle extraction → local language-model block classification → original article content with reversible nuisance exclusions**. The original page and transcript must share the same correction logic. Tapping Skip grays a passage in place; Keep restores it.

## Rebuild boundaries

Rebuild from these documents. Choose an architecture and local model on evidence; the former implementation is not a template. Demonstrate filtering and a polished mobile interface before expanding the feature set. Keep unavailable or unverified capabilities explicit.

The reset is a normal commit that preserves repository history. The last implementation snapshot is commit `a9a28ea5bd75ecf1ab2f8a35e5cdbea9cf8c25aa`; recovery is possible if explicitly requested. Previous `dist/` install and update URLs are withdrawn until a new release is published. Already installed copies are not remotely uninstalled by this reset.
