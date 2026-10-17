import { chromium } from 'playwright';
const OUT = '/tmp/looper-pw/radar7/';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('http://localhost:5183/');
await p.getByRole('button', { name: /Play EmotiTone/ }).click({ timeout: 120000 });
await p.waitForTimeout(3000);
const S = (fn) => p.evaluate(`(() => { const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s; return (${fn})(s.get('loopPrototype'), s.get('visualConfig')); })()`);
const play = async (keys, gap = 380, hold = 180) => { for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(hold); await p.keyboard.up(k); await p.waitForTimeout(Math.max(20, gap - hold)); } };
const shot = (name) => p.screenshot({ path: OUT + name + '.png', clip: { x: 0, y: 0, width: 390, height: 440 } });
const waitPhase = async (target, len = 'undefined') => { for (let i = 0; i < 600; i++) { const ph = await S(`l => l.phase(${len})`); if (Math.abs(ph - target) < 0.015) return; await p.waitForTimeout(10); } };
await play(['KeyA','KeyD','KeyG','KeyJ','KeyG','KeyD']);
console.log('t1', await S('l => { l.togglePlay(); return [l.layers.length, l.lengthMs]; }'));
await p.waitForTimeout(400);
await play(['KeyS'], 1500, 1300); await play(['KeyH','KeyF'], 400, 250);
console.log('t2', await S('l => { l.togglePlay(); return [l.layers.length, l.layers.map(x => x.lengthMs)]; }'));
await p.waitForTimeout(400);
await play(['KeyA','KeyA','KeyS','KeyA'], 300);
console.log('t3', await S('l => { l.togglePlay(); return [l.layers.length, l.layers.map(x => x.lengthMs), l.lengthMs, l.running]; }'));
await S('(l, c) => { c.config.hilbertScope.isEnabled = false; return 1; }');
await p.waitForTimeout(1500);
const set = (id, v) => S(`(l, c) => { c.updateStageControl('${id}', ${v}); return c.effectiveConfig.ambient.${id}; }`);
for (const d of [0, 0.25, 0.6, 1]) { console.log('def', d, await set('loopDefinition', d)); await p.waitForTimeout(300); await waitPhase(0.35); await shot('def-' + d); await waitPhase(0.8); await shot('def-' + d + '-b'); }
// the long note: layer 1's longest note, in that layer's own phase
const info = await S(`l => { const L = l.layers[1]; const n = L.notes.reduce((a, b) => b.duration > a.duration ? b : a); return { len: L.lengthMs, start: n.pressTime / L.lengthMs, span: n.duration / L.lengthMs }; }`);
console.log('long', info);
await set('loopDefinition', 0.6);
for (const f of [0.1, 0.5, 0.9]) { await waitPhase((info.start + info.span * f) % 1, info.len); await shot('head-' + f); }
await waitPhase(0.2);
await p.keyboard.down('KeyG'); await p.waitForTimeout(500); console.log('held', await S('l => l.heldNotes().map(n => [n.note, Math.round(n.pressTime), Math.round(n.duration)])')); await shot('held-a'); await p.waitForTimeout(500); await shot('held-b');
await p.keyboard.up('KeyG'); await p.waitForTimeout(400); await shot('released-trace');
await set('loopDefinition', 0.25);
console.log(errs.slice(0, 8));
await b.close();
