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
  api.compute = function () {
    try { if (typeof g.compute === 'function') return g.compute(); } catch (e) {}
    return null;
  };
  api.render = function () { try { if (typeof g.render === 'function') g.render(); } catch (e) {} };
  api.toast = function (msg) { try { if (typeof g.toast === 'function') g.toast(msg); } catch (e) {} };
  api.getState = function () { try { return g.STATE || null; } catch (e) { return null; } };

  function num(v) { var x=Number(v); return isFinite(x)&&x===x ? Math.round(x) : 0; }
  function dateKey(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function today() { return dateKey(new Date()); }
  function monthOf(v) { return String(v||'').slice(0,7); }
  function currentMonth() { return today().slice(0,7); }
  function remainingDays(m) {
    var p=String(m).split('-').map(Number), last=new Date(p[0],p[1],0).getDate();
    if(m===currentMonth()) return Math.max(1,last-new Date().getDate()+1);
    return m>currentMonth() ? last : 0;
  }
  function spentToday(snapshot) {
    var d=today(), sum=0;
    (snapshot.expenses||[]).forEach(function(e){
      if(!e||e.deleted)return;
      if(String(e.date||'').slice(0,10)===d)sum+=num(e.amount);
    });
    return sum;
  }
  function nextPayday(snapshot) {
    var s=snapshot.settings||{}, pay=num(s.payday||s.salaryDay||0), now=new Date();
    if(pay<1||pay>31)return{known:false,days:null,date:null};
    var y=now.getFullYear(),m=now.getMonth(),day=now.getDate();
    function make(yy,mm){return new Date(yy,mm,Math.min(pay,new Date(yy,mm+1,0).getDate()));}
    var d=make(y,m);
    if(d<new Date(y,m,day))d=make(y,m+1);
    return{known:true,days:Math.max(0,Math.ceil((d-new Date(y,m,day))/864e5)),date:dateKey(d)};
  }
  function buildFinancialPlan() {
    var e=g.kopeykaEngine;
    if(!e||!e.snapshot) return null;
    var snap=e.snapshot(), c=snap.calculations||{}, m=c.month||snap.selectedMonth||currentMonth();
    var reserves=Math.max(0,num(c.reservesTotal)), cash=num(c.cash), available=num(c.available);
    var protectedCash=Math.min(reserves,Math.max(0,cash));
    var spendable=Math.max(0,available-protectedCash);
    var days=remainingDays(m), spent=spentToday(snap), pay=nextPayday(snap);
    var baseDaily=days>0?Math.floor(spendable/days):0, manual=snap.settings&&snap.settings.manualDailyLimit;
    var daily=(manual!==null&&manual!==undefined&&manual!==''&&isFinite(Number(manual)))
      ?Math.max(0,Math.round(Number(manual))) : baseDaily;
    daily=Math.min(daily,spendable);
    var status='ok',message='Лимит на сегодня в норме.';
    if(spendable<=0){status='critical';message='Свободных денег для плановых расходов нет.';}
    else if(spent>daily){status='warning';message='Сегодня уже потрачено больше дневного лимита.';}
    else if(daily>0&&spent/daily>=0.8){status='attention';message='Большая часть дневного лимита уже потрачена.';}
    return {
      version:1,generatedAt:new Date().toISOString(),month:m,
      cash:cash,available:available,protectedReserves:protectedCash,spendable:spendable,
      daysLeft:days,dailyLimit:daily,baseDailyLimit:baseDaily,spentToday:spent,
      remainingToday:Math.max(0,daily-spent),debtRemaining:num(c.debtRemaining),
      obligationsRemaining:num(c.obligationsRemaining),income:num(c.income),expenses:num(c.expenses),
      reservesTotal:reserves,payday:pay,status:status,message:message,
      horizon:{type:pay.known?'payday':'month_end',days:pay.known?pay.days:days}
    };
  }
  function financialAdvice(plan) {
    if(!plan)return 'Финансовое ядро ещё не готово.';
    if(plan.status==='critical')return 'Стоп: сначала обеспечь обязательные платежи и резерв, потом планируй свободные траты.';
    if(plan.spentToday>plan.dailyLimit)return 'Сегодня лимит уже превышен. До следующего дня лучше не делать необязательных покупок.';
    if(plan.dailyLimit===0)return 'Свободный дневной лимит пока равен нулю.';
    return 'Сегодня можно потратить до '+plan.remainingToday+' ₽ без выхода за текущий лимит.';
  }
  api.getFinancialPlan = function(){
    try { var p=buildFinancialPlan(); if(p)p.advice=financialAdvice(p); return p; } catch(e) { return null; }
  };
  api.getFinancialAdvice = function(){
    try { var p=api.getFinancialPlan(); return financialAdvice(p); } catch(e) { return ''; }
  };
  g.FinApp = api;
})(typeof window !== 'undefined' ? window : this);
