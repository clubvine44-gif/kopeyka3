(function () {
  'use strict';
  var GROQ_KEY='kopeyka_groq_key',GROQ_URL='https://api.groq.com/openai/v1/chat/completions',MODEL='openai/gpt-oss-20b';
  function getKey(){try{return(localStorage.getItem(GROQ_KEY)||'').trim();}catch(e){return '';}}
  function setKey(key){try{key=String(key||'').trim();if(key)localStorage.setItem(GROQ_KEY,key);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
  function hasKey(){return !!getKey();}
  function getContext(){try{return window.kopeykaEngine&&typeof window.kopeykaEngine.context==='function'?window.kopeykaEngine.context():JSON.stringify(window.STATE||{});}catch(e){return '{}';}}
  function parseResponse(raw){var text=String(raw||'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'');var start=text.indexOf('{'),end=text.lastIndexOf('}');if(start>=0&&end>start)text=text.slice(start,end+1);var result=JSON.parse(text);if(!result||typeof result!=='object')throw new Error('Неверный ответ ИИ');if(!Array.isArray(result.actions))result.actions=[];return result;}
  function askConversation(history,userText){return new Promise(function(resolve,reject){var key=getKey();if(!key){reject(new Error('Нет ключа Groq. Открой настройки Копейки и укажи ключ Groq.'));return;}
    var system=[
      'Ты — Копейка AI, финансовый ассистент приложения. Отвечай только по-русски.',
      'АКТУАЛЬНОЕ СОСТОЯНИЕ содержит ПОЛНЫЕ массивы income, expenses, debts, reserves, obligations, reserveOps и obligationPays за все доступные даты, а также monthlyCalculations за все месяцы, которые есть в данных.',
      'Никогда не утверждай, что не видишь предыдущий или следующий месяц, если он есть в monthlyCalculations или массивах данных.',
      'Для финансовой математики используй готовые calculations и monthlyCalculations. Не придумывай и не пересчитывай дневной лимит самостоятельно.',
      'Для расходов всегда сохраняй реальное название покупки. Не превращай «зубная щётка» в «зубы», «футбольный мяч» в «футбол» и не заменяй название покупки названием категории.',
      'Категорию выбирай из categories/локального классификатора. Для «зубная щётка» используй Хозтовары. Для «футбольный мяч» используй Развлечения.',
      'Имена долгов, резервов и обязательных платежей нужно понимать в любом русском падеже. Если пользователь говорит «увеличь долг Ёжику», а в данных есть «Ёжик», это один и тот же объект. Не создавай новый долг.',
      'Для изменения существующего долга обязательно используй его существующее имя из массива debts. Для удаления обязательного платежа используй существующий name и/или точную сумму из obligations. Не придумывай объект.',
      'Если пользователь просит удалить обязательный платеж на 700 рублей, найди существующий объект obligations с amount=700 и верни delete_obligation с его name и amount.',
      'Облако находится в cloud. Если пользователь спрашивает о синхронизации, отвечай по cloud.online, cloud.connected и cloud.status. Не выдумывай дату синхронизации, если её нет.',
      'Если пользователь просит изменить данные, верни действие и не выполняй его самостоятельно. Опасные изменения требуют подтверждения интерфейсом.',
      'Ответ возвращай строго JSON без markdown.',
      'Формат ответа: {"mode":"answer","text":"...","summary":null,"actions":[]}.',
      'Для изменения: {"mode":"action","text":null,"summary":"...","actions":[...]}.' ,
      'Допустимые действия: add_expense, add_income, add_debt, pay_debt, increase_debt, reserve_deposit, reserve_withdraw, add_obligation, delete_debt, delete_income, delete_expense, delete_reserve, delete_obligation, delete_last, change_last, set_opening_balance, set_day_rate, set_night_rate, change_shift.',
      'Для add_expense поля должны быть amount,name,category,date(если дата явно указана). name — реальная покупка, category — категория.',
      'Для delete_obligation указывай name существующего платежа и amount, если пользователь указал сумму.',
      'Для increase_debt/pay_debt/delete_debt всегда указывай name существующего долга, а для суммы — amount.'
    ].join('\n');
    var messages=[{role:'system',content:system+'\n\nПОЛНЫЙ КОНТЕКСТ КОПЕЙКИ:\n'+getContext()}];
    (history||[]).slice(-20).forEach(function(item){messages.push({role:item.role==='assistant'?'assistant':'user',content:String(item.content||'')});});
    messages.push({role:'user',content:String(userText||'')});
    var controller=typeof AbortController!=='undefined'?new AbortController():null,timer=setTimeout(function(){try{if(controller)controller.abort();}catch(e){}reject(new Error('Groq не ответил за 20 секунд'));},20000);
    fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:MODEL,temperature:0.05,max_completion_tokens:1800,messages:messages}),signal:controller?controller.signal:undefined}).then(function(response){return response.text().then(function(body){clearTimeout(timer);var data;try{data=JSON.parse(body);}catch(e){throw new Error('Groq вернул некорректный ответ ('+response.status+')');}if(!response.ok){var message=data&&data.error&&data.error.message?data.error.message:('HTTP '+response.status);if(response.status===401)message='Неверный ключ Groq';if(response.status===429)message='Лимит Groq временно исчерпан';throw new Error(message);}var content=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;if(!content)throw new Error('Пустой ответ Groq');resolve(parseResponse(content));});}).catch(function(error){clearTimeout(timer);if(error&&error.name==='AbortError')reject(new Error('Таймаут Groq'));else if(error&&/Failed to fetch/i.test(error.message||''))reject(new Error('Нет сети или api.groq.com недоступен'));else reject(error);});
  });}
  function askAgent(text){return askConversation([],text);}
  function ask(text){return askAgent(text).then(function(result){return result.mode==='answer'?(result.text||''):(result.summary||result.text||'');});}
  function testKey(){return askAgent('Ответь одним словом: готово').then(function(){return 'Ключ работает ✓';});}
  window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,ask:ask,askAgent:askAgent,askConversation:askConversation,testKey:testKey,buildContext:getContext};
})();
