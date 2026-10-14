# Master Button

A compact Safari Userscripts utility for source-preserving reading, passage review, Azure narration and clean-link sharing.

**Experimental rebuild, `2.0.0-alpha.4`.** Review/approval gates were removed at the user’s request. Implementation continues autonomously. This is not a validated iPhone release: filtering quality still misses the target, so **automatic exclusions remain disabled**. Explicit Skip/Keep, remembered exceptions and selector rules are implemented. Physical Safari and live Azure verification remain untested.

[Install / update](INSTALL.md) · [Progress and complete requirement ledger](PROGRESS.md) · [Validation](VALIDATION.md) · [Architecture](REBUILD.md) · [Site support](SUPPORT.md)

The pipeline is **original HTML inventory → Defuddle on a detached clone → actual local NLI language model + classification head → one authoritative decision store**. Original wording and source ranges remain available when extraction omits or cannot map a block. Page controls, reader, learning, narration and exports resolve the same decisions. Uncertain/unavailable classification stays included.

Implemented source includes live passage controls and Undo, reader selection/editing, site-scoped head learning, selector preview/rules, a cancellable direct Azure queue, local MP3 encoding, transcript/audio exports, URL tools and best-effort site adapters. Presence in source is distinct from device/service verification; see the ledger for partial and unverified behavior.

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
