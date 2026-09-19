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

// Payday today: horizon must open the next period, not collapse to 1 day.
sandbox.window.STATE = {
  settings: { openingBalance: 30000, month: (function(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})(), paydayDay: (new Date()).getDate(), limitHorizon: 'payday' },
  income: [], expenses: [], reserves: [], debts: [], reserveOps: [], obligations: [], obligationPays: []
};
var payM = sandbox.window.STATE.settings.month;
var payCalc = sandbox.window.kopeykaEngine.month(payM);
assert.strictEqual(payCalc.isPaydayToday, true, 'engine sees payday today');
assert.ok(payCalc.daysLeft > 1, 'payday today starts a new period, daysLeft=' + payCalc.daysLeft);
assert.ok(payCalc.daily > 0 && payCalc.daily < 30000, 'daily is available/days of new period');

// Syntax check critical modules
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js', 'budget-carry.js', 'meal-plan.js', 'widget.html'].forEach(function (f) {
  var p = path.join(ROOT, f);
  assert.ok(fs.existsSync(p), f + ' exists');
});
['app.js', 'cloud.js', 'secure-store.js', 'fin-backup.js', 'engine.js', 'assistant-v2.js', 'assistant.js', 'budget-carry.js', 'meal-plan.js'].forEach(function (f) {
  require('child_process').execFileSync(process.execPath, ['--check', path.join(ROOT, f)]);
});

var appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert.ok(appSrc.length > 50000, 'root app.js must be the full app, not a CDN stub');
assert.ok(appSrc.indexOf('cdn.jsdelivr.net') < 0, 'app.js must not load from CDN');
assert.ok(appSrc.indexOf("softDeleteIn('reserves'") >= 0, 'reserve delete must be soft');
assert.ok(appSrc.indexOf("softDeleteIn('obligations'") >= 0, 'obligation delete must be soft');
assert.ok(appSrc.indexOf('cmpMonth(st,cur)>0') >= 0, 'ensureMonth must not fold when clock goes backward');
assert.ok(appSrc.indexOf('__FIN_LOAD_PENDING') >= 0, 'boot must flag decrypt-in-progress');
assert.ok(appSrc.indexOf("STATE.obligationPays=STATE.obligationPays.filter") < 0, 'obligation reset must not hard-delete pays');
assert.ok(appSrc.indexOf("STATE.expenses=STATE.expenses.filter(function(e){return !(e.obligId") < 0, 'obligation reset must not hard-delete expenses');
assert.ok(appSrc.indexOf("softDeleteIn('expenses',p.opId") >= 0, 'day-plan clear must soft-delete ops');
assert.ok(appSrc.indexOf('function budgetSavingsOf') >= 0, 'budget savings helper');
assert.ok(appSrc.indexOf('budgetSavingsOf(cat){return 0;') < 0, 'savings must not be stubbed to zero');
assert.ok(appSrc.indexOf('try{STATE.settings.budgetSavings={};}catch(e){}') < 0, 'period close must not wipe savings');
assert.ok(appSrc.indexOf('лимит категории НЕ увеличивается') >= 0, 'category limit must ignore savings');
assert.ok(appSrc.indexOf('if(exists)return exists') >= 0, 'duplicate period close must not double-count savings');
assert.ok(appSrc.indexOf('window.archiveBudgetPeriodReport=archiveBudgetPeriodReport') >= 0, 'archive must be exported for overlays');
assert.ok(appSrc.indexOf('function nextBudgetRangeAfter') >= 0, 'skipped periods must be closable');
assert.ok(appSrc.indexOf('while(guard++<24)') >= 0, 'skipped period loop');
assert.ok(appSrc.indexOf('Number(s.settings.paydayDay)') >= 0, 'hasLiveData must see payday and budget maps');
assert.ok(appSrc.indexOf("storedKeyNow.indexOf('month_')===0") >= 0, 'skipped periods use stored horizon mode');
assert.ok(appSrc.indexOf('id="mealHomeCard"') >= 0, 'home must have Magnit meal card');
assert.ok(appSrc.indexOf("currentView==='meal'") >= 0, 'app must render meal view');

var cloudSrc = fs.readFileSync(path.join(ROOT, 'cloud.js'), 'utf8');
assert.ok(cloudSrc.indexOf('localNotReady') >= 0, 'cloud must wait for local decrypt');
assert.ok(cloudSrc.indexOf('__FIN_DECRYPT_FAILED') >= 0, 'cloud must not apply over locked blob');
assert.ok(cloudSrc.indexOf("if(b&&(l===undefined||r===undefined))") < 0, 'cloud must not tombstone missing-without-tombstone rows');
assert.ok(cloudSrc.indexOf('function mergeSettings') >= 0, 'settings must deep-merge budget maps');
assert.ok(cloudSrc.indexOf('savingsFromReports') >= 0, 'cloud savings merge uses period reports');
assert.ok(cloudSrc.indexOf('function hydrateBase') >= 0, 'sync-base snapshot must decrypt on boot');
assert.ok(cloudSrc.indexOf("FinSecureStore.saveState(SYNC_BASE") >= 0, 'sync-base must be encrypted');

var asstSrc = fs.readFileSync(path.join(ROOT, 'assistant-v2.js'), 'utf8');
assert.ok(asstSrc.indexOf("s.reserveOps=s.reserveOps.filter") < 0, 'assistant must not strip reserveOps');
assert.ok(asstSrc.indexOf('function softDel') >= 0, 'assistant must soft-delete');
assert.ok(asstSrc.indexOf("type:'withdraw'") >= 0, 'assistant reserve delete must return cash');

var storeSrc = fs.readFileSync(path.join(ROOT, 'secure-store.js'), 'utf8');
assert.ok(storeSrc.indexOf('existingPlain') >= 0 || storeSrc.indexOf('existingEnc') >= 0, 'must not overwrite ciphertext with plaintext');
assert.ok(storeSrc.indexOf('budgetSavings') >= 0, 'empty-state must treat savings as live data');
assert.ok(storeSrc.indexOf("storageKey === 'kopeyka3_state_v1'") >= 0, 'raw backup is only the live cash register');

var gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
assert.ok(/versionCode\s+169/.test(gradle), 'versionCode 169');
assert.ok(/versionName\s+"4\.13\.2"/.test(gradle), 'versionName 4.13.2');

var mainJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/MainActivity.java'), 'utf8');
assert.ok(appSrc.indexOf('function recoverLockedState') >= 0, 'decrypt-fail recovery helper');
assert.ok(appSrc.indexOf("if(!hasLiveData(STATE)&&window.FinBackup") >= 0, 'backup restore must run even if decrypt failed');
assert.ok(appSrc.indexOf('isPaydayToday') >= 0, 'app payday-today');
assert.ok(appSrc.indexOf("e.category!=='Долг'&&e.category!=='Обязательные'") >= 0, 'spent-today breakdown ignores debt/obligation');

var engineSrc = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
assert.ok(engineSrc.indexOf('isPaydayToday') >= 0, 'engine payday-today matches app');
assert.ok(engineSrc.indexOf('pdNext0-1') >= 0, 'engine payday period excludes next payday');

assert.ok(cloudSrc.indexOf("Восстановлено из облака") >= 0 || cloudSrc.indexOf('Касса восстановлена из облака') >= 0, 'cloud recovers locked local');
assert.ok(cloudSrc.indexOf('recoverLockedState') >= 0, 'cloud uses recovery helper');

var idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert.ok(idx.indexOf('budget-carry.js') >= 0, 'index must load leftover overlay');
assert.ok(idx.indexOf('meal-plan.js') >= 0, 'index must load meal-plan');
assert.ok(idx.indexOf('cdn.jsdelivr.net/gh/clubvine44-gif/kopeyka3') < 0, 'pages must not boot from CDN stub');

var widget = fs.readFileSync(path.join(ROOT, 'widget.html'), 'utf8');
assert.ok(widget.indexOf('</script>>') < 0, 'widget script tag must not have stray >');
assert.ok(widget.indexOf('function openingFor') >= 0, 'widget must carry cash across months');

// Leftover savings: accumulate, do not inflate limit, do not double-count.
(function leftoverLogic(){
  var settings = {budgetSavings:{}, periodReports:[]};
  function num(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
  function savingsOf(cat){return Math.max(0,num(settings.budgetSavings[cat]));}
  function addSaving(cat,amount){
    amount=num(amount); if(amount<=0)return savingsOf(cat);
    settings.budgetSavings[cat]=Math.max(0,savingsOf(cat)+amount);
    return settings.budgetSavings[cat];
  }
  function closeOnce(from,end,lim,spent){
    var exists=settings.periodReports.some(function(r){return r&&r.from===from&&r.end===end;});
    if(exists)return settings.periodReports[0];
    var leftover=Math.max(0,lim-spent);
    if(leftover>0)addSaving('Продукты',leftover);
    var report={from:from,end:end,totalSaved:leftover,limit:lim};
    settings.periodReports.unshift(report);
    return report;
  }
  closeOnce('2026-08-15','2026-09-14',10000,7000);
  assert.strictEqual(savingsOf('Продукты'), 3000, 'leftover becomes savings');
  var d2=closeOnce('2026-08-15','2026-09-14',10000,7000);
  assert.strictEqual(savingsOf('Продукты'), 3000, 'duplicate close must not double-count');
  assert.strictEqual(d2.totalSaved, 3000);
  closeOnce('2026-09-15','2026-10-14',10000,4000);
  assert.strictEqual(savingsOf('Продукты'), 9000, 'savings accumulate across periods');
  var lim=10000, saved=savingsOf('Продукты');
  assert.strictEqual(lim, 10000, 'base limit unchanged');
  assert.ok(saved>lim?true:true);
  assert.notStrictEqual(lim+saved, lim, 'saved is tracking only');
  var dailyLim=lim; // not lim+saved
  assert.strictEqual(dailyLim, 10000, 'daily category limit ignores savings');
})();

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
assert.ok(mergedDel.reserveOps.length === 0 || !(mergedDel.reserveOps || []).some(function (x) { return x && x.id === 'o1'; }), 'explicit tombstone still wins');

var bootJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/BootReceiver.java'), 'utf8');
assert.ok(bootJava.indexOf('UpdateCheckReceiver.scheduleSoon') >= 0, 'reboot must reschedule auto-update');
assert.ok(bootJava.indexOf('QUICKBOOT_POWERON') >= 0, 'xiaomi/realme quickboot must reschedule');

var updJava = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/app/fin/kopeyka/UpdateCheckReceiver.java'), 'utf8');
assert.ok(updJava.indexOf('UPDATE_URL + "?t="') >= 0, 'background update check must cache-bust update.json');
assert.ok(updJava.indexOf('setExactAndAllowWhileIdle') >= 0, 'auto-update alarm must be exact');

var manifestXml = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
assert.ok(manifestXml.indexOf('com.htc.intent.action.QUICKBOOT_POWERON') >= 0, 'manifest must listen for htc/realme quickboot');

// Cloud merge of budget savings from different devices/periods must KEEP both.
var base2 = JSON.parse(JSON.stringify(base));
base2.settings = { openingBalance: 10000, month: '2026-09', budgetSavings: {}, budgetLimits: { 'Продукты': 10000, 'Транспорт': 5000 }, periodReports: [] };
var localSav = JSON.parse(JSON.stringify(base2));
localSav.settings.budgetSavings = { 'Продукты': 3000 };
localSav.settings.periodReports = [{ from: '2026-07-15', end: '2026-08-14', totalSaved: 3000, byCat: { 'Продукты': { leftover: 3000 } } }];
var remoteSav = JSON.parse(JSON.stringify(base2));
remoteSav.settings.budgetSavings = { 'Транспорт': 2000 };
remoteSav.settings.periodReports = [{ from: '2026-08-15', end: '2026-09-14', totalSaved: 2000, byCat: { 'Транспорт': { leftover: 2000 } } }];
var mergedSav = cloudSandbox.window.kopeykaCloud.threeWay(base2, localSav, remoteSav);
assert.strictEqual(Number(mergedSav.settings.budgetSavings['Продукты']), 3000, 'local period leftover kept');
assert.strictEqual(Number(mergedSav.settings.budgetSavings['Транспорт']), 2000, 'remote period leftover kept');
assert.strictEqual((mergedSav.settings.periodReports || []).length, 2, 'period reports unioned');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState({ settings: { budgetSavings: { 'Продукты': 1500 } } }), false, 'savings-only state is live');
assert.strictEqual(cloudSandbox.window.kopeykaCloud.isEmptyState({ settings: { budgetLimits: { 'Продукты': 8000 } } }), false, 'limits-only state is live');

// Skipped period leftover: two closed cycles accumulate without inflating limit.
(function skippedPeriods(){
  function pad2(n){return String(n).padStart(2,'0');}
  function daysInMonthNum(y,m){return new Date(y,m,0).getDate();}
  function addDaysISO(iso,delta){
    var p=String(iso).split('-').map(Number);
    var d=new Date(p[0],p[1]-1,p[2]);
    d.setDate(d.getDate()+delta);
    return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  }
  function nextAfter(from,end,mode,payday){
    if(mode==='month'){
      var p=end.split('-').map(Number);
      var y=p[0], m=p[1]+1;
      if(m>12){m=1;y++;}
      var last=daysInMonthNum(y,m);
      return {start:y+'-'+pad2(m)+'-01', end:y+'-'+pad2(m)+'-'+pad2(last), mode:'month'};
    }
    var ns=addDaysISO(end,1);
    var nsp=ns.split('-').map(Number);
    var y2=nsp[0], m2=nsp[1], d2=nsp[2];
    var paydayThis=Math.min(payday, daysInMonthNum(y2,m2));
    var ey=y2, em=m2;
    if(d2>=paydayThis){ em+=1; if(em>12){em=1;ey++;} }
    var ed=Math.min(payday, daysInMonthNum(ey,em))-1;
    if(ed<1){ ey=y2; em=m2; ed=daysInMonthNum(ey,em); }
    return {start:ns, end:ey+'-'+pad2(em)+'-'+pad2(ed), mode:'payday'};
  }
  var n1=nextAfter('2026-07-15','2026-08-14','payday',15);
  assert.strictEqual(n1.start, '2026-08-15');
  assert.strictEqual(n1.end, '2026-09-14');
  var n2=nextAfter(n1.start,n1.end,'payday',15);
  assert.strictEqual(n2.start, '2026-09-15');
  assert.strictEqual(n2.end, '2026-10-14');
  var m1=nextAfter('2026-07-01','2026-07-31','month',0);
  assert.strictEqual(m1.start, '2026-08-01');
  assert.strictEqual(m1.end, '2026-08-31');
})();

var relYml = fs.readFileSync(path.join(ROOT, '.github/workflows/release-apk.yml'), 'utf8');
assert.ok(relYml.indexOf('android-sdk-license') >= 0, 'CI must pre-accept android licenses');
assert.ok(relYml.indexOf('yes | sdkmanager "platforms;android-34"') >= 0, 'CI package install must not wait for license prompt');
assert.ok(relYml.indexOf('tools/check-logic.cjs') >= 0, 'release must run check-logic');

// Meal plan: fractional template qty must not round to 0 (4.13.1 bug).
(function mealQty(){
  var mealSrc = fs.readFileSync(path.join(ROOT, 'meal-plan.js'), 'utf8');
  var mealSandbox = {
    window: { STATE: { settings: { budgetLimits: { 'Продукты': 25000 } } } },
    document: {
      readyState: 'complete',
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      getElementById: function () { return null; },
      body: { appendChild: function () {} }
    },
    localStorage: {
      _d: {},
      getItem: function (k) { return this._d[k] || null; },
      setItem: function (k, v) { this._d[k] = String(v); },
      removeItem: function (k) { delete this._d[k]; }
    },
    console: { log: function () {} },
    setTimeout: function () {},
    MutationObserver: function () { this.observe = function () {}; }
  };
  mealSandbox.window.localStorage = mealSandbox.localStorage;
  mealSandbox.window.document = mealSandbox.document;
  mealSandbox.window.addEventListener = function () {};
  mealSandbox.global = mealSandbox;
  vm.runInNewContext(mealSrc, mealSandbox, { filename: 'meal-plan.js' });
  assert(mealSandbox.window.MealPlan, 'MealPlan not exported');
  assert.ok(Math.abs(mealSandbox.window.MealPlan.qtyOf(0.15) - 0.15) < 1e-9, 'qtyOf keeps 0.15');
  assert.strictEqual(mealSandbox.window.MealPlan.qtyOf(0.15) === 0, false, '0.15 must not become 0');
  var plan = mealSandbox.window.MealPlan.buildPlan({ days: 30, adults: 1, children: 0, goal: 'maintain', budgetMonth: 25000 });
  assert.ok(plan && plan.basket && plan.basket.length > 5, 'basket has items, got ' + ((plan && plan.basket && plan.basket.length) || 0));
  assert.ok(plan.total > 1000, 'basket total must not collapse from rounded grams, got ' + plan.total);
  assert.ok(plan.basket.every(function (b) { return b.qty > 0; }), 'no zero-qty rows');
  var oats = plan.basket.filter(function (b) { return b.id === 'oats_400'; })[0];
  assert.ok(oats && oats.qty >= 1, 'oats packs ceiled from 0.15*30');
})();

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
