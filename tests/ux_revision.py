"""Focused regression tests for v0.1.3 UX. Synthetic browser only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
script=(ROOT/'dist/master-button.user.js').read_text()
paragraphs=''.join(f'<p id="pass{i}">{"Scientists analyzed clean energy observations from winter field experiments. "*4} Report number {i}.</p>' for i in range(23))
html=f'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main><article>{paragraphs}</article></main></body></html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.evaluate('''() => {window.GM={getValue:async(k,d)=>d,setValue:async()=>true};}''')
 page.evaluate(script.replace('\n})();','\nwindow.__mb_test={reading,prefs,semantic,semanticDecision,beginFilterReview,endFilterReview,hideNode,hidden,host,render};\n})();'))
 page.locator('.mb-launch').click();page.locator('[data-action="reader"]').click()
 page.locator('[data-transcript]').wait_for()
 page.locator('[data-transcript]').evaluate('(e)=>e.scrollTop=1040')
 original=page.locator('[data-transcript]').evaluate('(e)=>e.scrollTop')
 assert original>900,original
 page.locator('[data-action="pass-toggle:4"]').click()
 after=page.locator('[data-transcript]').evaluate('(e)=>e.scrollTop')
 assert abs(after-original)<=2,(original,after)
 assert page.locator('[data-audio-now]').count()==1
 assert page.locator('[data-audio-total]').count()==1
 assert page.locator('[data-action="pass-why:4"]').count()==1
 page.locator('[data-action="pass-why:4"]').click()
 assert page.get_by_text('Why this passage?').count()==1
 page.locator('[data-action="back"]').click()
 assert page.locator('[data-transcript]').count()==1
 # Show all temporarily and restore the rule-based filter after cancellation.
 page.locator('[data-action="filter"]').click()
 page.evaluate('''()=>{__mb_test.hideNode(document.querySelector('#pass17'),'Synthetic nuisance');}''')
 assert page.locator('#pass17').evaluate('(e)=>getComputedStyle(e).display')=='none'
 page.locator('[data-action="filter-preview"]').click()
 assert page.locator('#pass17').evaluate('(e)=>getComputedStyle(e).display')!='none'
 assert page.locator('#mb-threshold').count()==1
 page.locator('#mb-threshold').fill('0.85')
 page.locator('#mb-threshold').dispatch_event('change')
 assert abs(page.evaluate('__mb_test.prefs.semanticThreshold')-.85)<.001
 # Fake actual loaded model only in testing; inspect with deterministic vectors.
 page.evaluate('''()=>{__mb_test.semantic.extractor=async(xs)=>({tolist:()=>xs.map(x=>x.includes('science')?[0,1]:[1,0])});__mb_test.semantic.status='ready';__mb_test.render();}''')
 page.screenshot(path=str(ROOT/'dist/filter-v0.1.3.png'))
 page.locator('[data-action="select-phrase"]').click()
 # preview stays in place while choosing phrase, avoiding hidden adjacent paragraphs
 assert page.locator('#pass17').evaluate('(e)=>getComputedStyle(e).display')!='none'
 page.locator('[data-action="back"]').click()
 page.locator('[data-action="filter-preview"]').click()
 page.locator('[data-action="back"]').click()
 page.screenshot(path=str(ROOT/'dist/menu-v0.1.3.png'))
 assert page.locator('.mb-launch').evaluate('(e)=>e.getBoundingClientRect().width')==56
 assert not errors,errors
 print('UX v0.1.3: stable transcript scroll, clock, why, preview, threshold, 56px target PASS')
 b.close()
