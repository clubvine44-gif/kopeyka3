(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='llama-3.1-8b-instant';

function getKey(){
  try{return (localStorage.getItem(GROQ_KEY)||'').trim();}catch(e){return '';}
}
function setKey(k){
  try{
    k=String(k||'').trim();
    if(k)localStorage.setItem(GROQ_KEY,k);
    else localStorage.removeItem(GROQ_KEY);
  }catch(e){}
}
function hasKey(){return !!getKey();}

function buildContext(){
  var st=window.STATE||{};
  var month=(st.settings&&st.settings.month)||new Date().toISOString().slice(0,7);
  function inMonth(d){return String(d||'').slice(0,7)===month;}
  var open=Number(st.settings&&st.settings.openingBalance||0),inc=0,exp=0,dep=0,wd=0;
  (st.income||[]).forEach(function(i){if(inMonth(i.date))inc+=Number(i.amount||0);});
  (st.expenses||[]).forEach(function(e){if(inMonth(e.date))exp+=Number(e.amount||0);});
  (st.reserveOps||[]).forEach(function(o){if(!inMonth(o.date))return;var a=Number(o.amount||0);if(o.type==='deposit')dep+=a;else wd+=a;});
  var cash=open+inc-exp-dep+wd;
  var debt=0;(st.debts||[]).forEach(function(d){debt+=Math.max(0,Number(d.total||0)-Number(d.paid||0));});
  var res=(st.reserves||[]).map(function(r){
    return r.name+': накоплено '+Math.round(Number(r.saved||0))+' ₽'+(r.target?' из '+Math.round(Number(r.target))+' ₽':'');
  }).join('; ')||'нет';
  var debts=(st.debts||[]).map(function(d){
    return d.name+': осталось '+Math.max(0,Math.round(Number(d.total||0)-Number(d.paid||0)))+' ₽';
  }).join('; ')||'нет';
  var lastExp=(st.expenses||[]).slice(-3).map(function(e){
    return (e.note||e.category||'расход')+' −'+Math.round(Number(e.amount||0))+' ₽';
  }).join(', ')||'нет';
  var lastInc=(st.income||[]).slice(-2).map(function(i){
    return (i.note||'доход')+' +'+Math.round(Number(i.amount||0))+' ₽';
  }).join(', ')||'нет';
  return [
    'Месяц: '+month,
    'Касса: '+Math.round(cash)+' ₽',
    'Доходы за месяц: +'+Math.round(inc)+' ₽',
    'Расходы за месяц: −'+Math.round(exp)+' ₽',
    'Резервы: '+res,
    'Долги: '+debts,
    'Последние расходы: '+lastExp,
    'Последние доходы: '+lastInc
  ].join('\n');
}

function systemPrompt(){
  return [
    'Ты — Копейка, голосовой помощник личного бюджета на русском.',
    'Отвечай коротко, живо, по-человечески, 1–3 предложения.',
    'Используй ТОЛЬКО данные из блока «Состояние». Не выдумывай суммы.',
    'Если просят добавить/удалить операцию — скажи, что это делается отдельными командами: «сигареты 100», «удали последнюю», «зарплата 5000».',
    'Не давай финансовых советов как банк. Будь дружелюбной.',
    'Деньги всегда в рублях.'
  ].join(' ');
}

function ask(userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){
      reject(new Error('Нет API-ключа Groq. Добавь в настройках ⚙'));
      return;
    }
    var body={
      model:MODEL,
      temperature:0.35,
      max_tokens:220,
      messages:[
        {role:'system',content:systemPrompt()},
        {role:'user',content:'Состояние:\n'+buildContext()+'\n\nВопрос пользователя: '+String(userText||'')}
      ]
    };
    fetch(GROQ_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+key
      },
      body:JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(j){
        if(!r.ok){
          var msg=(j&&j.error&&j.error.message)||('HTTP '+r.status);
          throw new Error(msg);
        }
        var txt=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        if(!txt)throw new Error('Пустой ответ ИИ');
        resolve(String(txt).trim());
      });
    }).catch(function(e){
      reject(e);
    });
  });
}

window.kopeykaAI={
  getKey:getKey,
  setKey:setKey,
  hasKey:hasKey,
  ask:ask,
  buildContext:buildContext
};
})();
