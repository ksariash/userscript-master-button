import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pipeline, env } from '@huggingface/transformers';
import { NLIRuntime } from '../../src/platform/nli-runtime.mjs';
import { FEATURE_MODEL, DESCRIPTIONS, featureInput } from '../../src/core/language-features.mjs';
const backend = process.env.MB_RUNTIME || 'cpu';
const ort = backend === 'wasm' ? await import('onnxruntime-web/webgpu') : await import('onnxruntime-node');
const root = resolve('.cache/model', FEATURE_MODEL.id, FEATURE_MODEL.revision), json = name => readFile(`${root}/${name}`, 'utf8').then(JSON.parse);
if (backend === 'wasm') {
  const dist = resolve('node_modules/onnxruntime-web/dist');
  ort.env.wasm.wasmPaths = { mjs: pathToFileURL(`${dist}/ort-wasm-simd-threaded.asyncify.mjs`).href, wasm: pathToFileURL(`${dist}/ort-wasm-simd-threaded.asyncify.wasm`).href }; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
}
const start = Date.now(), session = await ort.InferenceSession.create(new Uint8Array(await readFile(`${root}/onnx/model_quantized.onnx`)), { executionProviders: [backend], intraOpNumThreads: 2, interOpNumThreads: 1 });
const direct = new NLIRuntime({ tokenizerJSON: await json('tokenizer.json'), tokenizerConfig: await json('tokenizer_config.json'), config: await json('config.json'), session, Tensor: ort.Tensor });
const startupMs = Date.now() - start;
env.cacheDir = resolve('.cache/model');
const reference = await pipeline('zero-shot-classification', FEATURE_MODEL.id, { revision: FEATURE_MODEL.revision, dtype: FEATURE_MODEL.dtype, device: 'cpu', local_files_only: true, session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } });
const inputs = [
  'The harbor returned to public use after years of repair.',
  'The writer quoted the advertisement to explain its misleading promise.',
  'Related stories: six books to buy about the same subject.',
  'Translations of this essay into other languages: Korean, Spanish and French.',
];
const rows = [];
for (const originalText of inputs) {
  const input = featureInput({ originalText, tag: 'p', role: 'content' }), scores = await direct.scores(input, DESCRIPTIONS), ref = await reference(input, DESCRIPTIONS, { hypothesis_template: 'This text is {}.', multi_label: true }), map = new Map(ref.labels.map((label, i) => [label, ref.scores[i]]));
  const refTokens = Number(reference.tokenizer(input).input_ids.data.length), tokens = direct.tokenCount(input), maxDelta = Math.max(...scores.map((score, i) => Math.abs(score - map.get(DESCRIPTIONS[i]))));
  rows.push({ tokens, referenceTokens: refTokens, maxDelta, passed: tokens === refTokens && maxDelta < 1e-4 });
}
const report = { date: new Date().toISOString(), validationClass: `Actual ${backend} ONNX execution in Node; no browser or physical Safari claim. Compares logits-derived features, not accuracy.`, model: FEATURE_MODEL, runtime: backend, startupMs, rows, passed: rows.every(row => row.passed), processPeakRssBytes: process.resourceUsage().maxRSS * 1024 };
await writeFile(`experiments/evaluation/results-runtime-parity-${backend}.json`, JSON.stringify(report, null, 2) + '\n');
await direct.dispose(); await reference.dispose(); console.log(JSON.stringify(report)); if (!report.passed) process.exitCode = 1;
