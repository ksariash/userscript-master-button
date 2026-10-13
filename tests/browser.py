from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><header><a>Get the Reddit app</a></header><main><article><h1>Example article heading</h1><p>The first paragraph is an extended sample of article prose, with real content about research and development over the past several years.</p><aside class="related-block"><p>Check out these related articles</p></aside><p>This second paragraph is a little longer and should be kept when exporting or preparing article narration because it is main content.</p></article></main><div id="xpromo-bottom-sheet">Get the Reddit app</div><img width="450" height="450" src="https://images.example.com/photo.jpg"></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page.set_default_timeout(6000)
 page.on('pageerror',lambda e:print('PAGE ERROR',e))
 print('start content',flush=True)
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => {window.GM={getValue:async(k,d)=>d,setValue:async()=>true,setClipboard:async()=>true,xmlHttpRequest:async()=>({status:200,response:'',responseText:''})};}''')
 print('evaluating script',flush=True)
 page.evaluate((ROOT/'dist/master-button.user.js').read_text().replace('const siteName = (host=location.hostname)',"const siteName = (host='www.reddit.com')"))
 print('waiting for button',flush=True)
 page.locator('[data-mb-host] .mb-launch').wait_for(timeout=10000)
 assert page.locator('[data-mb-host] .mb-launch').count()==1
 print('hit debug',page.evaluate("""() => {const h=document.querySelector('[data-mb-host]'),b=h.shadowRoot.querySelector('.mb-launch'),r=b.getBoundingClientRect();return {iw:innerWidth,ow:outerWidth,cl:document.documentElement.clientWidth,vw:visualViewport.width,scale:visualViewport.scale,offset:visualViewport.offsetLeft,host:getComputedStyle(h).cssText,hostpe:getComputedStyle(h).pointerEvents,hostpos:getComputedStyle(h).position,hostz:getComputedStyle(h).zIndex,buttonpe:getComputedStyle(b).pointerEvents,buttonz:getComputedStyle(b).zIndex,btn:[r.x,r.y,r.width,r.height],element:document.elementFromPoint(r.x+15,r.y+15)?.tagName,shadow:h.shadowRoot.elementFromPoint(r.x+15,r.y+15)?.tagName};}"""),flush=True)
 print('click button',flush=True)
 page.locator('[data-mb-host] .mb-launch').click()
 page.locator('[data-action="site-toggle"]').wait_for()
 assert page.locator('#xpromo-bottom-sheet').evaluate('(e)=>getComputedStyle(e).display')=='none'
 print('click filter',flush=True)
 page.locator('[data-action="filter"]').click()
 print('click picker',flush=True)
 page.locator('[data-action="pick-filter"]').click()
 print('select element',flush=True)
 page.evaluate("document.querySelector('.related-block').click()")
 print('picker screen text',page.locator('.mb-panel').inner_text()[:300])
 assert '1 matching elements' in page.locator('.mb-panel').inner_text()
 page.locator('[data-action="preview"]').click()
 assert page.locator('.related-block').get_attribute('data-mb-preview-hide')==''
 page.locator('[data-action="picker-cancel"]').click()
 assert page.locator('.related-block').get_attribute('data-mb-preview') is None
 page.locator('[data-action="back"]').click()
 page.locator('[data-action="reader"]').click()
 assert page.locator('[data-pass]').count()>=2
 page.locator('[data-action="pass-toggle:0"]').click()
 assert 'excluded' in page.locator('[data-pass="0"]').get_attribute('class')
 page.screenshot(path=str(ROOT/'dist/chromium-test.png'))
 print('Chromium integration: button, Reddit cleanup, filter preview/cancel, reader correction PASS')
 b.close()
