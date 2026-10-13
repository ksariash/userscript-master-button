/** All consumers resolve inclusion here. Extraction membership never deletes prose. */
export class DecisionStore {
  constructor(passages = [], { documentId = 'review-document', site = 'example.org' } = {}) {
    this.documentId = documentId; this.site = site;
    this.sequenceRevision = 0; this.viewRevision = 0; this.automatic = true;
    this.records = new Map(passages.map(p => [p.id, this.record(p)]));
    this.examples = new Map(); this.removedExampleIds = new Set(); this.history = []; this.listeners = new Set(); this.nextCommand = 0;
    this.readingIds = null; this.fingerprint = this.signature();
  }
  record(p) { return { revision: 0, evidenceRevision: 0, scope: 'page', correction: null, automatic: null, rule: null, ...p }; }
  resolve(id) {
    const p = this.records.get(id); if (!p) throw new Error('Unknown passage');
    if (p.correction) return { included: p.correction.label === 'ARTICLE', origin: 'correction', reason: p.correction.label === 'ARTICLE' ? 'You kept this passage.' : 'You skipped this passage.' };
    if (p.rule?.enabled) return { included: p.rule.label === 'ARTICLE', origin: 'rule', reason: p.rule.reason };
    if (this.automatic && p.automatic?.label === 'NUISANCE' && p.automatic.validatedExclusion === true)
      return { included: false, origin: 'model', reason: p.automatic.reason };
    return { included: true, origin: p.automatic?.label === 'ARTICLE' ? 'model' : 'default', reason: !this.automatic ? 'Automatic filtering is off.' : p.automatic?.label === 'NUISANCE'
      ? 'Model suggests a nuisance; this configuration has not met the exclusion benchmark, so it stays included.'
      : p.automatic?.reason || 'Uncertain or unavailable classification preserves the original text.' };
  }
  reading() {
    const ids = this.readingIds || [...this.records.values()].filter(p => p.scope === 'page').map(p => p.id);
    return ids.map(id => this.records.get(id)).filter(Boolean);
  }
  signature() { return JSON.stringify(this.reading().filter(p => this.resolve(p.id).included).map(p => [p.id, p.revision, p.originalText])); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  changed(id, kind = 'decision') {
    const signature = this.signature(), sequenceChanged = signature !== this.fingerprint;
    if (sequenceChanged) { this.sequenceRevision++; this.fingerprint = signature; }
    this.viewRevision++;
    for (const f of this.listeners) f({ id, kind, revision: this.sequenceRevision, viewRevision: this.viewRevision, sequenceChanged });
  }
  correct(id, label, { teach = false } = {}) {
    if (!['ARTICLE', 'NUISANCE'].includes(label)) throw new Error('Invalid correction');
    const p = this.records.get(id); if (!p) throw new Error('Unknown passage');
    const previous = p.correction, previousExample = previous?.exampleId ? this.examples.get(previous.exampleId) : null;
    const commandId = `${this.documentId}:command:${++this.nextCommand}`;
    if (previous?.exampleId) this.examples.delete(previous.exampleId);
    // Learning is intentional, bounded, and limited to unedited site passages.
    const exampleId = teach && p.scope === 'page' && p.originalText.length <= 1200 ? commandId : null;
    const replacedExamples = [];
    if (exampleId) for (const [key, e] of this.examples) if (e.site === this.site && e.text === p.originalText) { replacedExamples.push([key, e]); this.examples.delete(key); }
    if (exampleId) this.examples.set(exampleId, { id: exampleId, site: this.site, text: p.originalText, label, sourceId: id, revision: p.revision, enabled: true });
    p.correction = { label, commandId, exampleId };
    this.history.push({ id, revision: p.revision, previous, next: p.correction, previousExample, replacedExamples });
    if (this.history.length > 100) this.history.shift();
    this.changed(id, 'correction');
    return { taught: !!exampleId };
  }
  undo() {
    let command;
    while ((command = this.history.pop())) {
      const p = this.records.get(command.id);
      // Commands and background assessments are leases on this exact wording.
      if (!p || p.revision !== command.revision || p.correction?.commandId !== command.next.commandId) continue;
      if (command.next.exampleId) this.examples.delete(command.next.exampleId);
      p.correction = command.previous; if (p.correction?.exampleId && this.removedExampleIds.has(p.correction.exampleId)) p.correction = { ...p.correction, exampleId: null };
      if (command.previous?.exampleId && command.previousExample && !this.removedExampleIds.has(command.previous.exampleId)) this.examples.set(command.previous.exampleId, command.previousExample);
      for (const [key, example] of command.replacedExamples || []) if (!this.removedExampleIds.has(key)) this.examples.set(key, example);
      this.changed(command.id, 'correction'); return true;
    }
    return false;
  }
  assess(id, assessment, { documentId, revision, evidenceRevision } = {}) {
    const p = this.records.get(id);
    if (!p || documentId !== this.documentId || revision !== p.revision || evidenceRevision !== undefined && evidenceRevision !== p.evidenceRevision) return false;
    p.automatic = { ...assessment }; this.changed(id, 'assessment'); return true;
  }
  setAutomatic(enabled) { this.automatic = !!enabled; this.changed(null); }
  setRule(id, rule, notify = true) {
    const p = this.records.get(id); if (!p) return;
    p.rule = rule && ['ARTICLE', 'NUISANCE'].includes(rule.label) && typeof rule.enabled === 'boolean'
      ? { ...rule, reason: typeof rule.reason === 'string' ? rule.reason : 'An active saved rule applies.' } : null;
    if (notify) this.changed(id);
  }
  replaceText(id, text) {
    const p = this.records.get(id); if (!p || p.originalText === text) return;
    p.originalText = text; p.revision++; p.correction = null; p.automatic = null; p.rule = null;
    this.changed(id, 'source');
  }
  sync(passages) {
    const previous = this.records, next = new Map(); let dirty = false;
    for (const p of passages) {
      const old = previous.get(p.id);
      if (!old) { next.set(p.id, this.record(p)); dirty = true; }
      else {
        const changed = old.originalText !== p.originalText;
        const evidenceChanged = ['tag','role','groupHeading','sameDocumentLinkRatio','inArticle','nearbyControls','extraction'].some(key => JSON.stringify(old[key]) !== JSON.stringify(p[key]));
        next.set(p.id, { ...old, ...p, revision: old.revision + (changed ? 1 : 0),
          evidenceRevision: old.evidenceRevision + (changed || evidenceChanged ? 1 : 0), correction: changed ? null : old.correction, automatic: changed || evidenceChanged ? null : old.automatic, rule: changed ? null : old.rule });
        dirty ||= changed || evidenceChanged;
      }
    }
    for (const p of previous.values()) if (p.scope === 'reader') next.set(p.id, p); else if (!next.has(p.id) && this.readingIds?.includes(p.id)) { next.set(p.id, { ...p, scope: 'reader', source: null, sourceState: 'source no longer available · original selected wording preserved', automatic: null, rule: null }); dirty = true; }
    dirty ||= [...previous.keys()].join('\n') !== [...next.keys()].join('\n');
    this.records = next; if (dirty) this.changed(null, 'source');
  }
  setReading(ids = null) { this.readingIds = ids; this.changed(null, 'reading'); }
  setReaderText(text, { selected = false } = {}) {
    // Exact unchanged rows retain their source identity; edited/pasted rows have none.
    const old = this.reading(), queues = new Map();
    for (const p of old) { const q = queues.get(p.originalText) || []; q.push(p); queues.set(p.originalText, q); }
    const ids = [];
    for (const [index, paragraph] of text.split(/\n\s*\n/).filter(t => t.trim()).entries()) {
      const t = paragraph.trim(), match = selected ? null : queues.get(t)?.shift();
      if (match) { ids.push(match.id); continue; }
      const id = `${this.documentId}:reader:${++this.nextCommand}:${index}`;
      this.records.set(id, this.record({ id, originalText: t, scope: 'reader', tag: 'p', index, source: null, sourceState: selected ? 'selected fragment · no full passage mapping' : 'edited or pasted · no source mapping', extraction: { member: false, mapping: 'absent' } })); ids.push(id);
    }
    for (const p of [...this.records.values()]) if (p.scope === 'reader' && !ids.includes(p.id)) this.records.delete(p.id);
    this.setReading(ids);
  }
  forgetExample(id) { this.examples.delete(id); this.removedExampleIds.add(id); for (const p of this.records.values()) if (p.correction?.exampleId === id) p.correction.exampleId = null; this.changed(null, 'learning'); }
  resetExamples() { for (const c of this.history) { if (c.previous?.exampleId) this.removedExampleIds.add(c.previous.exampleId); for (const [id] of c.replacedExamples || []) this.removedExampleIds.add(id); } for (const id of [...this.examples.keys()]) this.forgetExample(id); }
  clearCorrections() {
    for (const p of this.records.values()) { if (p.correction?.exampleId) this.examples.delete(p.correction.exampleId); p.correction = null; }
    this.history = []; this.changed(null, 'correction');
  }
  snapshot() {
    return { documentId: this.documentId, revision: this.sequenceRevision, passages: this.reading().filter(p => this.resolve(p.id).included)
      .map(p => ({ id: p.id, revision: p.revision, text: p.originalText, sourceState: p.sourceState || 'original' })) };
  }
}
export function validExamples(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(x => x && typeof x === 'object' && typeof x.site === 'string' && typeof x.text === 'string' && x.text.length <= 1200 && ['ARTICLE', 'NUISANCE'].includes(x.label));
}
