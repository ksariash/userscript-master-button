import Defuddle from 'defuddle';
import{attachLinkContext}from'./link-context.mjs';
const OWN = '[data-master-button]';
const OMIT = 'script,style,noscript,template,svg,canvas,textarea,input,select,button,[hidden],[aria-hidden="true"]';
const OWNER = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,td,th,div,section,article,main,nav,aside,header,footer,body';
const norm = t => t.replace(/\s+/g, ' ').trim();
export function sourceRole(owner) {
  const context = owner.closest('aside,nav,footer,header,[role="banner"],[role="navigation"]');
  if (!context) return 'content';
  let role = context.getAttribute('role') === 'navigation' ? 'nav' : context.getAttribute('role') === 'banner' ? 'header' : context.tagName.toLowerCase();
  // An article's own heading/outline is not the site's navigation chrome.
  if (['header','nav','footer'].includes(role) && context.closest('article,[role="article"],main,[role="main"]')) role = `article-${role}`;
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
    const firstListRun = new WeakMap();
    for (const r of runs) { const item=r.owner.closest('li');if(item&&!firstListRun.has(item))firstListRun.set(item,r); }
    const records = runs.map((r, index) => {
      let id = this.ids.get(r.nodes[0]); if (!id) { id = `${this.documentId}:source:${++this.counter}`; this.ids.set(r.nodes[0], id); }
      const range = doc.createRange(); range.setStart(r.nodes[0], 0); range.setEnd(r.nodes.at(-1), r.nodes.at(-1).length);
      const text = r.parts.join('').trim();
      const anchors = [...new Set(r.nodes.map(n => n.parentElement.closest('a')).filter(Boolean))];
      const sameDocumentLinks = anchors.filter(a => { try { const u = new URL(a.getAttribute('href'), doc.URL), here = new URL(doc.URL); return u.origin === here.origin && u.pathname === here.pathname && u.search === here.search && !!u.hash; } catch { return false; } }).length;
      let groupHeading = '';
      for (let group = r.owner.parentElement; group && !group.matches('article,main,body'); group = group.parentElement) { const heading = [...group.querySelectorAll('h1,h2,h3,h4')].reverse().find(h => h !== r.owner && (h.compareDocumentPosition(r.owner) & 4)); if (heading) { groupHeading = heading.textContent.trim(); break; } }
      const inArticle = !!r.owner.closest('article,[role="article"],main,[role="main"]');
      let nearbyControls = [];
      for (let group = r.owner.parentElement, depth = 0; group && depth < 2 && !group.matches('article,main,body'); group = group.parentElement, depth++) {
        const types = [...group.querySelectorAll('input:not([type=hidden]),select')].slice(0,8).map(n => n.tagName === 'SELECT' ? 'selection control' : `${n.type || 'text'} input`);
        if (types.length) { nearbyControls = types; break; }
      }
      const item=r.owner.closest('li'),list=item?.parentElement;let listMarker='';
      if(item&&firstListRun.get(item)===r&&list?.matches('ul,ol')){
        if(list.tagName==='UL')listMarker='•';else{const items=[...list.children].filter(n=>n.tagName==='LI');let ordinal=list.hasAttribute('start')?list.start:list.reversed?items.length:1;
          for(const sibling of items){if(sibling.hasAttribute('value')){const value=Number.parseInt(sibling.getAttribute('value'),10);if(Number.isFinite(value))ordinal=value;}if(sibling===item){listMarker=`${ordinal}.`;break;}ordinal+=list.reversed?-1:1;}}
      }
      return { id, index, articleTitle:this.title,originalText: text, tag: r.owner.tagName.toLowerCase(), role: sourceRole(r.owner),listMarker,quoted:!!r.owner.closest('blockquote'),
        sameDocumentLinkRatio: anchors.length ? sameDocumentLinks / anchors.length : 0, inArticle, groupHeading, nearbyControls,
        linkCharacters: r.nodes.filter(n => n.parentElement.closest('a')).reduce((n, t) => n + t.data.length, 0),
        source: { node: r.owner, nodes: r.nodes, range }, sourceState: 'original',
        extraction: this.extraction.get(norm(text)) || { member: false, mapping: 'pending' } };
    }).filter(p => p.originalText);
    return attachLinkContext(records);
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
    this.title = result.title || this.document.title;for(const p of records)p.articleTitle=this.title;
    return records;
  }
}

/** Observe host changes only; coalesce insertions and retire leases on URL navigation. */
export class PageLifecycle {
  constructor(document, inventory, { onScan, onNavigate, onError=()=>{}, delay=180, extractDelay=1000 } = {}) {
    Object.assign(this,{document,inventory,onScan,onNavigate,onError,delay,extractDelay});this.url=document.URL;this.version=0;this.stopped=false;this.running=false;
    const win=document.defaultView;
    this.observer=new win.MutationObserver(list=>{if(list.some(m=>!m.target.parentElement?.closest(OWN)&&!m.target.closest?.(OWN)&&(m.type==='characterData'||m.type==='attributes'||[...m.addedNodes,...m.removedNodes].some(n=>!n.matches?.(OWN)))))this.schedule();});
    this.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','id','role','hidden','aria-hidden','href','type']});
    this.navigate=()=>this.checkURL();win.addEventListener('popstate',this.navigate);win.addEventListener('hashchange',this.navigate);
    this.poll=win.setInterval(()=>{if(!document.hidden)this.checkURL();},1000);
  }
  checkURL(){
    if(this.stopped)return true;if(this.document.URL===this.url)return false;
    const previous=new URL(this.url),next=new URL(this.document.URL);this.url=this.document.URL;
    if(previous.origin!==next.origin||previous.pathname!==next.pathname||previous.search!==next.search||/^#(?:!|\/)/.test(next.hash)){this.stop();this.onNavigate?.();return true;}return false;
  }
  schedule(){
    if(this.stopped)return;this.version++;clearTimeout(this.extractTimer);
    // A trailing debounce starves indefinitely on active feeds. One timer owns each burst.
    if(this.timer==null)this.timer=setTimeout(()=>this.flush(),this.delay);
  }
  async flush(){
    this.timer=null;if(this.checkURL())return;if(this.running){this.rescan=true;return;}this.running=true;const version=this.version;
    try{
      const records=await this.inventory.scan();if(this.checkURL()||version!==this.version)return;
      this.onScan(records);if(this.stopped)return;
      this.extractTimer=setTimeout(()=>this.extract(records,version),this.extractDelay);
    }catch{if(!this.stopped)this.onError('Page refresh failed. The previous original text remains available; the next page change will retry.');}
    finally{this.running=false;if(!this.stopped&&(this.rescan||version!==this.version)){this.rescan=false;this.schedule();}}
  }
  async extract(records,version){
    if(this.checkURL()||version!==this.version)return;
    try{const result=await this.inventory.extract(records);if(this.checkURL()||version!==this.version)return;this.onScan(result);this.onError('');}
    catch{if(this.checkURL()||version!==this.version)return;this.inventory.extraction?.clear();this.onScan(records.map(p=>({...p,extraction:{member:false,mapping:'Extraction unavailable · original text preserved'}})));this.onError('Extraction refresh failed. Original text is preserved for manual review; the next page change will retry.');}
  }
  stop(){
    this.stopped=true;this.observer.disconnect();clearTimeout(this.timer);clearTimeout(this.extractTimer);clearInterval(this.poll);this.timer=null;
    this.document.defaultView.removeEventListener('popstate',this.navigate);this.document.defaultView.removeEventListener('hashchange',this.navigate);
  }
}
