(function(){'use strict';
var KEY='kopeyka3_state_v1',ANCHOR='2026-08-17',CYCLE=['day','day','night','night','off','off'];
var CATS=['Продукты','Алкоголь','Сигареты','Хозтовары','Бытовая химия','Кафе','Связь','Проезд','Жильё','Здоровье','Красота','Одежда','Развлечения','Подписки','Техника','Дети','Животные','Обязательные','Долг','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Свой вариант'];
var SHIFT_LABEL={day:'День',night:'Ночь',off:'Выходной'};
var _renderQueued=false,_rafRender=null;
var MONTHS_RU=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var viewMonth=null,currentView='home',openSecs={ops:1,obl:1,an:0,res:0,debt:0},undoStack=[],UNDO_MAX=30;
function monthLabel(ym){var p=String(ym||'').split('-').map(Number);return (MONTHS_RU[(p[1]||1)-1]||'')+' '+(p[0]||'');}
function shiftMonth(ym,delta){var p=String(ym).split('-').map(Number);var d=new Date(p[0],(p[1]||1)-1+delta,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function getViewMonth(){var m=viewMonth||(STATE.settings&&STATE.settings.month)||today().slice(0,7);window.__kopeykaViewMonth=m;return m;}
function goView(v){try{if((currentView||'home')==='home'){window.__homeScroll=window.scrollY||document.documentElement.scrollTop||0;}}catch(e){}currentView=v||'home';window.__finView=currentView;try{history.pushState({view:currentView},'');}catch(e){}render();}
function goHome(){currentView='home';window.__finView='home';render();}
window.addEventListener('popstate',function(){currentView='home';render();});

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function num(v){
  if(typeof v==='number')return isFinite(v)?Math.round(v):0;
  var s=String(v==null?'':v).trim().replace(/\s/g,'').replace(',','.');
  var n=Number(s);
  return(!isFinite(n)||n!==n)?0:Math.round(n);
}
function sane(v){return num(v);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&'+'amp;').replace(/</g,'&'+'lt;').replace(/>/g,'&'+'gt;').replace(/\"/g,'&'+'quot;').replace(/'/g,'&#39;');}
function pd(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
function shift(ds,ov){var v=ov&&ov[ds];if(typeof v==='string'&&SHIFT_LABEL[v])return v;return CYCLE[((days(ANCHOR,ds)%6)+6)%6];}window.shift=shift;window.SHIFT_LABEL=SHIFT_LABEL;
function cleanShifts(ov){var out={};if(!ov||typeof ov!=='object')return out;Object.keys(ov).forEach(function(k){var v=ov[k];if(typeof v==='string'&&SHIFT_LABEL[v])out[k]=v;});return out;}
function inMonth(dateStr,month){return String(dateStr||'').slice(0,7)===month;}
function def(){return{version:6,settings:{openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0,paydayDay:null,limitHorizon:'payday',shiftNotifHour:20,shiftNotifMinute:0,shiftNotifEnabled:true,userName:''},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],voiceMap:{},shiftsOverride:{},dayPlans:{},updatedAt:new Date().toISOString()};}
function norm(raw){
  var b=def();if(!raw||typeof raw!=='object')return b;
  var o=Object.assign({},b,raw);o.settings=Object.assign({},b.settings,raw.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  o.shiftsOverride=cleanShifts(o.shiftsOverride);if(!o.voiceMap||typeof o.voiceMap!=='object')o.voiceMap={};
  if(!o.dayPlans||typeof o.dayPlans!=='object'||Array.isArray(o.dayPlans))o.dayPlans={};
  if(o.lastOp&&typeof o.lastOp!=='object')o.lastOp=null;
  o.settings.openingBalance=sane(o.settings.openingBalance);
  o.settings.dayRate=sane(o.settings.dayRate);
  o.settings.nightRate=sane(o.settings.nightRate);
  if(o.settings.paydayDay!=null&&o.settings.paydayDay!==''){var pd=num(o.settings.paydayDay);o.settings.paydayDay=(pd>=1&&pd<=31)?pd:null;}else o.settings.paydayDay=null;
  if(o.settings.limitHorizon!=='month'&&o.settings.limitHorizon!=='payday')o.settings.limitHorizon=(o.settings.paydayDay? 'payday':'month');
  if(o.settings.shiftNotifHour==null||o.settings.shiftNotifHour==='')o.settings.shiftNotifHour=20;else o.settings.shiftNotifHour=Math.min(23,Math.max(0,num(o.settings.shiftNotifHour)));
  if(o.settings.shiftNotifMinute==null||o.settings.shiftNotifMinute==='')o.settings.shiftNotifMinute=0;else o.settings.shiftNotifMinute=Math.min(59,Math.max(0,num(o.settings.shiftNotifMinute)));
  if(o.settings.shiftNotifEnabled==null)o.settings.shiftNotifEnabled=true;
  if(o.settings.userName==null)o.settings.userName='';
  else o.settings.userName=String(o.settings.userName||'').trim().slice(0,40);
  if(!o.settings.month)o.settings.month=today().slice(0,7);
  o.income=(o.income||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.expenses=(o.expenses||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  o.reserves=(o.reserves||[]).filter(function(x){return x&&x.id;}).map(function(x){var u=!!x.urgent;var ud=x.urgentDate&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.urgentDate))?String(x.urgentDate):'';return Object.assign({},x,{name:String(x.name||'Резерв'),category:String(x.category||x.name||'Свой вариант'),saved:sane(x.saved),target:sane(x.target),urgent:u,urgentDate:ud});});
  o.debts=(o.debts||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{name:String(x.name||'Долг'),total:sane(x.total),paid:sane(x.paid)});});
  o.reserveOps=(o.reserveOps||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount),type:x.type==='withdraw'?'withdraw':'deposit'});});
  o.obligations=(o.obligations||[]).filter(function(x){return x&&x.id;}).map(function(x){var day=num(x.day);if(day<1)day=1;if(day>31)day=31;return Object.assign({},x,{name:String(x.name||'Платёж'),amount:sane(x.amount),day:day,active:x.active!==false});});
  o.obligationPays=(o.obligationPays||[]).filter(function(x){return x&&x.id;}).map(function(x){return Object.assign({},x,{amount:sane(x.amount)});});
  if(!o._deleted||typeof o._deleted!=='object')o._deleted={};
  if(!Array.isArray(o.opLog))o.opLog=[];
  return o;
}
function load(){try{var r=localStorage.getItem(KEY);return r?norm(JSON.parse(r)):def();}catch(e){return def();}}
var STATE=load();
function pushUndo(){try{undoStack.push(JSON.stringify(STATE));if(undoStack.length>UNDO_MAX)undoStack.shift();}catch(e){}}
function trackLastOp(kind,id){try{STATE.lastOp={kind:kind,id:id,at:Date.now()};}catch(e){}}
function pinCurrentMonth(){try{viewMonth=today().slice(0,7);if(STATE.settings)STATE.settings.month=viewMonth;}catch(e){}}
function stampOp(o){if(!o||typeof o!=='object')return o;if(!o.createdAt)o.createdAt=Date.now();if(!o.date)o.date=today();return o;}

function debtExpenseLinked(e, d, nameHint){
  if(!e||!d)return false;
  if(e.debtId&&e.debtId===d.id)return true;
  if(e.category!=='Долг')return false;
  var note=String(e.note||'').toLowerCase().replace(/ё/g,'е').trim();
  var nm=String(nameHint||d.name||'').toLowerCase().replace(/ё/g,'е').trim();
  if(!note||!nm)return false;
  return note===nm||note.indexOf(nm)>=0||nm.indexOf(note)>=0;
}
/** Сводит кассу и расходы к newPaid.
 *  Уменьшение paid → касса растёт (снимаем расходы или добавляем доход-возврат).
 *  Увеличение paid → касса падает (добавляем расход). */
function syncDebtPaid(d, newPaid, nameHint){
  if(!d)return;
  newPaid=num(newPaid);
  if(newPaid<0)newPaid=0;
  var tot=num(d.total);
  if(newPaid>tot)newPaid=tot;
  var oldPaid=num(d.paid);
  d.paid=newPaid;
  var cashDelta=newPaid-oldPaid; // >0 нужно списать с кассы, <0 вернуть в кассу
  if(!cashDelta)return;
  if(!STATE.expenses)STATE.expenses=[];
  if(!STATE.income)STATE.income=[];
  var matchName=nameHint!=null?nameHint:d.name;
  if(cashDelta>0){
    var opId=uid();
    STATE.expenses.push({id:opId,amount:cashDelta,category:'Долг',note:d.name,date:today(),debtId:d.id});
    trackLastOp('expense',opId);
    return;
  }
  // Возврат в кассу: сначала пытаемся убрать связанные расходы, остаток — доходом
  var need=-cashDelta;
  var drop={};
  for(var i=STATE.expenses.length-1;i>=0&&need>0;i--){
    var e=STATE.expenses[i];
    if(!debtExpenseLinked(e,d,matchName))continue;
    var a=num(e.amount);
    if(a<=0)continue;
    if(a<=need){drop[e.id]=1;need-=a;}
    else{e.amount=a-need;need=0;}
  }
  if(Object.keys(drop).length)STATE.expenses=STATE.expenses.filter(function(x){return !drop[x.id];});
  // Всегда возвращаем остаток доходом — даже если расходов не нашли
  if(need>0){
    var iid=uid();
    STATE.income.push({id:iid,amount:need,note:'Возврат по долгу «'+d.name+'»',date:today(),debtId:d.id,fromDebtAdjust:true});
    trackLastOp('income',iid);
  }
}

function undoLast(){if(!undoStack.length){toast('Нечего отменять');return;}try{STATE=norm(JSON.parse(undoStack.pop()));save(true);render();toast('Отменено');}catch(e){toast('Не удалось отменить');}}
function ensureOpLog(){if(!STATE.opLog||!Array.isArray(STATE.opLog))STATE.opLog=[];}
function logOpChange(kind,id,action,note){
  ensureOpLog();
  STATE.opLog.unshift({id:String(id||''),kind:kind,action:action,note:String(note||''),at:new Date().toISOString()});
  if(STATE.opLog.length>200)STATE.opLog=STATE.opLog.slice(0,200);
}
function markEdited(arr,id){
  var item=(arr||[]).find(function(x){return x.id===id;});
  if(item){item.editedAt=new Date().toISOString();item.deleted=false;}
  return item;
}
function tombstone(collection,id){
  if(!STATE._deleted||typeof STATE._deleted!=='object')STATE._deleted={};
  if(!STATE._deleted[collection]||typeof STATE._deleted[collection]!=='object')STATE._deleted[collection]={};
  STATE._deleted[collection][String(id)]=Date.now();
}
function softDeleteIn(arrKey,id,kind,note){
  var arr=STATE[arrKey]||[];
  var row=arr.find(function(x){return x.id===id;});
  if(!row)return null;
  row.deleted=true;
  row.deletedAt=new Date().toISOString();
  tombstone(arrKey,id);
  logOpChange(kind,id,'deleted',note||row.note||row.name||'');
  return row;
}

function save(skipUndo){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();syncReminders();}
function computeReminders(){
  var out=[],t=today(),day=Number(t.slice(8)),month=(STATE.settings&&STATE.settings.month)||t.slice(0,7);
  (STATE.obligations||[]).forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
    var remain=Math.max(0,num(ob.amount)-paid);if(remain<=0)return;
    var y=Number(t.slice(0,4)),m=Number(t.slice(5,7)),dim=new Date(y,m,0).getDate(),d=Math.min(Math.max(1,num(ob.day)||1),dim);
    if(d<day){m+=1;if(m>12){m=1;y+=1;}var dim2=new Date(y,m,0).getDate();d=Math.min(Math.max(1,num(ob.day)||1),dim2);}
    var dateStr=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var daysLeft=days(t,dateStr);
    var immediate=daysLeft<=3;
    out.push({id:'obl_'+String(ob.id)+'_'+dateStr,date:dateStr+'T09:00',title:immediate?'Важно · критическое':'Финна · платёж',message:ob.name+' — '+fmt(remain)+(daysLeft<=0?' · сегодня':(daysLeft===1?' · завтра':' · через '+daysLeft+' дн.')),critical:immediate,immediate:daysLeft<=0,priority:immediate?'critical':'normal'});
  });
  try{
    if(STATE.settings&&STATE.settings.shiftNotifEnabled!==false){
      var hour=num(STATE.settings.shiftNotifHour);if(hour<0||hour>23)hour=20;
      var minute=num(STATE.settings.shiftNotifMinute);if(minute<0||minute>59)minute=0;
      var tom=new Date();tom.setDate(tom.getDate()+1);
      var tds=tom.getFullYear()+'-'+String(tom.getMonth()+1).padStart(2,'0')+'-'+String(tom.getDate()).padStart(2,'0');
      var shT=shift(tds,STATE.shiftsOverride);var shLabel=SHIFT_LABEL[shT]||shT;
      var fire=new Date();fire.setHours(hour,minute,0,0);
      if(fire.getTime()>Date.now()){
        var fireStr=fire.getFullYear()+'-'+String(fire.getMonth()+1).padStart(2,'0')+'-'+String(fire.getDate()).padStart(2,'0')+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
        var msg='Завтра: '+shLabel+(shT==='off'?'':' смена');
        out.push({id:'shift_tomorrow',date:fireStr,title:'Финна · смена',message:msg,critical:false,immediate:false});
      }
    }
  }catch(e){}
  (STATE.reserves||[]).forEach(function(r){
    if(!r||!r.urgent||!r.urgentDate||r.deleted)return;
    var need=Math.max(0,num(r.target)-num(r.saved));
    var left=days(t,r.urgentDate);
    var msgNeed=need>0?(' Нужно пополнить из кассы ещё '+fmt(need)+'.'):' Цель уже накоплена — проверь резерв.';
    function pushRes(suffix, whenDate, daysLabel, imm){
      out.push({
        id:'urgent_res_'+r.id+'_'+suffix+'_'+r.urgentDate,
        date:whenDate,
        title:'Важно · критическое',
        message:'Срочный резерв «'+r.name+'» '+daysLabel+'.'+msgNeed,
        critical:true,
        immediate:!!imm,
        priority:'critical'
      });
    }
    if(left<0){
      pushRes('over', t+'T09:00', 'просрочен на '+Math.abs(left)+' дн.', true);
    }else if(left===0){
      pushRes('d0', t+'T09:00', 'нужен сегодня', true);
    }else{
      if(left<=3) pushRes('soon', t+'T09:00', 'через '+left+' дн. ('+r.urgentDate.slice(8,10)+'.'+r.urgentDate.slice(5,7)+')', true);
      function isoFromOffset(off){
        var d=new Date(r.urgentDate+'T12:00:00');
        d.setDate(d.getDate()+off);
        return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T09:00';
      }
      if(left>3) pushRes('d3', isoFromOffset(-3), 'через 3 дня', false);
      if(left>1) pushRes('d1', isoFromOffset(-1), 'завтра', false);
      pushRes('due', r.urgentDate+'T09:00', 'в день срока', false);
    }
  });
  return out;
}
function syncReminders(){try{if(window.FinBridge&&window.FinBridge.scheduleReminders)window.FinBridge.scheduleReminders(JSON.stringify(computeReminders()));}catch(e){}}
function exportData(){try{var data=JSON.stringify(STATE,null,2),filename='finna-backup-'+today()+'.json';if(window.FinBridge&&window.FinBridge.saveBackup){window.FinBridge.saveBackup(data,filename);}else{var blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);}toast('Экспорт запущен');}catch(e){toast('Не удалось сделать экспорт');}}
function importData(){var inp=document.getElementById('importFileInput');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.style.display='none';inp.id='importFileInput';document.body.appendChild(inp);inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f){return;}var reader=new FileReader();reader.onload=function(){try{var parsed=JSON.parse(reader.result);appConfirm('Заменить текущие данные данными из файла?\nТекущие данные будут перезаписаны (можно вернуть через «Отменить последнее действие»).','Импорт').then(function(ok){if(!ok)return;pushUndo();STATE=norm(parsed);save(true);render();toast('Данные импортированы');});}catch(e){toast('Файл повреждён или не в формате Финны');}};reader.readAsText(f);inp.value='';};}inp.click();}
window.kopeykaExport=exportData;window.kopeykaImport=importData;
window.defaultState=def;window.setAppState=function(s){pushUndo();STATE=norm(s);ensureMonth();save(true);render();};window.saveState=function(){save(true);};
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function monthOps(month){var inc=0,exp=0,dep=0,wd=0;(STATE.income||[]).forEach(function(i){if(i.deleted)return;if(inMonth(i.date,month))inc+=num(i.amount);});(STATE.expenses||[]).forEach(function(e){if(e.deleted)return;if(inMonth(e.date,month))exp+=num(e.amount);});(STATE.reserveOps||[]).forEach(function(o){if(o.deleted)return;if(!inMonth(o.date,month))return;var a=num(o.amount);if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;});return{inc:inc,exp:exp,dep:dep,wd:wd,delta:inc-exp-dep+wd};}
function nextMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]+1;if(m>12){m=1;y++;}return y+'-'+String(m).padStart(2,'0');}
function prevMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]-1;if(m<1){m=12;y--;}return y+'-'+String(m).padStart(2,'0');}
function cmpMonth(a,b){return String(a||'').localeCompare(String(b||''));}
function openingForMonth(target){var anchor=(STATE.settings&&STATE.settings.month)||today().slice(0,7);var open=num(STATE.settings&&STATE.settings.openingBalance);target=String(target||anchor);if(target===anchor)return open;var guard=0;if(cmpMonth(target,anchor)>0){var m=anchor;while(m!==target&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}return open;}var m2=anchor;while(m2!==target&&guard++<240){m2=prevMonth(m2);open=open-monthOps(m2).delta;}return open;}
function computeForMonth(month){month=String(month||today().slice(0,7));var ops=monthOps(month);var open=openingForMonth(month);var cash=open+ops.delta;var resT=0;(STATE.reserves||[]).forEach(function(r){resT+=num(r.saved);});var debt=0;(STATE.debts||[]).forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});var obligDue=0,obligPaid=0;(STATE.obligations||[]).forEach(function(ob){if(ob.active===false)return;var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});obligPaid+=paid;obligDue+=Math.max(0,num(ob.amount)-paid);});var avail=cash-debt-obligDue;var t=today(),p=month.split('-').map(Number);var last=new Date(p[0],p[1],0).getDate();var dayNum=Number(t.slice(8));
var payday=STATE.settings&&STATE.settings.paydayDay!=null?num(STATE.settings.paydayDay):0;
var daysToMonthEnd=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;
var daysToPayday=daysToMonthEnd;
if(month===t.slice(0,7)&&payday>=1&&payday<=31){
  if(dayNum<=payday)daysToPayday=Math.max(1,payday-dayNum+1);
  else{
    var nm=nextMonth(month),np=nm.split('-').map(Number);
    var nlast=new Date(np[0],np[1],0).getDate();
    var pd2=Math.min(payday,nlast);
    daysToPayday=Math.max(1,(last-dayNum+1)+pd2);
  }
}else if(payday>=1&&payday<=31){
  daysToPayday=Math.max(1,Math.min(payday,last));
}
// Горизонт лимита: payday | month
var horizon=STATE.settings&&STATE.settings.limitHorizon==='month'?'month':'payday';
if(horizon==='payday'&&!(payday>=1&&payday<=31))horizon='month';
var leftDays=horizon==='payday'?daysToPayday:daysToMonthEnd;
var horizonLabel=horizon==='payday'?'до зарплаты':'до конца месяца';
// Лимит: свободные / дни горизонта. Ручной лимит перекрывает авто.
var daily=0;
if(avail>0&&leftDays>0)daily=Math.floor(avail/leftDays);
var manualL=STATE.settings&&STATE.settings.manualDailyLimit;
if(manualL!=null&&manualL!==''&&isFinite(Number(manualL)))daily=Math.max(0,Math.round(Number(manualL)));
var spentTodayCalc=0;
var td=today();
(STATE.expenses||[]).forEach(function(e){if(e.deleted)return;if(e.date===td)spentTodayCalc+=num(e.amount);});
var by={};
(STATE.expenses||[]).forEach(function(e){
  if(e.deleted)return;
  if(!inMonth(e.date,month))return;
  var cat=e.category||'Прочее';
  if(cat==='Долг'&&e.note)cat=e.note;
  by[cat]=(by[cat]||0)+num(e.amount);
});
var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});
return{open:open,cash:cash,available:avail,incomeSum:ops.inc,expenseSum:ops.exp,depSum:ops.dep,wdSum:ops.wd,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,daysToMonthEnd:daysToMonthEnd,daysToPayday:daysToPayday,horizon:horizon,horizonLabel:horizonLabel,hasPayday:payday>=1&&payday<=31,spentToday:spentTodayCalc,cats:cats,month:month};}
function compute(){return computeForMonth(getViewMonth());}
function ensureMonth(){var cur=today().slice(0,7);var st=(STATE.settings&&STATE.settings.month)||cur;if(!STATE.settings)STATE.settings={};if(st===cur)return;var guard=0,m=st,open=num(STATE.settings.openingBalance);while(m!==cur&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}STATE.settings.openingBalance=open;STATE.settings.month=cur;viewMonth=cur;save(true);toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён');}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2800);}window.toast=toast;
function getUserName(){
  try{var n=(STATE&&STATE.settings&&STATE.settings.userName)||'';n=String(n||'').trim();if(n)return n;}catch(e){}
  try{var ls=(localStorage.getItem('finna_user_name')||'').trim();if(ls)return ls;}catch(e){}
  return '';
}
function setUserName(name){
  name=String(name||'').trim().replace(/\s+/g,' ').slice(0,40);
  if(!STATE.settings)STATE.settings={};
  STATE.settings.userName=name;
  try{if(name)localStorage.setItem('finna_user_name',name);else localStorage.removeItem('finna_user_name');}catch(e){}
  try{save(true);}catch(e){}
  return name;
}
window.getUserName=getUserName;window.setUserName=setUserName;
function showNameIntro(force){
  try{
    var DISMISS='finna_name_intro_dismissed';
    if(!force&&getUserName())return;
    if(!force){
      try{if(localStorage.getItem(DISMISS)==='1')return;}catch(e){}
    }
    if(document.getElementById('nameIntroDlg'))return;
    var html='<div class="modal-card name-intro" id="nameIntroDlg">'+
      '<div class="ni-face">'+(window.FinnChar?window.FinnChar.svgMarkup('niFinn','C'):'💬')+'</div>'+
      '<div class="modal-title">Давай знакомиться</div>'+
      '<p class="ni-text">Я Финна. Как тебя зовут? Запомню имя и буду обращаться по нему. Можно пропустить.</p>'+
      '<input type="text" id="niName" class="ni-input" placeholder="Твоё имя" maxlength="40" autocomplete="name" />'+
      '<label class="ni-check"><input type="checkbox" id="niDismiss" /> Больше не показывать</label>'+
      '<button type="button" class="btn-primary" id="niSave">Запомнить</button>'+
      '<button type="button" class="btn-ghost" id="niSkip">Пропустить</button>'+
      '</div>';
    openModal(html,function(){
      var bg=document.getElementById('modalBg');
      if(bg){bg.classList.add('full');bg.onclick=null;}
      var inp=document.getElementById('niName');
      var saveBtn=document.getElementById('niSave');
      var skipBtn=document.getElementById('niSkip');
      var chk=document.getElementById('niDismiss');
      if(inp){try{inp.focus();}catch(e){}}
      function applyDismiss(){
        try{
          if(chk&&chk.checked)localStorage.setItem(DISMISS,'1');
        }catch(e){}
      }
      function done(name){
        if(name){
          setUserName(name);
          try{localStorage.removeItem(DISMISS);}catch(e){}
          toast('Приятно познакомиться, '+name+'!');
        }else{
          applyDismiss();
        }
        if(bg)bg.classList.remove('full');
        closeModal();
        try{render();}catch(e){}
      }
      if(saveBtn)saveBtn.onclick=function(){
        var v=inp?String(inp.value||'').trim():'';
        if(!v){toast('Напиши имя или нажми «Пропустить»');if(inp)inp.focus();return;}
        done(v);
      };
      if(skipBtn)skipBtn.onclick=function(){done('');};
      if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();if(saveBtn)saveBtn.click();}});
    });
  }catch(e){}
}
window.showNameIntro=showNameIntro;
function countShifts(month){var p=month.split('-').map(Number),dim=new Date(p[0],p[1],0).getDate();var day=0,night=0,off=0,leftDay=0,leftNight=0,leftOff=0;var t=today(),curM=t.slice(0,7),curD=Number(t.slice(8));for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0');var s=shift(ds,STATE.shiftsOverride);if(s==='day')day++;else if(s==='night')night++;else off++;if(month>curM||(month===curM&&d>=curD)){if(s==='day')leftDay++;else if(s==='night')leftNight++;else leftOff++;}}return{day:day,night:night,off:off,total:dim,leftDay:leftDay,leftNight:leftNight,leftOff:leftOff,leftWork:leftDay+leftNight};}
function showShiftPay(){var month=getViewMonth(),sc=countShifts(month),dr=num(STATE.settings.dayRate),nr=num(STATE.settings.nightRate),pay=sc.day*dr+sc.night*nr,leftPay=sc.leftDay*dr+sc.leftNight*nr;var isCur=month===today().slice(0,7);var html='<div class="modal-card"><div class="modal-title">Смены · '+monthLabel(month)+'</div><div class="sp-grid"><div class="sp-item"><b>'+sc.day+'</b><span>День</span></div><div class="sp-item"><b>'+sc.night+'</b><span>Ночь</span></div><div class="sp-item"><b>'+sc.off+'</b><span>Выходной</span></div></div>'+(isCur?'<div class="sp-pay" style="margin-bottom:8px"><div class="muted">Осталось смен</div><div class="big" style="font-size:20px">'+sc.leftWork+' <span style="font-size:13px;font-weight:500;color:var(--muted)">('+sc.leftDay+'д + '+sc.leftNight+'н)</span></div></div>':'')+'<div class="sp-pay"><div class="muted">'+(isCur?'Осталось получить':'Ожидаемая зарплата')+'</div><div class="big" style="font-size:22px">'+fmt(isCur?leftPay:pay)+'</div>'+(dr||nr?'<div class="muted" style="margin-top:6px">день '+fmt(dr)+' · ночь '+fmt(nr)+(isCur?' · всего в месяце '+fmt(pay):'')+'</div>':'<div class="muted" style="margin-top:6px">Задай ставки в настройках ⚙</div>')+'</div><button type="button" class="btn-primary" id="spClose">Закрыть</button></div>';openModal(html,function(){var c=document.getElementById('spClose');if(c)c.onclick=closeModal;});}
function openModal(html,bind){var bg=document.getElementById('modalBg');if(!bg)return;bg.innerHTML=html;bg.classList.add('show');bg.onclick=function(e){if(e.target!==bg)return;var dlg=document.getElementById('dlgLayer');if(dlg&&dlg.classList.contains('show'))return;closeModal();};try{if(window.FinBridge&&window.FinBridge.setPullRefresh)window.FinBridge.setPullRefresh(false);}catch(e){}if(bind)bind();}
function closeModal(){var bg=document.getElementById('modalBg');if(!bg)return;bg.classList.remove('show','full');bg.innerHTML='';document.body.classList.remove('fin-settings-open');document.documentElement.style.overflow='';document.body.style.overflow='';try{if(window.FinBridge&&window.FinBridge.setPullRefresh)window.FinBridge.setPullRefresh(false);}catch(e){}}
function dlgLayer(){var el=document.getElementById('dlgLayer');if(el)return el;el=document.createElement('div');el.id='dlgLayer';el.className='modal-bg';el.style.zIndex='90';document.body.appendChild(el);return el;}
function openDialog(html,bind){var bg=dlgLayer();bg.innerHTML=html;bg.classList.add('show');bg.style.zIndex='90';bg.onclick=function(e){if(e.target===bg)closeDialog();};if(bind)bind();}
function closeDialog(){var bg=document.getElementById('dlgLayer');if(!bg)return;bg.classList.remove('show','full');bg.innerHTML='';}

function appAlert(message, title){
  return new Promise(function(resolve){
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Финна')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-actions"><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openDialog(html,function(){
      var ok=document.getElementById('dlgOk');
      function done(){closeDialog();resolve();}
      if(ok)ok.onclick=done;
    });
  });
}
function appConfirm(message, title){
  return new Promise(function(resolve){
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Подтверждение')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openDialog(html,function(){
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(false);};
      document.getElementById('dlgOk').onclick=function(){closeDialog();resolve(true);};
    });
  });
}
function appPrompt(message, defVal, title, opts){
  return new Promise(function(resolve){
    opts=opts||{};
    // Единая стандартная клавиатура (буквы+цифры). inputmode только если явно передан.
    var im=opts.inputmode!=null?opts.inputmode:'';
    var imAttr=im?(' inputmode="'+im+'"'):'';
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Ввод')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-field"><input id="dlgInput" type="text" value="'+esc(String(defVal==null?'':defVal))+'" autocomplete="off"'+imAttr+'></div><div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openDialog(html,function(){
      var inp=document.getElementById('dlgInput');
      if(inp){setTimeout(function(){inp.focus();inp.select&&inp.select();},80);}
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(null);};
      function ok(){var v=inp?inp.value:null;closeDialog();resolve(v);}
      document.getElementById('dlgOk').onclick=ok;
      if(inp)inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();ok();}});
    });
  });
}
function appChoice(message, options, title){
  return new Promise(function(resolve){
    var opts=options||[];
    var btns=opts.map(function(o,i){
      return '<button type="button" class="set-row" data-choice="'+i+'"><div class="set-main"><b>'+esc(String(o))+'</b></div></button>';
    }).join('');
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Выбор')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div>'+btns+'<div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button></div></div>';
    openDialog(html,function(){
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(null);};
      Array.prototype.forEach.call(document.querySelectorAll('#dlgLayer [data-choice]'),function(b){
        b.onclick=function(){var i=Number(b.getAttribute('data-choice'));closeDialog();resolve(i);};
      });
    });
  });
}

/** Сегментный ввод времени ЧЧ:ММ — только цифры, автопереход */
function appTimePicker(title, hour, minute){
  return new Promise(function(resolve){
    hour=Math.min(23,Math.max(0,num(hour)));
    minute=Math.min(59,Math.max(0,num(minute)));
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Время')+'</div>'+
      '<div class="seg-time" id="segTime">'+
      '<div class="seg-box"><label>Часы</label><input id="segHH" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="'+String(hour).padStart(2,'0')+'" autocomplete="off"></div>'+
      '<div class="seg-colon">:</div>'+
      '<div class="seg-box"><label>Минуты</label><input id="segMM" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="'+String(minute).padStart(2,'0')+'" autocomplete="off"></div>'+
      '</div>'+
      '<div class="dlg-actions">'+
      '<button type="button" class="btn" id="dlgOff">Выкл</button>'+
      '<button type="button" class="btn" id="dlgCancel">Отмена</button>'+
      '<button type="button" class="btn primary" id="dlgOk">ОК</button>'+
      '</div></div>';
    openDialog(html,function(){
      var hh=document.getElementById('segHH'), mm=document.getElementById('segMM');
      function onlyDigits(el,max){
        el.addEventListener('input',function(){
          var v=el.value.replace(/\D/g,'').slice(0,2);
          el.value=v;
          if(v.length>=2){
            var n=parseInt(v,10);
            if(el===hh){if(n>23)el.value='23';mm.focus();mm.select&&mm.select();}
            else{if(n>59)el.value='59';}
          }
        });
        el.addEventListener('keydown',function(e){
          if(e.key==='Enter'){e.preventDefault();ok();}
          if(e.key==='Backspace'&&!el.value&&el===mm){hh.focus();}
        });
      }
      onlyDigits(hh,23);onlyDigits(mm,59);
      setTimeout(function(){hh.focus();hh.select&&hh.select();},80);
      function ok(){
        var h=num(hh.value), m=num(mm.value);
        if(h<0||h>23){toast('Час 0–23');return;}
        if(m<0||m>59){toast('Минуты 0–59');return;}
        closeDialog();resolve({hour:h,minute:m,enabled:true});
      }
      document.getElementById('dlgOk').onclick=ok;
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(null);};
      document.getElementById('dlgOff').onclick=function(){closeDialog();resolve({enabled:false});};
    });
  });
}

/** Сегментный ввод даты ДД.ММ.ГГГГ */
function appDatePicker(title, isoDate){
  return new Promise(function(resolve){
    var d=isoDate&&/^\d{4}-\d{2}-\d{2}$/.test(isoDate)?isoDate:today();
    var parts=d.split('-');
    var yy=parts[0], mo=parts[1], dd=parts[2];
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Дата')+'</div>'+
      '<div class="seg-date" id="segDate">'+
      '<div class="seg-box"><label>День</label><input id="segDD" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="'+dd+'" autocomplete="off"></div>'+
      '<div class="seg-colon">.</div>'+
      '<div class="seg-box"><label>Месяц</label><input id="segMO" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="'+mo+'" autocomplete="off"></div>'+
      '<div class="seg-colon">.</div>'+
      '<div class="seg-box grow"><label>Год</label><input id="segYY" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="'+yy+'" autocomplete="off"></div>'+
      '</div>'+
      '<div class="dlg-actions">'+
      '<button type="button" class="btn" id="dlgCancel">Отмена</button>'+
      '<button type="button" class="btn primary" id="dlgOk">ОК</button>'+
      '</div></div>';
    openDialog(html,function(){
      var ddEl=document.getElementById('segDD'), moEl=document.getElementById('segMO'), yyEl=document.getElementById('segYY');
      function bind(el,len,next){
        el.addEventListener('input',function(){
          el.value=el.value.replace(/\D/g,'').slice(0,len);
          if(el.value.length>=len&&next){next.focus();next.select&&next.select();}
        });
        el.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();ok();}});
      }
      bind(ddEl,2,moEl);bind(moEl,2,yyEl);bind(yyEl,4,null);
      setTimeout(function(){ddEl.focus();ddEl.select&&ddEl.select();},80);
      function ok(){
        var day=num(ddEl.value), month=num(moEl.value), year=num(yyEl.value);
        if(year<2000||year>2100){toast('Год 2000–2100');return;}
        if(month<1||month>12){toast('Месяц 1–12');return;}
        var dim=new Date(year,month,0).getDate();
        if(day<1||day>dim){toast('День 1–'+dim);return;}
        var iso=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        closeDialog();resolve(iso);
      }
      document.getElementById('dlgOk').onclick=ok;
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(null);};
    });
  });
}

window.appAlert=appAlert;window.appConfirm=appConfirm;window.appPrompt=appPrompt;window.appChoice=appChoice;
window.appTimePicker=appTimePicker;window.appDatePicker=appDatePicker;



function appForm(title, fields, okLabel){
  return new Promise(function(resolve){
    var fieldsHtml=fields.map(function(f,i){
      if(f.type==='chips'){
        var chips=(f.options||[]).map(function(o){
          var sel=o===f.value?' selected':'';
          return '<button type="button" class="chip'+sel+'" data-chip="'+i+'" data-val="'+esc(o)+'">'+esc(o)+'</button>';
        }).join('');
        return '<div class="dlg-field" data-fi="'+i+'"><label>'+esc(f.label||'')+'</label><div class="chip-row" id="dlgChips'+i+'">'+chips+'</div><input type="hidden" id="dlgF'+i+'" value="'+esc(f.value||'')+'"></div>';
      }
      // без inputmode — одна стандартная клавиатура (и буквы, и цифры)
      var typ=(f.type&&f.type!=='number'&&f.type!=='tel')?f.type:'text';
      return '<div class="dlg-field" data-fi="'+i+'"><label>'+esc(f.label||'')+'</label><input id="dlgF'+i+'" type="'+typ+'" value="'+esc(f.value==null?'':String(f.value))+'" placeholder="'+esc(f.placeholder||'')+'" autocomplete="off"></div>';
    }).join('');
    var html='<div class="modal-card"><div class="modal-title">'+esc(title||'')+'</div>'+fieldsHtml+'<div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">'+(okLabel||'ОК')+'</button></div></div>';
    openDialog(html,function(){
      var first=document.getElementById('dlgF0');
      if(first&&first.tagName==='INPUT'){setTimeout(function(){first.focus();if(first.select)first.select();},60);}
      Array.prototype.forEach.call(document.querySelectorAll('#dlgLayer .chip'),function(ch){
        ch.onclick=function(){
          var fi=ch.getAttribute('data-chip');
          var row=document.getElementById('dlgChips'+fi);
          if(row)Array.prototype.forEach.call(row.querySelectorAll('.chip'),function(x){x.classList.remove('selected');});
          ch.classList.add('selected');
          var hid=document.getElementById('dlgF'+fi);
          if(hid)hid.value=ch.getAttribute('data-val')||'';
        };
      });
      document.getElementById('dlgCancel').onclick=function(){closeDialog();resolve(null);};
      function ok(){
        var out={};
        fields.forEach(function(f,i){
          var el=document.getElementById('dlgF'+i);
          out[f.name]=el?el.value:'';
        });
        closeDialog();resolve(out);
      }
      document.getElementById('dlgOk').onclick=ok;
      // Enter on last text field submits
      fields.forEach(function(f,i){
        if(f.type==='chips')return;
        var el=document.getElementById('dlgF'+i);
        if(el)el.addEventListener('keydown',function(e){
          if(e.key==='Enter'){e.preventDefault();
            var next=document.getElementById('dlgF'+(i+1));
            if(next&&next.tagName==='INPUT'&&next.type!=='hidden')next.focus();
            else ok();
          }
        });
      });
    });
  });
}
window.appForm=appForm;



function refreshTodayStatus(){
  var el=document.getElementById('todayStatusBody');
  if(!el)return;
  var fallbacks=[
    'Маленький шаг сегодня лучше идеального плана завтра.',
    'Запиши трату сразу — так проще не потерять контроль.',
    'Перед покупкой спроси себя: это нужно или просто хочется?',
    'Даже 100 ₽ в резерв — уже движение к цели.',
    'Спокойный день без импульсивных трат — тоже победа.'
  ];
  var day=new Date().getDate();
  var fb=fallbacks[day%fallbacks.length];
  el.textContent=fb;
  if(!window.kopeykaAI||typeof window.kopeykaAI.askConversation!=='function')return;
  try{if(window.kopeykaAI.isCoolingDown&&window.kopeykaAI.isCoolingDown())return;}catch(e){}
  var key=(window.kopeykaAI.getKey&&window.kopeykaAI.getKey())||'';
  try{if(!key)key=localStorage.getItem('kopeyka_groq_key')||'';}catch(e){}
  if(!key)return;
  var cacheKey='finna_today_status_'+today();
  try{
    var cached=localStorage.getItem(cacheKey);
    if(cached&&cached.length>10){el.textContent=cached;return;}
  }catch(e){}
  var prompt='Напиши ОДНУ короткую фразу (макс 18 слов) на русском: позитивный практичный совет про деньги на сегодня. Без приветствия, без markdown, без кавычек.';
  window.kopeykaAI.askConversation([],prompt).then(function(o){
    var t=(o&&(o.text||o.summary)||'').trim();
    if(t&&t.length>8&&t.length<180){
      el.textContent=t;
      try{localStorage.setItem(cacheKey,t);}catch(e){}
    }
  }).catch(function(){});
}

function refreshFinnTipAI(fallback, attentionList){
  var el=document.getElementById('finnTipBody');
  if(!el)return;
  if(!window.kopeykaAI||typeof window.kopeykaAI.askConversation!=='function')return;
  try{if(window.kopeykaAI.isCoolingDown&&window.kopeykaAI.isCoolingDown())return;}catch(e){}
  var key=(window.kopeykaAI.getKey&&window.kopeykaAI.getKey())||'';
  try{if(!key)key=localStorage.getItem('kopeyka_groq_key')||'';}catch(e){}
  if(!key)return;
  var snap=window.kopeykaEngine&&window.kopeykaEngine.snapshot?window.kopeykaEngine.snapshot():null;
  var avail=snap&&snap.calculations?Math.round(snap.calculations.available||0):0;
  var daily=snap&&snap.calculations?Math.round(snap.calculations.dailyBudget||0):0;
  var cacheKey='finna_tip_'+today()+'_'+avail+'_'+daily;
  try{
    var cached=localStorage.getItem(cacheKey);
    if(cached&&cached.length>10){el.textContent=cached;return;}
    // не чаще одного AI-совета в 10 минут
    var lastAt=Number(localStorage.getItem('finna_tip_at')||0);
    if(lastAt&&Date.now()-lastAt<600000)return;
  }catch(e){}
  var ctx=snap?JSON.stringify({available:avail,daily:daily,cash:snap.calculations&&snap.calculations.cash,debts:snap.calculations&&snap.calculations.debtRemaining,daysLeft:snap.calculations&&snap.calculations.daysLeft,attention:(attentionList||[]).slice(0,2)}):'';
  var prompt='Ты Финна. Напиши ОДИН короткий совет (1–2 предложения) на русском. Только на основе цифр: '+ctx+'. Не выдумывай сумм, которых нет в данных. Если есть ближайший платёж — упомяни его. Без markdown, без приветствия, спокойно и точно.';
  window.kopeykaAI.askConversation([],prompt).then(function(o){
    var t=(o&&(o.text||o.summary)||'').trim();
    if(t&&t.length>10&&t.length<400){
      el.textContent=t;
      try{localStorage.setItem(cacheKey,t);localStorage.setItem('finna_tip_at',String(Date.now()));}catch(e){}
    }
  }).catch(function(){});
}



function openPlanCalendar(){
  if(!STATE.dayPlans) STATE.dayPlans={};
  var month=getViewMonth(),t=today();
  function buildCal(m){
    var ym=m.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();
    var h='<div class="cal">';
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){h+='<div class="cal-h">'+d+'</div>';});
    for(var i=0;i<sw;i++) h+='<div class="cal-d other"></div>';
    for(var d=1;d<=dim;d++){
      var ds=m+'-'+String(d).padStart(2,'0');
      var plans=(STATE.dayPlans[ds]||[]);
      var mark=plans.length?' has-plan':'';
      h+='<div class="cal-d'+mark+(ds===t?' today':'')+'" data-date="'+ds+'">'+d+(plans.length?'<span class="dot"></span>':'')+'</div>';
    }
    h+='</div>';
    return h;
  }
  var html='<div class="modal-card full-screen"><div class="modal-title">Планы на дни</div>'+
    '<div class="modal-scroll">'+
    '<div class="month-nav"><button type="button" class="mnav" id="calPrev">‹</button><div class="month-title" id="calTitle">'+monthLabel(month)+'</div><button type="button" class="mnav" id="calNext">›</button></div>'+
    '<div id="calBody">'+buildCal(month)+'</div>'+
    '<div class="hint">Выбери день и отметь: покупка, долг, доход или заметка. Суммы учтутся в подсказках лимита.</div>'+
    '</div><button type="button" class="btn-primary" id="calClose">Закрыть</button></div>';
  openModal(html,function(){
    var bg=document.getElementById('modalBg'); if(bg) bg.classList.add('full');
    var prevClose=closeModal, closed=false;
    function doClose(){ if(closed)return; closed=true; if(bg)bg.classList.remove('full'); closeModal=prevClose; prevClose(); if(typeof render==='function')render(); }
    closeModal=doClose;
    document.getElementById('calClose').onclick=doClose;
    function redraw(){
      var m=getViewMonth();
      document.getElementById('calTitle').textContent=monthLabel(m);
      document.getElementById('calBody').innerHTML=buildCal(m);
      Array.prototype.forEach.call(document.querySelectorAll('#calBody [data-date]'),function(el){
        el.onclick=function(){ dayPlanEditor(el.getAttribute('data-date'), redraw); };
      });
    }
    document.getElementById('calPrev').onclick=function(){ viewMonth=shiftMonth(getViewMonth(),-1); redraw(); };
    document.getElementById('calNext').onclick=function(){ viewMonth=shiftMonth(getViewMonth(),1); redraw(); };
    redraw();
  });
}
function dayPlanEditor(ds, onDone){
  if(!STATE.dayPlans) STATE.dayPlans={};
  var list=STATE.dayPlans[ds]||[];
  appChoice('План на '+ds, ['Покупка / трата','Доход','Платёж по долгу','Заметка','Очистить день'], 'Что запланировать?').then(function(i){
    if(i===null) return;
    if(i===4){
      pushUndo();
      (STATE.dayPlans[ds]||[]).forEach(function(p){
        if(!p||!p.opId)return;
        STATE.expenses=(STATE.expenses||[]).filter(function(e){return e.id!==p.opId;});
        STATE.income=(STATE.income||[]).filter(function(e){return e.id!==p.opId;});
        if(p.type==='debt'&&p.debtId){
          var dd=(STATE.debts||[]).find(function(x){return x.id===p.debtId;});
          if(dd){dd.paid=Math.max(0,num(dd.paid)-num(p.amount));}
        }
      });
      STATE.dayPlans[ds]=[]; save(true);
      try{if(onDone)onDone();}catch(e){}
      try{if(typeof render==='function')render();}catch(e){}
      toast('День очищен'); return;
    }
    var types=['purchase','income','debt','note'];
    var type=types[i];
    if(type==='note'){
      appPrompt('Текст заметки','','Заметка',{text:true}).then(function(v){
        if(v===null||!String(v).trim())return;
        pushUndo();
        list=STATE.dayPlans[ds]||[];
        list.push({id:uid(),type:'note',amount:0,title:String(v).trim(),date:ds});
        STATE.dayPlans[ds]=list; save(true);
        try{if(onDone)onDone();}catch(e){}
        try{if(typeof render==='function')render();}catch(e){}
        toast('Заметка сохранена');
      });
      return;
    }
    appPrompt('Сумма','','Сумма',{inputmode:'decimal'}).then(function(v){
      if(v===null)return;
      var amount=num(v);
      if(amount<=0)return toast('Укажи сумму');
      appPrompt('Название / комментарий', type==='purchase'?'Покупка':(type==='income'?'Доход':'Платёж по долгу'), 'Комментарий',{text:true}).then(function(t){
        if(t===null)return;
        var title=(t&&String(t).trim())||(type==='purchase'?'Покупка':(type==='income'?'Доход':'Долг'));
        pushUndo();
        // Всегда пишем в реальные операции (расчёт кассы / списки)
        if(!STATE.expenses) STATE.expenses=[];
        if(!STATE.income) STATE.income=[];
        if(!STATE.debts) STATE.debts=[];
        var opId=uid();
        if(type==='purchase'){
          STATE.expenses.push(stampOp({id:opId,amount:amount,category:title,note:title,date:ds,fromPlan:true}));
        } else if(type==='income'){
          STATE.income.push(stampOp({id:opId,amount:amount,note:title,date:ds,fromPlan:true}));
        } else if(type==='debt'){
          var debts=STATE.debts;
          var found=null;
          var q=String(title).toLowerCase();
          for(var di=0;di<debts.length;di++){
            var nm=String(debts[di].name||'').toLowerCase();
            if(nm && (nm.indexOf(q)>=0 || q.indexOf(nm)>=0)){ found=debts[di]; break; }
          }
          if(found){
            found.paid=num(found.paid)+amount;
            if(found.paid>num(found.total)) found.paid=num(found.total);
          } else {
            found={id:uid(),name:title,total:amount,paid:amount};
            STATE.debts.push(found);
          }
          STATE.expenses.push(stampOp({id:opId,amount:amount,category:'Долг',note:title,date:ds,fromPlan:true}));
        }
        list=STATE.dayPlans[ds]||[];
        list.push({id:uid(),type:type,amount:amount,title:title,date:ds,applied:true,opId:opId,debtId:type==='debt'&&found?found.id:undefined});
        STATE.dayPlans[ds]=list;
        if(type==='income')trackLastOp('income',opId);
        else trackLastOp('expense',opId);
        save(true);
        try{if(onDone)onDone();}catch(e){}
        toast('В операциях: '+fmt(amount)+' · '+title);
        try{ if(typeof render==='function') render(); }catch(e){}
      });
    });
  });
}


function openFullCalendar(){
  var planMode=false;
  try{planMode=window.FinnaProfile&&window.FinnaProfile.showPlanCalendar&&window.FinnaProfile.showPlanCalendar();}catch(e){}
  if(planMode){ openPlanCalendar(); return; }
  var month=getViewMonth(),t=today(),isCurrent=(month===t.slice(0,7));
  var ym=month.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();
  var cal='<div class="cal">';
  ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){cal+='<div class="cal-h">'+d+'</div>';});
  for(var i=0;i<sw;i++)cal+='<div class="cal-d other"></div>';
  for(var d=1;d<=dim;d++){
    var ds=month+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride);
    var hasObl=STATE.obligations.some(function(ob){return ob.active!==false&&num(ob.day)===d;});
    cal+='<div class="cal-d '+s+(ds===t&&isCurrent?' today':'')+(hasObl?' has-obl':'')+'" data-date="'+ds+'">'+d+'<span class="dot"></span></div>';
  }
  cal+='</div>';
  var html='<div class="modal-card full-screen"><div class="modal-title">Календарь смен</div>'+
    '<div class="modal-scroll">'+
    '<div class="month-nav"><button type="button" class="mnav" id="calPrev">‹</button><div class="month-title" id="calTitle">'+monthLabel(month)+'</div><button type="button" class="mnav" id="calNext">›</button></div>'+
    '<div id="calBody">'+cal+'</div>'+
    '<button type="button" class="btn-shift" id="calShiftPay">Смены и зарплата</button>'+
    '</div><button type="button" class="btn-primary" id="calClose">Закрыть</button></div>';
  openModal(html,function(){
    var bg=document.getElementById('modalBg');
    if(bg)bg.classList.add('full');
    var prevClose=closeModal, closed=false;
    function doClose(){if(closed)return;closed=true;if(bg)bg.classList.remove('full');closeModal=prevClose;prevClose();}
    closeModal=doClose;
    document.getElementById('calClose').onclick=doClose;
    document.getElementById('calShiftPay').onclick=function(){doClose();showShiftPay();};
    function redrawCal(){
      var m=getViewMonth(),tt=today(),ic=(m===tt.slice(0,7));
      var y=m.split('-').map(Number),f=new Date(y[0],y[1]-1,1),s0=(f.getDay()+6)%7,dm=new Date(y[0],y[1],0).getDate();
      var h='<div class="cal">';
      ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){h+='<div class="cal-h">'+d+'</div>';});
      for(var i=0;i<s0;i++)h+='<div class="cal-d other"></div>';
      for(var d=1;d<=dm;d++){
        var ds=m+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride);
        h+='<div class="cal-d '+s+(ds===tt&&ic?' today':'')+'" data-date="'+ds+'">'+d+'<span class="dot"></span></div>';
      }
      h+='</div>';
      var body=document.getElementById('calBody');
      if(body)body.innerHTML=h;
      var tit=document.getElementById('calTitle');
      if(tit)tit.textContent=monthLabel(m);
      Array.prototype.forEach.call(document.querySelectorAll('#calBody [data-date]'),function(el){
        el.onclick=function(){
          var ds=el.getAttribute('data-date');
          if(getViewMonth()!==today().slice(0,7)){viewMonth=today().slice(0,7);redrawCal();toast('Вернись к текущему месяцу');return;}
          pushUndo();
          var cur=shift(ds,STATE.shiftsOverride),n=cur==='day'?'night':cur==='night'?'off':'day';
          STATE.shiftsOverride[ds]=n;save(true);redrawCal();toast('Смена: '+(SHIFT_LABEL[n]||n));
        };
      });
    }
    document.getElementById('calPrev').onclick=function(){viewMonth=shiftMonth(getViewMonth(),-1);redrawCal();};
    document.getElementById('calNext').onclick=function(){viewMonth=shiftMonth(getViewMonth(),1);redrawCal();};
    redrawCal();
  });
}


function showFaq(){
  var cats=[
    {t:'Как пользоваться приложением',b:'<p><b>Главная</b> — касса, доступно, лимит на день, ближайшие платежи и совет Финны.</p><p><b>Операции</b> — все доходы и расходы за месяц. Удалённые помечены «удалено», изменённые — «изменено».</p><p><b>Резервы / Долги / Обязательные</b> — отдельные разделы внизу. Добавляй через кнопку <b>+</b>.</p><p>Потяни карточку или нажми на сумму, чтобы изменить.</p>'},
    {t:'Как пользоваться ассистентом Финной',b:'<p>Нажми на аватар Финны в шапке или зажми <b>+</b> — откроется пузырёк.</p><p>Первый раз Финна слушает сразу. Потом — нажми на неё, чтобы говорить.</p><p>Можно сказать: «добавь расход 300 кофе», «покажи календарь», «поставь на 1, 4, 6 ночные».</p><p>Текст ответа появляется над пузырьком на прозрачном фоне.</p>'},
    {t:'Календарь и смены',b:'<p>Смены идут циклом, можно переопределить голосом или в календаре.</p><p>Скажи Финне: «покажи календарь» или «поставь 25 дневную».</p><p>В настройках задай <b>время напоминания о смене</b> (часы и минуты) — придёт пуш накануне.</p>'},
    {t:'День зарплаты и лимит',b:'<p><b>День зарплаты</b> в настройках — бюджет считается до этой даты, а не до конца месяца.</p><p><b>Лимит на сегодня</b> — авто (свободные ÷ дни) или ручной. Совет Финны опирается на эти цифры.</p>'},
    {t:'Облако и данные',b:'<p>Иконка облака — вход и синхронизация. Данные также лежат локально на телефоне.</p><p>Экспорт/импорт копии — в скрытом разделе разработчика (Настройки → «Для разработчика» 5 раз).</p>'},
    {t:'Уведомления',b:'<p>Колокольчик рядом с облаком — центр уведомлений внутри приложения.</p><p>Финна предупреждает о ближайших обязательных платежах, зарплате и завтрашней смене.</p><p>Системные пуши работают, даже когда приложение закрыто (нужно разрешение).</p>'}
  ];
  var body=cats.map(function(c,i){
    return '<div class="faq-cat" data-i="'+i+'"><button type="button">'+c.t+'<span>›</span></button><div class="faq-body">'+c.b+'</div></div>';
  }).join('');
  var html='<div class="modal-card full-screen"><div class="modal-title">Вопросы и ответы</div><div class="modal-scroll">'+body+'</div><button type="button" class="btn-primary" id="faqClose">Закрыть</button></div>';
  openModal(html,function(){
    var bg=document.getElementById('modalBg');if(bg)bg.classList.add('full');
    var prev=closeModal,closed=false;
    function doClose(){if(closed)return;closed=true;if(bg)bg.classList.remove('full');closeModal=prev;prev();}
    closeModal=doClose;
    document.getElementById('faqClose').onclick=doClose;
    Array.prototype.forEach.call(document.querySelectorAll('.faq-cat > button'),function(btn){
      btn.onclick=function(){
        var cat=btn.parentNode;
        var open=cat.classList.contains('open');
        Array.prototype.forEach.call(document.querySelectorAll('.faq-cat.open'),function(x){x.classList.remove('open');});
        if(!open)cat.classList.add('open');
      };
    });
  });
}

function loadNotifInbox(){
  try{return JSON.parse(localStorage.getItem('finna_notif_inbox_v1')||'[]');}catch(e){return [];}
}
function saveNotifInbox(list){
  try{localStorage.setItem('finna_notif_inbox_v1',JSON.stringify((list||[]).slice(0,80)));}catch(e){}
}
function buildSmartNotifs(){
  var list=[],t=today(),c=compute();
  var month=(STATE.settings&&STATE.settings.month)||t.slice(0,7);
  (STATE.obligations||[]).forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
    var remain=Math.max(0,num(ob.amount)-paid);if(remain<=0)return;
    var day=Number(t.slice(8)), y=Number(t.slice(0,4)), m=Number(t.slice(5,7));
    var dim=new Date(y,m,0).getDate();
    var d=Math.min(Math.max(1,num(ob.day)||1),dim);
    var dueY=y,dueM=m,dueD=d;
    if(d<day){dueM+=1;if(dueM>12){dueM=1;dueY+=1;}dueD=Math.min(d,new Date(dueY,dueM,0).getDate());}
    var due=new Date(dueY,dueM-1,dueD);
    var days=Math.round((due-new Date(y,m-1,day))/(86400000));
    if(days>=0&&days<=5){
      list.push({
        id:'obl_'+ob.id+'_'+dueY+'-'+dueM+'-'+dueD,
        title: days===0?('Сегодня платёж'):(days===1?'Завтра платёж':'Через '+days+' дн. платёж'),
        message:ob.name+' — '+fmt(remain)+(days===2?' · не забудь внести':'') ,
        at:new Date().toISOString(),
        kind:'payment'
      });
    }
  });
  var pd=STATE.settings&&STATE.settings.paydayDay!=null?num(STATE.settings.paydayDay):0;
  if(pd>=1&&pd<=31){
    var dayN=Number(t.slice(8));
    var left=pd>=dayN?(pd-dayN):(pd+30-dayN);
    if(left>=0&&left<=3){
      list.push({id:'payday_'+t.slice(0,7)+'_'+pd,title:left===0?'Зарплата сегодня':(left===1?'Зарплата завтра':'До зарплаты '+left+' дн.'),message:'Проверь кассу и обязательные платежи перед новым периодом.',at:new Date().toISOString(),kind:'salary'});
    }
  }
  if(c.available>0&&c.daily>0){
    var spent=0;(STATE.expenses||[]).forEach(function(e){if(!e.deleted&&e.date===t)spent+=num(e.amount);});
    if(spent>c.daily){
      list.push({id:'over_'+t,title:'Перерасход за сегодня',message:'Лимит '+fmt(c.daily)+', уже '+fmt(spent)+'.',at:new Date().toISOString(),kind:'tip'});
    }
  }
  (STATE.reserves||[]).forEach(function(r){
    if(!r.urgent||!r.urgentDate||r.deleted)return;
    var left=days(t,r.urgentDate);
    if(left>7)return;
    var need=Math.max(0,num(r.target)-num(r.saved));
    var title=left<0?'Важно · критическое: резерв просрочен':(left===0?'Важно · критическое: резерв сегодня':'Важно · критическое: срочный резерв');
    var when=left<0?('просрочен на '+Math.abs(left)+' дн.'):(left===0?'нужен сегодня':('через '+left+' дн.'));
    list.push({id:'urgent_res_'+r.id+'_'+r.urgentDate,title:title,message:'«'+r.name+'» '+when+(need?('. Внеси из кассы '+fmt(need)+'.'):'.'),at:new Date().toISOString(),kind:'critical'});
  });
  // merge with inbox, keep unread flags
  var inbox=loadNotifInbox();
  var map={};inbox.forEach(function(n){map[n.id]=n;});
  list.forEach(function(n){
    if(map[n.id]){n.read=!!map[n.id].read;}
    else n.read=false;
    map[n.id]=n;
  });
  var merged=Object.keys(map).map(function(k){return map[k];});
  merged.sort(function(a,b){return String(b.at||'').localeCompare(String(a.at||''));});
  saveNotifInbox(merged);
  return merged;
}
function updateNotifBadge(){
  var btn=document.getElementById('btnNotif');
  var badge=document.getElementById('notifBadge');
  if(!btn||!badge)return;
  btn.style.display='';
  var list=buildSmartNotifs();
  var unread=list.filter(function(n){return !n.read;}).length;
  if(unread<=0){badge.hidden=true;badge.textContent='0';}
  else{badge.hidden=false;badge.textContent=unread>9?'9+':String(unread);}
}
function showNotifications(){
  var list=buildSmartNotifs();
  var body;
  if(!list.length)body='<div class="empty tight">Пока тихо — Финна напишет, когда приблизится платёж или зарплата</div>';
  else body='<div class="notif-list">'+list.map(function(n){
    return '<div class="n-item'+(n.read?'':' unread')+'"><b>'+esc(n.title)+'</b><span>'+esc(n.message)+'</span></div>';
  }).join('')+'</div>';
  var html='<div class="modal-card full-screen"><div class="modal-title">Уведомления</div><div class="modal-scroll">'+body+'</div><button type="button" class="btn-primary" id="notifClose">Закрыть</button></div>';
  openModal(html,function(){
    var bg=document.getElementById('modalBg');if(bg)bg.classList.add('full');
    var prev=closeModal,closed=false;
    function doClose(){
      if(closed)return;closed=true;
      var inbox=loadNotifInbox().map(function(n){n.read=true;return n;});
      saveNotifInbox(inbox);updateNotifBadge();
      if(bg)bg.classList.remove('full');closeModal=prev;prev();
    }
    closeModal=doClose;
    document.getElementById('notifClose').onclick=doClose;
  });
}

function showSettings(){

  document.body.classList.add('fin-settings-open');
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';

  var cash=compute().cash;
  var html='<div class="modal-card full-screen">'+
    '<div class="modal-title">Настройки</div>'+
    '<div class="modal-scroll">'+
    '<div class="set-group"><div class="set-group-title">Профиль</div>'+
      '<button type="button" class="set-row" id="setUserName"><div class="set-main"><b>Как тебя зовут</b><span>Имя для обращений Финны</span></div><span class="set-val">'+esc(getUserName()||'—')+'</span></button>'+
    '</div>'+
    '<div class="set-group"><div class="set-group-title">Деньги</div>'+
      '<button type="button" class="set-row" id="setOpen"><div class="set-main"><b>Начальный остаток</b><span>Сумма, с которой ведётся касса</span></div><span class="set-val">'+fmt(STATE.settings.openingBalance)+'</span></button>'+
      '<button type="button" class="set-row" id="setCashNow"><div class="set-main"><b>Подстроить кассу</b><span>Если фактическая сумма другая</span></div><span class="set-val">'+fmt(cash)+'</span></button>'+
      (function(){try{if(window.FinnaProfile&&window.FinnaProfile.showRates&&!window.FinnaProfile.showRates())return '';}catch(e){}
        var st=STATE.settings||{};
        return '<button type="button" class="set-row" id="setDay"><div class="set-main"><b>Оплата за день</b><span>Ставка дневной смены</span></div><span class="set-val">'+fmt(st.dayRate)+'</span></button>'+
      '<button type="button" class="set-row" id="setNight"><div class="set-main"><b>Оплата за ночь</b><span>Ставка ночной смены</span></div><span class="set-val">'+fmt(st.nightRate)+'</span></button>'+
      '<button type="button" class="set-row" id="setPayday"><div class="set-main"><b>День зарплаты</b><span>Бюджет до этой даты (1–31, пусто = до конца месяца)</span></div><span class="set-val">'+(st.paydayDay?('«'+st.paydayDay+'»'):'—')+'</span></button>'+
      '<button type="button" class="set-row" id="setShiftNotif"><div class="set-main"><b>Напоминание о смене</b><span>Во сколько предупреждать о завтрашней смене</span></div><span class="set-val">'+(st.shiftNotifEnabled===false?'Выкл':(String(st.shiftNotifHour!=null?st.shiftNotifHour:20).padStart(2,'0')+':'+String(st.shiftNotifMinute!=null?st.shiftNotifMinute:0).padStart(2,'0')))+'</span></button>'+
      '<button type="button" class="set-row" id="setDayTime"><div class="set-main"><b>Время дневной смены</b><span>Начало и конец</span></div><span class="set-val">'+(st.dayStart||'08:00')+'–'+(st.dayEnd||'20:00')+'</span></button>'+
      '<button type="button" class="set-row" id="setNightTime"><div class="set-main"><b>Время ночной смены</b><span>Начало и конец</span></div><span class="set-val">'+(st.nightStart||'20:00')+'–'+(st.nightEnd||'08:00')+'</span></button>';})()+
    '</div>'+
    '<div class="set-group" id="devGateWrap"><button type="button" class="set-row" id="devGate"><div class="set-main"><b>Для разработчика</b><span>Скрытый раздел · нажми 5 раз подряд</span></div><span class="set-val">🔒</span></button></div>'+
    '<div class="set-group" id="devSection" style="display:none"><div class="set-group-title">Разработчик · Ассистент и данные</div>'+
      '<button type="button" class="set-row" id="setAi"><div class="set-main"><b>Голосовой помощник</b><span>Ключ для умных ответов Финны</span></div><span class="set-val" id="setAiStatus">—</span></button>'+
      '<button type="button" class="set-row" id="setScenario"><div class="set-main"><b>Сценарий жизни</b><span>Работа, бюджет, фокус — перестроить приложение</span></div><span class="set-val">↻</span></button>'+
      '<button type="button" class="set-row" id="setCheckUpdate"><div class="set-main"><b>Проверить обновления</b><span>Сверка с сервером прямо сейчас</span></div><span class="set-val">↻</span></button>'+
      '<button type="button" class="set-row" id="setTestPush"><div class="set-main"><b>Проверить уведомление</b><span>Придёт через несколько секунд</span></div><span class="set-val">↗</span></button>'+
      '<button type="button" class="set-row" id="setUndo"><div class="set-main"><b>Отменить последнее</b><span>'+(undoStack.length?'Можно откатить действие':'Пока нечего отменять')+'</span></div><span class="set-val">'+(undoStack.length?'↩':'')+'</span></button>'+
      '<button type="button" class="set-row" id="setExport"><div class="set-main"><b>Сохранить копию</b><span>Файл со всеми данными</span></div><span class="set-val">↓</span></button>'+
      '<button type="button" class="set-row" id="setImport"><div class="set-main"><b>Загрузить копию</b><span>Восстановить из файла</span></div><span class="set-val">↑</span></button>'+
      '<button type="button" class="set-row danger" id="setClear"><div class="set-main"><b>Удалить всё</b><span>Сбросить приложение полностью</span></div><span class="set-val"></span></button>'+
    '</div></div>'+
    '<button type="button" class="btn-primary" id="setClose">Готово</button></div>';
  openModal(html,function(){
    var bg=document.getElementById('modalBg');
    if(bg)bg.classList.add('full');
    var prevClose=closeModal;
    var closed=false;
    function doClose(){
      if(closed)return;closed=true;
      if(bg)bg.classList.remove('full');
      closeModal=prevClose;
      prevClose();
    }
    closeModal=doClose;
    document.getElementById('setClose').onclick=doClose;
    var st=document.getElementById('setAiStatus');
    if(st){var k=(window.kopeykaAI&&window.kopeykaAI.getKey)?window.kopeykaAI.getKey():'';try{if(!k)k=localStorage.getItem('kopeyka_groq_key')||'';}catch(e){}st.textContent=k?'Включён':'Выключен';}
    document.getElementById('setUndo').onclick=function(){doClose();undoLast();};
    document.getElementById('setOpen').onclick=function(){
      appPrompt('Начальный остаток',String(num(STATE.settings.openingBalance)),'Остаток').then(function(o){
        if(o===null)return;pushUndo();STATE.settings.openingBalance=num(o);save(true);render();toast('Остаток: '+fmt(num(o)));
      });
    };
    document.getElementById('setCashNow').onclick=function(){
      var cur=compute().cash;
      appPrompt('Сколько сейчас реально в кассе?',String(cur),'Подстроить кассу').then(function(o){
        if(o===null)return;var want=num(o);var month=(STATE.settings&&STATE.settings.month)||today().slice(0,7);var delta=monthOps(month).delta;pushUndo();STATE.settings.openingBalance=want-delta;STATE.settings.month=month;save(true);render();toast('Касса: '+fmt(want));
      });
    };
    var setDayEl=document.getElementById('setDay');
    if(setDayEl)setDayEl.onclick=function(){
      appPrompt('Оплата за дневную смену',String(num(STATE.settings.dayRate)),'Дневная ставка').then(function(o){
        if(o===null)return;pushUndo();STATE.settings.dayRate=num(o);save(true);render();toast('День: '+fmt(num(o)));
      });
    };
    var setNightEl=document.getElementById('setNight');
    if(setNightEl)setNightEl.onclick=function(){
      appPrompt('Оплата за ночную смену',String(num(STATE.settings.nightRate)),'Ночная ставка').then(function(o){
        if(o===null)return;pushUndo();STATE.settings.nightRate=num(o);save(true);render();toast('Ночь: '+fmt(num(o)));
      });
    };
    var setUserNameEl=document.getElementById('setUserName');
    if(setUserNameEl)setUserNameEl.onclick=function(){
      appPrompt('Как тебя зовут?', getUserName()||'', 'Имя', {text:true}).then(function(o){
        if(o===null)return;
        var n=setUserName(o);
        showSettings();
        toast(n?('Буду звать тебя '+n):'Имя очищено');
      });
    };
    var setPaydayEl=document.getElementById('setPayday');
    if(setPaydayEl)setPaydayEl.onclick=function(){
      appPrompt('День зарплаты (1–31, пусто = до конца месяца)',String(STATE.settings.paydayDay||''),'День зарплаты').then(function(o){
        if(o===null)return;pushUndo();
        var v=String(o).trim();
        if(!v){STATE.settings.paydayDay=null;save(true);render();showSettings();toast('Считаем до конца месяца');return;}
        var d=num(v);if(d<1||d>31)return toast('Число 1–31');
        STATE.settings.paydayDay=d;save(true);render();showSettings();toast('Зарплата: '+d+'-е');
      });
    };
    var setShiftNotifEl=document.getElementById('setShiftNotif');
    if(setShiftNotifEl)setShiftNotifEl.onclick=function(){
      var curH=STATE.settings.shiftNotifHour!=null?STATE.settings.shiftNotifHour:20;
      var curM=STATE.settings.shiftNotifMinute!=null?STATE.settings.shiftNotifMinute:0;
      appTimePicker('Напоминание о смене', curH, curM).then(function(o){
        if(o===null)return;pushUndo();
        if(o.enabled===false){STATE.settings.shiftNotifEnabled=false;save(true);syncReminders();showSettings();toast('Напоминания о сменах выкл');return;}
        STATE.settings.shiftNotifEnabled=true;
        STATE.settings.shiftNotifHour=o.hour;
        STATE.settings.shiftNotifMinute=o.minute;
        save(true);syncReminders();showSettings();
        toast('Напоминание в '+String(o.hour).padStart(2,'0')+':'+String(o.minute).padStart(2,'0'));
      });
    };
    (function(){
      var gate=document.getElementById('devGate');
      var sec=document.getElementById('devSection');
      if(!gate||!sec)return;
      var taps=0,timer=null;
      gate.onclick=function(){
        taps++;
        clearTimeout(timer);
        timer=setTimeout(function(){taps=0;},1200);
        if(taps>=5){
          taps=0;
          sec.style.display='';
          var wrap=document.getElementById('devGateWrap');
          if(wrap)wrap.style.display='none';
          toast('Раздел разработчика открыт');
        }else if(taps>=2){
          gate.querySelector('.set-val').textContent='🔒 '+(5-taps);
        }
      };
    })();
    function bindShiftTime(btnId, startKey, endKey, title){
      var el=document.getElementById(btnId);if(!el)return;
      el.onclick=function(){
        var st=STATE.settings||{};
        var s0=String(st[startKey]||'08:00').split(':');
        var e0=String(st[endKey]||'20:00').split(':');
        appTimePicker(title+' · начало', num(s0[0]), num(s0[1]||0)).then(function(a){
          if(a===null)return;
          if(a.enabled===false)return;
          appTimePicker(title+' · конец', num(e0[0]), num(e0[1]||0)).then(function(b){
            if(b===null)return;
            if(b.enabled===false)return;
            pushUndo();
            if(!STATE.settings)STATE.settings={};
            STATE.settings[startKey]=String(a.hour).padStart(2,'0')+':'+String(a.minute).padStart(2,'0');
            STATE.settings[endKey]=String(b.hour).padStart(2,'0')+':'+String(b.minute).padStart(2,'0');
            save(true);render();showSettings();toast('Время смены сохранено');
          });
        });
      };
    }
    bindShiftTime('setDayTime','dayStart','dayEnd','Дневная смена');
    bindShiftTime('setNightTime','nightStart','nightEnd','Ночная смена');
    document.getElementById('setAi').onclick=function(){
      var cur='';try{cur=(window.kopeykaAI&&window.kopeykaAI.getKey)?window.kopeykaAI.getKey():(localStorage.getItem('kopeyka_groq_key')||'');}catch(e){}
      appPrompt('Ключ API (Groq). Оставь пустым, чтобы выключить.',cur,'Голосовой помощник').then(function(o){
        if(o===null)return;
        try{
          if(window.kopeykaAI&&window.kopeykaAI.setKey)window.kopeykaAI.setKey(o||'');
          else localStorage.setItem('kopeyka_groq_key',o||'');
        }catch(e){}
        var st2=document.getElementById('setAiStatus');
        if(st2)st2.textContent=o?'Включён':'Выключен';
        toast(o?'Ключ сохранён':'Ключ удалён');
      });
    };
    var setSc=document.getElementById('setScenario');
    if(setSc)setSc.onclick=function(){
      doClose();
      try{localStorage.removeItem('finna_profile_v2');localStorage.removeItem('finna_profile_v1');}catch(e){}
      if(STATE.settings)STATE.settings.profile=null;
      if(window.FinnaProfile)window.FinnaProfile.start();
    };
    document.getElementById('setCheckUpdate').onclick=function(){
      try{
        if(window.FinBridge&&window.FinBridge.checkUpdate){window.FinBridge.checkUpdate();toast('Проверяю обновления…');}
        else if(window.FinBridge&&window.FinBridge.checkForUpdate){window.FinBridge.checkForUpdate();toast('Проверяю обновления…');}
        else{
          fetch('https://raw.githubusercontent.com/clubvine44-gif/kopeyka3/main/update.json?t='+Date.now()).then(function(r){return r.json();}).then(function(j){
            var local=(window.FinBridge&&window.FinBridge.getVersionCode)?window.FinBridge.getVersionCode():0;
            if(j.versionCode>local)toast('Доступна '+j.versionName+' — закрой и открой приложение или скачай APK');
            else toast('У тебя актуальная версия'+(j.versionName?(' '+j.versionName):''));
          }).catch(function(){toast('Не удалось проверить');});
        }
      }catch(e){toast('Не удалось проверить');}
    };
    document.getElementById('setTestPush').onclick=function(){
      try{
        if(window.FinBridge&&window.FinBridge.scheduleTestNotification){window.FinBridge.scheduleTestNotification();toast('Уведомление придёт через пару секунд');}
        else toast('Уведомления доступны в приложении');
      }catch(e){toast('Не удалось');}
    };
    document.getElementById('setExport').onclick=function(){exportData();};
    document.getElementById('setImport').onclick=function(){doClose();importData();};
    document.getElementById('setClear').onclick=function(){
      appConfirm('Удалить все данные? Это нельзя отменить.','Удалить всё').then(function(ok){
        if(!ok)return;pushUndo();STATE=def();save(true);if(window.kopeykaCloud&&window.kopeykaCloud.markLocalReset)window.kopeykaCloud.markLocalReset();doClose();render();toast('Данные удалены');
      });
    };
  });
}

function render(){
  _renderQueued=false;
  if(_rafRender!=null){try{cancelAnimationFrame(_rafRender);}catch(e){}}
  _rafRender=null;
  try{_renderNow();}catch(err){
    console.error(err);
    var a=document.getElementById("app");
    if(a)a.innerHTML="<div class=\"card\"><div class=\"hint\">Не удалось отрисовать экран. Потяни вниз для обновления.</div></div>";
  }
}
function _renderNow(){try{updateNotifBadge();}catch(e){}ensureMonth();var t=today(),month=getViewMonth(),isCurrent=(month===t.slice(0,7)),c=compute(),sh=shift(t,STATE.shiftsOverride),sl=SHIFT_LABEL[sh]||'День',app=document.getElementById('app');if(!app)return;var ym=month.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();var cal='<div class="cal">';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){cal+='<div class="cal-h">'+d+'</div>';});for(var i=0;i<sw;i++)cal+='<div class="cal-d other"></div>';var nextShiftDs=null;for(var nd=0;nd<21;nd++){var ndt=new Date(ym[0],ym[1]-1,Number(t.slice(8))+nd),nds=ndt.getFullYear()+'-'+String(ndt.getMonth()+1).padStart(2,'0')+'-'+String(ndt.getDate()).padStart(2,'0'),ns=shift(nds,STATE.shiftsOverride);if(ns==='day'||ns==='night'){nextShiftDs=nds;break;}}for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride),hasObl=STATE.obligations.some(function(ob){return ob.active!==false&&num(ob.day)===d;}),isNext=(ds===nextShiftDs);cal+='<div class="cal-d '+s+(ds===t&&isCurrent?' today':'')+(hasObl?' has-obl':'')+(isNext?' next-shift':'')+'" data-date="'+ds+'">'+(isNext?'<span class="star">✨</span>':'')+d+'<span class="dot"></span></div>';}cal+='</div>';
var resH=STATE.reserves.length?STATE.reserves.map(function(r){var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;var urg=(r.urgent&&r.urgentDate)?('<span class="res-urgent">срочный · '+r.urgentDate.slice(8,10)+'.'+r.urgentDate.slice(5,7)+'</span> '):'';return '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b> '+urg+'<span class="muted">'+fmt(r.saved)+(r.target?' / '+fmt(r.target)+' · '+pct+'%':'')+'</span></div></div>';}).join(''):'<div class="empty tight">Резервов нет</div>';
var debH=STATE.debts.length?STATE.debts.map(function(d){var left=Math.max(0,num(d.total)-num(d.paid)),pd=num(d.paid);var sub=pd<=0?(fmt(d.total)+' · не погашено'):('осталось '+fmt(left)+' · погашено '+fmt(pd)+' из '+fmt(d.total));return '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b><span class="muted">'+sub+'</span></div><div class="amt minus">'+fmt(left)+'</div></div>';}).join(''):'<div class="empty tight">Долгов нет</div>';
var oblH=STATE.obligations.length?STATE.obligations.map(function(ob){var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});var left=Math.max(0,num(ob.amount)-paid),isPaid=left<=0;return '<div class="item" data-id="'+ob.id+'" data-k="obl" data-paid="'+(isPaid?'1':'0')+'"><div class="left"><b>'+esc(ob.name)+'</b><span class="muted">'+fmt(ob.amount)+' / мес · '+(isPaid?'✓ оплачено':'до '+ob.day+'-го · '+fmt(left))+'</span></div>'+(isPaid?'<div class="amt plus check-paid">✓</div>':'<div class="amt minus">−'+fmt(left)+'</div>')+'</div>';}).join(''):'<div class="empty tight">Нет платежей</div>';
var ops=[];STATE.income.forEach(function(i){if(inMonth(i.date,month))ops.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id,deleted:!!i.deleted,edited:!!i.editedAt,at:Number(i.createdAt)||0});});STATE.expenses.forEach(function(e){if(!inMonth(e.date,month))return;var label=e.category||'Расход';if(e.category==='Долг')label='Долг'+(e.note?(' · '+e.note):'');else if(e.category==='Обязательные'&&e.note)label=e.note;else if(e.note&&e.note!==label)label=label+' · '+e.note;ops.push({t:e.date,type:'ex',a:e.amount,n:label,id:e.id,deleted:!!e.deleted,edited:!!e.editedAt,at:Number(e.createdAt)||0});});(STATE.reserveOps||[]).forEach(function(o){if(!inMonth(o.date,month))return;var rr=(STATE.reserves||[]).find(function(x){return x.id===o.reserveId;});var nm=rr?rr.name:'Резерв';ops.push({t:o.date,type:o.type==='deposit'?'res-':'res+',a:o.amount,n:(o.type==='deposit'?'В резерв «':'Из резерва «')+nm+'»',id:o.id});});ops.sort(function(a,b){var ta=Number(a.at)||0,tb=Number(b.at)||0;if(tb!==ta)return tb-ta;return(b.t||'').localeCompare(a.t||'')||String(b.id||'').localeCompare(String(a.id||''));});var opsH=ops.map(function(o){var mark=o.deleted?'<span class="op-mark del">удалено</span>':(o.edited?'<span class="op-mark edit">изменено</span>':'');return '<div class="item'+(o.deleted?' op-deleted':'')+'" data-id="'+o.id+'" data-k="'+o.type+'"><div class="left"><b>'+esc(o.n)+'</b>'+mark+'<span class="muted">'+(o.t||'')+'</span></div><div class="amt '+(o.type==='in'?'plus':'minus')+'">'+(o.type==='in'?'+':'−')+fmt(o.a)+'</div></div>';}).join('')||'<div class="empty tight">Нет операций</div>';
var colors=['#E5A75E','#60A5FA','#F87171','#4ADE80','#A78BFA','#FBBF24','#F472B6','#2DD4BF'];var catH='';if(c.cats.length){var totalCat=c.cats.reduce(function(s,x){return s+x.amount;},0)||1;catH=c.cats.slice(0,6).map(function(x,i){return '<div class="mini-cat"><span class="leg-dot" style="background:'+colors[i%colors.length]+'"></span><span class="leg-name">'+esc(x.name)+'</span><span class="leg-pct">'+Math.round(x.amount/totalCat*100)+'%</span><b>'+fmt(x.amount)+'</b></div>';}).join('');}else catH='<div class="empty tight">Нет расходов</div>';
function sec(id,title,right,body){var on=!!openSecs[id];return '<div class="sec'+(on?' open':'')+'" data-sec="'+id+'"><button type="button" class="sec-head"><span class="sec-title">'+title+'</span><span class="sec-right">'+right+'</span><span class="sec-chev">›</span></button><div class="sec-body">'+body+'</div></div>';}
var dailyStr=fmt(c.daily);
var whyDaily=c.available<=0?'<div class="hint">Свободных денег нет — сначала закрой долги или обязательные.</div>':'';
var r=50,circ=2*Math.PI*r;
var segs=[{label:'Свободно',val:Math.max(0,c.available),color:'#F0C060'},{label:'Обязательные',val:Math.max(0,c.obligDue),color:'#5EC8FF'},{label:'Долг',val:Math.max(0,c.debtLeft),color:'#F87171'}].filter(function(s){return s.val>0;});
var ringArcs='',legendHtml='';
if(c.cash<0){
  ringArcs='<circle cx="64" cy="64" r="'+r+'" fill="none" stroke="#F87171" stroke-width="8" stroke-linecap="round"/>';
  legendHtml='<div class="ring-leg-item"><span class="leg-dot" style="background:#F87171"></span><span class="leg-name">Касса в минусе</span><b class="neg">'+fmt(c.cash)+'</b></div>';
}else if(c.cash===0){
  ringArcs='<circle cx="64" cy="64" r="'+r+'" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="8"/>';
  legendHtml='<div class="ring-leg-item"><span class="leg-name">Пока пусто</span><b>0 ₽</b></div>';
}else{
  var sumParts=segs.reduce(function(s,x){return s+x.val;},0);
  var scale=(sumParts>c.cash&&sumParts>0)?c.cash/sumParts:1;
  var total=c.cash,cum=0;
  ringArcs+='<circle cx="64" cy="64" r="'+r+'" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/>';
  segs.forEach(function(s){
    var frac=Math.min(1,(s.val*scale)/total),len=frac*circ;
    ringArcs+='<circle cx="64" cy="64" r="'+r+'" fill="none" stroke="'+s.color+'" stroke-width="8" stroke-dasharray="'+len.toFixed(1)+' '+(circ-len).toFixed(1)+'" stroke-dashoffset="'+(-cum).toFixed(1)+'" transform="rotate(-90 64 64)"/>';
    cum+=len;
    legendHtml+='<div class="ring-leg-item"><span class="leg-dot" style="background:'+s.color+'"></span><span class="leg-name">'+s.label+'</span><b>'+fmt(s.val)+'</b></div>';
  });
  if(!segs.length)legendHtml='<div class="ring-leg-item"><span class="leg-name">Вся касса свободна</span><b>'+fmt(c.cash)+'</b></div>';
  if(sumParts>c.cash)legendHtml+='<div class="ring-leg-item"><span class="leg-name">Не хватает в кассе</span><b class="neg">'+fmt(sumParts-c.cash)+'</b></div>';
}
var ringSvg='<svg class="orbit-svg" viewBox="0 0 128 128" width="104" height="104">'+ringArcs+'</svg>';

var sparkWrap='';
if(c.available>0&&c.daysLeft>1){
  var sdays=Math.min(c.daysLeft,13),sparkPts=[];
  for(var si=0;si<=sdays;si++)sparkPts.push(Math.max(0,c.available-c.daily*si));
  var maxV=sparkPts[0]||1,stepX=sparkPts.length>1?100/(sparkPts.length-1):100;
  var poly=sparkPts.map(function(v,i){var x=i*stepX,y=32-(maxV>0?(v/maxV)*28:0);return x.toFixed(1)+','+y.toFixed(1);}).join(' ');
  var areaPts='0,34 '+poly+' '+(100).toFixed(1)+',34';
  var sparkSvg='<svg viewBox="0 0 100 36" preserveAspectRatio="none"><polygon points="'+areaPts+'" fill="#F0C060" opacity=".12"/><polyline points="'+poly+'" fill="none" stroke="#F0C060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  sparkWrap='<div class="spark-wrap">'+sparkSvg+'</div>';
}

/* view-aware main render */
var homeHtml = '';

// ===== Доп. данные для главного экрана =====
var spentToday=0;(STATE.expenses||[]).forEach(function(e){if(e.deleted)return;if(e.date===t)spentToday+=num(e.amount);});
var nearestObl = [];
(STATE.obligations||[]).forEach(function(ob){
  if(ob.active===false)return;
  var paid=0;
  (STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});
  var left=Math.max(0,num(ob.amount)-paid);
  if(left<=0)return;
  var day=Math.min(Math.max(1,num(ob.day)||1), new Date(ym[0],ym[1],0).getDate());
  var dueDate = month+'-'+String(day).padStart(2,'0');
  var daysUntil = days(t, dueDate);
  // если день платежа в этом месяце уже прошёл — считаем до того же дня следующего месяца
  if(daysUntil < 0 && isCurrent){
    var nm=nextMonth(month), np=nm.split('-').map(Number);
    var dimN=new Date(np[0],np[1],0).getDate();
    var dN=Math.min(day, dimN);
    dueDate=nm+'-'+String(dN).padStart(2,'0');
    daysUntil=days(t, dueDate);
  }else if(daysUntil < 0){
    daysUntil=0;
  }
  nearestObl.push({name:ob.name, amount:left, day:day, daysUntil:daysUntil, overdue:false, id:ob.id, dueDate:dueDate});
});
nearestObl.sort(function(a,b){return a.daysUntil-b.daysUntil;});
nearestObl = nearestObl.slice(0,3);

// Последние операции (3-5)
var recentOps = [];
function opAt(x){return Number(x&&x.createdAt)||0;}
(STATE.income||[]).forEach(function(i){if(i.deleted)return;recentOps.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id,k:'in',deleted:!!i.deleted,edited:!!i.editedAt,at:opAt(i)});});
(STATE.expenses||[]).forEach(function(e){
  if(e.deleted)return;
  var label=e.category||'Расход';
  if(e.category==='Долг'&&e.note)label=e.note;
  else if(e.note&&e.category==='Обязательные')label=e.note;
  recentOps.push({t:e.date,type:'ex',a:e.amount,n:label,id:e.id,k:'ex',deleted:!!e.deleted,edited:!!e.editedAt,at:opAt(e)});
});
(STATE.reserveOps||[]).forEach(function(o){
  if(o.deleted)return;
  var r=(STATE.reserves||[]).find(function(x){return x.id===o.reserveId;});
  var name=r?r.name:'Резерв';
  recentOps.push({t:o.date,type:o.type==='deposit'?'res-':'res+',a:o.amount,n:'Резерв «'+name+'»',id:o.id,k:'resop',at:opAt(o)});
});
recentOps.sort(function(a,b){
  var ta=Number(a.at)||0,tb=Number(b.at)||0;
  if(tb!==ta)return tb-ta;
  var dt=String(b.t||'').localeCompare(String(a.t||''));
  if(dt)return dt;
  return String(b.id||'').localeCompare(String(a.id||''));
});
recentOps = recentOps.slice(0,8);

// Быстрые категории из истории
var catCount={};
(STATE.expenses||[]).forEach(function(e){
  var cat=e.category||'Прочее';
  if(cat==='Долг'||cat==='Обязательные')return;
  catCount[cat]=(catCount[cat]||0)+1;
});
var quickCats = Object.keys(catCount).sort(function(a,b){return catCount[b]-catCount[a];}).slice(0,4);
if(!quickCats.length) quickCats=['Продукты','Кафе','Проезд','Сигареты'];

// Прогноз
var spentSoFar=0;(STATE.expenses||[]).forEach(function(e){if(e.deleted)return;if(inMonth(e.date,month)&&String(e.date)<=t)spentSoFar+=num(e.amount);});
var daysPassed = isCurrent ? Math.max(1, Number(t.slice(8)) ) : 1;
var pacePerDay = spentSoFar / daysPassed;
var lastDayNum = dim;
var daysAfterToday = isCurrent ? Math.max(0, lastDayNum - Number(t.slice(8))) : lastDayNum;
var forecastPace = Math.round(c.available - pacePerDay * daysAfterToday);
var remainToday = Math.max(0, (c.daily||0) - (spentToday||0));
var plannedByLimit = remainToday + (c.daily||0) * daysAfterToday;
var forecastStick = Math.round(c.available - plannedByLimit);

// Сегодняшняя смена info
var shiftInfo = '';
if(sh==='off'){
  shiftInfo = '<div class="today-shift off">Сегодня выходной</div>';
}else{
  var rate = (STATE.settings && (sh==='day' ? STATE.settings.dayRate : STATE.settings.nightRate)) || 0;
  var expected = rate ? '+'+fmt(rate) : '';
  var shiftName = sh==='day' ? 'Дневная смена' : 'Ночная смена';
  var stSet=STATE.settings||{};
  var timeStr = sh==='day'
    ? ((stSet.dayStart||'08:00')+' → '+(stSet.dayEnd||'20:00'))
    : ((stSet.nightStart||'20:00')+' → '+(stSet.nightEnd||'08:00'));
  shiftInfo = '<div class="today-shift '+sh+'"><b>'+shiftName+'</b><span class="muted">'+timeStr+(expected?' · ожидается '+expected:'')+'</span></div>';
}

// Финн tip — актуальные цифры без лишних запросов к ИИ
var finnTip = '';
var _uname=getUserName();
var _hello=_uname?(_uname+', '):'';
var leftDaysTip = c.daysLeft||1;
var horizonWord = (c.horizonLabel)||((STATE.settings&&STATE.settings.paydayDay)?'до зарплаты':'до конца месяца');
if(c.available <= 0){
  finnTip = _hello+'свободных денег нет: касса '+fmt(c.cash)+', долги '+fmt(c.debtLeft)+', обязательные '+fmt(c.obligDue)+'. Сегодня лучше без необязательных трат.';
}
var nearestUrgent=null;
(STATE.reserves||[]).forEach(function(r){
  if(!r.urgent||!r.urgentDate||r.deleted)return;
  var left=days(t,r.urgentDate);
  var need=Math.max(0,num(r.target)-num(r.saved));
  if(left>7)return;
  if(!nearestUrgent||left<nearestUrgent.left) nearestUrgent={name:r.name,left:left,need:need,date:r.urgentDate};
});
if(nearestUrgent){
  var ul=nearestUrgent.left, un=nearestUrgent.need;
  var when=ul<0?('просрочен на '+Math.abs(ul)+' дн.'):(ul===0?'сегодня':(ul===1?'завтра':'через '+ul+' дн.'));
  finnTip = (_hello||'')+'срочный резерв «'+nearestUrgent.name+'» — '+when+(un?('. Осталось внести из кассы '+fmt(un)+'.'):'.')+' Это не спишется само — пополни резерв, когда будешь готов.';
}else if(finnTip){
  /* already set: нет свободных */
}else if(nearestObl.length && nearestObl[0].daysUntil <= 14){
  var daysU = Math.max(0, nearestObl[0].daysUntil);
  var needKeep = num(nearestObl[0].amount);
  var have = Math.max(0, c.available);
  if(daysU===0){
    if(have>=needKeep) finnTip = 'Сегодня «'+nearestObl[0].name+'» — '+fmt(needKeep)+'. В кассе хватает; после оплаты останется ~'+fmt(have-needKeep)+'.';
    else finnTip = 'Сегодня «'+nearestObl[0].name+'» — '+fmt(needKeep)+', свободно только '+fmt(have)+'. Не хватает '+fmt(needKeep-have)+'.';
  }else if(have>=needKeep){
    var after=have-needKeep;
    var perRest=Math.floor(after/Math.max(1,leftDaysTip));
    finnTip = (daysU===1?'Завтра':'Через '+daysU+' дн.')+' «'+nearestObl[0].name+'» — '+fmt(needKeep)+'. Свободных хватает. После резерва на платёж останется ~'+fmt(after)+' (~'+fmt(perRest)+'/день).';
  }else{
    var gap=needKeep-have;
    var perSave=Math.ceil(gap/Math.max(1,daysU));
    finnTip = (daysU===1?'Завтра':'Через '+daysU+' дн.')+' «'+nearestObl[0].name+'» — '+fmt(needKeep)+'. Не хватает '+fmt(gap)+' — откладывай минимум '+fmt(perSave)+' ₽/день ('+daysU+' дн.).';
  }
}else if(c.daily > 0){
  var leftLimit = Math.max(0, c.daily - spentToday);
  if(spentToday > c.daily){
    finnTip = 'Лимит сегодня '+fmt(c.daily)+', уже '+fmt(spentToday)+' (перерасход '+fmt(spentToday-c.daily)+'). Свободно '+fmt(c.available)+', '+horizonWord+' '+leftDaysTip+' дн.';
  } else {
    finnTip = _hello+'сегодня ещё можно '+fmt(leftLimit)+' из '+fmt(c.daily)+'. Свободно '+fmt(c.available)+', '+horizonWord+' '+leftDaysTip+' дн.';
  }
}else{
  finnTip = 'Свободно '+fmt(c.available)+' на '+leftDaysTip+' дн. '+horizonWord+'. Задай лимит на карточке «Лимит на сегодня» — станет проще держать темп.';
}

// Блок «Обрати внимание»
var attention = [];
// срочные резервы (не авто-списание — только напоминание)
(STATE.reserves||[]).forEach(function(r){
  if(!r.urgent||!r.urgentDate||r.deleted)return;
  var left=Math.round((new Date(r.urgentDate+'T12:00:00')-new Date(t+'T12:00:00'))/86400000);
  var need=Math.max(0,num(r.target)-num(r.saved));
  if(left<0)attention.push('Срочный резерв «'+r.name+'» просрочен'+(need?(' · ещё '+fmt(need)):'')+'. Пополни из кассы, когда будешь готов.');
  else if(left<=7)attention.push((left===0?'Сегодня':'Через '+left+' дн.')+' срок резерва «'+r.name+'»'+(need?(' · осталось накопить '+fmt(need)):'')+'. С кассы спишется только при пополнении.');
});
if(nearestObl.length && nearestObl[0].overdue){
  attention.push('Платёж «'+nearestObl[0].name+'» просрочен на '+Math.abs(nearestObl[0].daysUntil)+' дн. Осталось '+fmt(nearestObl[0].amount)+'.');
}else if(nearestObl.length && nearestObl[0].daysUntil <= 3){
  attention.push('До платежа «'+nearestObl[0].name+'» осталось '+nearestObl[0].daysUntil+' дн. Нужно '+fmt(nearestObl[0].amount)+'.');
}
if(c.available > 0 && pacePerDay > c.daily * 1.2 && daysPassed > 3){
  attention.push('Текущий темп расходов выше безопасного на '+Math.round((pacePerDay/c.daily-1)*100)+'%.');
}
(STATE.reserves||[]).forEach(function(r){
  if(num(r.target)>0 && num(r.saved)>=num(r.target)) attention.push('Резерв «'+r.name+'» достиг цели!');
});
if(c.available < c.daily * 3 && c.available > 0){
  attention.push('Денег осталось мало. Крупно следи за дневным лимитом.');
}

// ===== 1. Главный финансовый блок + кольцо =====
homeHtml += '<div class="card hero" id="mainFinance">';
homeHtml += '<div class="hero-label">Сейчас</div>';
homeHtml += '<div class="hero-main">';
homeHtml += '<div class="orbit-wrap" id="ringTap" title="Подробная расшифровка">'+ringSvg;
homeHtml += '<div class="orbit-core"><div class="orbit-val">'+fmt(c.available)+'</div><div class="orbit-sub">Доступно</div></div></div>';
homeHtml += '<div class="hero-stats">';
homeHtml += '<div class="hero-avail-hint">можно потратить без нарушения планов</div>';
homeHtml += '<div class="ring-legend">'+legendHtml+'</div>';
homeHtml += '</div></div>';
homeHtml += '<div class="hero-kpis">';
homeHtml += '<div class="kpi"><span class="kpi-l">Касса</span><b>'+fmt(c.cash)+'</b></div>';
homeHtml += '<div class="kpi"><span class="kpi-l">Резервы</span><b>'+fmt(c.reservesTotal)+'</b></div>';
homeHtml += '<div class="kpi"><span class="kpi-l">Долги</span><b class="'+(c.debtLeft?'neg':'')+'">'+fmt(c.debtLeft||0)+'</b></div>';
homeHtml += '</div>';
homeHtml += sparkWrap + whyDaily;
homeHtml += '</div>';

// ===== 4. Сегодня =====
var _flagsT={showShifts:true,mode:'shift'};
try{if(window.FinnaProfile&&window.FinnaProfile.flags)_flagsT=Object.assign(_flagsT,window.FinnaProfile.flags());}catch(e){}
homeHtml += '<div class="card tight today-card" id="todayCard">';
if(_flagsT.showShifts){
  homeHtml += '<div class="sec-title-sm">СЕГОДНЯ</div>';
  homeHtml += shiftInfo;
} else {
  homeHtml += '<div class="sec-title-sm">СЕГОДНЯ · ФИННА</div>';
  homeHtml += '<div class="today-status" id="todayStatusBody">Загружаю мысль дня…</div>';
  setTimeout(function(){try{refreshTodayStatus();}catch(e){}},150);
}
homeHtml += '</div>';

// ===== 5. Лимит на сегодня =====
homeHtml += '<div class="card tight limit-card" id="limitCard">';
homeHtml += '<div class="limit-head"><span>Лимит на сегодня</span><b class="limit-val">'+fmt(c.daily)+'</b></div>';
var leftLimitShow=Math.max(0,(c.daily||0)-(spentToday||0));
var hLab=c.horizonLabel||'до конца месяца';
homeHtml += '<div class="limit-sub">'+esc(hLab.charAt(0).toUpperCase()+hLab.slice(1))+' · '+c.daysLeft+' дн. · осталось сегодня '+fmt(leftLimitShow)+'</div>';
var limitPct = c.daily>0 ? Math.min(100, Math.round( (spentToday||0)/c.daily *100 )) : 0;
homeHtml += '<div class="limit-bar"><div class="limit-fill'+(limitPct>=100?' over':'')+'" style="width:'+limitPct+'%"></div></div>';
var isManual=STATE.settings&&STATE.settings.manualDailyLimit!=null&&STATE.settings.manualDailyLimit!=='';
var hz=c.horizon||'month';
homeHtml += '<div class="limit-row">';
if(c.hasPayday){
  homeHtml += '<div class="limit-modes horizon" data-limit-kind="horizon">';
  homeHtml += '<span class="mode'+(hz==='payday'?' active':'')+'" data-horizon="payday">До зарплаты</span>';
  homeHtml += '<span class="mode'+(hz==='month'?' active':'')+'" data-horizon="month">До конца месяца</span>';
  homeHtml += '</div>';
}
homeHtml += '<div class="limit-modes" data-limit-kind="mode">';
homeHtml += '<span class="mode'+(isManual?'':' active')+'" data-mode="auto">Авто</span>';
homeHtml += '<span class="mode'+(isManual?' active':'')+'" data-mode="manual">Ручной</span>';
homeHtml += '</div></div>';
homeHtml += '</div>';

// ===== 6. Главная кнопка добавить =====
// ===== 7. Быстрые расходы =====
// ===== 15. Обрати внимание =====
/* attention folded into Finn card */


// ===== Finn tip (верхняя зона) =====
homeHtml += '<div class="card finn-tip-card" id="finnTipCard">';
homeHtml += '<div class="finn-tip-head"><span class="finn-mini finn-mini-face">'+(window.FinnChar?window.FinnChar.svgMarkup('','M'):'')+'</span> Финна · совет</div>';
homeHtml += '<div class="finn-tip-body" id="finnTipBody">'+esc(finnTip)+'</div>';
homeHtml += '<div class="finn-tip-hint">Зажми кнопку <b>+</b> внизу справа — откроется Финна</div>';
if(attention.length){
  homeHtml += '<div class="finn-att">';
  attention.slice(0,2).forEach(function(a){ homeHtml += '<div class="att-item">'+esc(a)+'</div>'; });
  homeHtml += '</div>';
}
homeHtml += '</div>';
setTimeout(function(){try{refreshFinnTipAI(finnTip,attention);}catch(e){}},100);

// ===== 9. Ближайшие платежи =====
homeHtml += '<div class="card tight near-card" id="nearCard">';
homeHtml += '<div class="sec-title-sm">БЛИЖАЙШИЕ ПЛАТЕЖИ</div>';
var nearItems=[];
nearestObl.forEach(function(o){nearItems.push({kind:'obl',id:o.id,name:o.name,when:o.overdue?'просрочен':('через '+o.daysUntil+' дн.'),amt:o.amount,days:o.daysUntil});});
(STATE.reserves||[]).forEach(function(r){
  if(!r.urgent||!r.urgentDate||r.deleted)return;
  var left=days(t,r.urgentDate);
  if(left>14)return;
  var need=Math.max(0,num(r.target)-num(r.saved));
  var when=left<0?('просрочен · срочный резерв'):(left===0?'сегодня · срочный резерв':('через '+left+' дн. · срочный'));
  nearItems.push({kind:'res',id:r.id,name:r.name,when:when,amt:need,days:left});
});
nearItems.sort(function(a,b){return a.days-b.days;});
if(nearItems.length){
  nearItems.slice(0,5).forEach(function(o){
    var k=o.kind==='res'?'res':'obl';
    homeHtml += '<div class="item" data-id="'+o.id+'" data-k="'+k+'"><div class="left"><b>'+esc(o.name)+'</b><span class="muted">'+o.when+'</span></div><div class="amt minus">'+fmt(o.amt)+'</div></div>';
  });
} else {
  homeHtml += '<div class="hint" style="margin:0">Пока нет ближайших платежей</div>';
}
homeHtml += '<button type="button" class="link-more" data-view="obl">Все платежи →</button>';
homeHtml += '</div>';


// ===== 10. Последние операции =====
homeHtml += '<div class="card tight">';
homeHtml += '<div class="sec-title-sm">ПОСЛЕДНИЕ ОПЕРАЦИИ</div>';
if(recentOps.length){
  recentOps.forEach(function(o){
    var cls = o.type==='in'||o.type==='res+' ? 'plus' : 'minus';
    var sign = o.type==='in'||o.type==='res+' ? '+' : '−';
    homeHtml += '<div class="item" data-id="'+o.id+'" data-k="'+o.k+'"><div class="left"><b>'+esc(o.n)+'</b><span class="muted">'+(o.t||'')+'</span></div><div class="amt '+cls+'">'+sign+fmt(o.a)+'</div></div>';
  });
}else{
  homeHtml += '<div class="empty tight">Пока нет операций</div>';
}
homeHtml += '<button type="button" class="link-more" data-view="ops">Все операции →</button>';
homeHtml += '</div>';

// ===== 11. Прогноз =====
homeHtml += '<div class="card tight forecast-card" id="forecastCard">';
homeHtml += '<div class="sec-title-sm">ПРОГНОЗ</div>';
homeHtml += '<div class="forecast-main">Сейчас свободно <b>'+fmt(c.available)+'</b> · до конца месяца ~'+(daysAfterToday+(isCurrent?1:0))+' дн.</div>';
homeHtml += '<div class="forecast-alt">При среднем <b>'+fmt(Math.round(pacePerDay))+'/день</b> к концу останется: <b>'+fmt(forecastPace)+'</b></div>';
homeHtml += '<div class="forecast-alt muted">Если не выше лимита <b>'+fmt(c.daily)+'/день</b>: <b>'+fmt(forecastStick)+'</b></div>';
homeHtml += '</div>';

// ===== 12. Резервы =====
var resTargetTotal = 0;
(STATE.reserves||[]).forEach(function(r){resTargetTotal+=num(r.target);});
var resPct = resTargetTotal>0 ? Math.min(100,Math.round(c.reservesTotal/resTargetTotal*100)) : 0;
homeHtml += '<div class="card tight">';
homeHtml += '<div class="sec-title-sm">РЕЗЕРВЫ</div>';
homeHtml += '<div class="res-total">'+fmt(c.reservesTotal)+(resTargetTotal?' / '+fmt(resTargetTotal):'')+'</div>';
homeHtml += '<div class="limit-bar"><div class="limit-fill" style="width:'+resPct+'%;background:var(--green)"></div></div>';
var topRes = (STATE.reserves||[]).slice().sort(function(a,b){return num(b.saved)-num(a.saved);}).slice(0,2);
topRes.forEach(function(r){
  var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;
  var urg=(r.urgent&&r.urgentDate)?('<span class="res-urgent">срочный · '+r.urgentDate.slice(8,10)+'.'+r.urgentDate.slice(5,7)+'</span> '):'';
  homeHtml += '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b> '+urg+'<span class="muted">'+fmt(r.saved)+(r.target?' / '+fmt(r.target):'')+'</span></div><div class="amt">'+pct+'%</div></div>';
});
homeHtml += '<button type="button" class="link-more" data-view="res">Все резервы →</button>';
homeHtml += '</div>';

// ===== 13. Долги =====
if(c.debtLeft > 0){
  homeHtml += '<div class="card tight">';
  homeHtml += '<div class="sec-title-sm">ДОЛГИ</div>';
  homeHtml += '<div class="res-total neg">Осталось: '+fmt(c.debtLeft)+'</div>';
  (STATE.debts||[]).slice(0,3).forEach(function(d){
    var left=Math.max(0,num(d.total)-num(d.paid)),pd=num(d.paid);
    if(left<=0)return;
    var sub=pd<=0?(fmt(d.total)+' · не погашено'):('осталось '+fmt(left)+' из '+fmt(d.total));
    homeHtml += '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b><span class="muted">'+sub+'</span></div><div class="amt minus">'+fmt(left)+'</div></div>';
  });
  homeHtml += '<button type="button" class="link-more" data-view="debt">Все долги →</button>';
  homeHtml += '</div>';
}

// ===== 14. Смены / планы (компактно) =====
var shCounts = countShifts ? countShifts(month) : {day:0,night:0,off:0};
var flags={showShifts:true,showPlanCalendar:false,mode:'shift',prioritizeDebts:false,prioritizeGoals:false,labelCalendar:'Смены'};
try{if(window.FinnaProfile&&window.FinnaProfile.flags)flags=Object.assign(flags,window.FinnaProfile.flags());}catch(e){}
var weekHtml = '<div class="week-strip">';
for(var wd=0;wd<7;wd++){
  var wdt = new Date(ym[0],ym[1]-1, Number(t.slice(8))+wd );
  var wds = wdt.getFullYear()+'-'+String(wdt.getMonth()+1).padStart(2,'0')+'-'+String(wdt.getDate()).padStart(2,'0');
  var ws = shift(wds, STATE.shiftsOverride);
  var hasP = !flags.showShifts && (STATE.dayPlans&&STATE.dayPlans[wds]||[]).length;
  var wlab = flags.showShifts ? (ws==='day'?'Д':ws==='night'?'Н':'В') : String(wdt.getDate());
  var isTod = wds===t;
  weekHtml += '<div class="wd'+(isTod?' today':'')+(hasP?' has-plan':'')+' '+ws+'" data-date="'+wds+'"><span class="wd-d">'+['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][wdt.getDay()]+'</span><span class="wd-s">'+wlab+'</span></div>';
}
weekHtml += '</div>';
if(flags.showShifts){
  homeHtml += '<div class="card tight" id="shiftsCard">';
  homeHtml += '<div class="sec-title-sm">МОИ СМЕНЫ</div>';
  homeHtml += weekHtml;
  homeHtml += '<div class="shift-summary">'+ (shCounts.day||0)+' дневных · '+(shCounts.night||0)+' ночных · '+(shCounts.off||0)+' выходных</div>';
  homeHtml += '<button type="button" class="link-more" id="btnFullCal">Полный календарь →</button>';
  homeHtml += '</div>';
} else if(flags.showPlanCalendar){
  homeHtml += '<div class="card tight" id="shiftsCard">';
  homeHtml += '<div class="sec-title-sm">'+(flags.mode==='budget'?'ПЛАНЫ НА ДНИ':'КАЛЕНДАРЬ')+'</div>';
  homeHtml += weekHtml;
  homeHtml += '<div class="hint" style="margin:8px 0 0">Нажми день — запланируй покупку, долг или доход. Сумма сразу попадёт в операции.</div>';
  homeHtml += '<button type="button" class="link-more" id="btnFullCal">Открыть календарь →</button>';
  homeHtml += '</div>';
}
// focus banners
if(flags.prioritizeDebts){
  homeHtml = homeHtml.replace(
    '<div class="card finn-tip-card"',
    '<div class="card tight" id="focusBanner"><div class="sec-title-sm">ФОКУС · ДОЛГИ</div><div class="hint" style="margin:0">Главное сейчас — закрывать долги. Лимит и советы заточены под это.</div></div><div class="card finn-tip-card"'
  );
} else if(flags.prioritizeGoals){
  homeHtml = homeHtml.replace(
    '<div class="card finn-tip-card"',
    '<div class="card tight" id="focusBanner"><div class="sec-title-sm">ФОКУС · НАКОПЛЕНИЯ</div><div class="hint" style="margin:0">Режим целей: резервы и лимит помогают копить.</div></div><div class="card finn-tip-card"'
  );
}


// month nav + cal (keep existing calendar)
/* full calendar moved to modal */

var viewTitle = {obl:'Обязательные',res:'Резервы и цели',debt:'Долги',ops:'Операции',an:'Аналитика'}[currentView]||'';
var viewBody = '';
if(currentView==='obl') viewBody = '<div class="list">'+oblH+'</div>';
else if(currentView==='res') viewBody = '<div class="list">'+resH+'</div>';
else if(currentView==='debt') viewBody = '<div class="list">'+debH+'</div>';
else if(currentView==='ops') viewBody = '<div class="list">'+opsH+'</div>';
else if(currentView==='an') viewBody = catH;

var htmlOut = '';
if(currentView==='home'){
  htmlOut = homeHtml;
} else {
  htmlOut = '<div class="view-title-bar"><h2>'+viewTitle+'</h2></div><div class="card"><div class="list">'+ (viewBody||'<div class="empty">Пусто</div>') +'</div></div>';
}
var prevScroll=(currentView==='home'&&window.__homeScroll)?window.__homeScroll:0;
app.innerHTML = htmlOut;
if(currentView==='home'&&prevScroll>0){requestAnimationFrame(function(){window.scrollTo(0,prevScroll);requestAnimationFrame(function(){window.scrollTo(0,prevScroll);});});}

try{if(window.FinBridge){if(window.FinBridge.updateWidgetDataFull){window.FinBridge.updateWidgetDataFull(fmt(c.daily),fmt(c.cash),fmt(c.available),sl,String(c.daysLeft));}else if(window.FinBridge.updateWidgetData){window.FinBridge.updateWidgetData(fmt(c.daily),fmt(c.cash),sl);}}}catch(e){}
if(!app._bound){app._bound=true;app.addEventListener('click',function(e){var t=e.target.closest('[data-date],.item[data-id],.sec-head,#mPrev,#mNext,#btnShiftPay,.quick-nav,[data-view],#btnAddMain,.qcat,#limitCard,#ringTap,#finnTipCard,#btnFullCal,.link-more,.mode');if(!t||!app.contains(t))return;if(t.classList&&t.classList.contains('quick-nav')||t.dataset.view){goView(t.dataset.view);return;}
if(t.id==='btnAddMain'||t.classList.contains('qcat')){
  var cat=t.dataset.cat;
  if(typeof openModal==='function'){
    // open expense with optional category
    if(cat&&cat!=='__all'){ window.__prefillCat=cat; }
    // trigger fab radial or direct expense
    var fab=document.getElementById('fab');
    if(fab) fab.click();
    else if(typeof addExpense==='function'){ /* fallback */ }
  }
  return;
}
if(t.id==='ringTap'||t.closest&&t.closest('#ringTap')){
  var cc=compute();var det='Касса — '+fmt(cc.cash)+'\n− обязательные — '+fmt(cc.obligDue||0)+'\n− долги — '+fmt(cc.debtLeft||0)+'\n\nДоступно — '+fmt(cc.available);
  appAlert(det,'Расшифровка');
  return;
}
if(t.id==='limitCard'||t.closest('#limitCard')){
  var hzEl=t.closest('[data-horizon]')||t;
  var horizon=hzEl.dataset&&hzEl.dataset.horizon;
  if(horizon==='payday'||horizon==='month'){
    if(!STATE.settings)STATE.settings={};
    STATE.settings.limitHorizon=horizon;
    save(true);render();
    toast(horizon==='payday'?'Лимит до зарплаты':'Лимит до конца месяца');
    return;
  }
  var mode=t.dataset&&t.dataset.mode;
  if(mode==='auto'){if(STATE.settings){STATE.settings.manualDailyLimit=null;}save(true);render();toast('Автоматический лимит');return;}
  if(mode==='manual'){var cur=compute().daily;appPrompt('Лимит на день (₽)',String(cur),'Ручной лимит').then(function(v){if(v===null)return;if(!STATE.settings)STATE.settings={};STATE.settings.manualDailyLimit=num(v);save(true);render();toast('Ручной лимит: '+fmt(num(v)));});return;}
  var cc2=compute();
  var det2='Горизонт — '+(cc2.horizonLabel||'')+'\nДней осталось — '+cc2.daysLeft+'\nДоступно — '+fmt(cc2.available)+'\nОбязательства — '+fmt((cc2.obligDue||0)+(cc2.debtLeft||0))+'\nЛимит на день — '+fmt(cc2.daily);
  appAlert(det2,'Лимит на сегодня');
  return;
}
if(t.id==='finnTipCard'){
  openAssistant({from:'avatar',fromEl:document.getElementById('finnAvatar')});
  return;
}
if(t.id==='btnFullCal'){
  openFullCalendar();
  return;
}
if(t.classList.contains('link-more')&&t.dataset.view){goView(t.dataset.view);return;}
if(t.id==='mPrev'){viewMonth=shiftMonth(getViewMonth(),-1);render();return;}if(t.id==='mNext'){viewMonth=shiftMonth(getViewMonth(),1);render();return;}if(t.id==='btnShiftPay'){showShiftPay();return;}if(t.classList.contains('sec-head')){var secEl=t.parentElement,id=secEl.dataset.sec;openSecs[id]=!openSecs[id];secEl.classList.toggle('open',!!openSecs[id]);return;}if(t.dataset.date){
  var planMode=false;try{planMode=window.FinnaProfile&&window.FinnaProfile.showPlanCalendar&&window.FinnaProfile.showPlanCalendar();}catch(e){}
  var ds=t.dataset.date;
  if(planMode){ dayPlanEditor(ds, function(){try{render();}catch(e){}}); return; }
  if(t.closest&&t.closest('.week-strip')) return;
  var isCur=(getViewMonth()===today().slice(0,7));if(!isCur){viewMonth=today().slice(0,7);render();toast('Вернись к текущему месяцу');return;}pushUndo();var cur=shift(ds,STATE.shiftsOverride),n=cur==='day'?'night':cur==='night'?'off':'day';STATE.shiftsOverride[ds]=n;save(true);render();toast('Смена: '+(SHIFT_LABEL[n]||n));return;
}var id=t.dataset.id,k=t.dataset.k,month=getViewMonth();if(!id||!k)return;
if(k==='in'){var inc=STATE.income.find(function(i){return i.id===id;});if(!inc)return;appChoice('Доход · '+fmt(inc.amount),['Изменить','Удалить'],'Доход').then(function(act){if(act===null)return;if(act===1){appConfirm('Удалить доход?','Удалить').then(function(ok){if(!ok)return;pushUndo();softDeleteIn('income',id,'income');if(STATE.lastOp&&STATE.lastOp.id===id)STATE.lastOp=null;save(true);render();toast('Удалено');});}else{appPrompt('Сумма',String(num(inc.amount)),'Изменить доход').then(function(av){if(av===null)return;appPrompt('Комментарий',inc.note||'','Комментарий',{text:true}).then(function(nn){if(nn===null)return;var a=num(av);if(a<=0)return toast('Укажи сумму');pushUndo();inc.amount=a;inc.note=String(nn||'Доход');inc.editedAt=new Date().toISOString();logOpChange('income',id,'edited',inc.note);save(true);render();toast('Доход обновлён');});});}});return;}
if(k==='ex'){var exp=STATE.expenses.find(function(i){return i.id===id;});if(!exp)return;appChoice('Расход · '+fmt(exp.amount),['Изменить','Удалить'],'Расход').then(function(act){if(act===null)return;if(act===1){appConfirm('Удалить расход?','Удалить').then(function(ok){if(!ok)return;pushUndo();softDeleteIn('expenses',id,'expense');if(STATE.lastOp&&STATE.lastOp.id===id)STATE.lastOp=null;save(true);render();toast('Удалено');});}else{appPrompt('Сумма',String(num(exp.amount)),'Изменить расход').then(function(av){if(av===null)return;appPrompt('Категория / комментарий',exp.note||exp.category||'','Комментарий',{text:true}).then(function(nn){if(nn===null)return;var a=num(av);if(a<=0)return toast('Укажи сумму');pushUndo();exp.amount=a;var label=String(nn||exp.category||'Прочее');if(exp.category==='Долг'||exp.category==='Обязательные'){exp.note=label;}else{exp.category=label;exp.note=label;}exp.editedAt=new Date().toISOString();logOpChange('expense',id,'edited',label);save(true);render();toast('Расход обновлён');});});}});return;}
if(k==='res'){var r=STATE.reserves.find(function(i){return i.id===id;});if(!r)return;appChoice('Резерв «'+r.name+'»',['Пополнить','Снять','Изменить','Удалить'],'Резерв').then(function(act){
  if(act===null)return;
  if(act===3){
    appConfirm('Удалить резерв?','Удалить').then(function(ok){
      if(!ok)return;pushUndo();STATE.reserves=STATE.reserves.filter(function(i){return i.id!==id;});
      STATE.reserveOps=STATE.reserveOps.filter(function(o){return o.reserveId!==id;});save(true);render();toast('Удалено');
    });
  } else if(act===2){
    appForm('Изменить резерв',[
      {name:'name',label:'Название',value:r.name||''},
      {name:'target',label:'Цель (0 — без цели)',value:String(num(r.target)),inputmode:'decimal'},
      {name:'saved',label:'Уже накоплено',value:String(num(r.saved)),inputmode:'decimal'}
    ],'Сохранить').then(function(v){
      if(!v)return;pushUndo();r.name=String(v.name||r.name).trim()||r.name;
      r.target=Math.max(0,num(v.target));r.saved=Math.max(0,num(v.saved));save(true);render();toast('Резерв обновлён');
    });
  } else if(act===1){
    appPrompt('Снять','0','Снять с резерва').then(function(av){
      var a=num(av);if(a>0&&a<=num(r.saved)){pushUndo();r.saved=num(r.saved)-a;
        STATE.reserveOps.push({id:uid(),reserveId:id,type:'withdraw',amount:a,date:today()});save(true);render();toast('Снято');}
    });
  } else if(act===0){
    appPrompt('Пополнить','0','Пополнить резерв').then(function(av){
      var a2=num(av);if(a2>0){pushUndo();r.saved=num(r.saved)+a2;
        STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:a2,date:today()});save(true);render();toast('Пополнено');}
    });
  }
});return;}
if(k==='debt'){var d=STATE.debts.find(function(i){return i.id===id;});if(!d)return;appChoice('Долг «'+d.name+'»',['Платёж','Увеличить','Изменить','Удалить'],'Долг').then(function(act){
  if(act===null)return;
  // 0 платёж, 1 увеличить, 2 изменить, 3 удалить
  if(act===3){
    appConfirm('Удалить долг? Погашения в операциях останутся.','Удалить').then(function(ok){
      if(!ok)return;pushUndo();
      STATE.debts=STATE.debts.filter(function(i){return i.id!==id;});
      if(STATE.lastOp&&STATE.lastOp.id===id)STATE.lastOp=null;
      save(true);render();toast('Удалено');
    });
    return;
  }
  if(act===1){
    appPrompt('На сколько увеличить долг','0','Увеличить долг').then(function(av){
      if(av===null)return;
      var a=num(av);
      if(a<=0)return toast('Укажи сумму больше 0');
      pushUndo();
      d.total=num(d.total)+a;
      if(num(d.paid)>num(d.total))d.paid=num(d.total);
      save(true);render();
      toast('Долг «'+d.name+'» +'+fmt(a)+' · всего '+fmt(d.total));
    });
    return;
  }
  if(act===2){
    appForm('Изменить долг',[
      {name:'name',label:'Название',value:d.name||'',placeholder:'Папа…'},
      {name:'total',label:'Полная сумма долга',value:String(num(d.total)),inputmode:'decimal'},
      {name:'paid',label:'Уже погашено',value:String(num(d.paid)),inputmode:'decimal'}
    ],'Сохранить').then(function(v){
      if(!v)return;
      var name=String(v.name||'').trim()||d.name;
      var tot=num(v.total), pd=num(v.paid);
      if(tot<=0)return toast('Сумма долга должна быть больше 0');
      if(pd<0)pd=0;if(pd>tot)pd=tot;
      pushUndo();
      var oldName=d.name;
      var oldTotal=num(d.total);
      var oldPaid=num(d.paid);
      // Явно пишем в объект долга
      d.name=name;
      d.total=tot;
      // синхронизация кассы только если изменилось погашение
      if(pd!==oldPaid){
        syncDebtPaid(d,pd,oldName);
      }else{
        d.paid=pd;
      }
      (STATE.expenses||[]).forEach(function(e){
        if(!e)return;
        if(e.debtId===d.id)e.note=name;
        else if(e.category==='Долг'&&String(e.note||'')===String(oldName))e.note=name;
      });
      save(true);render();
      toast('Долг обновлён: '+fmt(tot)+(tot!==oldTotal?(' (было '+fmt(oldTotal)+')'):''));
    });
    return;
  }
  // платёж
  appPrompt('Сумма платежа','0','Платёж по долгу').then(function(av){
    if(av===null)return;
    var a=num(av);if(a<=0)return toast('Укажи сумму');
    var left=Math.max(0,num(d.total)-num(d.paid));
    if(a>left)a=left;
    if(a<=0)return toast('Долг уже закрыт');
    pushUndo();syncDebtPaid(d,num(d.paid)+a);save(true);render();toast('Платёж: '+d.name+' · '+fmt(a));
  });
});return;}
if(k==='obl'){var ob=STATE.obligations.find(function(i){return i.id===id;});if(!ob)return;
if(t.dataset.paid==='1'){appConfirm('Сбросить оплату «'+ob.name+'» за этот месяц?','Сброс оплаты').then(function(ok){if(!ok)return;pushUndo();STATE.obligationPays=STATE.obligationPays.filter(function(p){return !(p.obligId===id&&p.month===month);});STATE.expenses=STATE.expenses.filter(function(e){return !(e.obligId===id&&inMonth(e.date,month));});save(true);render();toast('Оплата сброшена');});return;}
appChoice('«'+ob.name+'»',['Отметить оплату','Изменить','Удалить'],'Платёж').then(function(act){if(act===null)return;
if(act===2){appConfirm('Удалить?','Удалить').then(function(ok){if(!ok)return;pushUndo();STATE.obligations=STATE.obligations.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');});}
else if(act===1){appPrompt('Название',ob.name,'Изменить').then(function(nn){if(nn===null)return;appPrompt('Сумма',String(ob.amount),'Сумма').then(function(aa){appPrompt('День 1–31',String(ob.day),'День').then(function(dd){aa=num(aa);dd=num(dd);if(aa>0&&dd>=1&&dd<=31){pushUndo();ob.name=nn;ob.amount=aa;ob.day=dd;save(true);render();toast('Обновлено');}});});});}
else{var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===id&&p.month===month)paid+=num(p.amount);});var left=Math.max(0,num(ob.amount)-paid);if(left<=0)return toast('Уже оплачено');appPrompt('Сумма (осталось '+left+')',String(left),'Оплата').then(function(av){var a=num(av);if(a<=0)return;if(a>left)a=left;pushUndo();STATE.obligationPays.push({id:uid(),obligId:id,month:month,amount:a,date:today()});STATE.expenses.push({id:uid(),amount:a,category:'Обязательные',note:ob.name,date:today(),obligId:id});save(true);render();toast('Оплата учтена');});}});return;}
});}
}
function addIncome(){appForm('Доход',[
    {name:'amount',label:'Сумма',value:'',placeholder:'0',inputmode:'decimal'},
    {name:'note',label:'Комментарий',value:'Доход',placeholder:'Необязательно'}
  ],'Добавить доход').then(function(v){if(!v)return;var a=num(v.amount);if(a<=0)return toast('Укажи сумму');pushUndo();var _id=uid();STATE.income.push(stampOp({id:_id,amount:a,note:(v.note||'Доход'),date:today()}));trackLastOp('income',_id);pinCurrentMonth();save(true);render();toast('Доход добавлен');});}
function addExpense(){var pre=window.__prefillCat||'Продукты';window.__prefillCat=null;
var cats=(typeof CATS!=='undefined'?CATS:['Продукты','Кафе','Проезд','Сигареты','Прочее']).slice();
if(cats.indexOf(pre)<0)cats.unshift(pre);
appForm('Расход',[
  {name:'amount',label:'Сумма',value:'',placeholder:'0',inputmode:'decimal'},
  {name:'category',label:'Категория',type:'chips',options:cats.slice(0,12),value:pre},
  {name:'note',label:'Комментарий',value:'',placeholder:'Необязательно'}
],'Добавить расход').then(function(v){if(!v)return;var a=num(v.amount);if(a<=0)return toast('Укажи сумму');var cat=v.category||pre||'Прочее';pushUndo();var _id=uid();STATE.expenses.push(stampOp({id:_id,amount:a,category:cat,note:v.note||'',date:today()}));trackLastOp('expense',_id);pinCurrentMonth();save(true);render();toast('Расход добавлен');});}
function addReserve(){
  appChoice('Категория резерва',RES_PRESETS,'Новый резерв').then(function(idx){
    if(idx===null)return;
    var name=RES_PRESETS[idx];
    function cont(nm){
      if(!nm)return;
      appPrompt('Цель (0 если без цели)','0','Цель').then(function(tv){
        var t=num(tv);
        appPrompt('Уже накоплено','0','Накоплено').then(function(sv){
          var s=num(sv);
          appChoice('Это срочный резерв? (деньги списываются только когда пополняешь из кассы)',['Обычный','Срочный — указать дату'],'Тип резерва').then(function(ti){
            function finish(urgent, urgentDate){
              var id=uid();
              pushUndo();
              STATE.reserves.push({id:id,name:nm,category:nm,target:t,saved:s,urgent:!!urgent,urgentDate:urgentDate||''});
              if(s>0)STATE.reserveOps.push(stampOp({id:uid(),reserveId:id,type:'deposit',amount:s,date:today()}));
              save(true);render();
              toast(urgent?('Срочный резерв «'+nm+'» до '+urgentDate):('Резерв «'+nm+'» создан — переносится на все месяцы'));
            }
            if(ti===1){
              appDatePicker('К какой дате нужен резерв', today()).then(function(iso){
                if(!iso)return;
                finish(true, iso);
              });
            }else{
              finish(false,'');
            }
          });
        });
      });
    }
    if(name==='Свой вариант'){appPrompt('Название','','Название резерва').then(cont);}
    else cont(name);
  });
}
function addDebt(){
  appForm('Новый долг',[
    {name:'name',label:'Кому / название',value:'',placeholder:'Папа, банк…'},
    {name:'total',label:'Полная сумма долга',value:'',placeholder:'0',inputmode:'decimal'},
    {name:'paid',label:'Уже погашено (0 — если ничего)',value:'0',placeholder:'0',inputmode:'decimal'}
  ],'Добавить').then(function(v){
    if(!v)return;
    var name=String(v.name||'').trim();
    var tot=num(v.total), pd=num(v.paid);
    if(!name)return toast('Укажи название');
    if(tot<=0)return toast('Укажи сумму');
    if(pd<0)pd=0;if(pd>tot)pd=tot;
    pushUndo();
    var _id=uid();
    STATE.debts.push({id:_id,name:name,total:tot,paid:0});
    var d=STATE.debts[STATE.debts.length-1];
    if(pd>0)syncDebtPaid(d,pd);
    trackLastOp('debt',_id);
    save(true);render();toast(pd>0?('Долг · погашено '+fmt(pd)):'Долг добавлен');
  });
}
function addObligation(){appPrompt('Название (Алименты, Аренда…)','','Платёж').then(function(n){if(!n)return;appPrompt('Сумма каждый месяц','','Сумма').then(function(a){a=num(a);if(a<=0)return toast('Укажи сумму');appPrompt('Число месяца (1–31)','25','День').then(function(d){d=num(d);if(d<1||d>31)return toast('День 1–31');pushUndo();STATE.obligations.push({id:uid(),name:n,amount:a,day:d,active:true});save(true);render();toast('Обязательный платёж добавлен');});});});}
function openAssistant(opts){
  try{
    // снять возможные блокировки
    document.body.classList.remove('fin-tour-active','fin-settings-open');
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
    if(window.kopeykaAssistant&&typeof window.kopeykaAssistant.open==='function'){
      window.kopeykaAssistant.open(opts||{});
      return true;
    }
    if(window.kopeykaVoice&&typeof window.kopeykaVoice.open==='function'){
      window.kopeykaVoice.open(opts||{});
      return true;
    }
    toast('Финна ещё загружается — подожди секунду');
  }catch(e){console.error(e);toast('Не удалось открыть Финну');}
  return false;
}
window.openAssistant=openAssistant;

function bindFabHold(){
  var fab=document.getElementById('fab');
  var radial=document.getElementById('radial');
  if(!fab||fab._holdBound)return;
  fab._holdBound=true;
  var timer=null, fired=false, startX=0, startY=0;
  function clearT(){if(timer){clearTimeout(timer);timer=null;}}
  function onDown(e){
    fired=false;clearT();
    var p=e.touches&&e.touches[0]?e.touches[0]:e;
    startX=p.clientX||0;startY=p.clientY||0;
    fab.classList.add('holding');
    timer=setTimeout(function(){
      fired=true;
      fab.classList.remove('holding');
      if(radial){radial.classList.remove('show');fab.classList.remove('open');}
      try{if(navigator.vibrate)navigator.vibrate(30);}catch(x){}
      try{openAssistant({from:'fab',fromEl:fab});}catch(x){console.error(x);}
    },420);
  }
  function onMove(e){
    if(!timer)return;
    var p=e.touches&&e.touches[0]?e.touches[0]:e;
    var dx=Math.abs((p.clientX||0)-startX), dy=Math.abs((p.clientY||0)-startY);
    if(dx>18||dy>18){clearT();fab.classList.remove('holding');}
  }
  function onUp(e){
    clearT();fab.classList.remove('holding');
    if(fired){
      if(e&&e.preventDefault)e.preventDefault();
      if(e&&e.stopPropagation)e.stopPropagation();
    }
  }
  fab.addEventListener('touchstart',onDown,{passive:true});
  fab.addEventListener('touchmove',onMove,{passive:true});
  fab.addEventListener('touchend',onUp,{passive:false});
  fab.addEventListener('touchcancel',onUp,{passive:true});
  fab.addEventListener('mousedown',onDown);
  fab.addEventListener('mousemove',onMove);
  fab.addEventListener('mouseup',onUp);
  fab.addEventListener('mouseleave',onUp);
  fab.addEventListener('click',function(e){
    if(fired){e.preventDefault();e.stopPropagation();fired=false;return;}
    if(radial){radial.classList.toggle('show');fab.classList.toggle('open');}
  },true);
}
function setup(){
  var fab=document.getElementById('fab'),radial=document.getElementById('radial');
  if(radial){radial.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){radial.classList.remove('show');if(fab)fab.classList.remove('open');var a=btn.dataset.act;if(a==='income')addIncome();else if(a==='expense')addExpense();else if(a==='reserve')addReserve();else if(a==='debt')addDebt();else if(a==='oblig')addObligation();else if(a==='matter'){try{if(window.FinMatter)window.FinMatter.enter();else toast('Материя загружается…');}catch(e){toast('Не удалось открыть Материю');}}};});}
  bindFabHold();
  var av=document.getElementById('finnAvatar');
  if(av&&!av._bound){
    av._bound=true;
    av.addEventListener('click',function(){openAssistant({from:'avatar',fromEl:av});});
  }
  var bs=document.getElementById('btnSettings');
  if(bs)bs.onclick=function(){showSettings();};
  var bf=document.getElementById('btnFaq');
  if(bf)bf.onclick=function(){showFaq();};
  var bn=document.getElementById('btnNotif');
  if(bn)bn.onclick=function(){showNotifications();};
  try{updateNotifBadge();}catch(e){}
}

function boot(){if(!window.__scrollSaveBound){window.__scrollSaveBound=true;var st=null;window.addEventListener('scroll',function(){if((window.__finView||currentView||'home')!=='home')return;if(st)return;st=setTimeout(function(){st=null;window.__homeScroll=window.scrollY||document.documentElement.scrollTop||0;},120);},{passive:true});}try{STATE=norm(STATE);ensureMonth();var c=compute();if(STATE.income.length===0&&STATE.expenses.length===0&&c.cash<0&&!STATE.obligations.length&&!STATE.reserves.length){STATE=def();save(true);}}catch(e){STATE=def();}setup();render();syncReminders();setTimeout(bindFabHold,300);setTimeout(bindFabHold,1200);setTimeout(function(){try{if(!getUserName())showNameIntro(false);}catch(e){}},700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.goView=goView;window.goHome=goHome;window.render=render;window.compute=compute;window.syncReminders=typeof syncReminders==="function"?syncReminders:function(){};
Object.defineProperty(window,'currentView',{get:function(){return currentView;},set:function(v){currentView=v||'home';window.__finView=currentView;}});
})();