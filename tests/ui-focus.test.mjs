import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {dialogFocusables} from '../src/ui/focus.mjs';
test('Dialog tab order includes disclosure summaries but skips collapsed, hidden and disabled controls',()=>{
 const dom=new JSDOM('<section><button id="first">Close</button><details><summary id="summary">Options</summary><button id="inside">Secondary</button></details><input disabled><div hidden><button>Hidden</button></div><button id="last">Play</button></section>');
 try{const surface=dom.window.document.querySelector('section');assert.deepEqual(dialogFocusables(surface).map(n=>n.id),['first','summary','last']);surface.querySelector('details').open=true;assert.deepEqual(dialogFocusables(surface).map(n=>n.id),['first','summary','inside','last']);}finally{dom.window.close();}
});
