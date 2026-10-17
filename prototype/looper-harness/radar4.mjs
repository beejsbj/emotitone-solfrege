import { chromium } from 'playwright';
const OUT = '/tmp/looper-pw/radar4/';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('http://localhost:5183/');
await p.getByRole('button', { name: /Play EmotiTone/ }).click({ timeout: 120000 });
await p.waitForTimeout(3000);
const S = (fn) => p.evaluate(`(() => { const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s; return (${fn})(s.get('loopPrototype'), s.get('visualConfig')); })()`);
const play = async (keys, gap = 380) => { for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(180); await p.keyboard.up(k); await p.waitForTimeout(gap - 180); } };
const lay = () => S('l => { l.armed = true; return l.layDownTake(); }');
const shotAt = async (name, target) => { for (let i = 0; i < 400; i++) { const ph = await S('l => l.phase()'); if (Math.abs(ph - target) < 0.02) break; await p.waitForTimeout(15); } await p.screenshot({ path: OUT + name + '.png', clip: { x: 0, y: 0, width: 390, height: 420 } }); };
await play(['KeyA','KeyD','KeyG','KeyJ','KeyG','KeyD']); await lay(); await p.waitForTimeout(300);
await play(['KeyS','KeyF','KeyH','KeyF'], 300); await play(['KeyK','KeyJ','KeyH','KeyG'], 250); await lay(); await p.waitForTimeout(300);
await play(['KeyA','KeyA','KeyS','KeyA'], 500); await lay(); await p.waitForTimeout(1500);
console.log(await S('l => [l.layers.length, l.running]'));
const set = (v) => S(`(l, c) => { c.updateStageControl('loopDefinition', ${v}); return c.effectiveConfig.ambient.loopDefinition; }`);
for (const v of [0, 0.25, 0.5, 0.75, 1]) { console.log('def', v, await set(v)); await p.waitForTimeout(200); await shotAt('def-' + v, 0.3); await shotAt('def-' + v + '-b', 0.7); }
await set(1);
for (let i = 0; i < 400; i++) { const ph = await S('l => l.phase()'); if (Math.abs(ph - 0.25) < 0.02) break; await p.waitForTimeout(15); }
await p.keyboard.down('KeyD'); await p.keyboard.down('KeyG'); await p.keyboard.down('KeyJ');
await p.waitForTimeout(700);
await p.screenshot({ path: OUT + 'def-1-with-note-bodies.png', clip: { x: 0, y: 0, width: 390, height: 420 } });
await p.keyboard.up('KeyD'); await p.keyboard.up('KeyG'); await p.keyboard.up('KeyJ');
await set(0.25);
console.log(errs.slice(0, 8));
await b.close();
