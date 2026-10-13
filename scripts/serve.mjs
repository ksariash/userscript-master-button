import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const base = resolve('.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname === '/' ? '/prototype/review.html' : url.pathname);
    const file = resolve(base, '.' + relative);
    if (!file.startsWith(base + '/')) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    // Serve locally; no remote dependency execution is necessary for this study.
    res.setHeader('Cache-Control', 'no-store'); res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Prototype: http://127.0.0.1:4173 (desktop preview; not Safari proof)'));
