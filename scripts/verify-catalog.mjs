import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:4173/catalog/';
const output = resolve('.local/qa/catalog');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const errors=[], samples=[];
const ready = page => page.waitForFunction(()=>window.catalogDemo && document.getElementById('cards').getAttribute('aria-busy')==='false');
async function open(options){const page=await browser.newPage(options);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(url);await ready(page);return page;}
try {
  const page=await open({viewport:{width:1440,height:1100}});
  const total=await page.evaluate(()=>window.catalogDemo.count);assert.equal(total,96);
  await page.locator('#animate').click();await page.waitForTimeout(150);
  const a=await page.locator('[data-id="foundry"] canvas').screenshot();await page.waitForTimeout(180);
  const b=await page.locator('[data-id="foundry"] canvas').screenshot();assert.ok(!a.equals(b),'Foundry frames animate');
  await page.locator('#animate').click();const still=await page.locator('[data-id="foundry"] canvas').screenshot();await page.waitForTimeout(180);
  assert.ok((await page.locator('[data-id="foundry"] canvas').screenshot()).equals(still),'Pause freezes native frames');
  await page.reload();await ready(page);
  do {
    for(const card of await page.locator('.card').all()) {
      for(const select of await card.locator('select').all()) {
        for(const value of await select.locator('option').evaluateAll(options=>options.map(o=>o.value))) await select.selectOption(value);
        await select.selectOption({index:0});
      }
    }
    samples.push(...await page.locator('.card').evaluateAll(cards=>cards.map(card=>({id:card.dataset.id,name:card.querySelector('h2').textContent,png:card.querySelector('canvas').toDataURL()}))));
    if(await page.locator('#next').isDisabled())break;
    await page.locator('#next').click();await ready(page);
  }while(true);
  assert.equal(new Set(samples.map(s=>s.id)).size,total,'Every object and token rendered');
  await page.locator('#search').fill('cache');await ready(page);
  assert.ok(await page.locator('.card').count());
  assert.equal(await page.locator('.card').evaluateAll(cards=>cards.every(c=>c.textContent.includes('cache'))),true);
  await page.locator('#search').fill('nothing-matches-this');await ready(page);assert.equal(await page.locator('.card').count(),0);
  await page.locator('#search').fill('');await page.locator('#group').selectOption('Inserters');await ready(page);assert.equal(await page.locator('.card').count(),6);
  const mobile=await open({viewport:{width:390,height:1100},deviceScaleFactor:1});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await mobile.screenshot({path:resolve(output,'mobile.png')});
  const reduced=await open({viewport:{width:1100,height:900},reducedMotion:'reduce'});
  assert.equal(await reduced.locator('#animate').isDisabled(),true);
  const sheets=await browser.newPage({viewport:{width:1200,height:1200}});
  for(let i=0;i<samples.length;i+=24){
    await sheets.setContent('<style>body{margin:0;padding:20px;background:#080f1c;color:#c9d6e6;font:12px monospace}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#0c1e35;padding:10px}img{display:block;width:100%;height:136px;object-fit:contain}figcaption{margin-top:8px;font-size:11px}</style><main></main>');
    await sheets.evaluate(items=>{for(const item of items){const f=document.createElement('figure'),img=document.createElement('img'),c=document.createElement('figcaption');img.src=item.png;c.textContent=item.id;f.append(img,c);document.querySelector('main').append(f);}},samples.slice(i,i+24));
    await sheets.screenshot({path:resolve(output,`contact-${i/24+1}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[],'No render or load errors');
  console.log(`Catalog checks passed: ${total} previews, all selector options, search, paging, animation, pause, phone and reduced motion. Screenshots: ${output}`);
} finally { await browser.close(); }
