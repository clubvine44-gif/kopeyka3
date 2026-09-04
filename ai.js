(function(){
'use strict';
var GROQ_KEY='kopeyka_groq_key',GROQ_URL='https://api.groq.com/openai/v1/chat/completions',MODEL_KEY='finna_groq_model';
var MODEL_CATALOG=[
  // quality: выше = умнее/лучше для задач; auto выбирает среди available по quality, затем по скорости
  {id:'openai/gpt-oss-120b', title:'Умная', sub:'GPT-OSS 120B · глубже думает', quality:100},
  {id:'llama-3.3-70b-versatile', title:'Универсал', sub:'Llama 3.3 70B · баланс качества', quality:85},
  {id:'qwen/qwen3-32b', title:'Альтернатива', sub:'Qwen 3 32B · другой стиль', quality:75},
  {id:'openai/gpt-oss-20b', title:'Быстрая', sub:'GPT-OSS 20B · мгновенные ответы', quality:55},
  {id:'llama-3.1-8b-instant', title:'Молния', sub:'Llama 3.1 8B · самая быстрая', quality:40}
];
var MODELS=MODEL_CATALOG.map(function(m){return m.id;});
var MODEL='openai/gpt-oss-120b';
var _aiLastCall=0,_aiBackoffUntil=0,_aiMinGap=900,_aiInflight=null,_aiModelIdx=0;
function getModel(){
  try{
    var saved=(localStorage.getItem(MODEL_KEY)||'').trim();
    if(saved&&MODELS.indexOf(saved)>=0)return saved;
  }catch(e){}
  return MODEL;
}
function setModel(id, opts){
  id=String(id||'').trim();
  if(MODELS.indexOf(id)<0)id=MODEL;
  try{localStorage.setItem(MODEL_KEY,id);}catch(e){}
  _aiModelIdx=Math.max(0,MODELS.indexOf(id));
  opts=opts||{};
  if(opts.manual){setManualModelLock(true);setAutoModelEnabled(true);} // manual pick, но авто вернётся если модель умрёт
  try{if(typeof window.__finnaModelChanged==='function')window.__finnaModelChanged(id);}catch(e){}
  return id;
}
function modelMeta(id){
  id=id||getModel();
  for(var i=0;i<MODEL_CATALOG.length;i++)if(MODEL_CATALOG[i].id===id)return MODEL_CATALOG[i];
  return MODEL_CATALOG[0];
}
function listModels(){return MODEL_CATALOG.slice();}
var _modelStatusCache={}; // id -> {level,label,ms,at}
function getModelStatus(id){
  id=id||getModel();
  var c=_modelStatusCache[id];
  if(c&&Date.now()-c.at<120000)return c;
  return c||{level:'unknown',label:'проверка…',ms:null,at:0};
}
function probeModelStatuses(force){
  if(!navigator.onLine){
    MODEL_CATALOG.forEach(function(m){_modelStatusCache[m.id]={level:'offline',label:'нет сети',ms:null,at:Date.now()};});
    return Promise.resolve(_modelStatusCache);
  }
  var key=getKey();
  if(!key){
    MODEL_CATALOG.forEach(function(m){_modelStatusCache[m.id]={level:'nokey',label:'нет ключа',ms:null,at:Date.now()};});
    return Promise.resolve(_modelStatusCache);
  }
  var need=force||MODEL_CATALOG.some(function(m){var c=_modelStatusCache[m.id];return !c||Date.now()-c.at>90000;});
  if(!need)return Promise.resolve(_modelStatusCache);
  var t0=Date.now();
  return fetch('https://api.groq.com/openai/v1/models',{headers:{'Authorization':'Bearer '+key}}).then(function(r){
    return r.json().then(function(data){
      var ms=Date.now()-t0;
      var ids={};
      try{(data.data||[]).forEach(function(x){if(x&&x.id)ids[x.id]=true;});}catch(e){}
      var apiOk=r.ok&&Object.keys(ids).length>0;
      MODEL_CATALOG.forEach(function(m){
        var available=apiOk?(ids[m.id]!==undefined):false;
        var level,label;
        if(!apiOk){
          if(r.status===401){level='nokey';label='ключ неверный';}
          else if(r.status===429){level='busy';label='лимит API';}
          else{level='bad';label='нет связи';}
        }else if(!available){
          level='missing';label='недоступна';
        }else if(ms<350){level='excellent';label='отличное · '+ms+' мс';}
        else if(ms<900){level='good';label='хорошее · '+ms+' мс';}
        else if(ms<2000){level='ok';label='среднее · '+ms+' мс';}
        else{level='slow';label='медленное · '+ms+' мс';}
        _modelStatusCache[m.id]={level:level,label:label,ms:ms,at:Date.now(),available:available};
      });
      return _modelStatusCache;
    });
  }).catch(function(){
    MODEL_CATALOG.forEach(function(m){_modelStatusCache[m.id]={level:'bad',label:'нет связи',ms:null,at:Date.now()};});
    return _modelStatusCache;
  });
}

var MODEL_AUTO_KEY='finna_model_auto';
var MODEL_MANUAL_KEY='finna_model_manual'; // если true — пользователь выбрал вручную, авто не трогает пока модель жива
function isAutoModelEnabled(){
  try{
    var v=localStorage.getItem(MODEL_AUTO_KEY);
    if(v===null||v===undefined||v==='')return true; // по умолчанию авто
    return v==='1'||v==='true';
  }catch(e){return true;}
}
function setAutoModelEnabled(on){
  try{localStorage.setItem(MODEL_AUTO_KEY, on?'1':'0');}catch(e){}
}
function isManualModelLock(){
  try{return localStorage.getItem(MODEL_MANUAL_KEY)==='1';}catch(e){return false;}
}
function setManualModelLock(on){
  try{if(on)localStorage.setItem(MODEL_MANUAL_KEY,'1');else localStorage.removeItem(MODEL_MANUAL_KEY);}catch(e){}
}

function levelScore(level){
  return ({excellent:50,good:40,ok:25,slow:10,unknown:5,busy:2,missing:0,bad:0,offline:0,nokey:0})[level]||0;
}

/** Лучшая доступная модель: умнее (quality) + живое соединение */
function pickBestModel(excludeId){
  var best=null, bestScore=-1;
  for(var i=0;i<MODEL_CATALOG.length;i++){
    var m=MODEL_CATALOG[i];
    if(excludeId&&m.id===excludeId)continue;
    var st=_modelStatusCache[m.id]||{};
    if(st.available===false)continue;
    if(st.level==='missing'||st.level==='bad'||st.level==='offline'||st.level==='nokey')continue;
    // если статусов ещё нет — считаем кандидата
    var q=typeof m.quality==='number'?m.quality:50;
    var ls=levelScore(st.level);
    var score=q*10+ls;
    if(st.ms!=null&&st.ms>0)score+=Math.max(0,20-Math.floor(st.ms/100));
    if(score>bestScore){bestScore=score;best=m.id;}
  }
  // если probe ещё не знает available — fallback по quality
  if(!best){
    var ordered=MODEL_CATALOG.slice().sort(function(a,b){return (b.quality||0)-(a.quality||0);});
    for(var j=0;j<ordered.length;j++){
      if(excludeId&&ordered[j].id===excludeId)continue;
      return ordered[j].id;
    }
  }
  return best||MODEL;
}

/**
 * Автовыбор лучшей рабочей модели.
 * force=true — игнорировать manual lock (например после ошибки API).
 * return Promise<string|null> id если сменили, null если оставили
 */
function autoSelectBestModel(force){
  force=!!force;
  if(!isAutoModelEnabled()&&!force)return Promise.resolve(null);
  return probeModelStatuses(false).then(function(){
    var cur=getModel();
    var st=_modelStatusCache[cur]||{};
    var curDead=st.available===false||st.level==='missing'||st.level==='bad'||st.level==='offline'||st.level==='nokey'||st.level==='busy';
    // ручной выбор держим, пока модель жива
    if(isManualModelLock()&&!force&&!curDead)return null;
    var best=pickBestModel(curDead?cur:null);
    if(!best)return null;
    // если текущая жива и почти лучшая — не дёргаем
    if(!curDead&&best===cur)return null;
    if(!curDead&&!force){
      var curMeta=modelMeta(cur), bestMeta=modelMeta(best);
      var cq=(curMeta&&curMeta.quality)||0, bq=(bestMeta&&bestMeta.quality)||0;
      // не переключаем на чуть лучше без force
      if(bq-cq<15&&levelScore(st.level)>=levelScore((_modelStatusCache[best]||{}).level))return null;
    }
    var prev=cur;
    setManualModelLock(false);
    setModel(best);
    try{
      if(prev!==best&&typeof window.toast==='function'){
        var meta=modelMeta(best);
        window.toast('Модель: '+(meta.title||best)+(force?' (авто)':''));
      }
    }catch(e){}
    return best;
  }).catch(function(){return null;});
}

function getKey(){
  try{
    var k=(localStorage.getItem(GROQ_KEY)||'').trim();
    if(k)return k;
  }catch(e){}
  // Native bridge may inject key (never ship secrets in client bundle)
  try{
    if(window.FinBridge&&typeof window.FinBridge.getGroqKey==='function'){
      var bk=String(window.FinBridge.getGroqKey()||'').trim();
      if(bk)return bk;
    }
  }catch(e){}
  try{
    var envK=(window.__FIN_GROQ_KEY||'').trim();
    if(envK)return envK;
  }catch(e){}
  return '';
}

function setKey(key){try{key=String(key||'').trim();if(key)localStorage.setItem(GROQ_KEY,key);else localStorage.removeItem(GROQ_KEY);}catch(e){}}
function hasKey(){return !!getKey();}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();}
function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
function fmt(v){return n(v).toLocaleString('ru-RU')+' ₽';}
function getContext(){
  try{
    var obj={};
    try{
      if(window.kopeykaEngine&&typeof window.kopeykaEngine.snapshot==='function')obj=window.kopeykaEngine.snapshot()||{};
      else obj={state:window.STATE||{}};
    }catch(e){obj={};}
    try{
      if(typeof window.compute==='function'){
        var c=window.compute();
        obj.ui={
          available:c.available,
          dailyLimit:c.daily,
          daysLeft:c.daysLeft,
          horizon:c.horizon,
          horizonLabel:c.horizonLabel,
          cash:c.cash,
          debtLeft:c.debtLeft,
          obligDue:c.obligDue,
          hasPayday:!!c.hasPayday
        };
      }
    }catch(e){}
    try{
      var st=(window.STATE&&window.STATE.settings)||{};
      obj.ui=obj.ui||{};
      obj.ui.limitHorizon=st.limitHorizon||obj.ui.horizon;
      obj.ui.paydayDay=st.paydayDay;
      obj.ui.shiftNotifEnabled=st.shiftNotifEnabled!==false;
      obj.ui.manualDailyLimit=st.manualDailyLimit;
      var un='';
      try{if(typeof window.getUserName==='function')un=window.getUserName()||'';}catch(e){}
      if(!un)un=st.userName||'';
      obj.userName=un||'';
      obj.ui.userName=un||'';
    }catch(e){}
    return JSON.stringify(obj);
  }catch(e){return '{}';}
}
function parseResponse(raw){
  var text=String(raw||'').trim();
  if(!text) throw new Error('Пустой ответ ИИ');
  var cleaned=text.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'');
  var start=cleaned.indexOf('{'), end=cleaned.lastIndexOf('}');
  if(start>=0&&end>start){
    try{
      var result=JSON.parse(cleaned.slice(start,end+1));
      if(result&&typeof result==='object'){
        if(!Array.isArray(result.actions)) result.actions=[];
        if(!result.mode) result.mode=(result.actions&&result.actions.length)?'action':'answer';
        if(result.mode==='answer'&&!result.text) result.text=result.summary||cleaned;
        return result;
      }
    }catch(e){ /* fall through */ }
  }
  // Plain text answer — still success
  return {mode:'answer', text:text.replace(/^["«]+|["»]+$/g,'').trim(), summary:null, actions:[]};
}
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
    return{mode:'answer',text:list?'Не нашёл долг «'+(name||'')+'». Есть: '+list+'.':'В Финне нет долгов.',summary:null,actions:[]};
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

  if(/(выключи|отключи).{0,16}уведомл/.test(t))return{mode:'action',text:null,summary:'Выключить напоминания о сменах',actions:[{type:'set_shift_notif',enabled:false}]};
  if(/(включи).{0,16}уведомл/.test(t))return{mode:'action',text:null,summary:'Включить напоминания о сменах',actions:[{type:'set_shift_notif',enabled:true}]};
  if(/(лимит|трат).{0,30}до\s+зарплат/.test(t))return{mode:'action',text:null,summary:'Лимит до зарплаты',actions:[{type:'set_limit_horizon',horizon:'payday'}]};
  if(/(лимит|трат).{0,30}до\s+конца\s+месяц/.test(t))return{mode:'action',text:null,summary:'Лимит до конца месяца',actions:[{type:'set_limit_horizon',horizon:'month'}]};


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

  // Удалить последнюю операцию (не «весь доход»!)
  if(/(удали|удалить|убери|отмени|отменить)\s+(последн\w*|посл\w*)(\s+(операц\w*|запис\w*|действие|расход|доход))?/.test(t)
     || /отмени\s+последн/.test(t)){
    return{mode:'action',text:null,summary:'Удалить последнюю операцию',actions:[{type:'delete_last'}]};
  }

  // Добавить долг: «долг папе 189», «добавь долг 189 папе»
  m=t.match(/(?:добавь|добавить|новый|создай|создать)?\s*долг\s+(?:на\s+)?(.+?)\s+(\d[\d\s]*(?:[.,]\d+)?)\s*$/);
  if(!m)m=t.match(/(?:добавь|добавить|новый)?\s*долг\s+(\d[\d\s]*(?:[.,]\d+)?)\s+(.+)$/);
  if(m&&/долг/.test(t)&&!/удал|погас|плат|заплат|дай|отдал/.test(t)){
    var dName,dAmt;
    if(m.length>=3&&/^\d/.test(String(m[1]).replace(/\s/g,''))){dAmt=n(String(m[1]).replace(/\s/g,'').replace(',','.'));dName=String(m[2]||'').trim();}
    else{dName=String(m[1]||'').trim();dAmt=n(String(m[2]||'').replace(/\s/g,'').replace(',','.'));}
    dName=dName.replace(/^(на|в|по)\s+/,'').trim();
    if(dAmt>0&&dName)return{mode:'action',text:null,summary:'Новый долг «'+dName+'»: '+fmt(dAmt),actions:[{type:'add_debt',name:dName,amount:dAmt}]};
    if(dAmt>0)return{mode:'action',text:null,summary:'Новый долг: '+fmt(dAmt),actions:[{type:'add_debt',name:'Долг',amount:dAmt}]};
  }

  return null;
}
function askConversation(history,userText){
  var local=localIntent(userText);
  if(local)return Promise.resolve(local);
  return new Promise(function(resolve,reject){
    var now=Date.now();
    if(now<_aiBackoffUntil){
      var sec=Math.ceil((_aiBackoffUntil-now)/1000);
      reject(new Error('Слишком много запросов к ИИ. Подожди '+sec+' сек и повтори.'));
      return;
    }
    var key=getKey();
    if(!key){reject(new Error('Нет ключа Groq. Открой настройки Финны и укажи ключ Groq.'));return;}
    var wait=Math.max(0,_aiMinGap-(now-_aiLastCall));
    function runCall(){
    _aiLastCall=Date.now();
    var debtNames=debts().map(function(d){return d.name;}).join(', ')||'нет';
    var profileCtx='';
    try{if(window.FinnaProfile&&window.FinnaProfile.contextForAI){var pc=window.FinnaProfile.contextForAI();profileCtx=pc.summary+' Фокус: '+(pc.focus||'')+'. Режим: '+pc.mode+'.';}}catch(e){}
    var system=[
      'Контекст сценария пользователя: '+profileCtx,
      'Тебя зовут Финна (не Финн и не Фина). Ты дружелюбный ассистент приложения Финна.',
      'Отвечай только по-русски, коротко и по делу.',
      'Если в КОНТЕКСТЕ есть userName — иногда обращайся к человеку по имени (не в каждом предложении, естественно, по-дружески).',
      'Можешь менять имя: пользователь сказал «зови меня X» → action {"type":"set_user_name","name":"X"}.',

      'Ты можешь отвечать на ЛЮБЫЕ вопросы пользователя: финансы, общие знания, быт, шутки — без отказов «я только про деньги».',
      'Если вопрос не про финансы — просто ответь как умный помощник в mode answer.',
      'Долги сейчас: '+debtNames+'.',
      'Ты Финна — дружелюбная помощница (женский род: «я посчитала», «готово»). Когда нужно изменить данные Финны — mode action с actions. Каждый action ОБЯЗАН иметь type.',
      'Пример: {"type":"delete_debt","name":"Ёжик"} или {"type":"pay_debt","name":"Ёжик","amount":189}.',
      '«Удали последнюю операцию» / «отмени последнее» → ТОЛЬКО {"type":"delete_last"}. НИКОГДА не delete_income и не удаляй все доходы.',
      '«Добавь долг X на N» → add_debt с name и amount. Не путай с pay_debt.',
      'Бери точные имена из списка долгов/резервов. Никогда не удаляй доход вместо долга.',
      'Если вопрос не требует изменения данных — можно ответить обычным текстом. Если меняешь данные Финны — JSON. Формат JSON: {"mode":"answer","text":"...","summary":null,"actions":[]} или {"mode":"action","text":null,"summary":"...","actions":[{"type":"..."}]}.',
      'type: add_expense, add_income, add_debt, pay_debt, increase_debt, reserve_deposit, reserve_withdraw, add_obligation, delete_debt, delete_income, delete_expense, delete_reserve, delete_obligation, delete_last, change_last, set_opening_balance, set_day_rate, set_night_rate, set_limit_horizon (horizon: payday|month), set_shift_notif (enabled: true|false), set_daily_limit (amount или null для авто), set_payday_day (day 1-31 или null), set_user_name (name), change_shift. Для смен: date YYYY-MM-DD, shift day|night|off. Учитывай ui.horizonLabel и ui.dailyLimit из КОНТЕКСТА — лимит и «дней осталось» зависят от выбора пользователя (до зарплаты / до конца месяца). Если просят календарь — ответь текстом кратко.',
      'На вопрос «как тебя зовут» отвечай: «Меня зовут Финна».'
    ].join('\n');
    var messages=[{role:'system',content:system+'\n\nКОНТЕКСТ:\n'+getContext()}];
    (history||[]).slice(-12).forEach(function(item){messages.push({role:item.role==='assistant'?'assistant':'user',content:String(item.content||'')});});
    messages.push({role:'user',content:String(userText||'')});
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){try{if(controller)controller.abort();}catch(e){}reject(new Error('Groq не ответил за 20 секунд'));},20000);
    fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:getModel(),temperature:0.25,max_completion_tokens:600,messages:messages}),signal:controller?controller.signal:undefined}).then(function(response){
      return response.text().then(function(body){
        clearTimeout(timer);
        var data;try{data=JSON.parse(body);}catch(e){throw new Error('Groq вернул некорректный ответ ('+response.status+')');}
        if(!response.ok){
          var message=data&&data.error&&data.error.message?data.error.message:('HTTP '+response.status);
          if(response.status===401)message='Неверный ключ Groq';
          if(response.status===429||response.status===503||/model/i.test(message)){
            var cur=getModel();
            var next=pickBestModel(cur);
            if(next&&next!==cur){setManualModelLock(false);setModel(next);}
            _aiBackoffUntil=Date.now()+(response.status===429?12000:4000);
            message=(response.status===429?'ИИ перегружен':'Модель недоступна')+'.'+(next&&next!==cur?' Переключил на лучшую доступную.':' Подожди немного.');
          }
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
    } // end runCall
    if(wait>0)setTimeout(runCall,wait);else runCall();
  });
}
function askAgent(text){return askConversation([],text);}
function ask(text){return askAgent(text).then(function(result){return result.mode==='answer'?(result.text||''):(result.summary||result.text||'');});}
function testKey(){return askAgent('Ответь одним словом: готово').then(function(){return 'Ключ работает ✓';});}
window.kopeykaAI={getKey:getKey,setKey:setKey,hasKey:hasKey,getModel:getModel,setModel:setModel,listModels:listModels,modelMeta:modelMeta,getModelStatus:getModelStatus,probeModelStatuses:probeModelStatuses,autoSelectBestModel:autoSelectBestModel,pickBestModel:pickBestModel,isAutoModelEnabled:isAutoModelEnabled,setAutoModelEnabled:setAutoModelEnabled,ask:ask,askAgent:askAgent,askConversation:askConversation,testKey:testKey,buildContext:getContext,isCoolingDown:function(){return Date.now()<_aiBackoffUntil;}};
})();
