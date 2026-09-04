(function(){
'use strict';
var CATS=['Продукты','Одежда','Карманные расходы','Аренда и коммунальные','Связь и подписки','Гигиена','Здоровье','Прочее'];
var ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'],MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function n(v){var x=Number(v);return isFinite(x)&&x===x?Math.round(x):0;}
function state(){return window.STATE&&typeof window.STATE==='object'?window.STATE:{};}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function monthOf(d){return String(d||'').slice(0,7);}
function days(a,b){var pa=String(a).split('-').map(Number),pb=String(b).split('-').map(Number);return Math.round((new Date(pb[0],pb[1]-1,pb[2])-new Date(pa[0],pa[1]-1,pa[2]))/864e5);}
function next(m){var p=String(m).split('-').map(Number),y=p[0],x=p[1]+1;if(x>12){x=1;y++;}return y+'-'+String(x).padStart(2,'0');}
function prev(m){var p=String(m).split('-').map(Number),y=p[0],x=p[1]-1;if(x<1){x=12;y--;}return y+'-'+String(x).padStart(2,'0');}
function cmpMonth(a,b){return String(a||'').localeCompare(String(b||''));}
function alive(x){return !!(x&&!x.deleted);}
function monthOps(m){var s=state(),inc=0,exp=0,dep=0,wd=0;(s.income||[]).forEach(function(x){if(!alive(x))return;if(monthOf(x.date)===m)inc+=n(x.amount);});(s.expenses||[]).forEach(function(x){if(!alive(x))return;if(monthOf(x.date)===m)exp+=n(x.amount);});(s.reserveOps||[]).forEach(function(x){if(!alive(x))return;if(monthOf(x.date)!==m)return;var a=n(x.amount);if(x.type==='deposit')dep+=a;else if(x.type==='withdraw')wd+=a;});return{income:inc,expenses:exp,deposits:dep,withdrawals:wd,delta:inc-exp-dep+wd};}
function selectedMonth(){if(window.__kopeykaViewMonth)return window.__kopeykaViewMonth;var el=document.querySelector('.month-title'),parts=String(el&&el.textContent||'').trim().split(/\s+/),i=MONTHS.indexOf(parts[0]),y=parts[1];if(i>=0&&/^\d{4}$/.test(y))return y+'-'+String(i+1).padStart(2,'0');var s=state();return s.settings&&s.settings.month||today().slice(0,7);}
function opening(m){var s=state(),anchor=s.settings&&s.settings.month||today().slice(0,7),open=n(s.settings&&s.settings.openingBalance),guard=0;if(m===anchor)return open;if(m>anchor){for(var x=anchor;x!==m&&guard++<240;x=next(x))open+=monthOps(x).delta;return open;}for(var y=anchor;y!==m&&guard++<240;){y=prev(y);open-=monthOps(y).delta;}return open;}
function debtActiveInMonth(d,month){
  if(!d||d.deleted)return false;
  if(!d.deferUntil)return true;
  var du=String(d.deferUntil),dm=du.slice(0,7);
  month=String(month||today().slice(0,7));
  if(cmpMonth(dm,month)>0)return false;
  if(cmpMonth(dm,month)<0)return true;
  if(du.length>=10&&month===today().slice(0,7)&&today()<du.slice(0,10))return false;
  return true;
}
function calc(m){var s=state(),o=monthOps(m),cash=opening(m)+o.delta,debt=0,res=0,obDue=0,obPaid=0;(s.debts||[]).forEach(function(d){if(!debtActiveInMonth(d,m))return;debt+=Math.max(0,n(d.total)-n(d.paid));});(s.reserves||[]).forEach(function(r){if(!alive(r))return;res+=n(r.saved);});(s.obligations||[]).forEach(function(ob){if(ob.active===false||ob.deleted)return;var p=0;(s.obligationPays||[]).forEach(function(x){if(!alive(x))return;if(x.obligId===ob.id&&x.month===m)p+=n(x.amount);});obPaid+=p;obDue+=Math.max(0,n(ob.amount)-p);});var available=cash-debt-obDue,p=m.split('-').map(Number),last=new Date(p[0],p[1],0).getDate(),cur=today().slice(0,7),dayNum=Number(today().slice(8)),left=m===cur?Math.max(1,last-dayNum+1):last;
var payday=s.settings&&s.settings.paydayDay!=null?n(s.settings.paydayDay):0;
var daysToPayday=left;
if(m===cur&&payday>=1&&payday<=31){
  if(dayNum<=payday)daysToPayday=Math.max(1,payday-dayNum+1);
  else{
    var nm=next(m),np=nm.split('-').map(Number),nlast=new Date(np[0],np[1],0).getDate(),pd2=Math.min(payday,nlast);
    daysToPayday=Math.max(1,(last-dayNum+1)+pd2);
  }
}else if(payday>=1&&payday<=31){
  daysToPayday=Math.max(1,Math.min(payday,last));
}
var horizon=s.settings&&s.settings.limitHorizon==='month'?'month':'payday';
if(horizon==='payday'&&!(payday>=1&&payday<=31))horizon='month';
var leftDays=horizon==='payday'?daysToPayday:left;
var daily=available>0&&leftDays>0?Math.floor(available/leftDays):0;
var manualL=s.settings&&s.settings.manualDailyLimit;
if(manualL!=null&&manualL!==''&&isFinite(Number(manualL)))daily=Math.max(0,Math.round(Number(manualL)));
var by={};(s.expenses||[]).forEach(function(e){if(!alive(e))return;if(monthOf(e.date)!==m)return;var c=e.category||'Прочее';if(c==='Долг'&&e.note)c=e.note;by[c]=(by[c]||0)+n(e.amount);});var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});
return{month:m,openingBalance:opening(m),cash:cash,available:available,dailyBudget:daily,daily:daily,daysLeft:leftDays,income:o.income,expenses:o.expenses,reserveDeposits:o.deposits,reserveWithdrawals:o.withdrawals,reservesTotal:res,debtRemaining:debt,obligationsRemaining:obDue,obligationsPaid:obPaid,expenseByCategory:cats};}
function shifts(m){var s=state(),p=m.split('-').map(Number),dim=new Date(p[0],p[1],0).getDate(),out={day:0,night:0,off:0};for(var d=1;d<=dim;d++){var ds=m+'-'+String(d).padStart(2,'0'),v=s.shiftsOverride&&s.shiftsOverride[ds];if(v!=='day'&&v!=='night'&&v!=='off')v=CYCLE[((days(ANCHOR,ds)%6)+6)%6];out[v]++;}return out;}
function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return x;}}
function classifyName(name,fallback){var q=String(name||'').toLowerCase().replace(/ё/g,'е'),map=window.KOPEYKA_PRODUCTS||[];for(var i=0;i<map.length;i++){var words=map[i][1]||[];for(var j=0;j<words.length;j++){var w=String(words[j]).toLowerCase().replace(/ё/g,'е');if(q.indexOf(w)!==-1)return map[i][0];}}return CATS.indexOf(fallback)>=0?fallback:'Прочее';}
function allMonths(){var s=state(),set={};[s.income||[],s.expenses||[],s.reserveOps||[],s.obligationPays||[]].forEach(function(arr){arr.forEach(function(x){if(!alive(x))return;var m=monthOf(x.date)||monthOf(x.month);if(/^\d{4}-\d{2}$/.test(m))set[m]=1;});});var anchor=s.settings&&s.settings.month;if(/^\d{4}-\d{2}$/.test(anchor))set[anchor]=1;var selected=selectedMonth(),cur=today().slice(0,7);set[cur]=1;set[selected]=1;set[prev(selected)]=1;set[next(selected)]=1;var keys=Object.keys(set).sort();if(!keys.length)keys=[cur];var min=keys[0],max=keys[keys.length-1],out=[],m=min,guard=0;while(true){out.push(calc(m));if(m===max||guard++>240)break;m=next(m);}return out;}
function cloudInfo(){var b=document.getElementById('btnCloud');var connected=!!(b&&b.classList.contains('on'));return{online:navigator.onLine,connected:connected,status:connected?'connected':(navigator.onLine?'local_or_not_connected':'offline'),label:b&&b.title||''};}
function snapshot(){var s=state(),m=selectedMonth(),c=calc(m);return{settings:clone(s.settings||{}),selectedMonth:m,calculations:c,monthlyCalculations:allMonths(),shifts:shifts(m),income:clone(s.income||[]),expenses:clone(s.expenses||[]),reserves:clone(s.reserves||[]),reserveOps:clone(s.reserveOps||[]),debts:clone(s.debts||[]),obligations:clone(s.obligations||[]),obligationPays:clone(s.obligationPays||[]),shiftsOverride:clone(s.shiftsOverride||{}),cloud:cloudInfo()};}
function context(){return JSON.stringify(snapshot());}
window.kopeykaEngine={categories:CATS,getSelectedMonth:selectedMonth,classifyName:classifyName,month:calc,allMonths:allMonths,shifts:shifts,snapshot:snapshot,context:context};
})();
