/* fix-minus.js — убирает фантомный −100 */
(function () {
  function run() {
    try {
      var KEY = 'kopeyka3_state_v1';
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || !s.settings) return;
      var open = Number(s.settings.openingBalance) || 0;
      var inc = (s.income || []).reduce(function (a, i) { return a + (Number(i.amount) || 0); }, 0);
      var exp = (s.expenses || []).reduce(function (a, e) { return a + (Number(e.amount) || 0); }, 0);
      var dep = (s.reserveOps || []).filter(function (o) { return o.type === 'deposit'; }).reduce(function (a, o) { return a + (Number(o.amount) || 0); }, 0);
      // Если почти пусто, а остаток странный (типа −100) — обнуляем
      if (inc === 0 && exp === 0 && Math.abs(open) > 0 && Math.abs(open) <= 500) {
        s.settings.openingBalance = 0;
        localStorage.setItem(KEY, JSON.stringify(s));
        if (window.STATE && window.STATE.settings) window.STATE.settings.openingBalance = 0;
        if (typeof window.saveState === 'function') window.saveState();
        if (typeof window.render === 'function') window.render();
        if (typeof window.toast === 'function') window.toast('Остаток обнулён');
        console.log('[fix-minus] openingBalance reset to 0');
      }
    } catch (e) {
      console.warn('fix-minus', e);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 800); });
  else setTimeout(run, 800);
})();
