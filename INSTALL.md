# Install the experimental rebuild

This is an **alpha**, not a validated iPhone release. A conservative model policy excludes evaluated reading links, invitations and strong page chrome. Broad automatic filtering remains rejected; overall recall is below target. Manual Skip/Keep, remembered exceptions and selector rules remain available. Physical Safari and live Azure checks remain unverified.

1. Install/enable [Userscripts](https://github.com/quoid/userscripts) in Safari and select its scripts directory in Files.
2. For an existing installation, **replace the contents of its existing userscript file and preserve its exact filename**. Userscripts’ current API prefixes extension-storage keys with the userscript filename. Installing another filename creates a different storage scope. Disable any separate old copy; the fresh build prevents duplicate fresh instances but cannot identify every rejected old interface.
3. Copy [dist/master-button.user.js](dist/master-button.user.js) into that file, or install it as a new script if you have no previous settings. Keep content injection and the GM grants in the metadata. Enable website permissions and reload the page.
4. Tap the small launcher. Review attaches temporary passage markers; Previous/Next reaches passages with no safe margin. Skip grays original wording, Keep restores it, and Undo reverses the correction and its teaching contribution.
5. Read opens a source article scope, retaining its uncertain interruptions and metadata. Reader tools → Read full page inventory restores all page text. An exactly selected whole passage keeps source identity; partial selections and edited/pasted text show absent mapping. Correction dots are separate from tap-to-seek. Select enters multi-passage mode: tap passages, choose Included article, or choose Range and tap its first and last passage. Skip/Keep applies one batch; Undo restores it. The passage inspector also offers Skip before/after, scoped to the current reading or the full page in Review; the current passage is unchanged. Batch corrections do not teach automatically. Native scrolling and text selection gestures stay available.

## Model and learning

Reader → Set up filter (also More → Local model) → Load downloads pinned DeBERTa NLI weights, about **87 MB**, plus tokenizer/runtime assets (**about 123 MB total**: 8,656,551-byte tokenizer JSON and 26,861,777-byte matching WASM, plus small configuration files). Inference runs in a local worker; there is no model-server fallback. Default backend is one-thread WASM, with an experimental WebGPU choice. CSP, worker creation, memory, cache availability and device compatibility are not yet proven on iPhone. Failure keeps original text included and displays recovery guidance.

After that explicit first download, opening Read on later pages starts WASM filtering automatically. Stop model disables automatic startup; filtering off on the site restores automatic exclusions while retaining your corrections. The reader reports progress and exposes Show skipped / Why / Keep.

The classification head is trained on actual local model outputs and structural evidence. Only the conservative policy can exclude text; the broader target remains unmet. Remembered corrections can update that head with real gradient steps, scoped to the site. The base language-model weights remain frozen. Exact-wording exceptions work independently of a model download. Inspect, disable, delete or reset examples in Rules and teaching. Merely visiting a page does not persist its URL or hostname.

## Azure Speech

Use your own public Azure Speech resource. Speech setup selects region and loads that resource’s searchable voice list. Requests go directly to the selected Microsoft endpoint; synthesis may incur charges. The key is held by Userscripts, not website localStorage.

In alpha.6, the exact [dedicated setup page](https://ksariash.github.io/userscript-master-button/setup.html) opens Speech automatically. Hosting must first be published as described below. Old raw `SETUP.txt` URLs are no longer trusted for key entry: their CSP sandbox can block Safari extension callbacks even after the panel renders. The updated script shows a native migration link without calling GM on those URLs. Do not keep retrying buttons on alpha.5's raw page.

After updating the existing userscript file, open the Userscripts popup fully, allow it on the dedicated page, and reload. Run Check extension storage before pasting a key. Saving reports pending, verified or failed storage; a failed save preserves the input. Missing GM APIs never fall back to page storage.

The extension bridge now uses Userscripts’ lexical `GM` injection argument. Keys are never copied into webpage globals. Only a successful verified save clears the field. Storage operations have a 12-second bound. Voice-list errors stay by the voice controls and do not turn a verified save into a storage failure. Saving the key automatically fetches the selected region’s voice catalogue (GET, no article text or synthesis); the searchable dropdown groups only returned supported neural voices by language, labels preview voices, and rejects stale region results. Synthesis checks availability before sending text.

New key entry is enabled only at the exact HTTPS setup URL, without query strings or fragments. `docs/setup.html` contains no page scripts, third-party resources or forms; its CSP blocks page scripts and form submissions without sandboxing the document. Do not add analytics or other scripts to that page. An injected form on arbitrary websites is not safe from host-page keyboard listeners. Existing separately stored keys and filename-scoped storage are preserved. Physical Safari behavior on the new page still requires verification.

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

## Site tools and media

On supported social sites, recognized app-install nags are removed automatically for the current visit; the launcher menu exposes **Remove app nags** and **Media** directly. Site tools → Undo site cleanup restores the overlays/styles and switches recurring removal off for that visit. Normal account/consent dialogs are preserved. Unrecognized nags remain available for the visual selector picker. No account access restrictions are bypassed.

Slashdot’s launcher offers Clean stories and Site tools with Older stories and a real search field. Clean stories selects original story records rather than site chrome. In Media, filter images/videos or post titles, Pick on page without activating its link, choose a preview/source, then Open or Prepare file → Save / share file. Preparation is explicit, cancellable and capped at 80 MB; a streaming playlist, blob-only player or denied file gets an unavailable path instead of claimed download success. Preview requests use already delivered image/poster URLs.

## If key entry or saving fails

Confirm the version shown at the top of Speech is alpha.6 or later on the dedicated HTML page. Tap Check extension storage beside the key controls. This writes, reads back and deletes a random non-secret probe; it needs no Azure key and sends no network request. Copy support report contains only version/API flags, fixed failure-stage codes and optional voice-test counts/status. It excludes keys, storage values, error bodies, URLs and article text. If clipboard access is missing, the report is selected for manual Copy.

Preferences-load failures no longer disable otherwise available storage APIs. Save confirms the key by extension-storage readback before clearing its field. Test Azure connection uses the saved key directly for a regional voice-list GET; it sends no article text and does not synthesize. Live testing has still not been performed by the maintainer. Do not paste credentials into chat or GitHub issues.

## Publication steps — not performed in this workspace

1. Review and publish the complete alpha.6 changes to `main`, including `docs/setup.html`, `docs/.nojekyll`, `SETUP.txt`, source, tests, package files, regenerated implementation preview and all three regenerated `dist` files. Run the checks above and require the source/build CI to pass. No deployment workflow is added by this fix.
2. A repository owner must configure GitHub Settings → Pages → Build and deployment → Source: **Deploy from a branch** → branch **main**, folder **/docs** → Save. This publishes only the dedicated static directory. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Hosting configuration was not inspected or changed here; if an existing custom domain redirects this URL, stop and review the trusted destination instead of broadening the allowlist.
3. Wait for Pages deployment, then verify `https://ksariash.github.io/userscript-master-button/setup.html` returns HTTP 200 HTML at that exact URL, with the reviewed page body and CSP, no response `sandbox` directive and no unexpected scripts/resources. A 404 or redirect is not ready for key entry.
4. Update the existing iPhone userscript with `dist/master-button.user.js`, preserving its exact filename and content injection. Confirm Speech displays `2.0.0-alpha.6`. Allow Userscripts on `ksariash.github.io`, open the extension popup fully, and reload the setup URL.
5. Without any key, check that Done closes Speech, reopening works, and Check extension storage passes. Confirm both old raw URL forms show the native migration link and no key form. Record iOS/Safari and Userscripts 1.8.6 results. Do not enter a real key until these device checks pass.

Local tests use isolated dummy data and mocked Azure transport; they do not prove iPhone callback or extension-bridge behavior. No live Azure verification is part of this change.
