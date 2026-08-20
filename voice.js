(function(){
'use strict';

var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
var CATS=['Продукты','Связь','Проезд','Жильё','Здоровье','Развлечения','Одежда','Кафе','Подписки','Обязательные','Долг','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Свой вариант'];
var recognition=null, listening=false, lastText='';

function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9.,-]+/gi,' ').replace(/\s+/g,' ').trim();}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function num(v){var n=Number(String(v||'').replace(/\s/g,'').replace(',','.'));return isFinite(n)&&n>0?Math.round(n):0;}

var ONES={ноль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19};
var TENS={двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90};
var HUND={сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
function wordsNumber(s){
  var a=norm(s).replace(/рубл(ей|я)?/g,'').trim().split(' ').filter(Boolean),total=0,cur=0,seen=false;
  for(var i=0;i<a.length;i++){
    var w=a[i];
    if(ONES[w]!==undefined){cur+=ONES[w];seen=true;continue;}
    if(TENS[w]!==undefined){cur+=TENS[w];seen=true;continue;}
    if(HUND[w]!==undefined){cur+=HUND[w];seen=true;continue;}
    if(w==='тысяча'||w==='тысячи'||w==='тысяч'){total+=(cur||1)*1000;cur=0;seen=true;continue;}
    if(w==='миллион'||w==='миллиона'||w==='миллионов'){total+=(cur||1)*1000000;cur=0;seen=true;continue;}
  }
  return seen?total+cur:0;
}
function extractAmount(text){
  var s=norm(text),m=s.match(/(?:^|\s)(\d{1,3}(?:[\s]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?:руб(?:лей|ля)?|р|₽))?(?:\s|$)/i);
  if(m){var n=num(m[1]);if(n)return n;}
  return wordsNumber(s);
}
function categoryFromText(text){
  var s=norm(text),rules=[
    ['Продукты',['майонез','хлеб','молок','кефир','сыр','колбас','мяс','куриц','рыб','яйц','масл','макарон','круп','рис','греч','картош','овощ','фрукт','сахар','соль','продукт','еда','магазин','продовольств','супермаркет']],
    ['Связь',['телефон','мобильн','связь','интернет','сим карт','тариф']],
    ['Проезд',['проезд','автобус','маршрут','метро','троллейбус','такси','билет','бензин','топливо','заправк','парковк']],
    ['Жильё',['аренд','квартир','жиль','коммунал','квартплат','свет','газ','вода','отоплен']],
    ['Здоровье',['аптек','лекарств','таблет','врач','стоматолог','анализ','клиник','здоров']],
    ['Развлечения',['кино','игр','развлечен','концерт','театр','бар','клуб']],
    ['Одежда',['одежд','обув','куртк','футболк','штаны','джинс','рубашк','носк','белье']],
    ['Кафе',['кафе','ресторан','пицц','бургер','шаверм','шаурм','кофейн','доставка еды']],
    ['Подписки',['подписк','spotify','ютуб','youtube','netflix','vpn','сервис']],
    ['Обязательные',['алименты','аренд','обязательн','ежемесячн']],
    ['Долг',['долг','должен','долгов','вернул','вернуть долг']],
    ['Прочее',['сигарет','сигарета','табак','вейп','прочее','другое']]
  ];
  for(var i=0;i<rules.length;i++)for(var j=0;j<rules[i][1].length;j++)if(s.indexOf(rules[i][1][j])!==-1)return rules[i][0];
  return '';
}
function typeFromText(text){
  var s=norm(text);
  if(/\b(доход|получил|получила|получить|зарплат|заработал|заработала|начисл|пришл[аи] деньги|выдали|аванс|преми)/.test(s))return 'income';
  if(/\b(расход|потрат|купил|купила|купить|оплатил|оплатила|заплатил|заплатила|потрач|ушло|покупк|взял)/.test(s))return 'expense';
  return '';
}
function commentFromText(text,amount){
  var s=norm(text).replace(/\b(добавь|добавить|запиши|записать|внеси|внести|создай|сделай|учти|покажи|мне|пожалуйста|расход|доход|потратил|потратила|купил|купила|оплатил|оплатила|заплатил|заплатила|получил|получила|получить|заработал|заработала|зарплата|зарплатой|на|за|руб(?:лей|ля)?|руб|р)\b/g,' ').replace(/\d+(?:[.,]\d+)?/g,' ').replace(/\s+/g,' ').trim();
  return s;
}
function cloneState(){return JSON.parse(JSON.stringify(window.STATE));}
function applyState(s){if(typeof window.setAppState!=='function')throw new Error('Приложение ещё не готово');window.setAppState(s);}
function addExpense(amount,category,note){var s=cloneState();s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),amount:amount,category:category||'Прочее',note:note||'',date:new Date().toISOString().slice(0,10)});applyState(s);}
function addIncome(amount,note){var s=cloneState();s.income=Array.isArray(s.income)?s.income:[];s.income.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),amount:amount,note:note||'Доход',date:new Date().toISOString().slice(0,10)});applyState(s);}
function findReserve(s,name){var q=norm(name);return (s.reserves||[]).find(function(r){return norm(r.name)===q||norm(r.category)===q||q.indexOf(norm(r.name))!==-1||norm(r.name).indexOf(q)!==-1;});}
function addReserve(amount,name,withdraw){var s=cloneState();s.reserves=Array.isArray(s.reserves)?s.reserves:[];s.reserveOps=Array.isArray(s.reserveOps)?s.reserveOps:[];var r=findReserve(s,name||'');if(!r){r={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name||'Свой вариант',category:name||'Свой вариант',target:0,saved:0};s.reserves.push(r);}var a=amount;if(withdraw){if(a>Number(r.saved||0))throw new Error('В резерве только '+Number(r.saved||0).toLocaleString('ru-RU')+' ₽');r.saved=Number(r.saved||0)-a;}else r.saved=Number(r.saved||0)+a;s.reserveOps.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),reserveId:r.id,type:withdraw?'withdraw':'deposit',amount:a,date:new Date().toISOString().slice(0,10)});applyState(s);return r.name;}
function addDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];s.debts.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name||'Долг',total:amount,paid:0});applyState(s);}
function payDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];var q=norm(name||''),d=s.debts.find(function(x){return q&&norm(x.name).indexOf(q)!==-1;})||s.debts.find(function(x){return Number(x.total||0)>Number(x.paid||0);});if(!d)throw new Error('Подходящий долг не найден');d.paid=Number(d.paid||0)+amount;s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),amount:amount,category:'Долг',note:d.name,date:new Date().toISOString().slice(0,10)});applyState(s);return d.name;}
function addObligation(amount,name,day){var s=cloneState();s.obligations=Array.isArray(s.obligations)?s.obligations:[];s.obligations.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:name||'Платёж',amount:amount,day:day||25,active:true});applyState(s);}
function openUI(){
  if(document.getElementById('voiceModal'))return startListening();
  var bg=document.createElement('div');bg.id='voiceModal';bg.className='voice-bg';
  bg.innerHTML='<div class="voice-card"><div class="voice-head"><div><div class="voice-kicker">Копейка · голос</div><div class="voice-title">Говори как удобно</div></div><button class="voice-close" id="voiceClose">×</button></div><div class="voice-orb" id="voiceOrb">🎙️</div><div class="voice-status" id="voiceStatus">Нажми на микрофон и скажи команду</div><div class="voice-text" id="voiceText"></div><div class="voice-hint">Например: «добавь расход 500 рублей на сигареты» или «купил майонез за 120 рублей»</div><div class="voice-actions"><button class="voice-btn primary" id="voiceSpeak">Говорить</button><button class="voice-btn" id="voiceCancel">Отмена</button></div></div>';
  document.body.appendChild(bg);bg.addEventListener('click',function(e){if(e.target===bg)closeUI();});
  document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceSpeak').onclick=startListening;
  startListening();
}
function closeUI(){stopListening();var e=document.getElementById('voiceModal');if(e)e.remove();}
function setUI(status,text){var s=document.getElementById('voiceStatus'),t=document.getElementById('voiceText'),o=document.getElementById('voiceOrb');if(s)s.textContent=status;if(t)t.textContent=text||'';if(o)o.classList.toggle('listening',listening);}
function startListening(){
  if(!SR){setUI('Голосовой ввод недоступен','Открой Копейку в Chrome на Android и разреши доступ к микрофону.');return;}
  stopListening();recognition=new SR();recognition.lang='ru-RU';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=3;listening=true;setUI('Слушаю…','');
  recognition.onresult=function(e){var finalText='';for(var i=e.resultIndex;i<e.results.length;i++)finalText+=e.results[i][0].transcript+' ';lastText=finalText.trim();setUI('Слышу',lastText);if(e.results[e.results.length-1].isFinal)processCommand(lastText);};
  recognition.onerror=function(e){listening=false;setUI(e.error==='not-allowed'?'Нет доступа к микрофону':'Не удалось распознать речь','Нажми «Говорить» и повтори.');};
  recognition.onend=function(){listening=false;var b=document.getElementById('voiceSpeak');if(b)b.textContent='Говорить';};
  try{recognition.start();}catch(e){}
}
function stopListening(){if(recognition){try{recognition.onresult=null;recognition.stop();}catch(e){}recognition=null;}listening=false;}
function confirmBox(title,details,onYes){var bg=document.getElementById('voiceModal');if(!bg)return;var card=bg.querySelector('.voice-card');card.innerHTML='<div class="voice-head"><div><div class="voice-kicker">Проверь операцию</div><div class="voice-title">'+esc(title)+'</div></div><button class="voice-close" id="voiceClose2">×</button></div><div class="voice-confirm">'+details+'</div><div class="voice-actions"><button class="voice-btn primary" id="voiceYes">Добавить</button><button class="voice-btn" id="voiceNo">Изменить</button></div>';
  document.getElementById('voiceClose2').onclick=closeUI;document.getElementById('voiceNo').onclick=function(){card.innerHTML='<div class="voice-head"><div><div class="voice-kicker">Повтори</div><div class="voice-title">Скажи команду ещё раз</div></div><button class="voice-close" id="voiceClose3">×</button></div><div class="voice-orb" id="voiceOrb">🎙️</div><div class="voice-status" id="voiceStatus">Нажми на микрофон</div><div class="voice-text" id="voiceText"></div><div class="voice-hint">Например: «расход 500 сигареты»</div><div class="voice-actions"><button class="voice-btn primary" id="voiceSpeak">Говорить</button><button class="voice-btn" id="voiceCancel">Отмена</button></div>';document.getElementById('voiceClose3').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceSpeak').onclick=startListening;startListening();};
  document.getElementById('voiceYes').onclick=function(){try{onYes();setUI('Готово','Операция добавлена в Копейку.');setTimeout(closeUI,850);}catch(e){setUI('Не добавлено',e.message||'Ошибка');}};
}
function categoryPicker(text,amount,note){var bg=document.getElementById('voiceModal'),card=bg.querySelector('.voice-card');card.innerHTML='<div class="voice-head"><div><div class="voice-kicker">Не уверена с категорией</div><div class="voice-title">Куда отнести расход?</div></div><button class="voice-close" id="voiceClose4">×</button></div><div class="voice-confirm">'+esc(amount.toLocaleString('ru-RU'))+' ₽ · '+esc(note||text)+'</div><div class="voice-cats">'+CATS.map(function(c){return '<button data-cat="'+esc(c)+'">'+esc(c)+'</button>';}).join('')+'</div>';
  document.getElementById('voiceClose4').onclick=closeUI;card.querySelectorAll('.voice-cats button').forEach(function(b){b.onclick=function(){var cat=b.dataset.cat;confirmBox('Расход '+amount.toLocaleString('ru-RU')+' ₽','Категория: <b>'+esc(cat)+'</b><br>Описание: '+esc(note||text),function(){addExpense(amount,cat,note);});};});}
function processCommand(text){
  stopListening();var s=norm(text),amount=extractAmount(s);if(!amount){setUI('Не нашла сумму','Скажи, например: «расход 500 рублей»');return;}
  var type=typeFromText(s),cat=categoryFromText(s),note=commentFromText(s,amount);
  if(/\b(резерв|отлож|подушк|копить|накоплен)/.test(s)){
    var wd=/\b(сними|снять|вытащи|взял из|из резерва)/.test(s),name=note.replace(/\b(резерв|отложить|отложи|сними|снять|пополнить|пополни|накопить|накопления)\b/g,'').trim()||'Свой вариант';
    confirmBox((wd?'Снять из резерва ':'Пополнить резерв ')+amount.toLocaleString('ru-RU')+' ₽','Резерв: <b>'+esc(name)+'</b>',function(){addReserve(amount,name,wd);});return;
  }
  if(/\b(долг|должен|должна|занял|заняла)/.test(s)){
    var pay=/\b(верни|вернуть|погаси|погасить|платеж|платежа|оплати долг)/.test(s),dn=note.replace(/\b(долг|должен|должна|верни|вернуть|погаси|погасить|платеж|оплати)\b/g,'').trim()||'Долг';
    confirmBox((pay?'Платёж по долгу ':'Новый долг ')+amount.toLocaleString('ru-RU')+' ₽','Имя: <b>'+esc(dn)+'</b>',function(){return payDebt(amount,dn);});return;
  }
  if(/\b(обязательн|алименты|аренд|ежемесячн)/.test(s)){
    var on=note.replace(/\b(обязательн|платеж|платежа|алименты|аренд|ежемесячн)\b/g,'').trim()||'Платёж';
    confirmBox('Обязательный платёж '+amount.toLocaleString('ru-RU')+' ₽','Название: <b>'+esc(on)+'</b>',function(){addObligation(amount,on,25);});return;
  }
  if(type==='income'){confirmBox('Доход +'+amount.toLocaleString('ru-RU')+' ₽','Комментарий: '+esc(note||'Доход'),function(){addIncome(amount,note||'Доход');});return;}
  if(type==='expense'||cat){if(!cat)categoryPicker(s,amount,note);else confirmBox('Расход −'+amount.toLocaleString('ru-RU')+' ₽','Категория: <b>'+esc(cat)+'</b><br>Описание: '+esc(note||'Расход'),function(){addExpense(amount,cat,note);});return;}
  setUI('Не поняла команду','Скажи: «расход 500 рублей майонез» или «доход 5000 рублей зарплата»');
}
function injectCSS(){if(document.getElementById('voiceCSS'))return;var st=document.createElement('style');st.id='voiceCSS';st.textContent='.voice-bg{position:fixed;inset:0;background:rgba(0,0,0,.64);z-index:140;display:flex;align-items:flex-end;justify-content:center;padding:10px}.voice-card{width:100%;max-width:520px;background:#16181F;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:18px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 36px rgba(0,0,0,.45);animation:slideUp .2s ease}.voice-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.voice-kicker{font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em;font-weight:600}.voice-title{font-size:19px;font-weight:700;margin-top:3px}.voice-close{width:36px;height:36px;border-radius:10px;background:#1C1F28;border:1px solid var(--line);font-size:24px;color:#9AA0B0}.voice-orb{width:82px;height:82px;border-radius:50%;margin:20px auto 12px;display:flex;align-items:center;justify-content:center;font-size:34px;background:rgba(229,167,94,.12);border:1px solid rgba(229,167,94,.3);transition:.2s}.voice-orb.listening{box-shadow:0 0 0 9px rgba(229,167,94,.08),0 0 35px rgba(229,167,94,.25);transform:scale(1.04)}.voice-status{text-align:center;font-weight:600;min-height:22px}.voice-text{text-align:center;margin:10px 0;color:#F2F3F7;font-size:16px;min-height:24px}.voice-hint{text-align:center;color:#9AA0B0;font-size:12px;line-height:1.4;margin:10px auto 16px;max-width:420px}.voice-actions{display:flex;gap:8px}.voice-btn{flex:1;padding:13px;border-radius:12px;background:#1C1F28;border:1px solid var(--line);font-weight:700}.voice-btn.primary{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}.voice-confirm{text-align:center;padding:20px 10px;font-size:16px;line-height:1.7}.voice-cats{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:8px 0 4px}.voice-cats button{padding:11px 9px;border-radius:11px;background:#1C1F28;border:1px solid var(--line);text-align:left;font-weight:600;font-size:13px}.voice-cats button:active{transform:scale(.98)}';document.head.appendChild(st);}
function installButton(){if(document.getElementById('voiceOpen'))return;var top=document.querySelector('.top-actions');if(!top)return;var b=document.createElement('button');b.type='button';b.className='icon-btn';b.id='voiceOpen';b.title='Голосовой ввод';b.textContent='🎙️';b.onclick=openUI;top.insertBefore(b,top.firstChild);}
function boot(){injectCSS();installButton();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
