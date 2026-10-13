/** Own only our highlight or wrappers; never restore unrelated website styles. */
export class PageTone {
  constructor(document) {
    this.document = document; this.win = document.defaultView; this.wrappers = new Map(); this.showAll = false; this.mutedOnly = false;
    this.name = `mb-muted-${Math.random().toString(36).slice(2)}`;
    this.native = !!this.win.CSS?.highlights && !!this.win.Highlight;
    this.style = document.createElement('style'); this.style.dataset.masterButton = 'tone';
    this.style.textContent = `::highlight(${this.name}){color:#6d7773;background-color:transparent} [data-mb-tone="${this.name}"]{color:#6d7773!important} @media(prefers-color-scheme:dark){::highlight(${this.name}){color:#98aaa4} [data-mb-tone="${this.name}"]{color:#98aaa4!important}}`;
    document.head.append(this.style);
  }
  render(store) {
    const excluded = [...store.records.values()].filter(p => p.scope === 'page' && p.source && !this.showAll && (!store.resolve(p.id).included || this.mutedOnly && p.correction?.label === 'ARTICLE' && p.visualMuted));
    if (this.native) {
      this.win.CSS.highlights.set(this.name, new this.win.Highlight(...excluded.map(p => p.source.range))); return;
    }
    const nodes = new Set(excluded.flatMap(p => p.source.nodes));
    for (const [node, wrapper] of this.wrappers) if (!nodes.has(node) || !wrapper.isConnected) {
      if (wrapper.parentNode && node.parentNode === wrapper && wrapper.childNodes.length === 1) wrapper.replaceWith(node);
      else if (wrapper.isConnected) wrapper.removeAttribute('data-mb-tone');
      this.wrappers.delete(node);
    }
    for (const node of nodes) if (node.isConnected && !this.wrappers.has(node)) {
      const span = this.document.createElement('span'); span.dataset.mbTone = this.name;
      node.replaceWith(span); span.append(node); this.wrappers.set(node, span);
    }
  }
  stop() {
    if (this.native) this.win.CSS.highlights.delete(this.name);
    for (const [node, wrapper] of this.wrappers) if (wrapper.parentNode && node.parentNode === wrapper && wrapper.childNodes.length === 1) wrapper.replaceWith(node);
    this.wrappers.clear(); this.style.remove();
  }
}
