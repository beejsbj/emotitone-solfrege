import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,200)));
await p.goto('http://localhost:5175/'); await p.waitForTimeout(9000);
await p.getByRole('button', { name: /Play EmotiTone/ }).click(); await p.waitForTimeout(3000);
for (const k of ['KeyA','KeyS','KeyD']) { await p.keyboard.down(k); await p.waitForTimeout(200); await p.keyboard.up(k); await p.waitForTimeout(250); }
const box = await p.getByRole('button', { name: 'Return' }).boundingBox(); await p.mouse.move(box.x+box.width/2, box.y+box.height/2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(500);
await p.screenshot({ path: 'i-mic-right.png' });
await p.getByRole('button', { name: /Open settings/ }).click(); await p.waitForTimeout(800);
const sec = async (tab) => { await p.getByRole('tab', { name: tab }).first().click(); await p.waitForTimeout(500); return p.evaluate((t) => { const s = document.querySelector(`[data-testid="stage-destination-${t}"]`); return s ? s.innerText.replace(/\s+/g,' ').slice(0,260) : 'missing'; }, tab.toLowerCase()); };
console.log('tabs', await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim())));
console.log('looper:', await sec('Looper'));
console.log('relations:', await sec('Relations'));
await p.getByRole('tab', { name: 'Looper' }).first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: 'i-looper-tab.png' });
console.log(errs);
await b.close();
