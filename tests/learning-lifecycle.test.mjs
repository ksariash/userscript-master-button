import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {DecisionStore} from '../core/decisions.mjs';import {SourceInventory} from '../src/core/source.mjs';import {SiteHead} from '../src/core/site-head.mjs';import baseline from '../src/core/baseline-head.json' with {type:'json'};import {MODEL_CONFIG} from '../src/core/model-contract.mjs';
test('Actual head gradients learn only explicit examples; Undo reproduces the earlier head weights',()=>{
 const store=new DecisionStore([{id:'a',originalText:'Explicit original words.'}],{documentId:'d',site:'a.test'});const head=new SiteHead(()=>store.examples.values());const features=Array(baseline.weights.length).fill(.3);head.classify(features);const before=structuredClone(head.head);
 store.correct('a','NUISANCE',{teach:true});const e=store.examples.values().next().value;e.features=features;e.featureVersion=MODEL_CONFIG.promptVersion;head.classify(features);assert.notDeepEqual(head.head.weights,before.weights);store.undo();head.classify(features);assert.deepEqual(head.head,before);
});
test('Changed structural evidence rejects late classification while leaving correction Undo available',()=>{
 const p={id:'a',originalText:'Same wording',role:'content',extraction:{member:true}},s=new DecisionStore([p],{documentId:'d'});s.correct('a','ARTICLE');s.sync([{...p,role:'aside'}]);assert.equal(s.records.get('a').revision,0);assert.equal(s.records.get('a').evidenceRevision,1);
 assert.equal(s.assess('a',{label:'NUISANCE',validatedExclusion:true},{documentId:'d',revision:0,evidenceRevision:0}),false);assert.equal(s.resolve('a').included,true);assert.equal(s.undo(),true);
});
test('Actual source extraction distinguishes article headings and outlines from site chrome and splits legacy BR paragraphs',()=>{
 const d=new JSDOM('<nav><p>Home</p></nav><article><header><h1>Story</h1></header><nav><p><a href="#one">Section</a></p></nav><p id="one">Prose.</p></article><table><tr><td>First paragraph.<br><br>Second paragraph.</td></tr></table>',{url:'https://example.org/story'});const inventory=new SourceInventory(d.window.document),rows=inventory.extract();
 assert.equal(rows.find(p=>p.originalText==='Home').role,'nav');assert.equal(rows.find(p=>p.originalText==='Story').role,'article-header');assert.equal(rows.find(p=>p.originalText==='Section').role,'article-nav');assert.equal(rows.find(p=>p.originalText==='Section').sameDocumentLinkRatio,1);assert.ok(rows.find(p=>p.originalText==='First paragraph.'));assert.ok(rows.find(p=>p.originalText==='Second paragraph.'));d.window.close();
});
test('Repeated teaching replaces a remembered same-wording label transactionally without an archive',()=>{
 const s=new DecisionStore([{id:'a',originalText:'One text.'}],{documentId:'d',site:'a.test'});s.examples.set('prior',{id:'prior',site:'a.test',text:'One text.',label:'ARTICLE',enabled:true});s.correct('a','NUISANCE',{teach:true});assert.equal(s.examples.size,1);assert.equal([...s.examples.values()][0].label,'NUISANCE');s.undo();assert.equal(s.examples.size,1);assert.equal([...s.examples.values()][0].id,'prior');
});
test('Removed selected source text remains readable and correctable with an explicit absent mapping',()=>{
 const s=new DecisionStore([{id:'a',originalText:'Selected original.'},{id:'b',originalText:'Other.'}]);s.setReading(['a']);s.sync([{id:'b',originalText:'Other.'}]);assert.equal(s.snapshot().passages[0].text,'Selected original.');assert.equal(s.reading()[0].source,null);assert.match(s.reading()[0].sourceState,/no longer available/);s.correct('a','NUISANCE');s.undo();assert.equal(s.snapshot().passages.length,1);
});
test('Deleting/resetting remembered examples is not undone by an older passage correction',()=>{
 const s=new DecisionStore([{id:'a',originalText:'Original.'}],{documentId:'d',site:'x.test'});s.correct('a','NUISANCE',{teach:true});s.correct('a','ARTICLE',{teach:true});s.resetExamples();s.undo();assert.equal(s.resolve('a').included,false);assert.equal(s.examples.size,0);assert.equal(s.records.get('a').correction.exampleId,null);
});
test('Mock head teaching Skip preserves the conservative policy for other confident passages',()=>{
 const s=new DecisionStore([{id:'a',originalText:'Explicit page words.'},{id:'b',originalText:'Other page words.'}],{documentId:'d',site:'a.test'}),head=new SiteHead(()=>s.examples.values()),features=Array(baseline.weights.length).fill(0);features[7]=1;features[9]=1;features[10]=1;assert.equal(head.classify(features).label,'NUISANCE');s.correct('a','NUISANCE',{teach:true});const e=[...s.examples.values()][0];e.features=features;e.featureVersion=MODEL_CONFIG.promptVersion;assert.equal(head.classify(features).label,'NUISANCE');assert.equal(head.head.conservativeExclusion,true);
});
test('Removing a selected source preserves words but rejects late context-dependent inference',()=>{
 const s=new DecisionStore([{id:'a',originalText:'Selected source words.'}],{documentId:'d'});s.setReading(['a']);s.sync([]);assert.equal(s.assess('a',{label:'NUISANCE',validatedExclusion:true},{documentId:'d',revision:0,evidenceRevision:0}),false);assert.equal(s.resolve('a').included,true);assert.equal(s.snapshot().passages[0].text,'Selected source words.');
});
