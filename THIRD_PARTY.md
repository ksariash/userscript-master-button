# Third-party components

| Component | Pinned version | License / source |
| --- | --- | --- |
| Defuddle | 0.19.5 | MIT — https://github.com/kepano/defuddle |
| Hugging Face tokenizers | 0.2.0 | Apache-2.0 — https://github.com/huggingface/tokenizers.js |
| Transformers.js | 4.3.1 | Apache-2.0 — https://github.com/huggingface/transformers.js |
| ONNX Runtime Node | 1.30.0 | MIT — https://github.com/microsoft/onnxruntime |
| ONNX Runtime Web | 1.31.0-dev.20260914-8d85527a0 | MIT; JS, bundled factory and downloaded WASM are from this exact build |
| DeBERTa NLI weights | Xenova/nli-deberta-v3-xsmall @ 2a4f614a701367a02d51389039afc998faeda637 | Base cross-encoder/nli-deberta-v3-xsmall, Apache-2.0; ONNX conversion by Xenova |
| MP3 encoder | @breezystack/lamejs 1.2.7 | LGPL-3.0 — https://github.com/shijinyu/lamejs |
| Lucide icons | 1.56.0 | ISC — https://github.com/lucide-icons/lucide |
| esbuild | 0.28.1 | MIT — https://github.com/evanw/esbuild |

Browser inference uses the same tokenizer and NLI logits directly through ONNX Runtime; Transformers.js remains the native evaluation reference. It avoids the unrelated all-task/model registries. The original public registry triggered a scanner false positive; no repository protection was disabled or bypassed.

Bundled license notices are retained in generated JavaScript. Full relevant dependency license texts are in `licenses/`; original dependency source and exact package integrity are available through `package-lock.json`. The MP3 encoder remains a separate source dependency and can be replaced through `src/speech/export.mjs`; rebuild to use a modified encoder. No model weights are redistributed in this repository.

Test-only JSDOM 29.0.1 and linkedom 0.18.12 are MIT. Public-page captures are temporary evaluation inputs, never republished. Authored fixtures are repository source. No license for the whole new project is asserted beyond permissions already established by its owner.
