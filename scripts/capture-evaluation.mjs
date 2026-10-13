import {mkdir,readFile,writeFile} from 'node:fs/promises'; import {createHash} from 'node:crypto'; import {JSDOM} from 'jsdom'; import {SourceInventory} from '../src/core/source.mjs';
const sources=[
 {id:'webkit',url:'https://webkit.org/blog/17333/webkit-features-in-safari-26-0/',main:'article .bodycopy',layout:'technical release article',split:'development'},
 {id:'saw',url:'https://stephango.com/saw',main:'main',layout:'personal essay',split:'development'},
 {id:'chrome',url:'https://developer.chrome.com/blog/new-in-chrome-138',main:'.devsite-article-body',layout:'developer documentation',split:'held-out'},
 {id:'mozilla',url:'https://developer.mozilla.org/en-US/blog/javascript-set-methods/',main:'article',layout:'developer blog',split:'held-out'}
];
await mkdir('.cache/evaluation',{recursive:true}); await mkdir('experiments/evaluation',{recursive:true}); const result=[];
for(const s of sources){
 const r=await fetch(s.url,{signal:AbortSignal.timeout(30000)}); if(!r.ok)throw new Error(`${s.id}: HTTP ${r.status}`); const html=await r.text(); await writeFile(`.cache/evaluation/${s.id}.html`,html);
 const dom=new JSDOM(html,{url:s.url}), inventory=new SourceInventory(dom.window.document,{documentId:s.id}); const records=inventory.extract(); const main=dom.window.document.querySelector(s.main); if(!main)throw new Error(`Missing main selector: ${s.id}`);
 const inside=records.filter(p=>main.contains(p.source.node)&&p.originalText.length>20), outside=records.filter(p=>!main.contains(p.source.node)&&p.source.node.closest('nav,header,footer'));
 const selected=[...inside.slice(0,18).map(p=>[p,'ARTICLE']),...outside.slice(0,6).map(p=>[p,'NUISANCE'])];
 const labels=selected.map(([p,label])=>({index:p.index,textHash:createHash('sha256').update(p.originalText).digest('hex'),label}));
 result.push({...s,htmlHash:createHash('sha256').update(html).digest('hex'),labels}); console.log(`${s.id}: ${labels.length} labels, ${inside.length} article candidates, ${outside.length} surrounding blocks`); dom.window.close();
}
await writeFile('experiments/evaluation/real-pages.json',JSON.stringify({frozenAt:new Date().toISOString(),labeler:'Initial selector labels later audited by implementation author; not independently audited',note:'Main article vs. surrounding native navigation/footer labels. Captures are ignored; only hashes/indices and provenance are public.',pages:result},null,2)+'\n');
