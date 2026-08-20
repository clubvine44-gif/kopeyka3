(function(){
'use strict';

var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
var CATS=['Продукты','Связь','Проезд','Жильё','Здоровье','Развлечения','Одежда','Кафе','Подписки','Обязательные','Долг','Прочее'];
var recognition=null,listening=false;

function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9.,-]+/gi,' ').replace(/\s+/g,' ').trim();}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cloneState(){return JSON.parse(JSON.stringify(window.STATE));}
function applyState(s){if(typeof window.setAppState!=='function')throw new Error('Приложение ещё не готово');window.setAppState(s);}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

var ONES={ноль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19};
var TENS={двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90};
var HUND={сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
function wordsNumber(s){
  var a=norm(s).replace(/руб(лей|ля)?/g,'').split(' ').filter(Boolean),total=0,cur=0,seen=false;
  a.forEach(function(w){
    if(ONES[w]!==undefined){cur+=ONES[w];seen=true;return;}
    if(TENS[w]!==undefined){cur+=TENS[w];seen=true;return;}
    if(HUND[w]!==undefined){cur+=HUND[w];seen=true;return;}
    if(w==='тысяча'||w==='тысячи'||w==='тысяч'){total+=(cur||1)*1000;cur=0;seen=true;return;}
    if(w==='миллион'||w==='миллиона'||w==='миллионов'){total+=(cur||1)*1000000;cur=0;seen=true;}
  });
  return seen?total+cur:0;
}
function extractAmount(text){
  var s=norm(text),m=s.match(/(?:^|\s)(\d{1,3}(?:[\s]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?:руб(?:лей|ля)?|р|₽))?(?=\s|$)/i);
  if(m){var n=Number(String(m[1]).replace(/\s/g,'').replace(',','.'));if(isFinite(n)&&n>0)return Math.round(n);}
  return wordsNumber(s);
}

var CATEGORY_RULES=[
 ['Продукты',['майонез','хлеб','булк','батон','молок','кефир','йогурт','сыр','колбас','мяс','куриц','сосиск','рыб','яйц','масл','макарон','лапш','круп','рис','греч','картош','овощ','фрукт','яблок','банан','сахар','соль','мук','продукт','еда','магазин','продовольств','супермаркет','соус','кетчуп','консер','чай','кофе']],
 ['Связь',['телефон','мобильн','связь','интернет','сим карт','симкарт','тариф','пополн телефон']],
 ['Проезд',['проезд','автобус','маршрут','метро','троллейбус','такси','билет','бензин','топливо','заправк','парковк','машин','авто']],
 ['Жильё',['аренд','квартир','жиль','коммунал','квартплат','свет','газ','вода','отоплен','электрич']],
 ['Здоровье',['аптек','лекарств','таблет','витамин','врач','стоматолог','анализ','клиник','здоров','лечен']],
 ['Развлечения',['кино','игр','развлечен','концерт','театр','бар','клуб','боулинг','бильярд']],
 ['Одежда',['одежд','обув','куртк','футболк','штаны','джинс','рубашк','носк','белье','кроссовк','ботинк']],
 ['Кафе',['кафе','ресторан','пицц','бургер','шаверм','шаурм','кофейн','столов','доставка еды','ролл','суши']],
 ['Подписки',['подписк','spotify','ютуб','youtube','netflix','vpn','сервис']],
 ['Обязательные',['алименты','обязательн','ежемесячн']],
 ['Долг',['долг','должен','долгов','вернул долг','вернуть долг']],
 ['Прочее',['сигарет','табак','вейп','электронн сигарет','прочее','другое']]
];
function categoryFromText(text){
  var s=norm(text),best='',score=0;
  CATEGORY_RULES.forEach(function(rule){var local=0;rule[1].forEach(function(k){if(s.indexOf(k)!==-1)local+=k.length;});if(local>score){score=local;best=rule[0];}});
  return best;
}
function typeFromText(text){
  var s=norm(text);
  if(/\b(доход|получил|получила|получить|получено|зарплат|заработал|заработала|начисл|пришли деньги|пришел доход|выдали|аванс|преми|получка)\b/.test(s))return 'income';
  if(/\b(расход|потрат|купил|купила|купить|покупал|покупала|оплатил|оплатила|заплатил|заплатила|потрач|ушло|покупк|взял|взяла|приобрел|приобрела|приобрести)\b/.test(s))return 'expense';
  return '';
}
function stripAmountAndCommands(text){
  var s=norm(text);
  s=s.replace(/\b\d+(?:[.,]\d+)?\b/g,' ');
  s=s.replace(/\b(ноль|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|тысяча|тысячи|тысяч|миллион|миллиона|миллионов)\b/g,' ');
  s=s.replace(/\b(руб(?:лей|ля)?|р|рубл|руб)\b/g,' ');
  s=s.replace(/\b(добавь|добавить|запиши|записать|внеси|внести|создай|сделай|учти|покажи|мне|пожалуйста|расход|доход|потратил|потратила|потратить|купил|купила|купить|покупал|покупала|оплатил|оплатила|оплатить|заплатил|заплатила|заплатить|получил|получила|получить|заработал|заработала|заработать|зарплата|зарплатой|приобрел|приобрела|приобрести|взял|взяла)\b/g,' ');
  s=s.replace(/\b(на|за|в|во|из|от|с|со|мне|это|стоил|стоит|рублей|рубля)\b/g,' ');
  s=s.replace(/\s+/g,' ').trim();
  return s;
}
function itemFromText(text){
  var item=stripAmountAndCommands(text);
  var cat=categoryFromText(text);
  if(cat==='Продукты'&&/^(продукт|продукты|еда|покупки|магазин|продовольствие|продовольств)$/i.test(item))return 'Продукты';
  return item||'';
}
function addExpense(amount,category,note){var s=cloneState();s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:id(),amount:amount,category:category||'Прочее',note:note||'',date:new Date().toISOString().slice(0,10)});applyState(s);}
function addIncome(amount,note){var s=cloneState();s.income=Array.isArray(s.income)?s.income:[];s.income.push({id:id(),amount:amount,note:note||'Доход',date:new Date().toISOString().slice(0,10)});applyState(s);}
function findReserve(s,name){var q=norm(name);return (s.reserves||[]).find(function(r){return norm(r.name)===q||norm(r.category)===q||q.indexOf(norm(r.name))!==-1||norm(r.name).indexOf(q)!==-1;});}
function addReserve(amount,name,withdraw){var s=cloneState();s.reserves=Array.isArray(s.reserves)?s.reserves:[];s.reserveOps=Array.isArray(s.reserveOps)?s.reserveOps:[];var r=findReserve(s,name||'');if(!r){r={id:id(),name:name||'Свой вариант',category:name||'Свой вариант',target:0,saved:0};s.reserves.push(r);}if(withdraw){if(amount>Number(r.saved||0))throw new Error('В резерве только '+Number(r.saved||0).toLocaleString('ru-RU')+' ₽');r.saved=Number(r.saved||0)-amount;}else r.saved=Number(r.saved||0)+amount;s.reserveOps.push({id:id(),reserveId:r.id,type:withdraw?'withdraw':'deposit',amount:amount,date:new Date().toISOString().slice(0,10)});applyState(s);return r.name;}
function addDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];s.debts.push({id:id(),name:name||'Долг',total:amount,paid:0});applyState(s);}
function payDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];var q=norm(name||''),d=s.debts.find(function(x){return q&&norm(x.name).indexOf(q)!==-1;})||s.debts.find(function(x){return Number(x.total||0)>Number(x.paid||0);});if(!d)throw new Error('Подходящий долг не найден');d.paid=Number(d.paid||0)+amount;s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:id(),amount:amount,category:'Долг',note:d.name,date:new Date().toISOString().slice(0,10)});applyState(s);return d.name;}
function addObligation(amount,name,day){var s=cloneState();s.obligations=Array.isArray(s.obligations)?s.obligations:[];s.obligations.push({id:id(),name:name||'Платёж',amount:amount,day:day||25,active:true});applyState(s);}

function setUI(status,text){var a=document.getElementById('voiceStatus'),b=document.getElementById('voiceText'),o=document.getElementById('voiceOrb');if(a)a.textContent=status;if(b)b.textContent=text||'';if(o)o.classList.toggle('listening',listening);}
function closeUI(){if(recognition){try{recognition.onresult=null;recognition.stop();}catch(e){}recognition=null;}listening=false;var m=document.getElementById('voiceModal');if(m)m.remove();}
function startListening(){
  if(!SR){setUI('Голосовой ввод недоступен','Открой Копейку в Chrome на Android и разреши доступ к микрофону.');return;}
  if(recognition){try{recognition.stop();}catch(e){}}
  recognition=new SR();recognition.lang='ru-RU';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=5;listening=true;setUI('Слушаю…','');
  recognition.onresult=function(e){var text='';for(var i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';text=text.trim();setUI('Слышу',text);if(e.results[e.results.length-1].isFinal)processCommand(text);};
  recognition.onerror=function(e){listening=false;setUI(e.error==='not-allowed'?'Нет доступа к микрофону':'Не удалось распознать речь','Нажми микрофон ещё раз и повтори.');};
  recognition.onend=function(){listening=false;var o=document.getElementById('voiceOrb');if(o)o.classList.remove('listening');};
  try{recognition.start();}catch(e){}
}
function confirmBox(title,details,onYes){var card=document.querySelector('#voiceModal .voice-card');if(!card)return;card.innerHTML='<div class="voice-head"><div><div class="voice-kicker">Проверь операцию</div><div class="voice-title">'+esc(title)+'</div></div><button class="voice-close" id="voiceClose">×</button></div><div class="voice-confirm">'+details+'</div><div class="voice-actions"><button class="voice-btn primary" id="voiceYes">Добавить</button><button class="voice-btn" id="voiceNo">Изменить</button></div>';document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceNo').onclick=function(){renderVoice();startListening();};document.getElementById('voiceYes').onclick=function(){try{onYes();setUI('Готово','Операция добавлена.');setTimeout(closeUI,700);}catch(e){setUI('Не добавлено',e.message||'Ошибка');}};}
function categoryPicker(amount,note,text){var card=document.querySelector('#voiceModal .voice-card');card.innerHTML='<div class="voice-head"><div><div class="voice-kicker">Расход распознан</div><div class="voice-title">Выбери категорию</div></div><button class="voice-close" id="voiceClose">×</button></div><div class="voice-confirm"><b>−'+amount.toLocaleString('ru-RU')+' ₽</b><br>'+esc(note||'Без названия')+'</div><div class="voice-cats">'+CATS.map(function(c){return '<button data-cat="'+esc(c)+'">'+esc(c)+'</button>';}).join('')+'</div>';document.getElementById('voiceClose').onclick=closeUI;card.querySelectorAll('.voice-cats button').forEach(function(b){b.onclick=function(){var cat=b.getAttribute('data-cat');confirmBox('Расход −'+amount.toLocaleString('ru-RU')+' ₽','Название: <b>'+esc(note||'Расход')+'</b><br>Категория: <b>'+esc(cat)+'</b>',function(){addExpense(amount,cat,note);});};});}
function processCommand(text){
  var s=norm(text),amount=extractAmount(s);if(!amount){setUI('Не нашла сумму','Скажи, например: «купил майонез за 120 рублей»');return;}
  var type=typeFromText(s),cat=categoryFromText(s),item=itemFromText(s);
  if(/\b(резерв|отлож|подушк|копить|накоплен)\b/.test(s)){var wd=/\b(сними|снять|вытащи|взял из|из резерва)\b/.test(s),name=stripAmountAndCommands(s).replace(/\b(резерв|отложить|отложи|сними|снять|пополни|пополнить|накопить|накопления|подушку)\b/g,'').trim()||'Свой вариант';confirmBox((wd?'Снять из резерва ':'Пополнить резерв ')+amount.toLocaleString('ru-RU')+' ₽','Резерв: <b>'+esc(name)+'</b>',function(){addReserve(amount,name,wd);});return;}
  if(/\b(долг|должен|должна|занял|заняла)\b/.test(s)){var pay=/\b(верни|вернуть|погаси|погасить|платеж|платежа|оплати долг)\b/.test(s),dn=stripAmountAndCommands(s).replace(/\b(долг|должен|должна|верни|вернуть|погаси|погасить|платеж|платежа|оплати)\b/g,'').trim()||'Долг';confirmBox((pay?'Платёж по долгу ':'Новый долг ')+amount.toLocaleString('ru-RU')+' ₽','Имя: <b>'+esc(dn)+'</b>',function(){return pay?payDebt(amount,dn):addDebt(amount,dn);});return;}
  if(/\b(обязательн|алименты|ежемесячн)\b/.test(s)){var on=stripAmountAndCommands(s).replace(/\b(обязательн|платеж|платежа|алименты|ежемесячн)\b/g,'').trim()||'Платёж';confirmBox('Обязательный платёж '+amount.toLocaleString('ru-RU')+' ₽','Название: <b>'+esc(on)+'</b>',function(){addObligation(amount,on,25);});return;}
  if(type==='income'){confirmBox('Доход +'+amount.toLocaleString('ru-RU')+' ₽','Название: <b>'+esc(item||'Доход')+'</b>',function(){addIncome(amount,item||'Доход');});return;}
  if(type==='expense'||cat){if(!item)item='Расход';if(!cat){categoryPicker(amount,item,s);return;}confirmBox('Расход −'+amount.toLocaleString('ru-RU')+' ₽','Название: <b>'+esc(item)+'</b><br>Категория: <b>'+esc(cat)+'</b>',function(){addExpense(amount,cat,item);});return;}
  setUI('Не поняла команду','Попробуй: «купил сигареты 500», «расход майонез 120», «получил зарплату 4800».');
}
function renderVoice(){var old=document.getElementById('voiceModal');if(old)old.remove();var bg=document.createElement('div');bg.id='voiceModal';bg.className='voice-bg';bg.innerHTML='<div class="voice-card"><div class="voice-head"><div><div class="voice-kicker">Копейка · голос</div><div class="voice-title">Говори как удобно</div></div><button class="voice-close" id="voiceClose">×</button></div><button class="voice-orb" id="voiceOrb" aria-label="Начать голосовой ввод">🎙️</button><div class="voice-status" id="voiceStatus">Слушаю…</div><div class="voice-text" id="voiceText"></div><div class="voice-hint">«Купил сигареты 500» · «расход майонез 120» · «получил зарплату 4800»</div><div class="voice-actions"><button class="voice-btn primary" id="voiceAgain">Говорить ещё</button><button class="voice-btn" id="voiceCancel">Отмена</button></div></div>';document.body.appendChild(bg);document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceAgain').onclick=startListening;document.getElementById('voiceOrb').onclick=startListening;bg.addEventListener('click',function(e){if(e.target===bg)closeUI();});}
function openUI(){renderVoice();startListening();}
function injectCSS(){if(document.getElementById('voiceCSS2'))return;var st=document.createElement('style');st.id='voiceCSS2';st.textContent='.voice-open-fab{position:fixed;right:20px;bottom:calc(82px + var(--safe-b));z-index:61;width:48px;height:48px;border-radius:50%;background:var(--card);border:1px solid rgba(229,167,94,.45);box-shadow:0 5px 18px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:22px}.voice-open-fab:active{transform:scale(.94)}.voice-bg{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center}.voice-card{width:100%;max-width:520px;background:#16181F;border:1px solid var(--line);border-bottom:none;border-radius:22px 22px 0 0;padding:20px 16px calc(20px + var(--safe-b));box-shadow:0 -8px 30px rgba(0,0,0,.45);text-align:center}.voice-head{display:flex;justify-content:space-between;align-items:flex-start;text-align:left}.voice-kicker{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.voice-title{font-size:19px;font-weight:700;margin-top:3px}.voice-close{width:34px;height:34px;border-radius:10px;background:var(--card2);font-size:24px}.voice-orb{width:82px;height:82px;border-radius:50%;margin:18px auto 12px;background:linear-gradient(135deg,#F0C384,#E5A75E);display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 8px 28px rgba(229,167,94,.32);border:0}.voice-orb.listening{animation:voicePulse2 1.1s infinite}.voice-status{font-size:13px;color:var(--muted);min-height:20px}.voice-text{min-height:34px;margin:8px 0;font-size:16px}.voice-hint{font-size:12px;color:var(--muted);line-height:1.5;padding:8px}.voice-actions{display:flex;gap:8px;margin-top:12px}.voice-btn{flex:1;padding:12px;border-radius:12px;background:var(--card2);border:1px solid var(--line);font-weight:700}.voice-btn.primary{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}.voice-confirm{padding:18px 8px;text-align:center;font-size:16px;line-height:1.7}.voice-confirm b{font-size:26px}.voice-cats{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:8px 0}.voice-cats button{padding:11px 8px;border-radius:11px;background:var(--card2);border:1px solid var(--line);font-weight:600;font-size:13px;text-align:left}@keyframes voicePulse2{50%{transform:scale(1.06);box-shadow:0 0 0 12px rgba(229,167,94,.12)}}';document.head.appendChild(st);}
function installButton(){if(document.getElementById('voiceOpenFab'))return;var b=document.createElement('button');b.id='voiceOpenFab';b.type='button';b.className='voice-open-fab';b.title='Голосовой ввод';b.setAttribute('aria-label','Голосовой ввод');b.textContent='🎙️';b.onclick=openUI;document.body.appendChild(b);}
function boot(){injectCSS();installButton();window.kopeykaVoice={open:openUI};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
