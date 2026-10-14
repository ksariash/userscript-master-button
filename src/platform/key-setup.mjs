export const KEY_SETUP_URL = 'https://raw.githubusercontent.com/ksariash/userscript-master-button/main/SETUP.txt';
export function isKeySetupURL(value) {
  try {
    const u = new URL(value);
    return u.origin === 'https://raw.githubusercontent.com' &&
      /^\/ksariash\/userscript-master-button\/(?:main|refs\/heads\/main)\/SETUP\.txt$/.test(u.pathname);
  } catch { return false; }
}
