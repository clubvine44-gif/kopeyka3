/**
 * FinApp core facade — single entry for modules.
 * Does not replace app.js; gives a stable public API surface.
 */
(function (g) {
  'use strict';
  var api = g.FinApp || {};
  api.version = '4.9.3';
  api.build = function () {
    try { return g.__kopeykaBuild || ''; } catch (e) { return ''; }
  };
  api.hasSecureStore = function () {
    return !!(g.FinSecureStore && g.FinSecureStore.saveState);
  };
  api.compute = function () {
    try { if (typeof g.compute === 'function') return g.compute(); } catch (e) {}
    return null;
  };
  api.render = function () {
    try { if (typeof g.render === 'function') g.render(); } catch (e) {}
  };
  api.toast = function (msg) {
    try { if (typeof g.toast === 'function') g.toast(msg); } catch (e) {}
  };
  api.getState = function () {
    try { return g.STATE || null; } catch (e) { return null; }
  };
  /* Планировщик подключается лениво после загрузки engine.js. */
  api.getFinancialPlan = function () {
    try {
      if (g.finPlan && typeof g.finPlan.get === 'function') return g.finPlan.get();
      if (!g.__finPlanLoading && g.document) {
        g.__finPlanLoading = true;
        var s = g.document.createElement('script');
        s.src = 'fin-plan.js?v=20260904';
        s.onload = function () { g.__finPlanLoading = false; };
        s.onerror = function () { g.__finPlanLoading = false; };
        (g.document.head || g.document.documentElement).appendChild(s);
      }
    } catch (e) {}
    return null;
  };
  g.FinApp = api;
})(typeof window !== 'undefined' ? window : this);
