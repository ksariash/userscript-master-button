/** Public revision-pinned data only; omit credentials and bound each response. */
export async function modelAsset(path, model, { cache, fetcher = globalThis.fetch, progress = () => {}, signal } = {}) {
  signal?.throwIfAborted();
  const url = `https://huggingface.co/${model.id}/resolve/${model.revision}/${path}`, maxBytes = path.endsWith('.onnx') ? model.weightBytes : 12 * 1024 * 1024;
  let response = await cache?.match(url), hit = !!response;
  if (!response) response = await fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  signal?.throwIfAborted();
  if (!response.ok) throw new Error('Model asset download failed.');
  const declared = Number(response.headers.get('Content-Length')); if (declared > maxBytes) throw new Error('Model asset exceeds download budget.');
  const reader = response.body?.getReader(); let bytes;
  if (reader) {
    const chunks = []; let loaded = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; loaded += value.byteLength;
      if (loaded > maxBytes) throw new Error('Model asset exceeds download budget.');
      chunks.push(value); progress({ file: path, loaded, total: declared || (path.endsWith('.onnx') ? maxBytes : undefined) });
    }} catch (error) { await reader.cancel().catch(() => {}); throw error; }
    bytes = new Uint8Array(loaded); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  } else { bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > maxBytes) throw new Error('Model asset exceeds download budget.'); }
  if (path.endsWith('.onnx') && bytes.byteLength !== model.weightBytes) throw new Error('Incomplete model download.');
  signal?.throwIfAborted();
  if (!hit && cache) await cache.put(url, new Response(bytes)).catch(() => progress({ file: 'Cache unavailable · this download is temporary' }));
  return path.endsWith('.json') ? JSON.parse(new TextDecoder().decode(bytes)) : bytes;
}

/** At most two downloads, starting weights early; identical pinned assets and bounds. */
export async function loadModelAssets(model, options = {}) {
  const paths=['onnx/model_quantized.onnx','tokenizer.json','tokenizer_config.json','config.json'];
  const controller=new AbortController(),results={};let next=0;
  const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
  const worker=async()=>{while(next<paths.length){const path=paths[next++];results[path]=await modelAsset(path,model,{...options,signal:controller.signal});}};
  try { await Promise.all([worker(),worker()].map(p=>p.catch(error=>{controller.abort();throw error;})));return results; }
  finally { options.signal?.removeEventListener('abort',abort); }
}
