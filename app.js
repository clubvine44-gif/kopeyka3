(function(){'use strict';
var KEY='kopeyka3_state_v1',ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'];
var CATS=['Продукты','Связь','Проезд','Жильё','Здоровье','Развлечения','Одежда','Кафе','Подписки','Обязательные','Долг','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Свой вариант'];
var SHIFT_LABEL={day:'День',night:'Ночь',off:'Выходной'};
var MONTHS_RU=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var viewMonth=null,openSecs={ops:1,obl:1,an:0,res:0,debt:0},undoStack=[],UNDO_MAX=30;
function monthLabel(ym){var p=String(ym||'').split('-').map(Number);return (MONTHS_RU[(p[1]||1)-1]||'')+' '+(p[0]||'');}
function shiftMonth(ym,delta){var p=String(ym).split('-').map(Number);var d=new Date(p[0],(p[1]||1)-1+delta,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function getViewMonth(){return viewMonth||(STATE.settings&&STATE.settings.month)||today().slice(0,7);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function num(v){var n=Number(v);return(!isFinite(n)||n!==n)?0:Math.round(n);}
function sane(v){var n=num(v);return Math.abs(n)>5e6?0:n;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"').replace(/'/g,'&#39;');}
function pd(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
function shift(ds,ov){var v=ov&&ov[ds];if(typeof v==='string'&&SHIFT_LABEL[v])return v;return CYCLE[((days(ANCHOR,ds)%6)+6)%6];}
function cleanShifts(ov){var out={};if(!ov||typeof ov!=='object')return out;Object.keys(ov).forEach(function(k){var v=ov[k];if(typeof v==='string'&&SHIFT_LABEL[v])out[k]=v;});return out;}
function inMonth(dateStr,month){return String(dateStr||'').slice(0,7)===month;}
function def(){return{version:6,settings:{openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],shiftsOverride:{},updatedAt:new Date().toISOString()};}
function norm(raw){
  var b=def();if(!raw||typeof raw!=='object')return b;
  var o=Object.assign({},b,raw);o.settings=Object.assign({},b.settings,raw.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  o.shiftsOverride=cleanShifts(o.shiftsOverride);
  o.settings.openingBalance=sane(o.settings.openingBalance);
  o.settings.dayRate=sane(o.settings.dayRate);
  o.settings.nightRate=sane(o.settings.nightRate);
  if(!o.settings.month)o.settings.month=today().slice(0,7);
  o.income=(o.income||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.expenses=(o.expenses||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.reserves=(o.reserves||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Резерв'),category:String(x.category||x.name||'Свой вариант'),saved:sane(x.saved),target:sane(x.target)});});
  o.debts=(o.debts||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Долг'),total:sane(x.total),paid:sane(x.paid)});});
  o.reserveOps=(o.reserveOps||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),type:x.type==='withdraw'?'withdraw':'deposit'});});
  o.obligations=(o.obligations||[]).filter(function(x){return x&&x.id;}).map(function(x){var day=num(x.day);if(day<1)day=1;if(day>31)day=31;return Object.assign({},x,{name:String(x.name||'Платёж'),amount:sane(x.amount),day:day,active:x.active!==false});});
  o.obligationPays=(o.obligationPays||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  return o;
}
function load(){try{var r=localStorage.getItem(KEY);return r?norm(JSON.parse(r)):def();}catch(e){return def();}}
var STATE=load();
function pushUndo(){try{undoStack.push(JSON.stringify(STATE));if(undoStack.length>UNDO_MAX)undoStack.shift();}catch(e){}}
function undoLast(){if(!undoStack.length){toast('Нечего отменять');return;}try{STATE=norm(JSON.parse(undoStack.pop()));save(true);render();toast('Отменено');}catch(e){toast('Не удалось отменить');}}
function save(skipUndo){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();}
window.defaultState=def;window.setAppState=function(s){pushUndo();STATE=norm(s);ensureMonth();save(true);render();};window.saveState=function(){save(true);};
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function computeForMonth(month){
  var open=num(STATE.settings.openingBalance),inc=0,exp=0,dep=0,wd=0,resT=0,debt=0;
  STATE.income.forEach(function(i){if(inMonth(i.date,month))inc+=num(i.amount);});
  STATE.expenses.forEach(function(e){if(inMonth(e.date,month))exp+=num(e.amount);});
  STATE.reserveOps.forEach(function(o){if(!inMonth(o.date,month))return;var a=num(o.amount);if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;});
  STATE.reserves.forEach(function(r){resT+=num(r.saved);});
  var cash=open+inc-exp-dep+wd;
  STATE.debts.forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});
  var obligDue=0,obligPaid=0;
  STATE.obligations.forEach(function(ob){if(ob.active===false)return;var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});obligPaid+=paid;obligDue+=Math.max(0,num(ob.amount)-paid);});
  var avail=cash-debt-obligDue;
  var t=today(),p=month.split('-').map(Number);
  var last=new Date(p[0],p[1],0).getDate();
  var dayNum=Number(t.slice(8));
  var leftDays=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;
  var daily=avail>0?Math.floor(avail/leftDays):0;
  var by={};
  STATE.expenses.forEach(function(e){if(!inMonth(e.date,month))return;var c=e.category||'Прочее';if(c==='Долг'&&e.note)c=e.note;by[c]=(by[c]||0)+num(e.amount);});
  var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});
  return{open:open,cash:cash,available:avail,incomeSum:inc,expenseSum:exp,depSum:dep,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,cats:cats,month:month};
}
function compute(){return computeForMonth(getViewMonth());}
function ensureMonth(){
  var cur=today().slice(0,7);
  var st=(STATE.settings&&STATE.settings.month)||cur;
  if(st===cur)return;
  var prev=computeForMonth(st);
  STATE.settings.openingBalance=num(prev.cash);
  STATE.settings.month=cur;viewMonth=cur;save(true);
  toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён. Резервы и цели сохранены.');
}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2800);}window.toast=toast;
function countShifts(month){var p=month.split('-').map(Number),dim=new Date(p[0],p[1],0).getDate();var day=0,night=0,off=0;for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0');var s=shift(ds,STATE.shiftsOverride);if(s==='day')day++;else if(s==='night')night++;else off++;}return{day:day,night:night,off:off,total:dim};}
function showShiftPay(){
  var month=getViewMonth(),sc=countShifts(month);
  var dr=num(STATE.settings.dayRate),nr=num(STATE.settings.nightRate);
  var pay=sc.day*dr+sc.night*nr;
  var html='<div class="modal-card"><div class="modal-title">Смены · '+monthLabel(month)+'</div><div class="sp-grid">'+'<div class="sp-item"><b>'+sc.day+'</b><span>День</span></div><div class="sp-item"><b>'+sc.night+'</b><span>Ночь</span></div><div class="sp-item"><b>'+sc.off+'</b><span>Выходной</span></div></div>'+'<div class="sp-pay"><div class="muted">Ожидаемая зарплата</div><div class="big" style="font-size:22px">'+fmt(pay)+'</div>'+(dr||nr?'<div class="muted" style="margin-top:6px">день '+fmt(dr)+' · ночь '+fmt(nr)+'</div>':'<div class="muted" style="margin-top:6px">Задай ставки в настройках ⚙</div>')+'</div><button type="button" class="btn-primary" id="spClose">Закрыть</button></div>';
  openModal(html,function(){var c=document.getElementById('spClose');if(c)c.onclick=closeModal;});
}
function openModal(html,bind){var bg=document.getElementById('modalBg');if(!bg)return;bg.innerHTML=html;bg.classList.add('show');bg.onclick=function(e){if(e.target===bg)closeModal();};if(bind)bind();}
function closeModal(){var bg=document.getElementById('modalBg');if(!bg)return;bg.classList.remove('show');bg.innerHTML='';}
function showSettings(){
  var html='<div class="modal-card"><div class="modal-title">Настройки</div>'+
    '<button type="button" class="set-row" id="setUndo"><span>↩ Отменить последнее действие</span><span class="muted">'+(undoStack.length?'есть':'пусто')+'</span></button>'+
    '<button type="button" class="set-row" id="setOpen"><span>Начальный остаток</span><span class="muted">'+fmt(STATE.settings.openingBalance)+'</span></button>'+
    '<button type="button" class="set-row" id="setDay"><span>Ставка за дневную смену</span><span class="muted">'+fmt(STATE.settings.dayRate)+'</span></button>'+
    '<button type="button" class="set-row" id="setNight"><span>Ставка за ночную смену</span><span class="muted">'+fmt(STATE.settings.nightRate)+'</span></button>'+
    '<button type="button" class="set-row danger" id="setClear"><span>Очистить все данные</span></button>'+
    '<button type="button" class="btn-primary" id="setClose">Закрыть</button></div>';
  openModal(html,function(){
    document.getElementById('setClose').onclick=closeModal;
    document.getElementById('setUndo').onclick=function(){closeModal();undoLast();};
    document.getElementById('setOpen').onclick=function(){var o=prompt('Начальный остаток:',String(num(STATE.settings.openingBalance)));if(o===null)return;pushUndo();STATE.settings.openingBalance=num(o);save(true);closeModal();render();toast('Остаток: '+fmt(num(o)));};
    document.getElementById('setDay').onclick=function(){var o=prompt('Оплата за дневную смену:',String(num(STATE.settings.dayRate)));if(o===null)return;pushUndo();STATE.settings.dayRate=num(o);save(true);closeModal();render();toast('День: '+fmt(num(o)));};
    document.getElementById('setNight').onclick=function(){var o=prompt('Оплата за ночную смену:',String(num(STATE.settings.nightRate)));if(o===null)return;pushUndo();STATE.settings.nightRate=num(o);save(true);closeModal();render();toast('Ночь: '+fmt(num(o)));};
    document.getElementById('setClear').onclick=function(){if(!confirm('Точно очистить ВСЕ данные?'))return;pushUndo();STATE=def();save(true);closeModal();render();toast('Данные очищены');};
  });
}
function render(){
  ensureMonth();
  var t=today(),month=getViewMonth(),isCurrent=(month===t.slice(0,7));
  var c=compute();
  var sh=shift(t,STATE.shiftsOverride),sl=SHIFT_LABEL[sh]||'День';
  var app=document.getElementById('app');if(!app)return;
  var ym=month.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();
  var cal='<div class="cal">';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){cal+='<div class="cal-h">'+d+'</div>';});
  for(var i=0;i<sw;i++)cal+='<div class="cal-d other"></div>';
  for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride);
    var hasObl=STATE.obligations.some(function(ob){return ob.active!==false&&num(ob.day)===d;});
    cal+='<div class="cal-d '+s+(ds===t&&isCurrent?' today':'')+(hasObl?' has-obl':'')+'" data-date="'+ds+'">'+d+'<span class="dot"></span></div>';
  }cal+='</div>';
  var resH=STATE.reserves.length?STATE.reserves.map(function(r){var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;return '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b><span class="muted">'+fmt(r.saved)+(r.target?' / '+fmt(r.target)+' · '+pct+'%':'')+'</span></div></div>';}).join(''):'<div class="empty tight">Резервов нет</div>';
  var debH=STATE.debts.length?STATE.debts.map(function(d){var left=Math.max(0,num(d.total)-num(d.paid));return '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b><span class="muted">'+fmt(left)+' из '+fmt(d.total)+'</span></div></div>';}).join(''):'<div class="empty tight">Долгов нет</div>';
  var oblH=STATE.obligations.length?STATE.obligations.map(function(ob){var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});var left=Math.max(0,num(ob.amount)-paid);var isPaid=left<=0;return '<div class="item" data-id="'+ob.id+'" data-k="obl" data-paid="'+(isPaid?'1':'0')+'"><div class="left"><b>'+esc(ob.name)+'</b><span class="muted">'+fmt(ob.amount)+' / мес · '+(isPaid?'✓ оплачено':'до '+ob.day+'-го · '+fmt(left))+'</span></div>'+(isPaid?'<div class="amt plus check-paid">✓</div>':'<div class="amt minus">−'+fmt(left)+'</div>')+'</div>';}).join(''):'<div class="empty tight">Нет платежей</div>';
  var ops=[];STATE.income.forEach(function(i){if(inMonth(i.date,month))ops.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id});});
  STATE.expenses.forEach(function(e){if(!inMonth(e.date,month))return;var label=e.category||'Расход';if(e.category==='Долг'&&e.note)label=e.note;else if(e.note&&e.category==='Обязательные')label=e.note;ops.push({t:e.date,type:'ex',a:e.amount,n:label,id:e.id});});
  ops.sort(function(a,b){return(b.t||'').localeCompare(a.t||'');});
  var opsH=ops.slice(0,12).map(function(o){return '<div class="item" data-id="'+o.id+'" data-k="'+o.type+'"><div class="left"><b>'+esc(o.n)+'</b><span class="muted">'+(o.t||'')+'</span></div><div class="amt '+(o.type==='in'?'plus':'minus')+'">'+(o.type==='in'?'+':'−')+fmt(o.a)+'</div></div>';}).join('')||'<div class="empty tight">Нет операций</div>';
  var colors=['#E5A75E','#60A5FA','#F87171','#4ADE80','#A78BFA','#FBBF24','#F472B6','#2DD4BF'];
  var catH='';if(c.cats.length){var totalCat=c.cats.reduce(function(s,x){return s+x.amount;},0)||1;catH=c.cats.slice(0,6).map(function(x,i){return '<div class="mini-cat"><span class="leg-dot" style="background:'+colors[i%colors.length]+'"></span><span class="leg-name">'+esc(x.name)+'</span><span class="leg-pct">'+Math.round(x.amount/totalCat*100)+'%</span><b>'+fmt(x.amount)+'</b></div>';}).join('');}else catH='<div class="empty tight">Нет расходов</div>';
  function sec(id,title,right,body){var on=!!openSecs[id];return '<div class="sec'+(on?' open':'')+'" data-sec="'+id+'"><button type="button" class="sec-head"><span class="sec-title">'+title+'</span><span class="sec-right">'+right+'</span><span class="sec-chev">›</span></button><div class="sec-body">'+body+'</div></div>';}
  var chips='<span class="chip">остаток '+fmt(c.open)+'</span><span class="chip plus">+'+fmt(c.incomeSum)+'</span><span class="chip minus">−'+fmt(c.expenseSum)+'</span>';
  if(c.depSum)chips+='<span class="chip minus">рез. −'+fmt(c.depSum)+'</span>';if(c.obligDue)chips+='<span class="chip warn">обяз. −'+fmt(c.obligDue)+'</span>';if(c.debtLeft)chips+='<span class="chip warn">долги −'+fmt(c.debtLeft)+'</span>';
  var whyDaily=c.available<=0?'<div class="hint">Сегодня 0 ₽: доступно ≤ 0 (касса минус долги и неоплаченные обязательные). Когда появится свободный остаток — лимит на день рассчитается.</div>':'';
  app.innerHTML='<div class="card hero compact"><div class="hero-top"><div><div class="card-title" style="margin:0">Сегодня · '+sl+'</div><div class="big">'+fmt(c.daily)+'</div><div class="muted">на день · ещё '+c.daysLeft+' дн.</div></div><div class="hero-side"><div class="hs"><b class="'+(c.cash<0?'neg':'')+'">'+fmt(c.cash)+'</b><span>Касса</span></div><div class="hs"><b class="'+(c.available<0?'neg':'')+'">'+fmt(c.available)+'</b><span>Доступно</span></div></div></div><div class="chips">'+chips+'</div>'+whyDaily+'</div>'+
    '<div class="card tight"><div class="month-nav"><button type="button" class="mnav" id="mPrev">‹</button><div class="month-title">'+monthLabel(month)+(isCurrent?'':' · просмотр')+'</div><button type="button" class="mnav" id="mNext">›</button></div>'+cal+'<button type="button" class="btn-shift" id="btnShiftPay">Смены и зарплата</button></div>'+
    sec('obl','Обязательные',(c.obligDue?fmt(c.obligDue):'—'),'<div class="list">'+oblH+'</div>')+sec('res','Резервы и цели',fmt(c.reservesTotal),'<div class="list">'+resH+'</div>')+sec('debt','Долги',(c.debtLeft?fmt(c.debtLeft):'—'),'<div class="list">'+debH+'</div>')+sec('an','Аналитика',fmt(c.expenseSum),catH)+sec('ops','Операции',String(ops.length),'<div class="list">'+opsH+'</div>');
  app.querySelectorAll('.sec-head').forEach(function(btn){btn.onclick=function(e){e.stopPropagation();var secEl=btn.parentElement,id=secEl.dataset.sec;openSecs[id]=!openSecs[id];secEl.classList.toggle('open',!!openSecs[id]);};});
  var mp=document.getElementById('mPrev'),mn=document.getElementById('mNext');
  if(mp)mp.onclick=function(e){e.stopPropagation();viewMonth=shiftMonth(getViewMonth(),-1);render();};
  if(mn)mn.onclick=function(e){e.stopPropagation();viewMonth=shiftMonth(getViewMonth(),1);render();};
  var bsp=document.getElementById('btnShiftPay');if(bsp)bsp.onclick=function(e){e.stopPropagation();showShiftPay();};
  app.querySelectorAll('.cal-d[data-date]').forEach(function(el){el.onclick=function(){if(!isCurrent){viewMonth=t.slice(0,7);render();toast('Вернись к текущему месяцу');return;}pushUndo();var ds=el.dataset.date,cur=shift(ds,STATE.shiftsOverride),n=cur==='day'?'night':cur==='night'?'off':'day';STATE.shiftsOverride[ds]=n;save(true);render();toast('Смена: '+(SHIFT_LABEL[n]||n));};});
  app.querySelectorAll('.item[data-id]').forEach(function(el){el.onclick=function(){
    var id=el.dataset.id,k=el.dataset.k;
    if(k==='in'){if(!confirm('Удалить доход?'))return;pushUndo();STATE.income=STATE.income.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');}
    if(k==='ex'){if(!confirm('Удалить расход?'))return;pushUndo();STATE.expenses=STATE.expenses.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');}
    if(k==='res'){var r=STATE.reserves.find(function(i){return i.id===id;});if(!r)return;var act=prompt('Резерв «'+r.name+'»\n1 — пополнить\n2 — снять\n3 — удалить','1');
      if(act==='3'){if(!confirm('Удалить резерв?'))return;pushUndo();STATE.reserves=STATE.reserves.filter(function(i){return i.id!==id;});STATE.reserveOps=STATE.reserveOps.filter(function(o){return o.reserveId!==id;});save(true);render();toast('Удалено');}
      else if(act==='2'){var a=num(prompt('Снять:','0'));if(a>0&&a<=num(r.saved)){pushUndo();r.saved=num(r.saved)-a;STATE.reserveOps.push({id:uid(),reserveId:id,type:'withdraw',amount:a,date:today()});save(true);render();toast('Снято');}}
      else if(act==='1'){var a2=num(prompt('Пополнить:','0'));if(a2>0){pushUndo();r.saved=num(r.saved)+a2;STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:a2,date:today()});save(true);render();toast('Пополнено');}}}
    if(k==='debt'){var d=STATE.debts.find(function(i){return i.id===id;});if(!d)return;var act=prompt('Долг «'+d.name+'»\n1 — платёж\n2 — удалить','1');
      if(act==='2'){if(!confirm('Удалить долг?'))return;pushUndo();STATE.debts=STATE.debts.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');}
      else{var a=num(prompt('Сумма платежа:','0'));if(a>0){pushUndo();d.paid=num(d.paid)+a;STATE.expenses.push({id:uid(),amount:a,category:'Долг',note:d.name,date:today()});save(true);render();toast('Платёж: '+d.name);}}}
    if(k==='obl'){var ob=STATE.obligations.find(function(i){return i.id===id;});if(!ob)return;
      if(el.dataset.paid==='1'){if(!confirm('Сбросить оплату «'+ob.name+'» за этот месяц?'))return;pushUndo();STATE.obligationPays=STATE.obligationPays.filter(function(p){return !(p.obligId===id&&p.month===month);});STATE.expenses=STATE.expenses.filter(function(e){return !(e.obligId===id&&inMonth(e.date,month));});save(true);render();toast('Оплата сброшена');return;}
      var act=prompt('«'+ob.name+'»\n1 — отметить оплату\n2 — изменить\n3 — удалить','1');
      if(act==='3'){if(!confirm('Удалить?'))return;pushUndo();STATE.obligations=STATE.obligations.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');}
      else if(act==='2'){var nn=prompt('Название:',ob.name);if(nn===null)return;var aa=num(prompt('Сумма:',String(ob.amount)));var dd=num(prompt('День 1–31:',String(ob.day)));if(aa>0&&dd>=1&&dd<=31){pushUndo();ob.name=nn;ob.amount=aa;ob.day=dd;save(true);render();toast('Обновлено');}}
      else{var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===id&&p.month===month)paid+=num(p.amount);});var left=Math.max(0,num(ob.amount)-paid);if(left<=0)return toast('Уже оплачено');var a=num(prompt('Сумма (осталось '+left+'):',String(left)));if(a<=0)return;if(a>left)a=left;pushUndo();STATE.obligationPays.push({id:uid(),obligId:id,month:month,amount:a,date:today()});STATE.expenses.push({id:uid(),amount:a,category:'Обязательные',note:ob.name,date:today(),obligId:id});save(true);render();toast('Оплата учтена');}}
  };});
}
function addIncome(){var a=prompt('Сумма дохода:');if(a===null)return;a=num(a);if(a<=0)return toast('Укажи сумму');var n=prompt('Комментарий:','')||'Доход';pushUndo();STATE.income.push({id:uid(),amount:a,note:n,date:today()});save(true);render();toast('Доход добавлен');}
function addExpense(){var a=prompt('Сумма расхода:');if(a===null)return;a=num(a);if(a<=0)return toast('Укажи сумму');var cat=prompt('Категория:\n'+CATS.join(', '),'Продукты')||'Прочее';pushUndo();STATE.expenses.push({id:uid(),amount:a,category:cat,note:'',date:today()});save(true);render();toast('Расход добавлен');}
function addReserve(){var cat=prompt('Категория:\n'+RES_PRESETS.map(function(x,i){return(i+1)+' — '+x;}).join('\n'),'1');if(cat===null)return;var name,n=num(cat);if(n>=1&&n<=RES_PRESETS.length){name=RES_PRESETS[n-1];if(name==='Свой вариант'){name=prompt('Название:');if(!name)return;}}else name=String(cat).trim();if(!name)return;var t=num(prompt('Цель (0 если без цели):','0'));var s=num(prompt('Уже накоплено:','0'));var id=uid();pushUndo();STATE.reserves.push({id:id,name:name,category:name,target:t,saved:s});if(s>0)STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:s,date:today()});save(true);render();toast('Резерв «'+name+'» создан — переносится на все месяцы');}
function addDebt(){var n=prompt('Название долга:');if(!n)return;var t=num(prompt('Сумма:'));if(t<=0)return toast('Укажи сумму');pushUndo();STATE.debts.push({id:uid(),name:n,total:t,paid:0});save(true);render();toast('Долг добавлен');}
function addObligation(){var n=prompt('Название (Алименты, Аренда…):');if(!n)return;var a=num(prompt('Сумма каждый месяц:'));if(a<=0)return toast('Укажи сумму');var d=num(prompt('Число месяца (1–31):','25'));if(d<1||d>31)return toast('День 1–31');pushUndo();STATE.obligations.push({id:uid(),name:n,amount:a,day:d,active:true});save(true);render();toast('Обязательный платёж добавлен');}
function setup(){var fab=document.getElementById('fab'),radial=document.getElementById('radial');if(fab&&radial){fab.onclick=function(){var o=radial.classList.toggle('show');fab.classList.toggle('open',o);};radial.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){radial.classList.remove('show');fab.classList.remove('open');var a=btn.dataset.act;if(a==='income')addIncome();else if(a==='expense')addExpense();else if(a==='reserve')addReserve();else if(a==='debt')addDebt();else if(a==='oblig')addObligation();};});}var bs=document.getElementById('btnSettings');if(bs)bs.onclick=function(){showSettings();};}
function boot(){try{STATE=norm(STATE);ensureMonth();var c=compute();if(STATE.income.length===0&&STATE.expenses.length===0&&c.cash<0&&!STATE.obligations.length&&!STATE.reserves.length){STATE=def();save(true);}else if(Math.abs(c.cash)>2e6||Math.abs(c.open)>2e6){STATE=def();save(true);}}catch(e){STATE=def();}setup();render();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
