# Master Button

A discreet Safari utility for reading, reviewing unwanted passages, sharing clean links, and listening to articles on iPhone.

**Status: phase 0, awaiting review.** A fresh Defuddle/local-language-model experiment and a separate interactive mobile design study are available on the review branch. The first model failed nuisance recall. There is no installable replacement userscript or verified iPhone/Azure integration. See [PROGRESS.md](PROGRESS.md) for evidence and the complete remaining scope, and [REBUILD.md](REBUILD.md) for the proposed architecture and choices.

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

## Review-stage experiments

Use Node 24.19 or later. CPU binaries are included in the pinned ONNX Runtime package; the environment variable below skips its optional additional binary downloads.

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run build:prototype
npm test
npm run experiment
```

The first experiment run downloads about 97.5 MB of model/tokenizer assets from Hugging Face, then performs inference on this computer. It sends no passages to an inference service. Real-page HTML is fetched directly from two documented sources. Cached captures and model weights stay in ignored `.cache/`; public results contain source hashes, labels, and timings.

Open [prototype/review.html](prototype/review.html) for the self-contained interactive study, or [prototype/gallery.html](prototype/gallery.html) for comparable views. Speech and URL/site tools are explicitly unconnected. Model results and reproduction details are in [experiments/filtering/README.md](experiments/filtering/README.md).

## Rebuild boundaries

Rebuild from these documents. Choose an architecture and local model on evidence; the former implementation is not a template. Demonstrate filtering and a polished mobile interface before expanding the feature set. Keep unavailable or unverified capabilities explicit.

The reset is a normal commit that preserves repository history. The last implementation snapshot is commit `a9a28ea5bd75ecf1ab2f8a35e5cdbea9cf8c25aa`; recovery is possible if explicitly requested. Previous `dist/` install and update URLs are withdrawn until a new release is published. Already installed copies are not remotely uninstalled by this reset.

