import { amazonProduct, appleMapsURL, validateURL } from './urls.mjs';
import {OwnedStyles} from './owned-styles.mjs';
import {appNags,pageRoots,nagSite,otherDialogOpen} from './nags.mjs';
import {discoverMedia} from './media.mjs';
const SOCIAL = /(^|\.)(x.com|twitter.com|instagram.com|facebook.com|linkedin.com)$/;
export function siteActions(url) {
  const u = new URL(url), actions = [];
  if (/(^|\.)amazon\.[a-z.]+$/.test(u.hostname)) {
    const product = amazonProduct(url); actions.push({id:'amazon-copy',label:'Copy product link',enabled:!!product,url:product?.canonical});
    actions.push({id:'amazon-history',label:'Price history',enabled:!!product?.priceHistory,url:product?.priceHistory,reason:!product?'Open a product first.':'This Amazon region has no supported route.'});
  }
  if (/(^|\.)reddit.com$/.test(u.hostname)) actions.push({id:'reddit-prompts',label:'Remove app nags',enabled:true},{id:'media',label:'Browse media',enabled:true},{id:'reddit-reveal',label:'Reveal delivered media',enabled:true});
  if (SOCIAL.test(u.hostname)) actions.push({id:'social-clean',label:'Remove app nags',enabled:true},{id:'media',label:'Browse media',enabled:true});
  if (/(^|\.)facebook.com$/.test(u.hostname)) actions.push({id:'comments',label:'More comments',enabled:true});
  if (/(^|\.)slashdot.org$/.test(u.hostname)) actions.push({id:'slashdot-clean',label:'Clean stories',enabled:true},{id:'slashdot-older',label:'Older stories',enabled:true},{id:'slashdot-search',label:'Search Slashdot',enabled:true});
  const maps = appleMapsURL(url); if (maps) actions.push({id:'apple-maps',label:'Open destination in Apple Maps',url:maps,enabled:true});
  return actions;
}
export function nuisanceCandidates(document, host) {
  // Suggestions require user inspection and Save; native dialogs are never erased silently.
  const selectors = /reddit.com$/.test(host) ? ['shreddit-experience-tree[experiencename*="AppUpsell"]','[data-testid="app-upsell"]','[data-testid="xpromo"]'] :
    /instagram.com$/.test(host) ? ['[role="dialog"]'] : /facebook.com$/.test(host) ? ['[role="dialog"]'] : /linkedin.com$/.test(host) ? ['.authwall','[data-test-id="join-form"]'] : ['[data-testid="BottomBar"]'];
  return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(n=>!n.closest('[data-master-button]')).map(node=>({node,selector,excerpt:node.textContent.trim().slice(0,180)})));
}
export class SiteUtilities {
  constructor(document,{store=null,onState=()=>{}}={}) {
    this.document=document;this.store=store;this.onState=onState;this.owned=new Map();this.locks=new Map();this.styles=new OwnedStyles();this.removedClasses=new Map();this.cleanupEnabled=false;this.nagNodes=new Set();this.count=0;this.roots=[];
    this.unsubscribe=store?.subscribe(event=>{this.restoreKept();if(event.kind==='correction'&&this.cleanupEnabled){clearTimeout(this.timer);this.timer=setTimeout(()=>this.cleanNags(),100);}});
  }
  hasKeep(node){return this.store&&[...this.store.records.values()].some(p=>p.correction?.label==='ARTICLE'&&p.source?.nodes?.some(n=>node.contains(n)));}
  restoreKept(){let changed=false;for(const node of [...this.nagNodes])if(this.hasKeep(node)){this.restoreNode(node);this.nagNodes.delete(node);changed=true;}this.releaseLocksIfNeeded();if(changed)this.sync();}
  startCleanup(){if(!nagSite(new URL(this.document.URL).hostname))return 0;this.cleanupEnabled=true;const count=this.cleanNags();this.observe();return count;}
  observe(){
    const roots=pageRoots(this.document);for(const root of roots)if(!this.roots.includes(root)){this.roots.push(root);this.observer||=new this.document.defaultView.MutationObserver(records=>{if(!this.cleanupEnabled||!records.some(m=>!m.target.closest?.('[data-master-button]')))return;clearTimeout(this.timer);this.timer=setTimeout(()=>{this.cleanNags();this.observe();},100);});this.observer.observe(root===this.document?this.document.body:root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','open','aria-hidden']});}
  }
  cleanNags(){
    let added=0;const nodes=appNags(this.document);for(const node of nodes){if(this.hasKeep(node))continue;const old=this.owned.get(node);if(!old){this.hideOverlay(node);this.nagNodes.add(node);this.count++;added++;}else if(node.style.getPropertyValue('display')!=='none')node.style.setProperty('display','none','important');}
    this.releaseLocksIfNeeded();if(this.nagNodes.size)this.restoreNagScroll();this.sync();return added;
  }
  sync(){this.store?.setSiteExclusions([...this.owned.keys()].filter(node=>!this.owned.get(node).reveal));this.onState({enabled:this.cleanupEnabled,count:this.count});}
  restoreNagScroll(){
    const nodes=[...this.nagNodes];if(!nodes.length||otherDialogOpen(this.document,nodes))return;
    for(const el of [this.document.body,this.document.documentElement]){
      // Release only while a positively identified app nag is suppressed and no other modal is active.
      for(const name of ['overflow','overflow-y'])if(['hidden','clip'].includes(this.document.defaultView.getComputedStyle(el).getPropertyValue(name)))this.styles.set(el,name,'auto');
      if(/(^|\.)reddit\.com$/.test(new URL(this.document.URL).hostname))for(const cls of ['rpl-scroll-lock','scroll-is-blocked'])if(el.classList.contains(cls)){const saved=this.removedClasses.get(el)||new Set();saved.add(cls);this.removedClasses.set(el,saved);el.classList.remove(cls);}
    }
  }
  releaseLocksIfNeeded(){if(!this.nagNodes.size||otherDialogOpen(this.document,[...this.nagNodes])){this.styles.clear();for(const [el,classes] of this.removedClasses)for(const cls of classes)el.classList.add(cls);this.removedClasses.clear();}}
  restoreNode(node){const old=this.owned.get(node);if(!old)return;if(node.style.getPropertyValue('display')==='none'&&node.style.getPropertyPriority('display')==='important')old.value?node.style.setProperty('display',old.value,old.priority):node.style.removeProperty('display');if(old.modal){try{node.showModal?.();}catch{node.setAttribute('open','');}}this.owned.delete(node);}

  hideOverlay(node,{ restoreKnownLock=false }={}) {
    if (!node || node.matches('html,body,article,main') || node.closest('[data-master-button]') || node.querySelector('main,article')) throw new Error('Choose a nuisance overlay, not the page or article.');
    if (!this.owned.has(node)) this.owned.set(node,{value:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display'),modal:node.tagName==='DIALOG'&&node.hasAttribute('open')}); if(node.tagName==='DIALOG'&&node.hasAttribute('open'))node.close?.();for(const dialog of node.querySelectorAll('dialog[open]'))dialog.close?.();node.style.setProperty('display','none','important');
    if (restoreKnownLock) this.unlockOwnedOverlay(node);
  }
  unlockOwnedOverlay(node) {
    // Only a documented adapter can supply a modal id/class ownership link.
    const owner=node.id; if(!owner)return;
    for(const el of [this.document.body,this.document.documentElement]) {
      if (el.getAttribute('data-scroll-lock-owner') !== owner || el.style.overflow !== 'hidden') continue;
      this.locks.set(el,{value:'hidden',priority:el.style.getPropertyPriority('overflow'),owner}); el.style.removeProperty('overflow');
    }
  }
  undo() {
    this.cleanupEnabled=false;clearTimeout(this.timer);this.observer?.disconnect();this.roots=[];this.observer=null;this.styles.clear();for(const [el,classes] of this.removedClasses)for(const cls of classes)el.classList.add(cls);this.removedClasses.clear();
    for(const [node,old] of this.owned) if(old.reveal) { if(node.style.filter==='none'&&node.style.getPropertyPriority('filter')==='important')old.value?node.style.setProperty('filter',old.value,old.priority):node.style.removeProperty('filter'); } else if(node.style.getPropertyValue('display')==='none'&&node.style.getPropertyPriority('display')==='important') old.value?node.style.setProperty('display',old.value,old.priority):node.style.removeProperty('display');
    for(const [el,old] of this.locks) if(!el.style.getPropertyValue('overflow')&&el.getAttribute('data-scroll-lock-owner')===old.owner) el.style.setProperty('overflow',old.value,old.priority);
    for(const [node,old] of this.owned)if(old.modal){try{node.showModal?.();}catch{node.setAttribute('open','');}}this.owned.clear();this.locks.clear();this.nagNodes.clear();this.count=0;this.sync();
  }
  media() { return discoverMedia(this.document); }
  revealDelivered() {
    // Only CSS-blurred already delivered media; no fetch or access bypass.
    const media=[...this.document.querySelectorAll('shreddit-post img,shreddit-post video,[data-testid="post-container"] img,[data-testid="post-container"] video')]; let count=0;
    for(const node of media) if(node.currentSrc||node.src) {
      const computed=this.document.defaultView.getComputedStyle(node); if(!/blur\(/.test(computed.filter))continue;
      this.owned.set(node,{reveal:true,value:node.style.getPropertyValue('filter'),priority:node.style.getPropertyPriority('filter')}); node.style.setProperty('filter','none','important');count++;
    }
    return count;
  }
  moreComments() {
    const controls=[...this.document.querySelectorAll('[role="button"],button')].filter(n=>!n.closest('[data-master-button]')&&/^(view|see|load|more) (\d+ )?(more |previous )?comments$/i.test(n.textContent.trim())&&n.getAttribute('aria-disabled')!=='true'&&n.getClientRects().length);
    if(!controls.length)throw new Error('No accessible native more-comments control was found.');controls[0].click();return 'Native more-comments control activated.';
  }
  olderStories() {
    for(const a of this.document.querySelectorAll('a[href]')){const label=a.textContent.replace(/[»›→]/g,'').trim();if(a.rel==='next'||/^(older(?: stories| articles)?|next(?: page)?)$/i.test(label))try{const u=validateURL(a.href,this.document.URL);if(/(^|\.)slashdot\.org$/.test(u.hostname))return u.href;}catch{}}
    return null;
  }
  slashdotReading(){
    if(!this.store)throw new Error('The source inventory is unavailable.');
    const targets=[...this.document.querySelectorAll('.story-title,.story-byline,.body [id^="text-"],.article .body,.article h1')];
    const ids=[...this.store.records.values()].filter(p=>p.scope==='page'&&p.source?.nodes?.some(n=>targets.some(t=>t.contains(n)))).map(p=>p.id);
    if(!ids.length)throw new Error('No delivered Slashdot story text found. Use Read or select text on the page.');this.store.setReading(ids);return ids.length;
  }
  slashdotSearch(query){const q=query.trim();if(!q)throw new Error('Enter a search term.');const u=new URL('https://slashdot.org/index2.pl');u.searchParams.set('fhfilter',q);return u.href;}
  stop(){this.undo();this.unsubscribe?.();}

}
/** No validated consent adapters ship yet. Hiding is never reported as consent. */
export const CONSENT_STATUS = 'No live-validated consent adapter. Use the site’s own Reject / Necessary only controls; hiding a banner does not submit consent.';
