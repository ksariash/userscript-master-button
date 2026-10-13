import test from 'node:test';
import assert from 'node:assert/strict';
import { DecisionStore, validExamples } from '../core/decisions.mjs';

const fresh = () => new DecisionStore([{ id: 'a', originalText: 'Original prose.' },
  { id: 'b', originalText: 'Original prose.' }], { documentId: 'd', site: 'example.org' });
const late = (store, label, id = 'a', revision = 0) => store.assess(id,
  { label, validatedExclusion: true, reason: 'Test-only validated assessment' }, { documentId: 'd', revision });

test('Keep wins over a late model result and an active rule for only that source location', () => {
  const s = fresh(); s.setRule('a', { enabled: true, label: 'NUISANCE' });
  s.correct('a', 'ARTICLE'); late(s, 'NUISANCE'); late(s, 'NUISANCE', 'b');
  assert.deepEqual(s.snapshot().passages.map(p => p.id), ['a']);
});
test('Skip, Keep, and Undo restore the decision and its explicit learning contribution', () => {
  const s = fresh(); s.correct('a', 'NUISANCE', { teach: true });
  assert.equal(s.examples.size, 1); assert.equal(s.snapshot().passages.length, 1);
  s.correct('a', 'ARTICLE', { teach: true }); assert.equal(s.examples.size, 1);
  s.undo(); assert.equal(s.resolve('a').included, false);
  assert.equal([...s.examples.values()][0].label, 'NUISANCE');
  s.undo(); assert.equal(s.resolve('a').included, true); assert.equal(s.examples.size, 0);
});
test('Unvalidated model suggestions, failed inference, and abstentions remain included', () => {
  const s = fresh(); s.assess('a', { label: 'NUISANCE' }, { documentId: 'd', revision: 0 });
  assert.equal(s.resolve('a').included, true); assert.equal(s.resolve('b').included, true);
});
test('Automatic off is distinct from clearing explicit corrections', () => {
  const s = fresh(); late(s, 'NUISANCE', 'b'); s.correct('a', 'NUISANCE');
  s.setAutomatic(false); assert.deepEqual(s.snapshot().passages.map(p => p.id), ['b']);
  s.clearCorrections(); assert.equal(s.snapshot().passages.length, 2);
});
test('Source mutations and retired documents reject stale inference and old Undo', () => {
  const s = fresh(); s.correct('a', 'NUISANCE'); s.replaceText('a', 'Changed prose.');
  assert.equal(late(s, 'NUISANCE'), false);
  assert.equal(s.assess('a', { label: 'NUISANCE' }, { documentId: 'old', revision: 1 }), false);
  assert.equal(s.undo(), false); assert.equal(s.resolve('a').included, true);
});
test('Snapshots preserve source wording/order and can detect stale preparation', () => {
  const s = fresh(); const before = s.snapshot(); s.correct('a', 'NUISANCE'); const after = s.snapshot();
  assert.notEqual(before.revision, after.revision); assert.deepEqual(before.passages.map(p => p.text), ['Original prose.', 'Original prose.']);
  assert.deepEqual(after.passages.map(p => p.id), ['b']);
});
test('Malformed legacy example collections cannot block correction', () => {
  for (const v of [null, 'bad', {}, { 0: 'bad' }, [{ label: 'NUISANCE' }]]) assert.deepEqual(validExamples(v), []);
  const s = fresh(); s.correct('a', 'NUISANCE'); assert.equal(s.resolve('a').included, false);
  s.setRule('b', { enabled: true, label: 'invalid' }); assert.equal(s.resolve('b').included, true);
});
