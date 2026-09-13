(function(){
/* v118.3 — страховочный слой. Ядро уже в app.js 4.12.3.
   Патчит только если сборка без встроенных накоплений или функции не экспортированы. */
'use strict';

function savingsOf(cat){
  var bs=(STATE.settings&&STATE.settings.budgetSavings)||{};
  return Math.max(0,num(bs[cat]));
}
function addSaving(cat,amount){
  amount=num(amount);
  if(amount<=0)return savingsOf(cat);
  if(!STATE.settings)STATE.settings={};
  if(!STATE.settings.budgetSavings||typeof STATE.settings.budgetSavings!=='object'||Array.isArray(STATE.settings.budgetSavings))STATE.settings.budgetSavings={};
  var cur=num(STATE.settings.budgetSavings[cat]);
  STATE.settings.budgetSavings[cat]=Math.max(0,cur+amount);
  return STATE.settings.budgetSavings[cat];
}

window.budgetSavingsOf=window.budgetSavingsOf||savingsOf;
window.addBudgetSaving=window.addBudgetSaving||addSaving;

function nativeHasSavings(){
  try{
    var src=String(window.archiveBudgetPeriodReport||'');
    return src.indexOf('addBudgetSaving')>=0 || src.indexOf('totalSaved')>=0;
  }catch(e){return false;}
}

if(!nativeHasSavings()){
  window.categoryDailyLimit=function(cat,leftDays){
    cat=String(cat||'');
    var baseLim=budgetLimitOf(cat);
    var saved=(window.budgetSavingsOf||savingsOf)(cat);
    var lim=baseLim;
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

  window.archiveBudgetPeriodReport=function(){
    if(!STATE.settings)return null;
    var from=String(STATE.settings.budgetTrackFrom||STATE.settings.budgetPeriodStart||'').slice(0,10);
    var end=String(STATE.settings.budgetPeriodEnd||'').slice(0,10);
    if(!from||!end)return null;
    if(!Array.isArray(STATE.settings.periodReports))STATE.settings.periodReports=[];
    var exists=null;
    for(var i=0;i<STATE.settings.periodReports.length;i++){
      var pr=STATE.settings.periodReports[i];
      if(pr&&pr.from===from&&pr.end===end){exists=pr;break;}
    }
    if(exists)return exists;
    var byCat={},total=0,parts=[],totalSaved=0;
    (window.BUDGET_CATS||[]).forEach(function(cat){
      var lim=budgetLimitOf(cat);
      var spent=spentInCatRange(cat,from,end);
      var leftover=Math.max(0,lim-spent);
      var savedBefore=(window.budgetSavingsOf||savingsOf)(cat);
      if(leftover>0){
        (window.addBudgetSaving||addSaving)(cat,leftover);
        totalSaved+=leftover;
      }
      byCat[cat]={spent:spent,limit:lim,leftover:leftover,savedBefore:savedBefore,savedAfter:(window.budgetSavingsOf||savingsOf)(cat)};
      total+=spent;
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
    STATE.settings.periodReports.unshift(report);
    if(STATE.settings.periodReports.length>36)STATE.settings.periodReports=STATE.settings.periodReports.slice(0,36);
    STATE.settings.lastPeriodReport=report;
    try{
      var fname='finna-period-'+from+'_'+end+'.json';
      var json=JSON.stringify(report,null,2);
      if(window.FinBridge&&typeof window.FinBridge.saveBackup==='function')window.FinBridge.saveBackup(json,fname);
    }catch(e){}
    return report;
  };
}

console.log('[FINNA v118.3] накопления = учёт экономии, лимит не растёт, снимок не затирается');
})();
