import test from'node:test';import assert from'node:assert/strict';import{JSDOM}from'jsdom';import{ScrollRecovery}from'../src/tools/scroll-recovery.mjs';import{otherDialogOpen}from'../src/tools/nags.mjs';
test('Mock scroll recovery releases fixed body, inner overflow, touch locks and restores owned styles',()=>{
 const dom=new JSDOM('<body style="position:fixed;top:-250px;height:100vh;overflow:hidden"><div id="react-root" style="overflow:hidden"><main><p>Delivered post</p></main></div></body>',{url:'https://x.com/a',pretendToBeVisual:true}),doc=dom.window.document;dom.window.scrollTo=()=>{};const recovery=new ScrollRecovery(doc,{allowed:()=>true});
 try{doc.body.inert=true;recovery.release();assert.equal(doc.body.inert,false);assert.equal(doc.body.style.position,'static');assert.equal(doc.body.style.height,'auto');assert.equal(doc.querySelector('#react-root').style.overflow,'auto');doc.body.style.setProperty('overflow','scroll','important');recovery.stop();assert.equal(doc.body.inert,true);assert.equal(doc.body.style.position,'fixed');assert.equal(doc.body.style.top,'-250px');assert.equal(doc.body.style.overflow,'scroll');assert.equal(doc.querySelector('#react-root').style.overflow,'hidden');}finally{recovery.stop();dom.window.close();}
});
test('Mock vertical swipe guard blocks later nag cancellation, allows default scrolling and preserves controls/horizontal gestures',()=>{
 const dom=new JSDOM('<main><p>Post</p><button>Site control</button></main>',{pretendToBeVisual:true}),doc=dom.window.document,recovery=new ScrollRecovery(doc,{allowed:()=>true});let blocked=0;doc.addEventListener('touchmove',e=>{blocked++;e.preventDefault();},{passive:false});recovery.release();
 const touch=(node,type,x,y)=>{const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{clientX:x,clientY:y}]});node.dispatchEvent(e);return e;};
 try{const p=doc.querySelector('p');touch(p,'touchstart',10,20);assert.equal(touch(p,'touchmove',10,21).defaultPrevented,false);assert.equal(touch(p,'touchmove',12,60).defaultPrevented,false);assert.equal(blocked,0);touch(p,'touchstart',10,20);touch(p,'touchmove',60,22);assert.equal(blocked,1);const b=doc.querySelector('button');touch(b,'touchstart',10,20);touch(b,'touchmove',12,60);assert.equal(blocked,2);recovery.stop();touch(p,'touchstart',10,20);assert.equal(touch(p,'touchmove',12,60).defaultPrevented,true);}finally{recovery.stop();dom.window.close();}
});
test('Reader scroll ownership pauses recovery without discarding underlying leases; hidden ancestor dialogs do not block recovery',()=>{
 const dom=new JSDOM('<body style="overflow:hidden"><main>Post</main><div style="display:none"><section role="dialog">Dormant dialog</section></div></body>',{pretendToBeVisual:true}),doc=dom.window.document,recovery=new ScrollRecovery(doc,{allowed:()=>true});
 try{assert.equal(otherDialogOpen(doc,[]),false);recovery.release();doc.body.setAttribute('data-mb-reader-lock','');doc.body.style.setProperty('overflow','hidden','important');recovery.release();assert.equal(doc.body.style.overflow,'hidden');doc.body.removeAttribute('data-mb-reader-lock');doc.body.style.setProperty('overflow','auto','important');recovery.release();recovery.stop();assert.equal(doc.body.style.overflow,'hidden');}finally{recovery.stop();dom.window.close();}
});
test('Recovery covers fixed HTML and every feed branch without touching unrelated page containers',()=>{
 const dom=new JSDOM('<html style="position:fixed;top:-140px;height:100vh;max-height:100vh;overflow:hidden"><body><main>First branch</main><section id="feed" style="overflow:clip;pointer-events:none;touch-action:pan-x pinch-zoom"><main>Second feed</main></section><aside style="overflow:hidden">Unrelated widget</aside></body></html>',{url:'https://x.com/a',pretendToBeVisual:true}),doc=dom.window.document,recovery=new ScrollRecovery(doc,{allowed:()=>true});dom.window.scrollTo=()=>{};
 try{recovery.release();assert.equal(doc.documentElement.style.position,'static');assert.equal(doc.documentElement.style.height,'auto');assert.equal(doc.querySelector('#feed').style.overflow,'auto');assert.equal(doc.querySelector('#feed').style.pointerEvents,'auto');assert.equal(doc.querySelector('#feed').style.getPropertyValue('touch-action'),'auto');assert.equal(doc.querySelector('aside').style.overflow,'hidden');
 recovery.stop();assert.equal(doc.documentElement.style.position,'fixed');assert.equal(doc.documentElement.style.top,'-140px');assert.equal(doc.querySelector('#feed').style.overflow,'clip');assert.equal(doc.querySelector('#feed').style.pointerEvents,'none');assert.equal(doc.querySelector('#feed').style.getPropertyValue('touch-action'),'pan-x pinch-zoom');
 }finally{recovery.stop();dom.window.close();}
});
test('Feed remounts and repeated locks are recovered without retaining detached ancestor leases',()=>{
 const dom=new JSDOM('<main>First</main><section id="feed" class="rpl-scroll-lock" style="overflow:hidden"><main>Feed</main></section>',{url:'https://www.reddit.com',pretendToBeVisual:true}),doc=dom.window.document,recovery=new ScrollRecovery(doc,{allowed:()=>true});
 try{const old=doc.querySelector('#feed');recovery.release();old.style.setProperty('overflow','clip','important');recovery.release();assert.equal(old.style.overflow,'auto');
 const next=old.cloneNode(true);next.style.overflow='hidden';old.replaceWith(next);recovery.release();assert.equal(next.style.overflow,'auto');assert.equal(recovery.styles.entries.has(old),false);assert.equal(recovery.classes.has(old),false);
 }finally{recovery.stop();dom.window.close();}
});
test('No recovery without an identified nag; an active deliberate dialog suspends every new lock override',()=>{
 const dom=new JSDOM('<html style="position:fixed"><body><main style="pointer-events:none;touch-action:pinch-zoom">Feed</main><section role="dialog" hidden>Compose</section></body></html>',{url:'https://x.com',pretendToBeVisual:true}),doc=dom.window.document;let nag=false;
 const recovery=new ScrollRecovery(doc,{allowed:()=>nag&&!otherDialogOpen(doc,[])});
 try{recovery.release();assert.equal(doc.documentElement.style.position,'fixed');nag=true;recovery.release();assert.equal(doc.documentElement.style.position,'static');
 doc.querySelector('[role=dialog]').hidden=false;recovery.release();assert.equal(recovery.active,false);assert.equal(doc.documentElement.style.position,'fixed');assert.equal(doc.querySelector('main').style.pointerEvents,'none');assert.equal(doc.querySelector('main').style.getPropertyValue('touch-action'),'pinch-zoom');
 }finally{recovery.stop();dom.window.close();}
});
test('Vertical guard leaves contenteditable and ARIA controls to the page and never captures pinch gestures',()=>{
 const dom=new JSDOM('<main><div contenteditable>Editor</div><div role="button">Control</div><p>Feed</p></main>',{pretendToBeVisual:true}),doc=dom.window.document,recovery=new ScrollRecovery(doc,{allowed:()=>true});let moves=0;doc.addEventListener('touchmove',()=>moves++);recovery.release();
 const touch=(node,type,touches)=>{const e=new dom.window.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:touches});node.dispatchEvent(e);};
 try{for(const selector of ['[contenteditable]','[role=button]']){const node=doc.querySelector(selector);touch(node,'touchstart',[{clientX:0,clientY:0}]);touch(node,'touchmove',[{clientX:0,clientY:30}]);}assert.equal(moves,2);
 touch(doc.querySelector('p'),'touchstart',[{clientX:0,clientY:0},{clientX:10,clientY:10}]);touch(doc.querySelector('p'),'touchmove',[{clientX:0,clientY:30},{clientX:10,clientY:40}]);assert.equal(moves,3);
 }finally{recovery.stop();dom.window.close();}
});
test('Inert attributes on feed ancestors are released and restored; later website ownership wins',()=>{
 const dom=new JSDOM('<section inert="" style="touch-action:pan-y pinch-zoom"><main>Feed</main></section>',{pretendToBeVisual:true}),doc=dom.window.document,node=doc.querySelector('section'),recovery=new ScrollRecovery(doc,{allowed:()=>true});
 try{recovery.release();assert.equal(node.hasAttribute('inert'),false);assert.equal(node.style.getPropertyValue('touch-action'),'pan-y pinch-zoom');recovery.pause();assert.equal(node.hasAttribute('inert'),true);
 recovery.release();node.setAttribute('inert','new-owner');recovery.stop();assert.equal(node.getAttribute('inert'),'new-owner');
 }finally{recovery.stop();dom.window.close();}
});
