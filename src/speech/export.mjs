import { Mp3Encoder } from '@breezystack/lamejs';
import { SAMPLE_RATE, abortError } from './azure.mjs';
import { segmentsFor } from './audio.mjs';
export const QUALITY = { compact: 64, standard: 96, high: 128 };
/** One PCM stream through one encoder. Never concatenate independently encoded MP3s. */
export async function encodeMP3(buffers, { quality = 'standard', signal, onProgress = () => {}, yieldTask = () => new Promise(r => setTimeout(r, 0)) } = {}) {
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, QUALITY[quality] || 96), parts = [], total = buffers.reduce((n, b) => n + b.byteLength / 2, 0); let processed = 0;
  for (const buffer of buffers) {
    const view = new DataView(buffer), samples = new Int16Array(buffer.byteLength / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true);
    for (let i = 0; i < samples.length; i += 1152) {
      if (signal?.aborted) throw abortError(); const output = encoder.encodeBuffer(samples.subarray(i, i + 1152)); if (output.length) parts.push(new Uint8Array(output));
      processed += Math.min(1152, samples.length - i);
      if (i % (1152 * 20) === 0) { onProgress(processed / total); await yieldTask(); }
    }
  }
  if (signal?.aborted) throw abortError(); const end = encoder.flush(); if (end.length) parts.push(new Uint8Array(end)); onProgress(1);
  return new Blob(parts, { type: 'audio/mpeg' });
}
export class ExportJob {
  constructor(store, speech, { encode = encodeMP3, maxPCMBytes = 256 * 1024 * 1024 } = {}) { this.store = store; this.speech = speech; this.encode = encode; this.maxPCMBytes = maxPCMBytes; this.controller = null; this.artifact = null; }
  cancel() { this.controller?.abort(); }
  async prepare({ quality = 'standard', onProgress = () => {} } = {}) {
    this.cancel(); const controller = this.controller = new AbortController(), snapshot = this.store.snapshot(), config = { ...this.speech.getConfig() }, buffers = [], timings = []; let bytes = 0, seconds = 0;
    const valid = () => this.store.documentId === snapshot.documentId && this.store.sequenceRevision === snapshot.revision && config.region === this.speech.getConfig().region && config.voice === this.speech.getConfig().voice;
    const off = this.store.subscribe(e => { if (e.sequenceChanged) controller.abort(); });
    try {
      const segments = segmentsFor(snapshot); if (!segments.length) throw new Error('No enabled text to export.');
      for (const [index, s] of segments.entries()) {
        if (controller.signal.aborted || !valid()) throw abortError();
        const item = await this.speech.ensure(s, { signal: controller.signal, config });
        bytes += item.pcm.byteLength; if (bytes > this.maxPCMBytes) throw new Error('This recording exceeds the 256 MB conversion budget. Export a smaller reading selection.');
        buffers.push(item.pcm); timings.push({ id: s.passageId, start: seconds, end: seconds + item.duration }); seconds += item.duration;
        onProgress({ stage: 'preparing', completed: index + 1, total: segments.length });
      }
      const blob = await this.encode(buffers, { quality, signal: controller.signal, onProgress: p => onProgress({ stage: 'encoding', progress: p }) });
      if (controller.signal.aborted || !valid()) throw abortError();
      return this.artifact = { blob, snapshot, config, quality, timings, duration: seconds };
    } finally { off(); if (this.controller === controller) this.controller = null; }
  }
  currentArtifact() { return this.artifact?.snapshot.documentId === this.store.documentId && this.artifact.snapshot.revision === this.store.sequenceRevision && this.artifact.config.region === this.speech.getConfig().region && this.artifact.config.voice === this.speech.getConfig().voice && this.artifact.quality === (this.speech.getConfig().quality || 'standard') ? this.artifact : null; }
}
export function transcript(snapshot, timings = null) {
  return snapshot.passages.map(p => {
    const rows = timings?.filter(t => t.id === p.id), verified = rows?.length ? `[${rows[0].start.toFixed(2)}–${rows.at(-1).end.toFixed(2)} seconds, PCM segment boundaries]\n` : '';
    return verified + p.text;
  }).join('\n\n');
}
export async function shareFile(blob, filename, navigator, document) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) { try { await navigator.share({ files: [file] }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'canceled'; } }
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.dataset.masterButton = 'save'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); return 'save requested';
}
