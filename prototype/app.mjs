import { createElement, BookOpen, SlidersHorizontal, Share2, Ellipsis, X, ChevronLeft, ChevronRight, Undo2, Play, SkipBack, SkipForward, Minus, Headphones, ArrowDownLeft } from 'lucide';
import { DecisionStore } from '../core/decisions.mjs';
import controlCSS from './utility.css';

const phone = document.getElementById('phone');
const host = document.getElementById('utility');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = `<style>${controlCSS}</style><div id="surfaces"></div><div class="markers" hidden></div>
  <button class="launcher ui" aria-label="Open Master Button" aria-expanded="false"><i data-icon="sliders"></i><span class="count" hidden>0</span></button>
  <div class="notice ui" role="status" hidden></div>`;
const iconMap = { book: BookOpen, sliders: SlidersHorizontal, share: Share2, more: Ellipsis, close: X,
  left: ChevronLeft, right: ChevronRight, undo: Undo2, play: Play, back: SkipBack, forward: SkipForward,
  minus: Minus, headphones: Headphones, minimize: ArrowDownLeft };
function icons(root = shadow) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const definition = iconMap[el.dataset.icon];
    if (definition) el.replaceChildren(createElement(definition, { 'aria-hidden': 'true', 'stroke-width': 1.6 }));
  });
}
const originals = [...phone.querySelectorAll('[data-source]')];
const records = originals.map((el, index) => ({ id: el.dataset.source, originalText: el.textContent,
  source: { node: el, index, kind: 'authored prototype fixture' }, tag: el.tagName.toLowerCase() }));
const store = new DecisionStore(records, { site: 'the-common.example', documentId: 'design-study' });
const surfaces = shadow.getElementById('surfaces');
const launcher = shadow.querySelector('.launcher');
const markers = shadow.querySelector('.markers');
const pageScroll = document.getElementById('page-scroll');
let mode = 'idle', previousMode = 'review', activeId = 'promo', noticeTimer, reader, reviewChrome, menu, sheet, mini;

const button = (label, action, cls = '', icon = '') => `<button type="button" class="${cls}" data-action="${action}">${icon ? `<i data-icon="${icon}"></i>` : ''}${label}</button>`;
function notify(message) {
  const el = shadow.querySelector('.notice'); el.textContent = message; el.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { el.hidden = true; }, 4200);
}
function resetSurfaces() {
  [menu, reader, reviewChrome, sheet, mini].forEach(el => { if (el) el.hidden = true; });
  markers.hidden = true; launcher.hidden = false;
  originals.forEach(el => el.classList.remove('mb-selected'));
  launcher.setAttribute('aria-expanded', 'false');
  shadow.querySelector('.notice').hidden = true;
}
function ensureReview() {
  if (!reviewChrome) {
    reviewChrome = document.createElement('div');
    reviewChrome.innerHTML = `<div class="review-top ui"><span>Review passages</span><div>${button('Undo', 'undo', 'text-action')}${button('Done', 'done', 'text-action')}</div></div>
      <div class="context-bar ui">${button('<i data-icon="left"></i>', 'previous', '', '')}<span class="context-label"></span>${button('<i data-icon="right"></i>', 'next', '', '')}${button('Why', 'why', 'text-action')}${button('Skip', 'correction', 'primary')}</div>`;
    reviewChrome.querySelector('[data-action=previous]').setAttribute('aria-label', 'Previous passage');
    reviewChrome.querySelector('[data-action=next]').setAttribute('aria-label', 'Next passage');
    surfaces.append(reviewChrome); icons(reviewChrome);
    for (const p of records) {
      const marker = document.createElement('button'); marker.className = 'marker'; marker.type = 'button';
      marker.dataset.id = p.id; marker.setAttribute('aria-label', 'Review passage: ' + p.originalText.slice(0, 65));
      marker.addEventListener('click', () => selectPassage(p.id)); markers.append(marker);
    }
  }
}
function positionMarkers() {
  if (markers.hidden) return;
  const bounds = phone.getBoundingClientRect();
  for (const marker of markers.children) {
    const p = store.records.get(marker.dataset.id); const rect = p.source.node.getBoundingClientRect();
    const y = rect.top - bounds.top;
    // If the source margin cannot fit a non-overlapping 44px target, the bottom
    // Previous/Next controls remain the correction route for this passage.
    marker.hidden = rect.left - bounds.left < 44 || y < 65 || y > bounds.height - 95;
    marker.style.left = `${Math.max(0, rect.left - bounds.left - 46)}px`;
    marker.style.top = `${y - 4}px`;
    marker.setAttribute('aria-pressed', String(p.id === activeId));
  }
}
function selectPassage(id, { scroll = false } = {}) {
  activeId = id;
  originals.forEach(el => el.classList.toggle('mb-selected', mode === 'review' && el.dataset.source === id));
  if (scroll && mode === 'review') {
    const el = store.records.get(id).source.node;
    pageScroll.scrollTop = el.offsetTop - 135;
  }
  patch(); positionMarkers();
}
function ensureReader() {
  if (reader) return;
  reader = document.createElement('section'); reader.className = 'reader ui'; reader.setAttribute('aria-label', 'Article reader');
  reader.innerHTML = `<nav class="reader-nav" aria-label="Reader controls">${button('<i data-icon="left"></i>', 'done')}<span class="source">The Common</span>${button('Aa', 'type', 'type-button')}${button('<i data-icon="minimize"></i>', 'minimize')}</nav>
    <div class="transcript"><div class="reader-kicker">Field notes / City life</div><h1>A slower kind of city</h1><div class="reader-byline">Emma Lane · October 13, 2026</div></div>
    <div class="player"><div class="player-top"><span>Connect Azure to listen</span><span class="enabled-count"></span></div><div class="player-controls">
      ${button('<i data-icon="back"></i>', 'audio-back')}${button('<i data-icon="play"></i>', 'speech', 'play')}${button('<i data-icon="forward"></i>', 'audio-next')}${button('1×', 'rate', 'rate')}${button('<i data-icon="more"></i>', 'more')}
    </div></div>`;
  reader.querySelector('[data-action=done]').setAttribute('aria-label', 'Back to page');
  reader.querySelector('[data-action=minimize]').setAttribute('aria-label', 'Minimize reader');
  reader.querySelector('[data-action=audio-back]').setAttribute('aria-label', 'Back 15 seconds');
  reader.querySelector('[data-action=audio-next]').setAttribute('aria-label', 'Forward 15 seconds');
  reader.querySelector('[data-action=speech]').setAttribute('aria-label', 'Set up narration');
  reader.querySelector('[data-action=more]').setAttribute('aria-label', 'Reader options');
  const transcript = reader.querySelector('.transcript');
  for (const p of records) {
    const container = document.createElement('div'); container.className = 'passage'; container.dataset.id = p.id;
    const text = document.createElement(p.tag === 'h2' ? 'h2' : 'p'); text.textContent = p.originalText;
    text.addEventListener('click', () => { if (!store.resolve(p.id).included) return; activeId = p.id; notify('Narration is not connected in this design study.'); });
    const state = document.createElement('span'); state.className = 'state';
    const control = document.createElement('button'); control.type = 'button'; control.className = 'passage-control';
    control.setAttribute('aria-label', 'Correct passage: ' + p.originalText.slice(0, 65)); control.innerHTML = '<i data-icon="more"></i>';
    control.addEventListener('click', () => { activeId = p.id; previousMode = 'reader'; show('why'); });
    container.append(text, state, control); transcript.append(container);
  }
  surfaces.append(reader); icons(reader);
}
function showWhy() {
  if (sheet) sheet.remove();
  const p = store.records.get(activeId);
  sheet = document.createElement('section'); sheet.className = 'sheet ui'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Passage explanation');
  sheet.innerHTML = `<div class="sheet-head"><h2>This passage</h2>${button('<i data-icon="close"></i>', 'back')}</div>
    <div class="sheet-content"><p class="decision-label"></p><blockquote></blockquote><p class="reason"></p>
      <div class="sheet-actions">${button('Keep', 'correction', 'primary')}${button('Undo', 'undo', 'text-action')}</div>
      <label class="remember"><input type="checkbox" id="remember"> Remember this choice for this site</label>
      <details><summary>Details</summary><p class="details-body"></p><p>This study stores examples in memory. No weight training or saved rules run here.</p></details>
    </div>`;
  sheet.querySelector('[data-action=back]').setAttribute('aria-label', 'Close explanation');
  sheet.querySelector('blockquote').textContent = p.originalText;
  if (p.originalText.length > 180) {
    sheet.querySelector('blockquote').textContent = p.originalText.slice(0, 177) + '…';
    const expand = document.createElement('button'); expand.className = 'text-action'; expand.textContent = 'Show full passage';
    expand.addEventListener('click', () => { sheet.querySelector('blockquote').textContent = p.originalText; expand.remove(); });
    sheet.querySelector('blockquote').after(expand);
  }
  sheet.querySelector('#remember').addEventListener('change', event => {
    const current = store.resolve(activeId).included ? 'ARTICLE' : 'NUISANCE';
    store.correct(activeId, current, { teach: event.target.checked });
  });
  surfaces.append(sheet); icons(sheet); patch();
}
function showSpeech() {
  if (sheet) sheet.remove();
  sheet = document.createElement('section'); sheet.className = 'sheet ui'; sheet.setAttribute('aria-label', 'Speech setup');
  sheet.innerHTML = `<div class="sheet-head"><h2>Azure Speech</h2>${button('<i data-icon="close"></i>', 'back')}</div><div class="sheet-content speech-form">
    <label for="region">Region</label><select id="region"><option>East US</option><option>West US</option><option>West Europe</option></select>
    <label for="voice">Voice</label><div class="voice-row"><select id="voice"><option>Jenny · English (US)</option><option>Guy · English (US)</option></select>${button('Demo', 'demo')}</div>
    <label for="speech-key">Resource key</label><input id="speech-key" type="password" placeholder="Preview only · do not enter a real key" autocomplete="off" disabled>
    <p class="help">The released utility will keep your key in extension storage and send enabled text directly to Azure.</p>
    ${button('Connect', 'connect', 'connect')}<p class="form-error" role="status" hidden></p>
  </div>`;
  sheet.querySelector('[data-action=back]').setAttribute('aria-label', 'Close speech setup'); surfaces.append(sheet); icons(sheet);
}
function showMore() {
  if (sheet) sheet.remove();
  sheet = document.createElement('section'); sheet.className = 'sheet ui';
  sheet.innerHTML = `<div class="sheet-head"><h2>Reading preferences</h2>${button('<i data-icon="close"></i>', 'back')}</div><div class="sheet-content">
    <label class="settings-row">Automatic filtering<input id="automatic" type="checkbox" ${store.automatic ? 'checked' : ''}></label>
    <div class="settings-row"><span>Corrections</span>${button('Clear', 'clear-corrections')}</div>
    <div class="settings-row"><span>Site examples</span><span class="example-count">${store.examples.size}</span></div>
    <div class="settings-list">${button('Speech setup <i data-icon="right"></i>', 'speech')}${button('Rules & site tools <i data-icon="right"></i>', 'later')}</div>
  </div>`;
  sheet.querySelector('[data-action=back]').setAttribute('aria-label', 'Close preferences');
  sheet.querySelector('#automatic').addEventListener('change', event => store.setAutomatic(event.target.checked));
  surfaces.append(sheet); icons(sheet);
}
function show(next) {
  const old = mode;
  if (['why', 'speech', 'more'].includes(next) && !['why', 'speech', 'more'].includes(old)) previousMode = old;
  resetSurfaces(); mode = next;
  const picker = document.getElementById('review-view'); if ([...picker.options].some(o => o.value === next)) picker.value = next;
  if (next === 'menu') {
    if (!menu) {
      menu = document.createElement('nav'); menu.className = 'menu ui'; menu.setAttribute('aria-label', 'Master Button actions');
      menu.innerHTML = `<div class="menu-head"><span>Master Button</span><span class="menu-state">On this page</span></div>
        ${button('Read <span>Article</span>', 'reader', 'row', 'book')}${button('Review <span class="menu-count">Passages</span>', 'review', 'row', 'sliders')}${button('Share clean link', 'share', 'row', 'share')}<hr>${button('More', 'more', 'row more', 'more')}`;
      surfaces.append(menu); icons(menu);
    }
    menu.hidden = false; launcher.setAttribute('aria-expanded', 'true');
  } else if (next === 'review') {
    ensureReview(); reviewChrome.hidden = false; markers.hidden = false; launcher.hidden = true;
    originals.forEach(el => el.classList.toggle('mb-selected', el.dataset.source === activeId)); positionMarkers();
  } else if (next === 'reader') {
    ensureReader(); reader.hidden = false; launcher.hidden = true;
  } else if (['why', 'speech', 'more'].includes(next)) {
    if (previousMode === 'reader') { ensureReader(); reader.hidden = false; launcher.hidden = true; }
    else { ensureReview(); reviewChrome.hidden = false; markers.hidden = false; launcher.hidden = true; }
    if (next === 'why') showWhy();
    if (next === 'speech') showSpeech();
    if (next === 'more') showMore();
  } else if (next === 'mini') {
    if (!mini) { mini = document.createElement('div'); mini.className = 'mini-player ui'; mini.innerHTML = `${button('<i data-icon="headphones"></i>', 'reader')}<span>Ready to connect</span>${button('<i data-icon="play"></i>', 'speech')}`; surfaces.append(mini); icons(mini); }
    mini.hidden = false;
    mini.querySelector('[data-action=reader]').setAttribute('aria-label', 'Reopen reader');
    mini.querySelector('[data-action=speech]').setAttribute('aria-label', 'Set up narration');
  }
  patch();
}
function patch() {
  for (const p of records) {
    const d = store.resolve(p.id); p.source.node.classList.toggle('mb-muted', !d.included);
    const transcript = reader?.querySelector(`[data-id="${p.id}"]`);
    if (transcript) { transcript.classList.toggle('skipped', !d.included); transcript.querySelector('.state').textContent = d.included ? '' : 'Skipped · kept visible for review'; }
  }
  const excluded = records.filter(p => !store.resolve(p.id).included).length;
  launcher.querySelector('.count').textContent = excluded; launcher.querySelector('.count').hidden = !excluded;
  if (menu) menu.querySelector('.menu-count').textContent = excluded ? `${excluded} skipped` : 'Passages';
  if (reader) reader.querySelector('.enabled-count').textContent = `${store.snapshot().passages.length} passages`;
  if (reviewChrome) {
    reviewChrome.querySelector('.context-label').textContent = `${records.findIndex(p => p.id === activeId) + 1} / ${records.length}`;
    reviewChrome.querySelector('[data-action=correction]').textContent = store.resolve(activeId).included ? 'Skip' : 'Keep';
    reviewChrome.querySelector('[data-action=undo]').disabled = store.history.length === 0;
  }
  if (sheet && mode === 'why') {
    const d = store.resolve(activeId), p = store.records.get(activeId);
    sheet.querySelector('.decision-label').textContent = `${d.included ? 'Included' : 'Skipped'} · ${d.origin === 'correction' ? 'your choice' : 'original content'}`;
    sheet.querySelector('.reason').textContent = d.origin === 'correction' ? `${d.reason} ${d.included ? 'It is available' : 'It is excluded'} in the reader and future audio.` : 'Uncertain content stays included. You can change this passage here.';
    sheet.querySelector('[data-action=correction]').textContent = d.included ? 'Skip' : 'Keep';
    sheet.querySelector('#remember').checked = !!p.correction?.exampleId;
    sheet.querySelector('.details-body').textContent = `Source: ${activeId}. Revision: ${p.revision}. Local model is not connected to this design prototype. Enabled-sequence revision: ${store.sequenceRevision}.`;
  }
  if (sheet?.querySelector('.example-count')) sheet.querySelector('.example-count').textContent = store.examples.size;
}
store.subscribe(patch);
surfaces.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'correction') store.correct(activeId, store.resolve(activeId).included ? 'NUISANCE' : 'ARTICLE', { teach: !!sheet?.querySelector('#remember')?.checked });
  else if (action === 'undo') { if (!store.undo()) notify('No correction to undo.'); }
  else if (action === 'done') show('idle');
  else if (action === 'back') show(previousMode);
  else if (action === 'clear-corrections') store.clearCorrections();
  else if (action === 'previous' || action === 'next') {
    const index = records.findIndex(p => p.id === activeId);
    selectPassage(records[Math.max(0, Math.min(records.length - 1, index + (action === 'next' ? 1 : -1)))].id, { scroll: true });
  } else if (action === 'type') {
    const size = phone.dataset.large !== 'true'; setLarge(size); document.getElementById('large-type').checked = size;
  } else if (action === 'minimize') show('mini');
  else if (['audio-back', 'audio-next', 'rate'].includes(action)) notify('Playback is not connected in this design study.');
  else if (action === 'share') notify('Clean-link sharing will be connected after the core review.');
  else if (action === 'later') notify('Rule editing and site tools follow the filtering milestone.');
  else if (action === 'demo' || action === 'connect') {
    const error = sheet.querySelector('.form-error'); error.hidden = false; error.textContent = 'Design preview. No request was sent to Azure.';
  } else if (['review', 'reader', 'why', 'more', 'speech'].includes(action)) show(action);
});
pageScroll.addEventListener('scroll', () => requestAnimationFrame(positionMarkers), { passive: true });
new ResizeObserver(positionMarkers).observe(phone);
let drag;
launcher.addEventListener('pointerdown', event => {
  drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, originalRight: parseFloat(launcher.style.right || 18), originalBottom: parseFloat(launcher.style.bottom || 22), moved: false };
  launcher.setPointerCapture(event.pointerId);
});
launcher.addEventListener('pointermove', event => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (Math.hypot(dx, dy) > 8) drag.moved = true;
  if (drag.moved) { launcher.style.right = `${Math.max(8, Math.min(phone.clientWidth - 56, drag.originalRight - dx))}px`; launcher.style.bottom = `${Math.max(8, Math.min(phone.clientHeight - 56, drag.originalBottom - dy))}px`; }
});
launcher.addEventListener('pointerup', () => { const moved = drag?.moved; drag = null; if (!moved) show(mode === 'menu' ? 'idle' : 'menu'); });
launcher.addEventListener('pointercancel', () => { drag = null; });
launcher.addEventListener('click', event => { if (event.detail === 0) show(mode === 'menu' ? 'idle' : 'menu'); });
function setTheme(theme) { phone.dataset.theme = theme; host.dataset.theme = theme; document.getElementById('appearance').value = theme; }
function setLarge(large) { phone.dataset.large = String(large); host.dataset.large = String(large); positionMarkers(); }
document.getElementById('appearance').addEventListener('change', event => setTheme(event.target.value));
document.getElementById('page-style').addEventListener('change', event => { phone.dataset.page = event.target.value; positionMarkers(); });
document.getElementById('large-type').addEventListener('change', event => setLarge(event.target.checked));
document.getElementById('review-view').addEventListener('change', event => {
  if (['review', 'why'].includes(event.target.value)) selectPassage('promo', { scroll: true });
  show(event.target.value);
  if (['review', 'why'].includes(event.target.value)) pageScroll.scrollTop = store.records.get('promo').source.node.offsetTop - 140;
  positionMarkers();
});
shadow.addEventListener('keydown', event => { if (event.key === 'Escape') show(['why', 'speech', 'more'].includes(mode) ? previousMode : 'idle'); });
const params = new URLSearchParams(location.search);
if (params.get('embed') === '1') document.body.dataset.embed = 'true';
if (['320', '390', '844'].includes(params.get('width'))) phone.style.width = params.get('width') + 'px';
if (['390', '430', '844'].includes(params.get('height'))) phone.style.height = params.get('height') + 'px';
setTheme(params.get('theme') === 'dark' ? 'dark' : 'light');
phone.dataset.page = params.get('page') === 'busy' ? 'busy' : 'clean';
document.getElementById('page-style').value = phone.dataset.page;
if (params.get('skipped') === '1') store.correct('promo', 'NUISANCE');
const initial = params.get('view') || 'menu';
show(initial);
if (['review', 'why'].includes(initial)) { pageScroll.scrollTop = store.records.get('promo').source.node.offsetTop - 140; positionMarkers(); }
icons(); patch();
// Test/review access is read-only except the explicit prototype view command.
window.masterButtonStudy = { snapshot: () => store.snapshot(), examples: () => [...store.examples.values()],
  getState: () => ({ mode, activeId, excluded: records.filter(p => !store.resolve(p.id).included).map(p => p.id) }),
  show, selectPassage, setTheme, setLarge };
