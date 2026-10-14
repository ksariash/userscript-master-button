import{OwnedStyles}from'./owned-styles.mjs';
const controls='input,textarea,select,button,video,audio,canvas,[contenteditable="true"],[role="slider"],[data-master-button]';
/** Reversible recovery only while a recognized app nag is suppressed. */
export class ScrollRecovery {
  constructor(document,{allowed=()=>false}={}){
    this.document=document;this.win=document.defaultView;this.allowed=allowed;this.styles=new OwnedStyles();this.classes=new Map();this.inert=new Map();this.active=false;this.start=null;this.restoredPosition=false;
    this.touchStart=e=>{if(this.listening)this.release();const t=e.touches?.[0];this.start=e.touches?.length===1&&t?{x:t.clientX,y:t.clientY}:null;};
    this.touchMove=e=>{if(!this.active||!this.start||e.touches?.length!==1||this.document.body.hasAttribute('data-mb-reader-lock'))return;if(!this.allowed()){this.pause();return;}const t=e.touches[0],dx=t.clientX-this.start.x,dy=t.clientY-this.start.y;if(!dy||Math.abs(dy)<=Math.abs(dx))return;if(e.composedPath().some(n=>n.matches?.(controls)))return;
      // Stop document-level nag lock listeners from canceling an ordinary vertical
      // swipe, including its first tiny movement: an earlier canceled move cannot
      // be uncanceled later. This listener never cancels default scrolling.
      e.stopImmediatePropagation();};
  }
  targets(){const set=new Set([this.document.documentElement,this.document.body]);const main=this.document.querySelector('main,[role="main"],shreddit-feed');for(let n=main;n&&n!==this.document.body&&set.size<12;n=n.parentElement)if(!n.closest('[data-master-button]'))set.add(n);return set;}
  release(){
    if(this.document.body.hasAttribute('data-mb-reader-lock')){this.active=false;return;}
    if(!this.allowed()){this.pause();return;}
    this.active=true;if(!this.listening){for(const[type,fn]of[['touchstart',this.touchStart],['touchmove',this.touchMove]])this.win.addEventListener(type,fn,{capture:true,passive:true});this.listening=true;}
    // A page can replace a stylesheet or lock the HTML root after cleanup.
    // Check only the scroll ancestors here; full nag discovery stays coalesced.
    if(!this.watchdog)this.watchdog=this.win.setInterval(()=>{if(!this.document.hidden)this.release();},500);
    let y=null;
    for(const node of this.targets()){
      const css=this.win.getComputedStyle(node);
      if(node.inert===true){if(!this.inert.has(node))this.inert.set(node,true);node.inert=false;}
      if(node===this.document.body&&css.position==='fixed'){const top=parseFloat(css.top);if(Number.isFinite(top)&&top<0)y=-top;this.styles.set(node,'position','static');this.styles.set(node,'height','auto');this.styles.set(node,'max-height','none');}
      for(const prop of['overflow','overflow-y'])if(['hidden','clip'].includes(css.getPropertyValue(prop)))this.styles.set(node,prop,'auto');
      if(css.getPropertyValue('touch-action')==='none')this.styles.set(node,'touch-action','auto');
      if(node===this.document.body&&css.getPropertyValue('pointer-events')==='none')this.styles.set(node,'pointer-events','auto');
      for(const name of['rpl-scroll-lock','scroll-is-blocked'])if(node.classList.contains(name)){const classes=this.classes.get(node)||new Set();classes.add(name);this.classes.set(node,classes);node.classList.remove(name);}
    }
    if(y!==null&&!this.restoredPosition){this.restoredPosition=true;this.win.requestAnimationFrame?.(()=>{if(this.active)this.win.scrollTo(0,y);});}
  }
  pause(){this.active=false;this.start=null;this.styles.clear();for(const[node,old]of this.inert)if(node.inert===false)node.inert=old;this.inert.clear();for(const[node,names]of this.classes)for(const name of names)node.classList.add(name);this.classes.clear();}
  stop(){this.win.clearInterval(this.watchdog);this.watchdog=null;this.pause();this.restoredPosition=false;if(this.listening){this.win.removeEventListener('touchstart',this.touchStart,true);this.win.removeEventListener('touchmove',this.touchMove,true);this.listening=false;}}
}
