import { validExamples } from '../../core/decisions.mjs';
export const SETTINGS_KEY = 'master-button:v2', SPEECH_KEY = 'master-button:speech-key';
const object = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const bounded = (x, lo, hi, fallback) => Number.isFinite(x) && x >= lo && x <= hi ? x : fallback;
const region = x => typeof x === 'string' && /^[a-z][a-z0-9]{2,35}$/.test(x) ? x : 'eastus';
export const defaults = () => ({ schema: 2, appearance: 'system', textSize: 19, rate: 1, launcher: { x: .94, y: .93 }, sites: {}, speech: { region: 'eastus', voice: 'en-US-JennyNeural', quality: 'standard' }, legacy: {} });
export function validateSettings(value) {
  const v = object(value), d = defaults(), sites = {};
  for (const [host, raw] of Object.entries(object(v.sites)).slice(-100)) {
    if (!/^[a-z0-9.-]+$/i.test(host)) continue; const s = object(raw);
    sites[host] = { automatic: s.automatic !== false, learning: s.learning !== false, mutedOnly: s.mutedOnly === true,
      examples: validExamples(s.examples).filter(e => e.site === host).slice(-80).map((e, i) => ({ ...e, id: typeof e.id === 'string' ? e.id : `stored:${host}:${i}`, enabled: e.enabled !== false })),
      rules: Array.isArray(s.rules) ? s.rules.filter(r => r && typeof r.selector === 'string' && r.selector.length <= 500 && ['ARTICLE', 'NUISANCE'].includes(r.label)).slice(-50).map((r, i) => ({ ...r, id: String(r.id || `rule:${i}`), enabled: r.enabled !== false })) : [] };
  }
  return { ...d, schema: 2, appearance: ['system', 'light', 'dark'].includes(v.appearance) ? v.appearance : d.appearance,
    textSize: bounded(v.textSize, 16, 32, 19), rate: bounded(v.rate, .5, 2, 1),
    launcher: { x: bounded(v.launcher?.x, 0, 1, d.launcher.x), y: bounded(v.launcher?.y, 0, 1, d.launcher.y) }, sites,
    speech: { region: region(v.speech?.region), voice: typeof v.speech?.voice === 'string' && /^[\w-]+$/.test(v.speech.voice) ? v.speech.voice : d.speech.voice, quality: ['compact', 'standard', 'high'].includes(v.speech?.quality) ? v.speech.quality : 'standard' },
    legacy: object(v.legacy) };
}
export function migrateLegacy(value) {
  // Preserve unknown fields without guessing rejected implementation schemas.
  const v = object(typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return null; } })() : value);
  return validateSettings({ ...v, schema: 2, textSize: v.textSize ?? v.fontSize, rate: v.rate ?? v.playbackRate,
    speech: v.speech || { region: v.region, voice: v.voice }, legacy: v });
}
export class Settings {
  constructor(gm) { this.gm = gm; this.value = defaults(); this.queue = Promise.resolve(); this.ephemeralSites = new Map(); this.persistent = !!gm?.getValue && !!gm?.setValue; }
  async load() {
    if (!this.persistent) return this.value;
    const current = await this.gm.getValue(SETTINGS_KEY);
    if (current === undefined) {
      this.value = migrateLegacy(await this.gm.getValue('master-button:v1'));
      await this.gm.setValue(SETTINGS_KEY, this.value); // Original namespace remains untouched.
    } else this.value = validateSettings(current);
    return this.value;
  }
  site(host) { if (Object.hasOwn(this.value.sites, host)) return this.value.sites[host]; if (!this.ephemeralSites.has(host)) this.ephemeralSites.set(host, { automatic: true, learning: true, mutedOnly: false, examples: [], rules: [] }); return this.ephemeralSites.get(host); }
  saveSite(host) { this.value.sites[host] = this.site(host); return this.save(); }
  save() {
    const value = validateSettings(this.value); this.value = value;
    if (!this.persistent) return Promise.resolve(false);
    this.queue = this.queue.catch(() => {}).then(() => this.gm.setValue(SETTINGS_KEY, value)); return this.queue;
  }
  async getKey() { if (!this.persistent) return ''; const v = await this.gm.getValue(SPEECH_KEY, ''); return typeof v === 'string' ? v.trim() : ''; }
  async replaceKey(key) {
    if (!this.persistent) throw new Error('Extension storage is unavailable. Speech keys cannot be saved on this page.');
    if (!/^[a-zA-Z0-9]{16,128}$/.test(key.trim())) throw new Error('Enter your Azure Speech resource key.');
    await this.gm.setValue(SPEECH_KEY, key.trim());
  }
  async forgetKey() { if (this.gm?.deleteValue) await this.gm.deleteValue(SPEECH_KEY); }
  async keyNames() { if (!this.gm?.listValues) throw new Error('This Userscripts version cannot list stored key names.'); const names = await this.gm.listValues(); return Array.isArray(names) ? names.filter(n => typeof n === 'string' && n !== SPEECH_KEY && n.length < 200 && /(?:azure|speech|tts).*key|key.*(?:azure|speech|tts)/i.test(n)).slice(0,50) : []; }
  async importLegacyKey(storageKey) {
    // The documented old key name is unknown. User selects an exact extension key;
    // no enumeration, value logging, destructive migration, or page-storage fallback.
    if (!storageKey || storageKey === SETTINGS_KEY || storageKey === 'master-button:v1') throw new Error('Choose the separately stored speech-key name.');
    const value = await this.gm.getValue(storageKey); if (typeof value !== 'string') throw new Error('That extension key is not a speech key.');
    await this.replaceKey(value);
  }
}
