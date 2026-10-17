import { chromium } from 'playwright';
const OUT = '/tmp/looper-pw/play-slice';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack ?? e).slice(0, 1500))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
await p.goto('http://localhost:5189/');
await p.getByRole('button', { name: /Play EmotiTone/ }).waitFor({ timeout: 180000 });
await p.getByRole('button', { name: /Play EmotiTone/ }).click(); await p.waitForTimeout(3000);
await p.evaluate(() => {
  window.__loopEvents = [];
  window.addEventListener('note-played', (e) => { const d = e.detail; if (d?.source === 'strudel-playback') window.__loopEvents.push(d.phraseId ?? '?'); });
});
const state = (label) => p.evaluate((label) => {
  const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s;
  const l = s.get('looper'); const ph = s.get('phrases');
  const ev = window.__loopEvents; const counts = {}; for (const id of ev) counts[id] = (counts[id] ?? 0) + 1; window.__loopEvents = [];
  return label + ' ' + JSON.stringify({
    members: l.members.map(m => ({ id: m.phraseId.slice(-6), off: Math.round(m.offsetBars * 1000) / 1000, bars: m.lengthBars })),
    origin: l.looper.barOriginBars === null ? null : Math.round(l.looper.barOriginBars * 1000) / 1000,
    deskPlaying: l.isDeskPlaying, latched: l.latched, open: l.openTakeId?.slice(-6) ?? null, running: l.running,
    desk: ph.deskPhraseId.slice(-6), take: ph.takeNotes.length, recent: ph.shelves.recent.length, kept: ph.shelves.kept.length,
    loopNotes: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k.slice(-6), v])), err: l.lastError,
  });
}, label);
const play = async (keys, gap = 450) => { for (const k of keys) { await p.keyboard.down(k); await p.waitForTimeout(200); await p.keyboard.up(k); await p.waitForTimeout(gap - 200); } };
const playBtn = () => p.locator('.code-strip-bar__play');
const settle = () => p.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('looper').settled());
const probe = () => p.evaluate(async () => {
  const seen = { active: 0, frames: 0, dialSweep: false, beat: new Set(), playingClass: false };
  for (let i = 0; i < 30; i += 1) {
    await new Promise(r => setTimeout(r, 100));
    seen.frames += 1;
    if (document.querySelector('.cm-code-strip-event--active')) seen.active += 1;
    if (document.querySelector('.code-strip--playing')) seen.playingClass = true;
    if (document.querySelector('[data-loop-dial-state="sweeping"]')) seen.dialSweep = true;
    const beat = document.querySelector('.beat-indicator'); if (beat) seen.beat.add(beat.getAttribute('data-ui-beat-state') + '/' + beat.getAttribute('data-beat-transport'));
  }
  return { ...seen, beat: [...seen.beat].slice(0, 6) };
});

// 1. A played take, then Play: it loops from where it was played.
await play(['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyA', 'KeyS', 'KeyD', 'KeyF']);
await playBtn().click(); await settle(); await p.waitForTimeout(2500);
console.log(await state('1 tap Play'));
console.log('  strip/beat probe', JSON.stringify(await probe()));
await p.screenshot({ path: `${OUT}/1-take-looping.png` });

// 2. Playing over it opens a fresh take (rule 3).
await play(['KeyG', 'KeyH', 'KeyJ']);
console.log(await state('2 played over'));
await p.screenshot({ path: `${OUT}/2-fresh-take-over-loop.png` });

// 3. Tap Play: the new take joins where it was played.
await playBtn().click(); await settle(); await p.waitForTimeout(2000);
console.log(await state('3 joined at played position'));
await p.screenshot({ path: `${OUT}/3-two-members.png` });

// 4. Scroll to a library phrase; tap Play: pinned to bar one.
const reel = p.locator('.phrase-shelf');
const rb = await reel.boundingBox();
for (let i = 0; i < 4; i += 1) { await p.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await p.mouse.wheel(0, -120); await p.waitForTimeout(500); }
console.log(await state('4a scrolled'));
await p.keyboard.press('Escape');
const deskIsLib = await p.evaluate(() => { const ph = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('phrases'); return ph.library.some(x => x.id === ph.deskPhraseId); });
if (!deskIsLib) {
  // Fall back to the store's own reel action if the wheel did not reach the Library.
  await p.evaluate(() => { const ph = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('phrases'); ph.openPhrase(ph.library[0].id); });
}
await playBtn().click(); await settle(); await p.waitForTimeout(2500);
console.log(await state('4 library joined'), 'viaWheel', deskIsLib);
console.log('  strip/beat probe', JSON.stringify(await probe()));
await p.screenshot({ path: `${OUT}/4-library-pinned.png` });

// 5. Stop All.
await p.getByRole('button', { name: 'Stop all loops' }).click(); await settle(); await p.waitForTimeout(500);
console.log(await state('5 stop all'));

// 6. Latch: hold Play, play notes, silence.
await p.evaluate(() => { const ph = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('phrases'); ph.startBlankTake(); });
const box = await playBtn().boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(300);
console.log(await state('6 latched'));
await p.screenshot({ path: `${OUT}/6-latched-key.png` });
for (const k of ['KeyA', 'KeyD', 'KeyG']) { await play([k], 600); await settle(); console.log(await state('  note ' + k)); }
await p.waitForTimeout(3200); await settle();
console.log(await state('6b after a bar of silence'));
await play(['KeyS', 'KeyF']); await settle(); await p.waitForTimeout(300);
console.log(await state('6c next pattern'));
await p.screenshot({ path: `${OUT}/6-latch-grown.png` });

// 7. Return still keeps (latch released, a take played over the loop).
await p.waitForTimeout(3000);
{ const hb = await playBtn().boundingBox(); await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(300); }
await play(['KeyA', 'KeyS', 'KeyD']);
const before = await state('7a');
await p.getByRole('button', { name: 'Return' }).click(); await p.waitForTimeout(300);
console.log(before); console.log(await state('7 return'));

await p.getByRole('button', { name: 'Stop all loops' }).click(); await settle(); await p.waitForTimeout(500);
console.log(await state('8 stop all'));
await p.screenshot({ path: `${OUT}/8-stopped.png` });
console.log('errors', errs.slice(0, 8));
await b.close();
