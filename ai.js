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
    var paid=0;
    (st.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=Number(p.amount||0);});
    obligDue+=Math.max(0,Number(ob.amount||0)-paid);
  });
  var available=cash-debt-obligDue;
  var t=new Date();
  var dayNum=t.getDate();
  var last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  var leftDays=Math.max(1,last-dayNum+1);
  var daily=available>0?Math.floor(available/leftDays):0;

  var res=(st.reserves||[]).map(function(r){
    var saved=Math.round(Number(r.saved||0));
    var target=Math.round(Number(r.target||0));
    var pct=target>0?Math.round(saved/target*100):0;
    return '«'+r.name+'»: '+fmtN(saved)+(target?' из '+fmtN(target)+' ₽ ('+pct+'%)':' ₽');
  }).join('\n')||'нет';

  var debts=(st.debts||[]).map(function(d){
    var left=Math.max(0,Math.round(Number(d.total||0)-Number(d.paid||0)));
    return '«'+d.name+'»: осталось '+fmtN(left)+' из '+fmtN(d.total)+' ₽';
  }).join('\n')||'нет';

  var obligs=(st.obligations||[]).filter(function(o){return o.active!==false;}).map(function(ob){
    var paid=0;
    (st.obligationPays||[]).forEach(function(p){if(p.obligId===ob.id&&p.month===month)paid+=Number(p.amount||0);});
    var left=Math.max(0,Number(ob.amount||0)-paid);
    return '«'+ob.name+'»: '+fmtN(ob.amount)+' ₽ / мес, день '+ob.day+(left<=0?' (оплачено)':' (осталось '+fmtN(left)+')');
  }).join('\n')||'нет';

  var lastExp=(st.expenses||[]).slice(-5).reverse().map(function(e){
    return (e.date||'')+' '+(e.note||e.category||'расход')+' −'+fmtN(e.amount)+' ₽ ['+(e.category||'')+']';
  }).join('\n')||'нет';
  var lastInc=(st.income||[]).slice(-5).reverse().map(function(i){
    return (i.date||'')+' '+(i.note||'доход')+' +'+fmtN(i.amount)+' ₽';
  }).join('\n')||'нет';

  var byCat={};
  (st.expenses||[]).forEach(function(e){
    if(!inMonth(e.date))return;
    var c=e.category||'Прочее';
    byCat[c]=(byCat[c]||0)+Number(e.amount||0);
  });
  var cats=Object.keys(byCat).map(function(k){return{n:k,a:byCat[k]};}).sort(function(a,b){return b.a-a.a;});
  var catStr=cats.slice(0,8).map(function(x){return x.n+': '+fmtN(x.a)+' ₽';}).join(', ')||'нет';

  var dayRate=Number(st.settings&&st.settings.dayRate||0);
  var nightRate=Number(st.settings&&st.settings.nightRate||0);

  return [
    '=== ТЕКУЩИЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ===',
    'Месяц: '+month,
    'Начальный остаток месяца: '+fmtN(open)+' ₽',
    'Касса (наличные с учётом операций): '+fmtN(cash)+' ₽',
    'Доступно (касса − долги − неоплаченные обязательные): '+fmtN(available)+' ₽',
    'Лимит на сегодня (доступно / дней до конца месяца): '+fmtN(daily)+' ₽, осталось дней: '+leftDays,
    'Доходы за месяц: +'+fmtN(inc)+' ₽',
    'Расходы за месяц: −'+fmtN(exp)+' ₽',
    'Вложено в резервы за месяц: −'+fmtN(dep)+' ₽, снято из резервов: +'+fmtN(wd)+' ₽',
    'Ставка день: '+fmtN(dayRate)+' ₽, ночь: '+fmtN(nightRate)+' ₽',
    '',
    'Резервы и цели:',
    res,
    '',
    'Долги:',
    debts,
    '',
    'Обязательные платежи:',
    obligs,
    '',
    'Расходы по категориям (месяц): '+catStr,
    '',
    'Последние расходы:',
    lastExp,
    '',
    'Последние доходы:',
    lastInc
  ].join('\n');
}

function systemPrompt(){
  return [
    'Ты — Копейка, встроенный помощник приложения учёта личных денег «Копейка 3» (PWA).',
    'Отвечай только на русском, коротко и по делу (1–5 предложений), живым языком, без канцелярита.',
    'Используй блок «ТЕКУЩИЕ ДАННЫЕ» как единственный источник цифр. Не выдумывай суммы. Если данных нет — скажи прямо.',
    '',
    '=== КАК УСТРОЕНО ПРИЛОЖЕНИЕ ===',
    'Главный экран: «Сегодня» (лимит на день), «Касса», «Доступно», календарь смен, секции Обязательные / Резервы / Долги / Аналитика / Операции.',
    'Касса = начальный остаток + доходы − расходы − пополнения резервов + снятия из резервов.',
    'Доступно = касса − остаток долгов − неоплаченные обязательные за месяц.',
    'Лимит на день = доступно / число оставшихся дней месяца (если доступно ≤ 0, то 0).',
    'Резервы (цели накопления) живут между месяцами, не обнуляются. Пополнение резерва уменьшает кассу; снятие — увеличивает.',
    'Долги: total/paid. Платёж по долгу = расход категории «Долг».',
    'Обязательные: ежемесячные платежи с днём месяца. Отметка оплаты пишет расход «Обязательные».',
    'Смены: цикл день/день/ночь/ночь/выходной/выходной от якоря 2026-08-17; можно переключить тапом по дню. Зарплата = дни×ставка_день + ночи×ставка_ночь (кнопка «Смены и зарплата»).',
    'Новый месяц: касса прошлого месяца становится openingBalance, резервы и цели сохраняются.',
    'Облако (☁): синхронизация через Supabase, если настроено. Данные также в localStorage.',
    'Настройки ⚙: остаток, ставки смен, ключ Groq (ИИ), отмена действия, очистка данных.',
    '',
    '=== ГОЛОСОВОЕ УПРАВЛЕНИЕ ===',
    'Микрофон над кнопкой «+».',
    'Расход: «сигареты 100», «купил ром сто рублей», «расход 200 продукты».',
    'Доход: «зарплата 4800», «подработка 1500».',
    'Резерв: «резерв подушка», «отложить на отпуск 5000» — мастер цели и суммы.',
    'Долг: «долг 10000 Васе», «погаси долг 500».',
    'Обязательный: «алименты 15000» (день по умолчанию 25).',
    '«Удали последнюю» — удаляет последний доход или расход.',
    '«Измени последнюю на 120» — правит сумму последней операции.',
    'Вопросы: «сколько в кассе», «сколько в подушке», «сколько до цели», «как дела» — ты отвечаешь.',
    'Тумблер «Голос Копейки» включает/выключает озвучку ответов (SpeechSynthesis).',
    'Категории товаров подставляются автоматически из базы (ром→Алкоголь и т.д.); неизвестные — выбор кнопками. Исправления запоминаются (voiceMap).',
    'Кнопка «+»: ручное добавление дохода, расхода, резерва, долга, обязательного.',
    'Виджет: страница widget.html — касса и быстрый голос на рабочий стол.',
    '',
    '=== ПРАВИЛА ОТВЕТОВ ===',
    '1) На вопросы про цифры — считай только из данных.',
    '2) На вопросы «как сделать / где найти / что значит» — объясни логику приложения своими словами.',
    '3) Если просят ДОБАВИТЬ операцию голосом в этом чате — не добавляй сам, подскажи точную фразу для микрофона («скажи: сигареты 100»).',
    '4) Не давай банковских/инвестиционных советов; можно мягко комментировать траты по фактам.',
    '5) Если вопрос не про приложение и не про бюджет — ответь кратко и полезно в роли помощника Копейки.',
    '6) Всегда рубли (₽).'
  ].join('\n');
}

function ask(userText){
  return new Promise(function(resolve,reject){
    var key=getKey();
    if(!key){
      reject(new Error('Нет API-ключа Groq. Добавь в настройках ⚙ → Ключ Groq'));
      return;
    }
    var body={
      model:MODEL,
      temperature:0.4,
      max_tokens:450,
      messages:[
        {role:'system',content:systemPrompt()},
        {role:'user',content:buildContext()+'\n\n=== ВОПРОС ПОЛЬЗОВАТЕЛЯ ===\n'+String(userText||'')}
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
