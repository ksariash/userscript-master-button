"""Synthetic timed Reddit app upsell + scroll-lock regression, not a live Reddit test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
script=(ROOT/'dist/master-button.user.js').read_text().replace('const siteName = (host=location.hostname)',"const siteName = (host='www.reddit.com')")
page_html='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /><style>
html,body{margin:0}#upsell{position:fixed;inset:0;z-index:99999;color:white;background:#171b1f;display:grid;align-content:end;padding:24px;gap:20px}
#upsell h1{font-size:33px;}#upsell button{padding:16px;border-radius:50px;background:white;border:0}
</style></head><body><main><article><h1>Actual Reddit feed</h1><p>Feed content must remain untouched.</p></article></main>
<script>setTimeout(()=>{const x=document.createElement('div');x.id='upsell';x.innerHTML='<h1>Get the best of Reddit in the app</h1><p>Personalize your feed, discover more of what you like, and join your favorite communities.</p><button>Get the Reddit App</button>';document.body.appendChild(x);document.body.classList.add('scroll-disabled');document.body.style.overflow='hidden';setTimeout(()=>document.documentElement.style.overflow='hidden',300)},700);</script>
</body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page.on('pageerror',lambda e:print('PAGE ERROR:', e))
 page.set_content(page_html,wait_until='domcontentloaded')
 page.evaluate('''() => {window.GM={getValue:async(k,d)=>d,setValue:async()=>true,setClipboard:async()=>true,xmlHttpRequest:async()=>({status:200,response:'',responseText:''})};}''')
 page.evaluate(script)
 page.locator('[data-mb-host] .mb-launch').wait_for()
 page.wait_for_timeout(2600)
 promo=page.locator('#upsell')
 assert promo.count()==1
 assert promo.evaluate('e=>getComputedStyle(e).display')=='none','Late promo not hidden'
 assert page.locator('main article').evaluate('e=>getComputedStyle(e).display')!='none','Article hidden'
 assert page.evaluate("document.body.style.overflow")!='hidden','Scroll lock not cleared'
 assert page.evaluate("document.documentElement.style.overflow")!='hidden','Late scroll lock not cleared'
 # The regular drawer must fit as a compact utility, not a wall of tall rows.
 page.locator('[data-mb-host] .mb-launch').click()
 assert page.locator('.mb-tile').count()==6
 panel=page.locator('.mb-panel').bounding_box()
 assert panel['height']<450, f'drawer too tall: {panel}'
 # Turning the site's automatic cleanup off restores the page element and CSS.
 page.locator('[data-action="site-toggle"]').click()
 assert promo.evaluate('e=>getComputedStyle(e).display')!='none', 'Site toggle did not restore overlay'
 page.locator('[data-action="site-toggle"]').click()
 assert promo.evaluate('e=>getComputedStyle(e).display')=='none', 'Re-enabling cleanup failed'
 page.screenshot(path=str(ROOT/'dist/reddit-drawer.png'))
 print('Delayed Reddit interstitial, re-lock recovery, article preservation, compact drawer PASS',panel)
 b.close()
