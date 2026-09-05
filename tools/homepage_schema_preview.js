'use strict';

// Homepage-only proof. The production fence is installed before opening any page.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {ORIGIN, installFence} = require('./homepage_preview');
const ROOT = path.resolve(__dirname, '..');
const EXPECTED_SOFTWARE = '\n{"@context":"https://schema.org","@type":"SoftwareApplication",\n "name":"Unwebbed","applicationCategory":"BusinessApplication",\n "operatingSystem":"Web",\n "description":"Finds local businesses with no website and builds each one a real website with AI, so freelance web designers can pitch with the work already done.",\n "url":"https://unwebbed.app/",\n "offers":[{"@type":"Offer","name":"Solo","price":"19","priceCurrency":"USD"},\n           {"@type":"Offer","name":"Studio","price":"49","priceCurrency":"USD"}]}\n';

function extractMarkup(source) {
  const blocks = [];
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\btype=["']application\/ld\+json["']/i.test(match[1])) continue;
    assert.equal(/\bsrc\s*=/i.test(match[1]), false, 'Schema must be inline.');
    JSON.parse(match[2]);
    blocks.push({html:match[0],body:match[2]});
  }
  return blocks;
}

function inertInput(source) {
  const blocks = extractMarkup(source);
  assert.equal(blocks.length, 3, 'Expected all three homepage schema blocks.');
  assert.equal(blocks[0].body, EXPECTED_SOFTWARE, 'Existing software schema changed.');
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'">\n'
    + '<title>Unwebbed local JSON-LD validation input</title>\n'
    + blocks.map(block => block.html).join('\n') + '\n</head><body></body></html>\n';
}

const sha = value => crypto.createHash('sha256').update(value).digest('hex');

async function run() {
  assert.equal(ROOT, '/root/code/uw-codex-site');
  assert.equal(process.cwd(), '/root/tools/shot');
  const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const input = inertInput(source);
  const out = path.join(ROOT, 'drafts', 'shots', 'item13');
  fs.mkdirSync(out); // An existing attempt is retained, never overwritten.
  assert.equal(fs.realpathSync(out), out);
  fs.writeFileSync(path.join(out, 'schema-input.html'), input, {flag:'wx'});
  const {chromium} = require('playwright-core');
  const browser = await chromium.launch({headless:true,args:[
    '--no-sandbox','--disable-background-networking','--disable-component-update',
    '--disable-sync','--no-first-run','--disable-default-apps',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  ]});
  const audit = {allowedStatic:0,blocked:0,blockedProduction:0,blockedWebSockets:0,townFixtures:0,subscribeFixtures:0};
  const measurements = [];
  try {
    for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
      const context = await browser.newContext({viewport,deviceScaleFactor:1,
        isMobile:viewport.width===390,hasTouch:viewport.width===390,serviceWorkers:'block',reducedMotion:'reduce'});
      await installFence(context,audit);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',() => errors.push('JavaScript error'));
      const response = await page.goto(ORIGIN+'/',{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      assert.equal(await response.text(),source,'Preview is not the approved worktree snapshot.');
      await page.evaluate(() => document.fonts.ready);
      const visible = await page.locator('.faq details').evaluateAll(details => details.map(detail => ({
        question:detail.querySelector('summary').textContent.trim(),
        answer:[...detail.querySelectorAll('.a p')].map(p=>p.textContent.trim()).join('\n\n'),
      })));
      const faq = JSON.parse(extractMarkup(source)[2].body).mainEntity;
      assert.deepEqual(visible,faq.map(item=>({question:item.name,answer:item.acceptedAnswer.text})));
      await page.locator('.faq details').nth(1).locator('summary').click();
      await page.locator('.faq details').nth(4).locator('summary').click();
      const label = viewport.width===390?'mobile':'desktop';
      await page.locator('.faq').screenshot({path:path.join(out,'faq-'+label+'.png')});
      for (const [index,name] of [[1,'leads'],[4,'earnings']]) {
        await page.locator('.faq details').nth(index).screenshot({path:path.join(out,name+'-'+label+'.png')});
      }
      const overflow = await page.evaluate(() => Math.max(0,document.documentElement.scrollWidth-innerWidth));
      measurements.push({viewport,faqCount:visible.length,allAnswersMatch:true,horizontalOverflow:overflow,javaScriptErrors:errors});
      assert.equal(overflow,0);
      assert.equal(errors.length,0);
      await context.close();
    }
    const receipt = {mode:'local-static-only',origin:ORIGIN,source_sha256:sha(source),
      input_sha256:sha(input),schema_types:extractMarkup(source).map(block=>JSON.parse(block.body)['@type']),
      software_sha256:sha(EXPECTED_SOFTWARE),audit,measurements,
      external_schema_validation:'pending — this local check is not the schema.org result'};
    fs.writeFileSync(path.join(out,'preview.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(receipt,null,2));
  } finally { await browser.close(); }
}

module.exports = {extractMarkup,inertInput,EXPECTED_SOFTWARE};
if (require.main===module) run().catch(error=>{console.error(error.message);process.exitCode=1;});
