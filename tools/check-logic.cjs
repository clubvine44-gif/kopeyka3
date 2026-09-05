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

console.log('logic ok', JSON.stringify({ cash: c.cash, available: c.available, daily: c.daily, debt: c.debtRemaining, octOpen: oct.openingBalance }));
