(function(){
'use strict';
/* Fin 4.9.8 — the existing hero is the single source of truth for the main financial plan.
   No second card is rendered here. Kept as a compatibility facade for fin-core.js. */
function get(){
  var e=window.kopeykaEngine;
  if(e&&e.snapshot){
    var s=e.snapshot(),c=s.calculations||{};
    return {cash:Number(c.cash)||0,available:Number(c.available)||0,reservesTotal:Number(c.reservesTotal)||0,dailyLimit:Number(c.dailyBudget||c.daily||c.dailyLimit)||0,daily:Number(c.dailyBudget||c.daily||c.dailyLimit)||0};
  }
  return {};
}
function refresh(){}
window.finPlan={get:get,build:get,advice:function(){return '';},render:function(){},refresh:refresh};
})();
