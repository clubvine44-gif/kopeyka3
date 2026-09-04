/**
 * FinApp core facade — stable entry point for application modules.
 * [release] Fin 4.9.7 — dashboard redesign build
 */
(function (g) {
  'use strict';
  var api = g.FinApp || {};
  api.version = '4.9.7';
  api.build = function () { try { return g.__kopeykaBuild || ''; } catch (e) { return ''; } };
  api.hasSecureStore = function () { return !!(g.FinSecureStore && g.FinSecureStore.saveState); };
  api.compute = function () { try { if (typeof g.compute === 'function') return g.compute(); } catch (e) {} return null; };
  api.render = function () { try { if (typeof g.render === 'function') g.render(); } catch (e) {} try { if (g.finPlan && g.finPlan.refresh) g.finPlan.refresh(); } catch (e) {} };
  api.toast = function (msg) { try { if (typeof g.toast === 'function') g.toast(msg); } catch (e) {} };
  api.getState = function () { try { return g.STATE || null; } catch (e) { return null; } };
  api.getFinancialPlan = function () { try { return g.finPlan && g.finPlan.get ? g.finPlan.get() : null; } catch (e) { return null; } };
  api.getFinancialAdvice = function () { try { var p=api.getFinancialPlan(); return p&&p.advice ? p.advice : ''; } catch (e) { return ''; } };
  g.FinApp = api;
  function loadScripts(){
    if(typeof document==='undefined')return;
    if(!document.querySelector('script[data-fin-plan]')){var p=document.createElement('script');p.src='fin-plan.js?v=2026090425';p.async=true;p.setAttribute('data-fin-plan','1');(document.head||document.documentElement).appendChild(p);}
    if(!document.querySelector('script[data-fin-design]')){var d=document.createElement('script');d.src='fin-design.js?v=2026090426';d.async=true;d.setAttribute('data-fin-design','1');(document.head||document.documentElement).appendChild(d);}
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadScripts);else loadScripts();
  }
})(typeof window !== 'undefined' ? window : this);
