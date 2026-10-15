# Master Button

A compact Safari Userscripts utility for source-preserving reading, passage review, Azure narration and clean-link sharing.

**Experimental rebuild, `2.0.0-alpha.6`.** The user removed review gates. A conservative local-model policy now excludes some evaluated interruptions; the broad head remains disabled because it deletes legitimate references. The overall recall target is still unmet. Physical iPhone and live Azure verification remain untested. Key setup now targets one script-free HTML page (publication pending), with a native migration link from the sandboxed raw document; recurring root scroll locks and blob-backed X media are covered by authored regression checks.

On the requested BBC capture, Read selects 64 original article-region passages. Actual WASM inference excludes 12 related-book intro/link rows and three promotions, preserving all 41 labeled article rows; eight nuisance rows remain included. Full-page Review retains all 195 source rows. [Evidence and limits](experiments/evaluation/README.md).

[Install / update](INSTALL.md) · [Progress and complete requirement ledger](PROGRESS.md) · [Validation](VALIDATION.md) · [Architecture](REBUILD.md) · [Site support](SUPPORT.md)

The pipeline is **original HTML inventory → Defuddle on a detached clone → actual local NLI language model + classification head → one authoritative decision store**. Original wording and source ranges remain available when extraction omits or cannot map a block. Page controls, reader, learning, narration and exports resolve the same decisions. Uncertain/unavailable classification stays included.

Implemented source includes passage controls, bulk tap/range selection, Skip before/after with one-step batch Undo, reader selection/editing, site-scoped head learning, selector preview/rules, a cancellable direct Azure queue, local MP3 encoding, transcript/audio exports, URL tools and best-effort site adapters. Presence in source is distinct from device/service verification; see the ledger for partial and unverified behavior.

## Run locally

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm test
npm run build
npm run build:prototype
node scripts/build-implementation-prototype.mjs
```

The single generated script and matching update metadata are under `dist/`. The deterministic build manifest records their hash and dependency versions.

[Original design study](prototype/review.html) and [implementation preview](prototype/implementation.html) are separate from model evaluation. The implementation preview uses the production UI/core with mock extension storage and disconnected model/Azure integration. A gallery contains independent comparison frames; use one study to try synchronized corrections.

[Actual model experiments](experiments/evaluation/README.md) include rejected configurations and author-labeled public-page/fixture results. No model is mocked in those evaluations. Public weights and temporary HTML captures stay ignored; article prose is not republished. The frozen base language model has no weight fine-tuning. Explicit corrections can train the small classification head with real gradient updates.

## Project instructions

Read [AGENTS.md](AGENTS.md), [REQUIREMENTS.md](REQUIREMENTS.md), [ALGORITHM_GUIDE.md](ALGORITHM_GUIDE.md), [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md), [DESIGN_REFERENCES.md](DESIGN_REFERENCES.md) and [ACCEPTANCE.md](ACCEPTANCE.md). The rejected historical implementation was not retrieved or reused. No stable/full-product completion or green platform/service claim is made by this alpha.
