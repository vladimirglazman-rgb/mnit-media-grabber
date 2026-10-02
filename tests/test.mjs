const { chromium } = await import(process.env.PW || '/opt/node-tools/node_modules/playwright/index.mjs');
import { rmSync, mkdirSync } from 'node:fs'; rmSync('/tmp/mg-test-profile', { recursive: true, force: true }); 
const ext = new URL('../extension', import.meta.url).pathname;
const ctx = await chromium.launchPersistentContext('/tmp/mg-test-profile', {
  channel: 'chromium', headless: true, acceptDownloads: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
const errors = [];
const page = await ctx.newPage();
await page.waitForTimeout(1500); await page.goto('http://localhost:8123/index.html');
await page.waitForTimeout(2500);
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({url:'http://localhost:8123/*'}))[0].id);
const data = await sw.evaluate(async (t) => (await chrome.storage.session.get('tab_'+t))['tab_'+t], tabId);
console.log('DETECTED:', JSON.stringify(data.items.map(i=>({kind:i.kind,url:i.url.split('/').pop(),size:i.size,variants:i.variants?.map(v=>v.resolution)}))), 'children', data.children.length);
await sw.evaluate(async () => chrome.downloads.setShelfEnabled?.(false)).catch(()=>{});
await sw.evaluate(() => chrome.storage.local.set({settings:{minSizeKB:0,lang:'he'}}));
const panel = await ctx.newPage();
panel.on('pageerror', e => errors.push(e.message)); panel.on('console', m => m.type()==='error' && errors.push(m.text()));
await panel.addInitScript((t) => { const q = chrome.tabs.query.bind(chrome.tabs); chrome.tabs.query = async (o) => o.active ? [await chrome.tabs.get(t)] : q(o); }, tabId);
await panel.goto(`chrome-extension://${id}/sidepanel.html`);
await panel.waitForTimeout(1200);
await panel.setViewportSize({width:480,height:640});
await panel.screenshot({path:'shot-list.png'});
// download stream best (1280 -> hi, encrypted ts) then lo variant (fmp4)
const items = panel.locator('.item');
console.log('UI items:', await items.count());
for (const sel of ['0','1']) {
  const hls = panel.locator('.item', { has: panel.locator('select') });
  await hls.locator('select').selectOption(sel);
  await hls.locator('.btn.primary').click();
  await panel.waitForFunction(() => /✓|נכשל|Failed/.test(document.querySelector('.item select')?.closest('.item').querySelector('.status').textContent), null, {timeout:60000});
  console.log('HLS', sel, await hls.locator('.status').textContent());
}
const direct = panel.locator('.item', { hasNot: panel.locator('select') }).first();
await direct.locator('.btn.primary').click(); await panel.waitForTimeout(1500);
console.log('DIRECT', await direct.locator('.status').textContent());
await panel.waitForTimeout(1500);
const dls = await sw.evaluate(async () => (await chrome.downloads.search({})).map(d => ({f:d.filename, s:d.state, b:d.fileSize, e:d.error})));
console.log('DOWNLOADS', JSON.stringify(dls)); globalThis.DLS=dls;
await panel.screenshot({path:'shot-brand.png'});
await panel.click('#btnLang'); await panel.click('#btnHistory'); await panel.waitForTimeout(400); await panel.screenshot({path:'shot-history-en.png'});
await panel.click('#btnLang'); await panel.click('#btnClear'); await panel.click('#btnHistory'); await panel.waitForTimeout(500); await panel.screenshot({path:'shot-empty.png'});
console.log('ERRORS', errors);
const {execSync}=await import('child_process'); for (const d of globalThis.DLS) console.log(d.b, execSync('ffprobe -v error -show_entries format=format_name,duration:stream=codec_name -of csv=p=0 '+d.f+' && ffmpeg -v error -i '+d.f+' -f null - 2>&1 | head -3').toString().replace(/\n/g,' '));
await ctx.close();
