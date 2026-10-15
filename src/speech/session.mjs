import {PreparationPool} from './preparation.mjs';
import { abortError } from './azure.mjs';
import { AudioCache, segmentsFor, wav } from './audio.mjs';
/** One bounded speech job and one playback intent, sharing authoritative decisions. */
export class SpeechSession {
  constructor(store, client, { audio, getConfig, onState = () => {}, makeURL = b => URL.createObjectURL(b), revokeURL = u => URL.revokeObjectURL(u), cache = new AudioCache() } = {}) {
    this.store = store; this.client = client; this.audio = audio; this.getConfig = getConfig; this.onState = onState; this.makeURL = makeURL; this.revokeURL = revokeURL; this.cache = cache;
    this.closed = false; this.pool = new PreparationPool((key,item)=>{this.cache.put(key,item);this.emit();}); this.epoch = 0; this.status = 'idle'; this.error = ''; this.current = null; this.preparing = false; this.wantPlay = false; this.controller = new AbortController(); this.demoController = null; this.demoActive = false;
    this.unsubscribe = store.subscribe(e => { if (e.sequenceChanged) this.sequenceChanged(); });
    this.audioListeners = [];
    const listen = (type, callback) => { const handler = e => { if (!this.closed) callback(e); }; this.audioListeners.push([type, handler]); audio.addEventListener(type, handler); };
    listen('ended', () => { if (this.demoActive) { this.demoActive = false; this.status = 'ended'; this.emit(); } else if (this.current) this.next().catch(e => this.fail(e)); else this.emit(); });
    listen('timeupdate', () => this.emit()); listen('durationchange', () => this.emit());
    listen('playing', () => { if(!this.wantPlay&&!this.demoActive){this.audio.pause();return;}this.status = this.demoActive ? 'demo' : 'playing'; this.emit(); }); listen('pause', () => { if (this.status === 'playing') this.status = 'paused'; this.emit(); });
    listen('error', () => { if (this.current || this.demoActive) this.fail(new Error('The browser could not play this audio. Retry or save a prepared recording.')); });
  }
  segments() {
    if (!this.sequence || this.sequence.documentId !== this.store.documentId || this.sequence.revision !== this.store.sequenceRevision) {
      this.sequence = {documentId:this.store.documentId,revision:this.store.sequenceRevision,list:segmentsFor(this.store.snapshot())};
    }
    return this.sequence.list;
  }
  preparation(config = this.getConfig()) {
    const list=this.segments(), key=JSON.stringify([config.region,config.voice]);
    if (!this.preparedState || this.preparedState.list!==list || this.preparedState.key!==key || this.preparedState.revision!==this.cache.revision) {
      let knownDuration=0,prepared=0,contiguous=true,seekDuration=0;const ranges=[];
      for(const s of list){const item=this.cache.peek(this.cache.key(s.text,config));if(item){knownDuration+=item.duration;prepared++;if(contiguous){ranges.push({segment:s,start:seekDuration,end:seekDuration+item.duration});seekDuration+=item.duration;}}else contiguous=false;}
      this.preparedState={list,key,revision:this.cache.revision,knownDuration,prepared,ranges,seekDuration,totalDuration:prepared===list.length&&list.length?knownDuration:null};
    }
    return this.preparedState;
  }
  valid(s, config) {
    const p = this.store.records.get(s.passageId), current = this.getConfig();
    return !!p && p.revision === s.revision && p.originalText === s.passageText && this.store.reading().some(x => x.id === p.id) && this.store.resolve(p.id).included && current.region === config.region && current.voice === config.voice;
  }
  async ensure(s, { signal = this.controller.signal, config = this.getConfig(), priority = 0 } = {}) {
    if (this.closed || !this.valid(s, config) || signal.aborted) throw abortError();
    const key = this.cache.key(s.text, config), cached = this.cache.get(key); if (cached) return cached;
    return this.pool.join(key,{signal,priority,valid:()=>!this.closed&&this.valid(s,config)},(signal,recheck,priority)=>this.client.synthesize(s.text,config,{signal,recheck,priority}));
  }

  async play(passageId, offset = 0) {
    if (this.closed) throw abortError(); this.stopDemo(); this.wantPlay = true; const list = this.segments();
    const segment = passageId ? list.find(s => s.passageId === passageId) : this.current && list.find(s => s.id === this.current.id) || list[0];
    if (!segment) { this.wantPlay = false; throw new Error('No enabled text to read. Keep a passage first.'); }
    return this.playSegment(segment,{offset});
  }

  async toggle() {
    if (this.closed) throw abortError(); if (this.status === 'buffering') { this.wantPlay = !this.wantPlay; this.emit(); return; } if (this.status === 'playing') { this.wantPlay = false; this.audio.pause(); return; }
    if (this.current && this.audio.src && this.valid(this.current, this.getConfig()) && this.status === 'paused') { const epoch=this.epoch,current=this.current;this.stopDemo(); this.wantPlay = true; await this.audio.play(); if(this.closed||epoch!==this.epoch||!this.wantPlay||this.current!==current)return;this.status = 'playing'; this.emit(); return; }
    return this.play(this.current?.passageId);
  }
  prefetch(segment) {
    if (this.preparing === this.epoch + 1) return; const owner = this.preparing = this.epoch + 1;
    const epoch = this.epoch, list = this.segments(), index = list.findIndex(s => s.id === segment.id);
    (async () => {
      for (const s of list.slice(index + 1, index + 3)) {
        if (epoch !== this.epoch || this.controller.signal.aborted) break;
        await this.ensure(s);
      }
    })().catch(e => { if (epoch === this.epoch && e.name !== 'AbortError') { this.error = 'A later segment needs retry. Current audio can continue.'; this.emit(); } }).finally(() => { if(this.preparing===owner)this.preparing = false; });
  }
  async next(direction = 1) {
    const list = this.segments(), index = list.findIndex(s => s.id === this.current?.id), s = list[index + direction];
    if (!s) { this.wantPlay = false; this.status = 'ended'; this.audio.pause(); this.emit(); return; }
    // Pass the exact segment, including later chunks within a long passage.
    return this.playSegment(s,{resume:this.wantPlay});
  }
  async playSegment(s,{offset=0,resume=true}={}) {
    if (this.closed) throw abortError(); this.stopDemo();this.audio.pause();this.releaseAudio(); const epoch = ++this.epoch, config = { ...this.getConfig() }; this.current = s; this.status = 'buffering'; this.wantPlay = resume; this.error='';this.emit();
    try {
      const item = await this.ensure(s, { config, priority: 10 }); if (epoch !== this.epoch || !this.valid(s, config)) return;
      this.audio.pause(); if (this.url) this.revokeURL(this.url); this.url = this.makeURL(wav(item.pcm)); this.audio.src = this.url; this.audio.currentTime = Math.max(0,Math.min(offset,item.duration)); this.audio.playbackRate = config.rate || 1;
      this.status='paused';if(this.wantPlay){await this.audio.play();if(epoch!==this.epoch||!this.valid(s,config))return;if(this.wantPlay)this.status='playing';else this.audio.pause();}this.mediaSession();this.emit();if(this.wantPlay)this.prefetch(s);
    } catch (e) { if (epoch === this.epoch && e.name !== 'AbortError') { this.fail(e); throw e; } }
  }
  async seek(seconds,{resume=this.wantPlay}={}) {
    if(this.closed||!Number.isFinite(seconds))throw abortError();
    const {ranges,seekDuration}=this.preparation();
    if(!ranges.length)throw new Error('Prepare audio before seeking.');
    const time=Math.max(0,Math.min(seconds,seekDuration));
    const row=ranges.find(r=>time<r.end)||ranges.at(-1),offset=time-row.start;
    if(this.current?.id===row.segment.id&&this.audio.src&&this.status!=='buffering') {
      this.audio.currentTime=offset;this.wantPlay=resume;if(!resume){this.audio.pause();this.status='paused';}else if(this.audio.paused)await this.toggle();this.emit();return;
    }
    return this.playSegment(row.segment,{offset,resume});
  }
  skipSeconds(seconds) {
    const row=this.preparation().ranges.find(r=>r.segment.id===this.current?.id);
    if(row)return this.seek(row.start+(this.audio.currentTime||0)+seconds);
    const duration=Number.isFinite(this.audio.duration)?this.audio.duration:0;
    if(duration)this.audio.currentTime=Math.max(0,Math.min(duration,this.audio.currentTime+seconds));this.emit();return Promise.resolve();
  }
  setRate(rate) { this.audio.playbackRate = rate; this.emit(); }
  releaseAudio() { if(this.audio.removeAttribute){this.audio.removeAttribute('src');this.audio.load?.();}else this.audio.src='';if(this.url){this.revokeURL(this.url);this.url=null;} }
  cancel() {
    this.stopDemo(); this.epoch++; this.wantPlay = false; this.controller.abort(); this.controller = new AbortController(); this.clearMediaSession(); this.audio.pause(); this.releaseAudio(); this.current = null; this.status = 'idle'; this.preparing = false; this.emit();
  }
  sequenceChanged() {
    this.controller.abort(); this.controller = new AbortController(); this.epoch++; this.preparing = false;
    if (this.current && !this.valid(this.current, this.getConfig())) { this.clearMediaSession(); this.audio.pause(); this.releaseAudio(); this.current = null; this.status = 'paused'; this.wantPlay = false; }
    else if (this.current && this.status === 'buffering') {
      // The shared signal retired the pending load, even when this segment is still included.
      this.playSegment(this.current,{resume:this.wantPlay}).catch(e=>this.fail(e));
    } else if (this.current && this.wantPlay) this.prefetch(this.current);
    this.emit();
  }
  fail(error) { if (this.closed || error.name === 'AbortError') return; if(error.name==='NotAllowedError'&&this.current&&this.audio.src){this.status='paused';this.error='Audio is prepared. Tap Play again to start it in Safari.';this.wantPlay=false;this.emit();return;}this.status = 'error'; this.error = error.message; this.wantPlay = false; this.emit(); }
  emit() {
    if (this.closed) return; const list=this.segments(), {knownDuration,prepared,totalDuration,ranges,seekDuration}=this.preparation();const row=ranges.find(r=>r.segment.id===this.current?.id);
    this.onState({ status: this.status, error: this.error, currentId: this.current?.passageId, currentSegment: this.current?.id, currentTime: this.audio.currentTime || 0,
      seekDuration,readingTime:row?row.start+(this.audio.currentTime||0):null,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : null, knownDuration, totalDuration, prepared, segments: list.length });
  }
  async demo(text = 'A quiet moment to listen. This is your selected reading voice.') {
    if (this.closed) throw abortError(); this.cancel(); this.stopDemo(); const controller = this.demoController = new AbortController(), config = { ...this.getConfig() }, key = this.cache.key(text, config);
    try {
      const item = this.cache.get(key) || await this.client.synthesize(text, config, { signal: controller.signal, priority:()=>10 });
      if (this.closed || controller.signal.aborted) return; this.cache.put(key, item);
      if (this.url) this.revokeURL(this.url); this.url = this.makeURL(wav(item.pcm)); this.audio.src = this.url; this.audio.playbackRate = config.rate || 1; this.current = null; this.demoActive = true; this.status = 'demo'; await this.audio.play(); this.emit();
    } catch (e) { if (e.name !== 'AbortError') { this.fail(e); throw e; } }
  }
  stopDemo() { this.demoController?.abort(); this.demoController = null; if (this.demoActive) { this.demoActive = false; this.audio.pause(); this.releaseAudio(); this.status = 'idle'; } }
  mediaSession() {
    const media = globalThis.navigator?.mediaSession; if (!media || !globalThis.MediaMetadata) return;
    try {
      if (globalThis.MediaMetadata) { this.previousMetadata ??= media.metadata; media.metadata = this.ownedMetadata = new MediaMetadata({ title: this.title || 'Master Button reading', artist: this.store.site }); }
      for (const [name, handler] of Object.entries({ play: () => this.toggle().catch(e => this.fail(e)), pause: () => { this.wantPlay = false; this.audio.pause(); }, seekbackward: d => this.skipSeconds(-(d.seekOffset || 15)).catch(e=>this.fail(e)), seekforward: d => this.skipSeconds(d.seekOffset || 15).catch(e=>this.fail(e)), seekto: d => this.seek(d.seekTime).catch(e=>this.fail(e)), previoustrack: () => this.next(-1).catch(e => this.fail(e)), nexttrack: () => this.next().catch(e => this.fail(e)) })) { try { media.setActionHandler(name, handler); } catch { /* Unsupported actions must not disable subsequent actions. */ } }
    } catch { /* Individual system actions may be unavailable; ordinary player remains. */ }
  }
  clearMediaSession() {
    const media=globalThis.navigator?.mediaSession;
    if(media&&this.ownedMetadata&&media.metadata===this.ownedMetadata){for(const name of ['play','pause','seekbackward','seekforward','seekto','previoustrack','nexttrack'])try{media.setActionHandler(name,null);}catch{}media.metadata=this.previousMetadata||null;}
    this.ownedMetadata=null;this.previousMetadata=undefined;
  }
  stop() { for(const [type,handler] of this.audioListeners)this.audio.removeEventListener?.(type,handler);this.audioListeners=[];this.closed = true; this.pool.stop();this.cancel(); this.unsubscribe(); this.cache.clear(); }
}
