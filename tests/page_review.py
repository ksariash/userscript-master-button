"""Mobile Chromium geometry and shared page/transcript review. No live model/Azure."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
script=(ROOT/'dist/master-button.user.js').read_text()
html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:17px/1.6 system-ui}article{padding:16px 54px 100px 16px}p{margin:18px 0}</style></head><body><article><h1>Field research</h1>'+''.join(f'<p id="p{i}">Scientists recorded observations in the field and verified their measurements carefully. This is study number {i}, with original article wording.</p>' for i in range(20))+'</article></body></html>'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),headless=True,args=['--no-sandbox'])
 for scheme in ['light','dark']:
  page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,color_scheme=scheme)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.evaluate('''()=>{window.GM={getValue:async(k,d)=>k.endsWith(':azure')?d:{semanticAuto:false},setValue:async()=>{}}}''')
  page.evaluate(script.replace('\n})();','\nwindow.T={passageStore,reading,semantic,render,state,refreshPassages};\n})();'))
  page.evaluate('''()=>{T.semantic.extractor=async xs=>({tolist:()=>xs.map(()=>[1,0])});T.semantic.status='ready';}''')
  page.locator('.mb-launch').tap();assert page.locator('.mb-panel').bounding_box()['height']<=400
  page.screenshot(path=str(ROOT/'dist'/f'menu-02-{scheme}.png'))
  page.locator('[data-action="filter"]').click();page.locator('[data-action="page-review"]').click()
  assert not page.locator('.mb-panel').is_visible()
  assert 'system-ui' in page.locator('.mb-review-bar').evaluate('(e)=>getComputedStyle(e).fontFamily')
  first=page.locator('.mb-page-toggle').first
  assert first.bounding_box()['width']>=44
  source=first.get_attribute('data-action').split(':')[1]
  assert page.evaluate("""id=>{const p=T.passageStore.byId.get(id).element.getBoundingClientRect(),b=[...document.querySelector('[data-mb-host]').shadowRoot.querySelectorAll('.mb-page-toggle')].find(x=>x.dataset.sourceId===id).getBoundingClientRect();return b.left>=p.right||b.right<=p.left}""",source)
  assert first.evaluate('(e)=>{e.focus();const before=e;T.render();return before===document.querySelector("[data-mb-host]").shadowRoot.activeElement}')
  assert page.locator('.mb-review-bar').evaluate('(e)=>[...e.querySelectorAll("button")].every(b=>{const r=b.getBoundingClientRect();return !r.width||(r.left>=0&&r.right<=390)})')
  first.click();page.wait_for_function('(id)=>T.passageStore.byId.get(id).override==="skip"',arg=source)
  assert page.evaluate('(id)=>T.passageStore.byId.get(id).element.hasAttribute("data-mb-skipped")',source)
  page.screenshot(path=str(ROOT/'dist'/f'page-review-02-{scheme}.png'))
  page.locator('[data-action="page-undo"]').click();page.wait_for_function('(id)=>T.passageStore.byId.get(id).override===null',arg=source)
  page.locator('[data-action="page-review-end"]').click();assert page.locator('.mb-page-toggle').count()==0
  page.locator('.mb-launch').tap();page.locator('[data-action="reader"]').click()
  index=page.evaluate('(id)=>T.reading.passages.findIndex(p=>p.sourceId===id)',source)
  page.locator(f'[data-action="pass-toggle:{index}"]').click()
  assert page.evaluate('(id)=>T.passageStore.byId.get(id).override==="skip"',arg=source)
  assert not page.locator('.mb-launch').is_visible()
  page.screenshot(path=str(ROOT/'dist'/f'reader-02-{scheme}.png'))
  page.locator('[data-action="filter"]').click()
  page.evaluate('''()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#p1'));getSelection().removeAllRanges();getSelection().addRange(r);}''')
  page.locator('[data-action="select-phrase"]').click()
  assert page.locator('.mb-panel').bounding_box()['height']<=360
  page.screenshot(path=str(ROOT/'dist'/f'teach-02-{scheme}.png'))
  page.locator('[data-action="back"]').click()
  page.evaluate("""()=>{const a=document.querySelector('article');a.style.padding='0';a.innerHTML='<ul>'+Array.from({length:16},(_,i)=>'<li>Short passage number '+i+'.</li>').join('')+'</ul>';T.refreshPassages();}""")
  page.locator('[data-action="page-review"]').click()
  assert page.locator('#mb-review-passage').is_visible(),'Crowded layout needs a complete passage chooser'
  assert page.locator('#mb-review-passage option').count()==16
  assert page.locator('.mb-review-bar').evaluate('(e)=>[...e.querySelectorAll("button")].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=390})')
  chosen=page.locator('#mb-review-passage option').nth(9).get_attribute('value')
  page.locator('#mb-review-passage').select_option(chosen)
  page.locator('[data-action="page-selected-toggle"]').click()
  assert page.evaluate('id=>T.passageStore.byId.get(id).override==="skip"',chosen)
  page.screenshot(path=str(ROOT/'dist'/f'crowded-review-02-{scheme}.png'))
  page.locator('[data-action="page-review-end"]').click()
  assert page.locator('[data-mb-review-target]').count()==0
  assert not errors,errors
  page.close()
 b.close()
print('Page review: geometry, gray/undo, shared transcript and compact Teach PASS')
