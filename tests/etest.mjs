// Encrypted audio (Suno-style): the panel must refuse it and save nothing.
const { chromium } = await import(process.env.PW || '/opt/node-tools/node_modules/playwright/index.mjs');
import { rmSync } from 'node:fs'; rmSync('/tmp/mg-etest-profile', { recursive: true, force: true });
const ext = new URL('../extension', import.meta.url).pathname;
const ctx = await chromium.launchPersistentContext('/tmp/mg-etest-profile', {
  channel: 'chromium', headless: true, acceptDownloads: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
const id = sw.url().split('/')[2];
const errors = [];
const page = await ctx.newPage();
await page.waitForTimeout(1500); await page.goto('http://localhost:8123/enc.html');
await page.waitForTimeout(2500);
const tabId = await sw.evaluate(async () => (await chrome.tabs.query({url:'http://localhost:8123/*'}))[0].id);
const data = await sw.evaluate(async (t) => (await chrome.storage.session.get('tab_'+t))['tab_'+t], tabId);
console.log('DETECTED:', JSON.stringify(data.items.map(i=>({kind:i.kind,url:i.url.split('/').pop(),size:i.size}))));
await sw.evaluate(() => chrome.storage.local.set({settings:{minSizeKB:0,lang:'he'}}));
const panel = await ctx.newPage();
panel.on('pageerror', e => errors.push(e.message)); panel.on('console', m => m.type()==='error' && errors.push(m.text()));
await panel.addInitScript((t) => { const q = chrome.tabs.query.bind(chrome.tabs); chrome.tabs.query = async (o) => o.active ? [await chrome.tabs.get(t)] : q(o); }, tabId);
await panel.goto(`chrome-extension://${id}/sidepanel.html`);
await panel.waitForTimeout(1200);
const item = panel.locator('.item').first();
await item.locator('.btn.primary').click(); await panel.waitForTimeout(2500);
const status = await item.locator('.status').textContent();
const dls = await sw.evaluate(async () => (await chrome.downloads.search({})).length);
console.log('STATUS', status);
console.log('DOWNLOADS', dls);
console.log('ERRORS', JSON.stringify(errors));
console.log(/מוצפן/.test(status) && dls === 0 ? 'PASS' : 'FAIL');
await ctx.close();
