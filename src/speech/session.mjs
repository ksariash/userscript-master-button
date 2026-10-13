import { abortError } from './azure.mjs';
import { AudioCache, segmentsFor, wav } from './audio.mjs';
/** One bounded speech job and one playback intent, sharing authoritative decisions. */
export class SpeechSession {
  constructor(store, client, { audio, getConfig, onState = () => {}, makeURL = b => URL.createObjectURL(b), revokeURL = u => URL.revokeObjectURL(u), cache = new AudioCache() } = {}) {
    this.store = store; this.client = client; this.audio = audio; this.getConfig = getConfig; this.onState = onState; this.makeURL = makeURL; this.revokeURL = revokeURL; this.cache = cache;
    this.closed = false; this.pending = new Map(); this.epoch = 0; this.status = 'idle'; this.error = ''; this.current = null; this.preparing = false; this.wantPlay = false; this.controller = new AbortController(); this.demoController = null; this.demoActive = false;
    this.unsubscribe = store.subscribe(e => { if (e.sequenceChanged) this.sequenceChanged(); });
    audio.addEventListener('ended', () => { if (this.demoActive) { this.demoActive = false; this.status = 'ended'; this.emit(); } else if (this.current) this.next().catch(e => this.fail(e)); else this.emit(); });
    audio.addEventListener('timeupdate', () => this.emit()); audio.addEventListener('durationchange', () => this.emit());
    audio.addEventListener('playing', () => { this.status = this.demoActive ? 'demo' : 'playing'; this.emit(); }); audio.addEventListener('pause', () => { if (this.status === 'playing') this.status = 'paused'; this.emit(); });
    audio.addEventListener('error', () => this.fail(new Error('The browser could not play this audio. Retry or save a prepared recording.')));
  }
  valid(s, config) {
    const p = this.store.records.get(s.passageId), current = this.getConfig();
    return !!p && p.revision === s.revision && p.originalText === s.passageText && this.store.reading().some(x => x.id === p.id) && this.store.resolve(p.id).included && current.region === config.region && current.voice === config.voice;
  }
  async ensure(s, { signal = this.controller.signal, config = this.getConfig() } = {}) {
    if (this.closed || !this.valid(s, config) || signal.aborted) throw abortError();
    const key = this.cache.key(s.text, config), cached = this.cache.get(key); if (cached) return cached;
    const old = this.pending.get(key); if (old && !old.signal.aborted) return old.promise;
    const promise = this.client.synthesize(s.text, config, { signal, recheck: () => this.valid(s, config) }).then(item => { this.cache.put(key, item); this.emit(); return item; }).finally(() => { if (this.pending.get(key)?.promise === promise) this.pending.delete(key); });
    this.pending.set(key, { promise, signal }); return promise;
  }
  async play(passageId, offset = 0) {
    if (this.closed) throw abortError(); this.stopDemo(); this.wantPlay = true; const list = segmentsFor(this.store.snapshot());
    const segment = passageId ? list.find(s => s.passageId === passageId) : this.current && list.find(s => s.id === this.current.id) || list[0];
    if (!segment) { this.wantPlay = false; throw new Error('No enabled text to read. Keep a passage first.'); }
    const epoch = ++this.epoch, config = { ...this.getConfig() };
    this.audio.pause(); this.current = segment; this.status = 'buffering'; this.error = ''; this.emit();
    try {
      const item = await this.ensure(segment, { config });
      if (epoch !== this.epoch || !this.valid(segment, config) || !this.wantPlay) return;
      if (this.url) this.revokeURL(this.url); this.url = this.makeURL(wav(item.pcm)); this.audio.src = this.url;
      this.audio.playbackRate = config.rate || 1; this.audio.currentTime = Math.max(0, Math.min(offset, item.duration));
      await this.audio.play(); if (epoch !== this.epoch) return;
      this.status = 'playing'; this.mediaSession(); this.emit(); this.prefetch(segment);
    } catch (e) { if (epoch === this.epoch && e.name !== 'AbortError') { this.fail(e); throw e; } }
  }
  async toggle() {
    if (this.closed) throw abortError(); if (this.status === 'playing') { this.wantPlay = false; this.audio.pause(); return; }
    if (this.current && this.audio.src && this.valid(this.current, this.getConfig()) && this.status === 'paused') { this.stopDemo(); this.wantPlay = true; await this.audio.play(); this.status = 'playing'; this.emit(); return; }
    return this.play(this.current?.passageId);
  }
  prefetch(segment) {
    if (this.preparing) return; this.preparing = true;
    const epoch = this.epoch, list = segmentsFor(this.store.snapshot()), index = list.findIndex(s => s.id === segment.id);
    (async () => {
      for (const s of list.slice(index + 1, index + 3)) {
        if (epoch !== this.epoch || this.controller.signal.aborted) break;
        await this.ensure(s);
      }
    })().catch(e => { if (e.name !== 'AbortError') { this.error = 'A later segment needs retry. Current audio can continue.'; this.emit(); } }).finally(() => { this.preparing = false; });
  }
  async next(direction = 1) {
    const list = segmentsFor(this.store.snapshot()), index = list.findIndex(s => s.id === this.current?.id), s = list[index + direction];
    if (!s) { this.wantPlay = false; this.status = 'ended'; this.audio.pause(); this.emit(); return; }
    // Pass the exact segment, including later chunks within a long passage.
    return this.playSegment(s);
  }
  async playSegment(s) {
    if (this.closed) throw abortError(); const epoch = ++this.epoch, config = { ...this.getConfig() }; this.current = s; this.status = 'buffering'; this.wantPlay = true; this.emit();
    try {
      const item = await this.ensure(s, { config }); if (epoch !== this.epoch || !this.valid(s, config) || !this.wantPlay) return;
      this.audio.pause(); if (this.url) this.revokeURL(this.url); this.url = this.makeURL(wav(item.pcm)); this.audio.src = this.url; this.audio.currentTime = 0; this.audio.playbackRate = config.rate || 1;
      await this.audio.play(); this.status = 'playing'; this.mediaSession(); this.emit(); this.prefetch(s);
    } catch (e) { if (epoch === this.epoch && e.name !== 'AbortError') { this.fail(e); throw e; } }
  }
  skipSeconds(seconds) {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    if (duration) this.audio.currentTime = Math.max(0, Math.min(duration, this.audio.currentTime + seconds)); this.emit();
  }
  setRate(rate) { this.audio.playbackRate = rate; this.emit(); }
  cancel() {
    this.stopDemo(); this.epoch++; this.wantPlay = false; this.controller.abort(); this.controller = new AbortController(); this.audio.pause(); this.current = null; this.status = 'idle'; this.preparing = false; this.emit();
  }
  sequenceChanged() {
    this.controller.abort(); this.controller = new AbortController(); this.epoch++; this.preparing = false;
    if (this.current && !this.valid(this.current, this.getConfig())) { this.audio.pause(); this.current = null; this.status = 'paused'; this.wantPlay = false; }
    else if (this.current && this.wantPlay) this.prefetch(this.current);
    this.emit();
  }
  fail(error) { if (this.closed || error.name === 'AbortError') return; if(error.name==='NotAllowedError'&&this.current&&this.audio.src){this.status='paused';this.error='Audio is prepared. Tap Play again to start it in Safari.';this.wantPlay=false;this.emit();return;}this.status = 'error'; this.error = error.message; this.wantPlay = false; this.emit(); }
  emit() {
    if (this.closed) return; const config = this.getConfig(), list = segmentsFor(this.store.snapshot()); let knownDuration = 0, prepared = 0;
    for (const s of list) { const item = this.cache.get(this.cache.key(s.text, config)); if (item) { knownDuration += item.duration; prepared++; } }
    this.onState({ status: this.status, error: this.error, currentId: this.current?.passageId, currentSegment: this.current?.id, currentTime: this.audio.currentTime || 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : null, knownDuration, totalDuration: prepared === list.length && list.length ? knownDuration : null, prepared, segments: list.length });
  }
  async demo(text = 'A quiet moment to listen. This is your selected reading voice.') {
    if (this.closed) throw abortError(); this.cancel(); this.stopDemo(); const controller = this.demoController = new AbortController(), config = { ...this.getConfig() }, key = this.cache.key(text, config);
    try {
      const item = this.cache.get(key) || await this.client.synthesize(text, config, { signal: controller.signal }); this.cache.put(key, item);
      if (controller.signal.aborted) return;
      if (this.url) this.revokeURL(this.url); this.url = this.makeURL(wav(item.pcm)); this.audio.src = this.url; this.audio.playbackRate = config.rate || 1; this.current = null; this.demoActive = true; this.status = 'demo'; await this.audio.play(); this.emit();
    } catch (e) { if (e.name !== 'AbortError') { this.fail(e); throw e; } }
  }
  stopDemo() { this.demoController?.abort(); this.demoController = null; if (this.demoActive) { this.demoActive = false; this.audio.pause(); this.audio.src = ''; this.status = 'idle'; } }
  mediaSession() {
    const media = globalThis.navigator?.mediaSession; if (!media) return;
    try {
      if (globalThis.MediaMetadata) { this.previousMetadata ??= media.metadata; media.metadata = this.ownedMetadata = new MediaMetadata({ title: this.title || 'Master Button reading', artist: this.store.site }); }
      for (const [name, handler] of Object.entries({ play: () => this.toggle().catch(e => this.fail(e)), pause: () => { this.wantPlay = false; this.audio.pause(); }, seekbackward: d => this.skipSeconds(-(d.seekOffset || 15)), seekforward: d => this.skipSeconds(d.seekOffset || 15), previoustrack: () => this.next(-1).catch(e => this.fail(e)), nexttrack: () => this.next().catch(e => this.fail(e)) })) media.setActionHandler(name, handler);
    } catch { /* Individual system actions may be unavailable; ordinary player remains. */ }
  }
  stop() { this.closed = true; this.cancel(); this.stopDemo(); this.unsubscribe(); if (this.url) this.revokeURL(this.url); this.cache.clear(); this.audio.src = ''; const media=globalThis.navigator?.mediaSession; if(media&&this.ownedMetadata&&media.metadata===this.ownedMetadata){for(const name of ['play','pause','seekbackward','seekforward','previoustrack','nexttrack'])try{media.setActionHandler(name,null);}catch{}media.metadata=this.previousMetadata||null;} }
}
