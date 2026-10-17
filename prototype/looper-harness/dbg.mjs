import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,300))); p.on('console', m => m.type()==='error' && errs.push(m.text().slice(0,300)));
await p.goto('http://localhost:5175/'); await p.waitForTimeout(7000);
await p.screenshot({ path: 'x-fail.png' });
console.log(errs.slice(0,5), await p.evaluate(() => [...document.querySelectorAll('button')].slice(0,6).map(x => x.getAttribute('aria-label')||x.textContent.trim().slice(0,20))));
await b.close();
