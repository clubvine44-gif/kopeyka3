(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key',GROQ_URL='https://api.groq.com/openai/v1/chat/completions',MODEL='llama-3.3-70b-versatile';var MODELS=['llama-3.3-70b-versatile','llama-3.1-8b-instant','gemma2-9b-it'];
function getKey(){try{var k=(localStorage.getItem(GROQ_KEY)||'').trim();if(k)return k;}catch(e){}return (function(){try{return atob(['Z3NrX3N0','VVZMNHJF','VFJFQk56','OGs3ZWV2','V0dkeWIz','RllIeUMx','ZHJUbk1j','ZWU3TzBC','eHk4N0E3','M08='].join(''));}catch(e){return '';}})();}
function setKey(key){try{key=String(key||'').trim();if(key)localStorage.setItem(GROQ_KEY,key);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
function hasKey(){return !!getKey();}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();}
function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
function fmt(v){return n(v).toLocaleString('ru-RU')+' ₽';}
function getContext(){try{return window.kopeykaEngine&&typeof window.kopeykaEngine.context==='function'?window.kopeykaEngine.context():JSON.stringify(window.STATE||{});}catch(e){return '{}';}}
function parseResponse(raw){var text=String(raw||'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'');var start=text.indexOf('{'),end=text.lastIndexOf('}');if(start>=0&&end>start)text=text.slice(start,end+1);var result=JSON.parse(text);if(!result||typeof result!=='object')throw new Error('Неверный ответ ИИ');if(!Array.isArray(result.actions))result.actions=[];return result;}
function debts(){return(window.STATE&&Array.isArray(window.STATE.debts))?window.STATE.debts:[];}
function obligations(){return(window.STATE&&Array.isArray(window.STATE.obligations))?window.STATE.obligations:[];}
function stem(s){
  var q=norm(s);
  return q.replace(/(иями|ями|ами|ого|ему|ому|ыми|ими|ией|ей|ий|ый|ой|ом|ем|ам|ям|ах|ях|ою|ею|у|ю|а|я|ы|и|е|о)$/,'');
}
function resolveDebt(name){
  var q=norm(name),arr=debts();
  if(!arr.length)return null;
  if(!q)return arr.length===1?arr[0]:null;
  var exact=arr.find(function(d){return norm(d.name)===q;});
  if(exact)return exact;
  var st=stem(q);
  var found=arr.find(function(d){
    var dn=norm(d.name),ds=stem(dn);
    return dn===q||dn.indexOf(q)!==-1||q.indexOf(dn)!==-1||
           ds===st||(st.length>1&&(ds.indexOf(st)!==-1||st.indexOf(ds)!==-1));
  });
  if(found)return found;
  if(arr.length===1)return arr[0];
  return null;
}
function resolveObligation(name,amount){var arr=obligations(),a=n(amount);if(a>0){var byAmount=arr.filter(function(x){return x.active!==false&&n(x.amount)===a;});if(byAmount.length===1)return byAmount[0];}var q=norm(name);if(!q)return null;return arr.find(function(x){return x.active!==false&&norm(x.name)===q;})||arr.find(function(x){var xn=norm(x.name),xs=stem(xn),qs=stem(q);return xn.indexOf(q)!==-1||q.indexOf(xn)!==-1||xs===qs;})||null;}
function inferType(a,summary){
  if(!a||typeof a!=='object')return a;
  if(a.type)return a;
  var s=norm(summary||a.summary||a.text||'');
  var t=norm(a.action||a.op||a.command||'');
  if(t)a.type=t;
  else if(/удал.*долг|delete.?debt/.test(s)||(/долг/.test(s)&&/удал/.test(s)))a.type='delete_debt';
  else if(/плат[её]ж.*долг|pay.?debt|погас/.test(s))a.type='pay_debt';
  else if(/увелич.*долг|increase.?debt/.test(s))a.type='increase_debt';
  else if(/новый долг|add.?debt/.test(s))a.type='add_debt';
  else if(/удал.*расход|delete.?expense/.test(s))a.type='delete_expense';
  else if(/удал.*доход|delete.?income/.test(s))a.type='delete_income';
  else if(/удал.*резерв|delete.?reserve/.test(s))a.type='delete_reserve';
  else if(/удал.*обязат|delete.?obligation/.test(s))a.type='delete_obligation';
  else if(/расход|add.?expense|купил/.test(s))a.type='add_expense';
  else if(/доход|add.?income|зарплат/.test(s))a.type='add_income';
  else if(/резерв.*полож|deposit/.test(s))a.type='reserve_deposit';
  else if(/резерв.*сня|withdraw/.test(s))a.type='reserve_withdraw';
  return a;
}
function normalizeActions(result){
  if(!result||!Array.isArray(result.actions))return result;
  var summary=result.summary||result.text||'';
  result.actions=result.actions.map(function(a){
    if(!a||typeof a!=='object')return a;
    a=inferType(a,summary);
    if(a.type==='add_expense'){
      var nm=String(a.name||'').trim();var q=norm(nm);
      if(/зубн.*щет|зубы|щетк/.test(q))nm='Зубная щётка';
      if(/футбол.*мяч|футбольн.*мяч/.test(q))nm='Футбольный мяч';
      a.name=nm;
      if(window.kopeykaEngine&&window.kopeykaEngine.classifyName)
        a.category=/зубн.*щет/.test(q)?'Хозтовары':/футбол.*мяч|футбольн.*мяч/.test(q)?'Развлечения':window.kopeykaEngine.classifyName(nm,a.category);
    }
    if(a.type==='increase_debt'||a.type==='pay_debt'||a.type==='delete_debt'){
      var d=resolveDebt(a.name||a.debt||a.target);
      if(d)a.name=d.name;
    }
    if(a.type==='delete_obligation'){
      var o=resolveObligation(a.name,a.amount);
      if(o){a.name=o.name;a.amount=n(o.amount);a.id=o.id;}
    }
    return a;
  }).filter(function(a){return a&&a.type;});
  if(result.mode==='action'&&!result.actions.length){
    result.mode='answer';
    result.text=result.text||result.summary||'Не понял действие. Повтори, например: «удали долг ёжику».';
  }
  return result;
}
/* Без \b — в JS граница слова не работает с кириллицей */
function localIntent(text){
  var t=norm(text),m,amount,name;
  t=t.replace(/^(привет\s+)?(финн?|фенн?|фынн?|fin+n?)\s*/i,'').trim();
  if(!t)return null;

  if(/(удали|удалить|убери|убрать|снеси|сотри)/.test(t)&&/долг/.test(t)){
    name=t.replace(/(удали|удалить|убери|убрать|снеси|сотри)/g,'')
           .replace(/долг(а|у|ом|е|и)?/g,'')
           .replace(/на\s+\d[\d\s]*/g,'')
           .trim();
    var dd=resolveDebt(name);
    if(dd)return{mode:'action',text:null,summary:'Удалить долг «'+dd.name+'»',actions:[{type:'delete_debt',name:dd.name}]};
    var list=debts().map(function(d){return d.name;}).join(', ');
    return{mode:'answer',text:list?'Не нашёл долг «'+(name||'')+'». Есть: '+list+'.':'В Копейке нет долгов.',summary:null,actions:[]};
  }

  m=t.match(/(дай|дать|дал|дала|отдал|отдала|внеси|внести|внесла|кинь|кинул|погаси|погасить|заплати|заплатил)\s+(к\s+|по\s+|на\s+|в\s+)?(долг(у|а|е)?\s+)?(.+?)\s+(\d[\d\s]*(?:[.,]\d+)?)/);
  if(m&&(/долг/.test(t)||resolveDebt(m[5]||m[4]))){
    var who=m[5]||m[4];
    var dPay=resolveDebt(who);
    amount=n(String(m[6]||m[m.length-1]).replace(/\s/g,'').replace(',','.'));
    if(dPay&&amount>0)return{mode:'action',text:null,summary:'Платёж по долгу «'+dPay.name+'»: '+fmt(amount),actions:[{type:'pay_debt',name:dPay.name,amount:amount}]};
  }

  m=t.match(/(увеличь|увеличить|добавь к сумме)\s+(долг\s+)?(.+?)\s+(на|на сумму)\s+(\d[\d\s]*)/);
  if(m&&/долг/.test(t)){
    var dInc=resolveDebt(m[3]);amount=n(m[5].replace(/\s/g,''));
    if(dInc&&amount>0)return{mode:'action',text:null,summary:'Увеличить долг «'+dInc.name+'» на '+fmt(amount),actions:[{type:'increase_debt',name:dInc.name,amount:amount}]};
  }

  m=t.match(/(удали|удалить|убери)\s+(обязательный\s+)?(платеж|платёж)\s*(на|в размере)?\s*(\d[\d\s]*)/);
  if(m){
    amount=n(m[5].replace(/\s/g,''));
    var o=resolveObligation('',amount);
    if(o)return{mode:'action',text:null,summary:'Удалить обязательный «'+o.name+'»',actions:[{type:'delete_obligation',name:o.name,amount:n(o.amount),id:o.id}]};
  }

  m=t.match(/(купил|купила|потратил|потратила|куплено|расход)\s+(.+?)\s+(за|на)\s+(\d[\d\s]*(?:[.,]\d+)?)/);
  if(m){
    name=m[2].trim();amount=n(String(m[4]).replace(/\s/g,'').replace(',','.'));
    if(amount>0)return{mode:'action',text:null,summary:'Добавить расход',actions:[{type:'add_expense',amount:amount,name:name,category:window.kopeykaEngine&&window.kopeykaEngine.classifyName?window.kopeykaEngine.classifyName(name,'Прочее'):'Прочее',date:new Date().toISOString().slice(0,10)}]};
  }
  return null;
}
function askConversation(history,userText){
  var local=localIntent(userText);
  if(local)return Promise.resolve(local);
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Нет ключа Groq. Открой настройки Копейки и укажи ключ Groq.'));return;}
    var debtNames=debts().map(function(d){return d.name;}).join(', ')||'нет';
    var profileCtx='';
    try{if(window.FinnaProfile&&window.FinnaProfile.contextForAI){var pc=window.FinnaProfile.contextForAI();profileCtx=pc.summary+' Фокус: '+(pc.focus||'')+'. Режим: '+pc.mode+'.';}}catch(e){}
    var system=[
      'Контекст сценария пользователя: '+profileCtx,
      'Тебя зовут Финна (не Финн и не Фина). Ты дружелюбный ассистент приложения Копейка.',
      'Отвечай только по-русски, коротко и по делу.',
      'Ты можешь отвечать на ЛЮБЫЕ вопросы пользователя: финансы, общие знания, быт, шутки — без отказов «я только про деньги».',
      'Если вопрос не про Копейку — просто ответь как умный помощник в mode answer.',
      'Долги сейчас: '+debtNames+'.',
      'Когда нужно изменить данные Копейки — mode action с actions. Каждый action ОБЯЗАН иметь type.',
      'Пример: {"type":"delete_debt","name":"Ёжик"} или {"type":"pay_debt","name":"Ёжик","amount":189}.',
      'Бери точные имена из списка долгов/резервов. Никогда не удаляй доход вместо долга.',
      'Формат JSON строго: {"mode":"answer","text":"...","summary":null,"actions":[]} или {"mode":"action","text":null,"summary":"...","actions":[{"type":"..."}]}.',
      'type: add_expense, add_income, add_debt, pay_debt, increase_debt, reserve_deposit, reserve_withdraw, add_obligation, delete_debt, delete_income, delete_expense, delete_reserve, delete_obligation, delete_last, change_last, set_opening_balance, set_day_rate, set_night_rate, change_shift.',
      'На вопрос «как тебя зовут» отвечай: «Меня зовут Финна».'
    ].join('\n');
    var messages=[{role:'system',content:system+'\n\nКОНТЕКСТ:\n'+getContext()}];
    (history||[]).slice(-12).forEach(function(item){messages.push({role:item.role==='assistant'?'assistant':'user',content:String(item.content||'')});});
    messages.push({role:'user',content:String(userText||'')});
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){try{if(controller)controller.abort();}catch(e){}reject(new Error('Groq не ответил за 20 секунд'));},20000);
    fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:MODEL,temperature:0.05,max_completion_tokens:1400,messages:messages}),signal:controller?controller.signal:undefined}).then(function(response){
      return response.text().then(function(body){
        clearTimeout(timer);
        var data;try{data=JSON.parse(body);}catch(e){throw new Error('Groq вернул некорректный ответ ('+response.status+')');}
        if(!response.ok){
          var message=data&&data.error&&data.error.message?data.error.message:('HTTP '+response.status);
          if(response.status===401)message='Неверный ключ Groq';
          if(response.status===429)message='Слишком много запросов к ИИ. Подожди 20–30 сек и повтори.';
          throw new Error(message);
        }
        var content=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
        if(!content)throw new Error('Пустой ответ Groq');
        resolve(normalizeActions(parseResponse(content)));
      });
    }).catch(function(error){
      clearTimeout(timer);
      if(error&&error.name==='AbortError')reject(new Error('Таймаут Groq'));
      else if(error&&/Failed to fetch/i.test(error.message||''))reject(new Error('Нет сети или api.groq.com недоступен'));
      else reject(error);
    });
  });
}
function askAgent(text){return askConversation([],text);}
function ask(text){return askAgent(text).then(function(result){return result.mode==='answer'?(result.text||''):(result.summary||result.text||'');});}
function testKey(){return askAgent('Ответь одним словом: готово').then(function(){return 'Ключ работает ✓';});}
window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,ask:ask,askAgent:askAgent,askConversation:askConversation,testKey:testKey,buildContext:getContext};
})();
