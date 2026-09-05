'use strict';

// Public static-page QA only. No saved cookies, accounts, or external requests.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://127.0.0.1:8400';
const VIEWPORTS = Object.freeze([
  {width: 390, height: 844},
  {width: 1280, height: 720},
  {width: 1440, height: 900},
  {width: 1920, height: 1080},
]);
const FIXTURE = {place: 'Petaluma, CA', total: 42, capped: false,
  sample: [
    {name: 'M•••• H•••', trade: 'Hair salon'},
    {name: 'O•• C•••', trade: 'Coffee shop'},
    {name: 'B•••• A•••', trade: 'Auto repair'},
    {name: 'F••• F••••', trade: 'Florist'},
    {name: 'S••• C•••', trade: 'Cafe'},
  ]};

function requestPolicy(raw, method) {
  let url;
  try { url = new URL(raw); } catch { return 'block'; }
  if (url.origin !== ORIGIN || url.username || url.password) return 'block';
  if (url.pathname === '/towncheck' && method === 'GET') return 'town-fixture';
  if (url.pathname === '/subscribe' && method === 'POST') return 'subscribe-fixture';
  if (method !== 'GET') return 'block';
  // No directory listing, arbitrary file, app route, or traversal is permitted.
  if (url.search || url.hash || /%|\\/.test(url.pathname)) return 'block';
  if (url.pathname === '/' || url.pathname === '/index.html') return 'static';
  if (/^\/(?:brand|fonts|img|img-ex)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp|woff2|ico)$/.test(url.pathname)
      && !url.pathname.split('/').includes('..')) return 'static';
  return 'block';
}

function freshOutput(root, name) {
  if (!/^attempt-[1-4]$/.test(name)) throw new Error('Use a new attempt-1 through attempt-4 output folder.');
  const parent = path.join(root, 'drafts', 'shots', 'item-12');
  fs.mkdirSync(parent, {recursive: true});
  if (fs.realpathSync(parent) !== parent) throw new Error('Screenshot directory must not be a symlink.');
  const out = path.join(parent, name);
  fs.mkdirSync(out); // No overwrite or deletion of earlier proof.
  return out;
}

async function installFence(context, audit) {
  await context.route('**/*', async route => {
    const request = route.request();
    const policy = requestPolicy(request.url(), request.method());
    if (policy === 'town-fixture') {
      audit.townFixtures++;
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE)});
    }
    if (policy === 'subscribe-fixture') {
      audit.subscribeFixtures++;
      return route.fulfill({status: 200, contentType: 'application/json', body: '{"ok":true}'});
    }
    if (policy === 'static') {
      audit.allowedStatic++;
      return route.continue();
    }
    audit.blocked++;
    if (new URL(request.url()).hostname === 'app.unwebbed.app') audit.blockedProduction++;
    return route.abort('blockedbyclient');
  });
  // Include popups and websockets, not just requests from the first page.
  await context.routeWebSocket('**/*', ws => { audit.blockedWebSockets++; ws.close(); });
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).filter(img => img.loading !== 'lazy')
      .map(img => img.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const box = el => {
      const r = el.getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom};
    };
    const visibleHero = [...hero.querySelectorAll('.pill,h1,.p,#tc,.frame,.cap,.down')]
      .filter(el => getComputedStyle(el).display !== 'none');
    const rect = hero.getBoundingClientRect();
    return {
      viewport: {width:innerWidth, height:innerHeight, visualHeight:visualViewport?.height},
      hero: box(hero), heroMinHeight:getComputedStyle(hero).minHeight,
      heroOneScreen: Math.abs(rect.height-innerHeight) <= 1,
      heroContentInside: visibleHero.every(el => {
        const r = el.getBoundingClientRect();
        return r.left >= rect.left-1 && r.right <= rect.right+1 && r.top >= rect.top-1 && r.bottom <= rect.bottom+1;
      }),
      heroContentInFirstViewport: visibleHero.every(el => {
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.right <= innerWidth+1 && r.top >= -1 && r.bottom <= innerHeight+1;
      }),
      horizontalOverflow: Math.max(0,document.documentElement.scrollWidth-innerWidth),
      stageHeights:[...document.querySelectorAll('.stage')].map(el => box(el).height),
      sceneHeights:[...document.querySelectorAll('.scene')].map(el => box(el).height),
      sceneTops:[...document.querySelectorAll('.scene')].map(el => box(el).y+scrollY),
      sceneMargins:[...document.querySelectorAll('.scene')].map(el => getComputedStyle(el).marginTop),
      font: getComputedStyle(document.querySelector('h1')).fontFamily,
      dvhSupported:CSS.supports('height','100dvh'),
    };
  });
}

async function capture(page, out, name) {
  const target = path.join(out, name + '.png');
  if (fs.existsSync(target)) throw new Error('Refusing to overwrite a screenshot.');
  await page.screenshot({path:target, fullPage:false});
}

async function run(attempt = 'attempt-1') {
  assert.equal(ROOT, '/root/code/uw-codex-site', 'Run the approved worktree helper only.');
  assert.equal(process.cwd(), '/root/tools/shot', 'Run from /root/tools/shot with its NODE_PATH.');
  assert.equal(fs.readFileSync(path.join(ROOT,'CNAME'),'utf8').trim(), 'unwebbed.app');
  const expected = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const out = freshOutput(ROOT, attempt);
  const {chromium} = require('playwright-core');
  const browser = await chromium.launch({headless:true, args:[
    '--no-sandbox', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--no-first-run', '--disable-default-apps',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  ]});
  const results = [];
  const audit = {allowedStatic:0, blocked:0, blockedProduction:0, blockedWebSockets:0, townFixtures:0, subscribeFixtures:0};
  try {
    for (const viewport of VIEWPORTS) {
      for (const reducedMotion of ['no-preference','reduce']) {
        const label = `${viewport.width}x${viewport.height}-${reducedMotion === 'reduce' ? 'reduced' : 'normal'}`;
        const context = await browser.newContext({viewport, reducedMotion, deviceScaleFactor:1,
          isMobile:viewport.width === 390, hasTouch:viewport.width === 390, serviceWorkers:'block'});
        await installFence(context, audit); // MUST precede newPage and navigation.
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', () => errors.push('JavaScript error'));
        const response = await page.goto(ORIGIN+'/', {waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        assert.equal(await response.text(),expected,'Preview listener is not serving this worktree snapshot.');
        await settle(page);
        const initial = await measure(page);
        await capture(page,out,`${label}-hero`); // First attempt preserved before any iteration.
        const scroll = [];
        for (const id of ['s2','s3','s4']) {
          const positions = await page.locator('#'+id).evaluate(el => ({top:el.offsetTop, travel:el.offsetHeight-innerHeight}));
          const points = reducedMotion === 'reduce' ? [0] : [0,0.35,0.8];
          for (const progress of points) {
            const y = positions.top+Math.max(0,positions.travel)*progress;
            await page.evaluate(y => scrollTo({top:y,behavior:'instant'}),y);
            await settle(page);
            const state = await page.evaluate(id => {
              const scene = document.getElementById(id), stage = scene.querySelector('.stage');
              const r = stage.getBoundingClientRect();
              const probe = document.elementFromPoint(innerWidth/2,Math.min(innerHeight-1,Math.max(1,r.top+innerHeight/2)));
              return {scrollY, stageTop:r.top, stageHeight:r.height, stageExposed:stage.contains(probe),
                sheetOpacity:getComputedStyle(document.querySelector('#sheet')).opacity,
                sheetTransform:getComputedStyle(document.querySelector('#sheetimg')).transform,
                visibleMessages:[...document.querySelectorAll('#chat .msg')].filter(el=>+getComputedStyle(el).opacity>.99).length,
                priceCents:document.querySelector('#cents').textContent};
            },id);
            scroll.push({id, progress,...state});
            if (progress === points.at(-1)) await capture(page,out,`${label}-${id}`);
          }
        }
        await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
        await page.locator('#town').fill('Petaluma, CA');
        await page.locator('#tc button').click();
        await page.waitForFunction(() => document.querySelector('#found').classList.contains('on'));
        await settle(page);
        const searched = await measure(page);
        await capture(page,out,`${label}-fixture-results`);
        const resizedHeight = viewport.width === 390 ? 700 : viewport.height-100;
        await page.setViewportSize({width:viewport.width,height:resizedHeight});
        await settle(page);
        const resized = await measure(page);
        if (viewport.width === 390) await capture(page,out,`${label}-resize-700`);
        await page.setViewportSize(viewport);
        await settle(page);
        const restored = await measure(page);
        const checks = {
          dvhSupported:initial.dvhSupported,
          stagesMatchViewport:initial.stageHeights.every(h=>Math.abs(h-viewport.height)<=1),
          noHorizontalOverflow:initial.horizontalOverflow===0 && searched.horizontalOverflow===0,
          heroContentInside:initial.heroContentInside,
          heroOneScreen:initial.heroOneScreen,
          heroContentInFirstViewport:initial.heroContentInFirstViewport,
          noJavaScriptErrors:errors.length===0,
          reducedScenesMatchViewport:reducedMotion!=='reduce'||initial.sceneHeights.every(h=>Math.abs(h-viewport.height)<=1),
          reducedScenesDoNotOverlap:reducedMotion!=='reduce'||initial.sceneTops.every((top,i,all)=>!i||top-all[i-1]>=viewport.height-1),
          scrollStagesMatchViewport:scroll.every(row=>Math.abs(row.stageHeight-viewport.height)<=1),
          scrollStagesExposed:scroll.every(row=>row.stageExposed),
          motionContentComplete:scroll.filter(row=>row.progress===(reducedMotion==='reduce'?0:0.8)).every(row=>
            row.id==='s2'?+row.sheetOpacity===1:row.id==='s3'?row.visibleMessages===4:row.priceCents==='60'),
          resizesWithViewport:resized.stageHeights.every(h=>Math.abs(h-resizedHeight)<=1),
          resizeRetainsHeroContent:resized.heroContentInside && restored.heroContentInside,
          restoresViewport:restored.stageHeights.every(h=>Math.abs(h-viewport.height)<=1),
        };
        results.push({label,viewport,reducedMotion,initial,searched,resized,restored,scroll,checks});
        await context.close();
      }
    }
    const receipt = {origin:ORIGIN,mode:'local-static-only',attempt,
      source_sha256:crypto.createHash('sha256').update(expected).digest('hex'),
      audit, results, allChecksPass:results.every(r=>Object.values(r.checks).every(Boolean))};
    fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({out,allChecksPass:receipt.allChecksPass,audit,
      checks:results.map(r=>({label:r.label,...r.checks,heroHeight:r.initial.hero.height}))},null,2));
    return receipt;
  } finally { await browser.close(); }
}

module.exports = {ORIGIN,VIEWPORTS,requestPolicy,freshOutput,installFence};
if (require.main === module) {
  if (process.argv.length > 3) throw new Error('Usage: node homepage_preview.js [attempt-1..attempt-4]');
  run(process.argv[2]).then(r=>{if(!r.allChecksPass)process.exitCode=1;}).catch(()=>{
    console.error('Preview stopped. Preserve its output folder; inspect the guarded helper and local listener.');
    process.exitCode=2;
  });
}
