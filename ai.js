(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='llama-3.1-8b-instant';

function getKey(){try{return (localStorage.getItem(GROQ_KEY)||'').trim();}catch(e){return '';}}
function setKey(k){try{k=String(k||'').trim();if(k)localStorage.setItem(GROQ_KEY,k);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
function hasKey(){return !!getKey();}
function fmtN(n){return Math.round(+n||0).toLocaleString('ru-RU');}

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
  var obligDue=0;
  (st.obligations||[]).forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;(st.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=Number(p.amount||0);});
    obligDue+=Math.max(0,Number(ob.amount||0)-paid);
  });
  var available=cash-debt-obligDue;
  var t=new Date(),dayNum=t.getDate(),last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  var leftDays=Math.max(1,last-dayNum+1),daily=available>0?Math.floor(available/leftDays):0;
  var res=(st.reserves||[]).map(function(r){
    return r.name+'|saved:'+Math.round(Number(r.saved||0))+'|target:'+Math.round(Number(r.target||0));
  }).join('; ')||'нет';
  var debts=(st.debts||[]).map(function(d){
    return d.name+'|left:'+Math.max(0,Math.round(Number(d.total||0)-Number(d.paid||0)))+'|total:'+Math.round(Number(d.total||0));
  }).join('; ')||'нет';
  var obligs=(st.obligations||[]).filter(function(o){return o.active!==false;}).map(function(ob){
    return ob.name+'|amount:'+Math.round(Number(ob.amount||0))+'|day:'+ob.day;
  }).join('; ')||'нет';
  var lastOps=[];
  (st.expenses||[]).slice(-3).forEach(function(e){lastOps.push('ex:'+(e.note||e.category)+' -'+Math.round(e.amount));});
  (st.income||[]).slice(-2).forEach(function(i){lastOps.push('in:'+(i.note||'доход')+' +'+Math.round(i.amount));});
  return [
    'month='+month,
    'cash='+Math.round(cash),
    'available='+Math.round(available),
    'daily='+daily,
    'daysLeft='+leftDays,
    'incomeMonth='+Math.round(inc),
    'expenseMonth='+Math.round(exp),
    'reserves=['+res+']',
    'debts=['+debts+']',
    'obligations=['+obligs+']',
    'recent=['+lastOps.join(', ')+']',
    'dayRate='+Math.round(Number(st.settings&&st.settings.dayRate||0)),
    'nightRate='+Math.round(Number(st.settings&&st.settings.nightRate||0))
  ].join('\n');
}

function systemPrompt(){
  return [
    'Ты — Копейка, полный голосовой управляющий приложением учёта денег.',
    'Пользователь говорит по-русски как угодно. Твоя задача: понять намерение и ответить СТРОГО одним JSON-объектом без markdown и без текста вокруг.',
    '',
    'Форматы ответа (выбери один):',
    '1) Только информация: {"mode":"answer","text":"краткий ответ на русском"}',
    '2) Действие(я): {"mode":"action","summary":"что будет сделано","actions":[...]}',
    'Можно несколько actions в массиве.',
    '',
    'Типы actions:',
    '{"type":"add_expense","amount":100,"note":"сигареты","category":"Сигареты"}',
    '{"type":"add_income","amount":5000,"note":"Зарплата"}',
    '{"type":"add_reserve","name":"Подушка безопасности","target":100000,"deposit":5000}',
    '{"type":"reserve_deposit","name":"Подушка безопасности","amount":1000}',
    '{"type":"reserve_withdraw","name":"Подушка безопасности","amount":500}',
    '{"type":"add_debt","name":"Вася","amount":10000}',
    '{"type":"pay_debt","name":"Вася","amount":500}',
    '{"type":"add_obligation","name":"Алименты","amount":15000,"day":25}',
    '{"type":"delete_last"}',
    '{"type":"change_last","amount":120}',
    '',
    'Категории расходов (выбери ближайшую): Продукты, Алкоголь, Сигареты, Хозтовары, Бытовая химия, Кафе, Связь, Проезд, Жильё, Здоровье, Красота, Одежда, Развлечения, Подписки, Техника, Дети, Животные, Обязательные, Долг, Прочее.',
    'Если товар знаком (ром→Алкоголь, сигареты→Сигареты, зубочистка→Хозтовары) — ставь правильную category.',
    'amount всегда число в рублях. «сто тысяч»=100000, «полторы тысячи»=1500.',
    'Если неясна сумма для операции — mode answer, спроси сумму.',
    'Если спрашивают цифры/как работает приложение — mode answer, опираясь на STATE.',
    'Не выдумывай суммы. STATE ниже — единственный источник цифр.',
    'summary — короткая фраза для экрана подтверждения на русском.'
  ].join('\n');
}

function parseAgentJson(raw){
  var t=String(raw||'').trim();
  t=t.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/,'').trim();
  var start=t.indexOf('{'), end=t.lastIndexOf('}');
  if(start>=0&&end>start)t=t.slice(start,end+1);
  var obj=JSON.parse(t);
  if(!obj||typeof obj!=='object')throw new Error('Неверный ответ ИИ');
  if(obj.mode!=='answer'&&obj.mode!=='action'){
    if(obj.text)obj.mode='answer';
    else if(obj.actions)obj.mode='action';
    else throw new Error('Непонятный ответ ИИ');
  }
  return obj;
}

function askAgent(userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Нет ключа Groq'));return;}
    var body={
      model:MODEL,
      temperature:0.2,
      max_tokens:500,
      response_format:{type:'json_object'},
      messages:[
        {role:'system',content:systemPrompt()},
        {role:'user',content:'STATE:\n'+buildContext()+'\n\nUSER:\n'+String(userText||'')}
      ]
    };
    fetch(GROQ_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(j){
        if(!r.ok)throw new Error((j&&j.error&&j.error.message)||('HTTP '+r.status));
        var txt=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        if(!txt)throw new Error('Пустой ответ');
        resolve(parseAgentJson(txt));
      });
    }).catch(reject);
  });
}

function ask(userText){
  return askAgent(userText).then(function(obj){
    if(obj.mode==='answer')return obj.text||'';
    return obj.summary||'Готово к выполнению';
  });
}

window.kopeykaAI={
  getKey:getKey,
  setKey:setKey,
  hasKey:hasKey,
  ask:ask,
  askAgent:askAgent,
  buildContext:buildContext
};
})();
