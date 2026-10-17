import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => console.log('ERR', String(e))); p.on('console', m => m.type()==='error' && console.log('CERR', m.text()));
await p.goto('http://localhost:5183/'); await p.waitForTimeout(8000);
await p.screenshot({ path: '/tmp/looper-pw/radar/probe.png' });
console.log(await p.evaluate(() => [...document.querySelectorAll('button')].map(x => x.getAttribute('aria-label') || x.textContent.trim()).join(' | ')));
await b.close();
