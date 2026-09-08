#!/usr/bin/env node
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

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
var src = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
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

// Syntax check critical modules
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'widget.html'].forEach(function (f) {
  var p = path.join(__dirname, '..', f);
  assert.ok(fs.existsSync(p), f + ' exists');
});
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js'].forEach(function (f) {
  require('child_process').execFileSync(process.execPath, ['--check', path.join(__dirname, '..', f)]);
});

var appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.ok(appSrc.indexOf("softDeleteIn('reserves'") >= 0, 'reserve delete must be soft');
assert.ok(appSrc.indexOf("softDeleteIn('obligations'") >= 0, 'obligation delete must be soft');
assert.ok(appSrc.indexOf('cmpMonth(st,cur)>0') >= 0, 'ensureMonth must not fold when clock goes backward');
assert.ok(appSrc.indexOf('__FIN_LOAD_PENDING') >= 0, 'boot must flag decrypt-in-progress');

var cloudSrc = fs.readFileSync(path.join(__dirname, '..', 'cloud.js'), 'utf8');
assert.ok(cloudSrc.indexOf('localNotReady') >= 0, 'cloud must wait for local decrypt');
assert.ok(cloudSrc.indexOf('__FIN_DECRYPT_FAILED') >= 0, 'cloud must not apply over locked blob');

console.log('logic ok', JSON.stringify({
  cash: c.cash,
  available: c.available,
  daily: c.daily,
  debt: c.debtRemaining,
  octOpen: oct.openingBalance,
  closedCash: closed.cash,
  depositCash: openRes.cash
}));
