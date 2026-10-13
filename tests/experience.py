"""Synthetic browser checks for actual region picker, multiple voices, compact UI and local feedback.
No claim of actual Azure/iPhone Safari or downloaded model testing.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
src=(ROOT/'dist/master-button.user.js').read_text()
html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body><main><article><h1>Science report</h1><p id="real">Scientists reported improved solar cell performance after ten years of research.</p><p id="nag">Check out these related articles about the best scientific gadgets you can buy.</p><p>Experiments continued through the following winter as researchers evaluated the result.</p></article></main></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page.on('pageerror',lambda e:print('PAGE ERROR:',e))
 page.set_content(html)
 page.evaluate('''() => {window.GM={getValue:async(k,d)=> k.endsWith(':azure')?'test-key':{semanticAuto:false},setValue:async()=>true,xmlHttpRequest:async()=>({status:200,responseText:JSON.stringify([
 {ShortName:'en-US-JennyNeural',Locale:'en-US',LocalName:'Jenny',Gender:'Female'},
 {ShortName:'en-US-GuyNeural',Locale:'en-US',LocalName:'Guy',Gender:'Male'},
 {ShortName:'fr-FR-DeniseNeural',Locale:'fr-FR',LocalName:'Denise',Gender:'Female'}
 ])})};}''')
 page.evaluate(src.replace("\n})();", "\nwindow.__mb_test={semantic,prefs,render,semanticDecision};\n})();"))
 page.locator('.mb-launch').click()
 page.locator('[data-action="speech"]').click()
 page.locator('#mb-region').wait_for()
 assert page.locator('#mb-region option').count()>20,'Missing real region dropdown'
 page.locator('[data-action="speech-voices"]').click()
 page.wait_for_function("document.querySelector('[data-mb-host]').shadowRoot.querySelectorAll('#mb-voice option').length === 3")
 page.locator('#mb-voice-search').fill('Guy')
 assert page.locator('#mb-voice option').count()==1
 assert 'Guy' in page.locator('#mb-voice option').first.inner_text()
 page.locator('#mb-voice-search').fill('')
 page.locator('#mb-voice').select_option('en-US-GuyNeural')
 assert page.evaluate("document.querySelector('[data-mb-host]').shadowRoot.querySelector('#mb-voice').value")=='en-US-GuyNeural'
 panel=page.locator('.mb-panel').bounding_box()
 assert panel['height']<530, panel
 page.screenshot(path=str(ROOT/'dist/speech-compact.png'))
 page.locator('[data-action="back"]').click()
 page.locator('[data-action="filter"]').click()
 # Inject deterministic fake in-memory embedding model; verifies training pipeline logic
 # without pretending the actual 23 MB pretrained runtime was downloaded.
 page.evaluate('''() => { __mb_test.semantic.extractor=async (sentences)=>{ const xs = Array.isArray(sentences)?sentences:[sentences]; const rows=xs.map(s=> {const a=s.toLowerCase().includes('related')?[1,0,0]:s.toLowerCase().includes('science')?[0,1,0]:[0,0,1];return a;});return {tolist:()=>rows};};__mb_test.semantic.status='ready';__mb_test.semantic.detail='Synthetic model in test';__mb_test.render(); }''')
 # Select phrase via browser DOM Selection API and use drawer action.
 page.evaluate('''() => {const n=document.getElementById('nag').firstChild;const r=document.createRange();r.selectNodeContents(n);const s=getSelection();s.removeAllRanges();s.addRange(r);}''')
 page.locator('[data-action="select-phrase"]').click()
 assert page.locator('.mb-panel').inner_text().find('Check out these related articles')>=0
 page.locator('#mb-reason').select_option('related')
 page.locator('[data-action="teach-skip"]').click()
 page.wait_for_function("(window.__semanticTrainingDone = __mb_test.prefs.semanticExamples && (__mb_test.prefs.semanticExamples['']?.length || 0) > 0) === true")
 res=page.evaluate('''() => {const vector=[1,0,0];return {n:__mb_test.prefs.semanticExamples[''].length,d:__mb_test.semanticDecision(vector),storedText:JSON.stringify(__mb_test.prefs.semanticExamples['']).includes('related articles')};}''')
 assert res['n']==1,res
 assert res['d']['excluded'],res
 assert not res['storedText'],res
 print('Compact region/voice picker and explicit model-feedback pipeline PASS',panel,res)
 b.close()

