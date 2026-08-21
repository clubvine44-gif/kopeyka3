(function(){
'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
var CATS=['Продукты','Алкоголь','Сигареты','Хозтовары','Бытовая химия','Кафе','Связь','Проезд','Жильё','Здоровье','Красота','Одежда','Развлечения','Подписки','Техника','Дети','Животные','Обязательные','Долг','Прочее'];
var RES_PRESETS=['Подушка безопасности','Права','Отпуск','Ремонт','Налог','Больница'];
var recognition=null,listening=false,pendingStep=null;
var TTS_KEY='kopeyka_tts_on';
function ttsOn(){try{return localStorage.getItem(TTS_KEY)==='1';}catch(e){return false;}}
function setTtsOn(v){try{localStorage.setItem(TTS_KEY,v?'1':'0');}catch(e){}}
function speak(text){if(!ttsOn()||!window.speechSynthesis||!text)return;try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(String(text));u.lang='ru-RU';u.rate=1.05;var voices=window.speechSynthesis.getVoices()||[];var ru=voices.find(function(v){return (v.lang||'').toLowerCase().indexOf('ru')===0;});if(ru)u.voice=ru;window.speechSynthesis.speak(u);}catch(e){}}
function say(status,detail){setUI(status,detail||'');speak(((status||'')+(detail?' . '+detail:'')).replace(/\s+/g,' ').trim());}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9.,-]+/gi,' ').replace(/\s+/g,' ').trim();}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cloneState(){return JSON.parse(JSON.stringify(window.STATE));}
function applyState(s){if(typeof window.setAppState!=='function')throw new Error('Приложение ещё не готово');window.setAppState(s);}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function capitalize(s){s=String(s||'').trim();if(!s)return'';return s.charAt(0).toUpperCase()+s.slice(1);}
function fmt(n){return Math.round(+n||0).toLocaleString('ru-RU');}
function hasAny(s,words){for(var i=0;i<words.length;i++){if(s.indexOf(words[i])!==-1)return true;}return false;}
function getLearned(){var st=window.STATE||{};return (st.voiceMap&&typeof st.voiceMap==='object')?st.voiceMap:{};}
function learnCategory(item,cat){if(!item||!cat)return;var key=norm(item);if(!key||key.length<2)return;var s=cloneState();if(!s.voiceMap||typeof s.voiceMap!=='object')s.voiceMap={};s.voiceMap[key]=cat;applyState(s);}
var ONES={ноль:0,один:1,одна:1,одну:1,два:2,две:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,одиннадцать:11,двенадцать:12,тринадцать:13,четырнадцать:14,пятнадцать:15,шестнадцать:16,семнадцать:17,восемнадцать:18,девятнадцать:19};
var TENS={двадцать:20,тридцать:30,сорок:40,пятьдесят:50,шестьдесят:60,семьдесят:70,восемьдесят:80,девяносто:90};
var HUND={сто:100,двести:200,триста:300,четыреста:400,пятьсот:500,шестьсот:600,семьсот:700,восемьсот:800,девятьсот:900};
function cleanForAmount(s){s=String(s||'').toLowerCase().replace(/ё/g,'е');s=s.replace(/([а-яa-z])[.,]+([а-яa-z])/gi,'$1 $2');s=s.replace(/([а-яa-z])[.,]+/gi,'$1 ');s=s.replace(/(\d)[.,\s](\d{3})(?!\d)/g,'$1$2');s=s.replace(/[^a-zа-я0-9\s-]+/gi,' ');return s.replace(/\s+/g,' ').trim();}
function wordsNumber(s){var a=cleanForAmount(s).replace(/руб(лей|ля|ль)?/g,'').split(' ').filter(Boolean);var total=0,cur=0,seen=false;for(var i=0;i<a.length;i++){var w=a[i].replace(/^[.,]+|[.,]+$/g,'');if(!w)continue;if(/^\d+$/.test(w)){cur+=Number(w);seen=true;continue;}if(ONES[w]!==undefined){cur+=ONES[w];seen=true;continue;}if(TENS[w]!==undefined){cur+=TENS[w];seen=true;continue;}if(HUND[w]!==undefined){cur+=HUND[w];seen=true;continue;}if(w==='тысяча'||w==='тысячи'||w==='тысяч'||w==='тыс'){total+=(cur||1)*1000;cur=0;seen=true;continue;}if(w.indexOf('миллион')===0){total+=(cur||1)*1000000;cur=0;seen=true;continue;}}return seen?total+cur:0;}
function extractAmount(text){var s=cleanForAmount(text);if(/тысяч|тыс\b|миллион/.test(s)){var mix=s.match(/(\d+)\s*(тыс(?:яч(?:а|и)?)?|миллион(?:а|ов)?)/);if(mix){var base=Number(mix[1]);if(isFinite(base)&&base>0)return String(mix[2]).indexOf('миллион')===0?Math.round(base*1000000):Math.round(base*1000);}var w=wordsNumber(s);if(w>0)return w;}var onlyWords=wordsNumber(s);if(onlyWords>0&&!/\d/.test(s))return onlyWords;var m=s.match(/(?:^|\s)(\d{1,9})(?:\s*(?:руб(?:лей|ля|ль)?|р))?(?=\s|$)/);if(m){var n=Number(m[1]);if(isFinite(n)&&n>0&&n<1e9)return Math.round(n);}return onlyWords||0;}
var PRODUCT_RULES=window.KOPEYKA_PRODUCTS||[];
function categoryFromText(text){var s=norm(text),learned=getLearned(),keys=Object.keys(learned),bestL='',scoreL=0;for(var i=0;i<keys.length;i++){var k=keys[i];if(k&&s.indexOf(k)!==-1&&k.length>scoreL){scoreL=k.length;bestL=learned[k];}}if(bestL)return bestL;var best='',score=0;(PRODUCT_RULES||[]).forEach(function(rule){var local=0;(rule[1]||[]).forEach(function(k){if(s.indexOf(k)!==-1)local+=k.length;});if(local>score){score=local;best=rule[0];}});return best;}
function typeFromText(text){var s=norm(text);if(hasAny(s,['доход','получил','зарплат','заработал','аванс','преми','подработк']))return 'income';if(hasAny(s,['расход','потрат','купил','купить','оплатил','заплатил']))return 'expense';if(categoryFromText(s))return 'expense';return '';}
function isQuery(s){return hasAny(s,['сколько','какой баланс','какой остаток','что с кассой','расскажи','статус','как дела','сколько осталось','до цели']);}
function isReserveCmd(s){return hasAny(s,['резерв','отлож','подушк','копить','накоплен'])&&!isQuery(s);}
function isDebtCmd(s){return hasAny(s,['долг','должен','должна','занял'])&&!isQuery(s);}
function isObligCmd(s){return hasAny(s,['обязательн','алименты']);}
function isWithdraw(s){return hasAny(s,['сними','снять','из резерва']);}
function isPayDebt(s){return hasAny(s,['верни','погаси','платеж','оплати долг']);}
function isDeleteLast(s){return hasAny(s,['удали последн','отмени последн','убери последн','удали расход','удали доход']);}
function isChangeLast(s){return hasAny(s,['измени последн','исправь последн','сумму на','замени сумму']);}
function stripNoise(text){var s=norm(text);s=s.replace(/\d+(?:[.,]\d+)?/g,' ');return s.replace(/\s+/g,' ').trim();}
function itemFromText(text){var item=stripNoise(text);return item?capitalize(item):'';}
function matchReserveName(text){var s=norm(text);for(var i=0;i<RES_PRESETS.length;i++){var p=norm(RES_PRESETS[i]);if(s.indexOf(p)!==-1)return RES_PRESETS[i];var short=p.split(' ')[0];if(short.length>3&&s.indexOf(short)!==-1)return RES_PRESETS[i];}var cleaned=stripNoise(text).trim();return cleaned?capitalize(cleaned):'';}
function addExpense(amount,category,note){var s=cloneState();s.expenses=s.expenses||[];s.expenses.push({id:id(),amount:amount,category:category||'Прочее',note:note||'',date:new Date().toISOString().slice(0,10)});applyState(s);if(note)learnCategory(note,category);}
function addIncome(amount,note){var s=cloneState();s.income=s.income||[];s.income.push({id:id(),amount:amount,note:note||'Доход',date:new Date().toISOString().slice(0,10)});applyState(s);}
function findReserve(s,name){var q=norm(name);return (s.reserves||[]).find(function(r){return norm(r.name)===q||norm(r.name).indexOf(q)!==-1||q.indexOf(norm(r.name))!==-1;});}
function createOrTopupReserve(name,target,deposit,withdraw){var s=cloneState();s.reserves=s.reserves||[];s.reserveOps=s.reserveOps||[];var r=findReserve(s,name||'');if(!r){r={id:id(),name:name||'Свой вариант',category:name||'Свой вариант',target:Number(target)||0,saved:0};s.reserves.push(r);}else if(target>0)r.target=Number(target);var amount=Number(deposit||0);if(withdraw){if(amount>Number(r.saved||0))throw new Error('В резерве только '+fmt(r.saved)+' ₽');r.saved=Number(r.saved||0)-amount;if(amount>0)s.reserveOps.push({id:id(),reserveId:r.id,type:'withdraw',amount:amount,date:new Date().toISOString().slice(0,10)});}else if(amount>0){r.saved=Number(r.saved||0)+amount;s.reserveOps.push({id:id(),reserveId:r.id,type:'deposit',amount:amount,date:new Date().toISOString().slice(0,10)});}applyState(s);return r.name;}
function addDebt(amount,name){var s=cloneState();s.debts=s.debts||[];s.debts.push({id:id(),name:name||'Долг',total:amount,paid:0});applyState(s);}
function payDebt(amount,name){var s=cloneState();s.debts=s.debts||[];var q=norm(name||''),d=s.debts.find(function(x){return q&&norm(x.name).indexOf(q)!==-1;})||s.debts.find(function(x){return Number(x.total||0)>Number(x.paid||0);});if(!d)throw new Error('Долг не найден');d.paid=Number(d.paid||0)+amount;s.expenses=s.expenses||[];s.expenses.push({id:id(),amount:amount,category:'Долг',note:d.name,date:new Date().toISOString().slice(0,10)});applyState(s);return d.name;}
function addObligation(amount,name,day){var s=cloneState();s.obligations=s.obligations||[];s.obligations.push({id:id(),name:name||'Платёж',amount:amount,day:day||25,active:true});applyState(s);}
function deleteLastOp(){var s=cloneState();var lastEx=(s.expenses&&s.expenses.length)?s.expenses[s.expenses.length-1]:null;var lastIn=(s.income&&s.income.length)?s.income[s.income.length-1]:null;if(!lastEx&&!lastIn)throw new Error('Нечего удалять');var pickEx=!(!lastEx||(lastIn&&String(lastEx.id)<String(lastIn.id)));if(pickEx){s.expenses=s.expenses.filter(function(x){return x.id!==lastEx.id;});applyState(s);return 'Удалила расход';}s.income=s.income.filter(function(x){return x.id!==lastIn.id;});applyState(s);return 'Удалила доход';}
function changeLastAmount(newAmount){var s=cloneState();var lastEx=(s.expenses&&s.expenses.length)?s.expenses[s.expenses.length-1]:null;var lastIn=(s.income&&s.income.length)?s.income[s.income.length-1]:null;if(!lastEx&&!lastIn)throw new Error('Нечего менять');var pickEx=!(!lastEx||(lastIn&&String(lastEx.id)<String(lastIn.id)));if(pickEx){lastEx.amount=Number(newAmount)||0;applyState(s);return 'Исправила расход на '+fmt(lastEx.amount);}lastIn.amount=Number(newAmount)||0;applyState(s);return 'Исправила доход на '+fmt(lastIn.amount);}
function answerQuery(text){var s=norm(text),st=window.STATE||{},month=(st.settings&&st.settings.month)||new Date().toISOString().slice(0,7);function inMonth(d){return String(d||'').slice(0,7)===month;}var open=Number(st.settings&&st.settings.openingBalance||0),inc=0,exp=0,dep=0,wd=0;(st.income||[]).forEach(function(i){if(inMonth(i.date))inc+=Number(i.amount||0);});(st.expenses||[]).forEach(function(e){if(inMonth(e.date))exp+=Number(e.amount||0);});(st.reserveOps||[]).forEach(function(o){if(!inMonth(o.date))return;var a=Number(o.amount||0);if(o.type==='deposit')dep+=a;else wd+=a;});var cash=open+inc-exp-dep+wd;return 'Касса '+fmt(cash)+' ₽. Доходы '+fmt(inc)+', расходы '+fmt(exp)+'.';}
function setUI(status,text){var a=document.getElementById('voiceStatus'),b=document.getElementById('voiceText'),o=document.getElementById('voiceOrb');if(a)a.textContent=status;if(b)b.textContent=text||'';if(o)o.classList.toggle('listening',listening);}
function closeUI(){pendingStep=null;if(recognition){try{recognition.onresult=null;recognition.stop();}catch(e){}recognition=null;}listening=false;try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}var m=document.getElementById('voiceModal');if(m)m.remove();}
function startListening(){if(!SR){say('Голосовой ввод недоступен','Chrome на Android');return;}if(recognition){try{recognition.stop();}catch(e){}}recognition=new SR();recognition.lang='ru-RU';recognition.interimResults=true;recognition.continuous=false;listening=true;setUI('Слушаю…','');recognition.onresult=function(e){var text='';for(var i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';text=text.trim();setUI('Слышу',text);if(e.results[e.results.length-1].isFinal){if(pendingStep&&pendingStep.onSpeech)pendingStep.onSpeech(text);else processCommand(text);}};recognition.onerror=function(){listening=false;say('Не распознала','Ещё раз');};recognition.onend=function(){listening=false;};try{recognition.start();}catch(e){}}
function btnStyle(primary,danger){var base='flex:1;min-width:100px;min-height:52px;padding:14px 12px;border-radius:14px;font-weight:700;font-size:16px;';if(primary)return base+'background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none;';if(danger)return base+'background:rgba(248,113,113,.18);color:#F87171;border:1px solid rgba(248,113,113,.4);';return base+'background:#1C1F28;color:#F2F3F7;border:1px solid rgba(255,255,255,.14);'}
function actionsBar(html){return '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">'+html+'</div>';}
function confirmBox(title,details,onYes){var card=document.querySelector('#voiceModal .voice-card');if(!card)return;pendingStep=null;speak(String(title||''));card.innerHTML='<div style="display:flex;justify-content:space-between;text-align:left"><div><div style="font-size:11px;color:#9AA0B0">Проверь</div><div style="font-size:19px;font-weight:700">'+esc(title)+'</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;border:none;color:#F2F3F7;font-size:24px">×</button></div><div style="padding:18px 8px;font-size:16px;line-height:1.7">'+details+'</div>'+actionsBar('<button type="button" id="voiceYes" style="'+btnStyle(true)+'">Подтвердить</button><button type="button" id="voiceNo" style="'+btnStyle()+'">Ещё раз</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Отменить</button>');document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceNo').onclick=function(){renderVoice();startListening();};document.getElementById('voiceYes').onclick=function(){try{onYes();say('Готово','Сделано');setTimeout(closeUI,900);}catch(e){say('Ошибка',e.message||'');}};}
function runAgent(text){
  var card=document.querySelector('#voiceModal .voice-card');
  function paintAnswer(ans){
    say('Ответ',ans);
    if(!card){if(window.toast)toast(ans);return;}
    card.innerHTML='<div style="display:flex;justify-content:space-between;text-align:left"><div><div style="font-size:11px;color:#9AA0B0">Копейка</div><div style="font-size:19px;font-weight:700">Ответ</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;border:none;color:#F2F3F7;font-size:24px">×</button></div><div style="padding:20px 8px;font-size:17px;line-height:1.6;text-align:left">'+esc(ans)+'</div>'+actionsBar('<button type="button" id="voiceAgain" style="'+btnStyle(true)+'">Ещё</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Закрыть</button>');
    var c=document.getElementById('voiceClose'),x=document.getElementById('voiceCancel'),a=document.getElementById('voiceAgain');
    if(c)c.onclick=closeUI;if(x)x.onclick=closeUI;if(a)a.onclick=function(){renderVoice();startListening();};
  }
  function execActions(actions){
    (actions||[]).forEach(function(a){
      if(!a||!a.type)return;
      if(a.type==='add_expense')addExpense(Number(a.amount)||0,a.category||'Прочее',a.note||a.item||'');
      else if(a.type==='add_income')addIncome(Number(a.amount)||0,a.note||'Доход');
      else if(a.type==='add_reserve')createOrTopupReserve(a.name||'Резерв',Number(a.target)||0,Number(a.deposit)||0,false);
      else if(a.type==='reserve_deposit')createOrTopupReserve(a.name||'',0,Number(a.amount)||0,false);
      else if(a.type==='reserve_withdraw')createOrTopupReserve(a.name||'',0,Number(a.amount)||0,true);
      else if(a.type==='add_debt')addDebt(Number(a.amount)||0,a.name||'Долг');
      else if(a.type==='pay_debt')payDebt(Number(a.amount)||0,a.name||'');
      else if(a.type==='add_obligation')addObligation(Number(a.amount)||0,a.name||'Платёж',Number(a.day)||25);
      else if(a.type==='delete_last')deleteLastOp();
      else if(a.type==='change_last')changeLastAmount(Number(a.amount)||0);
    });
  }
  if(!window.kopeykaAI||!window.kopeykaAI.askAgent){
    paintAnswer('ИИ не загрузился. Обнови страницу с очисткой кэша.');
    return;
  }
  if(card)card.innerHTML='<div style="padding:28px;color:#9AA0B0">Думаю…</div>';
  window.kopeykaAI.askAgent(text).then(function(obj){
    if(!obj||obj.mode==='answer'){
      paintAnswer((obj&&obj.text)||answerQuery(text));
      return;
    }
    var acts=obj.actions||[];
    if(!acts.length){paintAnswer(obj.summary||answerQuery(text));return;}
    var summary=obj.summary||('Действий: '+acts.length);
    var details=acts.map(function(a){
      if(a.type==='add_expense')return 'Расход −'+fmt(a.amount)+' ₽ · '+(a.note||a.item||'')+' ['+(a.category||'Прочее')+']';
      if(a.type==='add_income')return 'Доход +'+fmt(a.amount)+' ₽ · '+(a.note||'Доход');
      if(a.type==='add_reserve')return 'Резерв «'+(a.name||'')+'», цель '+(a.target||0)+', взнос '+(a.deposit||0);
      if(a.type==='reserve_deposit')return 'Пополнить «'+(a.name||'')+'» +'+fmt(a.amount)+' ₽';
      if(a.type==='reserve_withdraw')return 'Снять с «'+(a.name||'')+'» −'+fmt(a.amount)+' ₽';
      if(a.type==='add_debt')return 'Долг «'+(a.name||'')+'» '+fmt(a.amount)+' ₽';
      if(a.type==='pay_debt')return 'Платёж долга «'+(a.name||'')+'» '+fmt(a.amount)+' ₽';
      if(a.type==='add_obligation')return 'Обязательный «'+(a.name||'')+'» '+fmt(a.amount)+' ₽';
      if(a.type==='delete_last')return 'Удалить последнюю операцию';
      if(a.type==='change_last')return 'Изменить сумму последней на '+fmt(a.amount)+' ₽';
      return String(a.type||'?');
    }).join('<br>');
    confirmBox(summary,details,function(){execActions(acts);});
  }).catch(function(e){
    var msg=(e&&e.message)?e.message:String(e||'ошибка');
    try{
      var s=norm(text),amount=extractAmount(text),type=typeFromText(s);
      if(amount>0||isDeleteLast(s)||isChangeLast(s)||isReserveCmd(s)||isDebtCmd(s)||isObligCmd(s)||type){
        processCommandRules(text);
        return;
      }
    }catch(e2){}
    paintAnswer('Не удалось связаться с ИИ: '+msg+'. Попробуй ещё раз или проверь ключ в ⚙.');
  });
}
function processCommand(text){if(window.kopeykaAI&&window.kopeykaAI.hasKey()){runAgent(text);return;}processCommandRules(text);}
function processCommandRules(text){var s=norm(text);var amount=extractAmount(text);var type=typeFromText(s);var cat=categoryFromText(s);var item=itemFromText(s);if(isQuery(s)||(!amount&&!type&&s.length>2)){say('Ответ',answerQuery(text));return;}if(isChangeLast(s)){if(!amount){say('Какая сумма?','измени последнюю на 120');return;}try{say('Готово',changeLastAmount(amount));setTimeout(closeUI,1200);}catch(e){say('Ошибка',e.message);}return;}if(isDeleteLast(s)){try{say('Готово',deleteLastOp());setTimeout(closeUI,1200);}catch(e){say('Ошибка',e.message);}return;}if(isReserveCmd(s)){var name=matchReserveName(s)||'Резерв';if(amount>0){confirmBox((isWithdraw(s)?'Снять ':'Пополнить ')+fmt(amount),esc(name),function(){createOrTopupReserve(name,0,amount,isWithdraw(s));});}else say('Скажи сумму','резерв подушка 5000');return;}if(type==='income'){if(!amount){say('Сумма?','зарплата 4800');return;}confirmBox('Доход +'+fmt(amount),esc(item||'Доход'),function(){addIncome(amount,item||'Доход');});return;}if(isDebtCmd(s)){if(!amount){say('Сумма?','');return;}var dn=capitalize(stripNoise(s).trim()||'Долг');confirmBox((isPayDebt(s)?'Платёж ':'Долг ')+fmt(amount),esc(dn),function(){isPayDebt(s)?payDebt(amount,dn):addDebt(amount,dn);});return;}if(isObligCmd(s)){if(!amount){say('Сумма?','');return;}var on=capitalize(stripNoise(s).trim()||'Платёж');confirmBox('Обязательный '+fmt(amount),esc(on),function(){addObligation(amount,on,25);});return;}if(!amount){say('Не поняла','сигареты 100 или сколько в кассе');return;}if(!item)item='Расход';if(!cat)cat='Прочее';confirmBox('Расход −'+fmt(amount),esc(item)+' · '+esc(cat),function(){addExpense(amount,cat,item);});}
function ttsToggleBtn(){var on=ttsOn();return '<button type="button" id="voiceTtsToggle" style="margin-top:12px;width:100%;padding:12px;border-radius:12px;background:'+(on?'rgba(229,167,94,.22)':'#1C1F28')+';border:1px solid rgba(255,255,255,.14);color:#F2F3F7;font-weight:700">'+(on?'Голос: ВКЛ':'Голос: ВЫКЛ')+'</button>';}
function bindTtsToggle(){var t=document.getElementById('voiceTtsToggle');if(!t)return;t.onclick=function(){setTtsOn(!ttsOn());t.textContent=ttsOn()?'Голос: ВКЛ':'Голос: ВЫКЛ';if(ttsOn())speak('Озвучка включена');};}
function renderVoice(){pendingStep=null;var old=document.getElementById('voiceModal');if(old)old.remove();var bg=document.createElement('div');bg.id='voiceModal';bg.style.cssText='position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center';bg.innerHTML='<div class="voice-card" style="width:100%;max-width:520px;background:#16181F;border-radius:22px 22px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));text-align:center"><div style="display:flex;justify-content:space-between;text-align:left"><div><div style="font-size:11px;color:#9AA0B0">Копейка</div><div style="font-size:19px;font-weight:700">Говори как угодно</div></div><button type="button" id="voiceClose" style="width:36px;height:36px;border-radius:10px;background:#1C1F28;border:none;color:#F2F3F7;font-size:24px">×</button></div><button type="button" id="voiceOrb" style="width:82px;height:82px;border-radius:50%;margin:18px auto 12px;background:linear-gradient(135deg,#F0C384,#E5A75E);border:0;font-size:36px">🎙️</button><div id="voiceStatus" style="font-size:13px;color:#9AA0B0">Слушаю…</div><div id="voiceText" style="min-height:34px;margin:8px 0;font-size:16px"></div><div style="font-size:12px;color:#9AA0B0;padding:8px">Любая фраза — ИИ поймёт и сделает</div>'+ttsToggleBtn()+actionsBar('<button type="button" id="voiceAgain" style="'+btnStyle(true)+'">Говорить</button><button type="button" id="voiceCancel" style="'+btnStyle(false,true)+'">Отмена</button>')+'</div>';document.body.appendChild(bg);document.getElementById('voiceClose').onclick=closeUI;document.getElementById('voiceCancel').onclick=closeUI;document.getElementById('voiceAgain').onclick=startListening;document.getElementById('voiceOrb').onclick=startListening;bindTtsToggle();}
function openUI(){renderVoice();startListening();}
function installMicFab(){var old=document.getElementById('voiceMicFab');if(old)old.remove();var b=document.createElement('button');b.id='voiceMicFab';b.type='button';b.textContent='🎙️';b.style.cssText='position:fixed;right:20px;bottom:calc(80px + env(safe-area-inset-bottom,0px));z-index:61;width:44px;height:44px;border-radius:50%;background:rgba(22,24,31,.35);border:1px solid rgba(229,167,94,.35);font-size:20px;';b.onclick=function(){openUI();};document.body.appendChild(b);}
function boot(){if(window.speechSynthesis)window.speechSynthesis.getVoices();window.kopeykaVoice={open:openUI,speak:speak,ttsOn:ttsOn,setTtsOn:setTtsOn};installMicFab();setTimeout(installMicFab,500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
