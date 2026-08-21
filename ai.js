(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='openai/gpt-oss-20b';

function getKey(){try{return (localStorage.getItem(GROQ_KEY)||'').trim();}catch(e){return '';}}
function setKey(k){try{k=String(k||'').trim();if(k)localStorage.setItem(GROQ_KEY,k);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
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
  var available=cash-debt;
  var t=new Date(),dayNum=t.getDate(),last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  var leftDays=Math.max(1,last-dayNum+1),daily=available>0?Math.floor(available/leftDays):0;
  var res=(st.reserves||[]).map(function(r){return r.name+'='+Math.round(Number(r.saved||0));}).join(', ')||'нет';
  return 'месяц='+month+'\nкасса='+Math.round(cash)+'\nдоступно='+Math.round(available)+'\nлимит_день='+daily+'\nдоходы='+Math.round(inc)+'\nрасходы='+Math.round(exp)+'\nрезервы: '+res;
}

function systemPrompt(){
  return 'Ты управляешь приложением Копейка. Ответь ТОЛЬКО JSON.\n'+
    '{"mode":"answer","text":"..."} — ответ на вопрос.\n'+
    '{"mode":"action","summary":"...","actions":[{"type":"add_expense","amount":100,"note":"сигареты","category":"Сигареты"}]} — действие.\n'+
    'types: add_expense, add_income, add_reserve, reserve_deposit, reserve_withdraw, add_debt, pay_debt, add_obligation, delete_last, change_last.\n'+
    'Суммы числами. Русский язык. Не выдумывай цифры — бери из STATE.';
}

function parseAgentJson(raw){
  var t=String(raw||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var a=t.indexOf('{'),b=t.lastIndexOf('}');
  if(a>=0&&b>a)t=t.slice(a,b+1);
  var obj=JSON.parse(t);
  if(!obj||typeof obj!=='object')throw new Error('Не JSON от модели');
  if(obj.mode!=='answer'&&obj.mode!=='action'){
    if(typeof obj.text==='string')obj.mode='answer';
    else if(Array.isArray(obj.actions))obj.mode='action';
    else if(obj.type){obj.mode='action';obj.actions=[obj];}
    else throw new Error('Неизвестный формат ответа');
  }
  return obj;
}

function askAgent(userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Нет ключа. ⚙ → Ключ Groq'));return;}
    if(key.indexOf('gsk_')!==0){reject(new Error('Ключ должен начинаться с gsk_'));return;}
    var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){try{if(ctrl)ctrl.abort();}catch(e){}reject(new Error('Таймаут 15с — нет ответа от Groq'));},15000);
    var body={model:MODEL,temperature:0.1,max_tokens:350,messages:[
      {role:'system',content:systemPrompt()},
      {role:'user',content:'STATE:\n'+buildContext()+'\n\nUSER: '+String(userText||'')}
    ]};
    var opts={method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)};
    if(ctrl)opts.signal=ctrl.signal;
    fetch(GROQ_URL,opts).then(function(r){
      return r.text().then(function(txt){
        clearTimeout(timer);
        var j=null;try{j=JSON.parse(txt);}catch(e){throw new Error('API вернул не JSON ('+r.status+')');}
        if(!r.ok){
          var msg=(j&&j.error&&j.error.message)||('Ошибка '+r.status);
          if(r.status===401||/invalid api key/i.test(msg))msg='Неверный или отозванный ключ Groq. Создай новый на console.groq.com и вставь в ⚙';
          if(r.status===429)msg='Лимит запросов Groq. Подожди минуту';
          if(r.status===403)msg='Доступ запрещён Groq (403)';
          throw new Error(msg);
        }
        var content=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        if(!content)throw new Error('Пустой ответ модели');
        resolve(parseAgentJson(content));
      });
    }).catch(function(e){
      clearTimeout(timer);
      if(e&&e.name==='AbortError')reject(new Error('Таймаут'));
      else if(e&&e.message&&e.message.indexOf('Failed to fetch')!==-1)reject(new Error('Нет сети или блокировка запросов к api.groq.com'));
      else reject(e);
    });
  });
}

function testKey(){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Ключ не задан'));return;}
    fetch(GROQ_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify({model:MODEL,max_tokens:5,messages:[{role:'user',content:'ok'}]})
    }).then(function(r){
      return r.json().then(function(j){
        if(!r.ok){
          var msg=(j&&j.error&&j.error.message)||('HTTP '+r.status);
          if(r.status===401)msg='Неверный ключ';
          reject(new Error(msg));
        }else resolve('Ключ работает ✓');
      });
    }).catch(function(e){reject(new Error(e.message||'Нет сети'));});
  });
}

function ask(userText){
  return askAgent(userText).then(function(obj){return obj.mode==='answer'?(obj.text||''):(obj.summary||'');});
}

window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,ask:ask,askAgent:askAgent,testKey:testKey,buildContext:buildContext};
})();
