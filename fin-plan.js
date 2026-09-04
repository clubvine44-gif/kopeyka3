(function(){
'use strict';
/* Финансовый план v1: прикладной слой над kopeykaEngine.
   Не хранит данные и не пересчитывает исходные операции — получает snapshot ядра. */
function num(v){var x=Number(v);return isFinite(x)&&x===x?Math.round(x):0;}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function daysBetween(a,b){
  var pa=String(a).split('-').map(Number),pb=String(b).split('-').map(Number);
  return Math.round((new Date(pb[0],pb[1]-1,pb[2])-new Date(pa[0],pa[1]-1,pa[2]))/864e5);
}
function today(){return dateKey(new Date());}
function monthOf(v){return String(v||'').slice(0,7);}
function currentMonth(){return today().slice(0,7);}
function remainingDays(m){
  var p=String(m).split('-').map(Number),last=new Date(p[0],p[1],0).getDate(),cur=currentMonth();
  if(m===cur)return Math.max(1,last-new Date().getDate()+1);
  return m>cur?last:0;
}
function spentToday(snapshot){
  var d=today(),sum=0;
  (snapshot.expenses||[]).forEach(function(e){if(!e||e.deleted)return;if(String(e.date||'').slice(0,10)===d)sum+=num(e.amount);});
  return sum;
}
function nextPayday(snapshot){
  var s=snapshot.settings||{},pay=num(s.payday||s.salaryDay||0),now=new Date(),day=now.getDate();
  if(pay<1||pay>31)return{known:false,days:null,date:null};
  var y=now.getFullYear(),m=now.getMonth();
  function make(yy,mm){var last=new Date(yy,mm+1,0).getDate();return new Date(yy,mm,Math.min(pay,last));}
  var d=make(y,m);
  if(d<new Date(y,m,day))d=make(y,m+1);
  return{known:true,days:Math.max(0,Math.ceil((d-new Date(y,m,day))/864e5)),date:dateKey(d)};
}
function build(){
  var e=window.kopeykaEngine;
  if(!e||!e.snapshot)throw new Error('kopeykaEngine is not ready');
  var snap=e.snapshot(),c=snap.calculations||{},m=c.month||snap.selectedMonth||currentMonth();
  var reserves=Math.max(0,num(c.reservesTotal)),cash=num(c.cash),available=num(c.available),
      protectedCash=Math.min(reserves,Math.max(0,cash)),spendable=Math.max(0,available-protectedCash),
      days=remainingDays(m),spent=spentToday(snap),pay=nextPayday(snap),
      baseDaily=days>0?Math.floor(spendable/days):0,
      manual=snap.settings&&snap.settings.manualDailyLimit,
      daily=(manual!==null&&manual!==undefined&&manual!==''&&isFinite(Number(manual)))?Math.max(0,Math.round(Number(manual))):baseDaily;
  daily=Math.min(daily,spendable);
  var afterToday=Math.max(0,daily-spent),status='ok',message='Лимит на сегодня в норме.';
  if(spendable<=0){status='critical';message='Свободных денег для плановых расходов нет.';}
  else if(spent>daily){status='warning';message='Сегодня уже потрачено больше дневного лимита.';}
  else if(daily>0&&spent/daily>=0.8){status='attention';message='Большая часть дневного лимита уже потрачена.';}
  return{
    version:1,generatedAt:new Date().toISOString(),month:m,
    cash:cash,available:available,protectedReserves:protectedCash,spendable:spendable,
    daysLeft:days,dailyLimit:daily,baseDailyLimit:baseDaily,spentToday:spent,remainingToday:afterToday,
    debtRemaining:num(c.debtRemaining),obligationsRemaining:num(c.obligationsRemaining),
    income:num(c.income),expenses:num(c.expenses),reservesTotal:reserves,
    payday:pay,status:status,message:message,
    horizon:{type:pay.known?'payday':'month_end',days:pay.known?pay.days:days}
  };
}
function advice(plan){
  if(plan.status==='critical')return 'Стоп: сначала обеспечь обязательные платежи и резерв, потом планируй свободные траты.';
  if(plan.spentToday>plan.dailyLimit)return 'Сегодня лимит уже превышен. До следующего дня лучше не делать необязательных покупок.';
  if(plan.remainingToday<0)return 'Сегодня лимит исчерпан.';
  if(plan.dailyLimit===0)return 'Свободный дневной лимит пока равен нулю.';
  return 'Сегодня можно потратить до '+plan.remainingToday+' ₽ без выхода за текущий лимит.';
}
function get(){var p=build();p.advice=advice(p);return p;}
window.finPlan={build:build,get:get,advice:advice};
})();
