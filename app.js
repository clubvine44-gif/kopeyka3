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
function getViewMonth(){return viewMonth||(STATE.settings&&STATE.settings.month)||today().slice(0,7);}
function goView(v){currentView=v||'home';window.__finView=currentView;try{history.pushState({view:currentView},'');}catch(e){}render();}
function goHome(){currentView='home';window.__finView='home';render();}
window.addEventListener('popstate',function(){currentView='home';render();});
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function num(v){var n=Number(v);return(!isFinite(n)||n!==n)?0:Math.round(n);}
function sane(v){return num(v);}
function esc(s){return String(s==null?'':s).replace(/&/g,'&'+'amp;').replace(/</g,'&'+'lt;').replace(/>/g,'&'+'gt;').replace(/\"/g,'&'+'quot;').replace(/'/g,'&#39;');}
function pd(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
function shift(ds,ov){var v=ov&&ov[ds];if(typeof v==='string'&&SHIFT_LABEL[v])return v;return STATE&&STATE.settings&&STATE.settings.scheduleMode==='blank'?'off':CYCLE[((days(ANCHOR,ds)%6)+6)%6];}
function cleanShifts(ov){var out={};if(!ov||typeof ov!=='object')return out;Object.keys(ov).forEach(function(k){var v=ov[k];if(typeof v==='string'&&SHIFT_LABEL[v])out[k]=v;});return out;}
function inMonth(dateStr,month){return String(dateStr||'').slice(0,7)===month;}
function def(){return{version:7,settings:{openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0,scheduleMode:'blank'},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],voiceMap:{},shiftsOverride:{},updatedAt:new Date().toISOString()};}
function norm(raw){
  var b=def();if(!raw||typeof raw!=='object')return b;
  var o=Object.assign({},b,raw);o.settings=Object.assign({},b.settings,raw.settings||{});
  /* Existing users keep their established 2-2-2 schedule; only truly new state starts blank. */
  if(!Object.prototype.hasOwnProperty.call(raw,'settings')||!Object.prototype.hasOwnProperty.call(raw.settings||{},'scheduleMode'))o.settings.scheduleMode='legacy';
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  o.shiftsOverride=cleanShifts(o.shiftsOverride);if(!o.voiceMap||typeof o.voiceMap!=='object')o.voiceMap={};
  o.settings.openingBalance=sane(o.settings.openingBalance);o.settings.dayRate=sane(o.settings.dayRate);o.settings.nightRate=sane(o.settings.nightRate);
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
function save(skipUndo){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();syncReminders();}
function computeReminders(){var out=[],t=today(),day=Number(t.slice(8)),month=(STATE.settings&&STATE.settings.month)||t.slice(0,7);(STATE.obligations||[]).forEach(function(ob){if(ob.active===false)return;var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});var remain=Math.max(0,num(ob.amount)-paid);if(remain<=0)return;var y=Number(t.slice(0,4)),m=Number(t.slice(5,7)),dim=new Date(y,m,0).getDate(),d=Math.min(Math.max(1,num(ob.day)||1),dim);if(d<day){m+=1;if(m>12){m=1;y+=1;}var dim2=new Date(y,m,0).getDate();d=Math.min(Math.max(1,num(ob.day)||1),dim2);}var dateStr=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');out.push({id:String(ob.id),date:dateStr,title:'Копейка · платёж',message:ob.name+' — '+fmt(remain)});});return out;}
function syncReminders(){try{if(window.FinBridge&&window.FinBridge.scheduleReminders)window.FinBridge.scheduleReminders(JSON.stringify(computeReminders()));}catch(e){}}
function exportData(){try{var data=JSON.stringify(STATE,null,2),filename='kopeyka-backup-'+today()+'.json';if(window.FinBridge&&window.FinBridge.saveBackup){window.FinBridge.saveBackup(data,filename);}else{var blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);}toast('Экспорт запущен');}catch(e){toast('Не удалось сделать экспорт');}}
function importData(){var inp=document.getElementById('importFileInput');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.style.display='none';inp.id='importFileInput';document.body.appendChild(inp);inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f){return;}var reader=new FileReader();reader.onload=function(){try{var parsed=JSON.parse(reader.result);if(!confirm('Заменить текущие данные данными из файла?\\nТекущие данные будут перезаписаны (можно вернуть через «Отменить последнее действие»).'))return;pushUndo();STATE=norm(parsed);save(true);render();toast('Данные импортированы');}catch(e){toast('Файл повреждён или не в формате Копейки');}};reader.readAsText(f);inp.value='';};}inp.click();}
window.kopeykaExport=exportData;window.kopeykaImport=importData;
window.defaultState=def;window.setAppState=function(s){pushUndo();STATE=norm(s);ensureMonth();save(true);render();};window.saveState=function(){save(true);};
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function monthOps(month){var inc=0,exp=0,dep=0,wd=0;(STATE.income||[]).forEach(function(i){if(inMonth(i.date,month))inc+=num(i.amount);});(STATE.expenses||[]).forEach(function(e){if(inMonth(e.date,month))exp+=num(e.amount);});(STATE.reserveOps||[]).forEach(function(o){if(!inMonth(o.date,month))return;var a=num(o.amount);if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;});return{inc:inc,exp:exp,dep:dep,wd:wd,delta:inc-exp-dep+wd};}
function nextMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]+1;if(m>12){m=1;y++;}return y+'-'+String(m).padStart(2,'0');}
function prevMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]-1;if(m<1){m=12;y--;}return y+'-'+String(m).padStart(2,'0');}
function cmpMonth(a,b){return String(a||'').localeCompare(String(b||''));}
function openingForMonth(target){var anchor=(STATE.settings&&STATE.settings.month)||today().slice(0,7);var open=num(STATE.settings&&STATE.settings.openingBalance);target=String(target||anchor);if(target===anchor)return open;var guard=0;if(cmpMonth(target,anchor)>0){var m=anchor;while(m!==target&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}return open;}var m2=anchor;while(m2!==target&&guard++<240){m2=prevMonth(m2);open=open-monthOps(m2).delta;}return open;}
function computeForMonth(month){month=String(month||today().slice(0,7));var ops=monthOps(month);var open=openingForMonth(month);var cash=open+ops.delta;var resT=0;(STATE.reserves||[]).forEach(function(r){resT+=num(r.saved);});var debt=0;(STATE.debts||[]).forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});var obligDue=0,obligPaid=0;(STATE.obligations||[]).forEach(function(ob){if(ob.active===false)return;var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});obligPaid+=paid;obligDue+=Math.max(0,num(ob.amount)-paid);});var avail=cash-debt-obligDue;var t=today(),p=month.split('-').map(Number);var last=new Date(p[0],p[1],0).getDate();var dayNum=Number(t.slice(8));var leftDays=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;var daily=avail>0?Math.floor(avail/leftDays):0;var by={};(STATE.expenses||[]).forEach(function(e){if(!inMonth(e.date,month))return;var cat=e.category||'Прочее';if(cat==='Долг'&&e.note)cat=e.note;by[cat]=(by[cat]||0)+num(e.amount);});var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});return{open:open,cash:cash,available:avail,incomeSum:ops.inc,expenseSum:ops.exp,depSum:ops.dep,wdSum:ops.wd,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,cats:cats,month:month};}
function compute(){return computeForMonth(getViewMonth());}
function ensureMonth(){var cur=today().slice(0,7);var st=(STATE.settings&&STATE.settings.month)||cur;if(st===cur)return;var guard=0,m=st,open=num(STATE.settings.openingBalance);while(m!==cur&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}STATE.settings.openingBalance=open;STATE.settings.month=cur;viewMonth=cur;save(true);toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён');}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2800);}window.toast=toast;
/* The remainder of the original application logic is intentionally retained below this point. */
