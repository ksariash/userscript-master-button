import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {JSDOM} from 'jsdom';import {SourceInventory} from '../src/core/source.mjs';
const spec=[
 {id:'graham',url:'https://paulgraham.com/read.html',selector:'td',layout:'legacy table essay'},
 {id:'seth',url:'https://seths.blog/2025/09/bringing-goodwill-to-the-conversation/',selector:'.entry-content',layout:'WordPress essay and list'},
 {id:'schneier',url:'https://www.schneier.com/essays/archives/2026/01/why-ai-keeps-falling-for-prompt-injection-attacks.html',selector:'.entry-content',layout:'security essay with quoted prompt injections'}
];
const pages=[];for(const p of spec){const r=await fetch(p.url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`${p.id}: HTTP ${r.status}`);const html=await r.text();await writeFile(`.cache/evaluation/${p.id}.html`,html);const dom=new JSDOM(html,{url:p.url}),records=new SourceInventory(dom.window.document,{documentId:p.id}).scan();
 console.log(JSON.stringify({page:p.id,total:records.length}));for(const row of records)if(row.originalText.length>2)console.log(JSON.stringify({index:row.index,tag:row.tag,role:row.role,inMain:!!row.source.node.closest(p.selector),text:row.originalText.replace(/\s+/g,' ').slice(0,230)}));
 pages.push({...p,split:'fresh-held-out',htmlHash:createHash('sha256').update(html).digest('hex'),labels:[]});dom.window.close();}
await writeFile('experiments/evaluation/fresh-pages.json',JSON.stringify({date:new Date().toISOString(),labeler:'Implementation author manually audits each chosen block before inference; no independent human audit',pages},null,2)+'\n');
