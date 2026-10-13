const REDDIT_NAGS=[
 '#desktop-dynamic-upsell-dialog','#app-upsell-blocking-bottom-sheet-direct','#app-upsell-blocking-bottom-sheet-seo','#xpromo-bottom-sheet','#xpromo-new-app-selector','#xpromo-app-selector','#xpromo-small-header','#nsfw-desktop-auth-blocking-modal-dialog','#nsfw-desktop-auth-blocking-modal-overlay-element','#nsfw-qr-dialog','#blocking-modal','#nsfw-desktop-auth-blocking-modal','xpromo-top-button','xpromo-app-selector','faceplate-bottom-sheet[id*="xpromo"]','rpl-bottom-sheet[id*="app-upsell"]','rpl-bottom-sheet[id*="xpromo"]','configured-xpromo-modal[id*="xpromo"]','.configured-xpromo-bottom-sheet','.XPromoPopup','.XPromoPopupRpl','.XPromoBottomBar','.XPromoInFeed','.AppSelectorModal__body','.upsell_banner'
];
const siteSelectors={
 reddit:REDDIT_NAGS,
 x:['[data-interaction="app-store-obstruction"]','[data-testid="app-bar-close"] ~ [data-testid="app-install-banner"]'],
 instagram:['[data-testid="app-download-banner"]'],
 facebook:['.contextual-sign-in-modal','.sign-in-modal','[data-testid="app-install-banner"]'],
 linkedin:['.contextual-sign-in-modal','.sign-in-modal','.guest-upsell'],
 slashdot:[],google:[],other:[]
};
const NAG_RE=/(?:open|view|use|get|continue|download).{0,24}(?:in\s+the\s+app|the\s+(?:reddit|instagram|facebook|twitter|linkedin)\s+app)|(?:log|sign)\s+in\s+to\s+(?:continue|see|view)|join\s+(?:reddit|the conversation)/i;
const DIALOGS='[role="dialog"],[aria-modal="true"],dialog,faceplate-bottom-sheet,rpl-bottom-sheet';
function isAuthPage(){return /^\/(?:login|register|signup|accounts\/login)(?:\/|$)/i.test(location.pathname);}
function siteClean(){
 if(!cleanupEnabled()||siteName()==='other'||isAuthPage())return;
 const name=siteName();for(const sel of siteSelectors[name]||[])for(const n of safeMatches(sel))hideNode(n,'Known '+name+' app prompt');
 if(['reddit','instagram','facebook','x','linkedin'].includes(name)){
  // Never hide a generic dialog based solely on its role: only clearly matching promo copy.
  for(const el of safeMatches(DIALOGS).slice(0,50)){
   const body=text(el.textContent).slice(0,900);if(body.length&&NAG_RE.test(body)&&body.length<700&&el.querySelectorAll('input,textarea').length===0)hideNode(el,'App or login interruption');
  }
  for(const a of safeMatches('header a,nav a,header button,nav button').slice(0,60)){
   const label=text(a.textContent+' '+(a.getAttribute('aria-label')||''));
   if(NAG_RE.test(label)&&label.length<85)hideNode(a,'App promotion');
  }
 }
 if(name==='reddit'&&prefs.nsfw)revealReddit();
 if(name==='slashdot'&&state.slashdotSimple){document.documentElement.setAttribute('data-mb-slashdot','');}
 // Restore document scroll only if modal is already hidden, and no other visible dialog exists.
 if([...hidden.keys()].some(e=>e.isConnected&&/(dialog|modal|sheet|overlay)/i.test(String(e.className)+' '+e.tagName))&&!document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]:not([style*="none"])')){
   if(document.body.style.overflow==='hidden')document.body.style.removeProperty('overflow');
 }
}
function revealReddit(){
 for(const e of safeMatches('shreddit-blurred-container')){
  const isNSFW=/nsfw/i.test((e.getAttribute('reason')||'')+' '+(e.closest('[data-faceplate-tracking-context]')?.getAttribute('data-faceplate-tracking-context')||''));
  if(isNSFW){try{e.blurred=false;e.removeAttribute('blurred');}catch{}}
 }
 for(const e of safeMatches('community-highlight-card,devvit2-blur-gate')){try{if('isBlurred' in e)e.isBlurred=false;if('_blur' in e)e._blur=false;}catch{}}
 for(const e of safeMatches('[data-faceplate-tracking-context*="nsfw"] .thumbnail-blur')){
  e.classList.remove('thumbnail-blur');e.style.removeProperty('filter');
 }
 for(const e of safeMatches('xpromo-nsfw-blocking-container')){
  const sr=e.shadowRoot;if(!sr)continue;
  if(!sr.querySelector('slot[data-mb-nsfw]')){const slot=document.createElement('slot');slot.dataset.mbNsfw='1';sr.append(slot);}
  sr.querySelectorAll('[role="dialog"],.prompt,.viewInApp').forEach(n=>{if(NAG_RE.test(text(n.textContent)))hideNode(n,'NSFW app prompt');});
 }
}
function updateSite(){siteClean();appliedFilter();}
function setSiteCleanup(on){prefs.siteCleanup[siteName()]=on;saveSettings();if(!on){showAll();if(siteName()==='slashdot')document.documentElement.removeAttribute('data-mb-slashdot');appliedFilter();}else updateSite();render();}
function autoMapRedirect(){if(!prefs.autoMaps||siteName()!=='google')return;const dest=appleMapsURL(location.href);if(!dest)return;if(sessionStorage.getItem('mb:last-map')===location.href)return;try{sessionStorage.setItem('mb:last-map',location.href);}catch{}location.replace(dest);}
function imageSrc(img){
 const sources=(img.getAttribute('srcset')||'').split(',').map(x=>{const p=x.trim().split(/\s+/);return {url:p[0],w:Number(p[1]?.replace(/[^0-9]/g,''))||0};}).sort((a,b)=>b.w-a.w);
 return sources[0]?.url || img.currentSrc || img.src;
}
function mediaItems(){
 const root=document.querySelector('article:has(img,video),[data-testid="tweet"]:has(img,video),[role="article"]:has(img,video)')||document;
 const found=[];for(const el of root.querySelectorAll('img,video')){
  if(!el.getBoundingClientRect)continue;const r=el.getBoundingClientRect();if(r.width<95||r.height<90)continue;
  const raw=el.tagName==='VIDEO'?(el.currentSrc||el.src||el.querySelector('source')?.src):imageSrc(el);
  const u=supportedURL(raw);if(!u)continue;if(u.protocol!=='https:'&&u.protocol!=='http:')continue;
  if(el.tagName==='IMG'&&/avatar|profile|emoji|icon|logo/i.test((el.alt||'')+' '+(el.className||'')))continue;
  const href=u.href;const key=href.replace(/([?&])name=(?:small|medium|large|orig)/,'$1name=orig');
  if(found.some(x=>x.url===key))continue;
  found.push({url:key,kind:el.tagName==='VIDEO'?'video':'image',el,label:(el.alt||'').slice(0,65)||`${el.tagName==='VIDEO'?'Video':'Image'} ${found.length+1}`});
  if(found.length>=65)break;
 }
 return found;
}
function expandFacebookComments(){
 if(siteName()!=='facebook')return notify('This action is for Facebook.');
 const names=/^(?:view|see|show|load)\s+(?:more\s+|all\s+|previous\s+)?(?:\d+\s+)?comments?\b|^(?:most relevant|all comments)$/i;
 const target=[...document.querySelectorAll('button,[role="button"],a')].find(e=>names.test(text(e.textContent))&&!e.closest('[data-mb-host]'));
 if(target){target.click();notify('Requested Facebook’s native comments.');}else notify('No accessible native comments control found.');
}
function slashdotOlder(){if(siteName()!=='slashdot')return;const a=[...document.querySelectorAll('a')].find(x=>/older articles|older stories|more stories/i.test(text(x.textContent)));if(a?.href)location.assign(a.href);else notify('Older articles link not found.');}
