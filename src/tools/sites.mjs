import { amazonProduct, appleMapsURL, validateURL } from './urls.mjs';
const SOCIAL = /(^|\.)(x.com|twitter.com|instagram.com|facebook.com|linkedin.com)$/;
export function siteActions(url) {
  const u = new URL(url), actions = [];
  if (/(^|\.)amazon\.[a-z.]+$/.test(u.hostname)) {
    const product = amazonProduct(url); actions.push({id:'amazon-copy',label:'Copy product link',enabled:!!product,url:product?.canonical});
    actions.push({id:'amazon-history',label:'Price history',enabled:!!product?.priceHistory,url:product?.priceHistory,reason:!product?'Open a product first.':'This Amazon region has no supported route.'});
  }
  if (/(^|\.)reddit.com$/.test(u.hostname)) actions.push({id:'reddit-prompts',label:'Review app prompts',enabled:true},{id:'reddit-reveal',label:'Reveal delivered media',enabled:true});
  if (SOCIAL.test(u.hostname)) actions.push({id:'social-clean',label:'Review interruptions',enabled:true},{id:'media',label:'Choose accessible media',enabled:true});
  if (/(^|\.)facebook.com$/.test(u.hostname)) actions.push({id:'comments',label:'More comments',enabled:true});
  if (/(^|\.)slashdot.org$/.test(u.hostname)) actions.push({id:'slashdot-clean',label:'Read this story',enabled:true},{id:'slashdot-older',label:'Older stories',enabled:true},{id:'slashdot-search',label:'Search Slashdot',enabled:true});
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
  constructor(document) { this.document=document; this.owned=new Map(); this.locks=new Map(); }
  hideOverlay(node,{ restoreKnownLock=false }={}) {
    if (!node || node.matches('html,body,article,main') || node.closest('[data-master-button]') || node.querySelector('main,article')) throw new Error('Choose a nuisance overlay, not the page or article.');
    if (!this.owned.has(node)) this.owned.set(node,{value:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')}); node.style.setProperty('display','none','important');
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
    for(const [node,old] of this.owned) if(old.reveal) { if(node.style.filter==='none'&&node.style.getPropertyPriority('filter')==='important')old.value?node.style.setProperty('filter',old.value,old.priority):node.style.removeProperty('filter'); } else if(node.style.getPropertyValue('display')==='none'&&node.style.getPropertyPriority('display')==='important') old.value?node.style.setProperty('display',old.value,old.priority):node.style.removeProperty('display');
    for(const [el,old] of this.locks) if(!el.style.getPropertyValue('overflow')&&el.getAttribute('data-scroll-lock-owner')===old.owner) el.style.setProperty('overflow',old.value,old.priority);
    this.owned.clear();this.locks.clear();
  }
  media() {
    const candidates=[...this.document.querySelectorAll('article img,main img,article video,main video,[role="main"] img,[role="main"] video')]; const found=[];
    for(const node of candidates){const urls=node.tagName==='VIDEO'?[node.currentSrc,node.src,...[...node.querySelectorAll('source')].map(s=>s.src)]:[node.currentSrc||node.src];
      for(const raw of urls.filter(Boolean))try{const url=validateURL(raw,this.document.URL);if(!found.some(x=>x.url===url.href))found.push({url:url.href,type:node.tagName.toLowerCase(),label:node.alt||node.getAttribute('aria-label')||`${node.tagName.toLowerCase()} ${found.length+1}`});}catch{}
    }
    return found;
  }
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
    return [...this.document.querySelectorAll('a[href]')].find(a=>/^(older (stories|articles)|older|next page)$/i.test(a.textContent.trim()))?.href || null;
  }
}
/** No validated consent adapters ship yet. Hiding is never reported as consent. */
export const CONSENT_STATUS = 'No live-validated consent adapter. Use the site’s own Reject / Necessary only controls; hiding a banner does not submit consent.';
