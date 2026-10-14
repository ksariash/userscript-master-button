import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../core/decisions.mjs';import {PassageSelection} from '../src/core/passage-selection.mjs';
const fresh=()=>new DecisionStore(['a','b','c','d'].map(id=>({id,originalText:`Original ${id}.`})),{documentId:'bulk',site:'example.org'});
test('Batch corrections publish one complete sequence and Undo restores every decision and learning contribution',()=>{
 const s=fresh(),events=[];s.correct('b','ARTICLE',{teach:true});const initial=[...s.examples.entries()];const revision=s.sequenceRevision;s.subscribe(e=>events.push({e,snapshot:s.snapshot()}));
 const result=s.correctMany(['a','b','a','c'],'NUISANCE',{teach:true});assert.deepEqual(result,{applied:3,taught:3});assert.equal(s.history.length,2);assert.equal(s.sequenceRevision,revision+1);assert.equal(events.length,1);assert.deepEqual(events[0].snapshot.passages.map(p=>p.id),['d']);assert.deepEqual(events[0].e.ids,['a','b','c']);
 for(const id of ['a','b','c'])s.assess(id,{label:'ARTICLE',validatedExclusion:true},{documentId:s.documentId,revision:0});assert.deepEqual(s.snapshot().passages.map(p=>p.id),['d']);
 const beforeUndo=s.sequenceRevision;assert.equal(s.undo(),true);assert.equal(s.sequenceRevision,beforeUndo+1);assert.deepEqual(s.snapshot().passages.map(p=>p.id),['a','b','c','d']);assert.equal(s.records.get('b').correction.label,'ARTICLE');assert.deepEqual([...s.examples.entries()],initial);
});
test('Batch validation is atomic; Undo never changes newer wording or resurrects forgotten learning',()=>{
 const s=fresh();assert.throws(()=>s.correctMany(['a','missing'],'NUISANCE'),/Unknown/);assert.equal(s.records.get('a').correction,null);assert.equal(s.history.length,0);
 s.correctMany(['a','b','c'],'NUISANCE',{teach:true});s.resetExamples();s.replaceText('b','New wording must remain included.');assert.equal(s.undo(),true);assert.equal(s.examples.size,0);assert.deepEqual(s.snapshot().passages.map(p=>p.id),['a','b','c','d']);assert.equal(s.records.get('b').originalText,'New wording must remain included.');
});
test('Selection does not change decisions; ranges follow scope order, all-included omits skips and edited leases expire',()=>{
 const s=fresh();s.setReading(['d','b','c']);s.correct('b','NUISANCE');const before=s.snapshot(),selection=new PassageSelection(s);
 selection.allIncluded();assert.deepEqual(selection.ids(),['d','c']);assert.deepEqual(s.snapshot(),before);selection.clear();selection.range();selection.toggle('c');selection.toggle('d');assert.deepEqual(selection.ids(),['d','b','c']);assert.deepEqual(selection.outside('b','before'),['d']);assert.deepEqual(selection.outside('b','after'),['c']);
 s.replaceText('c','Changed while selecting.');assert.deepEqual(selection.ids(),['d','b']);assert.deepEqual(new PassageSelection(s,{scope:'page'}).outside('c','before'),['a','b']);
});
