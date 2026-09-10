#!/usr/bin/env node
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var ROOT = path.join(__dirname, '..');

function loadEngine(state) {
  var sandbox = {
    window: { STATE: state || null },
    document: {
      getElementById: function () { return null; },
      querySelector: function () { return null; }
    },
    navigator: { onLine: true }
  };
  sandbox.global = sandbox;
  var src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  vm.runInNewContext(src, sandbox, { filename: 'engine.js' });
  return sandbox.window.kopeykaEngine;
}

var sandbox = {
  window: { STATE: null },
  document: {
    getElementById: function () { return null; },
    querySelector: function () { return null; }
  },
  navigator: { onLine: true }
};
sandbox.window = sandbox.window;
sandbox.global = sandbox;
var src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
vm.runInNewContext(src, sandbox, { filename: 'engine.js' });
assert(sandbox.window.kopeykaEngine, 'engine not exported');

sandbox.window.STATE = {
  settings: { openingBalance: 10000, month: '2026-09', paydayDay: 15, limitHorizon: 'month' },
  income: [
    { id: 'i1', amount: 2000, date: '2026-09-01' },
    { id: 'i2', amount: 5000, date: '2026-09-02', deleted: true }
  ],
  expenses: [
    { id: 'e1', amount: 1000, date: '2026-09-03', category: 'Продукты' },
    { id: 'e2', amount: 800, date: '2026-09-03', category: 'Прочее', deleted: true }
  ],
  reserves: [
    { id: 'r1', saved: 3000, target: 5000 },
    { id: 'r2', saved: 9999, target: 9999, deleted: true }
  ],
  debts: [
    { id: 'd1', total: 4000, paid: 1000 },
    { id: 'd2', total: 9999, paid: 0, deferUntil: '2026-12-01' },
    { id: 'd3', total: 7777, paid: 0, deleted: true }
  ],
  reserveOps: [
    { id: 'o1', amount: 500, type: 'deposit', date: '2026-09-04' },
    { id: 'o2', amount: 400, type: 'deposit', date: '2026-09-04', deleted: true }
  ],
  obligations: [
    { id: 'ob1', amount: 2000, day: 10, active: true },
    { id: 'ob2', amount: 8000, day: 12, active: true, deleted: true }
  ],
  obligationPays: [
    { id: 'p1', obligId: 'ob1', month: '2026-09', amount: 500 },
    { id: 'p2', obligId: 'ob1', month: '2026-09', amount: 200, deleted: true }
  ],
  shiftsOverride: {}
};

var c = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(c.income, 2000, 'deleted income must be ignored');
assert.strictEqual(c.expenses, 1000, 'deleted expense must be ignored');
assert.strictEqual(c.reserveDeposits, 500, 'deleted reserve op must be ignored');
assert.strictEqual(c.openingBalance, 10000);
assert.strictEqual(c.cash, 10000 + 2000 - 1000 - 500, 'cash formula');
assert.strictEqual(c.debtRemaining, 3000, 'deferred and deleted debts must be ignored');
assert.strictEqual(c.reservesTotal, 3000, 'deleted reserve must be ignored');
assert.strictEqual(c.obligationsRemaining, 1500, 'deleted obligation/pay must be ignored');
assert.strictEqual(c.available, c.cash - 3000 - 1500);
assert.ok(c.dailyBudget === c.daily, 'daily aliases');

var oct = sandbox.window.kopeykaEngine.month('2026-10');
assert.strictEqual(oct.openingBalance, c.cash, 'next month opening is previous cash');
assert.strictEqual(oct.cash, c.cash, 'empty next month cash equals carried opening');

var aug = sandbox.window.kopeykaEngine.month('2026-08');
assert.strictEqual(aug.cash, 10000, 'previous empty month rolls back from anchor');

assert.ok(sandbox.window.kopeykaEngine.categories.indexOf('Транспорт') >= 0, 'transport category present');

// Closing a reserve: keep historical ops, add withdraw of remaining saved, mark reserve deleted.
sandbox.window.STATE.reserves = [
  { id: 'r1', saved: 0, target: 5000, deleted: true }
];
sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' },
  { id: 'ow', amount: 3000, type: 'withdraw', date: '2026-09-04' }
];
sandbox.window.STATE.income = [];
sandbox.window.STATE.expenses = [];
sandbox.window.STATE.debts = [];
sandbox.window.STATE.obligations = [];
sandbox.window.STATE.obligationPays = [];
var closed = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(closed.cash, 10000, 'closing reserve returns cash');
assert.strictEqual(closed.reservesTotal, 0, 'deleted reserve not in total');

// Hard-delete of reserveOps (old bug) would inflate cash — ops must stay.
sandbox.window.STATE.reserveOps = [];
var stripped = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(stripped.cash, 10000, 'no ops → cash equals opening');

sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' }
];
sandbox.window.STATE.reserves = [{ id: 'r1', saved: 3000, target: 5000 }];
var openRes = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(openRes.cash, 7000, 'deposit reduces cash');
assert.strictEqual(openRes.reservesTotal, 3000, 'saved counts');

// Soft-deleted deposit still counted if we accidentally drop the row from the array — keep the op.
sandbox.window.STATE.reserveOps = [
  { id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' },
  { id: 'ow', amount: 3000, type: 'withdraw', date: '2026-09-10' }
];
sandbox.window.STATE.reserves = [{ id: 'r1', saved: 0, target: 5000, deleted: true }];
var closed2 = sandbox.window.kopeykaEngine.month('2026-09');
assert.strictEqual(closed2.cash, 10000, 'withdraw offsets deposit after reserve close');

// Syntax check critical modules
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js', 'widget.html'].forEach(function (f) {
  var p = path.join(ROOT, f);
  assert.ok(fs.existsSync(p), f + ' exists');
});
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js'].forEach(function (f) {
  require('child_process').execFileSync(process.execPath, ['--check', path.join(ROOT, f)]);
});

var appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert.ok(appSrc.indexOf("softDeleteIn('reserves'") >= 0, 'reserve delete must be soft');
assert.ok(appSrc.indexOf("softDeleteIn('obligations'") >= 0, 'obligation delete must be soft');
assert.ok(appSrc.indexOf('cmpMonth(st,cur)>0') >= 0, 'ensureMonth must not fold when clock goes backward');
assert.ok(appSrc.indexOf('__FIN_LOAD_PENDING') >= 0, 'boot must flag decrypt-in-progress');
assert.ok(appSrc.indexOf("STATE.obligationPays=STATE.obligationPays.filter") < 0, 'obligation reset must not hard-delete pays');
assert.ok(appSrc.indexOf("STATE.expenses=STATE.expenses.filter(function(e){return !(e.obligId") < 0, 'obligation reset must not hard-delete expenses');
assert.ok(appSrc.indexOf("softDeleteIn('expenses',p.opId") >= 0, 'day-plan clear must soft-delete ops');

var cloudSrc = fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8');
assert.ok(cloudSrc.indexOf('localNotReady') >= 0, 'cloud must wait for local decrypt');
assert.ok(cloudSrc.indexOf('__FIN_DECRYPT_FAILED') >= 0, 'cloud must not apply over locked blob');
assert.ok(cloudSrc.indexOf("if(b&&(l===undefined||r===undefined))") < 0, 'cloud must not tombstone missing-without-tombstone rows');

var asstSrc = fs.readFileSync(path.join(ROOT, 'assistant-v2.js'), 'utf8');
assert.ok(asstSrc.indexOf("s.reserveOps=s.reserveOps.filter") < 0, 'assistant must not strip reserveOps');
assert.ok(asstSrc.indexOf('function softDel') >= 0, 'assistant must soft-delete');
assert.ok(asstSrc.indexOf("type:'withdraw'") >= 0, 'assistant reserve delete must return cash');

var storeSrc = fs.readFileSync(path.join(ROOT, 'secure-store.js'), 'utf8');
assert.ok(storeSrc.indexOf('existingPlain') >= 0 || storeSrc.indexOf('existingEnc') >= 0, 'must not overwrite ciphertext with plaintext');

var gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
assert.ok(/versionCode\s+160/.test(gradle), 'versionCode 160');
assert.ok(/versionName\s+"4\.11\.0"/.test(gradle), 'versionName 4.11.0');

var mainJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/MainActivity.java'), 'utf8');
assert.ok(mainJava.indexOf('empty sha256') >= 0, 'auto-update requires sha256');
assert.ok(mainJava.indexOf('if (expectedSha256 == null || expectedSha256.trim().isEmpty())') >= 0, 'install requires sha256');

// Cloud three-way merge: missing-without-tombstone must KEEP the present copy.
var cloudSandbox = {
  window: {
    defaultState: function () {
      return {
        version: 6,
        settings: { openingBalance: 0, month: '', dayRate: 0, nightRate: 0 },
        income: [], expenses: [], reserves: [], debts: [], reserveOps: [],
        obligations: [], obligationPays: [], shiftsOverride: {}, dayPlans: {}, voiceMap: {}
      };
    },
    addEventListener: function () {},
    STATE: null
  },
  document: {
    readyState: 'loading',
    addEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return { textContent: '', onload: null, onerror: null }; },
    head: { appendChild: function () {} },
    body: { appendChild: function () {} }
  },
  navigator: { onLine: true },
  localStorage: {
    _d: {},
    getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; }
  },
  console: console,
  setTimeout: setTimeout,
  setInterval: setInterval,
  clearTimeout: clearTimeout,
  clearInterval: clearInterval,
  Promise: Promise,
  Date: Date,
  Number: Number,
  Object: Object,
  Array: Array,
  JSON: JSON,
  Error: Error,
  Math: Math
};
cloudSandbox.window = Object.assign(cloudSandbox.window, { localStorage: cloudSandbox.localStorage });
cloudSandbox.global = cloudSandbox;
vm.runInNewContext(cloudSrc, cloudSandbox, { filename: 'cloud.js' });
assert(cloudSandbox.window.kopeykaCloud, 'cloud not exported');
assert.strictEqual(typeof cloudSandbox.window.kopeykaCloud.threeWay, 'function', 'threeWay exported');

var base = {
  settings: { openingBalance: 10000, month: '2026-09' },
  income: [], expenses: [], reserves: [{ id: 'r1', saved: 3000, target: 5000 }],
  debts: [], reserveOps: [{ id: 'o1', amount: 3000, type: 'deposit', date: '2026-09-04' }],
  obligations: [], obligationPays: []
};
var localKeep = JSON.parse(JSON.stringify(base));
var remoteMissingOps = JSON.parse(JSON.stringify(base));
remoteMissingOps.reserveOps = []; // stale cloud, no tombstone
var merged = cloudSandbox.window.kopeykaCloud.threeWay(base, localKeep, remoteMissingOps);
assert.strictEqual(merged.reserveOps.length, 1, 'stale cloud must not drop local reserveOps');
assert.strictEqual(merged.reserveOps[0].id, 'o1');

var localTomb = JSON.parse(JSON.stringify(base));
localTomb.reserveOps = [];
localTomb._deleted = { reserveOps: { o1: Date.now() } };
var remoteStill = JSON.parse(JSON.stringify(base));
var mergedDel = cloudSandbox.window.kopeykaCloud.threeWay(base, localTomb, remoteStill);
assert.ok(!(mergedDel.reserveOps || []).some(function (x) { return x && x.id === 'o1'; }), 'explicit tombstone still wins');

console.log('logic ok', JSON.stringify({
  cash: c.cash,
  available: c.available,
  daily: c.daily,
  debt: c.debtRemaining,
  octOpen: oct.openingBalance,
  closedCash: closed.cash,
  depositCash: openRes.cash,
  closed2: closed2.cash,
  mergeKeptOps: merged.reserveOps.length
}));
