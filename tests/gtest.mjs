const { chromium } = await import(process.env.PW || '/opt/node-tools/node_modules/playwright/index.mjs');
import { rmSync, mkdirSync } from 'node:fs'; rmSync('/tmp/mg-test-profile', { recursive: true, force: true }); mkdirSync('gshots', { recursive: true });
const ext = new URL('../extension', import.meta.url).pathname;
const ctx = await chromium.launchPersistentContext('/tmp/mg-test-profile', { channel:'chromium', headless:true,
  args:[`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
await new Promise(r=>setTimeout(r,2500));
console.log('tabs after install:', ctx.pages().map(p=>p.url()).filter(u=>u.includes('guide')));
const errs=[];
const p = await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.setViewportSize({width:1100,height:640});
const gid=(ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker')).url().split('/')[2]; await p.goto('chrome-extension://'+gid+'/guide.html');
for (let i=1;i<=14;i++){ await p.screenshot({path:`gshots/s${String(i).padStart(2,'0')}.png`}); await p.click('#next'); await p.waitForTimeout(150);}
await p.setViewportSize({width:390,height:900}); await p.goto('chrome-extension://'+gid+'/guide.html#11'); await p.waitForTimeout(200);
await p.screenshot({path:'gshots/mobile11.png', fullPage:true});
console.log('hscroll', await p.evaluate(()=>document.documentElement.scrollWidth > innerWidth));
console.log('errors', errs);
await ctx.close();
