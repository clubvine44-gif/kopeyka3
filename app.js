(function(){/* v117 4.12.0 */'use strict';
var KEY='kopeyka3_state_v1',ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'];
var CATS=['Продукты','Одежда','Транспорт','Карманные расходы','Аренда и коммунальные','Связь и подписки','Гигиена','Здоровье','Прочее'];
var BUDGET_CATS=['Продукты','Одежда','Транспорт','Карманные расходы','Аренда и коммунальные','Связь и подписки','Гигиена','Здоровье'];
function budgetLimitOf(cat){var bl=(STATE.settings&&STATE.settings.budgetLimits)||{};return Math.max(0,num(bl[cat]));}
function setBudgetLimit(cat,val){if(!STATE.settings)STATE.settings={};if(!STATE.settings.budgetLimits||typeof STATE.settings.budgetLimits!=='object')STATE.settings.budgetLimits={};STATE.settings.budgetLimits[cat]=Math.max(0,num(val));}
function budgetSavingsOf(cat){return 0;}
function addBudgetSaving(cat,amount){/* накопления по категориям отключены */}
function sortReservesList(list){
  return (list||[]).slice().sort(function(a,b){
    var pa=num(a.priority), pb=num(b.priority);
    var aP=(pa>=1&&pa<=3)?pa:99;
    var bP=(pb>=1&&pb<=3)?pb:99;
    if(aP!==bP)return aP-bP;
    return num(b.saved)-num(a.saved);
  });
}
