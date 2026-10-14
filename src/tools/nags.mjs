const OWN='[data-master-button]', ROOTS='dialog,[role="dialog"],[aria-modal="true"],.rpl-bottom-sheet,[data-testid="sheetDialog"],[data-testid="app-upsell"],[data-testid="xpromo"],shreddit-experience-tree[experiencename*="AppUpsell"]';
export const nagSite=host=>/(^|\.)(reddit\.com|x\.com|twitter\.com|instagram\.com|facebook\.com|linkedin\.com)$/.test(host);
export function pageRoots(document){
  const roots=[document];for(let i=0;i<roots.length&&roots.length<80;i++)for(const n of roots[i].querySelectorAll('*'))if(n.shadowRoot&&!n.closest(OWN))roots.push(n.shadowRoot);
  return roots;
}
function combinedText(node){let t=node.textContent||'';for(const n of [node,...node.querySelectorAll('*')])if(n.shadowRoot)t+=' '+n.shadowRoot.textContent;return t.replace(/\s+/g,' ').trim();}
function signature(node,host){
  const text=combinedText(node);if(text.length>6000||node.closest(OWN)||node.matches('html,body,main,article')||node.querySelector('main,article,[role="main"]'))return false;
  const controls=[...node.querySelectorAll('button,a,[role="button"]')];for(const n of [node,...node.querySelectorAll('*')])if(n.shadowRoot)controls.push(...n.shadowRoot.querySelectorAll('button,a,[role="button"]'));
  const labels=controls.map(n=>(n.textContent||n.getAttribute('aria-label')||'').trim()).join(' ');
  if(/(^|\.)reddit\.com$/.test(host))return /get the app to keep using reddit|reddit is better in the app|use reddit in the app|open in the reddit app/i.test(text)&&/get (?:the )?reddit app|open (?:in )?(?:the )?app|continue in app|use app/i.test(labels);
  if(/(^|\.)(x|twitter)\.com$/.test(host))return /get the full app experience|see what.s happening in the app|open (?:x|twitter) app/i.test(text)&&/open x|open twitter|open app|download/i.test(labels);
  return /get the .{0,20}app|open .{0,20}in the app/i.test(text)&&/open app|use app|get the app|download app/i.test(labels)&&!node.querySelector('input[type="password"]');
}
function overlay(node,document){const style=document.defaultView.getComputedStyle(node);return node.matches(ROOTS)||['fixed','absolute'].includes(style.position);}
/** Screenshot wording plus a bounded overlay and app action; never match article wording alone. */
export function appNags(document,roots=pageRoots(document)){
  const host=new URL(document.URL).hostname;if(!nagSite(host))return[];const found=new Set();
  for(const root of roots){
    const candidates=[...root.querySelectorAll(ROOTS)];
    for(const text of root.querySelectorAll('h1,h2,h3,[role="heading"],button,a')){
      if(!/get the full app experience|get the app to keep using reddit|open x|get (?:the )?reddit app|open in (?:the )?app|use reddit in the app/i.test(text.textContent||''))continue;
      for(let n=text.parentElement,depth=0;n&&depth<7;depth++,n=n.parentElement)if(overlay(n,document)&&signature(n,host)){candidates.push(n);break;}
    }
    for(let node of candidates){if(!signature(node,host))continue;
      // X's sheet wrapper owns its backdrop. Do not leave it intercepting touches.
      const layer=node.closest('[data-testid="sheetDialog"]');if(layer&&signature(layer,host))node=layer;
      if(![...found].some(n=>n.contains(node)))found.add(node);
    }
  }
  return [...found].filter(n=>![...found].some(other=>other!==n&&other.contains(n)));
}
export function otherDialogOpen(document,excluded,roots=pageRoots(document)){
  return roots.some(root=>[...root.querySelectorAll('dialog[open],[role="dialog"],[aria-modal="true"]')].some(n=>
    !n.closest(OWN)&&!excluded.some(e=>e===n||e.contains(n))&&!hiddenByAncestor(n,document)));
}
function hiddenByAncestor(node,document){for(let n=node;n;n=n.parentElement||n.getRootNode()?.host){if(n.hidden)return true;const css=document.defaultView.getComputedStyle(n);if(css.display==='none'||css.visibility==='hidden')return true;}return false;}
