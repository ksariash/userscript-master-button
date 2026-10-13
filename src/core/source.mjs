import Defuddle from 'defuddle';
const OWN = '[data-master-button]';
const OMIT = 'script,style,noscript,template,svg,canvas,textarea,input,select,button,[hidden],[aria-hidden="true"]';
const OWNER = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,td,th,div,section,article,main,nav,aside,header,footer,body';
const norm = t => t.replace(/\s+/g, ' ').trim();
export function sourceRole(owner) {
  const context = owner.closest('aside,nav,footer,header,[role="banner"],[role="navigation"]');
  if (!context) return 'content';
  let role = context.getAttribute('role') === 'navigation' ? 'nav' : context.getAttribute('role') === 'banner' ? 'header' : context.tagName.toLowerCase();
  // An article's own heading/outline is not the site's navigation chrome.
  if (['header','nav','footer'].includes(role) && context.closest('article,[role="article"]')) role = `article-${role}`;
  return role;
}

/** Disjoint text runs around nested blocks. No ancestor/descendant double counting. */
export class SourceInventory {
  constructor(document, { documentId = globalThis.crypto?.randomUUID?.() || `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`, host = null } = {}) {
    this.document = document; this.documentId = documentId; this.host = host;
    this.ids = new WeakMap(); this.counter = 0; this.extraction = new Map(); this.title = document.title;
  }
  scan() {
    const doc = this.document, walker = doc.createTreeWalker(doc.body, 5); const runs = []; let run;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === 1) { if (node.tagName === 'BR' && !node.closest('pre')) { if (run && /^(P|LI|BLOCKQUOTE|FIGCAPTION|H[1-6])$/.test(run.owner.tagName)) run.parts.push('\n'); else run = null; } continue; }
      const el = node.parentElement;
      if (!el || el.closest(OMIT) || el.closest(OWN) ) continue;
      const owner = el.closest(OWNER) || el;
      if (!run || run.owner !== owner) { run = { owner, nodes: [], parts: [] }; runs.push(run); }
      run.nodes.push(node); run.parts.push(node.data);
    }
    const records = runs.map((r, index) => {
      let id = this.ids.get(r.nodes[0]); if (!id) { id = `${this.documentId}:source:${++this.counter}`; this.ids.set(r.nodes[0], id); }
      const range = doc.createRange(); range.setStart(r.nodes[0], 0); range.setEnd(r.nodes.at(-1), r.nodes.at(-1).length);
      const text = r.parts.join('').trim();
      const anchors = [...new Set(r.nodes.map(n => n.parentElement.closest('a')).filter(Boolean))];
      const sameDocumentLinks = anchors.filter(a => { try { const u = new URL(a.getAttribute('href'), doc.URL), here = new URL(doc.URL); return u.origin === here.origin && u.pathname === here.pathname && u.search === here.search && !!u.hash; } catch { return false; } }).length;
      let groupHeading = '';
      for (let group = r.owner.parentElement; group && !group.matches('article,main,body'); group = group.parentElement) { const heading = [...group.querySelectorAll('h1,h2,h3,h4')].reverse().find(h => h !== r.owner && (h.compareDocumentPosition(r.owner) & 4)); if (heading) { groupHeading = heading.textContent.trim(); break; } }
      const inArticle = !!r.owner.closest('article,[role="article"]');
      let nearbyControls = [];
      for (let group = r.owner.parentElement, depth = 0; group && depth < 2 && !group.matches('article,main,body'); group = group.parentElement, depth++) {
        const types = [...group.querySelectorAll('input:not([type=hidden]),select')].slice(0,8).map(n => n.tagName === 'SELECT' ? 'selection control' : `${n.type || 'text'} input`);
        if (types.length) { nearbyControls = types; break; }
      }
      return { id, index, originalText: text, tag: r.owner.tagName.toLowerCase(), role: sourceRole(r.owner),
        sameDocumentLinkRatio: anchors.length ? sameDocumentLinks / anchors.length : 0, inArticle, groupHeading, nearbyControls,
        linkCharacters: r.nodes.filter(n => n.parentElement.closest('a')).reduce((n, t) => n + t.data.length, 0),
        source: { node: r.owner, nodes: r.nodes, range }, sourceState: 'original',
        extraction: this.extraction.get(norm(text)) || { member: false, mapping: 'pending' } };
    }).filter(p => p.originalText);
    return records;
  }
  extract(records = this.scan()) {
    // Defuddle works on a detached clone. Async remote extractors are disabled.
    const clone = this.document.cloneNode(true); clone.querySelectorAll(OWN).forEach(n => n.remove());
    const result = new Defuddle(clone, { url: this.document.URL, useAsync: false, standardize: false }).parse();
    const output = clone.createElement('div'); output.innerHTML = result.content;
    clone.body.replaceChildren(output);
    const extractedText = new Set(new SourceInventory(clone, { documentId: 'detached-output' }).scan().map(p => norm(p.originalText))); const counts = new Map();
    records.forEach(p => counts.set(norm(p.originalText), (counts.get(norm(p.originalText)) || 0) + 1));
    this.extraction.clear();
    for (const p of records) {
      const t = norm(p.originalText), present = extractedText.has(t), unique = counts.get(t) === 1;
      const evidence = { member: present && unique, mapping: present ? unique ? 'exact source text in Defuddle output' : 'ambiguous duplicate · included for review' : 'not in Defuddle output · preserved' };
      this.extraction.set(t, evidence); p.extraction = evidence;
    }
    this.title = result.title || this.document.title;
    return records;
  }
}

/** Observe host changes only; coalesce insertions and retire leases on URL navigation. */
export class PageLifecycle {
  constructor(document, inventory, { onScan, onNavigate, delay = 180 } = {}) {
    this.document = document; this.inventory = inventory; this.onScan = onScan; this.onNavigate = onNavigate;
    this.url = document.URL; this.delay = delay; this.timer = null; this.extractTimer = null;
    const win = document.defaultView;
    this.observer = new win.MutationObserver(list => {
      if (list.some(m => !m.target.parentElement?.closest(OWN) && !m.target.closest?.(OWN) && (m.type === 'characterData' || m.type === 'attributes' || [...m.addedNodes, ...m.removedNodes].some(n => !n.matches?.(OWN))))) this.schedule();
    });
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class','id','role','hidden','aria-hidden','href','type'] });
    this.navigate = () => this.checkURL();
    win.addEventListener('popstate', this.navigate); win.addEventListener('hashchange', this.navigate);
    // Isolated content scripts cannot replace the page world's history reliably.
    this.poll = win.setInterval(() => { if (!document.hidden) this.checkURL(); }, 1000);
  }
  checkURL() { if (this.document.URL !== this.url) { const previous = new URL(this.url), next = new URL(this.document.URL); this.url = this.document.URL; if (previous.origin !== next.origin || previous.pathname !== next.pathname || previous.search !== next.search || /^#(?:!|\/)/.test(next.hash)) this.onNavigate?.(); } }
  schedule() {
    clearTimeout(this.timer); this.timer = setTimeout(() => {
      this.checkURL(); this.onScan(this.inventory.scan());
      clearTimeout(this.extractTimer); this.extractTimer = setTimeout(() => { this.onScan(this.inventory.extract()); }, 1000);
    }, this.delay);
  }
  stop() {
    this.observer.disconnect(); clearTimeout(this.timer); clearTimeout(this.extractTimer); clearInterval(this.poll);
    this.document.defaultView.removeEventListener('popstate', this.navigate); this.document.defaultView.removeEventListener('hashchange', this.navigate);
  }
}
