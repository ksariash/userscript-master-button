const OWN = '[data-master-button]';
export function inspectSelector(document, selector) {
  if (typeof selector !== 'string' || !selector.trim() || selector.length > 500) return { matches: [], blocked: true, warnings: ['Enter a CSS selector.'] };
  let matches; try { matches = [...document.querySelectorAll(selector)]; } catch { return { matches: [], blocked: true, warnings: ['Invalid CSS selector.'] }; }
  const pageText = document.body.textContent.trim().length;
  const blocked = matches.some(el => el.matches('html,body,main,article') || el.closest(OWN) || el.querySelector(OWN) || el.querySelector('main,article') || pageText > 400 && el.textContent.trim().length / pageText > .8);
  const warnings = [];
  if (blocked) warnings.push('Protect the document, entire article, and utility. Choose a smaller element.');
  if (matches.length > 30) warnings.push('Broad rule: more than 30 matches. Refine the selector.');
  if (/nth-(child|of-type)/.test(selector)) warnings.push('Positional selector may change after a page update.');
  if (!matches.length) warnings.push('No matches on this page.');
  return { matches, blocked: blocked || matches.length > 30 || !matches.length, warnings };
}
export function selectorFor(element, document) {
  const escape = s => document.defaultView.CSS?.escape ? document.defaultView.CSS.escape(s) : s.replace(/[^a-z0-9_-]/gi, c => `\\${c}`);
  if (element.id && document.querySelectorAll(`#${escape(element.id)}`).length === 1) return `#${escape(element.id)}`;
  const tag = element.tagName.toLowerCase(), classes = [...element.classList].filter(s => /^[a-z][\w-]{1,70}$/i.test(s)).slice(0, 2);
  if (classes.length) return tag + classes.map(c => '.' + escape(c)).join('');
  const parent = element.parentElement;
  return parent ? `${selectorFor(parent, document)}>${tag}:nth-of-type(${[...parent.children].filter(e => e.tagName === element.tagName).indexOf(element) + 1})` : tag;
}
export function applyRules(store, document, rules) {
  const inspected = (rules || []).filter(r => r.enabled).sort((a,b) => Number(b.label === 'ARTICLE') - Number(a.label === 'ARTICLE')).map(r => ({ ...r, ...inspectSelector(document, r.selector) })).filter(r => !r.blocked);
  for (const p of store.records.values()) {
    const match = p.scope === 'page' && inspected.find(r => r.matches.some(el => el === p.source?.node || el.contains(p.source?.node)));
    store.setRule(p.id, match ? { id: match.id, label: match.label, enabled: true, reason: `Saved ${match.label === 'ARTICLE' ? 'Keep' : 'Skip'} rule: ${match.selector}` } : null, false);
  }
  store.changed(null, 'rules');
}
export class SelectorPicker {
  constructor(document, { onSelect } = {}) {
    this.document = document; this.onSelect = onSelect; this.active = false; this.owned = new Map();
    this.intercept = event => {
      if (event.target.closest?.(OWN)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.type === 'click') { this.select(selectorFor(event.target, document)); this.endCapture(); }
    };
  }
  start() { this.active = true; for (const type of ['pointerdown', 'pointerup', 'click']) this.document.addEventListener(type, this.intercept, true); }
  endCapture() { this.active = false; for (const type of ['pointerdown', 'pointerup', 'click']) this.document.removeEventListener(type, this.intercept, true); }
  select(selector) { this.cancelPreview(); this.selector = selector; this.inspection = inspectSelector(this.document, selector); this.onSelect?.(this.inspection, selector); return this.inspection; }
  preview() {
    this.cancelPreview(); if (!this.inspection || this.inspection.blocked) return false;
    for (const el of this.inspection.matches) {
      const properties = ['outline', 'outline-offset']; const saved = {};
      for (const name of properties) saved[name] = { value: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name) };
      this.owned.set(el, saved); el.style.setProperty('outline', '2px solid #315f91', 'important'); el.style.setProperty('outline-offset', '3px', 'important');
    }
    return true;
  }
  cancelPreview() {
    for (const [el, saved] of this.owned) for (const [name, old] of Object.entries(saved)) {
      const ours = name === 'outline' ? '2px solid #315f91' : '3px';
      // The website may have changed its style after the preview started.
      const actual = el.style.getPropertyValue(name).replace('rgb(49, 95, 145)', '#315f91');
      if (actual === ours && el.style.getPropertyPriority(name) === 'important') old.value ? el.style.setProperty(name, old.value, old.priority) : el.style.removeProperty(name);
    }
    this.owned.clear();
  }
  review(index) { this.inspection?.matches[index]?.scrollIntoView({ block: 'center', behavior: 'auto' }); }
  stop() { this.endCapture(); this.cancelPreview(); }
}
