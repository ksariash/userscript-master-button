# Defuddle vendor provenance

`defuddle-0.19.5.js` is the unmodified browser core `package/dist/index.js` from npm `defuddle@0.19.5` (MIT; license alongside).

Source: https://github.com/kepano/defuddle/tree/0.19.5
Package: https://registry.npmjs.org/defuddle/-/defuddle-0.19.5.tgz
npm package shasum: `214e59375c522483c5f3b5cdc135a54287d1b77e`

`build.py` wraps its CommonJS export inside the userscript closure. It does not install Defuddle on the webpage global object. Parsing is local and synchronous; `useAsync:false` forbids third-party extraction fallback. No dependency download is needed at runtime for Defuddle. MiniLM runtime/weights remain a separate external download.
