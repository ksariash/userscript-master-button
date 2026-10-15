import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {SiteUtilities,siteActions} from '../src/tools/sites.mjs';import {SourceInventory} from '../src/core/source.mjs';import {DecisionStore} from '../core/decisions.mjs';import {discoverMedia,MediaPicker,downloadMedia} from '../src/tools/media.mjs';import {parseVoices} from '../src/speech/voices.mjs';
const wait=()=>new Promise(r=>setTimeout(r,180));
const xNag='<div data-testid="sheetDialog"><div class="backdrop"></div><section role="dialog"><h2>Get the full app experience</h2><p>Unlock more features and see what people are talking about right now.</p><button>Open X</button></section></div>';
const redditNag='<div class="rpl-bottom-sheet"><h2>Get the app to keep using Reddit</h2><p>Search better, personalize your feed, and never miss an update on your favorite communities.</p><button>Get the Reddit App</button></div>';
function fixture(html,url){const dom=new JSDOM('<!doctype html><title>Site</title>'+html,{url,pretendToBeVisual:true}),inventory=new SourceInventory(dom.window.document),store=new DecisionStore(inventory.scan());const tools=new SiteUtilities(dom.window.document,{store});return {dom,store,tools};}
test('Screenshot-derived X nag: whole sheet/backdrop removed, one shared exclusion and Keep restores it',()=>{
 const s=fixture('<main><article><p>An article discusses “Get the full app experience” and Open X without being a nag.</p></article></main>'+xNag,'https://x.com/example');
 try{s.tools.startCleanup();const sheet=s.dom.window.document.querySelector('[data-testid=sheetDialog]');assert.equal(sheet.style.display,'none');assert.equal(s.tools.count,1);assert.ok(s.store.snapshot().passages.some(p=>p.text.startsWith('An article')));assert.ok(!s.store.snapshot().passages.some(p=>p.text==='Get the full app experience'));
 const p=[...s.store.records.values()].find(p=>p.originalText==='Get the full app experience');s.store.correct(p.id,'ARTICLE');assert.equal(sheet.style.display,'');assert.equal(s.store.resolve(p.id).included,true);assert.equal(s.store.siteExclusions.size,0);assert.equal(s.store.examples.size,0);
 }finally{s.tools.stop();s.dom.window.close();}
});
test('Screenshot-derived Reddit nag: repeat insertions, CSS lock release and exact Undo; unrelated dialog remains locked',async()=>{
 const s=fixture('<main><p>Already delivered post remains.</p></main>'+redditNag,'https://www.reddit.com/r/whatisit/');
 try{const body=s.dom.window.document.body;body.style.overflow='hidden';body.classList.add('rpl-scroll-lock');s.tools.startCleanup();assert.equal(body.style.overflow,'auto');assert.equal(body.classList.contains('rpl-scroll-lock'),false);
 body.insertAdjacentHTML('beforeend',redditNag);await wait();assert.equal(s.tools.count,2);assert.ok([...body.querySelectorAll('.rpl-bottom-sheet')].every(n=>n.style.display==='none'));
 body.insertAdjacentHTML('beforeend','<section role="dialog"><h2>Confirm account change</h2><button>Cancel</button></section>');body.style.setProperty('overflow','hidden','important');await wait();assert.equal(body.style.overflow,'hidden');assert.equal(body.querySelector('[role=dialog]').style.display,'');
 s.tools.undo();assert.equal(s.tools.cleanupEnabled,false);assert.ok([...body.querySelectorAll('.rpl-bottom-sheet')].every(n=>n.style.display===''));assert.equal(body.style.getPropertyPriority('overflow'),'important');assert.equal(s.store.siteExclusions.size,0);
 }finally{s.tools.stop();s.dom.window.close();}
});
test('Nag cleanup sees open shadow content, closes native dialogs and leaves other hosts/consent/auth dialogs alone',()=>{
 const s=fixture('<main><p>Post</p></main><dialog open><h2>Get the full app experience</h2><button>Open X</button></dialog><div id="shadow"></div>','https://x.com/example');
 try{const dialog=s.dom.window.document.querySelector('dialog');let closed=0;dialog.close=()=>{closed++;dialog.removeAttribute('open');};dialog.showModal=()=>dialog.setAttribute('open','');s.tools.startCleanup();assert.equal(closed,1);s.tools.undo();assert.equal(dialog.hasAttribute('open'),true);
 const shadow=s.dom.window.document.querySelector('#shadow').attachShadow({mode:'open'});shadow.innerHTML='<section role="dialog"><h2>Get the full app experience</h2><button>Open X</button></section>';s.tools.startCleanup();assert.equal(shadow.querySelector('section').style.display,'none');
 }finally{s.tools.stop();s.dom.window.close();}
 const other=fixture(xNag+'<section role="dialog"><h2>Cookie preferences</h2><button>Reject</button></section>','https://example.org/');try{assert.equal(other.tools.startCleanup(),0);assert.equal(other.dom.window.document.querySelector('[role=dialog]').style.display,'');}finally{other.tools.stop();other.dom.window.close();}
});
test('Slashdot current markup: story-only source reading, punctuation pager and encoded search',()=>{
 const s=fixture('<nav>Site navigation</nav><article class="article"><h2><span class="story-title"><a href="/story/a">Story A</a></span></h2><div class="body"><div id="text-1">Original story <a href="https://source.example">source</a> wording.</div></div><footer>Share comments</footer></article><a href="/?issue=20261013&amp;page=1">Older »</a><aside>Top deals</aside>','https://slashdot.org/');
 try{assert.ok(s.tools.slashdotReading()>1);assert.equal(s.store.reading().map(p=>p.originalText).join(' '),'Story A Original story source wording.');assert.equal(s.tools.olderStories(),'https://slashdot.org/?issue=20261013&page=1');assert.equal(new URL(s.tools.slashdotSearch('C++ & Linux')).searchParams.get('fhfilter'),'C++ & Linux');assert.throws(()=>s.tools.slashdotSearch(' '));assert.ok(siteActions('https://news.slashdot.org/story/x').some(a=>a.id==='slashdot-search'));}finally{s.tools.stop();s.dom.window.close();}
});
test('Media discovery: post titles/thumbnails, direct originals, video sources, avatar and restricted URL exclusions',()=>{
 const dom=new JSDOM('<title>Feed</title><article data-testid="tweet"><div data-testid="tweetText">A useful post title</div><img alt="Profile image" src="/avatar.jpg"><a href="https://media.example/original.jpg"><img width="500" height="300" src="https://media.example/preview.jpg"></a><video poster="https://media.example/poster.jpg"><source src="https://media.example/clip.mp4"><source src="https://media.example/stream.m3u8"></video><img src="javascript:alert(1)"></article>',{url:'https://x.com/a'});
 try{const list=discoverMedia(dom.window.document);assert.equal(list.length,2);assert.equal(list[0].title,'A useful post title');assert.equal(list[0].url,'https://media.example/original.jpg');assert.equal(list[0].preview,'https://media.example/preview.jpg');assert.ok(list.some(m=>m.type==='video'&&m.preview.endsWith('poster.jpg')));assert.ok(list.some(m=>m.sources.some(s=>s.stream)));assert.ok(!list.some(m=>/avatar|javascript/.test(m.url)));}finally{dom.window.close();}
});
test('Media picking stops previously registered link delegation and cancel detaches interception',()=>{
 const dom=new JSDOM('<a href="/target"><img width="500" height="300" src="/image.jpg" alt="Chosen picture"></a>',{url:'https://example.org'});let links=0,picked;dom.window.document.addEventListener('click',()=>links++);const picker=new MediaPicker(dom.window.document,items=>picked=items);
 try{picker.start();dom.window.document.querySelector('img').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(links,0);assert.equal(picked[0].title,'Chosen picture');assert.equal(picker.active,false);picker.start();picker.stop();dom.window.document.querySelector('img').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(links,1);}finally{picker.stop();dom.window.close();}
});
test('Blob-backed X players remain browsable; only matching delivered resources attach, with highest-resolution direct file first',()=>{
 const dom=new JSDOM('<title>Feed</title><article data-testid="tweet"><div data-testid="tweetText">A boat in the harbor</div><div data-testid="videoComponent"><video src="blob:https://x.com/local-player" poster="https://pbs.twimg.com/ext_tw_video_thumb/123/pu/img/poster.jpg"></video></div></article><article><div data-testid="videoPlayer"><img src="https://pbs.twimg.com/amplify_video_thumb/456/img/poster.jpg"></div></article>',{url:'https://x.com/a'});
 try{Object.defineProperty(dom.window.performance,'getEntriesByType',{value:()=>[{name:'https://video.twimg.com/ext_tw_video/123/pu/pl/clip.m3u8'},{name:'https://video.twimg.com/ext_tw_video/999/pu/vid/640x360/unrelated.mp4'},{name:'https://video.twimg.com/ext_tw_video/123/pu/vid/320x180/small.mp4'},{name:'https://video.twimg.com/ext_tw_video/123/pu/vid/1280x720/large.mp4'},{name:'https://video.twimg.com/ext_tw_video/123/pu/vid/segment.m4s'}]});
 const list=discoverMedia(dom.window.document);assert.equal(list.length,2);assert.equal(list[0].type,'video');assert.equal(list[0].title,'A boat in the harbor');assert.match(list[0].url,/large.mp4$/);assert.equal(list[0].sources.length,3);assert.equal(list[0].sources.some(s=>/999|m4s|blob:/.test(s.url)),false);assert.equal(list[1].unavailable,true);assert.equal(list[1].url,null);assert.match(list[1].reason,/Play this video/);assert.equal(discoverMedia(dom.window.document,{selected:dom.window.document.querySelector('article')}).length,1);
 }finally{dom.window.close();}
});
test('Recurring X root locks and continuous mutations are recovered without starving cleanup; Undo owns only its changes',async()=>{
 const s=fixture('<main><p>Delivered post</p></main>'+xNag,'https://x.com/a');let mutations;
 try{s.tools.startCleanup();const root=s.dom.window.document.documentElement,body=s.dom.window.document.body;root.style.setProperty('overflow-y','hidden','important');root.inert=true;root.setAttribute('inert','');
 mutations=s.dom.window.setInterval(()=>{body.dataset.tick=String(Date.now());body.querySelector('p').textContent+='.';},20);await wait();assert.equal(root.style.overflowY,'auto');assert.equal(root.inert,false);body.style.setProperty('overflow','hidden','important');await wait();assert.equal(body.style.overflow,'auto');
 s.tools.undo();assert.equal(root.style.overflowY,'hidden');assert.equal(root.inert,true);assert.equal(s.tools.scroll.watchdog,null);
 }finally{s.dom.window.clearInterval(mutations);s.tools.stop();s.dom.window.close();}
});
test('Mock media transport: real returned file format, descriptive filename, no stream download and response rejection',async()=>{
 const item={url:'https://media.example/a.jpg',type:'image',title:'Original useful title'},requests=[];const gm={xmlHttpRequest:async d=>{requests.push(d);return{status:200,response:new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'})};}};
 const file=await downloadMedia(item,{gm});assert.equal(file.name,'Original-useful-title.jpg');assert.equal(file.blob.type,'image/jpeg');assert.equal(requests[0].headers,undefined);assert.equal(requests[0].method,'GET');await assert.rejects(()=>downloadMedia({...item,stream:true},{gm}),/streaming playlist/);
 await assert.rejects(()=>downloadMedia(item,{gm:{xmlHttpRequest:async()=>({status:200,response:new Blob(['Sign in'],{type:'text/html'})})}}),/supported media file/);
});
test('Regional voice parsing rejects retired/malformed/duplicate entries and names language groups',()=>{
 const valid={ShortName:'en-US-JennyNeural',DisplayName:'Jenny',Locale:'en-US',LocaleName:'English (United States)',Gender:'Female',VoiceType:'Neural',Status:'GA'};
 const list=parseVoices([valid,valid,{...valid,ShortName:'other'},{...valid,Status:'Deprecated'},{...valid,ShortName:'fr-FR-DeniseNeural',Locale:'fr-FR',LocaleName:'French (France)'},{...valid,ShortName:'en-US-TestNeural',Status:'Preview'},{...valid,ShortName:'bad<script>'}]);assert.equal(list.length,3);assert.equal(list[0].language,'English (United States)');assert.ok(list.some(v=>v.status==='Preview'));assert.throws(()=>parseVoices({}));
});
test('Idle recovery reuses dialog candidates and mutation scans stay inside the changed branch',async()=>{
 const s=fixture('<main><p>Delivered words.</p></main>'+redditNag,'https://www.reddit.com/r/test/');
 try{s.tools.startCleanup();await wait();const doc=s.dom.window.document,original=doc.querySelectorAll.bind(doc);let dialogQueries=0,wholeTree=0;doc.querySelectorAll=selector=>{if(selector==='*')wholeTree++;if(selector.includes('dialog[open]'))dialogQueries++;return original(selector);};
 for(let i=0;i<20;i++)s.tools.otherDialogOpen();assert.equal(dialogQueries,0);const scans=[],clean=s.tools.cleanNags.bind(s.tools);let finished;const done=new Promise(r=>finished=r),p=doc.querySelector('main p');s.tools.cleanNags=scopes=>{scans.push(scopes);const result=clean(scopes);if(scopes?.includes(p))finished();return result;};for(let i=0;i<100;i++)p.firstChild.data='Updated '+i;let deadline;try{await Promise.race([done,new Promise((_,reject)=>deadline=setTimeout(()=>reject(new Error('Changed-branch cleanup did not run')),5000))]);}finally{clearTimeout(deadline);}assert.equal(wholeTree,0);assert.equal(dialogQueries,0);assert.ok(scans.some(scopes=>scopes?.includes(p)));assert.ok(scans.length<=2);
 }finally{s.tools.stop();s.dom.window.close();}
});
test('Detached nags and shadow roots are released; remounted nags remain reversible',()=>{
 const s=fixture('<main><p>Words.</p></main>','https://www.reddit.com/r/test/');
 try{s.tools.startCleanup();let previous;for(let i=0;i<50;i++){previous?.remove();const node=s.dom.window.document.createElement('div');node.innerHTML=redditNag;s.dom.window.document.body.append(node);s.tools.cleanNags([node]);previous=node;assert.equal(s.tools.nagNodes.size,1);assert.equal(s.tools.owned.size,1);}s.tools.undo();assert.equal(previous.querySelector('.rpl-bottom-sheet').style.display,'');assert.equal(s.tools.owned.size,0);
 }finally{s.tools.stop();s.dom.window.close();}
});
test('New deliberate dialogs block recovery before mutation callbacks run',()=>{
 const s=fixture('<main><p>Words.</p></main>'+redditNag,'https://www.reddit.com/r/test/');try{s.tools.startCleanup();assert.equal(s.tools.otherDialogOpen(),false);s.dom.window.document.body.insertAdjacentHTML('beforeend','<div role="dialog"><button>Confirm</button></div>');assert.equal(s.tools.otherDialogOpen(),true);s.tools.scroll.release();assert.equal(s.tools.scroll.active,false);}finally{s.tools.stop();s.dom.window.close();}
});
