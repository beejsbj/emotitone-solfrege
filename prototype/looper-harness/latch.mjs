import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0,200)));
await p.goto('http://localhost:5175/'); await p.getByRole('button', { name: /Play EmotiTone/ }).waitFor({ timeout: 120000 });
await p.getByRole('button', { name: /Play EmotiTone/ }).tap(); await p.waitForTimeout(3000);
const state = (t) => p.evaluate((t) => { const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s; const l = s.get('loopPrototype'); const ph = s.get('phrases'); return t + ' ' + JSON.stringify({ layers: l.layers.map(x => x.notes.length + (x.open ? 'o' : '')), latched: l.latched, take: ph.takeNotes.length, lastRel: ph.book.recorder.lastReleaseWall ? Date.now() - ph.book.recorder.lastReleaseWall : null, recent: ph.shelves.recent.length }); }, t);
const key = async (name) => { const el = p.getByRole('button', { name }).first(); const box = await el.boundingBox(); const x = box.x + box.width/2, y = box.y + box.height/2; const cdp = await ctx.newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.waitForTimeout(180); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(220); };
const play = p.locator('.code-strip-bar__play'); const pb = await play.boundingBox();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pb.x + pb.width/2, y: pb.y + pb.height/2 }] }); await p.waitForTimeout(650); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
console.log(await state('latched'));
for (const n of [/^Do, scale degree one, C four/, /^Re, scale degree two, D four/, /^Mi, scale degree three, E four/, /^Fa, scale degree four, F four/]) { await key(n); console.log(await state('  note')); }
await p.waitForTimeout(2600);
console.log(await state('after silence'));
for (const n of [/^Sol, scale degree five, G four/, /^La, scale degree six, A four/]) { await key(n); console.log(await state('  note')); }
await p.waitForTimeout(2600);
console.log(await state('after silence 2'), errs);
await b.close();
