(function(){'use strict';
var KEY='kopeyka3_state_v1',ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'];
var CATS=['Продукты','Связь','Проезд','Жильё','Здоровье','Развлечения','Одежда','Кафе','Подписки','Обязательные','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Свой вариант'];
var SHIFT_LABEL={day:'День',night:'Ночь',off:'Выходной'};
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function num(v){var n=Number(v);return(!isFinite(n)||n!==n)?0:Math.round(n);}
function sane(v){var n=num(v);return Math.abs(n)>5e6?0:n;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&'+'amp;').replace(/</g,'&'+'lt;').replace(/>/g,'&'+'gt;').replace(/"/g,'&'+'quot;').replace(/'/g,'&#39;');}
function pd(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
function shift(ds,ov){var v=ov&&ov[ds];if(typeof v==='string'&&SHIFT_LABEL[v])return v;return CYCLE[((days(ANCHOR,ds)%6)+6)%6];}
function cleanShifts(ov){var out={};if(!ov||typeof ov!=='object')return out;Object.keys(ov).forEach(function(k){var v=ov[k];if(typeof v==='string'&&SHIFT_LABEL[v])out[k]=v;});return out;}
function inMonth(dateStr,month){return String(dateStr||'').slice(0,7)===month;}
function def(){return{version:4,settings:{openingBalance:0,month:today().slice(0,7)},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],shiftsOverride:{},updatedAt:new Date().toISOString()};}
function norm(raw){
  var b=def();if(!raw||typeof raw!=='object')return b;
  var o=Object.assign({},b,raw);o.settings=Object.assign({},b.settings,raw.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  o.shiftsOverride=cleanShifts(o.shiftsOverride);
  o.settings.openingBalance=sane(o.settings.openingBalance);
  if(!o.settings.month)o.settings.month=today().slice(0,7);
  o.income=(o.income||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.expenses=(o.expenses||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.reserves=(o.reserves||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Резерв'),category:String(x.category||x.name||'Свой вариант'),saved:sane(x.saved),target:sane(x.target)});});
  o.debts=(o.debts||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Долг'),total:sane(x.total),paid:sane(x.paid)});});
  o.reserveOps=(o.reserveOps||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),type:x.type==='withdraw'?'withdraw':'deposit'});});
  o.obligations=(o.obligations||[]).filter(function(x){return x&&x.id;}).map(function(x){
    var day=num(x.day);if(day<1)day=1;if(day>31)day=31;
    return Object.assign({},x,{name:String(x.name||'Платёж'),amount:sane(x.amount),day:day,active:x.active!==false});
  });
  o.obligationPays=(o.obligationPays||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  return o;
}
function load(){try{var r=localStorage.getItem(KEY);return r?norm(JSON.parse(r)):def();}catch(e){return def();}}
var STATE=load();
function save(){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}
if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();}
window.defaultState=def;window.setAppState=function(s){STATE=norm(s);ensureMonth();save();render();};window.saveState=save;
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function computeForMonth(month){
  var open=num(STATE.settings.openingBalance),inc=0,exp=0,dep=0,wd=0,resT=0,debt=0;
  STATE.income.forEach(function(i){if(inMonth(i.date,month))inc+=num(i.amount);});
  STATE.expenses.forEach(function(e){if(inMonth(e.date,month))exp+=num(e.amount);});
  STATE.reserveOps.forEach(function(o){
    if(!inMonth(o.date,month))return;
    var a=num(o.amount);if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;
  });
  STATE.reserves.forEach(function(r){resT+=num(r.saved);});
  var cash=open+inc-exp-dep+wd;
  STATE.debts.forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});
  var obligDue=0,obligPaid=0;
  STATE.obligations.forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;
    STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
    obligPaid+=paid;
    var left=Math.max(0,num(ob.amount)-paid);
    obligDue+=left;
  });
  var avail=cash-debt-obligDue;
  var t=today(),p=month.split('-').map(Number);
  var last=new Date(p[0],p[1],0).getDate();
  var dayNum=Number(t.slice(8));
  var leftDays=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;
  var daily=avail>0?Math.floor(avail/leftDays):0;
  var by={};
  STATE.expenses.forEach(function(e){
    if(!inMonth(e.date,month))return;
    var c=e.category||'Прочее';by[c]=(by[c]||0)+num(e.amount);
  });
  if(obligPaid>0)by['Обязательные']=(by['Обязательные']||0)+obligPaid;
  var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});
  return{open:open,cash:cash,available:avail,incomeSum:inc,expenseSum:exp,depSum:dep,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,cats:cats,month:month};
}
function compute(){return computeForMonth((STATE.settings&&STATE.settings.month)||today().slice(0,7));}
function ensureMonth(){
  var cur=today().slice(0,7);
  var st=(STATE.settings&&STATE.settings.month)||cur;
  if(st===cur)return;
  var prev=computeForMonth(st);
  STATE.settings.openingBalance=num(prev.cash);
  STATE.settings.month=cur;
  save();
  toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён');
}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2600);}
window.toast=toast;
function render(){
  ensureMonth();
  var c=compute(),t=today(),month=(STATE.settings&&STATE.settings.month)||t.slice(0,7);
  var sh=shift(t,STATE.shiftsOverride),sl=SHIFT_LABEL[sh]||'День';
  var app=document.getElementById('app');if(!app)return;
  var ym=month.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();
  var cal='<div class="cal">';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){cal+='<div class="cal-h">'+d+'</div>';});
  for(var i=0;i<sw;i++)cal+='<div class="cal-d other"></div>';
  for(var d=1;d<=dim;d++){
    var ds=month+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride);
    var hasObl=STATE.obligations.some(function(ob){return ob.active!==false&&num(ob.day)===d;});
    cal+='<div class="cal-d '+s+(ds===t?' today':'')+(hasObl?' has-obl':'')+'" data-date="'+ds+'">'+d+'<span class="dot"></span></div>';
  }cal+='</div>';
  var resH=STATE.reserves.length?STATE.reserves.map(function(r){
    var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;
    return '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b><span class="muted">'+(r.category&&r.category!==r.name?esc(r.category)+' · ':'')+fmt(r.saved)+(r.target?' / '+fmt(r.target):'')+(r.target?' · '+pct+'%':'')+'</span></div></div>';
  }).join(''):'<div class="empty">Резервов нет — нажми +</div>';
  var debH=STATE.debts.length?STATE.debts.map(function(d){
    var left=Math.max(0,num(d.total)-num(d.paid));
    return '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b><span class="muted">'+fmt(left)+' из '+fmt(d.total)+'</span></div></div>';
  }).join(''):'<div class="empty">Долгов нет</div>';
  var oblH=STATE.obligations.length?STATE.obligations.map(function(ob){
    var paid=0;
    STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
    var left=Math.max(0,num(ob.amount)-paid);
    var status=left<=0?'✓ оплачено':'до '+ob.day+'-го · осталось '+fmt(left);
    return '<div class="item" data-id="'+ob.id+'" data-k="obl"><div class="left"><b>'+esc(ob.name)+'</b><span class="muted">'+fmt(ob.amount)+' / мес · '+status+'</span></div>'+(left>0?'<div class="amt minus">−'+fmt(left)+'</div>':'<div class="amt plus">✓</div>')+'</div>';
  }).join(''):'<div class="empty">Обязательных платежей нет</div>';
  var ops=[];
  STATE.income.forEach(function(i){if(inMonth(i.date,month))ops.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id});});
  STATE.expenses.forEach(function(e){if(inMonth(e.date,month))ops.push({t:e.date,type:'ex',a:e.amount,n:e.category||'Расход',id:e.id});});
  ops.sort(function(a,b){return(b.t||'').localeCompare(a.t||'');});
  var opsH=ops.slice(0,15).map(function(o){return '<div class="item" data-id="'+o.id+'" data-k="'+o.type+'"><div class="left"><b>'+esc(o.n)+'</b><span class="muted">'+(o.t||'')+'</span></div><div class="amt '+(o.type==='in'?'plus':'minus')+'">'+(o.type==='in'?'+':'−')+fmt(o.a)+'</div></div>';}).join('')||'<div class="empty">Нет операций в этом месяце</div>';
  var catH='';
  if(c.cats.length){
    var max=c.cats[0].amount||1;
    catH=c.cats.map(function(x){var pct=Math.round(x.amount/max*100);return '<div class="cat-row"><div class="cat-top"><span>'+esc(x.name)+'</span><b>'+fmt(x.amount)+'</b></div><div class="progress"><i style="width:'+pct+'%"></i></div></div>';}).join('');
  }else catH='<div class="empty">Пока нет расходов</div>';
  app.innerHTML=
    '<div class="card hero"><div class="row" style="margin-bottom:8px"><div class="card-title" style="margin:0">Сегодня · '+sl+'</div><span class="pill '+sh+'">'+sl+'</span></div><div class="big">'+fmt(c.daily)+'</div><div class="muted">можно потратить сегодня · ещё '+c.daysLeft+' дн.</div></div>'+
    '<div class="card"><div class="grid2"><div class="stat"><b class="'+(c.cash<0?'neg':'')+'">'+fmt(c.cash)+'</b><span>Касса</span></div><div class="stat"><b class="'+(c.available<0?'neg':'')+'">'+fmt(c.available)+'</b><span>Доступно</span></div></div>'+
    '<div style="margin-top:12px;font-size:13px">'+
    '<div class="row"><span class="muted">Остаток на начало</span><b>'+fmt(c.open)+'</b></div>'+
    '<div class="row"><span class="muted">Доходы</span><b class="plus">+'+fmt(c.incomeSum)+'</b></div>'+
    '<div class="row"><span class="muted">Расходы</span><b class="minus">−'+fmt(c.expenseSum)+'</b></div>'+
    (c.depSum?('<div class="row"><span class="muted">В резервы</span><b class="minus">−'+fmt(c.depSum)+'</b></div>'):'')+
    (c.obligDue?('<div class="row"><span class="muted">Обязательные (ещё)</span><b class="minus">−'+fmt(c.obligDue)+'</b></div>'):'')+
    (c.debtLeft?('<div class="row"><span class="muted">Долги</span><b class="minus">−'+fmt(c.debtLeft)+'</b></div>'):'')+
    '</div></div>'+
    '<div class="card"><div class="card-title">Куда уходят деньги</div>'+catH+'</div>'+
    '<div class="card"><div class="card-title">Обязательные платежи'+(c.obligDue?' · ещё '+fmt(c.obligDue):'')+'</div><div class="list">'+oblH+'</div></div>'+
    '<div class="card"><div class="card-title">Календарь · '+month+'</div>'+cal+'</div>'+
    '<div class="card"><div class="card-title">Резервы · '+fmt(c.reservesTotal)+'</div><div class="list">'+resH+'</div></div>'+
    '<div class="card"><div class="card-title">Долги · '+fmt(c.debtLeft)+'</div><div class="list">'+debH+'</div></div>'+
    '<div class="card"><div class="card-title">Операции · '+month+'</div><div class="list">'+opsH+'</div></div>';
  app.querySelectorAll('.cal-d[data-date]').forEach(function(el){el.onclick=function(){var ds=el.dataset.date,cur=shift(ds,STATE.shiftsOverride),n=cur==='day'?'night':cur==='night'?'off':'day';STATE.shiftsOverride[ds]=n;save();render();toast('Смена: '+(SHIFT_LABEL[n]||n));};});
  app.querySelectorAll('.item[data-id]').forEach(function(el){el.onclick=function(){var id=el.dataset.id,k=el.dataset.k;
    if(k==='in'){if(confirm('Удалить доход?')){STATE.income=STATE.income.filter(function(i){return i.id!==id;});save();render();}}
    if(k==='ex'){if(confirm('Удалить расход?')){STATE.expenses=STATE.expenses.filter(function(i){return i.id!==id;});save();render();}}
    if(k==='res'){var r=STATE.reserves.find(function(i){return i.id===id;});if(!r)return;
      var act=prompt('Резерв «'+r.name+'»\n1 — пополнить\n2 — снять\n3 — удалить\nВведи 1, 2 или 3:','1');
      if(act==='3'){if(confirm('Удалить резерв?')){STATE.reserves=STATE.reserves.filter(function(i){return i.id!==id;});STATE.reserveOps=STATE.reserveOps.filter(function(o){return o.reserveId!==id;});save();render();toast('Удалено');}}
      else if(act==='2'){var a=num(prompt('Снять сумму:','0'));if(a>0&&a<=num(r.saved)){r.saved=num(r.saved)-a;STATE.reserveOps.push({id:uid(),reserveId:id,type:'withdraw',amount:a,date:today()});save();render();toast('Снято');}}
      else if(act==='1'){var a=num(prompt('Пополнить на:','0'));if(a>0){r.saved=num(r.saved)+a;STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:a,date:today()});save();render();toast('Пополнено');}}
    }
    if(k==='debt'){var d=STATE.debts.find(function(i){return i.id===id;});if(!d)return;
      var act=prompt('Долг «'+d.name+'»\n1 — платёж\n2 — удалить\nВведи 1 или 2:','1');
      if(act==='2'){if(confirm('Удалить долг?')){STATE.debts=STATE.debts.filter(function(i){return i.id!==id;});save();render();toast('Удалено');}}
      else{var a=num(prompt('Сумма платежа:','0'));if(a>0){d.paid=num(d.paid)+a;STATE.expenses.push({id:uid(),amount:a,category:'Прочее',note:'Платёж: '+d.name,date:today()});save();render();toast('Платёж учтён');}}
    }
    if(k==='obl'){var ob=STATE.obligations.find(function(i){return i.id===id;});if(!ob)return;
      var act=prompt('«'+ob.name+'» '+fmt(ob.amount)+' каждый месяц до '+ob.day+'-го\n1 — отметить оплату\n2 — изменить\n3 — удалить\nВведи 1, 2 или 3:','1');
      if(act==='3'){if(confirm('Удалить обязательный платёж?')){STATE.obligations=STATE.obligations.filter(function(i){return i.id!==id;});save();render();toast('Удалено');}}
      else if(act==='2'){
        var nn=prompt('Название:',ob.name);if(nn===null)return;
        var aa=num(prompt('Сумма в месяц:',String(ob.amount)));if(aa<=0)return toast('Сумма нужна');
        var dd=num(prompt('Число месяца (1–31):',String(ob.day)));if(dd<1||dd>31)return toast('День 1–31');
        ob.name=nn;ob.amount=aa;ob.day=dd;save();render();toast('Обновлено');
      } else {
        var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===id&&p.month===month)paid+=num(p.amount);});
        var left=Math.max(0,num(ob.amount)-paid);
        if(left<=0)return toast('Уже оплачено в этом месяце');
        var a=num(prompt('Сумма оплаты (осталось '+left+'):',String(left)));if(a<=0)return;
        if(a>left)a=left;
        STATE.obligationPays.push({id:uid(),obligId:id,month:month,amount:a,date:today()});
        STATE.expenses.push({id:uid(),amount:a,category:'Обязательные',note:ob.name,date:today(),obligId:id});
        save();render();toast('Оплата учтена');
      }
    }
  };});
}
function addIncome(){var a=prompt('Сумма дохода:');if(a===null)return;a=num(a);if(a<=0)return toast('Укажи сумму');var n=prompt('Комментарий:','')||'Доход';STATE.income.push({id:uid(),amount:a,note:n,date:today()});save();render();toast('Доход добавлен');}
function addExpense(){var a=prompt('Сумма расхода:');if(a===null)return;a=num(a);if(a<=0)return toast('Укажи сумму');var cat=prompt('Категория:\n'+CATS.join(', ')+'\n','Продукты')||'Прочее';STATE.expenses.push({id:uid(),amount:a,category:cat,note:'',date:today()});save();render();toast('Расход добавлен');}
function addReserve(){
  var cat=prompt('Категория резерва:\n'+RES_PRESETS.map(function(x,i){return(i+1)+' — '+x;}).join('\n')+'\nВведи номер или своё название:','1');
  if(cat===null)return;
  var name;
  var n=num(cat);
  if(n>=1&&n<=RES_PRESETS.length){
    name=RES_PRESETS[n-1];
    if(name==='Свой вариант'){name=prompt('Название цели:');if(!name)return;}
  }else name=String(cat).trim();
  if(!name)return;
  var t=num(prompt('Цель накопления (0 если без цели):','0'));
  var s=num(prompt('Уже накоплено:','0'));
  var id=uid();
  STATE.reserves.push({id:id,name:name,category:name,target:t,saved:s});
  if(s>0)STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:s,date:today()});
  save();render();toast('Резерв «'+name+'» создан');
}
function addDebt(){var n=prompt('Название долга:');if(!n)return;var t=num(prompt('Сумма долга:'));if(t<=0)return toast('Укажи сумму');STATE.debts.push({id:uid(),name:n,total:t,paid:0});save();render();toast('Долг добавлен');}
function addObligation(){
  var n=prompt('Название (например: Алименты, Аренда, Кредит):');if(!n)return;
  var a=num(prompt('Сумма каждый месяц:'));if(a<=0)return toast('Укажи сумму');
  var d=num(prompt('Число месяца оплаты (1–31):','25'));if(d<1||d>31)return toast('День должен быть от 1 до 31');
  STATE.obligations.push({id:uid(),name:n,amount:a,day:d,active:true});
  save();render();toast('Обязательный платёж добавлен');
}
function setup(){
  var fab=document.getElementById('fab'),radial=document.getElementById('radial');
  if(fab&&radial){
    fab.onclick=function(){var o=radial.classList.toggle('show');fab.classList.toggle('open',o);};
    radial.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){radial.classList.remove('show');fab.classList.remove('open');
      var a=btn.dataset.act;
      if(a==='income')addIncome();
      else if(a==='expense')addExpense();
      else if(a==='reserve')addReserve();
      else if(a==='debt')addDebt();
      else if(a==='oblig')addObligation();
    };});
  }
  var bm=document.getElementById('btnMonth');
  if(bm)bm.onclick=function(){
    var act=prompt('1 — начальный остаток\n2 — очистить ВСЕ данные\nВведи 1 или 2:','1');
    if(act==='2'){
      if(confirm('Точно очистить все данные?')){STATE=def();save();render();toast('Данные очищены');}
    }else{
      var o=prompt('Начальный остаток (сейчас '+num(STATE.settings.openingBalance)+'):',String(num(STATE.settings.openingBalance)));
      if(o===null)return;STATE.settings.openingBalance=num(o);save();render();toast('Остаток: '+fmt(num(o)));
    }
  };
}
function boot(){
  try{
    STATE=norm(STATE);
    ensureMonth();
    var c=compute();
    if(STATE.income.length===0&&STATE.expenses.length===0&&c.cash<0&&STATE.obligations.length===0&&STATE.reserves.length===0){
      STATE=def();save();
    }else if(Math.abs(c.cash)>2e6||Math.abs(c.open)>2e6){STATE=def();save();}
  }catch(e){STATE=def();}
  setup();render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
