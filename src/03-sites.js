const REDDIT_NAGS=[
 '#configured-xpromo-unrated_block','#configured-xpromo-blocking_xpromo_nsfw_blocking','#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop','#configured-xpromo-blocking_xpromo_nsfw_blocking_desktop_cms','#desktop-dynamic-upsell-dialog','#app-upsell-blocking-bottom-sheet-direct','#app-upsell-blocking-bottom-sheet-seo','#xpromo-bottom-sheet','#xpromo-new-app-selector','#xpromo-app-selector','#xpromo-small-header','#nsfw-desktop-auth-blocking-modal-dialog','#nsfw-desktop-auth-blocking-modal-overlay-element','#nsfw-qr-dialog','#blocking-modal','#nsfw-desktop-auth-blocking-modal','xpromo-top-button','xpromo-app-selector','faceplate-bottom-sheet[id*="xpromo"]','rpl-bottom-sheet[id*="app-upsell"]','rpl-bottom-sheet[id*="xpromo"]','configured-xpromo-modal[id*="xpromo"]','.configured-xpromo-bottom-sheet','.configured-xpromo-full-screen','.XPromoPopup','.XPromoPopupRpl','.XPromoPopupRplNew','.XPromoBottomBar','.XPromoInFeed','.XPromoPill','.AppSelectorModal__body','.upsell_banner','.rpl-dialog#age-gate-interstitial'
];
const siteSelectors={
 reddit:REDDIT_NAGS,
 x:['[data-interaction="app-store-obstruction"]','[data-testid="app-bar-close"] ~ [data-testid="app-install-banner"]'],
 instagram:['[data-testid="app-download-banner"]'],
 facebook:['.contextual-sign-in-modal','.sign-in-modal','[data-testid="app-install-banner"]'],
 linkedin:['.contextual-sign-in-modal','.sign-in-modal','.guest-upsell'],
 slashdot:[],google:[],other:[]
};
const NAG_RE=/(?:get\s+(?:the\s+)?best\s+of\s+reddit\s+in\s+the\s+app|(?:open|view|use|get|continue|download).{0,35}(?:in\s+the\s+app|the\s+(?:reddit|instagram|facebook|twitter|linkedin)\s+app)|(?:log|sign)\s+in\s+to\s+(?:continue|see|view)|join\s+(?:reddit|the conversation))/i;
const DIALOGS='[role="dialog"],[aria-modal="true"],dialog,faceplate-bottom-sheet,rpl-bottom-sheet';
function isAuthPage(){return /^\/(?:login|register|signup|accounts\/login)(?:\/|$)/i.test(location.pathname);}
// Reddit's timed mobile app interstitial is sometimes a full-viewport DIV, not a dialog.
// Keep rules site-scoped; no broad body/main/article hiding, no interference with login.
const REDDIT_PROMO_HEAD=/(?:get\s+(?:the\s+)?best\s+of\s+reddit\s+in\s+the\s+app|(?:get|open|use|view)\s+(?:the\s+)?reddit\s+app)/i;
const REDDIT_PROMO_BUTTON=/^(?:get\s+(?:the\s+)?reddit\s+app|open\s+(?:in\s+)?(?:the\s+)?app|continue\s+in\s+(?:the\s+)?app)$/i;
const REDDIT_DIALOGISH='dialog,[role="dialog"],[aria-modal="true"],rpl-bottom-sheet,faceplate-bottom-sheet,faceplate-dialog,configured-xpromo-modal,[class*="XPromo"],[class*="xpromo"],[id*="xpromo"],[class*="upsell" i],[id*="upsell" i],[class*="modal" i]';
const redditScrollOriginal=new Map();let redditDismissed=false;
const redditKnownCSS=REDDIT_NAGS.map(s=>`html[data-mb-reddit-clean] ${s}`).join(',\n');
const redditCss=`${redditKnownCSS},html[data-mb-reddit-clean] [data-mb-reddit-nag]{display:none!important;visibility:hidden!important;pointer-events:none!important}`;
function toggleRedditCSS(enabled){
 if(siteName()!=='reddit')return;
 const root=document.documentElement;if(!root)return;
 root.toggleAttribute('data-mb-reddit-clean',enabled);
 let sheet=document.getElementById('mb-reddit-css');
 if(!sheet){sheet=document.createElement('style');sheet.id='mb-reddit-css';sheet.textContent=redditCss;(document.head||root).append(sheet);}
}
function redditRootForPromotion(node){
 if(!node||protectedNode(node)||isAuthPage())return null;
 const inDialog=node.closest?.(REDDIT_DIALOGISH);
 if(inDialog&&!protectedNode(inDialog))return inDialog;
 // Detect a full-screen overlay only when both the prominent headline and CTA exist.
 for(let el=node.parentElement,depth=0;el&&depth<9;el=el.parentElement,depth++){
  if(protectedNode(el))break;
  const content=text(el.textContent||'');if(content.length>1800)break;
  const heading=[...el.querySelectorAll('h1,h2,h3,[role="heading"]')].some(h=>REDDIT_PROMO_HEAD.test(text(h.textContent)));
  const cta=[...el.querySelectorAll('button,a,[role="button"]')].some(b=>REDDIT_PROMO_BUTTON.test(text(b.textContent).slice(0,100)));
  if(!heading||!cta)continue;
  const style=getComputedStyle(el),rect=el.getBoundingClientRect(),height=innerHeight||1;
  const likelyOverlay=style.position==='fixed'||style.position==='sticky'||(style.position==='absolute'&&rect.height>height*.55);
  const largeInterstitial=rect.height>=height*.56&&rect.width>=(innerWidth||1)*.65&&el.children.length>0;
  if(likelyOverlay||largeInterstitial)return el;
 }
 return null;
}
function redditExtraPromos(){
 let removed=0;
 const headings=safeMatches('h1,h2,h3,[role="heading"]').filter(h=>REDDIT_PROMO_HEAD.test(text(h.textContent).slice(0,150)));
 for(const heading of headings.slice(0,18)){
  const candidate=redditRootForPromotion(heading);
  if(candidate){candidate.setAttribute('data-mb-reddit-nag','');if(hideNode(candidate,'Reddit app interstitial'))removed++;}
 }
 // A plain visible modal may lack a heading but still contain unmistakable app-promo copy.
 for(const el of safeMatches(REDDIT_DIALOGISH).slice(0,55)){
  if(protectedNode(el)||el.querySelector('input,textarea,[contenteditable="true"]'))continue;
  const msg=text(el.textContent).slice(0,1200);
  if(msg&&msg.length<1000&&REDDIT_PROMO_HEAD.test(msg)){
   el.setAttribute('data-mb-reddit-nag','');if(hideNode(el,'Reddit app interstitial'))removed++;
  }
 }
 return removed;
}
function redditScrollLockPresent(){return [document.documentElement,document.body].some(el=>el&&(
  /(?:^|\s)(?:no-scroll|rpl-scroll-lock|scroll-is-blocked|scroll-disabled|overflow-hidden)(?:\s|$)/.test(el.className||'') ||
  el.hasAttribute('m-scroll-lock') || el.hasAttribute('scroll-lock') ||
  ['overflow','overflow-y'].some(prop=>/^(hidden|clip)$/i.test(el.style.getPropertyValue(prop))) ||
  (el===document.body&&el.style.position==='fixed') || el.style.touchAction==='none'
  ));}
function redditUnlockScroll(){
 if(!redditDismissed||!redditScrollLockPresent())return;
 // Never defeat an unrelated, still-visible native dialog.
 const openDialog=[...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')].some(el=>{
  if(hidden.has(el)||el.closest('[data-mb-reddit-nag]'))return false;
  const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden';
 });
 if(openDialog)return;
 for(const el of [document.documentElement,document.body]){
  if(!el)continue;
  if(!redditScrollOriginal.has(el))redditScrollOriginal.set(el,{
   className:el.getAttribute('class'), scrollAttr:el.getAttribute('scroll-lock'),mAttr:el.getAttribute('m-scroll-lock'),
   css:new Map(['overflow','overflow-y','position','touch-action','overscroll-behavior','pointer-events','padding-right'].map(k=>[k,[el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]]))
  });
  el.classList.remove('no-scroll','rpl-scroll-lock','scroll-is-blocked','scroll-disabled','overflow-hidden');
  el.removeAttribute('m-scroll-lock');el.removeAttribute('scroll-lock');
  for(const key of ['overflow','overflow-y','position','touch-action','overscroll-behavior','pointer-events','padding-right'])el.style.removeProperty(key);
 }
}
function redditRestoreScrollOwnership(){
 // Do not re-lock scroll on disabling cleanup; relinquish ownership instead.
 redditScrollOriginal.clear();redditDismissed=false;
 for(const el of safeMatches('[data-mb-reddit-nag]'))el.removeAttribute('data-mb-reddit-nag');
}

function siteClean(){
 if(state.filterReview||!cleanupEnabled()||siteName()==='other'||isAuthPage())return;
 const name=siteName();if(name==='reddit')toggleRedditCSS(true);let hiddenPromos=0;for(const sel of siteSelectors[name]||[])for(const n of safeMatches(sel))if(hideNode(n,'Known '+name+' app prompt'))hiddenPromos++;
 if(name==='reddit')hiddenPromos+=redditExtraPromos();
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
 if(name==='reddit'){if(hiddenPromos)redditDismissed=true;redditUnlockScroll();if(prefs.nsfw)revealReddit();}
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
function setSiteCleanup(on){prefs.siteCleanup[siteName()]=on;saveSettings();if(!on){if(siteName()==='reddit'){toggleRedditCSS(false);redditRestoreScrollOwnership();}showAll();if(siteName()==='slashdot')document.documentElement.removeAttribute('data-mb-slashdot');appliedFilter();}else updateSite();render();}
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

