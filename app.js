(function(){'use strict';
var KEY='kopeyka3_state_v1',ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'],SHIFT_LABEL={day:'День',night:'Ночь',off:'Выходной'},CATS=['Продукты','Алкоголь','Сигареты','Хозтовары','Бытовая химия','Кафе','Связь','Проезд','Жильё','Здоровье','Красота','Одежда','Развлечения','Подписки','Техника','Дети','Животные','Обязательные','Долг','Прочее'],RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Больница','Свой вариант'];
var STATE=null,viewMonth=null,openSecs={ops:1,obl:1,an:0,res:0,debt:0},undoStack=[],UNDO_MAX=30;
try{STATE=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){STATE=null;}
if(!STATE)STATE={version:6,settings:{openingBalance:0,month:new Date().toISOString().slice(0,7),dayRate:0,nightRate:0},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],voiceMap:{},shiftsOverride:{},updatedAt:new Date().toISOString()};
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function num(v){var x=Number(v);return isFinite(x)?x:0;}
function sane(v){var x=num(v);return x<-1e12?0:(x>1e12?0:Math.round(x));}
function fmt(n){return Math.round(num(n)).toLocaleString('ru-RU')+' ₽';}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function inMonth(d,m){return String(d||'').slice(0,7)===String(m||'');}
function getViewMonth(){return viewMonth||((STATE.settings&&STATE.settings.month)||today().slice(0,7));}
function monthLabel(m){var p=String(m).split('-');var names=['','Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];return (names[Number(p[1])]||p[1])+' '+p[0];}
function shift(ds,ov){if(ov&&ov[ds])return ov[ds];var t=new Date(ds+'T12:00:00');var a=new Date(ANCHOR+'T12:00:00');var diff=Math.round((t-a)/86400000);var i=((diff%6)+6)%6;return CYCLE[i];}
function def(){return{version:6,settings:{openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],voiceMap:{},shiftsOverride:{},updatedAt:new Date().toISOString()};}
function norm(o){if(!o||typeof o!=='object')return def();o=Object.assign({},o);o.settings=Object.assign({openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0},o.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  if(!o.shiftsOverride||typeof o.shiftsOverride!=='object')o.shiftsOverride={};
  if(!o.voiceMap||typeof o.voiceMap!=='object')o.voiceMap={};
  o.settings.openingBalance=sane(o.settings.openingBalance);
  o.settings.dayRate=sane(o.settings.dayRate);
  o.settings.nightRate=sane(o.settings.nightRate);
  if(!o.settings.month)o.settings.month=today().slice(0,7);
  o.income=(o.income||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),note:String(x.note||'Доход')});});
  o.expenses=(o.expenses||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),category:String(x.category||'Прочее'),note:String(x.note||'')});});
  o.reserves=(o.reserves||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Резерв'),target:sane(x.target),saved:sane(x.saved)});});
  o.debts=(o.debts||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Долг'),total:sane(x.total),paid:sane(x.paid)});});
  o.reserveOps=(o.reserveOps||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),type:x.type==='withdraw'?'withdraw':'deposit'});});
  o.obligations=(o.obligations||[]).filter(function(x){return x&&x.id;}).map(function(x){var day=num(x.day);if(day<1)day=1;if(day>31)day=31;return Object.assign({},x,{name:String(x.name||'Платёж'),amount:sane(x.amount),day:day,active:x.active!==false});});
  o.obligationPays=(o.obligationPays||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  return o;
}
STATE=norm(STATE);
function pushUndo(){try{undoStack.push(JSON.stringify(STATE));if(undoStack.length>UNDO_MAX)undoStack.shift();}catch(e){}}
function undoLast(){if(!undoStack.length){toast('Нечего отменять');return;}try{STATE=norm(JSON.parse(undoStack.pop()));save(true);render();toast('Отменено');}catch(e){toast('Не удалось отменить');}}
function save(skipUndo){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();}
window.defaultState=def;window.setAppState=function(s){pushUndo();STATE=norm(s);ensureMonth();save(true);render();};window.saveState=function(){save(true);};
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function monthOps(month){
  var inc=0,exp=0,dep=0,wd=0;
  (STATE.income||[]).forEach(function(i){if(inMonth(i.date,month))inc+=num(i.amount);});
  (STATE.expenses||[]).forEach(function(e){if(inMonth(e.date,month))exp+=num(e.amount);});
  (STATE.reserveOps||[]).forEach(function(o){
    if(!inMonth(o.date,month))return;
    var a=num(o.amount);
    if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;
  });
  return{inc:inc,exp:exp,dep:dep,wd:wd,delta:inc-exp-dep+wd};
}
function nextMonth(ym){
  var p=String(ym||'').split('-').map(Number);
  if(p.length<2||!p[0]||!p[1])return ym;
  var y=p[0],m=p[1]+1;
  if(m>12){m=1;y++;}
  return y+'-'+String(m).padStart(2,'0');
}
function prevMonth(ym){
  var p=String(ym||'').split('-').map(Number);
  if(p.length<2||!p[0]||!p[1])return ym;
  var y=p[0],m=p[1]-1;
  if(m<1){m=12;y--;}
  return y+'-'+String(m).padStart(2,'0');
}
function cmpMonth(a,b){return String(a||'').localeCompare(String(b||''));}
function openingForMonth(target){
  var anchor=(STATE.settings&&STATE.settings.month)||today().slice(0,7);
  var open=num(STATE.settings&&STATE.settings.openingBalance);
  target=String(target||anchor);
  if(target===anchor)return open;
  var guard=0;
  if(cmpMonth(target,anchor)>0){
    var m=anchor;
    while(m!==target&&guard++<240){
      open=open+monthOps(m).delta;
      m=nextMonth(m);
    }
    return open;
  }
  var m2=anchor;
  while(m2!==target&&guard++<240){
    m2=prevMonth(m2);
    open=open-monthOps(m2).delta;
  }
  return open;
}
function computeForMonth(month){
  month=String(month||today().slice(0,7));
  var ops=monthOps(month);
  var open=openingForMonth(month);
  var cash=open+ops.delta;
  var resT=0;(STATE.reserves||[]).forEach(function(r){resT+=num(r.saved);});
  var debt=0;(STATE.debts||[]).forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});
  var obligDue=0,obligPaid=0;
  (STATE.obligations||[]).forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;
    (STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
    obligPaid+=paid;
    obligDue+=Math.max(0,num(ob.amount)-paid);
  });
  var avail=cash-debt-obligDue;
  var t=today(),p=month.split('-').map(Number);
  var last=new Date(p[0],p[1],0).getDate();
  var dayNum=Number(t.slice(8));
  var leftDays=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;
  var daily=avail>0?Math.floor(avail/leftDays):0;
  var by={};
  (STATE.expenses||[]).forEach(function(e){
    if(!inMonth(e.date,month))return;
    var cat=e.category||'Прочее';
    if(cat==='Долг'&&e.note)cat=e.note;
    by[cat]=(by[cat]||0)+num(e.amount);
  });
  var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});
  return{open:open,cash:cash,available:avail,incomeSum:ops.inc,expenseSum:ops.exp,depSum:ops.dep,wdSum:ops.wd,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,cats:cats,month:month};
}
function compute(){return computeForMonth(getViewMonth());}
function ensureMonth(){
  var cur=today().slice(0,7);
  var st=(STATE.settings&&STATE.settings.month)||cur;
  if(!STATE.settings)STATE.settings={};
  if(st===cur)return;
  var guard=0;
  var m=st;
  var open=num(STATE.settings.openingBalance);
  while(m!==cur&&guard++<240){
    open=open+monthOps(m).delta;
    m=nextMonth(m);
  }
  STATE.settings.openingBalance=open;
  STATE.settings.month=cur;
  viewMonth=cur;
  save(true);
  toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён');
}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2800);}window.toast=toast;
/* REST OF APP LOADED FROM FIXED - incomplete if truncated */
console.error('app.js incomplete push');
})();
