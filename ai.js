(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='openai/gpt-oss-20b';
var CATS=['Продукты','Алкоголь','Сигареты','Хозтовары','Бытовая химия','Кафе','Связь','Проезд','Жильё','Здоровье','Красота','Одежда','Развлечения','Подписки','Техника','Дети','Животные','Обязательные','Долг','Прочее'];
function getKey(){try{return(localStorage.getItem(GROQ_KEY)||'').trim();}catch(e){return'';}}
function setKey(k){try{k=String(k||'').trim();if(k)localStorage.setItem(GROQ_KEY,k);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
function hasKey(){return!!getKey();}
function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
function monthOf(d){return String(d||'').slice(0,7);}
function exact(st,month){
  st=st||{};var s=st.settings||{},open=n(s.openingBalance),inc=0,exp=0,dep=0,wd=0,debt=0,obligDue=0,obligPaid=0;
  (st.income||[]).forEach(function(x){if(monthOf(x.date)===month)inc+=n(x.amount);});
  (st.expenses||[]).forEach(function(x){if(monthOf(x.date)===month)exp+=n(x.amount);});
  (st.reserveOps||[]).forEach(function(x){if(monthOf(x.date)!==month)return;var a=n(x.amount);if(x.type==='deposit')dep+=a;else wd+=a;});
  (st.debts||[]).forEach(function(x){debt+=Math.max(0,n(x.total)-n(x.paid));});
  (st.obligations||[]).forEach(function(o){if(o.active===false)return;var paid=0;(st.obligationPays||[]).forEach(function(p){if(p.obligId===o.id&&p.month===month)paid+=n(p.amount);});obligPaid+=paid;obligDue+=Math.max(0,n(o.amount)-paid);});
  var cash=open+inc-exp-dep+wd,available=cash-debt-obligDue;
  var now=new Date(),ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'),last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),day=now.getDate();
  var daysLeft=month===ym?Math.max(1,last-day+1):new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  var daily=available>0?Math.floor(available/daysLeft):0;
  var cats={};(st.expenses||[]).forEach(function(x){if(monthOf(x.date)!==month)return;var c=x.category||'Прочее';if(c==='Долг'&&x.note)c=x.note;cats[c]=(cats[c]||0)+n(x.amount);});
  return{month:month,openingBalance:open,cash:cash,available:available,dailyBudget:daily,daysLeft:daysLeft,income:inc,expenses:exp,reserveDeposits:dep,reserveWithdrawals:wd,debtRemaining:debt,obligationsRemaining:obligDue,obligationsPaid:obligPaid,reserves:(st.reserves||[]).map(function(r){return{name:r.name,saved:n(r.saved),target:n(r.target)};}),expenseByCategory:cats};
}
function buildContext(){
  var st=window.STATE||{},month=(st.settings&&st.settings.month)||new Date().toISOString().slice(0,7),calc=exact(st,month);
  return 'ТОЧНЫЕ РАСЧЁТЫ КОПЕЙКИ:\n'+JSON.stringify(calc)+'\n\nПОЛНОЕ ТЕКУЩЕЕ СОСТОЯНИЕ:\n'+JSON.stringify(st);
}
function systemPrompt(){
 return 'Ты — встроенный интеллектуальный управляющий приложением «Копейка». Ты должен отвечать только на основании переданного CURRENT STATE и EXACT CALCULATIONS. НИКОГДА не выдумывай суммы, даты, операции, долги, резервы или настройки. Если данных недостаточно — прямо скажи, чего не хватает. Для финансовых вопросов используй EXACT CALCULATIONS, а не собственную арифметику. Особенно важно: вопрос «сколько я могу потратить сегодня» означает точный dailyBudget из расчётов Копейки. Не меняй месячную модель и не придумывай другую формулу.\n\nТы знаешь все разделы: касса, доходы, расходы, категории, резервы, долги, обязательные платежи, смены, ставки и настройки. Можешь отвечать на вопросы по истории и объяснять расчёты.\n\nДля действий возвращай JSON: {"mode":"action","summary":"краткое описание","actions":[{"type":"add_expense|add_income|reserve_deposit|reserve_withdraw|add_debt|pay_debt|add_obligation|delete_last|change_last","amount":500,"name":"Сигареты","category":"Сигареты","reserve":"Права","day":25}]} . Для обычного ответа: {"mode":"answer","text":"ответ"}.\n\nДля расхода: amount — сумма, name — КОРОТКОЕ НАЗВАНИЕ ПОКУПКИ (например «Сигареты», «Майонез»), category — одна из: '+CATS.join(', ')+'. Не записывай всю исходную фразу в name. Для «купил майонез 500» name=«Майонез», amount=500, category=«Продукты». Для «купил сигареты 500» name=«Сигареты», category=«Сигареты». Для дохода name — короткое назначение.\n\nЕсли пользователь просит изменить или удалить данные, создай action и дождись подтверждения интерфейса. Не выполняй действие сам. Если пользователь отвечает «да/подтверждаю/сделай» на предыдущий запрос подтверждения, продолжай только если предыдущий контекст содержит конкретное действие.\n\nОтвечай по-русски, кратко и понятно.';
}
function parse(raw){var t=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');var a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)t=t.slice(a,b+1);var o=JSON.parse(t);if(!o||typeof o!=='object')throw new Error('Модель вернула неверный ответ');if(o.mode!=='answer'&&o.mode!=='action'){if(o.text)o.mode='answer';else if(o.actions)o.mode='action';else throw new Error('Модель вернула неизвестный формат');}return o;}
function askConversation(history,userText){
 return new Promise(function(resolve,reject){var key=getKey();if(!key){reject(new Error('Нет ключа Groq. Открой ⚙ → Ключ Groq.'));return;}var messages=[{role:'system',content:systemPrompt()+'\n\n'+buildContext()}];(history||[]).slice(-12).forEach(function(m){messages.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')});});messages.push({role:'user',content:String(userText||'')});var ctrl=typeof AbortController!=='undefined'?new AbortController():null,timer=setTimeout(function(){try{ctrl&&ctrl.abort();}catch(e){}reject(new Error('Groq не ответил за 20 секунд'));},20000);var body={model:MODEL,temperature:0.05,max_tokens:900,messages:messages};fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body),signal:ctrl?ctrl.signal:undefined}).then(function(r){return r.text().then(function(txt){clearTimeout(timer);var j;try{j=JSON.parse(txt);}catch(e){throw new Error('Groq вернул не JSON ('+r.status+')');}if(!r.ok){var msg=j&&j.error&&j.error.message||('HTTP '+r.status);if(r.status===401)msg='Неверный ключ Groq';if(r.status===429)msg='Лимит Groq временно исчерпан';throw new Error(msg);}var c=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!c)throw new Error('Пустой ответ Groq');resolve(parse(c));});}).catch(function(e){clearTimeout(timer);reject(e&&e.name==='AbortError'?new Error('Таймаут'):e);});});
}
function askAgent(text){return askConversation([],text);}
function ask(text){return askAgent(text).then(function(o){return o.mode==='answer'?o.text:o.summary||'';});}
function testKey(){return askAgent('Ответь одним словом: готово').then(function(){return'Ключ работает ✓';});}
window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,ask:ask,askAgent:askAgent,askConversation:askConversation,testKey:testKey,buildContext:buildContext};
})();
