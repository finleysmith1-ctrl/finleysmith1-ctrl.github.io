'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {extractMarkup, inertInput, EXPECTED_SOFTWARE} = require('../tools/homepage_schema_preview');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = extractMarkup(source);
const values = blocks.map(block => JSON.parse(block.body));

test('exactly one SoftwareApplication, Organization and FAQPage exist', () => {
  assert.deepEqual(values.map(value => value['@type']), ['SoftwareApplication', 'Organization', 'FAQPage']);
  assert.ok(values.every(value => value['@context'] === 'https://schema.org'));
});

test('the existing SoftwareApplication stays byte-identical, including its offers', () => {
  assert.equal(blocks[0].body, EXPECTED_SOFTWARE);
});

test('Organization uses the existing public name, home URL, logo and email only', () => {
  assert.deepEqual(values[1], {'@context':'https://schema.org','@type':'Organization',
    name:'Unwebbed',url:'https://unwebbed.app/',logo:'https://unwebbed.app/brand/mark.svg',email:'hello@unwebbed.app'});
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'brand', 'mark.svg')));
});

test('all nine visible questions appear in order with one answer each', () => {
  const questions = [...source.matchAll(/<details><summary>(.*?)<\/summary>/g)].map(match => match[1]);
  const faq = values[2].mainEntity;
  assert.equal(questions.length, 9);
  assert.deepEqual(faq.map(value => value.name), questions);
  assert.equal(new Set(questions).size, 9);
  assert.ok(faq.every(value => value['@type'] === 'Question' && value.acceptedAnswer['@type'] === 'Answer'
    && typeof value.acceptedAnswer.text === 'string' && value.acceptedAnswer.text.length > 0));
});

test('every schema answer matches all visible paragraph text, including links and two-paragraph answers', () => {
  const answers = [...source.matchAll(/<details><summary>.*?<\/summary><div class="a">([\s\S]*?)<\/div><\/details>/g)]
    .map(match => match[1].replace(/<\/p>\s*<p>/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  assert.deepEqual(values[2].mainEntity.map(value => value.acceptedAnswer.text.replace(/\s+/g, ' ').trim()), answers);
});

test('the two corrected answers retain approved facts and all existing earnings amounts', () => {
  const faq = values[2].mainEntity;
  assert.equal(faq[1].acceptedAnswer.text, 'Public map data from Overture Maps, with OpenStreetMap as a fallback. Unwebbed looks for signs of an existing website and shows whether that check is complete, so you can review each lead before you call.');
  assert.match(faq[4].acceptedAnswer.text, /\$90.*\$150.*\$195/);
  assert.ok(faq[4].acceptedAnswer.text.includes('Your earnings are recorded the moment the client pays, and Finley pays them out to you; automatic Stripe payouts are not available yet.'));
  assert.equal(faq[4].acceptedAnswer.text.includes('Both are paid out to your own Stripe account'), false);
});

test('validator input contains every exact JSON-LD block and no fetchable resource or executable code', () => {
  const input = inertInput(source);
  assert.deepEqual(extractMarkup(input).map(block => block.body), blocks.map(block => block.body));
  assert.equal((input.match(/<script/g) || []).length, 3);
  assert.equal(/<(?:img|link|iframe|base|form)\b|<script[^>]*\bsrc=|\bonload=/i.test(input), false);
  assert.ok(input.includes("default-src 'none'"));
});

test('invalid or remote-loaded schema is refused before any browser action', () => {
  assert.throws(() => extractMarkup('<script type="application/ld+json">{bad}</script>'));
  assert.throws(() => extractMarkup('<script src="https://example.com/ld" type="application/ld+json">{}</script>'));
  assert.throws(() => inertInput('<html></html>'));
});
