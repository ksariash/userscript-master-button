import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../prototype/review.html', import.meta.url), 'utf8');
function study(view = 'review') {
  // Execute only our authored, bundled prototype. JSDOM does not render layout.
  const dom = new JSDOM(html, { url: `https://example.org/?view=${view}`, runScripts: 'dangerously',
    beforeParse(w) { w.ResizeObserver = class { observe() {} }; w.requestAnimationFrame = f => f(); } });
  const w = dom.window, sh = w.document.getElementById('utility').shadowRoot;
  return { dom, w, sh, click: action => sh.querySelector(`[data-action=${action}]`).click() };
}
test('Prototype page Skip updates the reader and enabled sequence; reader Undo restores the page and teaching', () => {
  const { dom, w, sh, click } = study();
  click('correction');
  assert.ok(w.document.querySelector('[data-source=promo]').classList.contains('mb-muted'));
  assert.equal(w.masterButtonStudy.snapshot().passages.some(p => p.id === 'promo'), false);
  w.masterButtonStudy.show('reader');
  assert.ok(sh.querySelector('[data-id=promo]').classList.contains('skipped'));
  sh.querySelector('[data-id=promo] button').click();
  const remember = sh.querySelector('#remember'); remember.checked = true;
  remember.dispatchEvent(new w.Event('change'));
  assert.equal(w.masterButtonStudy.examples().length, 1);
  sh.querySelector('.sheet [data-action=undo]').click();
  assert.equal(w.masterButtonStudy.examples().length, 0);
  sh.querySelector('.sheet [data-action=undo]').click();
  assert.equal(w.document.querySelector('[data-source=promo]').classList.contains('mb-muted'), false);
  assert.equal(sh.querySelector('[data-id=promo]').classList.contains('skipped'), false);
  assert.equal(w.masterButtonStudy.snapshot().passages.length, 8);
  dom.window.close();
});
test('Prototype updates preserve reader scroll, expanded Details, and the source link', () => {
  const { dom, w, sh } = study('reader');
  sh.querySelector('.transcript').scrollTop = 200;
  sh.querySelector('[data-id=promo] button').click();
  const details = sh.querySelector('details'); details.open = true;
  sh.querySelector('.sheet [data-action=correction]').click();
  assert.equal(details.open, true);
  assert.equal(sh.querySelector('.transcript').scrollTop, 200);
  assert.equal(w.document.getElementById('publisher-link').getAttribute('href'), '#newsletter');
  assert.equal(w.location.hash, '');
  dom.window.close();
});
test('Two keyboard launcher activations open and close; mock speech reports that no request was sent', () => {
  const { dom, w, sh } = study('idle');
  sh.querySelector('.launcher').click(); assert.equal(w.masterButtonStudy.getState().mode, 'menu');
  sh.querySelector('.launcher').click(); assert.equal(w.masterButtonStudy.getState().mode, 'idle');
  w.masterButtonStudy.show('speech'); sh.querySelector('[data-action=connect]').click();
  assert.match(sh.querySelector('.form-error').textContent, /No request was sent/);
  assert.equal(sh.querySelector('#speech-key').disabled, true);
  dom.window.close();
});
