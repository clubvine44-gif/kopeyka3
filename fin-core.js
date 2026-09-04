/**
 * FinApp core facade — single entry for modules.
 * Does not replace app.js; gives a stable public API surface.
 */
(function (g) {
  'use strict';
  var api = g.FinApp || {};
  api.version = '4.9.0';
  api.build = function () {
    try { return g.__kopeykaBuild || ''; } catch (e) { return ''; }
  };
  api.hasSecureStore = function () {
    return !!(g.FinSecureStore && g.FinSecureStore.saveState);
  };
  api.compute = function () {
    try {
      if (typeof g.compute === 'function') return g.compute();
    } catch (e) {}
    return null;
  };
  api.render = function () {
    try {
      if (typeof g.render === 'function') g.render();
    } catch (e) {}
  };
  api.toast = function (msg) {
    try {
      if (typeof g.toast === 'function') g.toast(msg);
    } catch (e) {}
  };
  api.getState = function () {
    try { return g.STATE || null; } catch (e) { return null; }
  };
  g.FinApp = api;
})(typeof window !== 'undefined' ? window : this);
