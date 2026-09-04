/**
 * FinApp core facade — stable entry point for application modules.
 * Financial planning is exposed here so the Android/web shell needs no extra asset.
 */
(function (g) {
  'use strict';
  var api = g.FinApp || {};
  api.version = '4.9.3';
  api.build = function () { try { return g.__kopeykaBuild || ''; } catch (e) { return ''; } };
  api.hasSecureStore = function () { return !!(g.FinSecureStore && g.FinSecureStore.saveState); };
  api.compute = function () { try { if (typeof g.compute === 'function') return g.compute(); } catch (e) {} return null; };
  api.render = function () { try { if (typeof g.render === 'function') g.render(); } catch (e) {} };
  api.toast = function (msg) { try { if (typeof g.toast === 'function') g.toast(msg); } catch (e) {} };
  api.getState = function () { try { return g.STATE || null; } catch (e) { return null; } };
  api.getFinancialPlan = function () { try { return g.finPlan && g.finPlan.get ? g.finPlan.get() : null; } catch (e) { return null; } };
  api.getFinancialAdvice = function () { try { var p=api.getFinancialPlan(); return p&&p.advice ? p.advice : ''; } catch (e) { return ''; } };
  g.FinApp = api;
  function loadPlanner(){
    if(typeof document==='undefined')return;
    if(document.querySelector('script[data-fin-plan]'))return;
    var s=document.createElement('script');s.src='fin-plan.js?v=2026090421';s.async=true;s.setAttribute('data-fin-plan','1');
    (document.head||document.documentElement).appendChild(s);
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPlanner);else loadPlanner();
  }
})(typeof window !== 'undefined' ? window : this);
