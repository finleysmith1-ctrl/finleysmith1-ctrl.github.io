'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {ORIGIN, VIEWPORTS, requestPolicy, installFence} = require('../tools/homepage_preview');
const source = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('the four viewport fallbacks are followed by dynamic-viewport overrides', () => {
  assert.match(source,/\.scene\+\.scene,\.scene\+\.flow\{margin-top:-100vh;margin-top:-100dvh;/);
  assert.match(source,/\.stage\{[^}]*height:100vh;height:100dvh;/);
  assert.match(source,/\.hero\{[^}]*min-height:100vh;min-height:100dvh;/);
  assert.match(source,/\.scene\{height:100vh!important;height:100dvh!important\}/);
  assert.equal((source.match(/100dvh/g)||[]).length,4);
});

test('scene travel and the approved dark palette remain unchanged', () => {
  assert.equal((source.match(/height:520vh/g)||[]).length,3);
  assert.equal(source.includes('520dvh'),false);
  assert.match(source,/--bg:#111312/);
  assert.match(source,/--green:#3DD98A/);
  assert.match(source,/total=el\.offsetHeight-innerHeight/);
});

test('only the four requested screenshot sizes are used', () => {
  assert.deepEqual(VIEWPORTS,[{width:390,height:844},{width:1280,height:720},
    {width:1440,height:900},{width:1920,height:1080}]);
});

test('reduced motion removes overlap without changing normal scene travel', () => {
  const reduced=source.slice(source.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.match(reduced,/\.scene\+\.scene,\.scene\+\.flow\{margin-top:0\}/);
});

test('small-phone fit keeps text size and the full preview aspect ratio', () => {
  const phone=source.match(/@media \(max-width:520px\)\{([\s\S]*?)\n\}/)[1];
  assert.match(phone,/max-width:290px/);
  assert.match(phone,/\.hero \.down\{display:block/);
  assert.equal(/font-size|line-height|overflow|aspect-ratio|(?:^|;)height:/.test(phone),false);
});

test('public localhost images, fonts and homepage GETs are permitted', () => {
  for (const route of ['/','/index.html','/img/ex-marlowe-full.jpg','/brand/mark.svg',
    '/fonts/bricolage-var.woff2','/img-ex/marlowe.jpg']) {
    assert.equal(requestPolicy(ORIGIN+route,'GET'),'static');
  }
});

test('all production requests are blocked including automatic analytics', () => {
  for (const host of ['https://app.unwebbed.app','https://unwebbed.app',
    'https://staging.unwebbed.app','https://example.com','http://127.0.0.1:8398']) {
    for (const method of ['GET','POST','OPTIONS']) {
      assert.equal(requestPolicy(host+'/px',method),'block');
    }
  }
});

test('town and subscription interactions are fixtures, never sent to the listener', () => {
  assert.equal(requestPolicy(ORIGIN+'/towncheck?town=Petaluma','GET'),'town-fixture');
  assert.equal(requestPolicy(ORIGIN+'/subscribe','POST'),'subscribe-fixture');
  assert.equal(requestPolicy(ORIGIN+'/towncheck','POST'),'block');
  assert.equal(requestPolicy(ORIGIN+'/subscribe','GET'),'block');
});

test('credentials, arbitrary files, mutations and unsafe URLs are blocked', () => {
  for (const value of [ORIGIN+'/.git/config',ORIGIN+'/AGENTS.md',ORIGIN+'/tools/homepage_preview.js',
    ORIGIN+'/brand/%2e%2e/.secret',ORIGIN+'/brand/',ORIGIN+'/img/a.jpg?x=1',
    'http://user:pass@127.0.0.1:8400/','file:///root/.secret','not a URL']) {
    assert.equal(requestPolicy(value,'GET'),'block');
  }
  assert.equal(requestPolicy(ORIGIN+'/index.html','POST'),'block');
});

test('context fence blocks production before any browser navigation and closes sockets', async () => {
  let handler, socketHandler;
  const context = {route:async(pattern,fn)=>{assert.equal(pattern,'**/*');handler=fn;},
    routeWebSocket:async(pattern,fn)=>{assert.equal(pattern,'**/*');socketHandler=fn;}};
  const audit={blocked:0,blockedProduction:0,blockedWebSockets:0,allowedStatic:0,townFixtures:0,subscribeFixtures:0};
  await installFence(context,audit);
  let aborted=false,continued=false,closed=false;
  await handler({request:()=>({url:()=> 'https://app.unwebbed.app/px',method:()=> 'POST'}),
    abort:async()=>{aborted=true;},continue:async()=>{continued=true;}});
  socketHandler({close:()=>{closed=true;}});
  assert.equal(aborted,true); assert.equal(continued,false); assert.equal(closed,true);
  assert.equal(audit.blockedProduction,1); assert.equal(audit.blockedWebSockets,1);
});
