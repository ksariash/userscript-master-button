let host=null,toastTimer=0,observer=null,observerTimer=0,lastLocation=location.href,ignoreClick=false;
const state={filterReview:false,filterPreview:false,selectionScore:null,whyIndex:-1,view:'',readerEditing:false,readerDraft:'',voices:[],siteMedia:[],mediaIndex:0,selectedMedia:null,selectMedia:false,pickerSelector:'',exporting:false,slashdotSimple:false,voicesRegion:'',voicesLoading:false,voicesError:'',voiceQuery:'',selectionText:'',selectionElement:null,selectionReason:'related',selectionMode:false};
const button=(action,icon,label,extra='')=>`<button type="button" data-action="${esc(action)}" class="mb-action" ${extra}><span aria-hidden="true">${icon}</span><span>${esc(label)}</span></button>`;
function notify(message){if(!host)return;const el=host.shadowRoot.querySelector('.mb-toast');if(!el)return;el.textContent=String(message);el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if(el.isConnected)el.hidden=true;},4500);}
async function shareURL(u){try{if(navigator.share){await navigator.share({url:u});return;}}catch(e){if(e.name==='AbortError')return;}await copyText(u);notify('Copied link.');}
async function copyText(v){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(v);return;}catch{}}if(typeof GM!=='undefined'&&typeof GM.setClipboard==='function'){await GM.setClipboard(v);return;}throw Error('No clipboard permission; use the URL editor to copy manually.');}
function openView(v){
 if(state.filterReview&&!['teach','select-text','picker','filter','why'].includes(v))endFilterReview();
 state.view=v;render();
}
function positionCSS(){const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;return `left:${Math.max(5,(vv?.offsetLeft||0)+w-56-Math.max(5,Math.min(w-66,prefs.position.right)))}px;top:${Math.max(5,(vv?.offsetTop||0)+(vv?.height||innerHeight)-56-Math.max(8,Math.min((vv?.height||innerHeight)-66,prefs.position.bottom)))}px;bottom:auto;right:auto;`;}
// Inline, consistent stroke icons; no external assets or webfonts.
const iconPaths={
 'share':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.1m-6.6 9 6.6 4"/>',
 'link':'<path d="m10 13 4-4"/><path d="M15 7h2a5 5 0 0 1 0 10h-3"/><path d="M9 17H7A5 5 0 0 1 7 7h3"/>',
 'headphones':'<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><rect x="2" y="13" width="5" height="8" rx="2"/><rect x="17" y="13" width="5" height="8" rx="2"/>',
 'filter':'<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="7" cy="7" r="1"/>',
 'sliders':'<path d="M4 6h7m4 0h5M4 12h2m4 0h10M4 18h11m4 0h1"/><circle cx="13" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 'wave':'<path d="M2 10v4m4-8v12m4-15v18m4-14v10m4-7v4m4-7v10"/>',
 'images':'<rect x="3" y="3" width="15" height="15" rx="2"/><path d="m3 14 4-4 4 4 3-3 4 4M8 7h.01M9 21h11a1 1 0 0 0 1-1V8"/>',
 'eye':'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
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

/* v0.1.2 compact iPhone design tokens: 44pt target, 7pt between groups,
   6/12pt gutters, separators instead of outlines, one obvious accent. */
.mb-panel{--fg:#1c2535;--muted:#6e7787;--bg:#f4f5f8;--surface:#fff;--tile:#fff;--bd:#e5e8ee;--accent:#386de7;--tint:#eef3ff;border-radius:19px;width:min(352px,calc(100vw - 24px));max-height:min(73dvh,560px);font-size:13px;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f6f7fb;--muted:#a4abba;--bg:#171a21;--surface:#232730;--tile:#232730;--bd:#333743;--accent:#a0bdff;--tint:#293a55;}}
.mb-head{padding:4px 8px;border-bottom:1px solid var(--bd);min-height:45px;}
.mb-head h2{font-size:15px;font-weight:680;letter-spacing:-.27px;}
.mb-icon-btn{height:42px;width:42px;border-radius:12px;background:transparent;padding:10px;}
.mb-brand{height:30px;width:30px;border-radius:10px;}
.mb-body{padding:9px 11px 11px;gap:7px;}
.mb-section{gap:5px;}.mb-section-title{font-size:10px;letter-spacing:.6px;}.mb-section-note{font-size:10px;}
.mb-tiles{gap:5px;}.mb-tile{min-height:59px;border-radius:12px;gap:3px;border-color:transparent;padding:6px 3px;}.mb-tile svg{height:19px;width:19px;}.mb-tile span{font-size:10.5px;}
.mb-compact-grid{gap:5px;}.mb-compact{border-color:transparent;border-radius:11px;min-height:44px;padding:7px 10px;font-size:12px;}
.mb-grid{gap:5px;}.mb-action{border-color:transparent;border-radius:11px;min-height:44px;padding:8px 11px;font-size:12.5px;font-weight:570;}
.mb-small{min-height:39px;font-size:12px;}
.mb-row{gap:6px;}.mb-rule{gap:6px;padding:9px;border-color:transparent;}
.mb-field{font-size:11px;gap:3px;}.mb-input,.mb-select,.mb-textarea{min-height:44px;background:var(--surface);border-color:var(--bd);border-radius:11px;padding:8px 11px;font-size:14px;}
.mb-settings-group{background:var(--surface);border-radius:13px;overflow:hidden;}
.mb-setting{display:flex;align-items:center;min-height:47px;gap:9px;padding:2px 11px;border-bottom:1px solid var(--bd);}
.mb-setting:last-child{border-bottom:0;}.mb-setting-label{font-weight:590;flex:0 0 90px;font-size:12.5px;}
.mb-setting-value{flex:1;min-width:0;}.mb-setting-value .mb-input,.mb-setting-value .mb-select{min-height:40px;border:0;border-radius:0;background:transparent;padding:6px 2px;text-align:right;font-size:13px;}
.mb-setting-value .mb-select{text-align-last:right;}.mb-setting .mb-small{flex:none;min-width:38px;min-height:40px;}
.mb-caption{color:var(--muted);font-size:11px;line-height:1.35;padding:1px 3px;}
.mb-kicker{font-size:10px;letter-spacing:.55px;text-transform:uppercase;font-weight:740;color:var(--muted);}
.mb-status{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);min-width:0;line-height:1.35;}
.mb-dot{width:7px;height:7px;border-radius:50%;background:#adb3bf;flex:none;}.mb-dot.ready{background:#28a36c;}.mb-dot.loading{background:#e9a63d;}.mb-dot.error{background:#d95c67;}
.mb-status-text{overflow-wrap:anywhere;min-width:0;}
.mb-minor{border:0;background:transparent;color:var(--accent);font-size:12px;min-height:40px;padding:4px 9px;font-weight:650;}
.mb-voice-search{border:0;border-bottom:1px solid var(--bd);background:transparent;width:100%;padding:9px 12px;min-height:41px;color:var(--fg);font-size:13px;outline:none;}
.mb-selection{display:grid;gap:6px;}.mb-selection blockquote{margin:0;padding:9px 11px;border-left:2px solid var(--accent);background:var(--surface);border-radius:8px;font-size:12px;max-height:84px;overflow:auto;}
.mb-fieldset{display:grid;gap:4px;}.mb-inline{display:flex;align-items:center;gap:4px;min-width:0;}
.mb-voice-status{font-size:10.5px;color:var(--muted);}
.mb-transcript{padding:6px 12px;}.mb-paragraph{padding:8px 0;line-height:1.5;}
.mb-controls{padding:7px 11px calc(8px + env(safe-area-inset-bottom));gap:6px;}
.mb-pill{border-radius:6px;}
@media(prefers-reduced-motion:no-preference){.mb-panel:not(.reader){animation:mb-in .15s cubic-bezier(.2,.8,.2,1);}@keyframes mb-in{from{opacity:.85;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}}
.mb-panel.view-speech .mb-body{gap:6px;padding:7px 10px 8px;}
.mb-panel.view-speech .mb-setting{min-height:44px;}
.mb-panel.view-speech .mb-row{min-height:36px;}
.mb-panel.view-speech .mb-caption{margin:0;}
/* 0.1.3 cohesive touch-first revision: one translucent sheet, grouped surfaces,
   quiet explanations, full-size gesture targets and stable reader layout. */
.mb-launch{width:56px;height:56px;border:0;background:transparent;box-shadow:none;color:#fff;font-size:23px;isolation:isolate;}
.mb-launch::before{content:"";position:absolute;inset:6px;background:rgba(29,35,48,.91);border:1px solid rgba(255,255,255,.22);border-radius:50%;box-shadow:0 4px 16px #0005;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);z-index:-1;}
.mb-launch-symbol{position:relative;pointer-events:none;}.mb-count{top:2px;right:2px;}
.mb-panel{--fg:#171b24;--muted:#667085;--bg:rgba(248,249,252,.96);--surface:rgba(255,255,255,.96);--tile:transparent;--bd:rgba(24,34,56,.10);--accent:#366be5;--tint:rgba(56,106,229,.08);width:min(352px,calc(100vw - 20px));border-radius:23px;border:1px solid rgba(255,255,255,.68);box-shadow:0 20px 70px #10172840,0 1px 8px #10172814;-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);overflow:auto;}
@media(prefers-color-scheme:dark){.mb-panel{--fg:#f4f6fa;--muted:#a1a8b7;--bg:rgba(24,28,36,.97);--surface:#282d38;--tile:transparent;--bd:rgba(255,255,255,.09);--accent:#a0baff;--tint:rgba(126,160,255,.14);border-color:#454957;}}
.mb-head{min-height:48px;padding:6px 10px;gap:8px;border-color:var(--bd);background:transparent;}
.mb-head h2{font-size:15px;font-weight:750;letter-spacing:-.35px;}
.mb-icon-btn{background:var(--surface);border-radius:13px;min-height:44px;min-width:44px;}
.mb-body{gap:10px;padding:10px 12px 11px;}
.mb-kicker,.mb-section-title{font-weight:720;font-size:10px;letter-spacing:.7px;}
.mb-tiles{gap:0;border-radius:15px;background:var(--surface);border:1px solid var(--bd);overflow:hidden;}
.mb-tile{min-height:66px;border:0;border-radius:0;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);background:transparent;gap:5px;}
.mb-tile:nth-child(3n){border-right:0;}.mb-tile:nth-last-child(-n+3){border-bottom:0;}.mb-tile:active{background:var(--tint);}
.mb-compact-grid{gap:0;border-radius:15px;overflow:hidden;border:1px solid var(--bd);background:var(--surface);}
.mb-compact{border:0;border-radius:0;min-height:46px;background:transparent;border-bottom:1px solid var(--bd);padding:9px 10px;}
.mb-compact:nth-child(odd){border-right:1px solid var(--bd);}.mb-compact:nth-last-child(-n+2){border-bottom:0;}
.mb-settings-group{border:1px solid var(--bd);border-radius:15px;background:var(--surface);overflow:hidden;}
.mb-setting{min-height:48px;padding:5px 11px;border-bottom:1px solid var(--bd);gap:7px;}
.mb-setting:last-child{border-bottom:0;}
.mb-select{border:0;background:transparent;max-width:100%;text-align:right;font-weight:600;}
.mb-voice-search{background:var(--surface);border:0;border-bottom:1px solid var(--bd);}
.mb-action{border-radius:13px;background:var(--surface);min-height:44px;}
.mb-semantic-status{display:flex;gap:8px;align-items:center;padding:10px 11px;border:1px solid var(--bd);border-radius:14px;background:var(--surface);flex-wrap:wrap;}
.mb-status-copy{display:grid;gap:2px;flex:1;}.mb-status-copy strong{font-size:12px;}.mb-status-copy small{color:var(--muted);font-size:10px;}.mb-warn{width:100%;font-size:11px;color:#cc7744;overflow-wrap:anywhere;}
.mb-action-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}.mb-strip-action{display:flex;justify-content:center;align-items:center;gap:5px;min-height:45px;background:var(--surface);border:1px solid var(--bd);border-radius:13px;color:var(--fg);font-size:11px;font-weight:650;}.mb-strip-action.selected{color:var(--accent);border-color:var(--accent);}
.mb-switch{min-width:50px;width:50px;height:32px;border:0;border-radius:18px;background:#c9cfda;position:relative;padding:3px;}
.mb-switch span{display:block;background:white;width:26px;height:26px;border-radius:50%;box-shadow:0 1px 3px #0003;transition:transform .16s;}.mb-switch.is-on{background:#366be5;}.mb-switch.is-on span{transform:translateX(18px);}
.mb-range-setting{min-height:35px;border:0;}.mb-range-setting label{font-weight:640;font-size:12px;}.mb-range-setting output{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:760;}
#mb-threshold,#mb-seed-threshold{width:calc(100% - 22px);margin:3px 11px 10px;accent-color:var(--accent);}
.mb-hint-row{display:flex;justify-content:space-between;color:var(--muted);font-size:10px;padding:0 4px;margin-top:-4px;}
.mb-score-card{padding:11px;background:var(--surface);border:1px solid var(--bd);border-radius:14px;}
.mb-score-header{display:flex;align-items:center;justify-content:space-between;}.mb-score-number{font:730 20px -apple-system,BlinkMacSystemFont,system-ui;color:var(--accent);font-variant-numeric:tabular-nums;}
.mb-score-bars{display:grid;gap:5px;margin:10px 0;}.mb-score-bars>div{display:flex;justify-content:space-between;align-items:center;gap:9px;color:var(--muted);font-size:11px;}.mb-score-bars b{color:var(--fg);font-variant-numeric:tabular-nums;}
.mb-selection{background:var(--surface);border:1px solid var(--bd);border-radius:14px;padding:10px;}.mb-selection blockquote{font-size:13px;line-height:1.5;max-height:26vh;overflow:auto;margin:5px 0 0;}
.mb-panel.reader{border-radius:0;background:var(--bg);}.mb-panel.reader .mb-head{min-height:50px;}.mb-transcript{padding:4px 15px 16px;scrollbar-width:thin;}
.mb-paragraph{gap:9px;padding:13px 0;line-height:1.55;border-color:var(--bd);}.mb-paragraph.current{background:var(--tint);margin:0 -9px;padding:13px 9px;}
.mb-paragraph.excluded{opacity:.55;}.mb-pass-toggle{width:44px;min-width:44px;height:44px;min-height:44px;border-radius:13px!important;background:var(--surface)!important;display:grid;place-items:center;color:var(--fg);}
.mb-pass-content{flex:1;min-width:0;}.mb-pass-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;margin:0 0 5px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;}
.mb-why-btn{font:650 10px -apple-system,BlinkMacSystemFont,system-ui;color:var(--accent)!important;border:0!important;display:inline-flex;align-items:center;gap:2px;min-height:36px!important;padding:4px 7px!important;background:transparent!important;}
.mb-pass-text{line-height:1.58;letter-spacing:-.1px;overflow-wrap:anywhere;}
.mb-controls{padding:8px 14px calc(10px + env(safe-area-inset-bottom));gap:7px;box-shadow:0 -5px 22px #00000008;}
.mb-timeline{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:680;color:var(--muted);font-variant-numeric:tabular-nums;}
.mb-timeline span:first-child,.mb-timeline span:last-child{min-width:46px;}.mb-timeline span:last-child{text-align:right;}.mb-timeline span:nth-child(2){font-weight:500;}
.mb-range{height:15px;margin:0;}.mb-player-extra .mb-action{background:var(--surface);border:1px solid var(--bd);}.mb-primary-play{border-radius:50%;height:48px;min-width:48px!important;}
@media(prefers-reduced-motion:reduce){.mb-switch span{transition:none;}}

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
function semanticStatus(){const n=vectorsForSite().length;
 const active=filterEnabled()&&prefs.semanticAuto;
 const status=semantic.status==='ready'?'On-device MiniLM ready':semantic.status==='loading'?'Loading on-device model':semantic.status==='error'?'Model could not load':active?'Waiting to start':'Semantic filter paused';
 const detail=semantic.status==='error'?`<div class="mb-warn">${esc(semantic.lastError||semantic.detail)}</div>`:'';
 return `<div class="mb-semantic-status"><span class="mb-dot ${esc(semantic.status)}"></span><div class="mb-status-copy"><strong>${esc(status)}</strong><small>${n} taught examples · ${semantic.scanned} blocks scanned</small></div>${detail}</div>`;
}
function formatScore(s){return Number.isFinite(s)&&s>=0?s.toFixed(2):'—';}
function renderScoreDetails(a){
 if(!a)return '<p class="mb-caption">No analysis yet. The local model must load before scores become available.</p>';
 if(a.model!=='MiniLM')return `<p class="mb-caption">${esc(a.reason||'Waiting for a local model.')} · ${esc(a.source||a.model)}. No local model similarity score is available.</p>`;
 return `<div class="mb-score-header"><strong>${a.excluded?'Excluded':'Kept'}</strong><span class="mb-score-number">${formatScore(a.score)}</span></div>
 <div class="mb-score-bars"><div><span>Learned skip match</span><b>${formatScore(a.skipScore)}</b></div><div><span>Learned keep match</span><b>${formatScore(a.keepScore)}</b></div><div><span>Built-in nuisance match</span><b>${formatScore(a.seedScore)}</b></div></div>
 <p class="mb-caption">${esc(a.reason)} · ${esc(a.source)}. Learned threshold ${Number(a.threshold).toFixed(2)}; built-in threshold ${Number(a.seedThreshold).toFixed(2)}. Similarity is not a probability.</p>`;
}
function renderFilter(){return `${head('Filter')}<div class="mb-body mb-filter-view">
 <div class="mb-settings-group"><div class="mb-setting"><span class="mb-setting-label">Filter this site</span><span class="mb-setting-value">${filterEnabled()?'Active':'Off'}</span><button class="mb-switch ${filterEnabled()?'is-on':''}" role="switch" aria-checked="${filterEnabled()}" aria-label="Filter this site" data-action="filter-toggle"><span></span></button></div>
 <div class="mb-setting"><span class="mb-setting-label">Local AI</span><span class="mb-setting-value">${prefs.semanticAuto?'Automatic':'Off'}</span><button class="mb-switch ${prefs.semanticAuto?'is-on':''}" role="switch" aria-checked="${prefs.semanticAuto}" aria-label="Enable local semantic filter" data-action="semantic-toggle"><span></span></button></div></div>
 ${semanticStatus()}
 <div class="mb-action-strip"><button data-action="filter-preview" class="mb-strip-action ${state.filterReview?'selected':''}">${ico('eye',17)} <span>${state.filterReview?'End preview':'Show all'}</span></button><button data-action="select-phrase" class="mb-strip-action">${ico('pointer',17)} <span>Teach</span></button><button data-action="pick-filter" class="mb-strip-action">${ico('filter',17)} <span>Pick</span></button></div>
 <div class="mb-settings-group"><div class="mb-setting mb-range-setting"><label for="mb-threshold">Learned match sensitivity</label><output id="mb-threshold-value">${Number(prefs.semanticThreshold??.79).toFixed(2)}</output></div><input type="range" id="mb-threshold" min="0.60" max="0.96" step="0.01" value="${prefs.semanticThreshold??.79}" aria-label="Learned match threshold"></div>
 <div class="mb-hint-row"><span>Lower = filters more</span><span>Higher = safer</span></div>
 <div class="mb-row"><button data-action="semantic-load" class="mb-minor">${ico('refresh',14)} ${semantic.status==='ready'?'Rescan':'Retry model'}</button><button data-action="rules" class="mb-minor">Rules & scores ${ico('chevron',14)}</button></div>
 <p class="mb-caption">${state.filterReview?'All filtered elements are visible for inspection. Tap End preview to reapply your rules.':'Corrections on the page or in the reader train the same local classifier.'}</p>
 </div>`;}
function renderTeach(){return `${head('Teach filter')}<div class="mb-body">
 <div class="mb-selection"><span class="mb-kicker">Selected words</span><blockquote>${esc(state.selectionText||'Select text from the article to teach.')}</blockquote></div>
 <div class="mb-settings-group"><div class="mb-setting"><label class="mb-setting-label" for="mb-reason">Reason</label><div class="mb-setting-value"><select id="mb-reason" class="mb-select">${Object.entries(semanticCategories).filter(([k])=>k!=='article').map(([key,label])=>`<option value="${esc(key)}" ${state.selectionReason===key?'selected':''}>${esc(label)}</option>`).join('')}</select></div></div></div>
 <div class="mb-grid">${button('teach-skip',ico('close',16),'Skip like this')}${button('teach-keep',ico('check',16),'Keep like this')}</div>
 ${state.selectionScore?`<div class="mb-score-card">${renderScoreDetails(state.selectionScore)}</div>`:''}
 ${semanticStatus()}<p class="mb-caption">Page content is visible while teaching; nearby previously hidden passages are included as context for the new example. Only embeddings are saved.</p>
 <button data-action="select-phrase" class="mb-minor">Change selected text</button></div>`;}
function renderWhy(){const p=reading.passages[state.whyIndex];return `${head('Why this passage?')}<div class="mb-body"><div class="mb-selection"><span class="mb-kicker">${p?.excluded?'Excluded':'Included'} · passage ${(state.whyIndex||0)+1}</span><blockquote>${esc(p?.text||'')}</blockquote></div>
 <div class="mb-score-card">${renderScoreDetails(p?.analysis)}</div><div class="mb-row">${button('pass-toggle:'+state.whyIndex,ico('check',17),p?.excluded?'Include this':'Skip this')}${button('pass-analyze:'+state.whyIndex,ico('refresh',17),'Analyze again')}</div>
 ${button('filter',ico('sliders',16),'Filter thresholds')}</div>`;}
function renderSelectText(){return `${head('Select text')}<div class="mb-body"><p class="mb-caption">Long-press and highlight a phrase on the webpage. Then tap ✦ or “Use selection”. Do not select entire articles.</p>${button('selection-use',ico('check',17),'Use highlighted text')}${button('teach-skip',ico('minus',17),'Skip cached selection')}</div>`;}
function renderPicker(){return `${head('Select nuisance element')}<div class="mb-body"><p>Tap an unwanted element on the webpage. Its matching elements will be outlined before you save anything.</p><div class="mb-rule"><strong>${esc(state.pickerSelector||'No element selected')}</strong><span class="mb-muted">${pickerMatches.length} matching elements highlighted</span>${pickerMatches.length?`<div class="mb-grid">${button('preview',preview?'◉':'◎',preview?'Undo preview':'Preview hiding')}${button('picker-save','✓','Save rule')}</div>${button('picker-next','↓','Show next match')}`:''}</div>${button('picker-cancel','×','Cancel and restore')}</div>`;}
function renderRules(){const rules=prefs.rules[domainKey()]||[];return `${head('Rules & learning')}<div class="mb-body">
 ${semanticStatus()}<div class="mb-grid">${button('select-phrase',ico('pointer',17),'Teach text')}${button('pick-filter',ico('filter',17),'Visual rule')}</div>
 ${rules.length?rules.map((r,i)=>`<div class="mb-rule"><strong>${esc(r.selector)}</strong><span class="mb-muted">${safeMatches(r.selector).length} matches · ${r.enabled?'Enabled':'Disabled'}</span><div class="mb-grid">${button('rule-toggle:'+i,r.enabled?'✓':'○',r.enabled?'Disable':'Enable')}${button('rule-edit:'+i,'✎','Edit')}${button('rule-delete:'+i,'⌫','Delete')}</div></div>`).join(''):'<p class="mb-caption">No CSS rules yet. Phrase learning does not require CSS selectors.</p>'}
 <div class="mb-settings-group"><div class="mb-setting mb-range-setting"><label for="mb-seed-threshold">Built-in nuisance sensitivity</label><output id="mb-seed-threshold-value">${Number(prefs.semanticSeedThreshold??0.89).toFixed(2)}</output></div><input type="range" id="mb-seed-threshold" min="0.70" max="0.98" step="0.01" value="${prefs.semanticSeedThreshold??0.89}"></div>
 <div class="mb-settings-group"><div class="mb-setting"><span class="mb-setting-label">Token fallback</span><span class="mb-setting-value">${prefs.learningEnabled?.[domainKey()]===false?'Off':'On'}</span><button class="mb-minor" data-action="learning-toggle">Toggle</button></div>
 <div class="mb-setting"><span class="mb-setting-label">Learning</span><span class="mb-setting-value">${vectorsForSite().length} examples</span><button class="mb-minor" data-action="semantic-reset">Reset</button></div></div>
 <p class="mb-caption">Only your explicit selections and transcript Skip/Keep choices train the filter. No page histories are saved.</p></div>`;}
const azureRegions=[['australiaeast','Australia East'],['brazilsouth','Brazil South'],['canadacentral','Canada Central'],['canadaeast','Canada East'],['centralindia','Central India'],['centralus','Central US'],['eastasia','East Asia'],['eastus','East US'],['eastus2','East US 2'],['francecentral','France Central'],['germanywestcentral','Germany West Central'],['italynorth','Italy North'],['japaneast','Japan East'],['japanwest','Japan West'],['koreacentral','Korea Central'],['northcentralus','North Central US'],['northeurope','North Europe'],['norwayeast','Norway East'],['qatarcentral','Qatar Central'],['southafricanorth','South Africa North'],['southcentralus','South Central US'],['southeastasia','Southeast Asia'],['swedencentral','Sweden Central'],['switzerlandnorth','Switzerland North'],['switzerlandwest','Switzerland West'],['uaenorth','UAE North'],['uksouth','UK South'],['ukwest','UK West'],['westcentralus','West Central US'],['westeurope','West Europe'],['westus','West US'],['westus2','West US 2'],['westus3','West US 3']];
function voiceOptions(){const chosen=prefs.azure.voice,list=state.voicesRegion===prefs.azure.region?state.voices:[];if(!list.length)return `<option value="${esc(chosen)}">${esc(chosen)} · load voices below</option>`;return list.map(v=>`<option value="${esc(v.id)}" ${v.id===chosen?'selected':''}>${esc(v.label)}</option>`).join('');}
function renderSpeech(){const count=state.voicesRegion===prefs.azure.region?state.voices.length:0;return `${head('Speech')}<div class="mb-body">
 <span class="mb-kicker">Azure resource</span><div class="mb-settings-group">
 <div class="mb-setting"><label class="mb-setting-label" for="mb-key">API key</label><div class="mb-setting-value"><input class="mb-input" id="mb-key" type="password" autocomplete="off" placeholder="${azureKey?'Saved · replace key':'Enter key'}"></div></div>
 <div class="mb-setting"><label class="mb-setting-label" for="mb-region">Region</label><div class="mb-setting-value"><select id="mb-region" class="mb-select">${azureRegions.map(([v,t])=>`<option value="${v}" ${prefs.azure.region===v?'selected':''}>${esc(t)}</option>`).join('')}</select></div></div></div>
 <div class="mb-row"><button class="mb-minor" data-action="speech-forget">Forget key</button><button class="mb-small" data-action="speech-save">${ico('check',16)} Save & load voices</button></div>
 <span class="mb-kicker">Voice ${count?'· '+count+' available':''}</span><div class="mb-settings-group">
 <input class="mb-voice-search" type="search" id="mb-voice-search" placeholder="Search language or voice" aria-label="Search loaded voices">
 <div class="mb-setting"><label class="mb-setting-label" for="mb-voice">Voice</label><div class="mb-setting-value"><select class="mb-select" id="mb-voice">${voiceOptions()}</select></div><button class="mb-small" aria-label="Hear selected voice" data-action="speech-demo">${ico('play',17)}</button></div>
 <div class="mb-setting"><label class="mb-setting-label" for="mb-quality">MP3 quality</label><div class="mb-setting-value"><select class="mb-select" id="mb-quality"><option value="compact" ${prefs.azure.quality==='compact'?'selected':''}>48 kbps · compact</option><option value="high" ${prefs.azure.quality==='high'?'selected':''}>96 kbps · high</option></select></div></div></div>
 <div class="mb-row"><span class="mb-voice-status">${esc(state.voicesLoading?'Loading voices…':state.voicesError|| (count?count+' voices ready':'Save key and region to load voices'))}</span><button class="mb-minor" data-action="speech-voices">${ico('refresh',15)} Reload</button></div>
 <p class="mb-caption">Key stays in extension storage. Enabled narration text is sent directly to Azure.</p></div>`;}
function renderReader(){
 const total=reading.passages.length,ready=reading.passages.filter(p=>p.blob&&!p.excluded).length,enabled=enabledIndices().length;
 const editor=state.readerEditing?`<div class="mb-body"><textarea class="mb-textarea" style="min-height:42dvh" id="mb-reader-edit">${esc(state.readerDraft)}</textarea>${button('reader-save','✓','Use edited text')}${button('reader-abort','×','Cancel editing')}</div>`:`<div class="mb-transcript" data-transcript>${total?reading.passages.map((p,i)=>`<div class="mb-paragraph ${p.excluded?'excluded':''} ${i===reading.index?'current':''}" data-pass="${i}"><button class="mb-pass-toggle" type="button" data-action="pass-toggle:${i}" aria-label="${p.excluded?'Include':'Skip'} passage ${i+1}">${ico(p.excluded?'check':'close',18)}</button><div class="mb-pass-content"><div class="mb-pass-meta"><span>${String(i+1).padStart(2,'0')} · ${esc(p.excluded?'Skipped':p.status==='ready'?'Ready':'Included')}</span><button type="button" data-action="pass-why:${i}" class="mb-why-btn">${esc(p.analysis?.model==='MiniLM'?formatScore(p.analysis.score):'Why?')} ${ico('chevron',12)}</button></div><div class="mb-pass-text" style="font-size:${prefs.fontSize}px" data-action="pass-play:${i}">${esc(p.text)}</div></div></div>`).join(''):'<p>No article found. Tap Edit text to paste something to narrate.</p>'}</div>`;
 return `${head('Article reader')}<div class="mb-body" style="flex:none;padding-bottom:5px"><div class="mb-row"><span class="mb-muted">${ready}/${enabled} ready${reading.preparing?' · Preparing…':''}</span><button class="mb-small" data-action="reader-edit">${ico('file',14)} Edit text</button></div></div>${editor}
 <section class="mb-controls"><div class="mb-timeline"><span data-audio-now>0:00</span><span data-audio-segments>${reading.index+1}/${reading.passages.length} passages</span><span data-audio-total>—:—</span></div><input data-audio-seek type="range" class="mb-range" value="0" min="0" max="100" step=".1" aria-label="Seek within current passage"/><div class="mb-player-row"><button class="mb-small" data-action="prev" aria-label="Previous passage">${ico('prev',19)}</button><button class="mb-small mb-primary-play" data-action="play" aria-label="${reading.playing?'Pause':'Play'}">${ico(reading.playing?'pause':'play',23)}</button><button class="mb-small" data-action="next" aria-label="Next passage">${ico('next',19)}</button><label class="mb-field" style="width:81px">Speed<select class="mb-select" id="mb-rate" style="min-height:31px;padding:5px">${[.75,1,1.25,1.5,1.75,2].map(x=>`<option value="${x}" ${prefs.playbackRate===x?'selected':''}>${x}×</option>`).join('')}</select></label></div>
 <div class="mb-player-extra">${button('prepare',ico('wave',17),reading.preparing?'Preparing':'Prepare')}${button('export-mp3',ico('download',17),'MP3')}${button('export-text',ico('file',17),'Transcript')}${button('filter',ico('sliders',17),'Filter')}</div>
 <div class="mb-row"><button class="mb-small" data-action="stop">${ico('close',13)} Stop</button><button class="mb-small" data-action="reader-new">${ico('refresh',13)} Re-extract</button><button class="mb-small" data-action="minimize">${ico('minus',13)} Minimize</button></div></section>`;
}
function renderMini(){return `${head('Now playing')}<div class="mb-body"><p class="mb-muted">Passage ${reading.index+1} of ${reading.passages.length}</p><div class="mb-grid">${button('play',reading.playing?'❚❚':'▶',reading.playing?'Pause':'Play')}${button('next','⇥','Next passage')}${button('reader','▤','Full reader')}${button('menu','☰','All tools')}</div></div>`;}
function renderMedia(){state.siteMedia=mediaItems();const i=Math.min(state.mediaIndex,state.siteMedia.length-1),it=state.selectedMedia||state.siteMedia[Math.max(0,i)];return `${head('Media · '+siteName())}<div class="mb-body"><p class="mb-muted">Choose the currently displayed item, or select one directly on the webpage. Downloads require accessible direct files.</p><div class="mb-row"><strong>${state.siteMedia.length} detected items</strong><button class="mb-small" data-action="media-refresh">Refresh</button></div>${state.siteMedia.length?`<select id="mb-media" class="mb-select">${state.siteMedia.map((x,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(x.kind+' '+(j+1)+' · '+x.label)}</option>`).join('')}</select>`:''}${it?`<div class="mb-preview">${it.kind==='image'?`<img src="${esc(it.url)}" alt="Selected media preview">`:'<span>Video selected</span>'}</div><p class="mb-muted">${esc(it.kind)} · ${esc(it.url.slice(0,110))}</p>`:''}
 <div class="mb-grid">${button('media-picker','◎','Select on page')}${button('media-share','↗','Share file')}${button('media-download','⇩','Download file')}${button('media-open','↗','Open source')}</div></div>`;}
function renderMediaPicker(){return `${head('Tap page media')}<div class="mb-body"><p>Tap an image or video on the website. The tap will select it rather than open the post.</p>${button('media-cancel','×','Cancel selection')}</div>`;}
function render(){if(!host)return;const shadow=host.shadowRoot;const content=state.view==='menu'?renderMenu():state.view==='url'?renderURL():state.view==='filter'?renderFilter():state.view==='teach'?renderTeach():state.view==='why'?renderWhy():state.view==='select-text'?renderSelectText():state.view==='picker'?renderPicker():state.view==='rules'?renderRules():state.view==='speech'?renderSpeech():state.view==='reader'?renderReader():state.view==='mini'?renderMini():state.view==='media'?renderMedia():state.view==='media-picker'?renderMediaPicker():'';
 shadow.querySelector('.mb-launch').style.cssText=positionCSS();const panel=shadow.querySelector('.mb-panel');panel.hidden=!state.view;panel.className='mb-panel'+(state.view==='reader'?' reader':'')+' view-'+state.view;const vv=window.visualViewport,w=vv?.width||document.documentElement?.clientWidth||innerWidth;panel.style.left=state.view==='reader'?`${vv?.offsetLeft||0}px`:`${(vv?.offsetLeft||0)+Math.max(10,w-Math.min(352,w-24)-12)}px`;panel.style.right='auto';const launchBox=shadow.querySelector('.mb-launch').getBoundingClientRect();
 const below=launchBox.top<Math.min(340,(vv?.height||innerHeight)*0.42);
 if(state.view==='reader'){panel.style.top=`${vv?.offsetTop||0}px`;panel.style.bottom='auto';panel.style.maxHeight='100dvh';}
 else if(below){panel.style.top=`${launchBox.bottom+10}px`;panel.style.bottom='auto';panel.style.maxHeight=`${Math.max(140,(vv?.height||innerHeight)-launchBox.bottom-24)}px`;}
 else {panel.style.top='auto';panel.style.bottom=`${Math.max(14,innerHeight-launchBox.top+10)}px`;panel.style.maxHeight=`${Math.max(140,launchBox.top-24)}px`;}
panel.style.height=state.view==='reader'?`${vv?.height||innerHeight}px`:'auto';panel.style.width=state.view==='reader'?`${w}px`:`${Math.min(352,w-24)}px`;if(panel.innerHTML!==content){
  // Preserve reader scroll and focused passage even when applying Skip/Keep or playing audio.
  const oldTranscript=panel.querySelector('[data-transcript]');
  const savedScroll=oldTranscript?.scrollTop;
  const hadTranscript=!!oldTranscript&&state.view==='reader'&&!state.readerEditing;
  const savedFocus=shadow.activeElement?.getAttribute?.('data-action');
  panel.innerHTML=content;
  if(hadTranscript){const next=panel.querySelector('[data-transcript]');if(next)next.scrollTop=savedScroll;}
  if(savedFocus?.startsWith('pass-')&&state.view==='reader')panel.querySelector(`[data-action="${savedFocus}"]`)?.focus({preventScroll:true});
 }
 if(state.view==='reader')updateAudioProgress();updateCount();}
