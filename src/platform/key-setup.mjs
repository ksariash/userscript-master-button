export const KEY_SETUP_URL = 'https://ksariash.github.io/userscript-master-button/setup.html';
export function isKeySetupURL(value) {
  // Trust one HTTPS document, never a whole host or user-controlled URL suffix.
  try { const u = new URL(value); return u.href === KEY_SETUP_URL; }
  catch { return false; }
}
export function isLegacyKeySetupURL(value) {
  try {
    const u = new URL(value);
    return u.origin === 'https://raw.githubusercontent.com' &&
      /^\/ksariash\/userscript-master-button\/(?:main|refs\/heads\/main)\/SETUP\.txt$/.test(u.pathname);
  } catch { return false; }
}
export function showLegacySetupNotice(document) {
  // WebKit 221283/218086: sandboxed documents may inject but block callbacks.
  // This native anchor must work without events, timers, or the GM bridge.
  if(document.querySelector('[data-master-button="setup-moved"]'))return;
  const notice=document.createElement('section');notice.dataset.masterButton='setup-moved';
  const text=document.createElement('p');text.textContent='Key setup has moved. This raw document can block Safari extension buttons. Do not enter a key here. The new page requires the updated userscript and published setup hosting.';
  const link=document.createElement('a');link.href=KEY_SETUP_URL;link.textContent='Open dedicated key setup';link.rel='noreferrer';
  notice.append(text,link);document.body.prepend(notice);
}
