import{build}from'esbuild';import{readFile,writeFile}from'node:fs/promises';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const mp3=await build({entryPoints:['src/speech/mp3-worker.mjs'],bundle:true,write:false,format:'iife',platform:'browser',target:'safari17',minify:true});
const result=await build({entryPoints:['prototype/implementation-app.mjs'],bundle:true,write:false,format:'iife',platform:'browser',loader:{'.css':'text'},minify:true,define:{__VERSION__:JSON.stringify(pkg.version),__MODEL_WORKER__:'""',__MP3_WORKER__:JSON.stringify(mp3.outputFiles[0].text),__AUTO_START__:'false'}});
const template=await readFile('prototype/implementation-source.html','utf8'),script=result.outputFiles[0].text.replaceAll('</script','<\\/script');await writeFile('prototype/implementation.html',template.replace('<!--APP-->',()=>`<script>${script}</script>`));
const gallery=await readFile('prototype/gallery.html','utf8');await writeFile('prototype/implementation-gallery.html',gallery.replaceAll('review.html','implementation.html').replaceAll('Design review','Implementation preview').replaceAll('Design study','Implementation preview').replace('implementation.html?embed=1', 'implementation.html?preview=alpha-iife&embed=1'));
console.log('Self-contained implementation preview built. Integration uses mock GM, no inference or Azure.');
