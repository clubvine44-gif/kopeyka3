(function(){
/* v118.2 budget leftovers = накопления (учёт экономии), лимит НЕ увеличивается */
'use strict';

function budgetSavingsOf(cat){
  var bs=(STATE.settings&&STATE.settings.budgetSavings)||{};
  return Math.max(0,num(bs[cat]));
}
function addBudgetSaving(cat,amount){
  if(!STATE.settings)STATE.settings={};
  if(!STATE.settings.budgetSavings||typeof STATE.settings.budgetSavings!=='object')STATE.settings.budgetSavings={};
  var cur=num(STATE.settings.budgetSavings[cat]);
  STATE.settings.budgetSavings[cat]=Math.max(0,cur+num(amount));
}
window.budgetSavingsOf=budgetSavingsOf;
window.addBudgetSaving=addBudgetSaving;

// categoryDailyLimit: лимит = только базовый, накопления НЕ прибавляются к лимиту
if(typeof categoryDailyLimit==='function'||typeof window.categoryDailyLimit==='function'){
  window.categoryDailyLimit=function(cat,leftDays){
    cat=String(cat||'');
    var baseLim=budgetLimitOf(cat);
    var saved=budgetSavingsOf(cat);
    var lim=baseLim; // только базовый лимит
    if(lim<=0)return{lim:0,baseLim:0,saved:saved,spent:0,left:0,daily:0,spentToday:0};
    var spent=spentInCat(cat);
    var left=Math.max(0,lim-spent);
    var days=Math.max(1,num(leftDays)||1);
    var daily=Math.floor(left/days);
    var st=0,td=today();
    (STATE.expenses||[]).forEach(function(e){
      if(!e||e.deleted)return;
      if(String(e.date||'').slice(0,10)!==td)return;
      if(String(e.category||'')!==cat)return;
      st+=num(e.amount);
    });
    return{lim:lim,baseLim:baseLim,saved:saved,spent:spent,left:left,daily:daily,spentToday:st};
  };
}

// При закрытии периода: leftover → накопления (учёт экономии), лимит не трогаем
if(typeof archiveBudgetPeriodReport==='function'||typeof window.archiveBudgetPeriodReport==='function'){
  window.archiveBudgetPeriodReport=function(){
    if(!STATE.settings)return null;
    var from=String(STATE.settings.budgetTrackFrom||STATE.settings.budgetPeriodStart||'').slice(0,10);
    var end=String(STATE.settings.budgetPeriodEnd||'').slice(0,10);
    if(!from||!end)return null;
    var byCat={},total=0,parts=[],totalSaved=0;
    BUDGET_CATS.forEach(function(cat){
      var lim=budgetLimitOf(cat);
      var spent=spentInCatRange(cat,from,end);
      var leftover=Math.max(0,lim-spent);
      byCat[cat]={spent:spent,limit:lim,leftover:leftover,savedBefore:budgetSavingsOf(cat)};
      total+=spent;
      if(leftover>0){
        addBudgetSaving(cat,leftover);
        totalSaved+=leftover;
      }
      if(spent>0||lim>0||leftover>0){
        parts.push(cat+': '+fmt(spent)+(lim>0?(' / '+fmt(lim)):'')+(leftover>0?(' → сэкономлено '+fmt(leftover)):''));
      }
    });
    var report={
      id:'pr_'+from+'_'+end,from:from,end:end,
      mode:(STATE.settings.limitHorizon==='month')?'month':'payday',
      closedAt:new Date().toISOString(),
      totalSpent:total,totalSaved:totalSaved,
      byCat:byCat,parts:parts.slice(0,12),cashSnapshot:null
    };
    try{
      var month=today().slice(0,7);
      var c=computeForMonth(month);
      report.cashSnapshot={opening:num(STATE.settings.openingBalance),cash:num(c.cash),month:month};
    }catch(e){}
    if(!Array.isArray(STATE.settings.periodReports))STATE.settings.periodReports=[];
    if(!STATE.settings.periodReports.some(function(r){return r&&r.from===from&&r.end===end;})){
      STATE.settings.periodReports.unshift(report);
      if(STATE.settings.periodReports.length>36)STATE.settings.periodReports=STATE.settings.periodReports.slice(0,36);
    }
    STATE.settings.lastPeriodReport=report;
    // НЕ обнуляем budgetSavings — копим экономию по категориям
    try{
      var fname='finna-period-'+from+'_'+end+'.json';
      var json=JSON.stringify(report,null,2);
      if(window.FinBridge&&typeof window.FinBridge.saveBackup==='function')window.FinBridge.saveBackup(json,fname);
    }catch(e){}
    return report;
  };
}

// UI: в карточке НУЖНЫЕ ТРАТЫ показать «накоплено N»
(function patchBudgetUI(){
  function injectSavingsLabels(){
    try{
      var card=document.getElementById('budgetCard');
      if(!card)return;
      var rows=card.querySelectorAll('.budget-row[data-budget-cat]');
      rows.forEach(function(row){
        var cat=row.getAttribute('data-budget-cat');
        if(!cat)return;
        var saved=budgetSavingsOf(cat);
        var sub=row.querySelector('.budget-row-sub');
        if(!sub)return;
        var exist=sub.querySelector('.budget-saved-label');
        if(saved>0){
          if(exist){
            exist.textContent='накоплено '+fmt(saved);
          }else{
            var span=document.createElement('span');
            span.className='muted budget-saved-label';
            span.style.color='#5ED9B0';
            span.textContent='накоплено '+fmt(saved);
            sub.appendChild(span);
          }
        }else if(exist){
          exist.remove();
        }
      });
    }catch(e){}
  }
  var _origRender=window.render;
  if(typeof _origRender==='function'){
    window.render=function(){
      var r=_origRender.apply(this,arguments);
      setTimeout(injectSavingsLabels,30);
      setTimeout(injectSavingsLabels,150);
      return r;
    };
  }
  setTimeout(injectSavingsLabels,500);
  setTimeout(injectSavingsLabels,1500);
  setTimeout(injectSavingsLabels,3000);
})();

console.log('[FINNA v118.2] накопления по категориям = учёт экономии, лимит не растёт');
})();
