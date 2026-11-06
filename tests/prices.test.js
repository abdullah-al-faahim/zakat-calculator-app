// Tests for tools/update-prices.js, ported from the Android app's PriceResponseTest.
// Run: node tests/prices.test.js [path/to/saved/bajus.html]
'use strict';
var assert = require('assert');
var path = require('path');
var P = require(path.join(__dirname, '..', 'tools', 'update-prices.js'));

var passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.error('FAIL ' + name + '\n  ' + e.message); process.exitCode = 1; }
}
var today = '2026-10-28';
function page(o) {
  o = Object.assign({ gold22: '19,125', trad: '12,815', silver22: '330', date: '28-October-2026' }, o);
  return (o.date ? '<a href="https://www.bajus.org/storage/files/shares/Gold Price/' + o.date + '.pdf">View In PDF</a>\n' : '') +
    '<tr><th scope="row"><h6> 22 KARAT Gold </h6></th><td></td><td><span class="price">' + o.gold22 + ' BDT/GRAM</span></td></tr>\n' +
    '<tr><th scope="row"><h6> 21 KARAT Gold </h6></th><td></td><td><span class="price">18,265 BDT/GRAM</span></td></tr>\n' +
    '<tr><th scope="row"><h6> 18 KARAT Gold </h6></th><td></td><td><span class="price">15,685 BDT/GRAM</span></td></tr>\n' +
    '<tr><th scope="row"><h6> TRADITIONAL Gold </h6></th><td></td><td><span class="price">' + o.trad + ' BDT/GRAM</span></td></tr>\n' +
    '<tr><th scope="row"><h6> 22 KARAT Silver </h6></th><td></td><td><span class="price">' + o.silver22 + ' BDT/GRAM</span></td></tr>\n' +
    '<tr><th scope="row"><h6> TRADITIONAL Silver </h6></th><td></td><td><span class="price">205 BDT/GRAM</span></td></tr>';
}
var previous = { GOLD: { K22: '1', K21: '1', K18: '1', TRADITIONAL: '1' }, SILVER: { K22: '330', K21: '315', K18: '270', TRADITIONAL: '205' } };
function run(html, day) { return P.validate(P.parse(html, previous), day || today); }

test('genuinePageParses', function () {
  var p = run(page());
  assert.strictEqual(p.date, '2026-10-28');
  assert.strictEqual(p.GOLD.K22, '19125');
  assert.strictEqual(p.SILVER.K21, '315'); // missing row keeps the previous value
});

test('shortMonthNamesParse', function () {
  assert.strictEqual(P.toIsoDate('6-Nov-2026'), '2026-11-06');
  assert.strictEqual(P.toIsoDate('28-October-2026'), '2026-10-28');
  assert.strictEqual(P.toIsoDate('1-Sept-2026'), '2026-09-01');
  assert.strictEqual(P.toIsoDate('31-Feb-2026'), null);
  assert.strictEqual(P.toIsoDate('6-Novz-2026'), null);
  assert.strictEqual(run(page({ date: '6-Nov-2026' }), '2026-11-06').date, '2026-11-06');
});

test('implausibleOrTamperedValuesAreRejected', function () {
  [
    page({ gold22: '1' }),
    page({ gold22: '9,999,999' }),
    page({ trad: '25,000' }),
    page({ silver22: '0' }),
    page({ date: '1-January-2026' }),
    page({ date: '5-December-2026' }),
    page({ date: null }),
    '<html>maintenance</html>',
  ].forEach(function (html, i) {
    assert.throws(function () { run(html); }, function (e) { return e.invalid === true; }, 'case ' + i);
  });
});

var saved = process.argv[2];
if (saved) {
  test('savedLivePageParses', function () {
    var html = require('fs').readFileSync(saved, 'utf8');
    var p = P.parse(html, null);
    P.validate(p, p.date);
    console.log('  live page: ' + p.date + ', 22K gold ' + p.GOLD.K22 + ', 22K silver ' + p.SILVER.K22);
  });
}

console.log(passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
