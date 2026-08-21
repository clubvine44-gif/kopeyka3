(function(){
'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
var CATS=['Продукты','Связь','Проезд','Жильё','Здоровье','Развлечения','Одежда','Кафе','Подписки','Обязательные','Долг','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Больница'];
var recognition=null,listening=false,pendingStep=null;

function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9.,-]+/gi,' ').replace(/\s+/g,' ').trim();}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cloneState(){return JSON.parse(JSON.stringify(window.STATE));}
function applyState(s){if(typeof window.setAppState!=='function')throw new Error('Приложение ещё не готово');window.setAppState(s);}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function capitalize(s){s=String(s||'').trim();if(!s)return'';return s.charAt(0).toUpperCase()+s.slice(1);}
function fmt(n){return Math.round(+n||0).toLocaleString('ru-RU');}
function hasAny(s,words){for(var i=0;i<words.length;i++){if(s.indexOf(words[i])!==-1)return true;}return false;}

var ONES={ноль:0,один:1,одна:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19};
var TENS={двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90};
var HUND={сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
function wordsNumber(s){var a=norm(s).replace(/руб(лей|ля)?/g,'').split(' ').filter(Boolean),total=0,cur=0,seen=false;a.forEach(function(w){if(ONES[w]!==undefined){cur+=ONES[w];seen=true;return;}if(TENS[w]!==undefined){cur+=TENS[w];seen=true;return;}if(HUND[w]!==undefined){cur+=HUND[w];seen=true;return;}if(w==='тысяча'||w==='тысячи'||w==='тысяч'){total+=(cur||1)*1000;cur=0;seen=true;return;}if(w==='миллион'||w==='миллиона'||w==='миллионов'){total+=(cur||1)*1000000;cur=0;seen=true;}});return seen?total+cur:0;}
function extractAmount(text){var s=norm(text);var m=s.match(/(?:^|\s)(\d{1,3}(?:[\s]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?:руб(?:лей|ля)?|р|₽))?(?=\s|$)/i);if(m){var n=Number(String(m[1]).replace(/\s/g,'').replace(',','.'));if(isFinite(n)&&n>0)return Math.round(n);}m=s.match(/(?:^|\s)(\d{1,7})(?:\s|$)/);if(m){var n2=Number(m[1]);if(isFinite(n2)&&n2>0&&n2<10000000)return Math.round(n2);}return wordsNumber(s);}

var CATEGORY_RULES=[['Продукты',['майонез','хлеб','булк','батон','молок','кефир','йогурт','сыр','колбас','мяс','куриц','сосиск','рыб','яйц','масл','макарон','лапш','круп','рис','греч','картош','овощ','фрукт','яблок','банан','сахар','соль','мук','продукт','еда','магазин','продовольств','супермаркет','соус','кетчуп','консер','чай','кофе','пакет','салфетк']],['Связь',['телефон','мобильн','связь','интернет','сим карт','симкарт','тариф','пополн телефон','мегафон','мтс','билайн','теле2']],['Проезд',['проезд','автобус','маршрут','метро','троллейбус','такси','билет','бензин','топливо','заправк','парковк','машин','авто']],['Жильё',['аренд','квартир','жиль','коммунал','квартплат','свет','газ','вода','отоплен','электрич']],['Здоровье',['аптек','лекарств','таблет','витамин','врач','стоматолог','анализ','клиник','здоров','лечен']],['Развлечения',['кино','игр','развлечен','концерт','театр','бар','клуб','боулинг','бильярд']],['Одежда',['одежд','обув','куртк','футболк','штаны','джинс','рубашк','носк','белье','кроссовк','ботинк']],['Кафе',['кафе','ресторан','пицц','бургер','шаверм','шаурм','кофейн','столов','доставка еды','ролл','суши']],['Подписки',['подписк','spotify','ютуб','youtube','netflix','vpn','сервис']],['Обязательные',['алименты','обязательн','ежемесячн']],['Долг',['долг','должен','долгов']],['Прочее',['сигарет','табак','вейп','электронн сигарет','зажигалк','ручка','прочее','другое']]];
function categoryFromText(text){var s=norm(text),best='',score=0;CATEGORY_RULES.forEach(function(rule){var local=0;rule[1].forEach(function(k){if(s.indexOf(k)!==-1)local+=k.length;});if(local>score){score=local;best=rule[0];}});return best;}

function typeFromText(text){
  var s=norm(text);
  if(hasAny(s,['доход','получил','получила','получить','получено','зарплат','заработал','заработала','начисл','пришли деньги','пришел доход','выдали','аванс','преми','получка','подработк','фриланс','гонорар']))return 'income';
  if(hasAny(s,['расход','потрат','купил','купила','купить','покупал','покупала','оплатил','оплатила','заплатил','заплатила','потрач','ушло','покупк','приобрел','приобрела','приобрести']))return 'expense';
  if(categoryFromText(s))return 'expense';
  return '';
}
function isReserveCmd(s){return hasAny(s,['резерв','отлож','подушк','копить','накоплен','цель накоп']);}
function isDebtCmd(s){return hasAny(s,['долг','должен','должна','занял','заняла']);}
function isObligCmd(s){return hasAny(s,['обязательн','алименты','ежемесячн']);}
function isWithdraw(s){return hasAny(s,['сними','снять','вытащи','взял из','из резерва']);}
function isPayDebt(s){return hasAny(s,['верни','вернуть','погаси','погасить','платеж','платежа','оплати долг']);}

function stripNoise(text){
  var s=norm(text);
  s=s.replace(/\b\d+(?:[.,]\d+)?\b/g,' ');
  s=s.replace(/\b(ноль|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|одиннадцать|двенадцать|тринадцать|четырнадцать|пятнадцать|шестнадцать|семнадцать|восемнадцать|девятнадцать|двадцать|тридцать|сорок|пятьдесят|шестьдесят|семьдесят|восемьдесят|девяносто|сто|двести|триста|четыреста|пятьсот|шестьсот|семьсот|восемьсот|девятьсот|тысяча|тысячи|тысяч|миллион|миллиона|миллионов)\b/g,' ');
  s=s.replace(/\b(руб(?:лей|ля)?|р|рубл|руб|₽)\b/g,' ');
  var noise=['добавь','добавить','запиши','записать','внеси','внести','создай','сделай','учти','покажи','мне','пожалуйста','расход','доход','потратил','потратила','потратить','купил','купила','купить','покупал','покупала','оплатил','оплатила','оплатить','заплатил','заплатила','заплатить','получил','получила','получить','заработал','заработала','заработать','зарплата','зарплатой','приобрел','приобрела','приобрести','взял','взяла','подработка','подработкой','аванс','премия','резерв','резерва','отложить','отложи','пополнить','пополни','накопить','цель','сумма','сумму','долг','должен','должна','обязательный','обязательные','алименты'];
  noise.forEach(function(w){s=s.split(w).join(' ');});
  s=s.replace(/\b(на|за|в|во|из|от|с|со|мне|это|стоил|стоит|рублей|рубля|сегодня|вчера)\b/g,' ');
  s=s.replace(/\s+/g,' ').trim();
  return s;
}
function itemFromText(text){var item=stripNoise(text);var cat=categoryFromText(text);if(cat==='Продукты'&&/^(продукт|продукты|еда|покупки|магазин|продовольствие)$/i.test(item))return 'Продукты';return capitalize(item)||'';}
function matchReserveName(text){var s=norm(text);for(var i=0;i<RES_PRESETS.length;i++){var p=norm(RES_PRESETS[i]);if(s.indexOf(p)!==-1)return RES_PRESETS[i];var short=p.split(' ')[0];if(short.length>3&&s.indexOf(short)!==-1)return RES_PRESETS[i];}var cleaned=stripNoise(text).trim();if(cleaned)return capitalize(cleaned);return '';}

function addExpense(amount,category,note){var s=cloneState();s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:id(),amount:amount,category:category||'Прочее',note:note||'',date:new Date().toISOString().slice(0,10)});applyState(s);}
function addIncome(amount,note){var s=cloneState();s.income=Array.isArray(s.income)?s.income:[];s.income.push({id:id(),amount:amount,note:note||'Доход',date:new Date().toISOString().slice(0,10)});applyState(s);}
function findReserve(s,name){var q=norm(name);return (s.reserves||[]).find(function(r){return norm(r.name)===q||norm(r.category)===q||q.indexOf(norm(r.name))!==-1||norm(r.name).indexOf(q)!==-1;});}
function createOrTopupReserve(name,target,deposit,withdraw){var s=cloneState();s.reserves=Array.isArray(s.reserves)?s.reserves:[];s.reserveOps=Array.isArray(s.reserveOps)?s.reserveOps:[];var r=findReserve(s,name||'');if(!r){r={id:id(),name:name||'Свой вариант',category:name||'Свой вариант',target:Number(target)||0,saved:0};s.reserves.push(r);}else if(target>0){r.target=Number(target);}var amount=Number(deposit||0);if(withdraw){if(amount>Number(r.saved||0))throw new Error('В резерве только '+fmt(r.saved)+' ₽');r.saved=Number(r.saved||0)-amount;if(amount>0)s.reserveOps.push({id:id(),reserveId:r.id,type:'withdraw',amount:amount,date:new Date().toISOString().slice(0,10)});}else if(amount>0){r.saved=Number(r.saved||0)+amount;s.reserveOps.push({id:id(),reserveId:r.id,type:'deposit',amount:amount,date:new Date().toISOString().slice(0,10)});}applyState(s);return r.name;}
function addDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];s.debts.push({id:id(),name:name||'Долг',total:amount,paid:0});applyState(s);}
function payDebt(amount,name){var s=cloneState();s.debts=Array.isArray(s.debts)?s.debts:[];var q=norm(name||''),d=s.debts.find(function(x){return q&&norm(x.name).indexOf(q)!==-1;})||s.debts.find(function(x){return Number(x.total||0)>Number(x.paid||0);});if(!d)throw new Error('Подходящий долг не найден');d.paid=Number(d.paid||0)+amount;s.expenses=Array.isArray(s.expenses)?s.expenses:[];s.expenses.push({id:id(),amount:amount,category:'Долг',note:d.name,date:new Date().toISOString().slice(0,10)});applyState(s);return d.name;}
function addObligation(amount,name,day){var s=cloneState();s.obligations=Array.isArray(s.obligations)?s.obligations:[];s.obligations.push({id:id(),name:name||'Платёж',amount:amount,day:day||25,active:true});applyState(s);}

function setUI(status,text){var a=document.getElementById('voiceStatus'),b=document.getElementById('voiceText'),o=document.getElementById('voiceOrb');if(a)a.textContent=status;if(b)b.textContent=text||'';if(o)o.classList.toggle('listening',listening);}
function closeUI(){pendingStep=null;if(recognition){try{recognition.onresult=null;recognition.stop();}catch(e){}recognition=null;}listening=false;var m=document.getElementById('voiceModal');if(m)m.remove();}
function startListening(){if(!SR){setUI('Голосовой ввод недоступен','Открой Копейку в Chrome на Android и разреши доступ к микрофону.');return;}if(recognition){try{recognition.stop();}catch(e){}}recognition=new SR();recognition.lang='ru-RU';recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=5;listening=true;setUI('Слушаю…','');recognition.onresult=function(e){var text='';for(var i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';text=text.trim();setUI('Слышу',text);if(e.results[e.results.length-1].isFinal){if(pendingStep&&typeof pendingStep.onSpeech==='function')pendingStep.onSpeech(text);else processCommand(text);}};recognition.onerror=function(e){listening=false;setUI(e.error==='not-allowed'?'Нет доступа к микрофону':'Не удалось распознать речь','Нажми микрофон ещё раз и повтори.');};recognition.onend=function(){listening=false;var o=document.getElementById('voiceOrb');if(o)o.classList.remove('listening');};try{recognition.start();}catch(e){}}

function btnStyle(primary,danger){var base='flex:1;min-width:100px;min-height:52px;padding:14px 12px;border-radius:14px;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;';if(primary)return base+'background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none;';if(danger)return base+'background:rgba(248,113,113,.18);color:#F87171;border:1px solid rgba(248,113,113,.4);';return base+'background:#1C1F28;color:#F2F3F7;border:1px solid rgba(255,255,255,.14);'}
function actionsBar(html){return '<div id="voiceActions" style="display:flex!important;visibility:visible!important;opacity:1!important;gap:8px;margin-top:16px;width:100%;flex-wrap:wrap;position:relative;z-index:10">'+html+'</div>';}

function confirmBox(title,details,onYes){var card=document.querySelector('#voiceModal .voice-card');if(!card)return;pendingStep=null;card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;text-align:left"><div><div style="font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em">Проверь операцию</div><div style="font-size:19px;font-weight:700;margin-top:3px">'+esc(title)+'</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;font-size:24px;border:none;color:#F2F3F7">×</button></div><div style="padding:18px 8px;font-size:16px;line-height:1.7">'+details+'</div>'+actionsBar('<button type="button" id="voiceYes" style="'+btnStyle(true)+'">Подтвердить</button><button type="button" id="voiceNo" style="'+btnStyle()+'">Ещё раз</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Отменить</button>');document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceNo').onclick=function(){pendingStep=null;renderVoice();startListening();};document.getElementById('voiceYes').onclick=function(){try{onYes();setUI('Готово','Операция добавлена.');setTimeout(closeUI,800);}catch(e){setUI('Не добавлено',e.message||'Ошибка');}};}

function askStep(title,hint,onSpeech){var card=document.querySelector('#voiceModal .voice-card');if(!card)return;pendingStep={onSpeech:onSpeech};card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;text-align:left"><div><div style="font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em">Голосовой ввод</div><div style="font-size:19px;font-weight:700;margin-top:3px">'+esc(title)+'</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;font-size:24px;border:none;color:#F2F3F7">×</button></div><button type="button" id="voiceOrb" style="width:82px;height:82px;border-radius:50%;margin:18px auto 12px;background:linear-gradient(135deg,#F0C384,#E5A75E);display:flex;align-items:center;justify-content:center;font-size:36px;border:0">🎙️</button><div id="voiceStatus" style="font-size:13px;color:#9AA0B0;min-height:20px">Слушаю…</div><div id="voiceText" style="min-height:34px;margin:8px 0;font-size:16px"></div><div style="font-size:12px;color:#9AA0B0;line-height:1.5;padding:8px">'+esc(hint)+'</div>'+actionsBar('<button type="button" id="voiceAgain" style="'+btnStyle(true)+'">Говорить</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Отменить</button>');document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceAgain').onclick=startListening;document.getElementById('voiceOrb').onclick=startListening;startListening();}

function categoryPicker(amount,note){var card=document.querySelector('#voiceModal .voice-card');if(!card)return;pendingStep=null;card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;text-align:left"><div><div style="font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em">Расход</div><div style="font-size:19px;font-weight:700;margin-top:3px">Выбери категорию</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;font-size:24px;border:none;color:#F2F3F7">×</button></div><div style="padding:14px 8px"><b style="font-size:26px">−'+fmt(amount)+' ₽</b><br>'+esc(note||'Без названия')+'</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:8px 0">'+CATS.map(function(c){return '<button type="button" data-cat="'+esc(c)+'" style="padding:12px 8px;border-radius:11px;background:#1C1F28;border:1px solid rgba(255,255,255,.12);font-weight:600;font-size:13px;color:#F2F3F7">'+esc(c)+'</button>';}).join('')+'</div>'+actionsBar('<button type="button" id="voiceCancelCat" style="'+btnStyle(false,true)+'">Отменить</button>');document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancelCat').onclick=closeUI;card.querySelectorAll('[data-cat]').forEach(function(b){b.onclick=function(){var cat=b.getAttribute('data-cat');confirmBox('Расход −'+fmt(amount)+' ₽','Название: <b>'+esc(note||'Расход')+'</b><br>Категория: <b>'+esc(cat)+'</b>',function(){addExpense(amount,cat,note);});};});}

function startReserveFlow(nameHint,amountHint,isWd){var name=nameHint||'';function afterName(nm){name=nm;if(amountHint>0){confirmBox((isWd?'Снять из резерва ':'Пополнить резерв ')+fmt(amountHint)+' ₽','Резерв: <b>'+esc(name)+'</b>',function(){createOrTopupReserve(name,0,amountHint,isWd);});return;}askStep('Сколько накопить?','Скажи цель, например: «пятьдесят тысяч» или «ноль» если без цели',function(speech){var target=extractAmount(speech)||0;askStep('Сколько положить сейчас?','Скажи сумму пополнения или «ноль»',function(speech2){var dep=extractAmount(speech2)||0;confirmBox('Резерв «'+name+'»','Цель: <b>'+(target?fmt(target)+' ₽':'без цели')+'</b><br>Сейчас: <b>'+fmt(dep)+' ₽</b>',function(){createOrTopupReserve(name,target,dep,false);});});});}if(name){afterName(name);}else{askStep('Какой резерв?','Скажи: «подушка безопасности», «отпуск», «на больницу»…',function(speech){var nm=matchReserveName(speech)||capitalize(stripNoise(speech))||'Свой вариант';afterName(nm);});}}

function processCommand(text){
  var s=norm(text);
  var amount=extractAmount(s);
  var type=typeFromText(s);
  var cat=categoryFromText(s);
  var item=itemFromText(s);

  if(isReserveCmd(s)){
    var name=matchReserveName(s);
    if(!name){var raw=stripNoise(s).trim();name=raw?capitalize(raw):'';}
    startReserveFlow(name,amount,isWithdraw(s));
    return;
  }
  if(type==='income'){
    if(!amount){setUI('Не нашла сумму','Скажи, например: «зарплата 4800» или «подработка две тысячи»');return;}
    if(!item||item==='Расход')item='Доход';
    if(/^доход$/i.test(item))item='Доход';
    confirmBox('Доход +'+fmt(amount)+' ₽','Название: <b>'+esc(item)+'</b>',function(){addIncome(amount,item);});
    return;
  }
  if(isDebtCmd(s)){
    if(!amount){setUI('Не нашла сумму','Скажи сумму долга, например: «долг Вася 5000»');return;}
    var dn=stripNoise(s).trim()||'Долг';
    dn=capitalize(dn);
    confirmBox((isPayDebt(s)?'Платёж по долгу ':'Новый долг ')+fmt(amount)+' ₽','Имя: <b>'+esc(dn)+'</b>',function(){return isPayDebt(s)?payDebt(amount,dn):addDebt(amount,dn);});
    return;
  }
  if(isObligCmd(s)){
    if(!amount){setUI('Не нашла сумму','Скажи сумму, например: «алименты 15000»');return;}
    var on=stripNoise(s).trim()||'Платёж';
    on=capitalize(on);
    confirmBox('Обязательный платёж '+fmt(amount)+' ₽','Название: <b>'+esc(on)+'</b>',function(){addObligation(amount,on,25);});
    return;
  }
  if(!amount){setUI('Не нашла сумму','Скажи, например: «сигареты 100», «зарплата 4800», «резерв подушка»');return;}
  if(!item)item='Расход';
  if(!cat){categoryPicker(amount,item);return;}
  confirmBox('Расход −'+fmt(amount)+' ₽','Название: <b>'+esc(item)+'</b><br>Категория: <b>'+esc(cat)+'</b>',function(){addExpense(amount,cat,item);});
}

function renderVoice(){pendingStep=null;var old=document.getElementById('voiceModal');if(old)old.remove();var bg=document.createElement('div');bg.id='voiceModal';bg.style.cssText='position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center';bg.innerHTML='<div class="voice-card" style="width:100%;max-width:520px;background:#16181F;border:1px solid rgba(255,255,255,.09);border-bottom:none;border-radius:22px 22px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.45);text-align:center"><div style="display:flex;justify-content:space-between;align-items:flex-start;text-align:left"><div><div style="font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em">Копейка · голос</div><div style="font-size:19px;font-weight:700;margin-top:3px">Говори как удобно</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;font-size:24px;border:none;color:#F2F3F7">×</button></div><button type="button" id="voiceOrb" style="width:82px;height:82px;border-radius:50%;margin:18px auto 12px;background:linear-gradient(135deg,#F0C384,#E5A75E);display:flex;align-items:center;justify-content:center;font-size:36px;border:0;box-shadow:0 8px 28px rgba(229,167,94,.32)">🎙️</button><div id="voiceStatus" style="font-size:13px;color:#9AA0B0;min-height:20px">Слушаю…</div><div id="voiceText" style="min-height:34px;margin:8px 0;font-size:16px"></div><div style="font-size:12px;color:#9AA0B0;line-height:1.5;padding:8px">«Сигареты 100» · «зарплата 4800» · «резерв подушка» · «подработка 2000»</div>'+actionsBar('<button type="button" id="voiceAgain" style="'+btnStyle(true)+'">Говорить ещё</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Отмена</button>')+'</div>';document.body.appendChild(bg);document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceAgain').onclick=startListening;document.getElementById('voiceOrb').onclick=startListening;bg.addEventListener('click',function(e){if(e.target===bg)closeUI();});}

function openUI(){renderVoice();startListening();}

function installMicFab(){
  var headerBtn=document.getElementById('btnVoice');
  if(headerBtn){headerBtn.style.display='none';}
  var old=document.getElementById('voiceMicFab');
  if(old)old.remove();
  var b=document.createElement('button');
  b.id='voiceMicFab';
  b.type='button';
  b.title='Голосовой ввод';
  b.setAttribute('aria-label','Голосовой ввод');
  b.textContent='🎙️';
  b.style.cssText='position:fixed;right:20px;bottom:calc(80px + env(safe-area-inset-bottom,0px));z-index:61;width:44px;height:44px;border-radius:50%;background:rgba(22,24,31,.35);border:1px solid rgba(229,167,94,.35);color:rgba(242,243,247,.75);font-size:20px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,.2);padding:0;cursor:pointer;';
  b.onmouseenter=function(){b.style.background='rgba(22,24,31,.55)';b.style.color='rgba(242,243,247,.95)';};
  b.onmouseleave=function(){b.style.background='rgba(22,24,31,.35)';b.style.color='rgba(242,243,247,.75)';};
  b.onclick=function(e){e.preventDefault();e.stopPropagation();openUI();};
  document.body.appendChild(b);
}

function boot(){
  if(!document.getElementById('voiceCSS2')){
    var st=document.createElement('style');st.id='voiceCSS2';
    st.textContent='#voiceOrb.listening{animation:voicePulse2 1.1s infinite}@keyframes voicePulse2{50%{transform:scale(1.06);box-shadow:0 0 0 12px rgba(229,167,94,.12)}}#btnVoice{display:none!important}';
    document.head.appendChild(st);
  }
  window.kopeykaVoice={open:openUI};
  installMicFab();
  setTimeout(installMicFab,300);
  setTimeout(installMicFab,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
