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
function playOpenSound(){
  try{
    var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    var ctx=playOpenSound._ctx||(playOpenSound._ctx=new AC());
    if(ctx.state==='suspended')ctx.resume();
    var now=ctx.currentTime;
    function tone(freq,start,dur,type,vol,freqEnd){
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type=type||'sine';o.frequency.setValueAtTime(freq,now+start);
      if(freqEnd)o.frequency.exponentialRampToValueAtTime(Math.max(40,freqEnd),now+start+dur);
      g.gain.setValueAtTime(0.0001,now+start);
      g.gain.exponentialRampToValueAtTime(vol||0.22,now+start+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,now+start+dur);
      o.connect(g);g.connect(ctx.destination);o.start(now+start);o.stop(now+start+dur+0.02);
    }
    // пузырь: мягкий pop + короткий chime
    tone(180,0,0.10,'sine',0.16,90);
    tone(520,0.04,0.14,'triangle',0.10,420);
    tone(780,0.08,0.18,'sine',0.07,650);
  }catch(e){}
}
function cleanReplyText(s){
  s=String(s==null?'':s);
  s=s.replace(/```[\s\S]*?```/g,function(m){return m.replace(/```\w*\n?/g,'').replace(/```/g,'');});
  s=s.replace(/\*\*([^*]+)\*\*/g,'$1');
  s=s.replace(/__([^_]+)__/g,'$1');
  s=s.replace(/\*([^*]+)\*/g,'$1');
  s=s.replace(/_([^_]+)_/g,'$1');
  s=s.replace(/`([^`]+)`/g,'$1');
  s=s.replace(/^#{1,6}\s*/gm,'');
  s=s.replace(/^\s*[-*]\s+/gm,'• ');
  s=s.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1');
  s=s.replace(/[*]{1,3}/g,'');
  s=s.replace(/\n{3,}/g,'\n\n');
  return s.trim();
}

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
    var _nm='';try{if(typeof window.getUserName==='function')_nm=window.getUserName()||'';}catch(x){}
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
        '<div class="ka-center">'+
          '<div class="ka-bubble" id="kaBubble" role="button" aria-label="Нажми, чтобы говорить">'+
            '<div class="finn-avatar ka-orb-face" id="kaFinnAvatar" data-emotion="idle">'+
              '<span class="finn-aura"></span>'+avatarSvg+
            '</div>'+
            '<div class="ka-ring"></div>'+
            '<div class="ka-ring ka-ring2"></div>'+
            '<button type="button" class="ka-matter-btn" id="kaMatterBtn" aria-label="Материя">'+
              '<span class="ka-matter-orbit"></span><span class="ka-matter-ic">🌌</span>'+
            '</button>'+
          '</div>'+
        '</div>'+
        '<div class="ka-hint" id="kaStatus">'+(_nm?('Привет, '+_nm+'! '):'')+'Нажми на меня, чтобы говорить</div>'+
      '</div>';
    document.body.appendChild(wrap);

    var stage=document.getElementById('kaStage');
    if(stage){
      stage.style.left='0';
      stage.style.width='100%';
      stage.style.top=origin.y+'px';
      stage.style.bottom='auto';
      stage.style.transform='translateY(-50%) scale(0.32)';
      stage.style.opacity='0';
    }
    openingAnim=true;
    void wrap.offsetWidth;
    wrap.classList.add('ka-show');
    try{playOpenSound();}catch(x){}
    requestAnimationFrame(function(){
      if(!stage)return;
      stage.style.transition='transform .55s cubic-bezier(.22,1.1,.36,1), top .55s cubic-bezier(.22,1.1,.36,1), opacity .35s ease';
      stage.style.left='0';
      stage.style.top=target.y+'px';
      stage.style.transform='translateY(-50%) scale(1)';
      stage.style.opacity='1';
      setTimeout(function(){
        openingAnim=false;
        if(opts.matterInvite){
          try{showMatterInvite();}catch(e){}
        }
      },580);
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
    var mBtn=document.getElementById('kaMatterBtn');
    if(mBtn){
      mBtn.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        try{
          if(typeof close==='function')close();
        }catch(x){}
        setTimeout(function(){
          try{
            if(window.FinMatter&&window.FinMatter.enter)window.FinMatter.enter();
            else if(typeof toast==='function')toast('Материя загружается…');
          }catch(err){if(typeof toast==='function')toast('Не удалось открыть Материю');}
        },180);
      });
    }
    var bubbleTap=document.getElementById('kaBubble');
    if(bubbleTap){
      bubbleTap.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        if(listening||wantListen||_micStarting){
          wantListen=false;_micStarting=false;stopListen();
          status('Нажми на меня, чтобы говорить');
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
  '.ka-stage{position:absolute;z-index:2;width:100%;left:0!important;height:180px;display:block;'+
  'will-change:transform,top,opacity;pointer-events:auto}'+
  '.ka-center{position:absolute;left:50%;top:0;transform:translateX(-50%);width:132px;height:132px}'+
  '.ka-center{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px}'+
'.ka-matter-btn{position:absolute;right:-8px;top:-8px;z-index:5;width:38px;height:38px;border-radius:50%;'+
'display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(170,190,255,.5);'+
'background:radial-gradient(circle at 35% 30%,rgba(150,130,255,.55),rgba(30,20,60,.96) 62%,rgba(14,10,30,.98));'+
'box-shadow:0 6px 20px rgba(50,30,110,.5),0 0 18px rgba(150,130,255,.4),inset 0 0 8px rgba(200,190,255,.18);'+
'cursor:pointer;animation:kaMatterFloat 3.6s ease-in-out infinite}'+
'.ka-matter-btn:active{transform:scale(.9)}'+
'.ka-matter-ic{font-size:16px;line-height:1;filter:drop-shadow(0 0 4px rgba(200,190,255,.6))}'+
'.ka-matter-orbit{position:absolute;inset:-6px;border-radius:50%;border:1px dashed rgba(170,190,255,.4);animation:kaMatterSpin 9s linear infinite;pointer-events:none}'+
'@keyframes kaMatterFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}'+
'@keyframes kaMatterSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'+
'.ka-bubble{position:relative;width:132px;height:132px;border-radius:50%;cursor:pointer;'+
  'background:radial-gradient(circle at 35% 30%,rgba(120,210,255,.4),rgba(14,22,40,.92) 55%,rgba(8,12,22,.98));'+
  'border:1.5px solid rgba(94,200,255,.5);'+
  'box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 36px rgba(94,200,255,.26),inset 0 0 20px rgba(94,200,255,.12);'+
  'display:flex;align-items:center;justify-content:center;'+
  'animation:kaBob 3.2s ease-in-out infinite;transform-origin:center center}'+
  '.ka-bubble.thinking{animation:kaThink 1.4s ease-in-out infinite}'+
  '.ka-bubble.listening{animation:kaListen 1.6s ease-in-out infinite;'+
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
  '@keyframes kaBob{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.04)}}'+
  '@keyframes kaThink{0%,100%{transform:translateY(0) scale(1);filter:brightness(1)}50%{transform:translateY(-5px) scale(1.06);filter:brightness(1.1)}}'+
  '@keyframes kaListen{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.07)}}'+
  '@keyframes kaHappy{0%{transform:scale(1)}40%{transform:scale(1.08)}70%{transform:scale(.97)}100%{transform:scale(1)}}'+
  '@keyframes kaShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}'+
  '@keyframes kaTilt{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(7deg)}}'+
  '@keyframes kaNod{0%{transform:rotate(0)}30%{transform:rotate(-8deg) translateY(2px)}60%{transform:rotate(5deg)}100%{transform:rotate(0)}}'+
  '@keyframes kaFaceShake{0%,100%{transform:rotate(0)}30%{transform:rotate(-10deg)}60%{transform:rotate(10deg)}}'+
  '@keyframes kaIdleSway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}'+
  ' .ka-micbtn{display:none!important;position:absolute;left:calc(50% + 86px);top:38px;width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(94,200,255,.4);'+
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
  ' .ka-x{display:none!important;position:absolute;top:-36px;right:-4px;width:30px;height:30px;border-radius:50%;'+
  'border:1px solid rgba(255,255,255,.12);background:rgba(20,28,44,.85);color:#9AA0B0;'+
  'font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;'+
  'pointer-events:auto;opacity:.85}'+
  '.ka-x:active{transform:scale(.9)}'+
  '.ka-reply{position:absolute;left:50%;bottom:calc(22% + 188px);transform:translateX(-50%);'+
  'width:min(90vw,360px);max-height:min(36vh,280px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;'+
  'z-index:3;text-align:center;pointer-events:auto;'+
  'font-size:15.5px;line-height:1.5;font-weight:540;color:#F2F3F7;'+
  'text-shadow:0 2px 16px rgba(0,0,0,.65),0 0 24px rgba(0,0,0,.4);'+
  'padding:4px 6px 8px;opacity:0;transition:opacity .35s ease,transform .35s ease;'+
  'scrollbar-width:thin;scrollbar-color:rgba(94,200,255,.35) transparent}'+
  '.ka-reply::-webkit-scrollbar{width:4px}'+
  '.ka-reply::-webkit-scrollbar-thumb{background:rgba(94,200,255,.35);border-radius:4px}'+
  '.ka-reply.show{opacity:1;transform:translateX(-50%) translateY(0)}'+
  '.ka-reply.hide{opacity:0;transform:translateX(-50%) translateY(8px)}'+
  '.ka-reply .ka-act-row{display:flex;gap:10px;justify-content:center;margin-top:14px;pointer-events:auto}'+
  '.ka-reply .ka-act{padding:10px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.12);'+
  'background:rgba(20,28,44,.88);color:#fff;font-weight:700;font-size:14px;backdrop-filter:blur(8px)}'+
  '.ka-reply .ka-act.ok{background:linear-gradient(135deg,#5EC8FF,#3A8FE8);color:#0A101C;border:0}'+
  '.ka-cal-wrap{width:100%;max-width:min(92vw,340px);margin:0 auto;padding:2px 0 6px;box-sizing:border-box}'+
  '.ka-cal-title{font-size:14px;font-weight:700;margin-bottom:8px;opacity:.95}'+
  '.ka-cal-leg{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:0 0 10px;font-size:11px;color:rgba(180,190,210,.9)}'+
  '.ka-cal-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}'+
  '.ka-cal-leg .l-day{background:rgba(94,200,255,.55)}'+
  '.ka-cal-leg .l-night{background:rgba(167,139,250,.6)}'+
  '.ka-cal-leg .l-off{background:rgba(255,255,255,.18)}'+
  '.ka-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;width:100%}'+
  '.ka-cal .ch{font-size:10px;color:rgba(180,190,210,.75);text-align:center;padding:2px 0;font-weight:600}'+
  '.ka-cal .cd{aspect-ratio:1;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(20,28,44,.82);border:1px solid rgba(255,255,255,.1);color:#E8ECF4;line-height:1.1;min-height:0;padding:2px}'+
  '.ka-cal .cd.day{background:rgba(94,200,255,.22);border-color:rgba(94,200,255,.4)}'+
  '.ka-cal .cd.night{background:rgba(167,139,250,.24);border-color:rgba(167,139,250,.45)}'+
  '.ka-cal .cd.off{background:rgba(255,255,255,.05);color:rgba(180,190,210,.75)}'+
  '.ka-cal .cd.today{box-shadow:0 0 0 2px rgba(251,191,36,.85)}'+
  '.ka-cal .cd .dt{font-size:8px;opacity:.85;margin-top:1px;font-weight:600}'+
  '.ka-reply.ka-cal-mode{max-height:min(48vh,380px);bottom:calc(20% + 150px);text-align:center;width:min(94vw,360px)}'+
'.ka-hint{position:absolute;left:50%;top:150px;transform:translateX(-50%);z-index:3;font-size:12.5px;color:rgba(180,190,210,.9);text-align:center;'+
  'text-shadow:0 1px 8px rgba(0,0,0,.55);pointer-events:none;'+
  'white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis;'+
  'min-height:18px;line-height:1.3;padding:0 8px}'+
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

var _clearReplyTimer=null,_showReplyTimer=null,_pinReply=false;

function showMatterInvite(){
  var el=document.getElementById('kaReply');
  if(!el)return;
  if(_clearReplyTimer){clearTimeout(_clearReplyTimer);_clearReplyTimer=null;}
  if(_showReplyTimer){clearTimeout(_showReplyTimer);_showReplyTimer=null;}
  _pinReply=true;
  el.classList.remove('hide','ka-cal-mode');
  el.innerHTML='';
  var nm='';
  try{if(typeof window.getUserName==='function')nm=window.getUserName()||'';}catch(x){}
  var p=document.createElement('div');
  p.className='ka-reply-text';
  p.textContent=(nm?('Привет, '+nm+'! '):'Привет! ')+'Исследуем Материю? Там созвездия твоих целей, комната и солнце-Фина.';
  el.appendChild(p);
  var row=document.createElement('div');
  row.className='ka-act-row';
  var no=document.createElement('button');
  no.className='ka-act';
  no.type='button';
  no.textContent='Отмена';
  no.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    _pinReply=false;
    clearReply();
    try{status((nm?('Привет, '+nm+'! '):'')+'Нажми на меня, чтобы говорить');}catch(x){}
  };
  var ok=document.createElement('button');
  ok.className='ka-act ok';
  ok.type='button';
  ok.textContent='Да, погнали';
  ok.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    _pinReply=false;
    try{close();}catch(x){}
    setTimeout(function(){
      try{
        if(window.FinMatter&&window.FinMatter.enter)window.FinMatter.enter({tour:true});
        else if(typeof toast==='function')toast('Материя загружается…');
      }catch(err){if(typeof toast==='function')toast('Не удалось открыть Материю');}
    },220);
  };
  row.appendChild(no);
  row.appendChild(ok);
  el.appendChild(row);
  void el.offsetWidth;
  el.classList.add('show');
  try{status('Материя');}catch(x){}
}

function showReply(text,actions){
  var el=document.getElementById('kaReply');
  if(!el)return;
  // отменить отложенную очистку — иначе ответ стирается через 240мс
  if(_clearReplyTimer){clearTimeout(_clearReplyTimer);_clearReplyTimer=null;}
  if(_showReplyTimer){clearTimeout(_showReplyTimer);_showReplyTimer=null;}
  _pinReply=false;
  el.classList.remove('hide','ka-cal-mode');
  el.innerHTML='';
  var p=document.createElement('div');
  p.className='ka-reply-text';
  p.textContent=cleanReplyText(text||'');
  el.appendChild(p);
  el.scrollTop=0;
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
  // force reflow then show
  void el.offsetWidth;
  el.classList.add('show');
}

function clearReply(){
  var el=document.getElementById('kaReply');
  if(!el)return;
  if(_pinReply)return;
  if(_clearReplyTimer){clearTimeout(_clearReplyTimer);_clearReplyTimer=null;}
  if(_showReplyTimer){clearTimeout(_showReplyTimer);_showReplyTimer=null;}
  el.classList.remove('show');
  el.classList.add('hide');
  _clearReplyTimer=setTimeout(function(){
    _clearReplyTimer=null;
    if(_pinReply)return;
    el.innerHTML='';
    el.classList.remove('hide','ka-cal-mode');
  },280);
}

function status(t){
  var e=document.getElementById('kaStatus');
  if(e)e.textContent=t||'';
}

var _speechBuf='',_silenceTimer=null,_finalizing=false,_listenGen=0,_seenFinals={};
var SILENCE_MS=1500;

function clearSilenceTimer(){
  if(_silenceTimer){clearTimeout(_silenceTimer);_silenceTimer=null;}
}

function setListeningUI(on){
  var b=document.getElementById('kaBubble');
  if(on){
    if(b){b.classList.remove('thinking','happy','alert','angry');b.classList.add('listening');}
    kaEmo('listening');
  }else{
    if(b)b.classList.remove('listening');
  }
}

function finalizeSpeech(){
  if(_finalizing)return;
  _finalizing=true;
  clearSilenceTimer();
  var text=String(_speechBuf||'').replace(/\s+/g,' ').trim();
  _speechBuf='';
  _seenFinals={};
  var gen=_listenGen;
  wantListen=false;
  _micStarting=false;
  stopListen();
  _finalizing=false;
  if(gen!==_listenGen)return;
  if(!text){status('Нажми на меня, чтобы говорить');kaEmo('idle');return;}
  if(isOnlyWake(text)){status('Да, слушаю…');setTimeout(function(){startListen();},300);return;}
  status('Думаю…');
  kaEmo('thinking');
  handle(text);
}

function startListen(){
  if(!SR){status('Нет распознавания речи');return;}
  if(listening||_micStarting||_finalizing)return;
  _listenGen++;
  wantListen=true;
  _micStarting=true;
  restarts=0;
  _speechBuf='';
  _seenFinals={};
  _finalizing=false;
  clearSilenceTimer();
  status('Слушаю…');
  setListeningUI(true);
  createRecognition();
}

function createRecognition(){
  if(!wantListen||_finalizing){_micStarting=false;return;}
  if(listening){_micStarting=false;return;}
  try{if(rec){try{rec.onend=null;rec.onerror=null;rec.onresult=null;rec.abort();}catch(x){}rec=null;}}catch(x){}
  rec=new SR();
  rec.lang='ru-RU';
  rec.interimResults=true;   // внутренне для тишины; в UI слова не показываем
  rec.continuous=true;       // одна сессия дольше — меньше системных писков от restart
  rec.maxAlternatives=3;     // берём лучший вариант фразы
  var myGen=_listenGen;
  rec.onstart=function(){
    if(myGen!==_listenGen)return;
    listening=true;
    _micStarting=false;
    setListeningUI(true);
    status('Слушаю…');
  };
  rec.onresult=function(e){
    if(!wantListen||myGen!==_listenGen||_finalizing)return;
    var chunk='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      var res=e.results[i];
      if(!res)continue;
      // лучший из alternatives
      var best='', bestScore=-1;
      var nAlt=res.length||0;
      for(var a=0;a<nAlt;a++){
        var alt=res[a];
        if(!alt)continue;
        var tx=String(alt.transcript||'').trim();
        var sc=(typeof alt.confidence==='number')?alt.confidence:0;
        if(tx && (sc>bestScore || !best)){best=tx;bestScore=sc;}
      }
      if(!best)continue;
      if(res.isFinal){
        var key=best.toLowerCase();
        if(!_seenFinals[key]){_seenFinals[key]=1;chunk+=(chunk?' ':'')+best;}
      }
    }
    if(chunk){
      _speechBuf=(_speechBuf?(_speechBuf+' '):'')+chunk;
      _speechBuf=_speechBuf.replace(/\s+/g,' ').trim();
    }
    // слова в UI не показываем — только статус слушания
    status('Слушаю…');
    if(_speechBuf){
      clearSilenceTimer();
      _silenceTimer=setTimeout(function(){if(myGen===_listenGen)finalizeSpeech();},SILENCE_MS);
    }
  };
  rec.onerror=function(e){
    if(myGen!==_listenGen)return;
    var code=e&&e.error||'';
    listening=false;
    _micStarting=false;
    try{if(rec){rec.onend=null;rec.onresult=null;rec.abort();}}catch(x){}
    rec=null;
    if(code==='not-allowed'){
      clearSilenceTimer();wantListen=false;_speechBuf='';_seenFinals={};
      status('Нет доступа к микрофону');kaEmo('alert',1800);setListeningUI(false);return;
    }
    if(code==='aborted')return;
    if(_speechBuf){
      clearSilenceTimer();
      _silenceTimer=setTimeout(function(){if(myGen===_listenGen)finalizeSpeech();},200);
      return;
    }
    // без рестартов — ждём повторного нажатия
    wantListen=false;setListeningUI(false);
    status('Нажми на меня, чтобы говорить');kaEmo('idle');
  };
  rec.onend=function(){
    if(myGen!==_listenGen)return;
    listening=false;
    _micStarting=false;
    rec=null;
    if(!wantListen||_finalizing){setListeningUI(false);return;}
    if(_speechBuf){
      if(!_silenceTimer)_silenceTimer=setTimeout(function(){if(myGen===_listenGen)finalizeSpeech();},200);
      return;
    }
    // тишина / пусто — стоп, без автоперезапуска
    wantListen=false;
    setListeningUI(false);
    status('Нажми на меня, чтобы говорить');
    kaEmo('idle');
  };
  try{rec.start();}catch(e){
    rec=null;listening=false;_micStarting=false;wantListen=false;
    setListeningUI(false);
    status('Микрофон не запустился');kaEmo('alert',1600);
  }
}

function stopListen(){
  wantListen=false;
  _micStarting=false;
  clearSilenceTimer();
  if(rec){try{rec.onend=null;rec.onerror=null;rec.onresult=null;rec.stop();}catch(e){try{rec.abort();}catch(x){}}rec=null;}
  listening=false;
  setListeningUI(false);
}

function isMicLocked(){return false;}

function maybeResumeListen(ms){
  status('Нажми на меня, чтобы говорить');
  kaEmo('idle');
}

function confirmWord(t){return /^(да|ага|угу|подтверждаю|сделай|выполняй|верно|правильно|ок|окей|yes|удали)$/i.test(norm(t));}
function cancelWord(t){return /^(нет|отмена|отменить|не надо|не делай|стоп)$/i.test(norm(t));}


function showAssistantCalendar(month){
  _pinReply=true;
  if(_clearReplyTimer){clearTimeout(_clearReplyTimer);_clearReplyTimer=null;}
  month=month||(window.today?window.today().slice(0,7):(new Date().toISOString().slice(0,7)));
  try{
    if(!month&&window.STATE&&window.STATE.settings)month=window.STATE.settings.month;
  }catch(e){}
  var p=String(month).split('-').map(Number);
  var y=p[0],m=p[1];
  var first=new Date(y,m-1,1),sw=(first.getDay()+6)%7,dim=new Date(y,m,0).getDate();
  var t=new Date();var td=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  var ov=(window.STATE&&window.STATE.shiftsOverride)||{};
  var labels={day:'Д',night:'Н',off:'В'};
  function sh(ds){
    try{
      if(typeof window.shift==='function')return window.shift(ds,ov);
    }catch(e){}
    var v=ov[ds];return (v==='day'||v==='night'||v==='off')?v:'day';
  }
  var monthNames=['','январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  var title=(monthNames[m]||'')+' '+y;
  var html='<div class="ka-cal-wrap">';
  html+='<div class="ka-cal-title">Календарь смен · '+title+'</div>';
  html+='<div class="ka-cal-leg"><span><i class="l-day"></i>День</span><span><i class="l-night"></i>Ночь</span><span><i class="l-off"></i>Выходной</span></div>';
  html+='<div class="ka-cal">';
  ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(h){html+='<div class="ch">'+h+'</div>';});
  for(var i=0;i<sw;i++)html+='<div class="cd" style="opacity:.2"></div>';
  for(var d=1;d<=dim;d++){
    var ds=month+'-'+String(d).padStart(2,'0');
    var s=sh(ds);
    var full={day:'День',night:'Ночь',off:'Вых'}[s]||'';
    html+='<div class="cd '+s+(ds===td?' today':'')+'" title="'+ds+' · '+full+'">'+d+'<span class="dt">'+(labels[s]||'')+'</span></div>';
  }
  html+='</div></div>';
  var el=document.getElementById('kaReply');
  if(!el)return;
  el.classList.remove('hide');
  el.classList.add('ka-cal-mode');
  el.innerHTML=html;
  el.scrollTop=0;
  requestAnimationFrame(function(){el.classList.add('show');});
  status('Нажми на меня, чтобы говорить');
  setTimeout(function(){_pinReply=false;},50);
}

function parseMonthToken(t){
  var map={
    'январ':1,'январь':1,'января':1,
    'феврал':2,'февраль':2,'февраля':2,
    'март':3,'марта':3,
    'апрел':4,'апрель':4,'апреля':4,
    'май':5,'мая':5,
    'июн':6,'июнь':6,'июня':6,
    'июл':7,'июль':7,'июля':7,
    'август':8,'августа':8,
    'сентябр':9,'сентябрь':9,'сентября':9,
    'октябр':10,'октябрь':10,'октября':10,
    'ноябр':11,'ноябрь':11,'ноября':11,
    'декабр':12,'декабрь':12,'декабря':12
  };
  var now=new Date();
  var y=now.getFullYear(), m=null;
  var keys=Object.keys(map);
  for(var i=0;i<keys.length;i++){
    if(t.indexOf(keys[i])>=0){m=map[keys[i]];break;}
  }
  // «за 9», «на 09 месяц»
  if(m==null){
    var mm=t.match(/(?:за|на|про)\s*(\d{1,2})(?:\s*месяц)?/);
    if(mm){var n=parseInt(mm[1],10);if(n>=1&&n<=12)m=n;}
  }
  if(m==null)return null;
  // если месяц уже прошёл в этом году и просят «за сентябрь» в октябре — текущий год ок;
  // если просят будущий относительно января после декабря — оставим текущий год
  return y+'-'+String(m).padStart(2,'0');
}

function parseShiftVoice(cmd){
  var t=norm(cmd);
  if(/календар/.test(t)||/покажи\s*смен/.test(t)||/какие\s*смен/.test(t)){
    var mon=parseMonthToken(t);
    return{showCal:true,month:mon||null};
  }
  if(!/(смен|выходн|дневн|ночн)/.test(t))return null;
  var shiftType=null;
  if(/выходн/.test(t))shiftType='off';
  else if(/ноч/.test(t))shiftType='night';
  else if(/дневн|день/.test(t))shiftType='day';
  if(!shiftType)return null;
  var days=[];
  var re=/(\d{1,2})/g,m;
  while((m=re.exec(t))){
    var n=parseInt(m[1],10);
    if(n>=1&&n<=31)days.push(n);
  }
  if(!days.length)return null;
  var month=(window.STATE&&window.STATE.settings&&window.STATE.settings.month)||new Date().toISOString().slice(0,7);
  var actions=days.map(function(d){
    return{type:'change_shift',date:month+'-'+String(d).padStart(2,'0'),shift:shiftType};
  });
  return{actions:actions,summary:'Смены: '+days.join(', ')+' → '+(shiftType==='day'?'день':shiftType==='night'?'ночь':'выходной')};
}

function parseSettingsVoice(cmd){
  var t=norm(cmd);
  // уведомления смен
  if(/(выключи|отключи|выруб).{0,20}уведомл/.test(t)||/уведомл.{0,12}(выкл|откл)/.test(t)){
    return{actions:[{type:'set_shift_notif',enabled:false}],summary:'Выключить напоминания о сменах'};
  }
  if(/(включи|вруби).{0,20}уведомл/.test(t)||/уведомл.{0,12}вкл/.test(t)){
    return{actions:[{type:'set_shift_notif',enabled:true}],summary:'Включить напоминания о сменах'};
  }
  // горизонт лимита
  if(/(лимит|трат).{0,40}(до\s+зарплат|к\s+зарплат)/.test(t)||/считай.{0,20}до\s+зарплат/.test(t)){
    return{actions:[{type:'set_limit_horizon',horizon:'payday'}],summary:'Лимит считать до зарплаты'};
  }
  if(/(лимит|трат).{0,40}(до\s+конца\s+месяц|до\s+конца\s+месяца)/.test(t)||/считай.{0,20}до\s+конца\s+месяц/.test(t)){
    return{actions:[{type:'set_limit_horizon',horizon:'month'}],summary:'Лимит считать до конца месяца'};
  }
  // имя
  var nm=t.match(/(?:зови\s+меня|меня\s+зовут|мо[её]\s+имя|запомни\s+имя)\s+([a-zA-Zа-яА-ЯёЁ][a-zA-Zа-яА-ЯёЁ\-]{1,30})/);
  if(nm){
    return{actions:[{type:'set_user_name',name:nm[1]}],summary:'Запомнить имя «'+nm[1]+'»'};
  }

  // ручной / авто лимит
  var ml=t.match(/(ручной\s+)?лимит\s+(на\s+день\s+)?(\d[\d\s]*)/);
  if(ml&&/(поставь|установи|сделай|измени)/.test(t)){
    var a=n(ml[3].replace(/\s/g,''));
    if(a>0)return{actions:[{type:'set_daily_limit',amount:a}],summary:'Ручной лимит на день: '+fmt(a)};
  }
  if(/авто(матический)?\s+лимит/.test(t)||/лимит\s+авто/.test(t)){
    return{actions:[{type:'set_daily_limit',amount:null}],summary:'Вернуть автоматический лимит'};
  }
  // день зарплаты
  var pd=t.match(/день\s+зарплат[ыа]?\s*(\d{1,2})/);
  if(pd){
    var day=parseInt(pd[1],10);
    if(day>=1&&day<=31)return{actions:[{type:'set_payday_day',day:day}],summary:'День зарплаты: '+day};
  }
  if(/убери\s+день\s+зарплат|без\s+дня\s+зарплат|зарплат[аы]\s+не\s+зада/.test(t)){
    return{actions:[{type:'set_payday_day',day:null}],summary:'Убрать день зарплаты (считать до конца месяца)'};
  }
  return null;
}

function handle(text){
  var raw=String(text||'').trim();
  var cmd=stripWake(raw);
  if(!cmd){
    if(isOnlyWake(raw)){status('Скажи запрос');setTimeout(startListen,250);return;}
    cmd=raw;
  }
  _pinReply=false;
  clearReply();
  history.push({role:'user',content:cmd});saveHistory();
  // локальные настройки — без ИИ
  var localSet=parseSettingsVoice(cmd);
  if(localSet&&localSet.actions&&localSet.actions.length){
    pending=localSet.actions;
    showReply(localSet.summary,pending);
    status('Скажи «да» или «нет»');
    setTimeout(function(){if(pending)startListen();},400);
    return;
  }
  var localShift=parseShiftVoice(cmd);
  if(localShift&&localShift.showCal){
    var calMonth=localShift.month||null;
    setTimeout(function(){showAssistantCalendar(calMonth);},260);
    maybeResumeListen(200);
    return;
  }
  if(localShift&&localShift.actions&&localShift.actions.length){
    pending=localShift.actions;
    showReply(localShift.summary,pending);
    status('Скажи «да» или «нет»');
    setTimeout(function(){if(pending)startListen();},350);
    return;
  }
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
    showReply(a);status('Нажми на меня, чтобы говорить');kaEmo('angry',1800);
  });
}

function describe(a){
  var t=a&&a.type;if(!t)return 'Неизвестное действие';
  if(t==='add_expense')return'Расход: '+(a.name||a.category||'Прочее')+' — '+fmt(a.amount);
  if(t==='add_income')return'Доход: '+(a.name||'Доход')+' — +'+fmt(a.amount);
  if(t==='add_debt')return'Новый долг «'+(a.name||'')+'»: '+fmt(a.amount);
  if(t==='pay_debt')return'Платёж по долгу «'+(a.name||'')+'»: '+fmt(a.amount);
  if(t==='increase_debt')return'Увеличить долг «'+(a.name||'')+'» на '+fmt(a.amount);
  if(t==='set_limit_horizon')return'Лимит: '+(a.horizon==='month'?'до конца месяца':'до зарплаты');
  if(t==='set_shift_notif')return(a.enabled===false?'Выключить':'Включить')+' напоминания о сменах';
  if(t==='set_user_name')return'Имя: '+(a.name||'');
  if(t==='set_daily_limit')return a.amount==null?'Авто-лимит':'Ручной лимит '+fmt(a.amount);
  if(t==='set_payday_day')return a.day==null?'Убрать день зарплаты':'День зарплаты '+a.day;
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
  if(t==='add_expense'){if(amt<=0)throw Error('Сумма расхода > 0');var _nid=id();s.expenses.push({id:_nid,amount:amt,category:cat,note:canonicalName(a.name||cat),date:dateOf(a),createdAt:Date.now()});s.lastOp={kind:'expense',id:_nid};}
  else if(t==='add_income'){if(amt<=0)throw Error('Сумма дохода > 0');var _iid=id();s.income.push({id:_iid,amount:amt,note:String(a.name||'Доход'),date:dateOf(a),createdAt:Date.now()});s.lastOp={kind:'income',id:_iid};}
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
  else if(t==='set_limit_horizon'){
    s.settings=s.settings||{};
    var hz=a.horizon==='month'?'month':'payday';
    s.settings.limitHorizon=hz;
  }
  else if(t==='set_shift_notif'){
    s.settings=s.settings||{};
    s.settings.shiftNotifEnabled=a.enabled!==false;
  }
  else if(t==='set_user_name'){
    var nm=String(a.name||'').trim().slice(0,40);
    if(!nm)throw Error('Укажи имя');
    s.settings=s.settings||{};
    s.settings.userName=nm;
    try{if(typeof window.setUserName==='function')window.setUserName(nm);else localStorage.setItem('finna_user_name',nm);}catch(e){}
  }
  else if(t==='set_daily_limit'){
    s.settings=s.settings||{};
    if(a.amount==null||a.amount===''||!(amt>0))s.settings.manualDailyLimit=null;
    else s.settings.manualDailyLimit=amt;
  }
  else if(t==='set_payday_day'){
    s.settings=s.settings||{};
    var day=a.day==null?null:n(a.day);
    if(day!=null&&(day<1||day>31))throw Error('День зарплаты 1–31');
    s.settings.paydayDay=day;
    if(day==null&&s.settings.limitHorizon==='payday')s.settings.limitHorizon='month';
  }
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
    try{if(typeof window.syncReminders==='function')window.syncReminders();}catch(x){}
    try{if(typeof window.render==='function')window.render();}catch(x){}
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
