import * as ort from 'onnxruntime-web/webgpu';
import {passageEvidence} from '../core/passage-evidence.mjs';
import { NLIRuntime } from './nli-runtime.mjs';
import { modelAsset } from './model-assets.mjs';
import { MODEL_CONFIG } from '../core/model-contract.mjs';
import { DESCRIPTIONS, PASSAGE_DESCRIPTIONS, featureInput, structuralFeatures } from '../core/language-features.mjs';
const publicFetch = self.fetch.bind(self);
self.fetch = (input, options = {}) => publicFetch(input, { ...options, credentials: 'omit', referrerPolicy: 'no-referrer' });
let classifier, backend;const linkCache=new Map();
const reply = (id, data) => postMessage({ id, ...data });
self.onmessage = async event => {
  const { id, action, data } = event.data;
  try {
    if (action === 'load') {
      backend = data.backend; if (!['wasm', 'webgpu'].includes(backend)) throw new Error('Unsupported backend.');
      const cacheName = `master-button-model:${MODEL_CONFIG.revision}:${MODEL_CONFIG.dtype}`;
      let cache;
      if (self.caches) { for (const key of await caches.keys()) if (key.startsWith('master-button-model:') && key !== cacheName) await caches.delete(key); cache = await caches.open(cacheName); }
      const assets = { cache, progress: progress => postMessage({ progress }) };
      const tokenizerJSON = await modelAsset('tokenizer.json', MODEL_CONFIG, assets), tokenizerConfig = await modelAsset('tokenizer_config.json', MODEL_CONFIG, assets), config = await modelAsset('config.json', MODEL_CONFIG, assets);
      const weights = await modelAsset('onnx/model_quantized.onnx', MODEL_CONFIG, assets);
      const factory = URL.createObjectURL(new Blob([__ORT_FACTORY__], { type: 'text/javascript' }));
      ort.env.wasm.wasmPaths = { mjs: factory, wasm: __ORT_WASM_URL__ }; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
      const session = await ort.InferenceSession.create(weights, { executionProviders: [backend], graphOptimizationLevel: 'all' });
      classifier = new NLIRuntime({ tokenizerJSON, tokenizerConfig, config, session, Tensor: ort.Tensor }); reply(id, { result: { backend, model: MODEL_CONFIG.id } }); return;
    }
    if (!classifier) throw new Error('Load the local model first.');
    if (action === 'classify') {
      const { passage, previous, next } = data, input = featureInput(passage, previous, next), tokens = classifier.tokenCount(input);
      if (tokens > MODEL_CONFIG.maxInputTokens) { reply(id, { result: { features: null, inputTokens: tokens, reason: 'The complete passage exceeds bounded local context. It remains included.' } }); return; }
      const scores = await classifier.scores(input, DESCRIPTIONS), passageScores = await passageEvidence(classifier,passage,linkCache); reply(id, { result: { features: [...scores, ...structuralFeatures(passage), ...passageScores], inputTokens: tokens, model: MODEL_CONFIG.id, backend, promptVersion: MODEL_CONFIG.promptVersion } }); return;
    }
    if (action === 'url') {
      const proposals = [];
      for (const key of data.parameterNames.slice(0, 30)) {
        const scores = await classifier.scores(`URL parameter name: ${key}. Host: ${data.host}. Path: ${data.path}.`, ['analytics or advertising tracking', 'functional routing, authentication or content selection'], { hypothesisTemplate: 'This field is used for {}.', multiLabel: false }); if (scores[0] > .8) proposals.push(key);
      }
      reply(id, { result: proposals }); return;
    }
    throw new Error('Unknown local model action.');
  } catch { reply(id, { error: action === 'load' ? 'Local model could not load. This page or browser may block workers, WebAssembly, WebGPU, downloads, or storage. Manual Keep/Skip remains available.' : 'Local inference failed. The passage remains included; retry from Model settings.' }); }
};
