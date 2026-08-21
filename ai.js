(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key';
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var MODEL='openai/gpt-oss-20b';

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
function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
function monthOf(d){return String(d||'').slice(0,7);}

function exact(st,month){
  st=st||{};
  var s=st.settings||{};
  var open=n(s.openingBalance),inc=0,exp=0,dep=0,wd=0,debt=0,obligDue=0;
  (st.income||[]).forEach(function(x){if(monthOf(x.date)===month)inc+=n(x.amount);});
  (st.expenses||[]).forEach(function(x){if(monthOf(x.date)===month)exp+=n(x.amount);});
  (st.reserveOps||[]).forEach(function(o){
    if(monthOf(o.date)!==month)return;
    var a=n(o.amount);
    if(o.type==='deposit')dep+=a;else wd+=a;
  });
  (st.debts||[]).forEach(function(d){debt+=Math.max(0,n(d.total)-n(d.paid));});
  (st.obligations||[]).forEach(function(ob){
    if(ob.active===false)return;
    var paid=0;
    (st.obligationPays||[]).forEach(function(p){
      if(p.obligId===ob.id&&p.month===month)paid+=n(p.amount);
    });
    obligDue+=Math.max(0,n(ob.amount)-paid);
  });
  var cash=open+inc-exp-dep+wd;
  var available=cash-debt-obligDue;
  var t=new Date();
  var last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  var left=Math.max(1,last-t.getDate()+1);
  var daily=available>0?Math.floor(available/left):0;
  return {
    month:month,cash:cash,available:available,daily:daily,daysLeft:left,
    income:inc,expense:exp,debtTotal:debt,obligDue:obligDue,
    openingBalance:open,dayRate:n(s.dayRate),nightRate:n(s.nightRate)
  };
}

function buildContext(){
  var st=window.STATE||{};
  var month=(st.settings&&st.settings.month)||new Date().toISOString().slice(0,7);
  var calc=exact(st,month);
  var recent=[];
  (st.expenses||[]).slice(-8).forEach(function(e){
    recent.push('расход −'+n(e.amount)+' «'+(e.note||e.category||'')+'»');
  });
  (st.income||[]).slice(-5).forEach(function(i){
    recent.push('доход +'+n(i.amount)+' «'+(i.note||'доход')+'»');
  });
  var debts=(st.debts||[]).map(function(d){
    return '«'+d.name+'»: осталось '+Math.max(0,n(d.total)-n(d.paid))+' из '+n(d.total);
  });
  var reserves=(st.reserves||[]).map(function(r){
    return '«'+r.name+'»: '+n(r.saved)+(r.target?'/'+n(r.target):'');
  });
  var oblig=(st.obligations||[]).filter(function(o){return o.active!==false;}).map(function(o){
    return '«'+o.name+'»: '+n(o.amount)+'/мес день '+n(o.day);
  });
  return [
    'CURRENT STATE (точные цифры):',
    JSON.stringify(calc),
    'Долги в системе: '+(debts.join('; ')||'нет'),
    'Резервы: '+(reserves.join('; ')||'нет'),
    'Обязательные: '+(oblig.join('; ')||'нет'),
    'Недавние операции: '+(recent.join('; ')||'нет'),
    'Имена долгов/резервов/операций бери ТОЧНО из списков выше.'
  ].join('\n');
}

function systemPrompt(){
  return [
    'Ты — Копейка, встроенный финансовый ассистент. Понимаешь ЛЮБЫЕ формулировки на русском, даже сленг и с опечатками.',
    'Отвечай ТОЛЬКО одним JSON-объектом, без markdown и без текста вокруг.',
    '',
    'Форматы ответа:',
    '{"mode":"answer","text":"краткий ответ","summary":null,"actions":[]}',
    '{"mode":"action","text":"что сделаю","summary":"коротко для кнопки","actions":[{"type":"...","amount":123,"name":"...","category":null,"reserve":null,"day":null,"date":null,"shift":null,"target":null}]}',
    '',
    '=== ТИПЫ ДЕЙСТВИЙ ===',
    'add_expense — расход/покупка (купил, потратил, заплатил за товар, расход)',
    'add_income — доход (получил, зарплата, аванс, премия, подработка, доход)',
    'add_debt — НОВЫЙ долг (новый долг, должен, занял у меня)',
    'pay_debt — ПЛАТЁЖ ПО СУЩЕСТВУЮЩЕМУ долгу: уменьшить остаток (дал, отдал, внёс в долг, дал к долгу, погасил часть, заплатил по долгу, кинул на долг, добавь к погашению)',
    'increase_debt — увеличить СУММУ долга (должен ещё, долг вырос, добавь к сумме долга) — НЕ путать с pay_debt',
    'reserve_deposit — положить в резерв (в резерв, отложи, накопи, пополни резерв, внеси в подушку)',
    'reserve_withdraw — снять с резерва',
    'add_obligation — обязательный платёж каждый месяц',
    'delete_debt — удалить долг по имени',
    'delete_income — удалить доход по названию/комментарию',
    'delete_expense — удалить расход по названию',
    'delete_reserve — удалить резерв',
    'delete_obligation — удалить обязательный',
    'delete_last — удалить последнюю операцию (target: expense|income|debt|any)',
    'change_last — изменить сумму последней операции',
    'set_opening_balance — выставить начальный остаток/кассу',
    '',
    '=== ПРИМЕРЫ ПОНИМАНИЯ ===',
    '«дай к долгу папе 189» / «дать к долгу папе 189 рублей» / «внеси в долг папа 189» / «отдал папе 189» → pay_debt amount=189 name="папа" (или точное имя из списка Долги)',
    '«добавь долг папе 5000» / «новый долг папа 5000» → add_debt amount=5000 name="папа"',
    '«долг папе ещё плюс 500» / «увеличь долг папа на 500» → increase_debt amount=500 name="папа"',
    '«в резерв подушка 1000» / «отложи 1000 на подушку» → reserve_deposit amount=1000 reserve="Подушка безопасности" (или как в списке)',
    '«купил сигареты 100» / «сигареты сто» / «расход 100 сигареты» → add_expense amount=100 name="сигареты" category="Сигареты"',
    '«зарплата 4800» / «получил 4800» → add_income amount=4800 name="зарплата"',
    '«удали долг папа» / «убери долг папе» → delete_debt name="папа"',
    '«удали расход сигареты» / «удали сигареты» (если это была операция) → delete_expense name="сигареты"',
    '«удали доход зарплата» → delete_income name="зарплата"',
    '«удали последнюю» → delete_last target="any"',
    '«сколько в кассе» / «что с долгами» → mode answer',
    '',
    '=== ЖЁСТКИЕ ПРАВИЛА ===',
    '1) «дать/внести/отдать/кинуть К долгу / ПО долгу / НА долг» = pay_debt, НЕ add_expense и НЕ add_debt.',
    '2) Имя долга/резерва ищи в CURRENT STATE (списки Долги и Резервы). Бери ближайшее совпадение (папа ≈ Папа ≈ папе).',
    '3) «удали X» — смотри, что такое X: долг → delete_debt, доход → delete_income, расход → delete_expense. Не путай.',
    '4) amount всегда число в рублях без текста.',
    '5) Не выдумывай суммы и имена — только из STATE или из фразы пользователя.',
    '6) Категории расходов: Продукты, Алкоголь, Сигареты, Хозтовары, Бытовая химия, Кафе, Связь, Проезд, Жильё, Здоровье, Красота, Одежда, Развлечения, Подписки, Техника, Дети, Животные, Прочее.',
    '7) Перед сомнением лучше mode answer с уточнением, чем неверное действие.',
    '8) Коротко, по-русски, по делу.'
  ].join('\n');
}

function parse(raw){
  var t=String(raw||'').trim();
  t=t.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  var a=t.indexOf('{'),b=t.lastIndexOf('}');
  if(a>=0&&b>a)t=t.slice(a,b+1);
  var o=JSON.parse(t);
  if(!o||typeof o!=='object')throw new Error('Модель вернула неверный ответ');
  if(o.mode!=='answer'&&o.mode!=='action'){
    if(typeof o.text==='string')o.mode='answer';
    else if(Array.isArray(o.actions))o.mode='action';
    else throw new Error('Неизвестный формат ответа');
  }
  if(!Array.isArray(o.actions))o.actions=[];
  return o;
}

function askConversation(history,userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){reject(new Error('Нет ключа Groq. Открой ⚙ → Ключ Groq.'));return;}
    if(key.indexOf('gsk_')!==0){reject(new Error('Ключ должен начинаться с gsk_'));return;}
    var messages=[{role:'system',content:systemPrompt()+'\n\n'+buildContext()}];
    (history||[]).slice(-12).forEach(function(m){
      messages.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')});
    });
    messages.push({role:'user',content:String(userText||'')});
    var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){
      try{if(ctrl)ctrl.abort();}catch(e){}
      reject(new Error('Groq не ответил за 20 секунд'));
    },20000);
    var body={model:MODEL,temperature:0.05,max_tokens:900,messages:messages};
    var opts={method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)};
    if(ctrl)opts.signal=ctrl.signal;
    fetch(GROQ_URL,opts).then(function(r){
      return r.text().then(function(txt){
        clearTimeout(timer);
        var j;
        try{j=JSON.parse(txt);}catch(e){throw new Error('Groq вернул не JSON ('+r.status+')');}
        if(!r.ok){
          var msg=(j&&j.error&&j.error.message)||('HTTP '+r.status);
          if(r.status===401)msg='Неверный ключ Groq';
          if(r.status===429)msg='Лимит Groq, подожди минуту';
          throw new Error(msg);
        }
        var c=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;
        if(!c)throw new Error('Пустой ответ Groq');
        resolve(parse(c));
      });
    }).catch(function(e){
      clearTimeout(timer);
      if(e&&e.name==='AbortError')reject(new Error('Таймаут'));
      else if(e&&e.message&&String(e.message).indexOf('Failed to fetch')!==-1)
        reject(new Error('Нет сети или блокировка api.groq.com'));
      else reject(e);
    });
  });
}

function askAgent(text){return askConversation([],text);}
function ask(text){
  return askAgent(text).then(function(o){
    return o.mode==='answer'?(o.text||''):(o.summary||o.text||'');
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

window.kopeykaAI={
  getKey:getKey,setKey:setKey,hasKey:hasKey,
  ask:ask,askAgent:askAgent,askConversation:askConversation,
  testKey:testKey,buildContext:buildContext
};
})();
