import { SAMPLE_RATE } from './azure.mjs';
export function wav(pcm, sampleRate = SAMPLE_RATE) {
  const header = new ArrayBuffer(44), v = new DataView(header), ascii = (offset, s) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); v.setUint32(4, pcm.byteLength + 36, true); ascii(8, 'WAVE'); ascii(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ascii(36, 'data'); v.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}
export function splitText(text, limit = 800) {
  const result = []; let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + limit);
    if (end < text.length) {
      const part = text.slice(start, end), sentence = Math.max(part.lastIndexOf('. '), part.lastIndexOf('? '), part.lastIndexOf('! '), part.lastIndexOf('\n'));
      const space = part.lastIndexOf(' '); if (sentence > limit / 2) end = start + sentence + 1; else if (space > limit / 2) end = start + space + 1;
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    result.push({ text: text.slice(start, end), start, end }); start = end;
  }
  return result;
}
export function segmentsFor(snapshot) {
  return snapshot.passages.flatMap(p => splitText(p.text).map((c, index) => ({ ...c, passageId: p.id, revision: p.revision, passageText: p.text, id: `${p.id}:${p.revision}:${index}` })));
}
export class AudioCache {
  constructor(maxBytes = 64 * 1024 * 1024) { this.maxBytes = maxBytes; this.entries = new Map(); this.bytes = 0; }
  key(text, config) { return JSON.stringify([config.region, config.voice, text]); }
  get(key) { const item = this.entries.get(key); if (!item) return null; this.entries.delete(key); this.entries.set(key, item); return item; }
  put(key, item) {
    if (item.pcm.byteLength > this.maxBytes) return;
    const previous = this.entries.get(key); if (previous) this.bytes -= previous.pcm.byteLength;
    this.entries.delete(key); this.entries.set(key, item); this.bytes += item.pcm.byteLength;
    while (this.bytes > this.maxBytes) { const [k, v] = this.entries.entries().next().value; this.entries.delete(k); this.bytes -= v.pcm.byteLength; }
  }
  clear() { this.entries.clear(); this.bytes = 0; }
}
