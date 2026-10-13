let host=null,toastTimer=0,observer=null,observerTimer=0,lastLocation=location.href,ignoreClick=false;
const state={view:'',readerEditing:false,readerDraft:'',voices:[],siteMedia:[],mediaIndex:0,selectedMedia:null,selectMedia:false,pickerSelector:'',exporting:false,slashdotSimple:false};
const button=(action,icon,label,extra='')=>`<button type="button" data-action="${esc(action)}" class="mb-action" ${extra}><span aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`;
function notify(message){if(!host)return;const el=host.shadowRoot.querySelector('.mb-toast');if(!el)return;el.textContent=String(message);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},4500);}
async function shareURL(u){try{if(navigator.share){await navigator.share({url:u});return;}}catch(e){if(e.name==='AbortError')return;}await copyText(u);notify('Copied link.');}
async function copyText(v){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(v);return;}catch{}}if(typeof GM!=='undefined'&&typeof GM.setClipboard==='function'){await GM.setClipboard(v);return;}throw Error('No clipboard permission; use the URL editor to copy manually.');}
function openView(v){state.view=v;render();}
function positionCSS(){const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;return `left:${Math.max(5,(vv?.offsetLeft||0)+w-43-Math.max(5,Math.min(w-54,prefs.position.right)))}px;top:${Math.max(5,(vv?.offsetTop||0)+(vv?.height||innerHeight)-43-Math.max(8,Math.min((vv?.height||innerHeight)-54,prefs.position.bottom)))}px;bottom:auto;right:auto;`;}
// Inline, consistent stroke icons; no external assets or webfonts.
const iconPaths={
 'share':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.1m-6.6 9 6.6 4"/>',
 'link':'<path d="m10 13 4-4"/><path d="M15 7h2a5 5 0 0 1 0 10h-3"/><path d="M9 17H7A5 5 0 0 1 7 7h3"/>',
 'headphones':'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="2" y="13" width="5" height="8" rx="2"/><rect x="17" y="13" width="5" height="8" rx="2"/>',
 'filter':'<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="7" cy="7" r="1"/>',
 'sliders':'<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h11m4 0h1"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 'wave':'<path d="M2 10v4m4-8v12m4-15v18m4-14v10m4-7v4m4-7v10"/>',
 'images':'<rect x="3" y="3" width="15" height="15" rx="2"/><path d="m3 14 4-4 4 4 3-3 4 4M8 7h.01M9 21h11a1 1 0 0 0 1-1V8"/>',
 'pointer':'<path d="m4 3 7 18 2.2-7.6L21 11z"/>',
 'shield':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
 'eye':'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 'map':'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
 'comment':'<path d="M21 11a8 8 0 0 1-8 8H7l-4 3v-8a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8"/>',
 'book':'<path d="M12 7a7 7 0 0 0-9-2v14a7 7 0 0 1 9 2 7 7 0 0 1 9-2V5a7 7 0 0 0-9 2zm0 0v14"/>',
 'search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 'download':'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 'check':'<path d="m5 12 4 4L19 6"/>',
 'refresh':'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 9a8 8 0 0 1 14-2l1 5M4 12l1 5a8 8 0 0 0 14-2"/>',
 'chevron':'<path d="m9 18 6-6-6-6"/>',
 'close':'<path d="M5 5 19 19M19 5 5 19"/>',
 'back':'<path d="m15 18-6-6 6-6"/>',
 'play':'<path d="m8 5 12 7-12 7z"/>',
 'pause':'<path d="M8 5v14M16 5v14"/>',
 'prev':'<path d="M5 5v14m13-14-9 7 9 7z"/>',
 'next':'<path d="M19 5v14M6 5l9 7-9 7z"/>',
 'minus':'<path d="M5 12h14"/>',
 'file':'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 12h7m-7 4h7"/>',
 'volume':'<path d="M11 5 6 9H3v6h3l5 4zM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>'
};
function ico(name,size=19){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.chevron}</svg>`;}
function tile(action,icon,label){return `<button class="mb-tile" data-action="${esc(action)}" type="button">${ico(icon,21)}<span>${esc(label)}</span></button>`;}
function compact(action,icon,label,end=''){return `<button class="mb-compact" data-action="${esc(action)}" type="button"><span class="mb-compact-icon">${ico(icon,18)}</span><span class="mb-compact-label">${esc(label)}</span>${end?`<span class="mb-compact-end">${esc(end)}</span>`:ico('chevron',15)}</button>`;}
const styles=`
:host{all:initial;color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif!important;-webkit-font-smoothing:antialiased;}
*,*::before,*::after{box-sizing:border-box;}
button,input,textarea,select{font-family:inherit;-webkit-tap-highlight-color:transparent;}
button{cursor:pointer;}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--accent,#528cff);outline-offset:2px;}
.mb-launch{position:fixed;${positionCSS()}width:43px;height:43px;border-radius:50%;border:1px solid rgba(255,255,255,.19);background:rgba(24,29,40,.78);color:white;box-shadow:0 5px 20px #0003;z-index:2;font:500 20px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;touch-action:none;pointer-events:auto;display:flex;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);}
.mb-count{position:absolute;top:-3px;right:-3px;min-width:16px;height:16px;border-radius:9px;background:#4c80ef;color:white;font:600 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:2px 3px;}
.mb-panel{--fg:#17202d;--muted:#747f90;--bg:#f8f9fc;--surface:#fff;--tile:#fff;--bd:#e7eaf0;--accent:#3766df;--tint:#edf3ff;position:fixed;right:10px;bottom:calc(env(safe-area-inset-bottom) + 64px);width:min(370px,calc(100vw - 20px));max-height:min(76dvh,650px);overflow:auto;overscroll-behavior:contain;z-index:3;background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:24px;box-shadow:0 16px 55px rgba(0,0,0,.22),0 2px 6px rgba(0,0,0,.05);font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:auto;-webkit-overflow-scrolling:touch;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f5f6fb;--muted:#959cae;--bg:#1a1c24;--surface:#242732;--tile:#272a35;--bd:#343744;--accent:#95b4ff;--tint:#2c3852;}}
.mb-panel.reader{inset:0;width:100%;max-height:100dvh;border:0;border-radius:0;display:flex;flex-direction:column;background:var(--bg);}
.mb-head{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;background:var(--bg);padding:10px 12px 9px;gap:9px;border-bottom:1px solid var(--bd);}
.mb-head h2{font-size:15px;line-height:1.25;font-weight:720;letter-spacing:-.35px;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.mb-head-start{display:flex;align-items:center;gap:9px;min-width:0;flex:1;}
.mb-head button{flex-shrink:0;}.mb-brand{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--tint);color:var(--accent);font:600 19px system-ui;flex:none;}
.mb-small{border:0;background:var(--surface);color:var(--fg);border-radius:10px;padding:7px 9px;font:600 12px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;min-height:32px;display:inline-flex;gap:5px;justify-content:center;align-items:center;}
.mb-icon-btn{width:40px;height:40px;padding:9px;}
.mb-body{padding:10px 12px 12px;display:grid;gap:9px;}
.mb-section{display:grid;gap:7px;}
.mb-section-head{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:1px 1px 0;}
.mb-section-title{font-size:11px;font-weight:730;letter-spacing:.35px;color:var(--muted);text-transform:uppercase;}
.mb-section-note{font:500 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);}
.mb-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
.mb-tile{min-width:0;min-height:67px;background:var(--tile);border:1px solid var(--bd);border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--fg);padding:9px 4px 8px;}
.mb-tile svg{color:var(--accent);flex:none;}
.mb-tile span{font:600 11px/1.14 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;white-space:nowrap;letter-spacing:-.12px;}
.mb-compact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}
.mb-compact{border:1px solid var(--bd);border-radius:12px;background:var(--tile);color:var(--fg);min-width:0;min-height:44px;padding:7px 9px;display:flex;align-items:center;gap:7px;text-align:left;font:600 11.7px/1.15 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;}
.mb-compact-icon{color:var(--accent);flex:none;display:flex;}.mb-compact-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}.mb-compact-end{font:650 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--accent);white-space:nowrap;}.mb-compact>svg:last-child{color:var(--muted);opacity:.55;flex:none;}
.mb-action{display:flex;gap:9px;align-items:center;justify-content:flex-start;background:var(--tile);color:var(--fg);border:1px solid var(--bd);border-radius:11px;min-height:44px;padding:8px 10px;text-align:left;font:600 12px/1.25 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;cursor:pointer;}
.mb-action span:first-child{width:22px;flex-shrink:0;font-size:15px;text-align:center;}.mb-action:disabled,.mb-small:disabled{opacity:.48;}
.mb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}
.mb-muted{font-size:11px;line-height:1.45;color:var(--muted);margin:0;}
.mb-footer{font:10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);text-align:center;padding:1px 0 1px;}
.mb-rule{background:var(--surface);border:1px solid var(--bd);border-radius:11px;padding:9px;display:grid;gap:6px;overflow-wrap:anywhere;}
.mb-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.mb-field{display:grid;gap:4px;font-size:11px;color:var(--muted);font-weight:600;}
.mb-input,.mb-select,.mb-textarea{width:100%;min-height:38px;border:1px solid var(--bd);border-radius:10px;background:var(--surface);color:var(--fg);font:13px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:8px;}
.mb-textarea{min-height:102px;resize:vertical;font-size:13px;}
.mb-transcript{flex:1;min-height:0;overflow:auto;padding:8px 14px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.mb-paragraph{display:flex;align-items:flex-start;gap:8px;padding:12px 0;border-bottom:1px solid var(--bd);line-height:1.65;white-space:pre-wrap;}
.mb-paragraph small{font:500 10px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:var(--muted);display:block;margin-bottom:3px;}
.mb-paragraph.current{background:var(--tint);border-radius:12px;margin:3px -6px;padding:10px 6px;}
.mb-paragraph.excluded{opacity:.46;}.mb-paragraph button{border:1px solid var(--bd);background:var(--surface);color:var(--fg);border-radius:10px;padding:6px;min-width:33px;min-height:33px;}
.mb-controls{flex:none;border-top:1px solid var(--bd);padding:10px 12px calc(12px + env(safe-area-inset-bottom));display:grid;gap:9px;background:var(--bg);}
.mb-range{width:100%;accent-color:var(--accent);height:14px;}.mb-player-row{display:flex;justify-content:space-between;align-items:center;gap:7px;}.mb-player-row .mb-small{min-width:38px;}.mb-primary-play{height:44px;min-width:53px!important;border-radius:14px;background:var(--fg);color:var(--bg);}.mb-player-extra{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;}.mb-player-extra .mb-action{justify-content:center;text-align:center;flex-direction:column;gap:4px;padding:7px 3px;font-size:10px;min-height:44px;}.mb-player-extra .mb-action span:first-child{height:18px;width:20px;}
.mb-toast{position:fixed;bottom:calc(env(safe-area-inset-bottom) + 61px);left:10px;right:10px;margin:auto;max-width:370px;color:#fff;background:rgba(21,25,35,.95);padding:10px 12px;border-radius:12px;font:12px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;z-index:5;pointer-events:none;box-shadow:0 8px 25px #0005;}
.mb-toast[hidden],.mb-panel[hidden]{display:none;}.mb-pill{font:600 10px;color:var(--muted);background:var(--surface);padding:4px 7px;border-radius:7px;}
.mb-preview{height:95px;border-radius:11px;background:var(--surface);display:grid;place-items:center;overflow:hidden;}.mb-preview img,.mb-preview video{max-width:100%;max-height:95px;object-fit:contain;}
@media(prefers-reduced-motion:no-preference){.mb-panel:not(.reader){animation:mb-in .15s cubic-bezier(.2,.8,.2,1);}@keyframes mb-in{from{opacity:.85;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}}
`;
const globalStyles=`[data-mb-preview]{outline:3px dashed #4c80ff!important;outline-offset:3px!important;}[data-mb-preview-hide]{visibility:hidden!important;}html[data-mb-slashdot] #slashboxes,html[data-mb-slashdot] #footer,html[data-mb-slashdot] .adwrap{display:none!important;}html[data-mb-slashdot] #firehose,html[data-mb-slashdot] #articles{max-width:790px!important;width:100%!important;margin:auto!important;}`;
function head(title){const menu=state.view==='menu';return `<header class="mb-head">${menu?'<span class="mb-brand" aria-hidden="true">✦</span>':`<button type="button" class="mb-small mb-icon-btn" data-action="back" aria-label="Back">${ico('back',19)}</button>`}<h2>${esc(title)}</h2><button type="button" class="mb-small mb-icon-btn" data-action="close" aria-label="Close drawer">${ico('close',16)}</button></header>`;}
function renderMenu(){
 const s=siteName(),active=cleanupEnabled(),site=s[0].toUpperCase()+s.slice(1);
 const siteActions=[];
 if(s!=='other')siteActions.push(compact('site-toggle','shield','Auto cleanup',active?'On':'Off'));
 if(s==='reddit')siteActions.push(compact('nsfw','eye','Reveal NSFW',prefs.nsfw?'On':'Off'));
 if(['x','instagram','facebook','linkedin'].includes(s))siteActions.push(compact('media','images','Browse media'),compact('media-picker','pointer','Select on page'));
 if(s==='facebook')siteActions.push(compact('fb-comments','comment','Show comments'));
 if(s==='slashdot')siteActions.push(compact('slashdot-simple','book','Reader layout'),compact('slashdot-search','search','Search'),compact('slashdot-older','clock','Older stories'));
 if(s==='google')siteActions.push(compact('auto-maps','map','Auto Apple Maps',prefs.autoMaps?'On':'Off'),compact('apple-maps','map','Open Apple Maps'));
 if(camelURL(location.href))siteActions.push(compact('camel','clock','Price history'));
 return `${head('Master Button')}<div class="mb-body">
 <section class="mb-section"><div class="mb-section-head"><span class="mb-section-title">Tools</span><span class="mb-section-note">${esc(location.hostname)}</span></div>
 <div class="mb-tiles">${tile('share-clean','share','Share link')}${tile('url','link','Edit URL')}${tile('reader','headphones','Read aloud')}${tile('filter','filter','Filter page')}${tile('rules','sliders','Filter rules')}${tile('speech','wave','Speech')}</div></section>
 ${siteActions.length?`<section class="mb-section"><div class="mb-section-head"><span class="mb-section-title">${esc(site)} controls</span><span class="mb-section-note">Automatic where possible</span></div><div class="mb-compact-grid">${siteActions.join('')}</div></section>`:''}
 <div class="mb-row"><span class="mb-footer">v${VERSION} · <span data-count>0</span> hidden items</span><button type="button" class="mb-small" data-action="updates">${ico('refresh',13)} Updates</button></div></div>`;
}
function renderURL(){return `${head('Edit URL')}<div class="mb-body"><label class="mb-field">Destination URL<textarea class="mb-textarea" rows="3" id="mb-url">${esc(state.urlDraft||location.href)}</textarea></label><div class="mb-grid">${button('url-clean','✦','Clean URL')}${button('url-copy','▣','Copy')}${button('url-share','↗','Share')}${button('url-open','↗','Open URL')}</div><p class="mb-muted">Only confirmed tracking parameters are removed. Other parameters and fragments are preserved.</p></div>`;}
function renderFilter(){return `${head('Page filtering')}<div class="mb-body">${button('filter-toggle',filterEnabled()?'✓':'○',`Filter ${filterEnabled()?'enabled':'disabled'} for ${domainKey()}`)}${button('pick-filter','⊕','Tap an element to filter')}${button('rules','⚙','Inspect and edit rules')}${button('restore-hidden','↶','Restore all hidden items')}
 <p class="mb-muted">Hidden now: <span data-count>0</span>. A preview never saves a rule. Article extraction also omits related-story and promotion blocks conservatively.</p></div>`;}
function renderPicker(){return `${head('Select nuisance element')}<div class="mb-body"><p>Tap an unwanted element on the webpage. Its matching elements will be outlined before you save anything.</p><div class="mb-rule"><strong>${esc(state.pickerSelector||'No element selected')}</strong><span class="mb-muted">${pickerMatches.length} matching elements highlighted</span>${pickerMatches.length?`<div class="mb-grid">${button('preview',preview?'◉':'◎',preview?'Undo preview':'Preview hiding')}${button('picker-save','✓','Save rule')}</div>${button('picker-next','↓','Show next match')}`:''}</div>${button('picker-cancel','×','Cancel and restore')}</div>`;}
function renderRules(){const rules=prefs.rules[domainKey()]||[];return `${head('Filter rules')}<div class="mb-body">${button('pick-filter','⊕','New visual rule')}${rules.length?rules.map((r,i)=>`<div class="mb-rule"><strong>${esc(r.selector)}</strong><span class="mb-muted">${safeMatches(r.selector).length} current matches · ${r.enabled?'Enabled':'Disabled'}</span><div class="mb-grid">${button('rule-toggle:'+i,r.enabled?'✓':'○',r.enabled?'Disable':'Enable')}${button('rule-edit:'+i,'✎','Edit selector')}${button('rule-delete:'+i,'⌫','Delete')}</div></div>`).join(''):'<p class="mb-muted">No custom rules for this site.</p>'}
 ${button('learning-toggle',prefs.learningEnabled?.[domainKey()]===false?'○':'✓',`Learning: ${prefs.learningEnabled?.[domainKey()]===false?'Off':'On'}`)}${button('learning-clear','↶','Reset learned preferences')}<p class="mb-muted">${Object.keys(prefs.learning[domainKey()]||{}).length} hashed token weights saved. No raw article text is stored.</p></div>`;}
function renderSpeech(){return `${head('Azure speech settings')}<div class="mb-body"><p class="mb-muted">Credentials are saved using Userscripts extension storage, not the website’s storage. Azure synthesis sends enabled text to Microsoft.</p>
 <label class="mb-field">Speech resource key<input class="mb-input" id="mb-key" type="password" value="" autocomplete="off" placeholder="${azureKey?'Saved · enter to replace':'Enter Azure resource key'}"></label>
 <label class="mb-field">Resource region<input class="mb-input" id="mb-region" value="${esc(prefs.azure.region)}" placeholder="eastus"></label>
 <div class="mb-grid">${button('speech-save','✓','Save settings')}${button('speech-forget','⌫','Forget key')}</div>
 ${button('speech-voices','↻','Load voices from Azure')}
 <label class="mb-field">Voice<select class="mb-select" id="mb-voice"><option value="${esc(prefs.azure.voice)}">${esc(prefs.azure.voice)}</option>${state.voices.filter(v=>v.id!==prefs.azure.voice).map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label>
 ${button('speech-demo','▶','▶ Hear voice sample')}
 <label class="mb-field">Audio quality<select class="mb-select" id="mb-quality"><option value="compact" ${prefs.azure.quality==='compact'?'selected':''}>Compact MP3 · 48 kbps</option><option value="high" ${prefs.azure.quality==='high'?'selected':''}>Higher quality MP3 · 96 kbps</option></select></label><p class="mb-muted">Choose quality before synthesis. Previously prepared audio is reused for export.</p></div>`;}
function renderReader(){
 const total=reading.passages.length,ready=reading.passages.filter(p=>p.blob&&!p.excluded).length,enabled=enabledIndices().length;
 const editor=state.readerEditing?`<div class="mb-body"><textarea class="mb-textarea" style="min-height:42dvh" id="mb-reader-edit">${esc(state.readerDraft)}</textarea>${button('reader-save','✓','Use edited text')}${button('reader-abort','×','Cancel editing')}</div>`:`<div class="mb-transcript" data-transcript>${total?reading.passages.map((p,i)=>`<div class="mb-paragraph ${p.excluded?'excluded':''} ${i===reading.index?'current':''}" data-pass="${i}"><button type="button" data-action="pass-toggle:${i}" aria-label="${p.excluded?'Include':'Skip'} passage ${i+1}">${p.excluded?'＋':'−'}</button><div><small>${i+1}/${total} · ${esc(p.status||'idle')}${p.reason&&p.excluded?' · '+esc(p.reason):''}</small><div style="font-size:${prefs.fontSize}px" data-action="pass-play:${i}">${esc(p.text)}</div></div></div>`).join(''):'<p>No article found. Tap Edit text to paste something to narrate.</p>'}</div>`;
 return `${head('Article reader')}<div class="mb-body" style="flex:none;padding-bottom:5px"><div class="mb-row"><span class="mb-muted">${ready}/${enabled} ready${reading.preparing?' · Preparing…':''}</span><button class="mb-small" data-action="reader-edit">${ico('file',14)} Edit text</button></div></div>${editor}
 <section class="mb-controls"><input data-audio-seek type="range" class="mb-range" value="0" min="0" max="100" step=".1" aria-label="Seek within current passage"/><div class="mb-player-row"><button class="mb-small" data-action="prev" aria-label="Previous passage">${ico('prev',19)}</button><button class="mb-small mb-primary-play" data-action="play" aria-label="${reading.playing?'Pause':'Play'}">${ico(reading.playing?'pause':'play',23)}</button><button class="mb-small" data-action="next" aria-label="Next passage">${ico('next',19)}</button><label class="mb-field" style="width:81px">Speed<select class="mb-select" id="mb-rate" style="min-height:31px;padding:5px">${[.75,1,1.25,1.5,1.75,2].map(x=>`<option value="${x}" ${prefs.playbackRate===x?'selected':''}>${x}×</option>`).join('')}</select></label></div>
 <div class="mb-player-extra">${button('prepare',ico('wave',17),reading.preparing?'Preparing':'Prepare')}${button('export-mp3',ico('download',17),'MP3')}${button('export-text',ico('file',17),'Transcript')}${button('filter',ico('sliders',17),'Filter')}</div>
 <div class="mb-row"><button class="mb-small" data-action="stop">${ico('close',13)} Stop</button><button class="mb-small" data-action="reader-new">${ico('refresh',13)} Re-extract</button><button class="mb-small" data-action="minimize">${ico('minus',13)} Minimize</button></div></section>`;
}
function renderMini(){return `${head('Now playing')}<div class="mb-body"><p class="mb-muted">Passage ${reading.index+1} of ${reading.passages.length}</p><div class="mb-grid">${button('play',reading.playing?'❚❚':'▶',reading.playing?'Pause':'Play')}${button('next','⇥','Next passage')}${button('reader','▤','Full reader')}${button('menu','☰','All tools')}</div></div>`;}
function renderMedia(){state.siteMedia=mediaItems();const i=Math.min(state.mediaIndex,state.siteMedia.length-1),it=state.selectedMedia||state.siteMedia[Math.max(0,i)];return `${head('Media · '+siteName())}<div class="mb-body"><p class="mb-muted">Choose the currently displayed item, or select one directly on the webpage. Downloads require accessible direct files.</p><div class="mb-row"><strong>${state.siteMedia.length} detected items</strong><button class="mb-small" data-action="media-refresh">Refresh</button></div>${state.siteMedia.length?`<select id="mb-media" class="mb-select">${state.siteMedia.map((x,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(x.kind+' '+(j+1)+' · '+x.label)}</option>`).join('')}</select>`:''}${it?`<div class="mb-preview">${it.kind==='image'?`<img src="${esc(it.url)}" alt="Selected media preview">`:'<span>Video selected</span>'}</div><p class="mb-muted">${esc(it.kind)} · ${esc(it.url.slice(0,110))}</p>`:''}
 <div class="mb-grid">${button('media-picker','◎','Select on page')}${button('media-share','↗','Share file')}${button('media-download','⇩','Download file')}${button('media-open','↗','Open source')}</div></div>`;}
function renderMediaPicker(){return `${head('Tap page media')}<div class="mb-body"><p>Tap an image or video on the website. The tap will select it rather than open the post.</p>${button('media-cancel','×','Cancel selection')}</div>`;}
function render(){if(!host)return;const shadow=host.shadowRoot;const content=state.view==='menu'?renderMenu():state.view==='url'?renderURL():state.view==='filter'?renderFilter():state.view==='picker'?renderPicker():state.view==='rules'?renderRules():state.view==='speech'?renderSpeech():state.view==='reader'?renderReader():state.view==='mini'?renderMini():state.view==='media'?renderMedia():state.view==='media-picker'?renderMediaPicker():'';
 shadow.querySelector('.mb-launch').style.cssText=positionCSS();const panel=shadow.querySelector('.mb-panel');panel.hidden=!state.view;panel.className='mb-panel'+(state.view==='reader'?' reader':'');const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;panel.style.left=state.view==='reader'?`${vv?.offsetLeft||0}px`:`${(vv?.offsetLeft||0)+Math.max(10,w-Math.min(370,w-20)-12)}px`;panel.style.right='auto';panel.style.bottom=state.view==='reader'?'auto':`calc(env(safe-area-inset-bottom) + ${64+Math.max(0,innerHeight-(vv?.height||innerHeight)-(vv?.offsetTop||0))}px)`;panel.style.top=state.view==='reader'?`${vv?.offsetTop||0}px`:'auto';panel.style.height=state.view==='reader'?`${vv?.height||innerHeight}px`:'auto';panel.style.width=state.view==='reader'?`${w}px`:`${Math.min(370,w-20)}px`;if(panel.innerHTML!==content)panel.innerHTML=content;updateCount();}
