import {validateURL} from './urls.mjs';
import {pageRoots} from './nags.mjs';
const contextSelector='article,shreddit-post,[data-testid="tweet"],[data-testid="post-container"],[role="article"],figure';
const tidy=t=>String(t||'').replace(/\s+/g,' ').trim().slice(0,180);
function direct(raw,base){if(!raw)return null;try{return validateURL(raw,base).href;}catch{return null;}}
function context(node,document){
  const parent=node.closest(contextSelector)||node.getRootNode().host?.closest(contextSelector);
  const title=tidy(parent?.getAttribute('post-title')||parent?.querySelector('h1,h2,h3,[data-testid="tweetText"],figcaption')?.textContent||node.alt||node.getAttribute('aria-label')||document.title);
  return {parent,title:title||'Page media'};
}
/** Delivered DOM only; no private APIs, stream reconstruction or thumbnail URL guessing. */
export function discoverMedia(document,{selected=null}={}){
  const nodes=selected?[selected,...selected.querySelectorAll?.('img,video')||[]]:pageRoots(document).flatMap(root=>[...root.querySelectorAll('img,video')]);
  const found=new Map();let scanned=0;
  for(const node of nodes){if(++scanned>1500||!node.matches?.('img,video')||node.closest('[data-master-button],header,nav'))continue;
    if(node.matches('img')){if(node.closest('a[href*="/profile"],.avatar,[data-testid="Tweet-User-Avatar"]')||/avatar|profile (?:image|picture)|icon|logo/i.test(node.alt||''))continue;const w=node.naturalWidth||node.width,h=node.naturalHeight||node.height;if(w&&h&&w<90&&h<90)continue;}
    const {parent,title}=context(node,document),type=node.matches('video')?'video':'image';
    const raws=type==='video'?[node.currentSrc,node.src,...[...node.querySelectorAll('source')].map(s=>s.src)]:[node.currentSrc||node.src];
    const anchor=node.closest('a[href]');if(type==='image'&&anchor&&/\.(?:png|jpe?g|gif|webp|avif)(?:[?#]|$)/i.test(anchor.href))raws.unshift(anchor.href);
    const sources=[...new Set(raws.filter(Boolean).map(raw=>direct(raw,document.URL)).filter(Boolean))].map((url,index)=>({url,stream:/\.(m3u8|mpd)(?:$|\?)/i.test(url),label:type==='image'?(raws.length>1&&index===0?'Linked original':'Displayed image'):`Source ${index+1} · ${new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toUpperCase()||'Video'}`}));
    const primary=sources.find(s=>!s.stream)||sources[0];if(!primary||found.has(primary.url))continue;const {url,stream}=primary,u=new URL(url);
    found.set(url,{id:String(found.size),url,type,node,parent,title,label:title,sources,preview:type==='image'?direct(node.currentSrc||node.src,document.URL):direct(node.poster,document.URL),
      dimensions:(node.naturalWidth||node.videoWidth||node.width)&&(node.naturalHeight||node.videoHeight||node.height)?`${node.naturalWidth||node.videoWidth||node.width} × ${node.naturalHeight||node.videoHeight||node.height}`:'',host:u.host,stream});
  }
  return [...found.values()];
}
export class MediaPicker {
  constructor(document,onPick,onCancel){this.document=document;this.onPick=onPick;this.onCancel=onCancel;this.active=false;
    this.capture=e=>{if(e.target.closest?.('[data-master-button]'))return;e.preventDefault();e.stopImmediatePropagation();if(e.type!=='click')return;const target=e.composedPath().find(n=>n.matches?.('img,video'))||e.target.closest(contextSelector);this.stop();this.onPick(discoverMedia(document,{selected:target||e.target}));};
    this.key=e=>{if(e.key==='Escape'){this.stop();this.onCancel?.();}};
  }
  start(){this.stop();this.active=true;for(const type of ['pointerdown','pointerup','click'])this.document.defaultView.addEventListener(type,this.capture,true);this.document.defaultView.addEventListener('keydown',this.key,true);}
  stop(){this.active=false;for(const type of ['pointerdown','pointerup','click'])this.document.defaultView.removeEventListener(type,this.capture,true);this.document.defaultView.removeEventListener('keydown',this.key,true);}
}
export function mediaFilename(item,mime=''){
  const stem=item.title.replace(/[^\p{L}\p{N}._ -]/gu,'').trim().replace(/\s+/g,'-').slice(0,80)||'page-media';
  const ext=({'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/avif':'avif','video/mp4':'mp4','video/webm':'webm'})[mime.split(';')[0]]||new URL(item.url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]||(item.type==='video'?'mp4':'jpg');
  return `${stem}.${ext}`;
}
export async function downloadMedia(item,{gm,signal,onProgress=()=>{}}={}){
  if(item.stream)throw new Error('This is a streaming playlist. Use Open; a direct video file was not delivered.');
  if(!gm?.xmlHttpRequest)throw new Error('Extension requests are unavailable. Use Open to save from Safari.');
  const limit=80*1024*1024;let pending,tooLarge=false;
  pending=gm.xmlHttpRequest({method:'GET',url:validateURL(item.url).href,responseType:'blob',timeout:60000,onprogress:e=>{if(e.loaded>limit||e.total>limit){tooLarge=true;pending?.abort?.();}else onProgress(e.loaded,e.lengthComputable?e.total:null);}});
  const abort=()=>pending.abort?.();signal?.addEventListener('abort',abort,{once:true});
  try{const response=await pending;if(signal?.aborted){const e=new Error('Canceled');e.name='AbortError';throw e;}if(tooLarge)throw new Error('Media exceeds the 80 MB download limit. Use Open.');if(response.status<200||response.status>=300)throw new Error('The site did not allow this media download. Use Open.');
    const blob=response.response;if(!blob||typeof blob.arrayBuffer!=='function'||!blob.size||blob.size>limit||!new RegExp(`^${item.type}/`).test(blob.type))throw new Error('The site did not return a supported media file. Use Open.');return {blob,name:mediaFilename(item,blob.type)};
  }catch(e){if(tooLarge)throw new Error('Media exceeds the 80 MB download limit. Use Open.');if(signal?.aborted){e=new Error('Canceled');e.name='AbortError';}throw e;}finally{signal?.removeEventListener('abort',abort);}
}
