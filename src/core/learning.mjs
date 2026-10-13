/** Explicit local example retrieval, not base-model weight fine-tuning. */
export function retrieveExamples(text, examples, { site, enabled = true, limit = 4 } = {}) {
  if (!enabled || !Array.isArray(examples)) return [];
  const words = t => new Set(t.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []), a = words(text);
  const ranked = examples.filter(e => e?.enabled !== false && e.site === site && ['ARTICLE', 'NUISANCE'].includes(e.label)).map(e => {
    const b = words(e.text), union = new Set([...a, ...b]).size, intersection = [...a].filter(x => b.has(x)).length;
    return { e, similarity: union ? intersection / union : 0 };
  }).sort((x, y) => y.similarity - x.similarity);
  // Keep examples remain available even if the nuisance vocabulary dominates.
  const keep = ranked.find(x => x.e.label === 'ARTICLE');
  const result = ranked.slice(0, limit).map(x => x.e);
  if (keep && !result.includes(keep.e)) result[result.length ? result.length - 1 : 0] = keep.e;
  return result;
}
