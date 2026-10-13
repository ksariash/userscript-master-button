import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extract } from '../experiments/filtering/extract.mjs';
const fixture = await readFile(new URL('../experiments/filtering/fixtures/city.html', import.meta.url), 'utf8');
test('Actual Defuddle extraction retains a separate source inventory, mixed prose/promotion, and duplicate identity', async () => {
  const page = await extract(fixture, 'https://example.org/city');
  const get = name => page.passages.find(p => p.sourceElementId === name);
  assert.equal(page.passages.length, 25);
  assert.notEqual(get('duplicate-one').id, get('duplicate-two').id);
  assert.equal(get('duplicate-one').originalText, get('duplicate-two').originalText);
  assert.equal(get('mixed-prose').originalText, 'The first trees were planted by volunteers. Their roots now reach the old stone channel beneath the pavement.');
  assert.ok(get('mixed-promo')); assert.ok(get('quote')); assert.ok(get('caption'));
  assert.ok(get('bridge')); assert.ok(get('related-book'));
  assert.equal(page.extractionSummary.mappingAmbiguities, 0);
});
