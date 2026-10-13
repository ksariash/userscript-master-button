import test from 'node:test'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
import { Settings, validateSettings, migrateLegacy, SETTINGS_KEY, SPEECH_KEY } from '../src/platform/storage.mjs';
import { inspectSelector, SelectorPicker } from '../src/tools/rules.mjs';
import { cleanURL, amazonProduct, appleMapsURL, validateURL, validateURLProposal } from '../src/tools/urls.mjs';
import { retrieveExamples } from '../src/core/learning.mjs';
test('Validated non-destructive migration preserves the old namespace and separately stored key', async () => {
  const old = { fontSize: 22, playbackRate: 1.25, unrelated: 'keep me', sites: { 'example.org': { examples: { broken: 1 }, rules: 'bad' } } }, map = new Map([['master-button:v1', old], [SPEECH_KEY, 'k'.repeat(32)]]);
  const gm = { getValue: async (k, d) => map.get(k) ?? d, setValue: async (k, v) => map.set(k, v), deleteValue: async k => map.delete(k) }; const settings = new Settings(gm); await settings.load();
  assert.deepEqual(map.get('master-button:v1'), old); assert.equal(settings.value.textSize, 22); assert.equal(settings.value.rate, 1.25); assert.equal(settings.value.legacy.unrelated, 'keep me'); assert.deepEqual(settings.site('example.org').examples, []); assert.equal(await settings.getKey(), 'k'.repeat(32));
  await settings.save(); assert.equal(map.get(SETTINGS_KEY).schema, 2); await settings.forgetKey(); assert.equal(map.has(SPEECH_KEY), false); assert.deepEqual(map.get('master-button:v1'), old);
  for (const v of [null, 'broken', { sites: 'broken' }, { sites: { 'x.test': { examples: {} } } }]) assert.doesNotThrow(() => validateSettings(v));
});
test('Picker stops link activation, covers every match, blocks broad roots, and restores only owned preview styles', () => {
  const dom = new JSDOM('<article><p>Story</p></article><aside class="promo" style="outline:1px dotted red!important"><a href="/go">Ad</a></aside><aside class="promo">Other</aside><div data-master-button="host"></div>', { url: 'https://example.org' }); const doc = dom.window.document; let selected;
  assert.equal(inspectSelector(doc, 'article').blocked, true); assert.equal(inspectSelector(doc, '[data-master-button]').blocked, true);
  const picker = new SelectorPicker(doc, { onSelect: (i, s) => selected = s }); picker.start(); const click = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }); doc.querySelector('a').dispatchEvent(click); assert.equal(click.defaultPrevented, true); assert.ok(selected);
  picker.select('.promo'); assert.equal(picker.inspection.matches.length, 2); assert.equal(picker.preview(), true); picker.cancelPreview(); assert.equal(doc.querySelector('aside').style.getPropertyValue('outline'), '1px dotted red'); assert.equal(doc.querySelector('aside').style.getPropertyPriority('outline'), 'important');
  picker.preview(); doc.querySelector('aside').style.setProperty('outline', '4px solid green'); picker.stop(); assert.equal(doc.querySelector('aside').style.outline, '4px solid green'); dom.window.close();
});
test('URL cleaning preserves functional parameters, fragments, signed URLs and explicit destinations', () => {
  assert.equal(cleanURL('https://example.org/a?id=7&utm_source=x#chapter').url, 'https://example.org/a?id=7#chapter');
  assert.equal(cleanURL('https://example.org/a?sig=secret&utm_source=x').removed.length, 0); assert.throws(() => validateURL('javascript:alert(1)')); assert.throws(() => validateURL('https://me:secret@example.org'));
  assert.equal(amazonProduct('https://www.amazon.co.uk/name/dp/B012345678?tag=x').priceHistory, 'https://uk.camelcamelcamel.com/product/B012345678'); assert.equal(amazonProduct('https://amazon.co.jp/dp/B012345678').priceHistory, null); assert.equal(amazonProduct('https://amazon.com/search?q=book'), null);
  assert.equal(appleMapsURL('https://www.google.com/maps/dir/?api=1&destination=Paris'), 'https://maps.apple.com/?daddr=Paris'); assert.equal(appleMapsURL('https://maps.google.com/maps/@48,2,12z'), null);
  assert.deepEqual(validateURLProposal('https://example.org/?id=1&utm_source=x', ['id', 'bad', 'utm_source']).map(p => p.recognized), [false, true]);
});
test('Learning uses only explicit site examples and always retains a Keep counterexample', () => {
  const examples = [{site:'a.test',text:'Subscribe offers',label:'NUISANCE'}, {site:'a.test',text:'An unrelated narrative',label:'ARTICLE'}, {site:'b.test',text:'Subscribe offers',label:'NUISANCE'}];
  assert.deepEqual(retrieveExamples('Subscribe offers', examples, { site:'a.test', enabled:false }), []); assert.equal(retrieveExamples('Subscribe offers', examples, { site:'a.test',limit:1 })[0].label, 'ARTICLE');
});
test('Reading and global preferences do not silently persist visited site names',async()=>{
 const writes=[],settings=new Settings({getValue:async(k,d)=>d,setValue:async(k,v)=>writes.push(structuredClone(v))});await settings.load();settings.site('visited.example');settings.value.textSize=22;await settings.save();assert.equal(Object.hasOwn(writes.at(-1).sites,'visited.example'),false);settings.site('chosen.example').automatic=false;await settings.saveSite('chosen.example');assert.equal(writes.at(-1).sites['chosen.example'].automatic,false);
});
test('Maps handoff preserves a literal plus/percent in queries and accepts the Maps subdomain root',()=>{
 assert.equal(new URL(appleMapsURL('https://maps.google.com/?q=C%2B%2B%20School%2050%25')).searchParams.get('q'),'C++ School 50%');assert.equal(appleMapsURL('https://google.evil.com/maps?q=Paris'),null);
});
