import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { Defuddle } from 'defuddle/node';

const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,td,th';
const hash = text => createHash('sha256').update(text).digest('hex');
const comparable = text => text.replace(/\s+/g, ' ').trim();

function pathOf(el) {
  const path = [];
  for (let n = el; n?.parentElement; n = n.parentElement) {
    const siblings = [...n.parentElement.children].filter(c => c.tagName === n.tagName);
    path.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(n) + 1})`);
  }
  return path.join('>');
}

/** Bounded leaf-block inventory, not every DIV. Complex direct-text ranges are a later gate. */
export async function extract(html, url) {
  const { document } = parseHTML(html);
  const { document: clone } = parseHTML(html);
  const documentId = hash(url + '\n' + html).slice(0, 20);
  const candidates = [...document.querySelectorAll(BLOCKS)].filter(el =>
    !el.querySelector(BLOCKS) && comparable(el.textContent) && !el.closest('script,style,template,noscript'));
  const passages = candidates.map((el, index) => {
    const sourcePath = pathOf(el);
    const originalText = el.textContent;
    const id = `${documentId}:${index}:${hash(sourcePath + '\n' + originalText).slice(0, 12)}`;
    const cloneEl = clone.querySelector(sourcePath);
    if (cloneEl) cloneEl.setAttribute('data-mb-source', id);
    return { id, index, sourcePath, sourceElementId: el.id || null, originalText,
      textHash: hash(originalText), tag: el.tagName.toLowerCase(),
      role: el.closest('aside,nav,footer,header')?.tagName.toLowerCase() || 'content',
      linkCharacters: [...el.querySelectorAll('a')].reduce((n, a) => n + a.textContent.length, 0),
      revision: 0 };
  });
  // Async extractors may fetch third-party content. The requested local pipeline must not.
  const result = await Defuddle(clone, url, { useAsync: false, standardize: false, debug: false });
  const { document: extracted } = parseHTML(`<html><body>${result.content}</body></html>`);
  const extractedBlocks = [...extracted.querySelectorAll(BLOCKS)].filter(el => !el.querySelector(BLOCKS));
  const sourceCounts = new Map();
  for (const p of passages) sourceCounts.set(comparable(p.originalText), (sourceCounts.get(comparable(p.originalText)) || 0) + 1);
  for (const p of passages) {
    const direct = extracted.querySelector(`[data-mb-source="${p.id}"]`);
    const exact = extractedBlocks.filter(e => comparable(e.textContent) === comparable(p.originalText));
    p.extraction = direct && comparable(direct.textContent) === comparable(p.originalText)
      ? { member: true, mapping: 'clone-id' }
      : exact.length === 1 && sourceCounts.get(comparable(p.originalText)) === 1
        ? { member: true, mapping: 'unique-exact-text' }
        : { member: false, mapping: exact.length ? 'ambiguous' : 'not-in-extraction' };
  }
  return { documentId, url, htmlHash: hash(html), title: result.title, passages,
    extractionSummary: { wordCount: result.wordCount, mappingAmbiguities: passages.filter(p => p.extraction.mapping === 'ambiguous').length,
      extractedMembers: passages.filter(p => p.extraction.member).length,
      limitation: 'Direct inline text around nested semantic blocks and virtualized/offscreen content are not covered by this probe.' } };
}
