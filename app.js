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
function goView(v){try{if((currentView||'home')==='home'){window.__homeScroll=window.scrollY||document.documentElement.scrollTop||0;}}catch(e){}currentView=v||'home';window.__finView=currentView;try{history.pushState({view:currentView},'');}catch(e){}render();}
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
function shift(ds,ov){var v=ov&&ov[ds];if(typeof v==='string'&&SHIFT_LABEL[v])return v;return CYCLE[((days(ANCHOR,ds)%6)+6)%6];}
function cleanShifts(ov){var out={};if(!ov||typeof ov!=='object')return out;Object.keys(ov).forEach(function(k){var v=ov[k];if(typeof v==='string'&&SHIFT_LABEL[v])out[k]=v;});return out;}
function inMonth(dateStr,month){return String(dateStr||'').slice(0,7)===month;}
function def(){return{version:6,settings:{openingBalance:0,month:today().slice(0,7),dayRate:0,nightRate:0},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],voiceMap:{},shiftsOverride:{},dayPlans:{},updatedAt:new Date().toISOString()};}
function norm(raw){
  var b=def();if(!raw||typeof raw!=='object')return b;
  var o=Object.assign({},b,raw);o.settings=Object.assign({},b.settings,raw.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});
  o.shiftsOverride=cleanShifts(o.shiftsOverride);if(!o.voiceMap||typeof o.voiceMap!=='object')o.voiceMap={};
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
function save(skipUndo){STATE.updatedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(STATE));}catch(e){}if(window.kopeykaCloud&&window.kopeykaCloud.scheduleSave)window.kopeykaCloud.scheduleSave();syncReminders();}
function computeReminders(){var out=[],t=today(),day=Number(t.slice(8)),month=(STATE.settings&&STATE.settings.month)||t.slice(0,7);(STATE.obligations||[]).forEach(function(ob){if(ob.active===false)return;var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});var remain=Math.max(0,num(ob.amount)-paid);if(remain<=0)return;var y=Number(t.slice(0,4)),m=Number(t.slice(5,7)),dim=new Date(y,m,0).getDate(),d=Math.min(Math.max(1,num(ob.day)||1),dim);if(d<day){m+=1;if(m>12){m=1;y+=1;}var dim2=new Date(y,m,0).getDate();d=Math.min(Math.max(1,num(ob.day)||1),dim2);}var dateStr=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');out.push({id:String(ob.id),date:dateStr,title:'Копейка · платёж',message:ob.name+' — '+fmt(remain)});});return out;}
function syncReminders(){try{if(window.FinBridge&&window.FinBridge.scheduleReminders)window.FinBridge.scheduleReminders(JSON.stringify(computeReminders()));}catch(e){}}
function exportData(){try{var data=JSON.stringify(STATE,null,2),filename='kopeyka-backup-'+today()+'.json';if(window.FinBridge&&window.FinBridge.saveBackup){window.FinBridge.saveBackup(data,filename);}else{var blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},2000);}toast('Экспорт запущен');}catch(e){toast('Не удалось сделать экспорт');}}
function importData(){var inp=document.getElementById('importFileInput');if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.style.display='none';inp.id='importFileInput';document.body.appendChild(inp);inp.onchange=function(){var f=inp.files&&inp.files[0];if(!f){return;}var reader=new FileReader();reader.onload=function(){try{var parsed=JSON.parse(reader.result);appConfirm('Заменить текущие данные данными из файла?\nТекущие данные будут перезаписаны (можно вернуть через «Отменить последнее действие»).','Импорт').then(function(ok){if(!ok)return;pushUndo();STATE=norm(parsed);save(true);render();toast('Данные импортированы');});}catch(e){toast('Файл повреждён или не в формате Копейки');}};reader.readAsText(f);inp.value='';};}inp.click();}
window.kopeykaExport=exportData;window.kopeykaImport=importData;
window.defaultState=def;window.setAppState=function(s){pushUndo();STATE=norm(s);ensureMonth();save(true);render();};window.saveState=function(){save(true);};
Object.defineProperty(window,'STATE',{get:function(){return STATE;},set:function(v){STATE=norm(v);}});
function monthOps(month){var inc=0,exp=0,dep=0,wd=0;(STATE.income||[]).forEach(function(i){if(inMonth(i.date,month))inc+=num(i.amount);});(STATE.expenses||[]).forEach(function(e){if(inMonth(e.date,month))exp+=num(e.amount);});(STATE.reserveOps||[]).forEach(function(o){if(!inMonth(o.date,month))return;var a=num(o.amount);if(o.type==='deposit')dep+=a;else if(o.type==='withdraw')wd+=a;});return{inc:inc,exp:exp,dep:dep,wd:wd,delta:inc-exp-dep+wd};}
function nextMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]+1;if(m>12){m=1;y++;}return y+'-'+String(m).padStart(2,'0');}
function prevMonth(ym){var p=String(ym||'').split('-').map(Number);if(p.length<2||!p[0]||!p[1])return ym;var y=p[0],m=p[1]-1;if(m<1){m=12;y--;}return y+'-'+String(m).padStart(2,'0');}
function cmpMonth(a,b){return String(a||'').localeCompare(String(b||''));}
function openingForMonth(target){var anchor=(STATE.settings&&STATE.settings.month)||today().slice(0,7);var open=num(STATE.settings&&STATE.settings.openingBalance);target=String(target||anchor);if(target===anchor)return open;var guard=0;if(cmpMonth(target,anchor)>0){var m=anchor;while(m!==target&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}return open;}var m2=anchor;while(m2!==target&&guard++<240){m2=prevMonth(m2);open=open-monthOps(m2).delta;}return open;}
function computeForMonth(month){month=String(month||today().slice(0,7));var ops=monthOps(month);var open=openingForMonth(month);var cash=open+ops.delta;var resT=0;(STATE.reserves||[]).forEach(function(r){resT+=num(r.saved);});var debt=0;(STATE.debts||[]).forEach(function(d){debt+=Math.max(0,num(d.total)-num(d.paid));});var obligDue=0,obligPaid=0;(STATE.obligations||[]).forEach(function(ob){if(ob.active===false)return;var paid=0;(STATE.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});obligPaid+=paid;obligDue+=Math.max(0,num(ob.amount)-paid);});var avail=cash-debt-obligDue;var t=today(),p=month.split('-').map(Number);var last=new Date(p[0],p[1],0).getDate();var dayNum=Number(t.slice(8));var leftDays=month===t.slice(0,7)?Math.max(1,last-dayNum+1):last;var daily=avail>0?Math.floor(avail/leftDays):0;var manualL=STATE.settings&&STATE.settings.manualDailyLimit;if(manualL!=null&&manualL!==''&&isFinite(Number(manualL))){daily=Math.max(0,Math.round(Number(manualL)));}var by={};(STATE.expenses||[]).forEach(function(e){if(!inMonth(e.date,month))return;var cat=e.category||'Прочее';if(cat==='Долг'&&e.note)cat=e.note;by[cat]=(by[cat]||0)+num(e.amount);});var cats=Object.keys(by).map(function(k){return{name:k,amount:by[k]};}).sort(function(a,b){return b.amount-a.amount;});return{open:open,cash:cash,available:avail,incomeSum:ops.inc,expenseSum:ops.exp,depSum:ops.dep,wdSum:ops.wd,debtLeft:debt,reservesTotal:resT,obligDue:obligDue,obligPaid:obligPaid,daily:daily,daysLeft:leftDays,cats:cats,month:month};}
function compute(){return computeForMonth(getViewMonth());}
function ensureMonth(){var cur=today().slice(0,7);var st=(STATE.settings&&STATE.settings.month)||cur;if(!STATE.settings)STATE.settings={};if(st===cur)return;var guard=0,m=st,open=num(STATE.settings.openingBalance);while(m!==cur&&guard++<240){open=open+monthOps(m).delta;m=nextMonth(m);}STATE.settings.openingBalance=open;STATE.settings.month=cur;viewMonth=cur;save(true);toast('Новый месяц: остаток '+fmt(STATE.settings.openingBalance)+' перенесён');}
function toast(m){var el=document.getElementById('toast');if(!el)return;el.textContent=m;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2800);}window.toast=toast;
function countShifts(month){var p=month.split('-').map(Number),dim=new Date(p[0],p[1],0).getDate();var day=0,night=0,off=0,leftDay=0,leftNight=0,leftOff=0;var t=today(),curM=t.slice(0,7),curD=Number(t.slice(8));for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0');var s=shift(ds,STATE.shiftsOverride);if(s==='day')day++;else if(s==='night')night++;else off++;if(month>curM||(month===curM&&d>=curD)){if(s==='day')leftDay++;else if(s==='night')leftNight++;else leftOff++;}}return{day:day,night:night,off:off,total:dim,leftDay:leftDay,leftNight:leftNight,leftOff:leftOff,leftWork:leftDay+leftNight};}
function showShiftPay(){var month=getViewMonth(),sc=countShifts(month),dr=num(STATE.settings.dayRate),nr=num(STATE.settings.nightRate),pay=sc.day*dr+sc.night*nr,leftPay=sc.leftDay*dr+sc.leftNight*nr;var isCur=month===today().slice(0,7);var html='<div class="modal-card"><div class="modal-title">Смены · '+monthLabel(month)+'</div><div class="sp-grid"><div class="sp-item"><b>'+sc.day+'</b><span>День</span></div><div class="sp-item"><b>'+sc.night+'</b><span>Ночь</span></div><div class="sp-item"><b>'+sc.off+'</b><span>Выходной</span></div></div>'+(isCur?'<div class="sp-pay" style="margin-bottom:8px"><div class="muted">Осталось смен</div><div class="big" style="font-size:20px">'+sc.leftWork+' <span style="font-size:13px;font-weight:500;color:var(--muted)">('+sc.leftDay+'д + '+sc.leftNight+'н)</span></div></div>':'')+'<div class="sp-pay"><div class="muted">'+(isCur?'Осталось получить':'Ожидаемая зарплата')+'</div><div class="big" style="font-size:22px">'+fmt(isCur?leftPay:pay)+'</div>'+(dr||nr?'<div class="muted" style="margin-top:6px">день '+fmt(dr)+' · ночь '+fmt(nr)+(isCur?' · всего в месяце '+fmt(pay):'')+'</div>':'<div class="muted" style="margin-top:6px">Задай ставки в настройках ⚙</div>')+'</div><button type="button" class="btn-primary" id="spClose">Закрыть</button></div>';openModal(html,function(){var c=document.getElementById('spClose');if(c)c.onclick=closeModal;});}
function openModal(html,bind){var bg=document.getElementById('modalBg');if(!bg)return;bg.innerHTML=html;bg.classList.add('show');bg.onclick=function(e){if(e.target===bg)closeModal();};try{if(window.FinBridge&&window.FinBridge.setPullRefresh)window.FinBridge.setPullRefresh(false);}catch(e){}if(bind)bind();}
function closeModal(){var bg=document.getElementById('modalBg');if(!bg)return;bg.classList.remove('show','full');bg.innerHTML='';document.body.classList.remove('fin-settings-open');document.documentElement.style.overflow='';document.body.style.overflow='';try{if(window.FinBridge&&window.FinBridge.setPullRefresh)window.FinBridge.setPullRefresh(false);}catch(e){}}

function appAlert(message, title){
  return new Promise(function(resolve){
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Финна')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-actions"><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openModal(html,function(){
      var ok=document.getElementById('dlgOk');
      function done(){closeModal();resolve();}
      if(ok)ok.onclick=done;
    });
  });
}
function appConfirm(message, title){
  return new Promise(function(resolve){
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Подтверждение')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openModal(html,function(){
      document.getElementById('dlgCancel').onclick=function(){closeModal();resolve(false);};
      document.getElementById('dlgOk').onclick=function(){closeModal();resolve(true);};
    });
  });
}
function appPrompt(message, defVal, title, opts){
  return new Promise(function(resolve){
    opts=opts||{};
    var im=opts.inputmode!=null?opts.inputmode:(opts.text?'text':'decimal');
    var imAttr=im?(' inputmode="'+im+'"'):'';
    var html='<div class="modal-card"><div class="modal-title">'+(title||'Ввод')+'</div><div class="dlg-msg">'+esc(String(message||''))+'</div><div class="dlg-field"><input id="dlgInput" type="text" value="'+esc(String(defVal==null?'':defVal))+'" autocomplete="off"'+imAttr+'></div><div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">ОК</button></div></div>';
    openModal(html,function(){
      var inp=document.getElementById('dlgInput');
      if(inp){setTimeout(function(){inp.focus();inp.select&&inp.select();},80);}
      document.getElementById('dlgCancel').onclick=function(){closeModal();resolve(null);};
      function ok(){var v=inp?inp.value:null;closeModal();resolve(v);}
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
    openModal(html,function(){
      document.getElementById('dlgCancel').onclick=function(){closeModal();resolve(null);};
      Array.prototype.forEach.call(document.querySelectorAll('[data-choice]'),function(b){
        b.onclick=function(){var i=Number(b.getAttribute('data-choice'));closeModal();resolve(i);};
      });
    });
  });
}
window.appAlert=appAlert;window.appConfirm=appConfirm;window.appPrompt=appPrompt;window.appChoice=appChoice;


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
      var inputMode=f.inputmode?' inputmode="'+f.inputmode+'"':'';
      var typ=f.type||'text';
      return '<div class="dlg-field" data-fi="'+i+'"><label>'+esc(f.label||'')+'</label><input id="dlgF'+i+'" type="'+typ+'" value="'+esc(f.value==null?'':String(f.value))+'" placeholder="'+esc(f.placeholder||'')+'" autocomplete="off"'+inputMode+'></div>';
    }).join('');
    var html='<div class="modal-card"><div class="modal-title">'+esc(title||'')+'</div>'+fieldsHtml+'<div class="dlg-actions"><button type="button" class="btn" id="dlgCancel">Отмена</button><button type="button" class="btn primary" id="dlgOk">'+(okLabel||'ОК')+'</button></div></div>';
    openModal(html,function(){
      var first=document.getElementById('dlgF0');
      if(first&&first.tagName==='INPUT'){setTimeout(function(){first.focus();if(first.select)first.select();},60);}
      Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(ch){
        ch.onclick=function(){
          var fi=ch.getAttribute('data-chip');
          var row=document.getElementById('dlgChips'+fi);
          if(row)Array.prototype.forEach.call(row.querySelectorAll('.chip'),function(x){x.classList.remove('selected');});
          ch.classList.add('selected');
          var hid=document.getElementById('dlgF'+fi);
          if(hid)hid.value=ch.getAttribute('data-val')||'';
        };
      });
      document.getElementById('dlgCancel').onclick=function(){closeModal();resolve(null);};
      function ok(){
        var out={};
        fields.forEach(function(f,i){
          var el=document.getElementById('dlgF'+i);
          out[f.name]=el?el.value:'';
        });
        closeModal();resolve(out);
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
  var key=(window.kopeykaAI.getKey&&window.kopeykaAI.getKey())||'';
  try{if(!key)key=localStorage.getItem('kopeyka_groq_key')||'';}catch(e){}
  if(!key)return;
  var snap=window.kopeykaEngine&&window.kopeykaEngine.snapshot?window.kopeykaEngine.snapshot():null;
  var ctx=snap?JSON.stringify({available:snap.calculations&&snap.calculations.available,daily:snap.calculations&&snap.calculations.dailyBudget,cash:snap.calculations&&snap.calculations.cash,debts:snap.calculations&&snap.calculations.debtRemaining,daysLeft:snap.calculations&&snap.calculations.daysLeft,attention:attentionList||[]}):'';
  var prompt='Напиши ОДИН короткий совет (1-2 предложения) на русском для пользователя Копейки. Учти данные: '+ctx+'. Без markdown, без приветствия, по делу, по-дружески.';
  window.kopeykaAI.askConversation([],prompt).then(function(o){
    var t=(o&&(o.text||o.summary)||'').trim();
    if(t&&t.length>10&&t.length<400){el.textContent=t;}
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
    if(i===4){ pushUndo(); STATE.dayPlans[ds]=[]; save(true); if(onDone)onDone(); toast('День очищен'); return; }
    var types=['purchase','income','debt','note'];
    var type=types[i];
    if(type==='note'){
      appPrompt('Текст заметки','','Заметка',{text:true}).then(function(v){
        if(v===null||!String(v).trim())return;
        pushUndo();
        list=STATE.dayPlans[ds]||[];
        list.push({id:uid(),type:'note',amount:0,title:String(v).trim(),date:ds});
        STATE.dayPlans[ds]=list; save(true);
        if(onDone)onDone(); toast('Заметка сохранена');
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
          STATE.expenses.push({id:opId,amount:amount,category:title,note:title,date:ds,fromPlan:true});
        } else if(type==='income'){
          STATE.income.push({id:opId,amount:amount,note:title,date:ds,fromPlan:true});
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
            STATE.debts.push({id:uid(),name:title,total:amount,paid:amount});
          }
          STATE.expenses.push({id:opId,amount:amount,category:'Долг',note:title,date:ds,fromPlan:true});
        }
        list=STATE.dayPlans[ds]||[];
        list.push({id:uid(),type:type,amount:amount,title:title,date:ds,applied:true,opId:opId});
        STATE.dayPlans[ds]=list;
        save(true);
        if(onDone)onDone();
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

function showSettings(){
  document.body.classList.add('fin-settings-open');
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';

  var cash=compute().cash;
  var html='<div class="modal-card full-screen">'+
    '<div class="modal-title">Настройки</div>'+
    '<div class="modal-scroll">'+
    '<div class="set-group"><div class="set-group-title">Деньги</div>'+
      '<button type="button" class="set-row" id="setOpen"><div class="set-main"><b>Начальный остаток</b><span>Сумма, с которой ведётся касса</span></div><span class="set-val">'+fmt(STATE.settings.openingBalance)+'</span></button>'+
      '<button type="button" class="set-row" id="setCashNow"><div class="set-main"><b>Подстроить кассу</b><span>Если фактическая сумма другая</span></div><span class="set-val">'+fmt(cash)+'</span></button>'+
      (function(){try{if(window.FinnaProfile&&window.FinnaProfile.showRates&&!window.FinnaProfile.showRates())return '';}catch(e){}
        return '<button type="button" class="set-row" id="setDay"><div class="set-main"><b>Оплата за день</b><span>Ставка дневной смены</span></div><span class="set-val">'+fmt(STATE.settings.dayRate)+'</span></button>'+
      '<button type="button" class="set-row" id="setNight"><div class="set-main"><b>Оплата за ночь</b><span>Ставка ночной смены</span></div><span class="set-val">'+fmt(STATE.settings.nightRate)+'</span></button>';})()+
    '</div>'+
    '<div class="set-group"><div class="set-group-title">Ассистент</div>'+
      '<button type="button" class="set-row" id="setAi"><div class="set-main"><b>Голосовой помощник</b><span>Ключ для умных ответов Финна</span></div><span class="set-val" id="setAiStatus">—</span></button>'+
      '<button type="button" class="set-row" id="setScenario"><div class="set-main"><b>Сценарий жизни</b><span>Работа, бюджет, фокус — перестроить приложение</span></div><span class="set-val">↻</span></button>'+'<button type="button" class="set-row" id="setCheckUpdate"><div class="set-main"><b>Проверить обновления</b><span>Сверка с сервером прямо сейчас</span></div><span class="set-val">↻</span></button>'+'<button type="button" class="set-row" id="setTestPush"><div class="set-main"><b>Проверить уведомление</b><span>Придёт через несколько секунд</span></div><span class="set-val">↗</span></button>'+
    '</div>'+
    '<div class="set-group"><div class="set-group-title">Данные</div>'+
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

function render(){if(_renderQueued)return;_renderQueued=true;_rafRender=requestAnimationFrame(function(){_renderQueued=false;try{_renderNow();}catch(err){console.error(err);var a=document.getElementById("app");if(a)a.innerHTML="<div class=\"card\"><div class=\"hint\">Не удалось отрисовать экран. Потяни вниз для обновления.</div></div>";}});}
function _renderNow(){ensureMonth();var t=today(),month=getViewMonth(),isCurrent=(month===t.slice(0,7)),c=compute(),sh=shift(t,STATE.shiftsOverride),sl=SHIFT_LABEL[sh]||'День',app=document.getElementById('app');if(!app)return;var ym=month.split('-').map(Number),first=new Date(ym[0],ym[1]-1,1),sw=(first.getDay()+6)%7,dim=new Date(ym[0],ym[1],0).getDate();var cal='<div class="cal">';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(d){cal+='<div class="cal-h">'+d+'</div>';});for(var i=0;i<sw;i++)cal+='<div class="cal-d other"></div>';var nextShiftDs=null;for(var nd=0;nd<21;nd++){var ndt=new Date(ym[0],ym[1]-1,Number(t.slice(8))+nd),nds=ndt.getFullYear()+'-'+String(ndt.getMonth()+1).padStart(2,'0')+'-'+String(ndt.getDate()).padStart(2,'0'),ns=shift(nds,STATE.shiftsOverride);if(ns==='day'||ns==='night'){nextShiftDs=nds;break;}}for(var d=1;d<=dim;d++){var ds=month+'-'+String(d).padStart(2,'0'),s=shift(ds,STATE.shiftsOverride),hasObl=STATE.obligations.some(function(ob){return ob.active!==false&&num(ob.day)===d;}),isNext=(ds===nextShiftDs);cal+='<div class="cal-d '+s+(ds===t&&isCurrent?' today':'')+(hasObl?' has-obl':'')+(isNext?' next-shift':'')+'" data-date="'+ds+'">'+(isNext?'<span class="star">✨</span>':'')+d+'<span class="dot"></span></div>';}cal+='</div>';
var resH=STATE.reserves.length?STATE.reserves.map(function(r){var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;return '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b><span class="muted">'+fmt(r.saved)+(r.target?' / '+fmt(r.target)+' · '+pct+'%':'')+'</span></div></div>';}).join(''):'<div class="empty tight">Резервов нет</div>';
var debH=STATE.debts.length?STATE.debts.map(function(d){var left=Math.max(0,num(d.total)-num(d.paid));return '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b><span class="muted">'+fmt(left)+' из '+fmt(d.total)+'</span></div></div>';}).join(''):'<div class="empty tight">Долгов нет</div>';
var oblH=STATE.obligations.length?STATE.obligations.map(function(ob){var paid=0;STATE.obligationPays.forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=num(p.amount);});var left=Math.max(0,num(ob.amount)-paid),isPaid=left<=0;return '<div class="item" data-id="'+ob.id+'" data-k="obl" data-paid="'+(isPaid?'1':'0')+'"><div class="left"><b>'+esc(ob.name)+'</b><span class="muted">'+fmt(ob.amount)+' / мес · '+(isPaid?'✓ оплачено':'до '+ob.day+'-го · '+fmt(left))+'</span></div>'+(isPaid?'<div class="amt plus check-paid">✓</div>':'<div class="amt minus">−'+fmt(left)+'</div>')+'</div>';}).join(''):'<div class="empty tight">Нет платежей</div>';
var ops=[];STATE.income.forEach(function(i){if(inMonth(i.date,month))ops.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id});});STATE.expenses.forEach(function(e){if(!inMonth(e.date,month))return;var label=e.category||'Расход';if(e.category==='Долг'&&e.note)label=e.note;else if(e.note&&e.category==='Обязательные')label=e.note;ops.push({t:e.date,type:'ex',a:e.amount,n:label,id:e.id});});ops.sort(function(a,b){return(b.t||'').localeCompare(a.t||'');});var opsH=ops.slice(0,12).map(function(o){return '<div class="item" data-id="'+o.id+'" data-k="'+o.type+'"><div class="left"><b>'+esc(o.n)+'</b><span class="muted">'+(o.t||'')+'</span></div><div class="amt '+(o.type==='in'?'plus':'minus')+'">'+(o.type==='in'?'+':'−')+fmt(o.a)+'</div></div>';}).join('')||'<div class="empty tight">Нет операций</div>';
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
var spentToday=0;(STATE.expenses||[]).forEach(function(e){if(e.date===t)spentToday+=num(e.amount);});
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
  if(daysUntil < 0 && isCurrent){ /* overdue this month */ daysUntil = daysUntil; }
  else if(daysUntil < 0){ /* next month approx */ daysUntil = daysUntil + 30; }
  nearestObl.push({name:ob.name, amount:left, day:day, daysUntil:daysUntil, overdue:daysUntil<0, id:ob.id});
});
nearestObl.sort(function(a,b){return a.daysUntil-b.daysUntil;});
nearestObl = nearestObl.slice(0,3);

// Последние операции (3-5)
var recentOps = [];
(STATE.income||[]).forEach(function(i){recentOps.push({t:i.date,type:'in',a:i.amount,n:i.note||'Доход',id:i.id,k:'in'});});
(STATE.expenses||[]).forEach(function(e){
  var label=e.category||'Расход';
  if(e.category==='Долг'&&e.note)label=e.note;
  else if(e.note&&e.category==='Обязательные')label=e.note;
  recentOps.push({t:e.date,type:'ex',a:e.amount,n:label,id:e.id,k:'ex'});
});
(STATE.reserveOps||[]).forEach(function(o){
  var r=(STATE.reserves||[]).find(function(x){return x.id===o.reserveId;});
  var name=r?r.name:'Резерв';
  recentOps.push({t:o.date,type:o.type==='deposit'?'res-':'res+',a:o.amount,n:'Резерв «'+name+'»',id:o.id,k:'resop'});
});
recentOps.sort(function(a,b){return (b.t||'').localeCompare(a.t||'');});
recentOps = recentOps.slice(0,5);

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
var spentSoFar = c.expenseSum || 0;
var daysPassed = isCurrent ? Math.max(1, Number(t.slice(8)) ) : 1;
var pacePerDay = spentSoFar / daysPassed;
var forecastPace = Math.round(c.available - pacePerDay * c.daysLeft);
if(forecastPace < 0) forecastPace = 0;
var forecastLimit = Math.max(0, c.available - c.daily * c.daysLeft); // if stick to limit ~0 extra, but actually available -0
// better: if stick to daily, remaining at end = available - daily*daysLeft ~0 or residual
var residual = c.available - c.daily * c.daysLeft;
var forecastStick = Math.max(0, residual);

// Сегодняшняя смена info
var shiftInfo = '';
if(sh==='off'){
  shiftInfo = '<div class="today-shift off">Сегодня выходной</div>';
}else{
  var rate = (STATE.settings && (sh==='day' ? STATE.settings.dayRate : STATE.settings.nightRate)) || 0;
  var expected = rate ? '+'+fmt(rate)+' ₽' : '';
  var shiftName = sh==='day' ? 'Дневная смена' : 'Ночная смена';
  // rough time
  var timeStr = sh==='day' ? '08:00 → 20:00' : '20:00 → 08:00';
  shiftInfo = '<div class="today-shift '+sh+'"><b>'+shiftName+'</b><span class="muted">'+timeStr+(expected?' · ожидается '+expected:'')+'</span></div>';
}

// Финн tip
var finnTip = '';
if(c.available <= 0){
  finnTip = 'Свободных денег нет. Лучше сегодня не тратить и разобраться с долгами или обязательными.';
}else if(nearestObl.length && nearestObl[0].daysUntil <= 3){
  finnTip = 'До платежа «'+nearestObl[0].name+'» осталось '+Math.max(0,nearestObl[0].daysUntil)+' дн. Я бы сегодня не тратил больше '+fmt(Math.floor(c.available/Math.max(1,nearestObl[0].daysUntil+1)))+' ₽.';
}else if(c.daily > 0){
  finnTip = 'Сегодня ты потратил '+fmt(spentToday)+' ₽ из лимита '+fmt(c.daily)+' ₽. '+(spentToday<=c.daily?'Всё нормально.':'Осторожнее.');
}else{
  finnTip = 'Резервы заполнены на '+ (c.reservesTotal>0?Math.round(c.reservesTotal/Math.max(1,(STATE.reserves||[]).reduce(function(s,r){return s+num(r.target);},0))*100):0)+'%. Продолжай в том же духе.';
}

// Блок «Обрати внимание»
var attention = [];
if(nearestObl.length && nearestObl[0].overdue){
  attention.push('Платёж «'+nearestObl[0].name+'» просрочен на '+Math.abs(nearestObl[0].daysUntil)+' дн. Осталось '+fmt(nearestObl[0].amount)+' ₽.');
}else if(nearestObl.length && nearestObl[0].daysUntil <= 3){
  attention.push('До платежа «'+nearestObl[0].name+'» осталось '+nearestObl[0].daysUntil+' дн. Нужно '+fmt(nearestObl[0].amount)+' ₽.');
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
homeHtml += '<div class="limit-head"><span>Лимит на сегодня</span><b class="limit-val">'+fmt(c.daily)+' ₽</b></div>';
homeHtml += '<div class="limit-sub">До конца месяца '+c.daysLeft+' дн.</div>';
var limitPct = c.daily>0 ? Math.min(100, Math.round( (spentToday||0)/c.daily *100 )) : 0;
homeHtml += '<div class="limit-bar"><div class="limit-fill" style="width:'+limitPct+'%"></div></div>';
var isManual=STATE.settings&&STATE.settings.manualDailyLimit!=null&&STATE.settings.manualDailyLimit!=='';
homeHtml += '<div class="limit-modes"><span class="mode'+(isManual?'':' active')+'" data-mode="auto">Авто</span><span class="mode'+(isManual?' active':'')+'" data-mode="manual">Ручной</span></div>';
homeHtml += '</div>';

// ===== 6. Главная кнопка добавить =====
// ===== 7. Быстрые расходы =====
// ===== 15. Обрати внимание =====
/* attention folded into Finn card */


// ===== Finn tip (верхняя зона) =====
homeHtml += '<div class="card finn-tip-card" id="finnTipCard">';
homeHtml += '<div class="finn-tip-head"><span class="finn-mini">🦊</span> Финна · совет</div>';
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
if(nearestObl.length){
  nearestObl.forEach(function(o){
    var when = o.overdue ? '<span class="neg">просрочен</span>' : ('через '+o.daysUntil+' дн.');
    homeHtml += '<div class="item" data-id="'+o.id+'" data-k="obl"><div class="left"><b>'+esc(o.name)+'</b><span class="muted">'+when+'</span></div><div class="amt minus">'+fmt(o.amount)+'</div></div>';
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
homeHtml += '<div class="forecast-main">При текущем темпе расходов<br>к концу месяца останется: <b>'+fmt(forecastPace)+' ₽</b></div>';
homeHtml += '<div class="forecast-alt muted">Если придерживаться дневного лимита: <b>'+fmt(Math.max(0,c.available - spentSoFar/*approx*/))+ ' ₽</b></div>';
homeHtml += '</div>';

// ===== 12. Резервы =====
var resTargetTotal = 0;
(STATE.reserves||[]).forEach(function(r){resTargetTotal+=num(r.target);});
var resPct = resTargetTotal>0 ? Math.min(100,Math.round(c.reservesTotal/resTargetTotal*100)) : 0;
homeHtml += '<div class="card tight">';
homeHtml += '<div class="sec-title-sm">РЕЗЕРВЫ</div>';
homeHtml += '<div class="res-total">'+fmt(c.reservesTotal)+(resTargetTotal?' / '+fmt(resTargetTotal):'')+' ₽</div>';
homeHtml += '<div class="limit-bar"><div class="limit-fill" style="width:'+resPct+'%;background:var(--green)"></div></div>';
var topRes = (STATE.reserves||[]).slice().sort(function(a,b){return num(b.saved)-num(a.saved);}).slice(0,2);
topRes.forEach(function(r){
  var pct=r.target>0?Math.min(100,Math.round(num(r.saved)/num(r.target)*100)):0;
  homeHtml += '<div class="item" data-id="'+r.id+'" data-k="res"><div class="left"><b>'+esc(r.name)+'</b><span class="muted">'+fmt(r.saved)+(r.target?' / '+fmt(r.target):'')+'</span></div><div class="amt">'+pct+'%</div></div>';
});
homeHtml += '<button type="button" class="link-more" data-view="res">Все резервы →</button>';
homeHtml += '</div>';

// ===== 13. Долги =====
if(c.debtLeft > 0){
  homeHtml += '<div class="card tight">';
  homeHtml += '<div class="sec-title-sm">ДОЛГИ</div>';
  homeHtml += '<div class="res-total neg">Осталось: '+fmt(c.debtLeft)+' ₽</div>';
  (STATE.debts||[]).slice(0,3).forEach(function(d){
    var left=Math.max(0,num(d.total)-num(d.paid));
    if(left<=0)return;
    homeHtml += '<div class="item" data-id="'+d.id+'" data-k="debt"><div class="left"><b>'+esc(d.name)+'</b></div><div class="amt minus">'+fmt(left)+'</div></div>';
  });
  homeHtml += '<button type="button" class="link-more" data-view="debt">Все долги →</button>';
  homeHtml += '</div>';
}

// ===== 14. Смены (компактно) =====
var shCounts = countShifts ? countShifts(month) : {day:0,night:0,off:0};
// compact 7 days
var weekHtml = '<div class="week-strip">';
for(var wd=0;wd<7;wd++){
  var wdt = new Date(ym[0],ym[1]-1, Number(t.slice(8))+wd );
  var wds = wdt.getFullYear()+'-'+String(wdt.getMonth()+1).padStart(2,'0')+'-'+String(wdt.getDate()).padStart(2,'0');
  var ws = shift(wds, STATE.shiftsOverride);
  var wlab = ws==='day'?'Д':ws==='night'?'Н':'В';
  var isTod = wds===t;
  weekHtml += '<div class="wd'+(isTod?' today':'')+' '+ws+'"><span class="wd-d">'+['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][wdt.getDay()]+'</span><span class="wd-s">'+wlab+'</span></div>';
}
weekHtml += '</div>';
var flags={showShifts:true,showPlanCalendar:false,mode:'shift',prioritizeDebts:false,prioritizeGoals:false,labelCalendar:'Смены'};
try{if(window.FinnaProfile&&window.FinnaProfile.flags)flags=Object.assign(flags,window.FinnaProfile.flags());}catch(e){}
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
  homeHtml += weekHtml.replace(/wd-s">Д/g,'wd-s">·').replace(/wd-s">Н/g,'wd-s">·').replace(/wd-s">В/g,'wd-s">·');
  homeHtml += '<div class="hint" style="margin:8px 0 0">Нажми день — запланируй покупку, долг или доход</div>';
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
  var cc=compute();var det='Касса — '+fmt(cc.cash)+' ₽\n− обязательные — '+fmt(cc.obligDue||0)+' ₽\n− долги — '+fmt(cc.debtLeft||0)+' ₽\n\nДоступно — '+fmt(cc.available)+' ₽';
  appAlert(det,'Расшифровка');
  return;
}
if(t.id==='limitCard'||t.closest('#limitCard')){
  var mode=t.dataset.mode;
  if(mode==='auto'){if(STATE.settings){STATE.settings.manualDailyLimit=null;}save(true);render();toast('Автоматический лимит');return;}
if(mode==='manual'){var cur=compute().daily;appPrompt('Лимит на день (₽)',String(cur),'Ручной лимит').then(function(v){if(v===null)return;if(!STATE.settings)STATE.settings={};STATE.settings.manualDailyLimit=num(v);save(true);render();toast('Ручной лимит: '+fmt(num(v)));});return;}
  var cc2=compute();var det2='Доступно сейчас — '+fmt(cc2.available)+' ₽\nОбязательства — '+fmt((cc2.obligDue||0)+(cc2.debtLeft||0))+' ₽\nОсталось дней — '+cc2.daysLeft+'\nРекомендуемый лимит — '+fmt(cc2.daily)+' ₽/день';
  appAlert(det2,'Лимит на сегодня');
  return;
}
if(t.id==='finnTipCard'){
  openAssistant();
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
  if(planMode){ dayPlanEditor(ds, function(){render();}); return; }
  var isCur=(getViewMonth()===today().slice(0,7));if(!isCur){viewMonth=today().slice(0,7);render();toast('Вернись к текущему месяцу');return;}pushUndo();var cur=shift(ds,STATE.shiftsOverride),n=cur==='day'?'night':cur==='night'?'off':'day';STATE.shiftsOverride[ds]=n;save(true);render();toast('Смена: '+(SHIFT_LABEL[n]||n));return;
}var id=t.dataset.id,k=t.dataset.k,month=getViewMonth();if(!id||!k)return;
if(k==='in'){appConfirm('Удалить доход?','Удалить').then(function(ok){if(!ok)return;pushUndo();STATE.income=STATE.income.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');});return;}
if(k==='ex'){appConfirm('Удалить расход?','Удалить').then(function(ok){if(!ok)return;pushUndo();STATE.expenses=STATE.expenses.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');});return;}
if(k==='res'){var r=STATE.reserves.find(function(i){return i.id===id;});if(!r)return;appChoice('Резерв «'+r.name+'»',['Пополнить','Снять','Удалить'],'Резерв').then(function(act){if(act===null)return;if(act===2){appConfirm('Удалить резерв?','Удалить').then(function(ok){if(!ok)return;pushUndo();STATE.reserves=STATE.reserves.filter(function(i){return i.id!==id;});STATE.reserveOps=STATE.reserveOps.filter(function(o){return o.reserveId!==id;});save(true);render();toast('Удалено');});}else if(act===1){appPrompt('Снять','0','Снять с резерва').then(function(av){var a=num(av);if(a>0&&a<=num(r.saved)){pushUndo();r.saved=num(r.saved)-a;STATE.reserveOps.push({id:uid(),reserveId:id,type:'withdraw',amount:a,date:today()});save(true);render();toast('Снято');}});}else if(act===0){appPrompt('Пополнить','0','Пополнить резерв').then(function(av){var a2=num(av);if(a2>0){pushUndo();r.saved=num(r.saved)+a2;STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:a2,date:today()});save(true);render();toast('Пополнено');}});}});return;}
if(k==='debt'){var d=STATE.debts.find(function(i){return i.id===id;});if(!d)return;appChoice('Долг «'+d.name+'»',['Платёж','Удалить'],'Долг').then(function(act){if(act===null)return;if(act===1){appConfirm('Удалить долг?','Удалить').then(function(ok){if(!ok)return;pushUndo();STATE.debts=STATE.debts.filter(function(i){return i.id!==id;});save(true);render();toast('Удалено');});}else{appPrompt('Сумма платежа','0','Платёж по долгу').then(function(av){var a=num(av);if(a>0){pushUndo();d.paid=num(d.paid)+a;STATE.expenses.push({id:uid(),amount:a,category:'Долг',note:d.name,date:today()});save(true);render();toast('Платёж: '+d.name);}});}});return;}
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
  ],'Добавить доход').then(function(v){if(!v)return;var a=num(v.amount);if(a<=0)return toast('Укажи сумму');pushUndo();STATE.income.push({id:uid(),amount:a,note:(v.note||'Доход'),date:today()});save(true);render();toast('Доход добавлен');});}
function addExpense(){var pre=window.__prefillCat||'Продукты';window.__prefillCat=null;
var cats=(typeof CATS!=='undefined'?CATS:['Продукты','Кафе','Проезд','Сигареты','Прочее']).slice();
if(cats.indexOf(pre)<0)cats.unshift(pre);
appForm('Расход',[
  {name:'amount',label:'Сумма',value:'',placeholder:'0',inputmode:'decimal'},
  {name:'category',label:'Категория',type:'chips',options:cats.slice(0,12),value:pre},
  {name:'note',label:'Комментарий',value:'',placeholder:'Необязательно'}
],'Добавить расход').then(function(v){if(!v)return;var a=num(v.amount);if(a<=0)return toast('Укажи сумму');var cat=v.category||pre||'Прочее';pushUndo();STATE.expenses.push({id:uid(),amount:a,category:cat,note:v.note||'',date:today()});save(true);render();toast('Расход добавлен');});}
function addReserve(){appChoice('Категория резерва',RES_PRESETS,'Новый резерв').then(function(idx){if(idx===null)return;var name=RES_PRESETS[idx];function cont(nm){if(!nm)return;appPrompt('Цель (0 если без цели)','0','Цель').then(function(tv){var t=num(tv);appPrompt('Уже накоплено','0','Накоплено').then(function(sv){var s=num(sv);var id=uid();pushUndo();STATE.reserves.push({id:id,name:nm,category:nm,target:t,saved:s});if(s>0)STATE.reserveOps.push({id:uid(),reserveId:id,type:'deposit',amount:s,date:today()});save(true);render();toast('Резерв «'+nm+'» создан — переносится на все месяцы');});});}if(name==='Свой вариант'){appPrompt('Название','','Название резерва').then(cont);}else cont(name);});}
function addDebt(){appPrompt('Название долга','','Долг').then(function(n){if(!n)return;appPrompt('Сумма','','Сумма долга').then(function(t){t=num(t);if(t<=0)return toast('Укажи сумму');pushUndo();STATE.debts.push({id:uid(),name:n,total:t,paid:0});save(true);render();toast('Долг добавлен');});});}
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
  }catch(e){console.error(e);toast('Не удалось открыть Финнуну');}
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
      try{openAssistant();}catch(x){console.error(x);}
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
  if(radial){radial.querySelectorAll('button').forEach(function(btn){btn.onclick=function(){radial.classList.remove('show');if(fab)fab.classList.remove('open');var a=btn.dataset.act;if(a==='income')addIncome();else if(a==='expense')addExpense();else if(a==='reserve')addReserve();else if(a==='debt')addDebt();else if(a==='oblig')addObligation();};});}
  bindFabHold();
  var av=document.getElementById('finnAvatar');
  if(av&&!av._bound){
    av._bound=true;
    av.addEventListener('click',function(){openAssistant();});
  }
  var bs=document.getElementById('btnSettings');
  if(bs)bs.onclick=function(){showSettings();};
}

function boot(){if(!window.__scrollSaveBound){window.__scrollSaveBound=true;var st=null;window.addEventListener('scroll',function(){if((window.__finView||currentView||'home')!=='home')return;if(st)return;st=setTimeout(function(){st=null;window.__homeScroll=window.scrollY||document.documentElement.scrollTop||0;},120);},{passive:true});}try{STATE=norm(STATE);ensureMonth();var c=compute();if(STATE.income.length===0&&STATE.expenses.length===0&&c.cash<0&&!STATE.obligations.length&&!STATE.reserves.length){STATE=def();save(true);}}catch(e){STATE=def();}setup();render();syncReminders();setTimeout(bindFabHold,300);setTimeout(bindFabHold,1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
;window.goView=goView;window.goHome=goHome;window.currentView=currentView;})();