(function(){
'use strict';
/* Финансовый план v2: прикладной слой + главный ответ для пользователя. */
function num(v){var x=Number(v);return isFinite(x)&&x===x?Math.round(x):0;}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function today(){return dateKey(new Date());}
function currentMonth(){return today().slice(0,7);}
function monthDays(m){var p=String(m).split('-').map(Number);return new Date(p[0],p[1],0).getDate();}
function nextPayday(snapshot){
  var s=snapshot.settings||{},pay=num(s.paydayDay!=null?s.paydayDay:(s.payday||s.salaryDay||0)),now=new Date(),day=now.getDate();
  if(pay<1||pay>31)return{known:false,days:null,date:null};
  var y=now.getFullYear(),m=now.getMonth();
  function make(yy,mm){return new Date(yy,mm,Math.min(pay,new Date(yy,mm+1,0).getDate()));}
  var d=make(y,m);
  if(d<new Date(y,m,day))d=make(y,m+1);
  return{known:true,days:Math.max(0,Math.ceil((d-new Date(y,m,day))/864e5)),date:dateKey(d)};
}
function spentToday(snapshot){
  var d=today(),sum=0;(snapshot.expenses||[]).forEach(function(e){if(!e||e.deleted)return;if(String(e.date||'').slice(0,10)===d)sum+=num(e.amount);});return sum;
}
function build(){
  var e=window.kopeykaEngine;if(!e||!e.snapshot)throw new Error('kopeykaEngine is not ready');
  var snap=e.snapshot(),c=snap.calculations||{},m=c.month||snap.selectedMonth||currentMonth();
  var reserves=Math.max(0,num(c.reservesTotal)),cash=num(c.cash),available=num(c.available);
  var protectedCash=Math.min(reserves,Math.max(0,cash));
  var spendable=Math.max(0,available-protectedCash),pay=nextPayday(snap),todaySpent=spentToday(snap);
  var horizon=(snap.settings&&snap.settings.limitHorizon)==='payday'&&pay.known?'payday':'month_end';
  var days=horizon==='payday'?Math.max(1,pay.days): (m===currentMonth()?Math.max(1,monthDays(m)-new Date().getDate()+1):monthDays(m));
  var baseDaily=Math.floor(spendable/days),manual=snap.settings&&snap.settings.manualDailyLimit;
  var daily=(manual!==null&&manual!==undefined&&manual!==''&&isFinite(Number(manual)))?Math.max(0,Math.round(Number(manual))):baseDaily;
  daily=Math.min(daily,spendable);
  var remaining=Math.max(0,daily-todaySpent),status='ok';
  if(spendable<=0)status='critical';else if(todaySpent>daily)status='warning';else if(daily>0&&todaySpent/daily>=.8)status='attention';
  return{version:2,generatedAt:new Date().toISOString(),month:m,cash:cash,available:available,protectedReserves:protectedCash,spendable:spendable,daysLeft:days,dailyLimit:daily,baseDailyLimit:baseDaily,spentToday:todaySpent,remainingToday:remaining,debtRemaining:num(c.debtRemaining),obligationsRemaining:num(c.obligationsRemaining),income:num(c.income),expenses:num(c.expenses),reservesTotal:reserves,payday:pay,status:status,horizon:{type:horizon,days:days}};
}
function advice(p){
  if(!p)return 'Финансовый план недоступен.';
  if(p.status==='critical')return 'Свободных денег нет. Сначала обязательные платежи и резерв.';
  if(p.status==='warning')return 'Дневной лимит уже превышен. Необязательные траты лучше остановить.';
  if(p.status==='attention')return 'Большая часть дневного лимита уже потрачена.';
  return 'Сегодня можно потратить до '+p.remainingToday+' ₽.';
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmt(n){return Math.round(Number(n)||0).toLocaleString('ru-RU')+' ₽';}
function renderCard(){
  try{
    if(!window.kopeykaEngine||!window.kopeykaEngine.snapshot)return;
    var p=build(),host=document.querySelector('.card.hero');if(!host)return;
    var old=document.getElementById('finPlanCard');
    if(old)old.remove();
    var card=document.createElement('section');card.id='finPlanCard';card.className='card fin-plan-card';
    var title=p.status==='critical'?'Внимание':p.status==='warning'?'Лимит превышен':'План на сегодня';
    var sub=p.horizon.type==='payday'&&p.payday.known?'До зарплаты · '+p.horizon.days+' дн.':'До конца периода · '+p.horizon.days+' дн.';
    card.innerHTML='<div class="fin-plan-head"><div><div class="fin-plan-kicker">'+title+'</div><div class="fin-plan-sub">'+esc(sub)+'</div></div><div class="fin-plan-value">'+fmt(p.remainingToday)+'</div></div><div class="fin-plan-track"><span style="width:'+Math.min(100,p.dailyLimit?Math.round(p.spentToday/p.dailyLimit*100):0)+'%"></span></div><div class="fin-plan-meta"><span>Лимит '+fmt(p.dailyLimit)+'</span><span>Потрачено '+fmt(p.spentToday)+'</span></div><div class="fin-plan-advice">'+esc(advice(p))+'</div></section>';
    host.parentNode.insertBefore(card,host.nextSibling);
  }catch(e){}
}
function install(){
  if(!document.getElementById('finPlanStyle')){
    var s=document.createElement('style');s.id='finPlanStyle';s.textContent='.fin-plan-card{padding:15px 16px!important;border-color:rgba(94,200,255,.2)!important;background:linear-gradient(145deg,rgba(18,31,54,.98),rgba(12,21,37,.98))!important}.fin-plan-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.fin-plan-kicker{font-size:14px;font-weight:800}.fin-plan-sub{font-size:11px;color:var(--muted);margin-top:2px}.fin-plan-value{font-size:25px;font-weight:850;letter-spacing:-.04em}.fin-plan-track{height:6px;background:rgba(255,255,255,.07);border-radius:99px;margin:13px 0 7px;overflow:hidden}.fin-plan-track span{display:block;height:100%;background:var(--accent);border-radius:99px;transition:width .25s}.fin-plan-meta{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--muted)}.fin-plan-advice{font-size:12px;line-height:1.4;margin-top:10px;color:var(--text)}';document.head.appendChild(s);
  }
  renderCard();
  var tries=0,tm=setInterval(function(){renderCard();if(++tries>20)clearInterval(tm);},500);
  new MutationObserver(function(){if(!document.getElementById('finPlanCard'))renderCard();}).observe(document.body,{childList:true,subtree:true});
  setInterval(renderCard,60000);
}
window.finPlan={build:build,get:function(){var p=build();p.advice=advice(p);return p;},advice:advice,render:renderCard};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
