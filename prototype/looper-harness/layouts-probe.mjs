import { chromium } from 'playwright';
const layout = process.argv[2] || 'a';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:5185/?layout=' + layout);
await p.waitForTimeout(3500);
await p.getByRole('button', { name: /Play EmotiTone/ }).click();
await p.waitForTimeout(3000);
const play = async (keys, gap = 450) => { for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(200); await p.keyboard.up(k); await p.waitForTimeout(gap - 200); } };
const boxes = () => p.evaluate(() => {
  const sel = { mic: '.humming-capture-transport__primary', loop: '.loop-mode-button__button', micWrap: '.humming-capture-transport', loopWrap: '.loop-mode-button', switcher: '.loop-layout-switcher', layers: '.loop-platter__layers', readout: '.loop-platter__readout' };
  const out = {};
  for (const [k, s] of Object.entries(sel)) { const e = document.querySelector(s); if (e) { const r = e.getBoundingClientRect(); out[k] = [r.x, r.y, r.width, r.height].map(Math.round).join(','); } }
  out.tabs = [...document.querySelectorAll('button, [role=tab]')].map(e => { const r = e.getBoundingClientRect(); return r.y < 120 && r.width ? `${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,20)}@${[r.x,r.y,r.width,r.height].map(Math.round)}` : null; }).filter(Boolean);
  return out;
});
await play(['KeyA','KeyS','KeyD','KeyF']);
await p.screenshot({ path: `/tmp/looper-pw/layouts/${layout}-1-idle.png` });
console.log('idle', JSON.stringify(await boxes()));
await p.getByRole('button', { name: 'Loop mode' }).click(); await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Add to loop' }).click(); await p.waitForTimeout(600);
await play(['KeyG','KeyH']); await p.getByRole('button', { name: 'Add to loop' }).click(); await p.waitForTimeout(600);
await play(['KeyJ','KeyK']); await p.getByRole('button', { name: 'Add to loop' }).click(); await p.waitForTimeout(800);
await p.screenshot({ path: `/tmp/looper-pw/layouts/${layout}-2-loop.png` });
console.log('loop', JSON.stringify(await boxes()));
console.log(errs.slice(0,5));
await b.close();
