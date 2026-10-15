import {PreferenceWriter} from './preference-writer.mjs';
import { validExamples } from '../../core/decisions.mjs';
export const SETTINGS_KEY = 'master-button:v2', SPEECH_KEY = 'master-button:speech-key';
const object = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const bounded = (x, lo, hi, fallback) => Number.isFinite(x) && x >= lo && x <= hi ? x : fallback;
const region = x => typeof x === 'string' && /^[a-z][a-z0-9]{2,35}$/.test(x) ? x : 'eastus';
const storageOperation = async (operation, timeout = 12000) => {
  let timer;try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Extension storage timed out. Reload the setup page and check Userscripts permissions.')),timeout);})]);}finally{clearTimeout(timer);}
};
export const defaults = () => ({ schema: 2, appearance: 'system', textSize: 19, rate: 1, modelEnabled: false, launcher: { x: .94, y: .93 }, sites: {}, speech: { region: 'eastus', voice: 'en-US-JennyNeural', quality: 'standard' }, legacy: {} });
export function validateSettings(value) {
  const v = object(value), d = defaults(), sites = {};
  for (const [host, raw] of Object.entries(object(v.sites)).slice(-100)) {
    if (!/^[a-z0-9.-]+$/i.test(host)) continue; const s = object(raw);
    sites[host] = { automatic: s.automatic !== false, learning: s.learning !== false, mutedOnly: s.mutedOnly === true,
      examples: validExamples(s.examples).filter(e => e.site === host).slice(-80).map((e, i) => ({ ...e, id: typeof e.id === 'string' ? e.id : `stored:${host}:${i}`, enabled: e.enabled !== false })),
      rules: Array.isArray(s.rules) ? s.rules.filter(r => r && typeof r.selector === 'string' && r.selector.length <= 500 && ['ARTICLE', 'NUISANCE'].includes(r.label)).slice(-50).map((r, i) => ({ ...r, id: String(r.id || `rule:${i}`), enabled: r.enabled !== false })) : [] };
  }
  return { ...d, schema: 2, appearance: ['system', 'light', 'dark'].includes(v.appearance) ? v.appearance : d.appearance,
    textSize: bounded(v.textSize, 16, 32, 19), rate: bounded(v.rate, .5, 2, 1), modelEnabled: v.modelEnabled===true,
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
  constructor(gm,{preferenceTimeout=3000}={}) { this.gm = gm;this.preferenceTimeout=preferenceTimeout;this.preferencesReady=false;this.preferenceState={state:'not-read'};this.writer=new PreferenceWriter(value=>this.gm.setValue(SETTINGS_KEY,value),{timeout:preferenceTimeout,onState:state=>{this.preferenceState=state;}}); this.value = defaults(); this.queue = Promise.resolve(); this.ephemeralSites = new Map(); this.persistent = typeof gm?.getValue==='function' && typeof gm?.setValue==='function';this.startupState='not-read';this.storageCheck={state:'not-run'}; }
  async load() {
    if (!this.persistent) {this.preferenceState={state:'unavailable'};return this.value;}
    this.preferencesReady=false;this.preferenceState={state:'loading'};
    try{
      const current=await storageOperation(()=>this.gm.getValue(SETTINGS_KEY),this.preferenceTimeout);
      const value=current===undefined?migrateLegacy(await storageOperation(()=>this.gm.getValue('master-button:v1'),this.preferenceTimeout)):validateSettings(current);
      this.value=value;this.preferencesReady=true;this.preferenceState={state:'loaded'};
      if(current===undefined)await this.save(); // Original namespace remains untouched.
      return this.value;
    }catch(error){if(!this.preferencesReady)this.preferenceState={state:'failed',operation:'read',message:'Preferences could not load. Changes are temporary; reload to retry. Stored preferences will not be overwritten.'};throw error;}
  }
  preferenceMessage(){
    if(!this.persistent)return 'Extension storage unavailable; changes are temporary and speech keys cannot be saved.';
    if(this.preferenceState.state==='failed')return this.preferenceState.message;
    return this.preferencesReady?'Preferences stored by Userscripts.':'Preferences have not loaded; changes are temporary. Reload to retry.';
  }
  site(host) { if (Object.hasOwn(this.value.sites, host)) return this.value.sites[host]; if (!this.ephemeralSites.has(host)) this.ephemeralSites.set(host, { automatic: true, learning: true, mutedOnly: false, examples: [], rules: [] }); return this.ephemeralSites.get(host); }
  saveSite(host) { this.value.sites[host] = this.site(host); return this.save(); }
  save() {
    const value = validateSettings(this.value); this.value = value;
    if (!this.persistent) return Promise.resolve(false);
    if(!this.preferencesReady)return Promise.reject(new Error('Stored preferences were not read. Changes are temporary; reload to retry without overwriting existing data.'));
    this.queue=this.writer.save(value);return this.queue;
  }
  async getKey() { if (!this.persistent) return '';let v;try{v=await storageOperation(()=>this.gm.getValue(SPEECH_KEY,''));}catch{throw new Error('Userscripts could not read the speech key. Run Check extension storage in Speech setup.');}return typeof v === 'string' ? v.trim() : ''; }
  async replaceKey(key) {
    if (!this.persistent) throw new Error('Extension storage is unavailable. Speech keys cannot be saved on this page.');
    // Resource keys are opaque header values, not necessarily hexadecimal.
    if (typeof key!=='string'||!/^[\x21-\x7e]{16,512}$/.test(key.trim())) throw new Error('Paste the resource key from Azure Keys and Endpoint, without spaces or line breaks.');
    const value=key.trim();
    try{await storageOperation(()=>this.gm.setValue(SPEECH_KEY,value));}catch{throw new Error('Userscripts could not write or confirm the key within 12 seconds. Reload this setup page, then check extension storage. Your pasted key remains in the field.');}
    let saved;try{saved=await storageOperation(()=>this.gm.getValue(SPEECH_KEY));}catch{throw new Error('Userscripts could not verify the saved key. Check extension storage before retrying.');}
    if(saved!==value)throw new Error('Userscripts did not retain the saved key. Run Check extension storage below.');
  }
  async checkStorage(){
    this.storageCheck={state:'checking'};const gm=this.gm;
    if(!this.persistent||typeof gm?.deleteValue!=='function')return this.storageCheck={state:'failed',stage:'api',code:'missing-storage-grants'};
    const token=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,name=`master-button:storage-probe:${token}`;
    let stage='read',failure=null,wrote=false;
    try{await storageOperation(()=>gm.getValue(name));stage='write';wrote=true;await storageOperation(()=>gm.setValue(name,token));stage='verify';if(await storageOperation(()=>gm.getValue(name))!==token)failure={stage,code:'readback-mismatch'};}
    catch{failure={stage,code:'extension-operation-failed'};}
    finally{if(wrote){try{await storageOperation(()=>gm.deleteValue(name));if(await storageOperation(()=>gm.getValue(name))!==undefined&&!failure)failure={stage:'cleanup',code:'probe-not-deleted'};}catch{if(!failure)failure={stage:'cleanup',code:'extension-operation-failed'};}}}
    return this.storageCheck=failure?{state:'failed',...failure}:{state:'passed',stage:'read-write-read-delete'};
  }
  async forgetKey() { if (typeof this.gm?.deleteValue!=='function')throw new Error('Userscripts key deletion is unavailable. Check its storage grants.');try{await storageOperation(()=>this.gm.deleteValue(SPEECH_KEY));if(await this.getKey())throw new Error();}catch{throw new Error('Userscripts could not confirm key deletion. Run Check extension storage.');} }
  async keyNames() { if (!this.gm?.listValues) throw new Error('This Userscripts version cannot list stored key names.'); const names = await storageOperation(()=>this.gm.listValues()); return Array.isArray(names) ? names.filter(n => typeof n === 'string' && n !== SPEECH_KEY && n.length < 200 && /(?:azure|speech|tts).*key|key.*(?:azure|speech|tts)/i.test(n)).slice(0,50) : []; }
  async importLegacyKey(storageKey) {
    // The documented old key name is unknown. User selects an exact extension key;
    // no enumeration, value logging, destructive migration, or page-storage fallback.
    if (!storageKey || storageKey === SETTINGS_KEY || storageKey === 'master-button:v1') throw new Error('Choose the separately stored speech-key name.');
    const value = await storageOperation(()=>this.gm.getValue(storageKey)); if (typeof value !== 'string') throw new Error('That extension key is not a speech key.');
    await this.replaceKey(value);
  }
}
