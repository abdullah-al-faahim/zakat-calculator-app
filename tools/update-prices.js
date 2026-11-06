// Fetches today's gold and silver rates from BAJUS and writes prices.json for the website.
// Same parsing and plausibility checks as the Android app (network/BajusPrices.kt).
// Run: node tools/update-prices.js            (fetch, validate, write prices.json if changed)
//      node tools/update-prices.js --check    (validate the existing prices.json only)
'use strict';
var fs = require('fs');
var path = require('path');

var PAGE_URL = 'https://www.bajus.org/gold-price';
var OUT = path.join(__dirname, '..', 'prices.json');
var KARATS = ['K22', 'K21', 'K18', 'TRADITIONAL'];
var GOLD_RANGE = [1000, 200000];
var SILVER_RANGE = [10, 5000];
var MAX_AGE_DAYS = 45;
var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function invalid(msg) { var e = new Error(msg); e.invalid = true; return e; }

/** "28-October-2026" or "6-Nov-2026" → "2026-11-06" */
function toIsoDate(s) {
  var m = /^(\d{1,2})-([A-Za-z]+)-(\d{4})$/.exec(s);
  if (!m) return null;
  var month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month < 0 || (m[2].length > 3 && !/^(january|february|march|april|may|june|july|august|september|october|november|december|sept)$/i.test(m[2]))) return null;
  var d = new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
  if (d.getUTCDate() !== Number(m[1])) return null;
  return d.toISOString().slice(0, 10);
}

/** Parses the BAJUS page; rows missing from the page keep the previous values. */
function parse(html, previous) {
  var rowRe = /<h6>\s*(22 KARAT|21 KARAT|18 KARAT|TRADITIONAL)\s+(Gold|Silver)\s*<\/h6>[\s\S]*?<span class="price">\s*([\d,.]+)\s*BDT\/GRAM/gi;
  var found = { GOLD: {}, SILVER: {} }, m;
  while ((m = rowRe.exec(html))) {
    var k = { '22 KARAT': 'K22', '21 KARAT': 'K21', '18 KARAT': 'K18' }[m[1].toUpperCase()] || 'TRADITIONAL';
    var metal = m[2].toUpperCase();
    var v = m[3].replace(/,/g, '');
    if (!/^\d+(\.\d+)?$/.test(v)) continue;
    if (!(k in found[metal])) found[metal][k] = v;
  }
  if (!found.GOLD.K22 || !found.SILVER.K22) throw invalid('22K rows missing');
  var dm = /\/([0-9]{1,2}-[A-Za-z]+-[0-9]{4})\.pdf/.exec(html);
  var date = dm && toIsoDate(dm[1]);
  if (!date) throw invalid('missing effective date');
  var out = { source: 'BAJUS', url: PAGE_URL, date: date, GOLD: {}, SILVER: {} };
  ['GOLD', 'SILVER'].forEach(function (metal) {
    KARATS.forEach(function (k) {
      var v = found[metal][k] || (previous && previous[metal] && previous[metal][k]);
      if (!v) throw invalid(metal + ' ' + k + ' missing');
      out[metal][k] = String(v);
    });
  });
  return out;
}

/** Throws for anything implausible: ranges, karat order, future or stale dates. */
function validate(p, today) {
  KARATS.forEach(function (k) {
    var g = Number(p.GOLD[k]), s = Number(p.SILVER[k]);
    if (!(g >= GOLD_RANGE[0] && g <= GOLD_RANGE[1])) throw invalid('gold ' + k + ' out of range');
    if (!(s >= SILVER_RANGE[0] && s <= SILVER_RANGE[1])) throw invalid('silver ' + k + ' out of range');
  });
  for (var i = 0; i < KARATS.length - 1; i++) {
    if (Number(p.GOLD[KARATS[i]]) < Number(p.GOLD[KARATS[i + 1]])) throw invalid('gold karat order');
    if (Number(p.SILVER[KARATS[i]]) < Number(p.SILVER[KARATS[i + 1]])) throw invalid('silver karat order');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw invalid('bad date');
  var days = (Date.parse(today) - Date.parse(p.date)) / 86400000;
  if (days < -1) throw invalid('date in the future');
  if (days > MAX_AGE_DAYS) throw invalid('rate too old');
  return p;
}

function todayInDhaka() {
  return new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
}

async function main() {
  var previous = null;
  try { previous = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}
  if (process.argv.includes('--check')) {
    validate(previous, todayInDhaka());
    console.log('prices.json OK (' + previous.date + ')');
    return;
  }
  var res = await fetch(PAGE_URL, { headers: { 'User-Agent': 'ZakatCalculator-PriceBot (+https://github.com/abdullah-al-faahim/zakat-calculator-app)' }, redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var html = await res.text();
  if (html.length > 2 * 1024 * 1024) throw new Error('page too large');
  var next = validate(parse(html, previous), todayInDhaka());
  var same = previous && previous.date === next.date &&
    JSON.stringify([previous.GOLD, previous.SILVER]) === JSON.stringify([next.GOLD, next.SILVER]);
  if (same) { console.log('unchanged (' + next.date + ')'); return; }
  next.checkedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
  console.log('updated to ' + next.date + ': 22K gold ' + next.GOLD.K22 + ', 22K silver ' + next.SILVER.K22);
}

module.exports = { parse: parse, validate: validate, toIsoDate: toIsoDate };
if (require.main === module) {
  main().catch(function (e) { console.error((e.invalid ? 'rejected: ' : 'error: ') + e.message); process.exit(1); });
}
