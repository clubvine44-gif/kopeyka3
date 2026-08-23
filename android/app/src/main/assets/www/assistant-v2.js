(function(){
'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition,history=[],pending=null,rec=null,listening=false,wantListen=false,restarts=0,HKEY='kopeyka_ai_history_v2';
var firstOpenListen=true, openingAnim=false, _micStarting=false;

function n(v){var x=Number(v);return isFinite(x)?Math.round(x):0;}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();}
function fmt(v){return n(v).toLocaleString('ru-RU')+' ₽';}
function stripWake(s){return norm(s).replace(/^(привет\s+)?(финн?|фенн?|фынн?|fin+n?)\s*/i,'').trim();}
function isOnlyWake(s){var t=norm(s);return /^(привет\s+)?(финн?|фенн?|фынн?|fin+n?)$/i.test(t);}
function loadHistory(){try{var h=JSON.parse(localStorage.getItem(HKEY)||'[]');if(Array.isArray(h))history=h.slice(-40);}catch(e){history=[];}}
function saveHistory(){try{localStorage.setItem(HKEY,JSON.stringify(history.slice(-40)));}catch(e){}}

function originRect(opts){
  opts=opts||{};
  var el=null;
  if(opts.fromEl&&opts.fromEl.getBoundingClientRect)el=opts.fromEl;
  else if(opts.from==='avatar')el=document.getElementById('finnAvatar');
  else if(opts.from==='fab')el=document.getElementById('fab');
  if(!el)el=document.getElementById('fab')||document.getElementById('finnAvatar');
  if(!el)return{x:window.innerWidth/2,y:window.innerHeight*0.75,w:56,h:56};
  var r=el.getBoundingClientRect();
  return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
}

function targetPos(){
  return{x:window.innerWidth/2,y:window.innerHeight*0.78};
}

function open(opts){
  opts=opts||{};
  try{
    try{if(window.__finnWakeStop)window.__finnWakeStop();}catch(x){}
    style();
    var existing=document.getElementById('kopeykaAiDialog');
    if(existing){
      existing.classList.add('ka-show');
      existing.style.display='block';
      return;
    }
    loadHistory();
    var origin=originRect(opts);
    var target=targetPos();
    var wrap=document.createElement('div');
    wrap.id='kopeykaAiDialog';
    wrap.className='ka-float';
    wrap.setAttribute('aria-modal','true');
    var avatarSvg=(window.FinnChar?window.FinnChar.svgMarkup('kaFinn','C'):'');
    wrap.innerHTML=
      '<div class="ka-backdrop" id="kaBackdrop"></div>'+
      '<div class="ka-reply" id="kaReply" aria-live="polite"></div>'+
      '<div class="ka-stage" id="kaStage">'+
        '<div class="ka-row" id="kaRow">'+
          '<div class="ka-bubble" id="kaBubble">'+
            '<div class="finn-avatar ka-orb-face" id="kaFinnAvatar" data-emotion="idle">'+
              '<span class="finn-aura"></span>'+avatarSvg+
            '</div>'+
            '<div class="ka-ring"></div>'+
            '<div class="ka-ring ka-ring2"></div>'+
          '</div>'+
          '<button class="ka-micbtn" id="kaOrb" type="button" aria-label="Микрофон">'+
            '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+
              '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>'+
              '<path d="M19 10v2a7 7 0 0 1-14 0v-2"/>'+
              '<line x1="12" y1="19" x2="12" y2="23"/>'+
              '<line x1="8" y1="23" x2="16" y2="23"/>'+
            '</svg>'+
            '<span class="ka-mic-pulse"></span>'+
          '</button>'+
          '<button class="ka-x" id="kaClose" type="button" aria-label="Закрыть">×</button>'+
        '</div>'+
        '<div class="ka-hint" id="kaStatus">Слушаю…</div>'+
      '</div>';
    document.body.appendChild(wrap);

    var stage=document.getElementById('kaStage');
    if(stage){
      stage.style.left=origin.x+'px';
      stage.style.top=origin.y+'px';
      stage.style.bottom='auto';
      stage.style.transform='translate(-50%,-50%) scale(0.32)';
      stage.style.opacity='0';
    }
    openingAnim=true;
    void wrap.offsetWidth;
    wrap.classList.add('ka-show');
    requestAnimationFrame(function(){
      if(!stage)return;
      stage.style.transition='transform .55s cubic-bezier(.22,1.1,.36,1), left .55s cubic-bezier(.22,1.1,.36,1), top .55s cubic-bezier(.22,1.1,.36,1), opacity .35s ease';
      stage.style.left=target.x+'px';
      stage.style.top=target.y+'px';
      stage.style.transform='translate(-50%,-50%) scale(1)';
      stage.style.opacity='1';
      setTimeout(function(){openingAnim=false;},580);
    });

    try{
      var av=document.getElementById('kaFinnAvatar');
      if(window.FinnChar){
        window.FinnChar.scheduleBlink(av);
        window.FinnChar.flashEmotion(av,'idle',0);
      }
    }catch(x){}

    var bd=document.getElementById('kaBackdrop');
    if(bd)bd.addEventListener('click',function(){close();});
    var closeBtn=document.getElementById('kaClose');
    if(closeBtn)closeBtn.onclick=function(e){e.preventDefault();e.stopPropagation();close();};
    var orb=document.getElementById('kaOrb');
    if(orb){
      orb.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        if(listening||wantListen||_micStarting){
          wantListen=false;_micStarting=false;stopListen();
          status('Нажми микрофон');
          kaEmo('idle');
        }else{
          startListen();
        }
      });
    }

    // только при первом открытии сессии — один автостарт микрофона
    firstOpenListen=true;
    setTimeout(function(){
      if(!document.getElementById('kopeykaAiDialog'))return;
      if(firstOpenListen){
        firstOpenListen=false;
        startListen();
      }
    },520);

    if(opts.command)setTimeout(function(){try{handle(String(opts.command));}catch(x){}},560);
  }catch(err){
    console.error('open Fin',err);
    try{alert('Фин: '+(err&&err.message||err));}catch(x){}
  }
}

function close(){
  wantListen=false;_micStarting=false;stopListen();pending=null;firstOpenListen=true;
  var e=document.getElementById('kopeykaAiDialog');
  if(!e)return;
  e.classList.remove('ka-show');
  e.classList.add('ka-hide');
  setTimeout(function(){
    try{e.remove();}catch(x){}
  },320);
  try{if(window.Finn3D&&window.Finn3D.deactivate)window.Finn3D.deactivate();}catch(x){}
  try{if(window.__finnWakeStart)window.__finnWakeStart();}catch(x){}
}

function style(){
  var s=document.getElementById('kaStyle');
  if(!s){s=document.createElement('style');s.id='kaStyle';document.head.appendChild(s);}
  s.textContent=''+
  '.ka-float{position:fixed;inset:0;z-index:10050;pointer-events:none}'+
  '.ka-float.ka-show{pointer-events:auto}'+
  '.ka-backdrop{position:absolute;inset:0;background:rgba(4,8,16,.38);'+
  'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'+
  'opacity:0;transition:opacity .4s ease}'+
  '.ka-show .ka-backdrop{opacity:1}'+
  '.ka-hide .ka-backdrop{opacity:0}'+
  '.ka-stage{position:absolute;z-index:2;display:flex;flex-direction:column;align-items:center;gap:22px;'+
  'will-change:transform,left,top,opacity;pointer-events:auto}'+
  '.ka-row{position:relative;display:flex;align-items:center;justify-content:center;gap:30px}'+
  '.ka-bubble{position:relative;width:132px;height:132px;border-radius:50%;'+
  'background:radial-gradient(circle at 35% 30%,rgba(120,210,255,.4),rgba(14,22,40,.92) 55%,rgba(8,12,22,.98));'+
  'border:1.5px solid rgba(94,200,255,.5);'+
  'box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 36px rgba(94,200,255,.26),inset 0 0 20px rgba(94,200,255,.12);'+
  'display:flex;align-items:center;justify-content:center;'+
  'animation:kaBob 3.2s ease-in-out infinite;transform-origin:center center}'+
  '.ka-bubble.thinking{animation:kaThink 1.4s ease-in-out infinite}'+
  '.ka-bubble.listening{animation:kaListen 2s ease-in-out infinite;'+
  'box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 0 8px rgba(94,200,255,.16),0 0 40px rgba(94,200,255,.4)}'+
  '.ka-bubble.happy{animation:kaHappy 0.7s ease}'+
  '.ka-bubble.alert,.ka-bubble.angry{animation:kaShake 0.5s ease}'+
  '.ka-orb-face{width:108px!important;height:108px!important;border:0!important;background:transparent!important;box-shadow:none!important;'+
  'animation:none!important;transition:transform .35s ease}'+
  '.ka-orb-face svg{width:98px;height:98px;transition:transform .4s ease}'+
  '.ka-orb-face::before{display:none!important}'+
  '.ka-orb-face[data-emotion="thinking"] svg{animation:kaTilt 2.2s ease-in-out infinite}'+
  '.ka-orb-face[data-emotion="listening"] svg{animation:kaTilt 1.8s ease-in-out infinite}'+
  '.ka-orb-face[data-emotion="happy"] svg{animation:kaNod 0.65s ease}'+
  '.ka-orb-face[data-emotion="angry"] svg,.ka-orb-face[data-emotion="alert"] svg{animation:kaFaceShake .45s ease}'+
  '.ka-orb-face[data-emotion="idle"] svg{animation:kaIdleSway 4s ease-in-out infinite}'+
  '.ka-ring,.ka-ring2{position:absolute;inset:-10px;border-radius:50%;border:1.5px solid rgba(94,200,255,.32);'+
  'animation:kaRing 2.4s ease-out infinite;pointer-events:none}'+
  '.ka-ring2{inset:-22px;animation-delay:.7s;opacity:.5}'+
  '@keyframes kaRing{0%{transform:scale(.85);opacity:.65}100%{transform:scale(1.28);opacity:0}}'+
  '@keyframes kaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}'+
  '@keyframes kaThink{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.04)}}'+
  '@keyframes kaListen{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.03)}}'+
  '@keyframes kaHappy{0%{transform:scale(1)}40%{transform:scale(1.08)}70%{transform:scale(.97)}100%{transform:scale(1)}}'+
  '@keyframes kaShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'+
  '@keyframes kaTilt{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(7deg)}}'+
  '@keyframes kaNod{0%{transform:rotate(0)}30%{transform:rotate(-8deg) translateY(2px)}60%{transform:rotate(5deg)}100%{transform:rotate(0)}}'+
  '@keyframes kaFaceShake{0%,100%{transform:rotate(0)}30%{transform:rotate(-10deg)}60%{transform:rotate(10deg)}}'+
  '@keyframes kaIdleSway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}'+
  '.ka-micbtn{position:relative;width:56px;height:56px;border-radius:50%;border:1.5px solid rgba(94,200,255,.4);'+
  'background:linear-gradient(145deg,rgba(30,42,70,.95),rgba(14,22,40,.98));'+
  'color:#5EC8FF;display:flex;align-items:center;justify-content:center;'+
  'box-shadow:0 8px 28px rgba(0,0,0,.4),0 0 16px rgba(94,200,255,.15);'+
  'transition:transform .18s ease,background .2s,box-shadow .2s;flex-shrink:0}'+
  '.ka-micbtn:active{transform:scale(.92)}'+
  '.ka-micbtn.listening{background:linear-gradient(145deg,#5EC8FF,#3A8FE8);color:#0A101C;'+
  'box-shadow:0 0 0 5px rgba(94,200,255,.22),0 8px 28px rgba(94,200,255,.35);'+
  'animation:kaMicGlow 1.2s ease-in-out infinite}'+
  '@keyframes kaMicGlow{50%{box-shadow:0 0 0 10px rgba(94,200,255,.08),0 8px 28px rgba(94,200,255,.4)}}'+
  '.ka-mic-pulse{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(94,200,255,.4);'+
  'opacity:0;pointer-events:none}'+
  '.ka-micbtn.listening .ka-mic-pulse{animation:kaRing 1.4s ease-out infinite;opacity:1}'+
  '.ka-x{position:absolute;top:-40px;right:-8px;width:30px;height:30px;border-radius:50%;'+
  'border:1px solid rgba(255,255,255,.12);background:rgba(20,28,44,.85);color:#9AA0B0;'+
  'font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;'+
  'pointer-events:auto;opacity:.85}'+
  '.ka-x:active{transform:scale(.9)}'+
  '.ka-reply{position:absolute;left:50%;bottom:calc(22% + 168px);transform:translateX(-50%);'+
  'width:min(88vw,340px);z-index:3;text-align:center;pointer-events:none;'+
  'font-size:16px;line-height:1.45;font-weight:560;color:#F2F3F7;'+
  'text-shadow:0 2px 16px rgba(0,0,0,.65),0 0 24px rgba(0,0,0,.4);'+
  'opacity:0;transition:opacity .35s ease,transform .35s ease}'+
  '.ka-reply.show{opacity:1;transform:translateX(-50%) translateY(0)}'+
  '.ka-reply.hide{opacity:0;transform:translateX(-50%) translateY(8px)}'+
  '.ka-reply .ka-act-row{display:flex;gap:10px;justify-content:center;margin-top:14px;pointer-events:auto}'+
  '.ka-reply .ka-act{padding:10px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.12);'+
  'background:rgba(20,28,44,.88);color:#fff;font-weight:700;font-size:14px;backdrop-filter:blur(8px)}'+
  '.ka-reply .ka-act.ok{background:linear-gradient(135deg,#5EC8FF,#3A8FE8);color:#0A101C;border:0}'+
  '.ka-hint{position:relative;z-index:3;font-size:12.5px;color:rgba(180,190,210,.9);text-align:center;'+
  'text-shadow:0 1px 8px rgba(0,0,0,.55);pointer-events:none;'+
  'white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;'+
  'min-height:18px;line-height:1.3;padding:10px 8px 0;margin-top:4px}'+
  '';
}

function kaEmo(emotion,duration){
  emotion=emotion||'idle';
  try{
    var root=document.getElementById('kaFinnAvatar');
    if(window.FinnChar&&root){
      if(duration&&duration>0)window.FinnChar.flashEmotion(root,emotion,duration);
      else if(window.FinnChar.setEmotion)window.FinnChar.setEmotion(root,emotion);
      else window.FinnChar.flashEmotion(root,emotion,999999);
    }
  }catch(x){}
  var b=document.getElementById('kaBubble');
  if(!b)return;
  b.classList.remove('thinking','listening','happy','alert','angry');
  if(emotion==='thinking'||emotion==='listening')b.classList.add(emotion==='listening'?'listening':'thinking');
  else if(emotion==='happy')b.classList.add('happy');
  else if(emotion==='alert'||emotion==='angry')b.classList.add(emotion);
}

function showReply(text,actions){
  var el=document.getElementById('kaReply');
  if(!el)return;
  el.classList.remove('show');
  el.classList.add('hide');
  setTimeout(function(){
    el.classList.remove('hide');
    el.innerHTML='';
    var p=document.createElement('div');
    p.textContent=text||'';
    el.appendChild(p);
    if(actions&&actions.length){
      var row=document.createElement('div');
      row.className='ka-act-row';
      var ok=document.createElement('button');
      ok.className='ka-act ok';
      ok.type='button';
      ok.textContent=actions.some(function(a){return /^delete_/.test(a.type);})?'Удалить':'Подтвердить';
      ok.onclick=function(e){e.preventDefault();confirmPending();};
      var no=document.createElement('button');
      no.className='ka-act';
      no.type='button';
      no.textContent='Отмена';
      no.onclick=function(e){e.preventDefault();cancelPending();};
      row.appendChild(ok);row.appendChild(no);
      el.appendChild(row);
    }
    requestAnimationFrame(function(){el.classList.add('show');});
  },220);
}

function clearReply(){
  var el=document.getElementById('kaReply');
  if(!el)return;
  el.classList.remove('show');
  el.classList.add('hide');
  setTimeout(function(){el.innerHTML='';el.classList.remove('hide');},240);
}

function status(t){
  var e=document.getElementById('kaStatus');
  if(e)e.textContent=t||'';
}

function setListeningUI(on){
  var o=document.getElementById('kaOrb');
  var b=document.getElementById('kaBubble');
  if(o)o.classList.toggle('listening',!!on);
  if(on){
    if(b){b.classList.remove('thinking','happy','alert','angry');b.classList.add('listening');}
    kaEmo('listening');
  }else{
    if(b)b.classList.remove('listening');
  }
}

function startListen(){
  if(!SR){status('Нет распознавания речи');return;}
  if(listening||_micStarting)return;
  wantListen=true;
  _micStarting=true;
  restarts=0;
  status('Слушаю… говори');
  setListeningUI(true);
  createRecognition();
}

function createRecognition(){
  if(!wantListen){_micStarting=false;return;}
  if(listening){_micStarting=false;return;}
  try{if(rec){try{rec.abort();}catch(x){}rec=null;}}catch(x){}
  rec=new SR();
  rec.lang='ru-RU';
  rec.interimResults=true;
  rec.continuous=false;
  rec.maxAlternatives=3;
  rec.onstart=function(){
    listening=true;
    _micStarting=false;
    restarts=0;
    setListeningUI(true);
    status('Слушаю…');
  };
  rec.onresult=function(e){
    var interim='',final='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      var piece=e.results[i][0].transcript;
      if(e.results[i].isFinal)final+=piece+' ';
      else interim+=piece+' ';
    }
    if(interim)status('… '+interim.trim());
    var t=final.trim();
    if(!t)return;
    // one-shot: сразу стоп, без рестартов
    wantListen=false;
    _micStarting=false;
    stopListen();
    if(isOnlyWake(t)){status('Да, слушаю…');setTimeout(function(){startListen();},300);return;}
    handle(t);
  };
  rec.onerror=function(e){
    var code=e&&e.error||'';
    listening=false;
    _micStarting=false;
    setListeningUI(false);
    try{if(rec)rec.abort();}catch(x){}
    rec=null;
    // без автоперезапуска — иначе мигание
    if(code==='not-allowed'){wantListen=false;status('Нет доступа к микрофону');kaEmo('alert',1800);return;}
    if(code==='no-speech'||code==='aborted'){
      wantListen=false;
      status('Нажми микрофон');
      kaEmo('idle');
      return;
    }
    wantListen=false;
    status('Нажми микрофон');
    kaEmo('idle');
  };
  rec.onend=function(){
    listening=false;
    _micStarting=false;
    setListeningUI(false);
    rec=null;
    // критично: НЕ перезапускаем сами — только по кнопке или явному startListen
    if(wantListen){
      // редкий случай: onend до onresult — один мягкий retry
      wantListen=false;
      status('Нажми микрофон');
      kaEmo('idle');
    }
  };
  try{rec.start();}catch(e){
    rec=null;listening=false;wantListen=false;_micStarting=false;
    setListeningUI(false);
    status('Микрофон не запустился');
    kaEmo('alert',1600);
  }
}

function stopListen(){
  wantListen=false;
  _micStarting=false;
  if(rec){try{rec.onend=null;rec.onerror=null;rec.stop();}catch(e){try{rec.abort();}catch(x){}}rec=null;}
  listening=false;
  setListeningUI(false);
}

function isMicLocked(){return false;}

function maybeResumeListen(ms){
  status('Нажми микрофон');
  kaEmo('idle');
}

function confirmWord(t){return /^(да|ага|угу|подтверждаю|сделай|выполняй|верно|правильно|ок|окей|yes|удали)$/i.test(norm(t));}
function cancelWord(t){return /^(нет|отмена|отменить|не надо|не делай|стоп)$/i.test(norm(t));}

function handle(text){
  var raw=String(text||'').trim();
  var cmd=stripWake(raw);
  if(!cmd){
    if(isOnlyWake(raw)){status('Скажи запрос');setTimeout(startListen,250);return;}
    cmd=raw;
  }
  // не показываем речь пользователя — только растворяем старый ответ
  clearReply();
  history.push({role:'user',content:cmd});saveHistory();
  if(pending&&(confirmWord(cmd)||cancelWord(cmd))){
    if(confirmWord(cmd))confirmPending();else cancelPending();
    return;
  }
  if(!window.kopeykaAI||typeof window.kopeykaAI.askConversation!=='function'){
    status('ИИ-модуль не загружен');kaEmo('angry',1600);return;
  }
  status('Думаю…');kaEmo('thinking');
  var h=history.slice(0,-1).slice(-20);
  window.kopeykaAI.askConversation(h,cmd).then(function(o){
    if(o.mode==='action'){
      var acts=(o.actions||[]).filter(function(a){return a&&a.type;});
      if(!acts.length){
        var msg=o.text||o.summary||'Не понял. Скажи: «удали долг ёжику».';
        history.push({role:'assistant',content:msg});saveHistory();
        showReply(msg);kaEmo('alert',1600);
        maybeResumeListen(400);return;
      }
      kaEmo('idle');pending=acts;
      showReply(o.summary||o.text||'Нужно выполнить действие',pending);
      status('Скажи «да» или «нет»');
      setTimeout(function(){if(pending)startListen();},350);
    }else{
      var a=o.text||'Не смог ответить.';
      history.push({role:'assistant',content:a});saveHistory();
      showReply(a);kaEmo('happy',1300);
      maybeResumeListen(400);
    }
  }).catch(function(e){
    var msg=(e&&e.message)?String(e.message):'ошибка сети';
    var a=/ключ|401/i.test(msg)?'Нужен ключ Groq в настройках.':
      /429|много запросов/i.test(msg)?'Слишком много запросов. Подожди полминуты.':
      /Таймаут|abort/i.test(msg)?'ИИ не ответил вовремя. Попробуй ещё раз.':
      /сети|fetch/i.test(msg)?'Нет сети. Проверь интернет.':
      ('Финна: '+msg);
    history.push({role:'assistant',content:a});saveHistory();
    showReply(a);status('Нажми микрофон');kaEmo('angry',1800);
  });
}

function describe(a){
  var t=a&&a.type;if(!t)return 'Неизвестное действие';
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
  if(t==='change_last')return'Изменить последнюю на '+fmt(a.amount);
  if(t==='delete_debt')return'Удалить долг «'+(a.name||'')+'»';
  if(t==='delete_income')return'Удалить доход «'+(a.name||'')+'»';
  if(t==='delete_expense')return'Удалить расход «'+(a.name||'')+'»';
  if(t==='delete_reserve')return'Удалить резерв «'+(a.name||'')+'»';
  if(/^delete_/.test(t))return'Удалить: '+(a.name||'запись');
  if(t==='set_opening_balance')return'Остаток: '+fmt(a.amount);
  if(t==='set_day_rate')return'Дневная ставка: '+fmt(a.amount);
  if(t==='set_night_rate')return'Ночная ставка: '+fmt(a.amount);
  if(t==='change_shift')return'Смена '+(a.date||'')+': '+(a.shift||'');
  return t;
}

function clone(){return JSON.parse(JSON.stringify(window.STATE||{}));}
function save(s){if(typeof window.setAppState!=='function')throw Error('Финна ещё не готова');window.setAppState(s);}
function stem(s){var q=norm(s);return q.replace(/(иями|ами|ями|ого|ему|ому|ыми|ими|ее|ие|ые|ое|ей|ий|ый|ой|ем|ом|ам|ям|ах|ях|ою|ею|у|ю|а|я|ы|и|е|о)$/,'');}
function find(list,name,amount){
  var q=norm(name||''),st=stem(q),e;
  if(q)e=list.find(function(x){return norm(x.name)===q;});if(e)return e;
  if(q)e=list.find(function(x){var a=norm(x.name);return a.indexOf(q)!==-1||q.indexOf(a)!==-1;});if(e)return e;
  if(st.length>1)e=list.find(function(x){var z=stem(x.name);return z===st||z.indexOf(st)!==-1||st.indexOf(z)!==-1;});if(e)return e;
  if(amount>0)e=list.find(function(x){return n(x.amount)===n(amount)||n(x.total)===n(amount);});if(e)return e;
  if(list.length===1&&q)return list[0];return null;
}
function dateOf(a){return/^\d{4}-\d{2}-\d{2}$/.test(a.date||'')?a.date:today();}
function classify(name,fallback){try{return window.kopeykaEngine&&window.kopeykaEngine.classifyName?window.kopeykaEngine.classifyName(name,fallback):fallback||'Прочее';}catch(e){return fallback||'Прочее';}}
function canonicalName(name){var q=norm(name);if(/зубн|зубы|щетк/.test(q))return 'Зубная щётка';if(/футбол.*мяч|футбольн.*мяч/.test(q))return 'Футбольный мяч';return String(name||'Прочее');}

function execute(a){
  if(!a||!a.type)throw Error('Пустое действие');
  var s=clone(),t=a.type,amt=n(a.amount),d,idx,r,o,cat=classify(a.name,a.category||'Прочее');
  s.expenses=s.expenses||[];s.income=s.income||[];s.debts=s.debts||[];s.reserves=s.reserves||[];s.reserveOps=s.reserveOps||[];s.obligations=s.obligations||[];s.obligationPays=s.obligationPays||[];
  if(t==='add_expense'){if(amt<=0)throw Error('Сумма расхода > 0');var _nid=id();s.expenses.push({id:_nid,amount:amt,category:cat,note:canonicalName(a.name||cat),date:dateOf(a)});s.lastOp={kind:'expense',id:_nid};}
  else if(t==='add_income'){if(amt<=0)throw Error('Сумма дохода > 0');var _iid=id();s.income.push({id:_iid,amount:amt,note:String(a.name||'Доход'),date:dateOf(a)});s.lastOp={kind:'income',id:_iid};}
  else if(t==='add_debt'){if(amt<=0)throw Error('Сумма долга > 0');var _did=id();s.debts.push({id:_did,name:String(a.name||'Долг'),total:amt,paid:0});s.lastOp={kind:'debt',id:_did};}
  else if(t==='pay_debt'||t==='increase_debt'){
    d=find(s.debts,a.name,0);if(!d)throw Error('Долг не найден: '+(a.name||''));if(amt<=0)throw Error('Сумма > 0');
    if(t==='increase_debt')d.total=n(d.total)+amt;
    else{var left=Math.max(0,n(d.total)-n(d.paid));if(amt>left)throw Error('Осталось '+fmt(left));d.paid=n(d.paid)+amt;var _pid=id();s.expenses.push({id:_pid,amount:amt,category:'Долг',note:d.name,date:dateOf(a),debtId:d.id});s.lastOp={kind:'expense',id:_pid};}
  }
  else if(t==='reserve_deposit'||t==='reserve_withdraw'){
    r=find(s.reserves,a.reserve||a.name,0);if(!r)throw Error('Резерв не найден');if(amt<=0)throw Error('Сумма > 0');
    if(t==='reserve_withdraw'&&amt>n(r.saved))throw Error('В резерве '+fmt(r.saved));
    r.saved=n(r.saved)+(t==='reserve_deposit'?amt:-amt);
    s.reserveOps.push({id:id(),reserveId:r.id,type:t==='reserve_deposit'?'deposit':'withdraw',amount:amt,date:dateOf(a)});
  }
  else if(t==='add_obligation'){if(amt<=0)throw Error('Сумма > 0');var day=n(a.day||25);if(day<1||day>31)throw Error('День 1–31');s.obligations.push({id:id(),name:String(a.name||'Платёж'),amount:amt,day:day,active:true});}
  else if(t==='delete_debt'){d=find(s.debts,a.name,0);if(!d)throw Error('Долг не найден: '+(a.name||'')+'. Есть: '+(s.debts.map(function(x){return x.name;}).join(', ')||'нет'));s.debts=s.debts.filter(function(x){return x.id!==d.id;});}
  else if(t==='delete_reserve'){r=find(s.reserves,a.name||a.reserve,0);if(!r)throw Error('Резерв не найден');s.reserves=s.reserves.filter(function(x){return x.id!==r.id;});s.reserveOps=s.reserveOps.filter(function(x){return x.reserveId!==r.id;});}
  else if(t==='delete_obligation'){o=find(s.obligations,a.name,a.amount);if(!o)throw Error('Обязательный не найден');s.obligations=s.obligations.filter(function(x){return x.id!==o.id;});s.obligationPays=s.obligationPays.filter(function(x){return x.obligId!==o.id;});}
  else if(t==='delete_expense'){var q=norm(a.name||'');idx=-1;for(var i=s.expenses.length-1;i>=0;i--){if(!q||norm(s.expenses[i].note||s.expenses[i].category).indexOf(q)!==-1){idx=i;break;}}if(idx<0)throw Error('Расход не найден');s.expenses.splice(idx,1);}
  else if(t==='delete_income'){var qi=norm(a.name||'');idx=-1;for(var j=s.income.length-1;j>=0;j--){if(!qi||norm(s.income[j].note).indexOf(qi)!==-1){idx=j;break;}}if(idx<0)throw Error('Доход не найден');s.income.splice(idx,1);}
  else if(t==='delete_last'){
    var removed=false, last=s.lastOp||null;
    function newest(arr){if(!arr||!arr.length)return null;var best=null;for(var i=0;i<arr.length;i++){var x=arr[i];if(!x)continue;if(!best){best=x;continue;}var xd=String(x.date||''),bd=String(best.date||'');if(xd>bd||(xd===bd&&String(x.id||'')>String(best.id||'')))best=x;}return best;}
    if(last&&last.id&&last.kind){
      if(last.kind==='expense'){var be=s.expenses.length;s.expenses=s.expenses.filter(function(x){return x.id!==last.id;});removed=s.expenses.length<be;}
      else if(last.kind==='income'){var bi=s.income.length;s.income=s.income.filter(function(x){return x.id!==last.id;});removed=s.income.length<bi;}
      else if(last.kind==='debt'){var bd=s.debts.length;s.debts=s.debts.filter(function(x){return x.id!==last.id;});removed=s.debts.length<bd;}
      else if(last.kind==='reserve'){var br=s.reserves.length;s.reserves=s.reserves.filter(function(x){return x.id!==last.id;});s.reserveOps=(s.reserveOps||[]).filter(function(x){return x.reserveId!==last.id;});removed=s.reserves.length<br;}
      else if(last.kind==='obligation'){var bo=s.obligations.length;s.obligations=s.obligations.filter(function(x){return x.id!==last.id;});removed=s.obligations.length<bo;}
      s.lastOp=null;
    }
    if(!removed){
      var target=a.target||'any';
      var ne=newest(s.expenses),ni=newest(s.income),pick=null,kind=null;
      if(target==='expense'&&ne){pick=ne;kind='expense';}
      else if(target==='income'&&ni){pick=ni;kind='income';}
      else {
        if(ne&&ni){var nde=String(ne.date||''),ndi=String(ni.date||'');if(nde>ndi||(nde===ndi&&String(ne.id)>String(ni.id))){pick=ne;kind='expense';}else{pick=ni;kind='income';}}
        else if(ne){pick=ne;kind='expense';}
        else if(ni){pick=ni;kind='income';}
      }
      if(!pick)throw Error('Нечего удалять');
      if(kind==='expense')s.expenses=s.expenses.filter(function(x){return x.id!==pick.id;});
      else s.income=s.income.filter(function(x){return x.id!==pick.id;});
      s.lastOp=null;
    }
  }
  else if(t==='change_last'){var target2=a.target||'expense',arr=target2==='income'?s.income:s.expenses;if(!arr.length)throw Error('Нет операции');if(amt<=0)throw Error('Сумма > 0');arr[arr.length-1].amount=amt;if(a.name)arr[arr.length-1].note=String(a.name);}
  else if(t==='set_opening_balance'){s.settings=s.settings||{};s.settings.openingBalance=amt;}
  else if(t==='set_day_rate'){s.settings=s.settings||{};s.settings.dayRate=amt;}
  else if(t==='set_night_rate'){s.settings=s.settings||{};s.settings.nightRate=amt;}
  else if(t==='change_shift'){if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date||''))throw Error('Нужна дата');if(['day','night','off'].indexOf(a.shift)<0)throw Error('Смена day/night/off');s.shiftsOverride=s.shiftsOverride||{};s.shiftsOverride[a.date]=a.shift;}
  else throw Error('Неподдерживаемое действие: '+t);
  save(s);
}

function confirmPending(){
  if(!pending)return;
  var list=pending.filter(function(a){return a&&a.type;});pending=null;
  if(!list.length){showReply('Нечего выполнять.');maybeResumeListen(400);return;}
  try{
    list.forEach(execute);
    var t='Готово. Изменения внесены.';
    history.push({role:'assistant',content:t});saveHistory();
    showReply(t);kaEmo('happy',1400);maybeResumeListen(500);
  }catch(e){
    var msg='Не внёс изменения: '+(e.message||e);
    history.push({role:'assistant',content:msg});saveHistory();
    showReply(msg);status('Ошибка');kaEmo('angry',1800);maybeResumeListen(500);
  }
}
function cancelPending(){
  pending=null;
  var t='Отменил.';
  history.push({role:'assistant',content:t});saveHistory();
  showReply(t);maybeResumeListen(400);
}

window.kopeykaAssistant={open:open,close:close,startListen:startListen};
window.kopeykaVoice=window.kopeykaAssistant;
})();
