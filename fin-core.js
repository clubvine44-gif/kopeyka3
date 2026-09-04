/**
 * FinApp core facade — stable entry for modules.
 * Fin 4.9.9
 */
(function (g) {
  'use strict';
  var api = g.FinApp || {};
  api.version = '4.9.9';
  api.build = function () { try { return g.__kopeykaBuild || ''; } catch (e) { return ''; } };
  api.hasSecureStore = function () { return !!(g.FinSecureStore && g.FinSecureStore.saveState); };
  api.compute = function () { try { if (typeof g.compute === 'function') return g.compute(); } catch (e) {} return null; };
  api.render = function () {
    try { if (typeof g.render === 'function') g.render(); } catch (e) {}
    try { if (g.finPlan && g.finPlan.refresh) g.finPlan.refresh(); } catch (e) {}
  };
  api.toast = function (msg) { try { if (typeof g.toast === 'function') g.toast(msg); } catch (e) {} };
  api.getState = function () { try { return g.STATE || null; } catch (e) { return null; } };
  api.getFinancialPlan = function () {
    try { return g.finPlan && g.finPlan.get ? g.finPlan.get() : null; } catch (e) { return null; }
  };
  api.getFinancialAdvice = function () {
    try { var p = api.getFinancialPlan(); return p && p.advice ? p.advice : ''; } catch (e) { return ''; }
  };
  g.FinApp = api;
})(typeof window !== 'undefined' ? window : this);
