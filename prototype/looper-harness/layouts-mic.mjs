import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
for (const layout of process.argv.slice(2)) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['microphone'] });
const p = await ctx.newPage();
await p.goto('http://localhost:5185/?layout=' + layout);
await p.waitForTimeout(3500);
await p.getByRole('button', { name: /Play EmotiTone/ }).click();
await p.waitForTimeout(2500);
await p.getByRole('button', { name: 'Start humming capture' }).click();
await p.waitForTimeout(1500);
const r = await p.evaluate(() => { const e = document.querySelector('.humming-capture-transport__cancel'); if (!e) return 'no cancel'; const x = e.getBoundingClientRect(); return [x.x,x.y,x.width,x.height].map(Math.round).join(','); });
console.log(layout, 'cancel', r);
await p.screenshot({ path: `/tmp/looper-pw/layouts/${layout}-3-mic.png` });
await ctx.close();
}
await b.close();
