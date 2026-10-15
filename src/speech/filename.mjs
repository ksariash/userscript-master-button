/** Treat article titles as labels, never paths. Bound UTF-8 bytes without splitting Unicode. */
export function exportFilename(title, extension) {
  if (!['txt', 'mp3'].includes(extension)) throw new Error('Unsupported export format.');
  const label = typeof title === 'string' ? title.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/[<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  let stem = '', bytes = 0;
  for (const char of label) {
    const point = char.codePointAt(0), size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + size > 180) break;
    stem += char; bytes += size;
  }
  stem = stem.replace(/^[. ]+|[. ]+$/g, '') || 'Master Button reading';
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(stem)) stem = '_' + stem;
  return `${stem}.${extension}`;
}
