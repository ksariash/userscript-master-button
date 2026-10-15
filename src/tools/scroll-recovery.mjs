import {OwnedStyles} from './owned-styles.mjs';
const controls = 'input,textarea,select,button,video,audio,canvas,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="button"],[role="textbox"],[role="combobox"],[draggable="true"],[data-master-button]';
/** Reversible recovery only while a recognized app nag is suppressed. */
export class ScrollRecovery {
  constructor(document,{allowed=()=>false}={}) {
    this.document=document;this.win=document.defaultView;this.allowed=allowed;
    this.styles=new OwnedStyles();this.classes=new Map();this.inert=new Map();
    this.active=false;this.start=null;this.restoredPosition=false;
    this.touchStart=e=>{if(this.listening)this.release();const t=e.touches?.[0];this.start=e.touches?.length===1&&t?{x:t.clientX,y:t.clientY}:null;};
    this.touchMove=e=>{
      if(!this.active||!this.start||e.touches?.length!==1||this.document.body.hasAttribute('data-mb-reader-lock'))return;
      if(!this.allowed()){this.pause();return;}
      const t=e.touches[0],dx=t.clientX-this.start.x,dy=t.clientY-this.start.y;
      if(!dy||Math.abs(dy)<=Math.abs(dx)||e.composedPath().some(n=>n.matches?.(controls)))return;
      // Protect native vertical scrolling from later document nag listeners.
      // Never preventDefault: pinch, controls and horizontal gestures stay native.
      // Earlier window listeners cannot be undone by a userscript.
      e.stopImmediatePropagation();
    };
  }
  targets() {
    const set=new Set([this.document.documentElement,this.document.body]);
    // X/Reddit can mount multiple main/feed branches. Inspect only their bounded
    // ancestor paths, never every fixed element or unrelated widget on the page.
    for(const main of this.document.querySelectorAll('main,[role="main"],shreddit-feed,#react-root')) {
      if(main.closest('[data-master-button]'))continue;
      for(let node=main;node&&node!==this.document.body&&set.size<24;node=node.parentElement)set.add(node);
      if(set.size>=24)break;
    }
    return set;
  }
  restoreAttributes(node) {
    const old=this.inert.get(node);
    if(old&&node.inert===false&&!node.hasAttribute('inert')) {
      if(old.value===undefined)delete node.inert;else node.inert=old.value;
      if(old.attribute!==null)node.setAttribute('inert',old.attribute);
    }
    this.inert.delete(node);
    for(const name of this.classes.get(node)||[])node.classList.add(name);
    this.classes.delete(node);
  }
  release() {
    // Reader owns its lock; retain our underlying leases until it closes.
    if(this.document.body.hasAttribute('data-mb-reader-lock')){this.active=false;return;}
    if(!this.allowed()){this.pause();return;}
    this.active=true;
    if(!this.listening){for(const[type,fn]of[['touchstart',this.touchStart],['touchmove',this.touchMove]])this.win.addEventListener(type,fn,{capture:true,passive:true});this.listening=true;}
    if(!this.watchdog)this.watchdog=this.win.setInterval(()=>{if(!this.document.hidden)this.release();},500);
    const targets=this.targets();
    this.styles.keepOnly(targets);
    for(const node of new Set([...this.classes.keys(),...this.inert.keys()]))if(!targets.has(node))this.restoreAttributes(node);
    let y=null;
    for(const node of targets) {
      const css=this.win.getComputedStyle(node);
      if(node.inert===true||node.hasAttribute('inert')) {
        if(!this.inert.has(node))this.inert.set(node,{value:node.inert,attribute:node.getAttribute('inert')});
        node.inert=false;node.removeAttribute('inert');
      }
      if((node===this.document.body||node===this.document.documentElement)&&css.position==='fixed') {
        const top=parseFloat(css.top);if(Number.isFinite(top)&&top<0)y=-top;
        this.styles.set(node,'position','static');this.styles.set(node,'height','auto');this.styles.set(node,'max-height','none');
      }
      for(const prop of ['overflow','overflow-y'])if(['hidden','clip'].includes(css.getPropertyValue(prop)))this.styles.set(node,prop,'auto');
      const touch=css.getPropertyValue('touch-action').trim();
      if(touch&&!['auto','manipulation'].includes(touch)&&!touch.split(/\s+/).includes('pan-y'))this.styles.set(node,'touch-action','auto');
      if(css.getPropertyValue('pointer-events')==='none')this.styles.set(node,'pointer-events','auto');
      for(const name of ['rpl-scroll-lock','scroll-is-blocked'])if(node.classList.contains(name)) {
        const classes=this.classes.get(node)||new Set();classes.add(name);this.classes.set(node,classes);node.classList.remove(name);
      }
    }
    if(y!==null&&!this.restoredPosition){this.restoredPosition=true;this.win.requestAnimationFrame?.(()=>{if(this.active)this.win.scrollTo(0,y);});}
  }
  pause() {
    this.active=false;this.start=null;this.styles.clear();
    for(const node of new Set([...this.classes.keys(),...this.inert.keys()]))this.restoreAttributes(node);
  }
  stop() {
    this.win.clearInterval(this.watchdog);this.watchdog=null;this.pause();this.restoredPosition=false;
    if(this.listening){this.win.removeEventListener('touchstart',this.touchStart,true);this.win.removeEventListener('touchmove',this.touchMove,true);this.listening=false;}
  }
}
