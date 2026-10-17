import { chromium } from 'playwright';
const OUT = '/tmp/looper-pw/radar6/';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('http://localhost:5183/');
await p.getByRole('button', { name: /Play EmotiTone/ }).click({ timeout: 120000 });
await p.waitForTimeout(3000);
const S = (fn) => p.evaluate(`(() => { const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s; return (${fn})(s.get('loopPrototype'), s.get('visualConfig')); })()`);
const play = async (keys, gap = 380) => { for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(180); await p.keyboard.up(k); await p.waitForTimeout(gap - 180); } };
const lay = () => S('l => { if (l.hasLoop) l.layDownTake(); else l.holdReturn(); return l.layers.length; }');
const shotAt = async (name, target) => { for (let i = 0; i < 400; i++) { const ph = await S('l => l.phase()'); if (Math.abs(ph - target) < 0.02) break; await p.waitForTimeout(15); } await p.screenshot({ path: OUT + name + '.png', clip: { x: 0, y: 0, width: 390, height: 420 } }); };
await play(['KeyA','KeyD','KeyG','KeyJ','KeyG','KeyD']); await lay(); await p.waitForTimeout(300);
await play(['KeyS','KeyF','KeyH','KeyF'], 300); await play(['KeyK','KeyJ','KeyH','KeyG'], 250); await lay(); await p.waitForTimeout(300);
await play(['KeyA','KeyA','KeyS','KeyA'], 500); await lay(); await p.waitForTimeout(1500);
console.log(await S('l => [l.layers.length, l.running]'));
const set = (id, v) => S(`(l, c) => { c.updateStageControl('${id}', ${v}); const a = c.effectiveConfig.ambient; return [a.loopDefinition, a.loopSparks]; }`);
await set('fleckAmount', 0);
for (const [d, k] of [[1, 0], [1, 0.4], [1, 1], [0, 0.4], [0, 1]]) {
  console.log(d, k, await set('loopDefinition', d), await set('loopSparks', k));
  await p.waitForTimeout(2200);
  await shotAt(`def-${d}-sparks-${k}`, 0.62);
  await shotAt(`def-${d}-sparks-${k}-b`, 0.12);
}
await set('fleckAmount', 12); await set('loopDefinition', 0.25); await set('loopSparks', 0.4);
console.log(errs.slice(0, 8));
await b.close();
