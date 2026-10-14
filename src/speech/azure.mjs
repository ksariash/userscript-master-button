import {parseVoices} from './voices.mjs';
export const SAMPLE_RATE = 24000;
export const REGIONS = ['eastus', 'eastus2', 'westus', 'westus2', 'westus3', 'centralus', 'northcentralus', 'southcentralus', 'westcentralus', 'canadacentral', 'brazilsouth', 'northeurope', 'westeurope', 'uksouth', 'francecentral', 'germanywestcentral', 'switzerlandnorth', 'swedencentral', 'australiaeast', 'southeastasia', 'eastasia', 'japaneast', 'koreacentral', 'centralindia', 'southafricanorth'];
const escapeXML = t => t.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
export function ssml(text, voice, locale=null) {
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,30}){2,8}$/.test(voice)) throw new Error('Select an Azure voice from the voice list.');
  const language = locale||voice.split('-').slice(0, 2).join('-');
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}"><voice name="${escapeXML(voice)}">${escapeXML(text)}</voice></speak>`;
}
export function endpoint(region, path) {
  if (!REGIONS.includes(region)) throw new Error('Select a supported public Azure region.');
  return `https://${region}.tts.speech.microsoft.com${path}`;
}
export function abortError() { const e = new Error('Canceled'); e.name = 'AbortError'; return e; }
export async function responseBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  if (value?.arrayBuffer) return value.arrayBuffer();
  throw new Error('This Userscripts version did not return binary audio. Check the platform checklist.');
}
/** GM transport goes directly to Microsoft's endpoint. No page fetch or relay. */
export class AzureClient {
  constructor({ request, getKey }) { this.request = request; this.getKey = getKey; this.tail = Promise.resolve(); this.voicesCache = new Map(); }
  async send(details, { signal, recheck = () => true } = {}) {
    const run = async () => {
      if (signal?.aborted || !recheck()) throw abortError();
      const key = await this.getKey(); if (!key) throw new Error('Add your Azure Speech key in Speech setup.');
      // Inclusion is checked again after any awaited storage/queue operation.
      if (signal?.aborted || !recheck()) throw abortError();
      if (!this.request) throw new Error('Extension cross-origin requests are unavailable.');
      const promise = this.request({ ...details, timeout: 60000, headers: { ...details.headers, 'Ocp-Apim-Subscription-Key': key } });
      const abort = () => promise.abort?.(); signal?.addEventListener('abort', abort, { once: true });
      try {
        const response = await promise;
        if (signal?.aborted) throw abortError();
        if (response.status === 401 || response.status === 403) throw new Error('Azure rejected the key or region. Replace the key or choose its region.');
        if (response.status === 429 || response.status >= 500) { const e = new Error('Azure is busy. Retry the segment.'); e.retryable = true; throw e; }
        if (response.status < 200 || response.status >= 300) throw new Error(`Azure request failed (HTTP ${Number(response.status) || 0}). Check the voice and resource.`);
        return response;
      } catch (e) {
        if (signal?.aborted || e.name === 'AbortError') throw abortError();
        if (e.retryable || /^Azure|^This Userscripts/.test(e.message)) throw e;
        throw new Error('Speech request failed. Check your connection and retry.');
      } finally { signal?.removeEventListener('abort', abort); }
    };
    const result = this.tail.catch(() => {}).then(run); this.tail = result.catch(() => {}); return result;
  }
  async voices(region, { signal, refresh = false } = {}) {
    if (!refresh && this.voicesCache.has(region)) return this.voicesCache.get(region);
    const r = await this.send({ url: endpoint(region, '/cognitiveservices/voices/list'), method: 'GET', responseType: 'text' }, { signal });
    let data; try { data = JSON.parse(r.responseText ?? r.response); } catch { throw new Error('Azure returned an unreadable voice list.'); }
    if (!Array.isArray(data)) throw new Error('Azure returned an unreadable voice list.');
    const voices = parseVoices(data);
    this.voicesCache.set(region, voices); return voices;
  }
  async synthesize(text, config, { signal, recheck } = {}) {
    const voices=await this.voices(config.region,{signal});
    if(signal?.aborted||recheck&&!recheck())throw abortError();
    if(!voices.some(v=>v.id===config.voice))throw new Error('This voice is unavailable in your resource region. Open Speech setup and choose a listed voice.');
    const r = await this.send({ url: endpoint(config.region, '/cognitiveservices/v1'), method: 'POST', responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'raw-24khz-16bit-mono-pcm', 'User-Agent': 'MasterButton' }, data: ssml(text, config.voice, voices.find(v=>v.id===config.voice).locale) }, { signal, recheck });
    if (/content-type:[^\r\n]*(?:json|text\/|xml)/i.test(r.responseHeaders || '')) throw new Error('Azure returned a non-audio response.');
    const pcm = await responseBuffer(r.response);
    if (!pcm.byteLength || pcm.byteLength % 2 || pcm.byteLength > 25 * 1024 * 1024 || new TextDecoder().decode(new Uint8Array(pcm, 0, Math.min(4, pcm.byteLength))) === 'RIFF') throw new Error('Azure returned unexpected PCM audio.');
    return { pcm, duration: pcm.byteLength / (SAMPLE_RATE * 2), sampleRate: SAMPLE_RATE, channels: 1 };
  }
}
