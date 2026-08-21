(function(){
'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition,history=[],pending=null,rec=null,listening=false,wantListen=false,restarts=0,HKEY='kopeyka_ai_history_v2';
function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();}function fmt(v){return n(v).toLocaleString('ru-RU')+' ₽';}
function stripWake(s){
  return norm(s).replace(/^(привет\s+)?(финн?|фенн?|фынн?|fin+n?)\s*/i,'').trim();
}
function isOnlyWake(s){
  var t=norm(s);
  return /^(привет\s+)?(финн?|фенн?|фынн?|fin+n?)$/i.test(t);
}
function loadHistory(){try{var h=JSON.parse(localStorage.getItem(HKEY)||'[]');if(Array.isArray(h))history=h.slice(-40);}catch(e){history=[];}}function saveHistory(){try{localStorage.setItem(HKEY,JSON.stringify(history.slice(-40)));}catch(e){}}
function open(opts){
  opts=opts||{};
  var already=!!document.getElementById('kopeykaAiDialog');
  if(!already){
    loadHistory();
    document.body.insertAdjacentHTML('beforeend','<div id="kopeykaAiDialog" class="ka-bg"><div class="ka-card"><div class="ka-head"><div><div class="ka-kicker"><span class="ka-dot"></span>Фин</div><div class="ka-title">Финансовый помощник</div><div class="ka-sub" id="kaCloud">Проверяю облако…</div></div><button class="ka-close" id="kaClose">×</button></div><div class="ka-chat" id="kaChat"></div><div class="ka-orb-wrap"><div class="ka-rings"></div><button class="ka-orb" id="kaOrb" aria-label="Говорить"><span class="ka-orb-icon">◉</span><span class="ka-wave w1"></span><span class="ka-wave w2"></span><span class="ka-wave w3"></span></button></div><div class="ka-status" id="kaStatus">Нажми на круг, чтобы говорить</div><div class="ka-input-row"><input id="kaInput" autocomplete="off" placeholder="Напиши сообщение…"><button id="kaSend" aria-label="Отправить">➤</button></div></div></div>');
    style();
    document.getElementById('kaClose').onclick=close;
    document.getElementById('kaOrb').onclick=toggleListen;
    document.getElementById('kaSend').onclick=sendInput;
    document.getElementById('kaInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sendInput();}});
    renderHistory();
    updateCloud();
  }
  if(opts.command){
    setTimeout(function(){handle(String(opts.command));},120);
  }else if(opts.listen!==false){
    setTimeout(function(){startListen();},250);
  }
}
function close(){wantListen=false;stopListen();var e=document.getElementById('kopeykaAiDialog');if(e)e.remove();try{if(window.__finnWakeStart)window.__finnWakeStart();}catch(x){}}
function style(){if(document.getElementById('kaStyle'))return;var s=document.createElement('style');s.id='kaStyle';s.textContent='.ka-bg{position:fixed;inset:0;z-index:1000;background:radial-gradient(circle at 50% 18%,rgba(229,167,94,.09),transparent 38%),rgba(4,6,10,.8);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center}.ka-card{width:100%;max-width:580px;height:min(94vh,800px);background:linear-gradient(180deg,#11141b,#0c0f14);color:#f4f5f8;border:1px solid rgba(255,255,255,.11);border-radius:28px 28px 0 0;display:flex;flex-direction:column;padding:18px 15px calc(14px + env(safe-area-inset-bottom,0px));box-shadow:0 -18px 60px rgba(0,0,0,.55);overflow:hidden}.ka-head{display:flex;justify-content:space-between;align-items:flex-start;padding:0 2px}.ka-kicker{font-size:10px;color:#d7b47d;text-transform:uppercase;letter-spacing:.13em;font-weight:700;display:flex;align-items:center;gap:7px}.ka-dot{width:7px;height:7px;border-radius:50%;background:#e5a75e;box-shadow:0 0 12px #e5a75e}.ka-title{font-size:21px;font-weight:750;margin-top:4px;letter-spacing:-.02em}.ka-sub{font-size:11px;color:#777e8e;margin-top:3px}.ka-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#181c24;color:#fff;font-size:25px;line-height:1}.ka-chat{flex:1;overflow:auto;padding:18px 2px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}.ka-empty{text-align:center;color:#777e8e;font-size:13px;line-height:1.6;margin:auto 22px}.ka-msg{max-width:88%;padding:11px 13px;border-radius:17px;font-size:14px;line-height:1.5;white-space:pre-wrap;box-shadow:0 5px 18px rgba(0,0,0,.12)}.ka-user{align-self:flex-end;background:linear-gradient(135deg,#2c2923,#211f1a);border:1px solid rgba(229,167,94,.22);border-bottom-right-radius:6px}.ka-ai{align-self:flex-start;background:#181c24;border:1px solid rgba(255,255,255,.07);border-bottom-left-radius:6px}.ka-action{padding:2px}.ka-actions{display:flex;gap:8px;margin-top:11px}.ka-act{flex:1;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.08);font-weight:750;background:#252a34;color:#fff}.ka-act.ok{background:linear-gradient(135deg,#f4cb91,#e5a75e);color:#1b1309;border:0}.ka-orb-wrap{position:relative;width:104px;height:104px;margin:2px auto;display:grid;place-items:center}.ka-rings,.ka-rings:before,.ka-rings:after{position:absolute;border-radius:50%;content:"";inset:5px;border:1px solid rgba(229,167,94,.16);animation:kaRing 2.8s ease-out infinite}.ka-rings:before{inset:7px;animation-delay:.7s}.ka-rings:after{inset:9px;animation-delay:1.4s}.ka-orb{position:relative;width:76px;height:76px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:radial-gradient(circle at 35% 30%,#ffe0a9 0,#e9b66f 42%,#b66f27 100%);color:#1a1208;box-shadow:0 0 28px rgba(229,167,94,.28),inset 0 0 18px rgba(255,255,255,.22);display:grid;place-items:center;cursor:pointer;transition:.2s}.ka-orb:active{transform:scale(.94)}.ka-orb-icon{font-size:25px;z-index:3}.ka-wave{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.45);opacity:0}.ka-orb.listening{animation:kaListen 1.15s ease-in-out infinite}.ka-orb.listening .ka-wave{inset:-4px;animation:kaWave 1.5s ease-out infinite}.ka-orb.listening .w2{animation-delay:.35s}.ka-orb.listening .w3{animation-delay:.7s}.ka-status{text-align:center;color:#858c9b;font-size:12px;min-height:18px;margin:0 0 9px}.ka-input-row{display:flex;gap:8px}.ka-input-row input{flex:1;min-width:0;background:#171b23;border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:12px 13px;color:#fff;outline:none;font-size:14px}.ka-input-row input:focus{border-color:rgba(229,167,94,.45);box-shadow:0 0 0 3px rgba(229,167,94,.08)}.ka-input-row button{width:46px;border:0;border-radius:14px;background:linear-gradient(135deg,#f0c384,#e5a75e);color:#1a1208;font-weight:900;font-size:18px}@keyframes kaListen{50%{box-shadow:0 0 34px rgba(229,167,94,.5),inset 0 0 22px rgba(255,255,255,.25)}}@keyframes kaWave{0%{transform:scale(.8);opacity:.65}100%{transform:scale(1.55);opacity:0}}@keyframes kaRing{0%{transform:scale(.78);opacity:0}30%{opacity:.35}100%{transform:scale(1.2);opacity:0}}';document.head.appendChild(s);}
function bubble(role,text){var c=document.getElementById('kaChat');if(!c)return;var e=document.createElement('div');e.className='ka-msg '+(role==='user'?'ka-user':'ka-ai');e.textContent=text;c.appendChild(e);c.scrollTop=c.scrollHeight;}function renderHistory(){var c=document.getElementById('kaChat');if(!c)return;c.innerHTML='';if(!history.length){var e=document.createElement('div');e.className='ka-empty';e.textContent='Скажи «Привет, Фин» или нажми на круг. Можно: «удали долг ёжику», «дай к долгу папе 189».';c.appendChild(e);return;}history.slice(-40).forEach(function(x){bubble(x.role,x.content);});}
function status(t){var e=document.getElementById('kaStatus');if(e)e.textContent=t;}function updateCloud(){var e=document.getElementById('kaCloud'),c=window.kopeykaEngine&&window.kopeykaEngine.snapshot?window.kopeykaEngine.snapshot().cloud:null;if(e)e.textContent=c&&c.connected?'Облако подключено · синхронизация доступна':c&&c.online?'Онлайн · локальные данные':'Офлайн · локальные данные';}function sendInput(){var i=document.getElementById('kaInput');if(!i)return;var x=i.value.trim();if(x){i.value='';handle(x);}}
function toggleListen(){if(listening||wantListen){wantListen=false;stopListen();status('Готов. Нажми на круг или скажи «Фин»');}else startListen();}
function startListen(){if(!SR){status('В этом браузере нет распознавания речи');return;}if(listening)return;wantListen=true;restarts=0;createRecognition();}
function createRecognition(){
  if(!wantListen||listening)return;
  rec=new SR();
  rec.lang='ru-RU';
  rec.interimResults=false;
  rec.continuous=false;
  rec.maxAlternatives=2;
  rec.onstart=function(){listening=true;restarts=0;var o=document.getElementById('kaOrb');if(o)o.classList.add('listening');status('Слушаю… говори сейчас');};
  rec.onresult=function(e){
    var t='';
    for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';
    t=t.trim();
    wantListen=false;
    stopListen();
    if(!t){status('Ничего не услышал — скажи «Фин» или нажми круг');return;}
    /* Только «Фин» / «Привет Фин» — снова слушаем */
    if(isOnlyWake(t)){
      status('Да, слушаю…');
      setTimeout(startListen,300);
      return;
    }
    handle(t);
  };
  rec.onerror=function(e){
    var code=e&&e.error||'';
    listening=false;
    var o=document.getElementById('kaOrb');
    if(o)o.classList.remove('listening');
    try{rec.abort();}catch(x){}
    rec=null;
    if(wantListen&&restarts<3&&['no-speech','audio-capture','network','aborted'].indexOf(code)>=0){
      restarts++;
      status('Повторяю слушанье…');
      setTimeout(createRecognition,350);
    }else{
      wantListen=false;
      status(code==='not-allowed'?'Нет доступа к микрофону':'Скажи «Фин» или нажми на круг');
    }
  };
  rec.onend=function(){
    listening=false;
    var o=document.getElementById('kaOrb');
    if(o)o.classList.remove('listening');
    if(wantListen&&restarts<3){restarts++;setTimeout(createRecognition,250);}
  };
  try{rec.start();}catch(e){rec=null;listening=false;wantListen=false;status('Не удалось запустить микрофон');}
}
function stopListen(){wantListen=false;if(rec){try{rec.stop();}catch(e){try{rec.abort();}catch(x){}}rec=null;}listening=false;var o=document.getElementById('kaOrb');if(o)o.classList.remove('listening');}
function confirmWord(t){return /^(да|ага|угу|подтверждаю|сделай|выполняй|верно|правильно|ок|окей|yes|удали)$/i.test(norm(t));}
function cancelWord(t){return /^(нет|отмена|отменить|не надо|не делай|стоп)$/i.test(norm(t));}
function handle(text){
  var raw=String(text||'').trim();
  /* Срезаем «Фин, …» из команды */
  var cmd=stripWake(raw);
  if(!cmd){
    if(isOnlyWake(raw)){
      status('Да, слушаю…');
      setTimeout(startListen,250);
      return;
    }
    cmd=raw;
  }
  bubble('user',cmd);
  history.push({role:'user',content:cmd});
  saveHistory();
  if(pending&&(confirmWord(cmd)||cancelWord(cmd))){
    if(confirmWord(cmd))confirmPending();
    else cancelPending();
    return;
  }
  if(!window.kopeykaAI||typeof window.kopeykaAI.askConversation!=='function'){
    status('ИИ-модуль не загружен');
    return;
  }
  status('Думаю…');
  var h=history.slice(0,-1).slice(-20);
  window.kopeykaAI.askConversation(h,cmd).then(function(o){
    if(o.mode==='action'){
      var acts=(o.actions||[]).filter(function(a){return a&&a.type;});
      if(!acts.length){
        var msg=o.text||o.summary||'Не понял действие. Скажи ещё раз: «удали долг ёжику».';
        history.push({role:'assistant',content:msg});
        saveHistory();
        bubble('ai',msg);
        status('Скажи «Фин» или нажми круг');
        setTimeout(startListen,600);
        return;
      }
      pending=acts;
      renderAction(o.summary||o.text||'Нужно выполнить действие',pending);
    }else{
      var a=o.text||'Не смог сформулировать ответ.';
      history.push({role:'assistant',content:a});
      saveHistory();
      bubble('ai',a);
      updateCloud();
      status('Скажи «Фин» или нажми круг');
      setTimeout(startListen,700);
    }
  }).catch(function(e){
    var a='Не получилось: '+(e&&e.message||'Ошибка ИИ');
    history.push({role:'assistant',content:a});
    saveHistory();
    bubble('ai',a);
    status('Ошибка');
    setTimeout(startListen,800);
  });
}
function renderAction(summary,actions){
  var c=document.getElementById('kaChat'),d=document.createElement('div');
  d.className='ka-msg ka-ai';
  var box=document.createElement('div');
  box.className='ka-action';
  var title=document.createElement('div');
  title.textContent=summary;
  box.appendChild(title);
  actions.forEach(function(a){
    var x=document.createElement('div');
    x.style.marginTop='6px';
    x.textContent=describe(a);
    box.appendChild(x);
  });
  var row=document.createElement('div');
  row.className='ka-actions';
  var ok=document.createElement('button');
  ok.className='ka-act ok';
  ok.textContent=actions.some(function(a){return /^delete_/.test(a.type);})?'Удалить':'Подтвердить';
  ok.onclick=confirmPending;
  var no=document.createElement('button');
  no.className='ka-act';
  no.textContent='Отмена';
  no.onclick=cancelPending;
  row.appendChild(ok);
  row.appendChild(no);
  box.appendChild(row);
  d.appendChild(box);
  c.appendChild(d);
  c.scrollTop=c.scrollHeight;
  status('Проверь операцию — или скажи «да» / «нет»');
  setTimeout(startListen,500);
}
function describe(a){
  var t=a&&a.type;
  if(!t)return 'Неизвестное действие';
  if(t==='add_expense')return'Расход: '+(a.name||a.category||'Прочее')+' — '+fmt(a.amount);
  if(t==='add_income')return'Доход: '+(a.name||'Доход')+' — +'+fmt(a.amount);
  if(t==='add_debt')return'Новый долг «'+(a.name||'')+'»: '+fmt(a.amount);
  if(t==='pay_debt')return'Платёж по долгу «'+(a.name||'')+'»: '+fmt(a.amount);
  if(t==='increase_debt')return'Увеличить долг «'+(a.name||'')+'» на '+fmt(a.amount);
  if(t==='add_obligation')return'Обязательный «'+(a.name||'')+'»: '+fmt(a.amount);
  if(t==='delete_obligation')return'Удалить обязательный «'+(a.name||'')+'»';
  if(t==='reserve_deposit')return'В резерв «'+(a.reserve||a.name||'')+'»: '+fmt(a.amount);
  if(t==='reserve_withdraw')return'Из резерва «'+(a.reserve||a.name||'')+'»: −'+fmt(a.amount);
  if(t==='delete_last')return'Удалить последнюю операцию';
  if(t==='change_last')return'Изменить последнюю операцию на '+fmt(a.amount);
  if(t==='delete_debt')return'Удалить долг «'+(a.name||'')+'»';
  if(t==='delete_income')return'Удалить доход «'+(a.name||'')+'»';
  if(t==='delete_expense')return'Удалить расход «'+(a.name||'')+'»';
  if(t==='delete_reserve')return'Удалить резерв «'+(a.name||'')+'»';
  if(/^delete_/.test(t))return'Удалить: '+(a.name||'запись');
  if(t==='set_opening_balance')return'Установить остаток: '+fmt(a.amount);
  if(t==='set_day_rate')return'Дневная ставка: '+fmt(a.amount);
  if(t==='set_night_rate')return'Ночная ставка: '+fmt(a.amount);
  if(t==='change_shift')return'Смена '+(a.date||'')+': '+(a.shift||'');
  return t;
}
function clone(){return JSON.parse(JSON.stringify(window.STATE||{}));}
function save(s){if(typeof window.setAppState!=='function')throw Error('Копейка ещё не готова');window.setAppState(s);}
function stem(s){var q=norm(s);return q.replace(/(иями|ами|ями|ого|ему|ому|ыми|ими|ее|ие|ые|ое|ей|ий|ый|ой|ем|ом|ам|ям|ах|ях|ою|ею|у|ю|а|я|ы|и|е|о)$/,'');}
function find(list,name,amount){
  var q=norm(name||''),st=stem(q),e;
  if(q)e=list.find(function(x){return norm(x.name)===q;});
  if(e)return e;
  if(q)e=list.find(function(x){var a=norm(x.name);return a.indexOf(q)!==-1||q.indexOf(a)!==-1;});
  if(e)return e;
  if(st.length>1)e=list.find(function(x){var z=stem(x.name);return z===st||z.indexOf(st)!==-1||st.indexOf(z)!==-1;});
  if(e)return e;
  if(amount>0)e=list.find(function(x){return n(x.amount)===n(amount)||n(x.total)===n(amount);});
  if(e)return e;
  if(list.length===1&&q)return list[0];
  return null;
}
function dateOf(a){return/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')?a.date:today();}
function classify(name,fallback){try{return window.kopeykaEngine&&window.kopeykaEngine.classifyName?window.kopeykaEngine.classifyName(name,fallback):fallback||'Прочее';}catch(e){return fallback||'Прочее';}}
function canonicalName(name){var q=norm(name);if(/зубн|зубы|щетк/.test(q))return 'Зубная щётка';if(/футбол.*мяч|футбольн.*мяч|\bмяч\b/.test(q))return 'Футбольный мяч';return String(name||'Прочее');}
function execute(a){
  if(!a||!a.type)throw Error('Пустое действие');
  var s=clone(),t=a.type,amt=n(a.amount),d,idx,r,o,cat=classify(a.name,a.category||'Прочее');
  s.expenses=s.expenses||[];s.income=s.income||[];s.debts=s.debts||[];s.reserves=s.reserves||[];s.reserveOps=s.reserveOps||[];s.obligations=s.obligations||[];s.obligationPays=s.obligationPays||[];
  if(t==='add_expense'){if(amt<=0)throw Error('Сумма расхода должна быть больше нуля');s.expenses.push({id:id(),amount:amt,category:cat,note:canonicalName(a.name||cat),date:dateOf(a);});}
  else if(t==='add_income'){if(amt<=0)throw Error('Сумма дохода должна быть больше нуля');s.income.push({id:id(),amount:amt,note:String(a.name||'Доход'),date:dateOf(a);});}
  else if(t==='add_debt'){if(amt<=0)throw Error('Сумма долга должна быть больше нуля');s.debts.push({id:id(),name:String(a.name||'Долг'),total:amt,paid:0});}
  else if(t==='pay_debt'||t==='increase_debt'){d=find(s.debts,a.name,0);if(!d)throw Error('Не нашёл такой долг: '+(a.name||''));if(amt<=0)throw Error('Сумма должна быть больше нуля');if(t==='increase_debt')d.total=n(d.total)+amt;else{var left=Math.max(0,n(d.total)-n(d.paid));if(amt>left)throw Error('По этому долгу осталось '+fmt(left));d.paid=n(d.paid)+amt;s.expenses.push({id:id(),amount:amt,category:'Долг',note:d.name,date:dateOf(a);});}}
  else if(t==='reserve_deposit'||t==='reserve_withdraw'){r=find(s.reserves,a.reserve||a.name,0);if(!r)throw Error('Не нашёл такой резерв: '+(a.reserve||a.name||''));if(amt<=0)throw Error('Сумма должна быть больше нуля');if(t==='reserve_withdraw'&&amt>n(r.saved))throw Error('В резерве только '+fmt(r.saved));r.saved=n(r.saved)+(t==='reserve_deposit'?amt:-amt);s.reserveOps.push({id:id(),reserveId:r.id,type:t==='reserve_deposit'?'deposit':'withdraw',amount:amt,date:dateOf(a);});}
  else if(t==='add_obligation'){if(amt<=0)throw Error('Сумма обязательного платежа должна быть больше нуля');var day=n(a.day||25);if(day<1||day>31)throw Error('Неверный день платежа');s.obligations.push({id:id(),name:String(a.name||'Платёж'),amount:amt,day:day,active:true});}
  else if(t==='delete_debt'){d=find(s.debts,a.name,0);if(!d)throw Error('Долг не найден: '+(a.name||'')+'. Есть: '+(s.debts.map(function(x){return x.name;}).join(', ')||'нет'));s.debts=s.debts.filter(function(x){return x.id!==d.id;});}
  else if(t==='delete_reserve'){r=find(s.reserves,a.name||a.reserve,0);if(!r)throw Error('Резерв не найден');s.reserves=s.reserves.filter(function(x){return x.id!==r.id;});s.reserveOps=s.reserveOps.filter(function(x){return x.reserveId!==r.id;});}
  else if(t==='delete_obligation'){o=find(s.obligations,a.name,a.amount);if(!o)throw Error('Обязательный платёж не найден');s.obligations=s.obligations.filter(function(x){return x.id!==o.id;});s.obligationPays=s.obligationPays.filter(function(x){return x.obligId!==o.id;});}
  else if(t==='delete_expense'){var q=norm(a.name||'');idx=-1;for(var i=s.expenses.length-1;i>=0;i--){if(!q||norm(s.expenses[i].note||s.expenses[i].category).indexOf(q)!==-1){idx=i;break;}}if(idx<0)throw Error('Расход не найден');s.expenses.splice(idx,1);}
  else if(t==='delete_income'){var qi=norm(a.name||'');idx=-1;for(var j=s.income.length-1;j>=0;j--){if(!qi||norm(s.income[j].note).indexOf(qi)!==-1){idx=j;break;}}if(idx<0)throw Error('Доход не найден');s.income.splice(idx,1);}
  else if(t==='delete_last'){var target=a.target||'any',lastE=s.expenses[s.expenses.length-1],lastI=s.income[s.income.length-1];if(target==='expense'&&lastE)s.expenses.pop();else if(target==='income'&&lastI)s.income.pop();else if(lastE||lastI){var de=lastE&&lastE.date||'',di=lastI&&lastI.date||'';if(!lastI||(de>=di))s.expenses.pop();else s.income.pop();}else throw Error('Нечего удалять');}
  else if(t==='change_last'){var target2=a.target||'expense',arr=target2==='income'?s.income:s.expenses;if(!arr.length)throw Error('Нет операции для изменения');if(amt<=0)throw Error('Сумма должна быть больше нуля');arr[arr.length-1].amount=amt;if(a.name)arr[arr.length-1].note=String(a.name);}
  else if(t==='set_opening_balance'){s.settings=s.settings||{};s.settings.openingBalance=amt;}
  else if(t==='set_day_rate'){s.settings=s.settings||{};s.settings.dayRate=amt;}
  else if(t==='set_night_rate'){s.settings=s.settings||{};s.settings.nightRate=amt;}
  else if(t==='change_shift'){if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date||''))throw Error('Не указана дата смены');if(['day','night','off'].indexOf(a.shift)<0)throw Error('Неизвестный тип смены');s.shiftsOverride=s.shiftsOverride||{};s.shiftsOverride[a.date]=a.shift;}
  else throw Error('Неподдерживаемое действие: '+t);
  save(s);
}
function confirmPending(){
  if(!pending)return;
  var list=pending.filter(function(a){return a&&a.type;});
  pending=null;
  if(!list.length){
    bubble('ai','Нечего выполнять — действие без типа.');
    status('Скажи «Фин» или нажми круг');
    setTimeout(startListen,500);
    return;
  }
  try{
    list.forEach(execute);
    var t='Готово. Изменения внесены.';
    history.push({role:'assistant',content:t});
    saveHistory();
    bubble('ai',t);
    updateCloud();
    status('Готово. Скажи «Фин» или нажми круг');
    setTimeout(startListen,600);
  }catch(e){
    var msg='Не внёс изменения: '+(e.message||e);
    history.push({role:'assistant',content:msg});
    saveHistory();
    bubble('ai',msg);
    status('Ошибка операции');
    setTimeout(startListen,700);
  }
}
function cancelPending(){
  pending=null;
  var t='Отменил. Ничего не изменено.';
  history.push({role:'assistant',content:t});
  saveHistory();
  bubble('ai',t);
  status('Скажи «Фин» или нажми круг');
  setTimeout(startListen,500);
}
window.kopeykaAssistant={open:open,close:close,startListen:startListen};
window.kopeykaVoice=window.kopeykaAssistant;
})();
