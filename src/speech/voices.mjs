const localePattern = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8}){1,3}$/;
export function voiceLanguage(locale) {
  try { return new Intl.DisplayNames(['en'], {type:'language'}).of(locale) || locale; } catch { return locale; }
}
/** Only selectable regional API entries; no guessed catalogue or retired voices. */
export function parseVoices(data) {
  if (!Array.isArray(data)) throw new Error('Azure returned an unreadable voice list.');
  const unique = new Map();
  for (const v of data) {
    if (!v || typeof v.Locale !== 'string' || !localePattern.test(v.Locale) ||
      typeof v.ShortName !== 'string' || !v.ShortName.startsWith(v.Locale+'-') ||
      !/^[A-Za-z0-9-]{5,150}$/.test(v.ShortName) || v.VoiceType !== 'Neural' || !['GA','Preview'].includes(v.Status)) continue;
    unique.set(v.ShortName,{id:v.ShortName,name:String(v.DisplayName||v.LocalName||v.ShortName).slice(0,100),
      locale:v.Locale,language:String(v.LocaleName||voiceLanguage(v.Locale)).slice(0,100),
      gender:['Male','Female','Neutral'].includes(v.Gender)?v.Gender:'',type:v.VoiceType,status:v.Status});
  }
  return [...unique.values()].sort((a,b)=>a.language.localeCompare(b.language)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
