// Known-answer tests for zakat.js, copied from the Android app's WealthZakatTest.kt.
// Run: node tests/zakat.test.js [path/to/config/zakat-rules.json]
'use strict';
var assert = require('assert');
var path = require('path');
var Z = require(path.join(__dirname, '..', 'zakat.js'));
var D = Z.D;

var prices = Z.BUNDLED_PRICES;
var passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.error('FAIL ' + name + '\n  ' + e.message); process.exitCode = 1; }
}
function eq(expected, actual) {
  assert.strictEqual(D.of(expected), actual, 'expected ' + expected + ' but was ' + D.toString(actual));
}
function cash(a) { return { amounts: { BANK: a } }; }
function calc(input, settings) { return Z.calculate(input, prices, settings || { method: 'HANAFI' }); }

test('unitsAreExactDecimals', function () {
  eq('11.664', Z.toGrams('1', '0', '0'));
  eq('11.664', Z.toGrams('0', '16', '0'));
  eq('11.664', Z.toGrams('0', '0', '96'));
  eq('87.48', Z.toGrams('7.5', '0', '0'));
  eq('612.36', Z.toGrams('52.5', '0', '0'));
});

test('silverNisabIsExact', function () {
  eq('202078.80', Z.silverNisabValue(prices));
  eq('1673055.00', Z.goldNisabValue(prices));
});

test('oneTakaPoishaBelowNisabIsNotDue', function () {
  var r = calc(cash('202078.79'));
  assert.strictEqual(r.isDue, false);
  eq('0', r.zakat);
  eq('0.01', r.shortOfNisab);
});

test('exactlyAtNisabIsDue', function () {
  var r = calc(cash('202078.80'));
  assert.strictEqual(r.isDue, true);
  eq('5051.97', r.zakat);
});

test('justAboveNisabIsDue', function () { assert.strictEqual(calc(cash('202078.81')).isDue, true); });

test('decimalSumsHaveNoBinaryError', function () {
  eq('0.3', calc({ amounts: { CASH_IN_HAND: '0.1', BANK: '0.2' } }).totalAssets);
});

test('cashAboveNisab', function () {
  var r = calc({ amounts: { BANK: '500000', CASH_IN_HAND: '20000' } });
  eq('13000', r.zakat);
  assert.strictEqual(r.lines.length, 2);
});

test('debtsDeductedUnderHanafi', function () {
  var r = calc({ amounts: { BANK: '300000', DEBTS_DUE: '150000' } });
  eq('150000', r.netWealth);
  assert.strictEqual(r.isDue, false);
  assert.ok(r.lines.some(function (l) { return l.type === 'debt' && l.deducted; }));
});

test('debtsNotDeductedUnderShafii', function () {
  var r = calc({ amounts: { BANK: '300000', DEBTS_DUE: '150000' } }, { method: 'SHAFII' });
  eq('300000', r.netWealth);
  assert.strictEqual(r.isDue, true);
  eq('7500', r.zakat);
  assert.ok(r.lines.some(function (l) { return l.type === 'debt' && !l.deducted; }));
});

test('debtsLargerThanAssetsNeverGoNegative', function () {
  eq('0', calc({ amounts: { BANK: '10', DEBTS_DUE: '100' } }).netWealth);
});

test('goldOnlyUsesGoldNisabByWeight', function () {
  var r7 = calc({ gold: { K22: Z.toGrams('7', '0', '0') } });
  assert.strictEqual(r7.nisabRule, 'GOLD_ONLY');
  assert.strictEqual(r7.isDue, false);
  var r8 = calc({ gold: { TRADITIONAL: Z.toGrams('8', '0', '0') } });
  assert.strictEqual(r8.isDue, true);
  eq('29894.832', r8.zakat); // 93.312 g × 12,815 × 2.5%
});

test('goldPlusAnyCashUsesSilverNisab', function () {
  var r = calc({ amounts: { CASH_IN_HAND: '1000' }, gold: { K22: '23.328' } });
  assert.strictEqual(r.nisabRule, 'MIXED_SILVER');
  assert.strictEqual(r.isDue, true);
});

test('wornJewelleryCountsUnderHanafiButIsExemptElsewhere', function () {
  var input = { gold: { K22: '100' }, wornGold: '60' };
  eq('1912500', calc(input).byCategory.GOLD);
  ['SHAFII', 'MALIKI', 'HANBALI'].forEach(function (m) {
    var r = calc(input, { method: m });
    eq('765000', r.byCategory.GOLD);
    assert.ok(r.lines.some(function (l) { return l.type === 'wornExempt'; }));
  });
});

test('resaleDeductionAndForcedGoldNisabAndSolarRate', function () {
  eq('1721250', calc({ gold: { K22: '100' } }, { metalDeductionPercent: '10' }).byCategory.GOLD);
  var r = calc(cash('2000000'), { nisabBasis: 'GOLD', yearType: 'SOLAR' });
  assert.strictEqual(r.nisabRule, 'GOLD');
  eq('51540', r.zakat);
});

test('displayRoundingIsHalfUpToWholeTaka', function () {
  eq('5052', D.round(D.of('5051.50')));
  eq('5051', D.round(D.of('5051.49')));
});

test('absurdValuesAreClamped', function () {
  var r = calc({ amounts: { BANK: '1e30', CASH_IN_HAND: '-500' } });
  eq('1000000000000', r.totalAssets);
  eq('0', calc({ amounts: { BANK: 'abc' } }).totalAssets);
});

// The site's rules must equal the app's config/zakat-rules.json.
var cfgPath = process.argv[2];
if (cfgPath) {
  test('rulesMatchTheAppConfig', function () {
    var c = JSON.parse(require('fs').readFileSync(cfgPath, 'utf8'));
    eq(c.nisab.goldGrams, Z.RULES.goldNisabGrams);
    eq(c.nisab.silverGrams, Z.RULES.silverNisabGrams);
    assert.strictEqual(c.nisab.pricedAtKarat, Z.RULES.nisabKarat);
    eq(c.units.gramsPerVori, Z.RULES.gramsPerVori);
    assert.strictEqual(c.units.anaPerVori, Z.RULES.anaPerVori);
    assert.strictEqual(c.units.rotiPerAna, Z.RULES.rotiPerAna);
    eq(c.rates.lunarYear, Z.RULES.lunarRate);
    eq(c.rates.solarYear, Z.RULES.solarRate);
    assert.strictEqual(c.defaultMethod, Z.RULES.defaultMethod);
    Object.keys(c.methods).forEach(function (m) {
      assert.deepStrictEqual(
        { jewelleryZakatable: c.methods[m].jewelleryZakatable, debtsReduceZakat: c.methods[m].debtsReduceZakat },
        Z.RULES.methods[m], m);
    });
    assert.strictEqual(Object.keys(c.methods).length, Object.keys(Z.RULES.methods).length);
  });
}

console.log(passed + ' passed' + (process.exitCode ? ', some FAILED' : ''));
