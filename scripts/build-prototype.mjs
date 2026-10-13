import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
const js = await build({ entryPoints: ['prototype/app.mjs'], bundle: true, write: false, format: 'iife', target: 'safari17', minify: false, loader: { '.css': 'text' } });
let html = await readFile('prototype/index.html', 'utf8');
const css = await readFile('prototype/page.css', 'utf8');
html = html.replace('</head>', `<style>${css}</style></head>`).replace('</body>', `<script>${js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body>`);
await writeFile('prototype/review.html', html);
console.log('Built self-contained prototype/review.html (no model, speech, or network integration).');
