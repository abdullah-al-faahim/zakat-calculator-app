/*
 * The zakat calculator on the page. All maths is in zakat.js; this file only reads the form and
 * shows the result. Nothing typed here is stored or sent anywhere.
 */
(function () {
  'use strict';
  var Z = window.Zakat, D = Z.D;
  var doc = document.documentElement;
  var form = document.getElementById('calc-form');
  if (!Z || !form) return;

  function bn() { return doc.lang !== 'en'; }
  function t(b, e) { return bn() ? b : e; }
  var BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  function digits(s) { return bn() ? String(s).replace(/\d/g, function (c) { return BN_DIGITS[c]; }) : String(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function both(b, e) { return '<span class="bn">' + b + '</span><span class="en">' + e + '</span>'; }

  // Same labels and hints as the app (ui/Labels.kt).
  var FIELD_TEXT = {
    CASH_IN_HAND: ['হাতে থাকা নগদ টাকা', 'Cash in hand', 'ঘরে, মানিব্যাগে বা লকারে যা আছে', 'At home, in your wallet or locker'],
    BANK: ['ব্যাংকে জমা', 'Bank balance', 'সেভিংস ও কারেন্ট অ্যাকাউন্টের ব্যালান্স', 'Savings and current accounts'],
    MOBILE_BANKING: ['বিকাশ / নগদ / রকেট', 'bKash / Nagad / Rocket', 'মোবাইল ওয়ালেটের ব্যালান্স', 'Mobile wallet balance'],
    FOREIGN_CURRENCY: ['বিদেশি মুদ্রা (টাকায়)', 'Foreign currency (in taka)', 'আজকের রেটে টাকায় রূপান্তর করে লিখুন', "Converted at today's rate"],
    SAVINGS_SCHEMES: ['এফডিআর / ডিপিএস / সঞ্চয়পত্র', 'FDR / DPS / savings certificates', 'শুধু জমা দেওয়া আসল টাকা, সুদ বাদে', 'Principal only, excluding interest'],
    LOANS_GIVEN: ['ধার দেওয়া টাকা', 'Money you lent', 'যা ফেরত পাওয়ার আশা আছে', 'That you expect to get back'],
    PROVIDENT_FUND: ['প্রভিডেন্ট ফান্ড (ঐচ্ছিক অংশ)', 'Provident fund (voluntary part)', 'বাধ্যতামূলক অংশ হাতে না পাওয়া পর্যন্ত ধরবেন না', 'Leave out the compulsory part until received'],
    OTHER_CASH: ['অন্যান্য নগদ সম্পদ', 'Other cash', 'কমিটি/সমিতির জমা, অগ্রিম ইত্যাদি', 'Savings group deposits, advances, etc.'],
    INVENTORY: ['বিক্রির জন্য রাখা মাল', 'Stock for sale', 'আজকের বাজারদরে দোকান ও গুদামের মাল', "Shop and warehouse stock at today's price"],
    BUSINESS_CASH: ['ব্যবসার নগদ ও ব্যাংক', 'Business cash & bank', 'ওপরে আগে না লিখে থাকলে', 'If not already entered above'],
    BUSINESS_RECEIVABLE: ['ক্রেতাদের কাছে পাওনা (বাকি)', 'Owed by customers', 'যা আদায় হওয়ার আশা আছে', 'That you expect to collect'],
    SHARES: ['শেয়ার ও মিউচুয়াল ফান্ড', 'Shares & mutual funds', 'আজকের বাজারমূল্য', "Today's market value"],
    PROPERTY_FOR_SALE: ['বিক্রির জন্য কেনা জমি/ফ্ল্যাট', 'Land/flat bought to resell', 'শুধু লাভে বিক্রির নিয়তে কেনা হলে; বর্তমান বাজারমূল্য', 'Only if bought to sell for profit; current value'],
    OTHER_INVESTMENT: ['অন্যান্য বিনিয়োগ', 'Other investments', 'ব্যবসায় অংশীদারির অংশ, ক্রিপ্টো ইত্যাদি', 'Partnership share, crypto, etc.'],
    DEBTS_DUE: ['এখন বা এ বছরে শোধ করতে হবে এমন ঋণ', 'Debts due now or this year'],
    BILLS_DUE: ['বকেয়া বিল, ভাড়া, বেতন', 'Unpaid bills, rent, wages'],
    INSTALLMENTS_12M: ['দীর্ঘমেয়াদি লোনের আগামী ১২ মাসের কিস্তি', 'Next 12 months of long-term loan instalments', 'হোম লোন, গাড়ির লোন ইত্যাদি', 'Home loan, car loan, etc.'],
    BUSINESS_PAYABLE: ['ব্যবসার দেনা', 'Business payables', 'সাপ্লায়ার/মহাজনের পাওনা', 'Owed to suppliers'],
  };
  var KARAT_TEXT = { K22: ['২২ ক্যারেট', '22 karat'], K21: ['২১ ক্যারেট', '21 karat'], K18: ['১৮ ক্যারেট', '18 karat'], TRADITIONAL: ['সনাতন', 'Traditional'] };
  var METAL_TEXT = { GOLD: ['সোনা', 'Gold', '#C9A84C'], SILVER: ['রূপা', 'Silver', '#A9B4BC'] };
  var CATEGORY_TEXT = {
    CASH: ['নগদ, ব্যাংক ও সঞ্চয়', 'Cash, bank & savings'], GOLD: ['সোনা', 'Gold'], SILVER: ['রূপা', 'Silver'],
    BUSINESS: ['ব্যবসার সম্পদ', 'Business assets'], INVESTMENT: ['শেয়ার ও বিনিয়োগ', 'Shares & investments'],
  };
  var METHOD_TEXT = {
    HANAFI: ['হানাফি', 'Hanafi', 'হানাফি মতে নিয়মিত ব্যবহারের গহনাতেও যাকাত দিতে হয়, আর পরিশোধযোগ্য ঋণ বাদ যায়।', 'Under the Hanafi view, jewellery you wear is zakatable too, and debts you owe are deducted.'],
    SHAFII: ['শাফেয়ি', "Shafi'i", 'শাফেয়ি মতে নিয়মিত ব্যবহারের বৈধ গহনায় যাকাত নেই, আর ঋণ যাকাত কমায় না।', "Under the Shafi'i view, permissible jewellery you wear is exempt, and debts do not reduce zakat."],
    MALIKI: ['মালেকি', 'Maliki', 'মালেকি মতে নিয়মিত ব্যবহারের বৈধ গহনায় যাকাত নেই, আর ঋণ বাদ যায়।', 'Under the Maliki view, permissible jewellery you wear is exempt, and debts are deducted.'],
    HANBALI: ['হাম্বলি', 'Hanbali', 'হাম্বলি মতে নিয়মিত ব্যবহারের বৈধ গহনায় যাকাত নেই, আর ঋণ বাদ যায়।', 'Under the Hanbali view, permissible jewellery you wear is exempt, and debts are deducted.'],
  };
  var MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ── State (in memory only) ──
  var unit = 'vori';
  var state = { amounts: {}, metal: { GOLD: {}, SILVER: {} }, worn: { GOLD: '', SILVER: '' }, prices: null,
    settings: { method: 'HANAFI', nisabBasis: 'AUTO', yearType: 'LUNAR', metalDeductionPercent: '' } };
  function freshPrices() {
    var p = { GOLD: {}, SILVER: {} };
    Z.KARATS.forEach(function (k) { p.GOLD[k] = Z.BUNDLED_PRICES.GOLD[k]; p.SILVER[k] = Z.BUNDLED_PRICES.SILVER[k]; });
    return p;
  }
  state.prices = freshPrices();

  // ── Input parsing: accepts Bangla digits and thousands separators, like the app's Validation.kt ──
  function normalise(raw) {
    return String(raw || '').replace(/[০-৯]/g, function (c) { return String(BN_DIGITS.indexOf(c)); })
      .replace(/[,\s٬]/g, '').replace(/[٫]/g, '.');
  }
  function parse(raw) {
    var s = normalise(raw);
    if (s === '') return { ok: true, value: '' };
    if (s.length > 16 || !/^(\d+(\.\d{0,4})?|\.\d{1,4})$/.test(s)) return { ok: false, value: '' };
    return { ok: true, value: s };
  }
  function bindInput(input, onValue) {
    input.addEventListener('input', function () {
      var r = parse(input.value);
      input.setAttribute('aria-invalid', String(!r.ok));
      onValue(r.value);
      update();
    });
  }

  // ── Building the form ──
  function moneyField(f) {
    var tx = FIELD_TEXT[f];
    var label = el('label', 'field');
    label.appendChild(el('span', 'lbl', both(tx[0], tx[1])));
    if (tx[2]) label.appendChild(el('span', 'hint', both(tx[2], tx[3])));
    var wrap = el('span', 'taka');
    var input = el('input');
    input.type = 'text'; input.inputMode = 'decimal'; input.placeholder = '0'; input.dataset.field = f;
    wrap.appendChild(input); label.appendChild(wrap);
    bindInput(input, function (v) { state.amounts[f] = v; });
    return label;
  }
  Object.keys(Z.FIELDS).forEach(function (f) {
    var box = form.querySelector('[data-fields="' + Z.FIELDS[f] + '"]');
    if (box) box.appendChild(moneyField(f));
  });

  function gramsOf(metal, k) {
    var m = state.metal[metal][k] || {};
    return unit === 'gram' ? D.of(m.gram || '') : Z.toGrams(m.vori || '0', m.ana || '0', m.roti || '0');
  }
  function weightInput(metal, k, part, suffix) {
    var lab = el('label');
    var input = el('input');
    input.type = 'text'; input.inputMode = 'decimal'; input.placeholder = '0';
    input.value = (state.metal[metal][k] || {})[part] || '';
    input.setAttribute('aria-label', METAL_TEXT[metal][1] + ' ' + KARAT_TEXT[k][1] + ' ' + part);
    lab.appendChild(input); lab.appendChild(el('span', null, suffix));
    bindInput(input, function (v) { (state.metal[metal][k] = state.metal[metal][k] || {})[part] = v; });
    return lab;
  }
  function renderMetals() {
    Z.METALS.forEach(function (metal) {
      var box = form.querySelector('[data-metal="' + metal + '"]');
      box.innerHTML = '';
      var block = el('div', 'metal-block');
      block.appendChild(el('h4', null, '<i style="background:' + METAL_TEXT[metal][2] + '"></i>' + both(METAL_TEXT[metal][0], METAL_TEXT[metal][1])));
      Z.KARATS.forEach(function (k) {
        var row = el('div', 'wt-row');
        var p = state.prices[metal][k];
        row.appendChild(el('div', 'k', both(KARAT_TEXT[k][0], KARAT_TEXT[k][1]) + '<small data-pp="' + metal + k + '"></small>'));
        var wt = el('div', unit === 'gram' ? 'wt g' : 'wt');
        if (unit === 'gram') wt.appendChild(weightInput(metal, k, 'gram', t('গ্রাম', 'g')));
        else {
          wt.appendChild(weightInput(metal, k, 'vori', t('ভরি', 'vori')));
          wt.appendChild(weightInput(metal, k, 'ana', t('আনা', 'ana')));
          wt.appendChild(weightInput(metal, k, 'roti', t('রতি', 'roti')));
        }
        row.appendChild(wt);
        block.appendChild(row);
      });
      box.appendChild(block);
    });
  }
  // Switching units keeps the same weight.
  function convertUnits(to) {
    var perVori = Z.RULES.gramsPerVori, perAna = D.div(perVori, D.of(16)), perRoti = D.div(perAna, D.of(6));
    Z.METALS.forEach(function (metal) {
      Z.KARATS.forEach(function (k) {
        var m = state.metal[metal][k];
        if (!m) return;
        if (to === 'gram') {
          var g = Z.toGrams(m.vori || '0', m.ana || '0', m.roti || '0');
          state.metal[metal][k] = { gram: D.pos(g) ? D.toString(g, 4) : '' };
        } else {
          var rest = D.of(m.gram || '');
          var v = D.of(D.toString(D.div(rest, perVori)).split('.')[0]); rest = rest - D.mul(v, perVori);
          var a = D.of(D.toString(D.div(rest, perAna)).split('.')[0]); rest = rest - D.mul(a, perAna);
          var r = D.div(rest, perRoti);
          state.metal[metal][k] = {
            vori: D.pos(v) ? D.toString(v) : '', ana: D.pos(a) ? D.toString(a) : '',
            roti: D.pos(D.round(D.mul(r, D.of(100)))) ? D.toString(r, 2) : '',
          };
        }
      });
    });
  }
  form.querySelectorAll('[data-unit]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.unit === unit) return;
      convertUnits(b.dataset.unit);
      unit = b.dataset.unit;
      form.querySelectorAll('[data-unit]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderMetals(); update();
    });
  });

  // Worn jewellery: only asked for under methods that exempt it.
  var wornBox = form.querySelector('[data-worn]');
  Z.METALS.forEach(function (metal) {
    var label = el('label', 'field');
    label.appendChild(el('span', 'lbl', both('এর মধ্যে নিয়মিত পরার ' + METAL_TEXT[metal][0] + 'র গহনা (গ্রাম)', 'Of this, ' + METAL_TEXT[metal][1].toLowerCase() + ' jewellery you wear (grams)')));
    label.appendChild(el('span', 'hint', both('এই মতে এটুকুর যাকাত লাগে না', 'Exempt under this school')));
    var input = el('input'); input.type = 'text'; input.inputMode = 'decimal'; input.placeholder = '0';
    label.appendChild(input);
    bindInput(input, function (v) { state.worn[metal] = v; });
    wornBox.appendChild(label);
  });

  // Prices
  var priceGrid = form.querySelector('[data-prices]');
  var priceInputs = {};
  function renderPriceGrid() {
    priceGrid.innerHTML = '';
    priceGrid.appendChild(el('span', 'h', ''));
    priceGrid.appendChild(el('span', 'h', both('সোনা', 'Gold')));
    priceGrid.appendChild(el('span', 'h', both('রূপা', 'Silver')));
    Z.KARATS.forEach(function (k) {
      priceGrid.appendChild(el('span', null, both(KARAT_TEXT[k][0], KARAT_TEXT[k][1])));
      Z.METALS.forEach(function (metal) {
        var input = el('input'); input.type = 'text'; input.inputMode = 'decimal';
        input.value = state.prices[metal][k];
        input.setAttribute('aria-label', METAL_TEXT[metal][1] + ' ' + KARAT_TEXT[k][1] + ' price per gram');
        bindInput(input, function (v) { state.prices[metal][k] = v; });
        priceInputs[metal + k] = input;
        priceGrid.appendChild(input);
      });
    });
  }
  renderPriceGrid();
  form.querySelector('[data-reset-prices]').addEventListener('click', function () { state.prices = freshPrices(); renderPriceGrid(); update(); });

  // Settings
  form.querySelectorAll('[data-setting]').forEach(function (input) {
    var key = input.dataset.setting;
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', function () { state.settings[key] = input.value; update(); });
    } else {
      bindInput(input, function (v) { state.settings[key] = v; });
    }
  });

  document.querySelector('[data-reset]').addEventListener('click', function () {
    state.amounts = {}; state.metal = { GOLD: {}, SILVER: {} }; state.worn = { GOLD: '', SILVER: '' };
    state.settings.metalDeductionPercent = '';
    form.querySelectorAll('input').forEach(function (i) { if (!priceGrid.contains(i)) { i.value = ''; i.removeAttribute('aria-invalid'); } });
    renderMetals(); update();
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Output ──
  function group(intStr) { // Indian grouping: 12,34,567
    var last3 = intStr.slice(-3), rest = intStr.slice(0, -3);
    return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last3;
  }
  function taka(dec) {
    var s = D.toString(D.round(dec)), neg = s[0] === '-';
    return (neg ? '−' : '') + '৳' + digits(group(neg ? s.slice(1) : s));
  }
  function num(dec, places) { return digits(D.toString(dec, places)); }
  function pct(rate) { return digits(D.toString(D.mul(rate, D.of(100)), 3)) + '%'; }
  function approxWords(dec) {
    var n = Number(D.toString(D.round(dec)));
    function f(x) { return digits(x >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString()); }
    if (n >= 1e7) return t('প্রায় ' + f(n / 1e7) + ' কোটি টাকা', 'about ' + f(n / 1e7) + ' crore taka');
    if (n >= 1e5) return t('প্রায় ' + f(n / 1e5) + ' লাখ টাকা', 'about ' + f(n / 1e5) + ' lakh taka');
    if (n >= 1e3) return t('প্রায় ' + f(n / 1e3) + ' হাজার টাকা', 'about ' + f(n / 1e3) + ' thousand taka');
    return '';
  }
  function dateText(iso, lang) {
    var p = iso.split('-'), toBn = function (s) { return String(s).replace(/\d/g, function (c) { return BN_DIGITS[c]; }); };
    return lang === 'bn' ? toBn(Number(p[2])) + ' ' + MONTHS_BN[Number(p[1]) - 1] + ' ' + toBn(p[0]) : Number(p[2]) + ' ' + MONTHS_EN[Number(p[1]) - 1] + ' ' + p[0];
  }

  var $ = function (s) { return document.querySelector(s); };
  var card = $('[data-res-card]'), stateEl = $('[data-res-state]'), amountEl = $('[data-res-amount]'), subEl = $('[data-res-sub]');
  var breakdown = $('[data-breakdown]'), rows = $('[data-rows]'), why = $('[data-why]');
  var mini = $('[data-mini]'), miniLabel = $('[data-mini-label]'), miniAmount = $('[data-mini-amount]');
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';

  function input() {
    var gold = {}, silver = {};
    Z.KARATS.forEach(function (k) { gold[k] = gramsOf('GOLD', k); silver[k] = gramsOf('SILVER', k); });
    return { amounts: state.amounts, gold: gold, silver: silver, wornGold: state.worn.GOLD, wornSilver: state.worn.SILVER };
  }
  function hasAnything(inp) {
    return Object.keys(inp.amounts).some(function (f) { return D.pos(D.of(inp.amounts[f])); }) ||
      Z.KARATS.some(function (k) { return D.pos(inp.gold[k]) || D.pos(inp.silver[k]); });
  }
  function row(label, value, cls) {
    var dt = el('dt', cls || '', label), dd = el('dd', cls || '', value);
    rows.appendChild(dt); rows.appendChild(dd);
  }
  function nisabWhy(r, method) {
    var n = taka(r.nisabValue);
    switch (r.nisabRule) {
      case 'GOLD_ONLY': return t('আপনার শুধু সোনা আছে, তাই আপনার সোনার দামে ৭.৫ ভরি (৮৭.৪৮ গ্রাম) সোনাকে নিসাব ধরা হয়েছে: ' + n + '।', 'You own only gold, so the nisab is 7.5 vori (87.48 g) of gold at your gold\'s rate: ' + n + '.');
      case 'SILVER_ONLY': return t('আপনার শুধু রূপা আছে, তাই আপনার রূপার দামে ৫২.৫ ভরি (৬১২.৩৬ গ্রাম) রূপাকে নিসাব ধরা হয়েছে: ' + n + '।', 'You own only silver, so the nisab is 52.5 vori (612.36 g) of silver at your silver\'s rate: ' + n + '.');
      case 'MIXED_SILVER': return t('আপনার নগদ টাকা বা একাধিক ধরনের সম্পদ আছে, তাই ২২ ক্যারেট রূপার দামে ৫২.৫ ভরি রূপাকে নিসাব ধরা হয়েছে: ' + n + '। এতে গরিবের হক বেশি রক্ষা হয়।', 'You have cash or more than one kind of asset, so the nisab is the value of 52.5 vori of 22K silver: ' + n + '. This is the safer measure for the poor.');
      case 'SILVER': return t('আপনি রূপার নিসাব বেছে নিয়েছেন: ৫২.৫ ভরি রূপা = ' + n + '।', 'You chose the silver nisab: 52.5 vori of silver = ' + n + '.');
      default: return t('আপনি সোনার নিসাব বেছে নিয়েছেন: ৭.৫ ভরি সোনা = ' + n + '।', 'You chose the gold nisab: 7.5 vori of gold = ' + n + '.');
    }
  }

  var lastResult = null, lastHas = false;
  function update() {
    var method = state.settings.method;
    wornBox.hidden = Z.RULES.methods[method].jewelleryZakatable;
    $('[data-method-note]').textContent = t(METHOD_TEXT[method][2], METHOD_TEXT[method][3]);

    var inp = input();
    var r = Z.calculate(inp, state.prices, state.settings);
    var has = hasAnything(inp);
    lastResult = r; lastHas = has;

    // Group totals in the summaries
    var sums = {
      CASH: r.byCategory.CASH, METALS: r.byCategory.GOLD + r.byCategory.SILVER,
      BUSINESS_INVESTMENT: r.byCategory.BUSINESS + r.byCategory.INVESTMENT, LIABILITY: r.liabilities,
    };
    Object.keys(sums).forEach(function (k) {
      var e = form.querySelector('[data-sum="' + k + '"]');
      e.textContent = D.pos(sums[k]) ? (k === 'LIABILITY' ? '−' : '') + taka(sums[k]) : '';
    });
    form.querySelector('[data-sum="SETTINGS"]').textContent = t(METHOD_TEXT[method][0], METHOD_TEXT[method][1]);
    Z.METALS.forEach(function (metal) {
      Z.KARATS.forEach(function (k) {
        var e = form.querySelector('[data-pp="' + metal + k + '"]');
        if (e) e.textContent = taka(D.of(state.prices[metal][k] || '0')) + t('/গ্রাম', '/g');
      });
    });

    // Headline
    card.classList.toggle('empty', !has);
    card.classList.toggle('not-due', has && !r.isDue);
    if (!has) {
      stateEl.innerHTML = t('আপনার সম্পদ লিখুন', 'Enter what you own');
      amountEl.textContent = '';
      subEl.textContent = t('লিখতে থাকলেই ফলাফল এখানে দেখাবে। আজকের রূপার নিসাব: ', 'The result appears here as you type. Silver nisab: ') + taka(Z.silverNisabValue(state.prices));
    } else if (r.isDue) {
      stateEl.innerHTML = CHECK + t('আপনার ওপর যাকাত ফরজ হয়েছে', 'Zakat is due on your wealth');
      amountEl.textContent = taka(r.zakat);
      var words = approxWords(r.zakat);
      subEl.textContent = (words ? words + ' · ' : '') + t('নিট সম্পদের ' + pct(r.rate) + ' হারে', pct(r.rate) + ' of your net wealth');
    } else {
      stateEl.innerHTML = t('এখন আপনার ওপর যাকাত ফরজ নয়', 'Zakat is not due yet');
      amountEl.textContent = '';
      subEl.textContent = t('নিসাব পূর্ণ হতে আরও ' + taka(r.shortOfNisab) + ' লাগবে। তবে চাইলে নফল দান করতে পারেন।', 'You are ' + taka(r.shortOfNisab) + ' below nisab. You can still give voluntary charity.');
    }

    // Breakdown
    breakdown.hidden = !has;
    rows.innerHTML = '';
    if (has) {
      ['CASH', 'GOLD', 'SILVER', 'BUSINESS', 'INVESTMENT'].forEach(function (c) {
        if (D.pos(r.byCategory[c])) row(t(CATEGORY_TEXT[c][0], CATEGORY_TEXT[c][1]), taka(r.byCategory[c]));
      });
      r.lines.forEach(function (l) {
        var m = t(METAL_TEXT[l.metal] ? METAL_TEXT[l.metal][0] : '', METAL_TEXT[l.metal] ? METAL_TEXT[l.metal][1].toLowerCase() : '');
        if (l.type === 'resaleCut') row(t('↳ ' + m + 'য় ' + num(l.percent, 2) + '% বিক্রয়-কাটতি বাদ', '↳ ' + num(l.percent, 2) + '% buy-back cut on ' + m), '−' + taka(l.amount).replace('−', ''), 'muted-row');
        if (l.type === 'wornExempt') row(t('↳ ব্যবহারের ' + m + 'র গহনা ' + num(l.grams, 3) + ' গ্রাম বাদ', '↳ ' + num(l.grams, 3) + ' g of worn ' + m + ' jewellery exempt'), '−' + taka(l.amount), 'muted-row');
      });
      row(t('মোট যাকাতযোগ্য সম্পদ', 'Total zakatable assets'), taka(r.totalAssets), 'strong');
      if (D.pos(r.liabilities)) {
        if (r.debtsDeducted) row(t('বাদ: ঋণ ও দেনা', 'Less: debts & dues'), '−' + taka(r.liabilities), 'minus');
        else row(t('ঋণ ও দেনা (এই মতে বাদ যায় না)', 'Debts (not deducted under this school)'), taka(r.liabilities), 'muted-row');
      }
      row(t('নিট সম্পদ', 'Net wealth'), taka(r.netWealth), 'strong');
      row(t('নিসাব', 'Nisab'), taka(r.nisabValue));
      row(t('যাকাতের হার', 'Rate'), pct(r.rate));
      row(t('প্রদেয় যাকাত', 'Zakat to pay'), taka(r.zakat), 'total');
      why.textContent = nisabWhy(r, method);
    }

    // Phone-width summary bar while the result card is off screen
    miniLabel.textContent = r.isDue ? t('আপনার যাকাত', 'Your zakat') : t('যাকাত ফরজ নয়', 'Zakat not due');
    miniAmount.textContent = r.isDue ? taka(r.zakat) : '';
    paintMini();
  }

  var resultVisible = false, sectionVisible = false;
  function paintMini() { mini.hidden = !(lastHas && sectionVisible && !resultVisible); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { resultVisible = es[0].isIntersecting; paintMini(); }, { threshold: 0.15 })
      .observe(document.getElementById('calc-result-top'));
    new IntersectionObserver(function (es) { sectionVisible = es[0].isIntersecting; paintMini(); })
      .observe(form);
  }

  function relabel() {
    form.querySelectorAll('option[data-bn]').forEach(function (o) { o.textContent = bn() ? o.dataset.bn : o.dataset.en; });
    renderMetals(); update();
  }
  document.addEventListener('zc-lang', relabel);
  var pd = document.querySelector('[data-price-date]'), pde = document.querySelector('[data-price-date-en]');
  if (pd) pd.textContent = dateText(Z.BUNDLED_PRICES.date, 'bn');
  if (pde) pde.textContent = dateText(Z.BUNDLED_PRICES.date, 'en');
  relabel();
})();
