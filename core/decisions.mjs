/**
 * Review-stage decision contract. Views and selectors use this store; they do
 * not infer inclusion. A model exclusion requires a separately validated gate.
 * Model suggestions in this experiment have no calibrated exclusion gate.
 */
export class DecisionStore {
  constructor(passages, { documentId = 'review-document', site = 'example.org' } = {}) {
    this.documentId = documentId;
    this.site = site;
    this.sequenceRevision = 0;
    this.automatic = true;
    this.records = new Map(passages.map(p => [p.id, { revision: 0, ...p,
      correction: null, automatic: null, rule: null }]));
    this.examples = new Map();
    this.history = [];
    this.listeners = new Set();
    this.nextCommand = 0;
  }

  resolve(id) {
    const p = this.records.get(id);
    if (!p) throw new Error('Unknown passage');
    if (p.correction) return { included: p.correction.label === 'ARTICLE',
      origin: 'correction', reason: p.correction.label === 'ARTICLE' ? 'You kept this passage.' : 'You skipped this passage.' };
    if (p.rule?.enabled) return { included: p.rule.label === 'ARTICLE', origin: 'rule', reason: p.rule.reason };
    if (this.automatic && p.automatic?.label === 'NUISANCE' && p.automatic.validatedExclusion === true)
      return { included: false, origin: 'model', reason: p.automatic.reason };
    return { included: true, origin: 'default', reason: p.automatic?.label === 'NUISANCE'
      ? 'Model suggests a nuisance; exclusion is not validated, so it stays included.'
      : 'Included. Uncertain or unavailable classification preserves the original text.' };
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  changed(id) { this.sequenceRevision++; for (const f of this.listeners) f({ id, revision: this.sequenceRevision }); }

  correct(id, label, { teach = false } = {}) {
    if (!['ARTICLE', 'NUISANCE'].includes(label)) throw new Error('Invalid correction');
    const p = this.records.get(id);
    if (!p) throw new Error('Unknown passage');
    const previous = p.correction;
    const commandId = `${this.documentId}:command:${++this.nextCommand}`;
    if (previous?.exampleId) this.examples.delete(previous.exampleId);
    const exampleId = teach ? commandId : null;
    if (teach) this.examples.set(exampleId, { site: this.site, text: p.originalText, label, sourceId: id, revision: p.revision });
    p.correction = { label, commandId, exampleId };
    this.history.push({ id, revision: p.revision, previous, next: p.correction,
      previousExample: previous?.exampleId ? { site: this.site, text: p.originalText, label: previous.label, sourceId: id, revision: p.revision } : null });
    this.changed(id);
  }

  undo() {
    let command;
    while ((command = this.history.pop())) {
      const p = this.records.get(command.id);
      // A mutation retires correction commands for the old wording.
      if (!p || p.revision !== command.revision || p.correction?.commandId !== command.next.commandId) continue;
      if (command.next.exampleId) this.examples.delete(command.next.exampleId);
      p.correction = command.previous;
      if (command.previous?.exampleId && command.previousExample)
        this.examples.set(command.previous.exampleId, command.previousExample);
      this.changed(command.id);
      return true;
    }
    return false;
  }

  assess(id, assessment, { documentId, revision } = {}) {
    const p = this.records.get(id);
    if (!p || documentId !== this.documentId || revision !== p.revision) return false;
    p.automatic = { ...assessment };
    this.changed(id); // resolve still gives an explicit correction precedence.
    return true;
  }

  setAutomatic(enabled) { this.automatic = !!enabled; this.changed(null); }
  setRule(id, rule) {
    const p = this.records.get(id);
    if (!p) throw new Error('Unknown passage');
    p.rule = rule && ['ARTICLE', 'NUISANCE'].includes(rule.label) && typeof rule.enabled === 'boolean'
      ? { ...rule, reason: typeof rule.reason === 'string' ? rule.reason : 'An active saved rule applies.' } : null;
    this.changed(id);
  }
  replaceText(id, text) {
    const p = this.records.get(id);
    if (p.originalText === text) return;
    p.originalText = text; p.revision++; p.correction = null; p.automatic = null; p.rule = null;
    this.changed(id);
  }
  clearCorrections() {
    for (const p of this.records.values()) {
      if (p.correction?.exampleId) this.examples.delete(p.correction.exampleId);
      p.correction = null;
    }
    this.history = []; this.changed(null);
  }
  snapshot() {
    return { documentId: this.documentId, revision: this.sequenceRevision,
      passages: [...this.records.values()].filter(p => this.resolve(p.id).included)
        .map(p => ({ id: p.id, revision: p.revision, text: p.originalText })) };
  }
}

/** Malformed learning records must never prevent Keep/Skip. Persistence is later. */
export function validExamples(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(x => x && typeof x === 'object' && typeof x.site === 'string'
    && typeof x.text === 'string' && ['ARTICLE', 'NUISANCE'].includes(x.label));
}
