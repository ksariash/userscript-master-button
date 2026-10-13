# Install the experimental rebuild

This is an **alpha**, not a validated iPhone release. Automatic exclusions are disabled because the model has not met every recorded target. Manual Skip/Keep, remembered exceptions and selector rules are available. Physical Safari and live Azure checks remain unverified.

1. Install/enable [Userscripts](https://github.com/quoid/userscripts) in Safari and select its scripts directory in Files.
2. For an existing installation, **replace the contents of its existing userscript file and preserve its exact filename**. Userscripts’ current API prefixes extension-storage keys with the userscript filename. Installing another filename creates a different storage scope. Disable any separate old copy; the fresh build prevents duplicate fresh instances but cannot identify every rejected old interface.
3. Copy [dist/master-button.user.js](dist/master-button.user.js) into that file, or install it as a new script if you have no previous settings. Keep content injection and the GM grants in the metadata. Enable website permissions and reload the page.
4. Tap the small launcher. Review attaches temporary passage markers; Previous/Next reaches passages with no safe margin. Skip grays original wording, Keep restores it, and Undo reverses the correction and its teaching contribution.
5. Read opens the shared transcript. An exactly selected whole passage keeps source identity; partial selections and edited/pasted text show absent mapping. Correction dots are separate from tap-to-seek.

## Model and learning

More → Local model → Load downloads pinned DeBERTa NLI weights, about **87 MB**, plus tokenizer/runtime assets (**about 123 MB total**: 8,656,551-byte tokenizer JSON and 26,861,777-byte matching WASM, plus small configuration files). Inference runs in a local worker; there is no model-server fallback. Default backend is one-thread WASM, with an experimental WebGPU choice. CSP, worker creation, memory, cache availability and device compatibility are not yet proven on iPhone. Failure keeps original text included and displays recovery guidance.

The classification head is trained on actual local model outputs and structural evidence. Remembered corrections can update that head with real gradient steps, scoped to the site. The base language-model weights remain frozen. Exact-wording exceptions work independently of a model download. Inspect, disable, delete or reset examples in Rules and teaching. Merely visiting a page does not persist its URL or hostname.

## Azure Speech

Use your own public Azure Speech resource. Speech setup selects region and loads that resource’s searchable voice list. Requests go directly to the selected Microsoft endpoint; synthesis may incur charges. The key is held by Userscripts, not website localStorage.

New key entry is enabled only on the repository’s [plain-text setup document](https://raw.githubusercontent.com/ksariash/userscript-master-button/main/SETUP.txt). An injected key form on an arbitrary website cannot guarantee protection from host-page keyboard listeners. The dedicated document reduces that exposure; its actual Safari injection/storage behavior is still unverified. Existing separately stored keys are untouched: use the stored-key-name list or import their exact name from the same userscript filename’s storage. The rebuild does not guess or overwrite undocumented old key names.

Play prepares the first usable segment and then at most two later segments, with one network request at a time. Selection is checked immediately before each paid request. Skip cannot retract already submitted text. WAV playback uses the service’s PCM; MP3 export runs one local encoder over the enabled PCM sequence, with 64/96/128 kbps choices. File speed is normal voice speed; playback rate is separate. A changed selection, voice or quality invalidates the appropriate artifact. Live Azure, native sharing and locked-screen transitions have not been verified.

## Updates and recovery

The generated `.user.js` and `.meta.js` have matching version and update/download URLs. Use Userscripts’ update control; the utility’s Check published version reads metadata only and never executes downloaded update code. Preserve the filename across updates. v1 settings remain untouched; validated compatible preferences are copied to v2, and unknown legacy fields are retained without becoming training data.

If startup fails, reload after checking extension permissions. If inference fails, continue manual review or retry/forget its download. If a speech request fails, the error stays by that action; correct key/region or retry. Cancel narration/export before changing pages. See [VALIDATION.md](VALIDATION.md) for the physical-device checklist and [PROGRESS.md](PROGRESS.md) for unfinished requirements.

## Build

```sh
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm test
npm run build
npm run build:prototype
node scripts/build-implementation-prototype.mjs
```

`dist/build.json` records the generated script hash, bytes, and pinned dependencies. Run the build twice and compare hashes. Public model weights and temporary article captures are ignored, not bundled or committed. Consult [THIRD_PARTY.md](THIRD_PARTY.md) for licenses.
