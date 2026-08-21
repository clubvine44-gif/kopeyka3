(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='llama-3.1-8b-instant';

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
    return r.name+' saved='+Math.round(Number(r.saved||0))+' target='+Math.round(Number(r.target||0));
  }).join('; ')||'нет';
  var debts=(st.debts||[]).map(function(d){
    return d.name+' left='+Math.max(0,Math.round(Number(d.total||0)-Number(d.paid||0)));
  }).join('; ')||'нет';
  var recent=[];
  (st.expenses||[]).slice(-3).forEach(function(e){recent.push((e.note||e.category)+' -'+Math.round(e.amount));});
  (st.income||[]).slice(-2).forEach(function(i){recent.push((i.note||'доход')+' +'+Math.round(i.amount));});
  return [
    'месяц='+month,
    'касса='+Math.round(cash),
    'доступно='+Math.round(available),
    'лимит_на_день='+daily,
    'дней_осталось='+leftDays,
    'доходы_месяц='+Math.round(inc),
    'расходы_месяц='+Math.round(exp),
    'резервы: '+res,
    'долги: '+debts,
    'недавние: '+(recent.join(', ')||'нет')
  ].join('\n');
}

function systemPrompt(){
  return [
    'Ты голосовой управляющий приложения Копейка (учёт денег). Ответь ТОЛЬКО JSON без markdown.',
    'Вариант 1 — ответ: {"mode":"answer","text":"текст на русском"}',
    'Вариант 2 — действие: {"mode":"action","summary":"кратко что сделать","actions":[...]}',
    'actions types:',
    'add_expense: amount, note, category (Продукты|Алкоголь|Сигареты|Хозтовары|Бытовая химия|Кафе|Связь|Проезд|Жильё|Здоровье|Красота|Одежда|Развлечения|Подписки|Техника|Дети|Животные|Прочее)',
    'add_income: amount, note',
    'add_reserve: name, target, deposit',
    'reserve_deposit: name, amount',
    'reserve_withdraw: name, amount',
    'add_debt: name, amount',
    'pay_debt: name, amount',
    'add_obligation: name, amount, day',
    'delete_last',
    'change_last: amount',
    'Суммы — числа. сто тысяч=100000. Не выдумывай цифры из STATE.',
    'На вопросы про цифры/как работает — mode answer.'
  ].join('\n');
}

function parseAgentJson(raw){
  var t=String(raw||'').trim();
  t=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var a=t.indexOf('{'), b=t.lastIndexOf('}');
  if(a>=0&&b>a)t=t.slice(a,b+1);
  var obj=JSON.parse(t);
  if(!obj||typeof obj!=='object')throw new Error('bad json');
  if(obj.mode!=='answer'&&obj.mode!=='action'){
    if(typeof obj.text==='string')obj.mode='answer';
    else if(Array.isArray(obj.actions))obj.mode='action';
    else if(obj.type){obj.mode='action';obj.actions=[obj];obj.summary=obj.summary||obj.type;}
    else throw new Error('unknown mode');
  }
  if(obj.mode==='action'&&!Array.isArray(obj.actions))obj.actions=[];
  return obj;
}

function askAgent(userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Нет ключа Groq в настройках'));return;}
    var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){try{if(ctrl)ctrl.abort();}catch(e){}reject(new Error('Таймаут ИИ (15с)'));},15000);
    var body={
      model:MODEL,
      temperature:0.15,
      max_tokens:400,
      messages:[
        {role:'system',content:systemPrompt()},
        {role:'user',content:'STATE:\n'+buildContext()+'\n\nUSER: '+String(userText||'')}
      ]
    };
    var opts={
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body:JSON.stringify(body)
    };
    if(ctrl)opts.signal=ctrl.signal;
    fetch(GROQ_URL,opts).then(function(r){
      return r.text().then(function(txt){
        clearTimeout(timer);
        var j=null;
        try{j=JSON.parse(txt);}catch(e){throw new Error('Ответ API не JSON');}
        if(!r.ok){
          var msg=(j&&j.error&&j.error.message)||('HTTP '+r.status);
          if(r.status===401)msg='Неверный ключ Groq — обнови в ⚙';
          if(r.status===429)msg='Лимит Groq, подожди минуту';
          throw new Error(msg);
        }
        var content=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        if(!content)throw new Error('Пустой ответ модели');
        resolve(parseAgentJson(content));
      });
    }).catch(function(e){
      clearTimeout(timer);
      if(e&&e.name==='AbortError')reject(new Error('Таймаут ИИ'));
      else reject(e);
    });
  });
}

function ask(userText){
  return askAgent(userText).then(function(obj){
    if(obj.mode==='answer')return obj.text||'';
    return obj.summary||'Готово';
  });
}

window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,ask:ask,askAgent:askAgent,buildContext:buildContext};
})();
