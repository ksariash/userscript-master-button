import test from 'node:test'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
import { SourceInventory, PageLifecycle } from '../src/core/source.mjs';
import { DecisionStore } from '../core/decisions.mjs'; import { PageTone } from '../src/core/page-tone.mjs';
const page = html => new JSDOM(html, { url: 'https://example.org/story', pretendToBeVisual: true });
test('Source list ordinals and quotation boundaries survive without rewriting their wording',()=>{
 const dom=page('<article><ol start="3"><li><p>First words.</p><p>Continuation.</p></li><li value="8">Second words.</li></ol><ul><li>Unordered words.</li></ul><blockquote><p>Quoted original.</p></blockquote></article>'),rows=new SourceInventory(dom.window.document).scan();
 assert.deepEqual(rows.map(p=>p.originalText),['First words.','Continuation.','Second words.','Unordered words.','Quoted original.']);assert.deepEqual(rows.map(p=>p.listMarker),['3.','','8.','•','']);assert.equal(rows.at(-1).quoted,true);dom.window.close();
});
test('Live inventory retains inline whitespace, duplicate identity and direct text around mixed children', () => {
  const dom = page('<main><article>Before <b>the</b> inset.<p>Story <a href="/x">link</a> <em>text</em>.</p>After.<aside><p>Promo</p></aside><p>Repeat</p><p>Repeat</p></article></main>');
  const i = new SourceInventory(dom.window.document, { documentId: 'd' }); const records = i.scan();
  assert.deepEqual(records.map(p => p.originalText), ['Before the inset.', 'Story link text.', 'After.', 'Promo', 'Repeat', 'Repeat']);
  assert.notEqual(records[4].id, records[5].id); assert.equal(records[1].source.range.toString(), 'Story link text.');
  const store = new DecisionStore(records); store.correct(records[0].id, 'NUISANCE');
  const tone = new PageTone(dom.window.document); tone.render(store); store.sync(i.scan());
  assert.equal(store.resolve(records[0].id).included, false); assert.equal(dom.window.document.querySelector('article').textContent, 'Before the inset.Story link text.After.PromoRepeatRepeat');
  tone.stop(); assert.equal(dom.window.document.querySelectorAll('[data-mb-tone]').length, 0); dom.window.close();
});
test('Live mutation increments wording lease, preserves unchanged correction, and does not alter source links', () => {
  const dom = page('<article><p>One</p><p><a href="/go">Two</a></p></article>'), inventory = new SourceInventory(dom.window.document, { documentId: 'd' }), records = inventory.scan(), store = new DecisionStore(records, { documentId: 'd' });
  store.correct(records[0].id, 'NUISANCE'); store.correct(records[1].id, 'ARTICLE');
  dom.window.document.querySelector('p').firstChild.data = 'Changed'; dom.window.document.querySelector('article').insertAdjacentHTML('beforeend', '<p>Three</p>'); store.sync(inventory.scan());
  assert.equal(store.records.get(records[0].id).revision, 1); assert.equal(store.resolve(records[0].id).included, true); assert.equal(store.resolve(records[1].id).origin, 'correction'); assert.equal(store.records.size, 3);
  assert.equal(store.assess(records[0].id, { label: 'NUISANCE', validatedExclusion: true }, { documentId: 'd', revision: 0 }), false); assert.equal(dom.window.document.querySelector('a').getAttribute('href'), '/go'); dom.window.close();
});
test('Diagnostics do not invalidate audio/export selection; changed reader rows explicitly lose source mapping', () => {
  const s = new DecisionStore([{ id: 'a', originalText: 'One.' }, { id: 'b', originalText: 'Two.' }], { documentId: 'd' }); const revision = s.sequenceRevision;
  s.assess('a', { label: 'ARTICLE', reason: 'Local model.' }, { documentId: 'd', revision: 0 }); assert.equal(s.sequenceRevision, revision);
  s.setReaderText('One.\n\nNew words.'); assert.equal(s.reading()[0].id, 'a'); assert.equal(s.reading()[1].scope, 'reader'); assert.equal(s.reading()[1].source, null); assert.equal(s.records.get('b').originalText, 'Two.');
  const custom = s.reading()[1]; s.correct(custom.id, 'NUISANCE', { teach: true }); assert.equal(s.examples.size, 0); s.undo(); assert.equal(s.snapshot().passages.length, 2);
});
