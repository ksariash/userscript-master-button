import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { parseHTML } from 'linkedom';
import { extract } from './extract.mjs';
import { CANDIDATES, loadCandidate } from './candidate.mjs';
const MODEL = { ...CANDIDATES[process.env.MB_CANDIDATE || 'smol'], promptVersion: 'block-v5', backend: 'onnxruntime-node CPU', maxInputTokens: 1100 };
const loadLocalModel = cacheDir => loadCandidate(MODEL, cacheDir);
import { DecisionStore } from '../../core/decisions.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(await readFile(join(root, 'corpus.json'), 'utf8'));
const outputPath = resolve(process.env.MB_RESULTS || join(root, `results-${process.env.MB_CANDIDATE || 'smol'}-v5-probe.json`));
const cacheDir = resolve(root, '../../.cache/model');
await mkdir(cacheDir, { recursive: true });
const cases = [], pages = [];
for (const fixture of corpus.synthetic) {
  const html = await readFile(join(root, fixture.path), 'utf8');
  const page = await extract(html, fixture.url); pages.push(page);
  for (const p of page.passages) {
    const expected = fixture.labels[p.sourceElementId];
    if (expected) cases.push({ page, p, expected, kind: 'synthetic', caseId: p.sourceElementId });
  }
}
for (const source of corpus.real) {
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Real-page capture failed: ${source.name} HTTP ${response.status}`);
  const html = await response.text();
  // Public results contain source hashes and labels, not a republication of articles.
  await mkdir(resolve(root, '../../.cache/pages'), { recursive: true });
  await writeFile(resolve(root, '../../.cache/pages', source.name + '.html'), html);
  const page = await extract(html, source.url); pages.push(page);
  const { document } = parseHTML(html);
  let selected = 0;
  for (const rule of source.selectors) {
    const elements = [...document.querySelectorAll(rule.selector)].slice(0, rule.take);
    if (elements.length === 0) throw new Error(`Label selector matched no elements: ${source.name} ${rule.selector}`);
    for (const el of elements) {
      const found = page.passages.filter(p => document.querySelector(p.sourcePath) === el);
      if (found.length !== 1) throw new Error(`Real label cannot map to one source block: ${source.name}`);
      const p = found[0];
      cases.push({ page, p, expected: rule.label, kind: 'real-page', caseId: `${source.name}:${selected++}` });
    }
  }
}
console.log(`Frozen prompt ${MODEL.promptVersion}; ${cases.length} labels; ${pages.length} pages. Loading real local model.`);
const report = { generatedAt: new Date().toISOString(), status: 'loading', model: MODEL,
  validationClass: process.env.MB_FORCE_LOAD_FAILURE === '1' ? 'deliberate real loader failure injection; no inference' : 'actual local inference, desktop Node CPU',
  corpus: { version: corpus.version, labeler: corpus.labeler, note: corpus.purpose, split: 'Predeclared probe, no tuning and no independently held-out release set' },
  environment: { platform: os.platform(), architecture: os.arch(), node: process.version, cpu: os.cpus()[0]?.model || 'CPU identity unavailable in container', threads: 2 },
  pages: pages.map(p => ({ url: p.url, htmlHash: p.htmlHash, inventoryBlocks: p.passages.length, ...p.extractionSummary })),
  rows: [], metrics: null };
const rss = () => { try { return process.memoryUsage().rss; } catch { return null; } };
const peakRss = () => { try { return process.resourceUsage().maxRSS * 1024; } catch { return null; } };
const before = rss();
const loadedFiles = new Set(); let downloadBytes = 0;
const start = performance.now();
let model;
try {
  model = await loadLocalModel(cacheDir, info => {
    if (info.status === 'done' && info.file && !loadedFiles.has(info.file)) {
      loadedFiles.add(info.file);
      console.log(`Loaded ${info.file}`);
    }
    if (info.status === 'progress' && info.file && Number.isFinite(info.total))
      downloadBytes = Math.max(downloadBytes, info.total);
  });
  report.startupMs = Math.round(performance.now() - start);
  report.status = 'ready';
  for (const c of cases) {
    const t = performance.now();
    const assessment = await model.classify(c.p, c.page.passages[c.p.index - 1]?.originalText, c.page.passages[c.p.index + 1]?.originalText);
    const store = new DecisionStore([c.p], { documentId: c.page.documentId });
    store.assess(c.p.id, assessment, { documentId: c.page.documentId, revision: 0 });
    const validRaw = ['ARTICLE', 'NUISANCE', 'UNCERTAIN'].includes(assessment.raw);
    const row = { caseId: c.caseId, kind: c.kind, expected: c.expected, suggested: assessment.label,
      rawLabel: validRaw ? assessment.raw : '(invalid output; abstained)',
      rawHash: createHash('sha256').update(assessment.raw).digest('hex'),
      inputTokens: assessment.inputTokens, latencyMs: Math.round(performance.now() - t),
      sourceId: c.p.id, textHash: c.p.textHash, extraction: c.p.extraction, included: store.resolve(c.p.id).included };
    report.rows.push(row); console.log(`${row.caseId}: expected ${row.expected}, model ${row.suggested}, ${row.latencyMs} ms`);
    // Checkpoint before the next model call; a crash must not erase observed failures.
    await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  }
  function metrics(rows) {
    const article = rows.filter(r => r.expected === 'ARTICLE');
    const nuisance = rows.filter(r => r.expected === 'NUISANCE');
    const tp = nuisance.filter(r => r.suggested === 'NUISANCE').length;
    const fp = article.filter(r => r.suggested === 'NUISANCE').length;
    return { total: rows.length, article: article.length, nuisance: nuisance.length,
      rawArticleFalseExclusions: fp, rawNuisancePrecision: tp + fp ? tp / (tp + fp) : null,
      rawNuisanceRecall: nuisance.length ? tp / nuisance.length : null,
      abstentions: rows.filter(r => r.suggested === 'UNCERTAIN').length,
      effectiveArticleFalseExclusions: rows.filter(r => r.expected === 'ARTICLE' && !r.included).length,
      effectiveNuisanceRecall: nuisance.length ? nuisance.filter(r => !r.included).length / nuisance.length : null };
  }
  report.metrics = { all: metrics(report.rows), synthetic: metrics(report.rows.filter(r => r.kind === 'synthetic')), realPages: metrics(report.rows.filter(r => r.kind === 'real-page')) };
} catch (error) {
  report.status = 'failed'; report.failure = String(error.message).slice(0, 600);
  report.failurePolicy = 'Preserve all source text; no remote inference or heuristic substitution.';
  if (!model) report.rows = cases.map(c => ({ caseId: c.caseId, kind: c.kind, expected: c.expected,
    suggested: 'UNCERTAIN', sourceId: c.p.id, textHash: c.p.textHash, included: true, latencyMs: null,
    note: 'No model inference occurred; decision defaults to inclusion.' }));
  process.exitCode = 1;
} finally {
  
  async function sizes(path) {
    let n = 0;
    for (const name of await readdir(path)) {
      const p = join(path, name); const s = await stat(p);
      n += s.isDirectory() ? await sizes(p) : s.size;
    }
    return n;
  }
  report.cacheBytes = await sizes(cacheDir);
  report.rssBeforeBytes = before;
  report.rssAfterBytes = rss();
  report.processPeakRssBytes = peakRss();
  report.memoryNote = 'Whole-process memory where accessible; null means unavailable in this restricted container. Not an iPhone measurement.';
  report.elapsedMs = Math.round(performance.now() - start);
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
  if (model) await Promise.race([model.dispose(), new Promise(r => setTimeout(r, 2000))]);
  console.log(JSON.stringify({ status: report.status, startupMs: report.startupMs, cacheBytes: report.cacheBytes, metrics: report.metrics, failure: report.failure }, null, 2));
}
