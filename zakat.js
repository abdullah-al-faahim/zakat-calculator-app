/*
 * Zakat on wealth, ported from the Android app (calculation/WealthZakat.kt).
 * Pure logic: no DOM, no network. Runs in the browser (window.Zakat) and in Node for tests.
 *
 * All money uses exact decimals (BigInt with 18 decimal places), never binary floating point,
 * so 0.1 + 0.2 is exactly 0.3 here too. Rounding to whole taka happens only for display.
 */
(function (root) {
  'use strict';

  // ── Exact decimals ──
  var SCALE = 18;
  var ONE = 10n ** BigInt(SCALE);

  function divRound(a, b) { // half-up, sign-aware
    var neg = (a < 0n) !== (b < 0n);
    var x = a < 0n ? -a : a, y = b < 0n ? -b : b;
    var q = x / y, r = x % y;
    if (r * 2n >= y) q += 1n;
    return neg ? -q : q;
  }
  var D = {
    of: function (v) {
      if (typeof v === 'bigint') return v;
      var s = String(v == null ? '' : v).trim();
      if (s === '') return 0n;
      var m = /^(-?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
      if (!m || (m[2] === '' && !m[3])) return 0n;
      var digits = (m[2] || '0') + (m[3] || ''), exp = (m[4] ? Number(m[4]) : 0) - (m[3] || '').length + SCALE;
      if (exp > 60) return (m[1] ? -1n : 1n) * (10n ** 60n); // absurd input; clamped by caller
      var n = exp >= 0 ? BigInt(digits) * 10n ** BigInt(exp) : divRound(BigInt(digits), 10n ** BigInt(-exp));
      return m[1] ? -n : n;
    },
    add: function (a, b) { return a + b; },
    sub: function (a, b) { return a - b; },
    mul: function (a, b) { return divRound(a * b, ONE); },
    div: function (a, b) { return b === 0n ? 0n : divRound(a * ONE, b); },
    min: function (a, b) { return a < b ? a : b; },
    max0: function (a) { return a > 0n ? a : 0n; },
    clamp: function (a, max) { return a < 0n ? 0n : (a > max ? max : a); },
    pos: function (a) { return a > 0n; },
    /** Whole taka, half-up (display only). */
    round: function (a) { return divRound(a, ONE) * ONE; },
    toString: function (a, places) {
      var neg = a < 0n, x = neg ? -a : a;
      if (places != null) { var f = 10n ** BigInt(SCALE - places); x = divRound(x, f) * f; }
      var int = (x / ONE).toString(), frac = (x % ONE).toString().padStart(SCALE, '0').replace(/0+$/, '');
      if (places != null) frac = frac.slice(0, places);
      return (neg && x !== 0n ? '-' : '') + int + (frac ? '.' + frac : '');
    },
  };

  // ── Rules: mirror of config/zakat-rules.json in the app (a test checks they match) ──
  var RULES = {
    goldNisabGrams: D.of('87.48'),
    silverNisabGrams: D.of('612.36'),
    nisabKarat: 'K22',
    gramsPerVori: D.of('11.664'),
    anaPerVori: 16,
    rotiPerAna: 6,
    lunarRate: D.of('0.025'),
    solarRate: D.of('0.02577'),
    defaultMethod: 'HANAFI',
    methods: {
      HANAFI: { jewelleryZakatable: true, debtsReduceZakat: true },
      SHAFII: { jewelleryZakatable: false, debtsReduceZakat: false },
      MALIKI: { jewelleryZakatable: false, debtsReduceZakat: true },
      HANBALI: { jewelleryZakatable: false, debtsReduceZakat: true },
    },
  };

  var LIMITS = { amount: D.of('1000000000000'), grams: D.of('100000'), price: D.of('10000000'), percent: D.of('100') };

  var KARATS = ['K22', 'K21', 'K18', 'TRADITIONAL'];
  var METALS = ['GOLD', 'SILVER'];
  var FIELDS = {
    CASH_IN_HAND: 'CASH', BANK: 'CASH', MOBILE_BANKING: 'CASH', FOREIGN_CURRENCY: 'CASH',
    SAVINGS_SCHEMES: 'CASH', LOANS_GIVEN: 'CASH', PROVIDENT_FUND: 'CASH', OTHER_CASH: 'CASH',
    INVENTORY: 'BUSINESS', BUSINESS_CASH: 'BUSINESS', BUSINESS_RECEIVABLE: 'BUSINESS',
    SHARES: 'INVESTMENT', PROPERTY_FOR_SALE: 'INVESTMENT', OTHER_INVESTMENT: 'INVESTMENT',
    DEBTS_DUE: 'LIABILITY', BILLS_DUE: 'LIABILITY', INSTALLMENTS_12M: 'LIABILITY', BUSINESS_PAYABLE: 'LIABILITY',
  };

  /** BAJUS rate effective 28 October 2026, taka per gram (same as the app's bundled rates). */
  var BUNDLED_PRICES = {
    date: '2026-10-28',
    GOLD: { K22: '19125', K21: '18265', K18: '15685', TRADITIONAL: '12815' },
    SILVER: { K22: '330', K21: '315', K18: '270', TRADITIONAL: '205' },
  };

  /** vori + ana + roti → grams (1 vori = 16 ana, 1 ana = 6 roti). */
  function toGrams(vori, ana, roti) {
    var perAna = D.div(RULES.gramsPerVori, D.of(RULES.anaPerVori));
    var perRoti = D.div(perAna, D.of(RULES.rotiPerAna));
    return D.mul(D.of(vori), RULES.gramsPerVori) + D.mul(D.of(ana), perAna) + D.mul(D.of(roti), perRoti);
  }

  function price(prices, metal, karat) { return D.clamp(D.of((prices[metal] || {})[karat]), LIMITS.price); }

  /**
   * input:    { amounts: {FIELD: value}, gold: {KARAT: grams}, silver: {KARAT: grams}, wornGold, wornSilver }
   * prices:   { GOLD: {KARAT: perGram}, SILVER: {KARAT: perGram} }
   * settings: { method, nisabBasis: AUTO|SILVER|GOLD, yearType: LUNAR|SOLAR, metalDeductionPercent }
   * Values may be strings, numbers or exact BigInt decimals.
   */
  function calculate(input, prices, settings) {
    input = input || {}; settings = settings || {};
    var method = RULES.methods[settings.method] || RULES.methods[RULES.defaultMethod];
    var amounts = input.amounts || {};
    function amount(f) { return D.clamp(D.of(amounts[f]), LIMITS.amount); }
    function grams(metal, k) { return D.clamp(D.of((input[metal === 'GOLD' ? 'gold' : 'silver'] || {})[k]), LIMITS.grams); }
    function worn(metal) { return D.clamp(D.of(metal === 'GOLD' ? input.wornGold : input.wornSilver), LIMITS.grams); }

    var cutPercent = D.clamp(D.of(settings.metalDeductionPercent), LIMITS.percent);
    var keep = ONE - D.div(cutPercent, D.of(100));
    var lines = [];

    Object.keys(FIELDS).forEach(function (f) {
      var v = amount(f);
      if (D.pos(v) && FIELDS[f] !== 'LIABILITY') lines.push({ type: 'asset', field: f, amount: v });
    });

    var metalValue = {}, metalGrams = {};
    METALS.forEach(function (metal) {
      var gross = 0n, g = 0n;
      KARATS.forEach(function (k) {
        var w = grams(metal, k);
        if (!D.pos(w)) return;
        var p = price(prices, metal, k), value = D.mul(w, p);
        lines.push({ type: 'metal', metal: metal, karat: k, grams: w, pricePerGram: p, amount: value });
        gross += value; g += w;
      });
      var value = gross;
      if (D.pos(cutPercent) && D.pos(gross)) {
        var cut = gross - D.mul(gross, keep);
        lines.push({ type: 'resaleCut', metal: metal, percent: cutPercent, amount: cut });
        value -= cut;
      }
      var wornG = D.min(worn(metal), g);
      if (!method.jewelleryZakatable && D.pos(wornG) && D.pos(g)) {
        var exempt = D.div(D.mul(value, wornG), g);
        lines.push({ type: 'wornExempt', metal: metal, grams: wornG, amount: exempt });
        value -= exempt; g -= wornG;
      }
      metalValue[metal] = value; metalGrams[metal] = g;
    });

    Object.keys(FIELDS).forEach(function (f) {
      var v = amount(f);
      if (D.pos(v) && FIELDS[f] === 'LIABILITY') lines.push({ type: 'debt', field: f, amount: v, deducted: method.debtsReduceZakat });
    });

    var byCategory = { CASH: 0n, GOLD: 0n, SILVER: 0n, BUSINESS: 0n, INVESTMENT: 0n, LIABILITY: 0n };
    Object.keys(FIELDS).forEach(function (f) { byCategory[FIELDS[f]] += amount(f); });
    byCategory.GOLD = metalValue.GOLD; byCategory.SILVER = metalValue.SILVER;

    var otherAssets = byCategory.CASH + byCategory.BUSINESS + byCategory.INVESTMENT;
    var totalAssets = otherAssets + metalValue.GOLD + metalValue.SILVER;
    var liabilities = byCategory.LIABILITY;
    var net = D.max0(totalAssets - (method.debtsReduceZakat ? liabilities : 0n));

    var n = nisab(settings.nisabBasis || 'AUTO', prices, otherAssets, metalGrams.GOLD, metalValue.GOLD, metalGrams.SILVER, metalValue.SILVER);
    var rate = settings.yearType === 'SOLAR' ? RULES.solarRate : RULES.lunarRate;
    var isDue = D.pos(net) && D.pos(n.value) && net >= n.value;

    return {
      lines: lines,
      byCategory: byCategory,
      totalAssets: totalAssets,
      liabilities: liabilities,
      debtsDeducted: method.debtsReduceZakat,
      netWealth: net,
      nisabValue: n.value,
      nisabRule: n.rule,
      rate: rate,
      isDue: isDue,
      zakat: isDue ? D.mul(net, rate) : 0n,
      shortOfNisab: isDue ? 0n : D.max0(n.value - net),
      goldGrams: metalGrams.GOLD,
      silverGrams: metalGrams.SILVER,
    };
  }

  function goldNisabValue(prices) { return D.mul(RULES.goldNisabGrams, price(prices, 'GOLD', RULES.nisabKarat)); }
  function silverNisabValue(prices) { return D.mul(RULES.silverNisabGrams, price(prices, 'SILVER', RULES.nisabKarat)); }

  function nisab(basis, prices, otherAssets, goldGrams, goldValue, silverGrams, silverValue) {
    if (basis === 'SILVER') return { rule: 'SILVER', value: silverNisabValue(prices) };
    if (basis === 'GOLD') return { rule: 'GOLD', value: goldNisabValue(prices) };
    var onlyGold = D.pos(goldGrams) && !D.pos(silverGrams) && !D.pos(otherAssets);
    var onlySilver = D.pos(silverGrams) && !D.pos(goldGrams) && !D.pos(otherAssets);
    // Measured by the weight of the person's own metal, expressed in taka so debts can be netted off.
    if (onlyGold) return { rule: 'GOLD_ONLY', value: D.mul(RULES.goldNisabGrams, D.div(goldValue, goldGrams)) };
    if (onlySilver) return { rule: 'SILVER_ONLY', value: D.mul(RULES.silverNisabGrams, D.div(silverValue, silverGrams)) };
    return { rule: 'MIXED_SILVER', value: silverNisabValue(prices) };
  }

  var api = {
    D: D, RULES: RULES, LIMITS: LIMITS, KARATS: KARATS, METALS: METALS, FIELDS: FIELDS,
    BUNDLED_PRICES: BUNDLED_PRICES, toGrams: toGrams, calculate: calculate,
    goldNisabValue: goldNisabValue, silverNisabValue: silverNisabValue,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Zakat = api;
})(this);
