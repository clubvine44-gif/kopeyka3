/* matter.js — Материя: black-hole → constellation door → cozy room + Finn */
(function(){
'use strict';

var KEY='finna_matter_v2';
var root=null, canvas=null, ctx=null, raf=0, phase='idle';
var stars=[], particles=[], door=null, cam={x:0,y:0,z:1};
var W=0,H=0,dpr=1, lastT=0, ambient=null, roomOpen=false;
var MS=loadState();
var finn=null; // canvas Finn state
var roomAudio=null;
var matterMuted=false;
try{matterMuted=localStorage.getItem("finna_matter_muted")==="1";}catch(e){}

var unlockedRoomAudio=null;
var listenOnce=false;
var rec=null;

function loadState(){
  try{
    var r=JSON.parse(localStorage.getItem(KEY)||'{}');
    return {
      plantLevel: Math.min(3, Math.max(0, Number(r.plantLevel)||0)),
      plantWateredAt: r.plantWateredAt||0,
      doorUnlocked: r.doorUnlocked!==false,
      visitedRoom: !!r.visitedRoom,
      notes: Array.isArray(r.notes)?r.notes.slice(0,40):[],
      diary: String(r.diary||''),
      firstEnter: r.firstEnter||null,
      books: r.books||{},
      pageByBook: r.pageByBook||{},
      notesList: Array.isArray(r.notesList)?r.notesList:[],
      diaryDays: r.diaryDays&&typeof r.diaryDays==='object'?r.diaryDays:{}
    };
  }catch(e){
    return {plantLevel:0,plantWateredAt:0,doorUnlocked:true,visitedRoom:false,notes:[],diary:'',firstEnter:null,books:{},pageByBook:{},notesList:[],diaryDays:{}};
  }
}
function saveState(){
  try{localStorage.setItem(KEY,JSON.stringify(MS));}catch(e){}
}
function toast(m){if(typeof window.toast==='function')window.toast(m);}

function getGoals(){
  var list=[];
  try{
    var st=window.STATE||{};
    (st.reserves||[]).forEach(function(r){
      if(!r||r.deleted)return;
      var tgt=Number(r.target)||0, sav=Number(r.saved)||0;
      var pct=tgt>0?Math.min(100,Math.round(sav/tgt*100)):(sav>0?50:0);
      list.push({id:r.id,type:'goal',name:String(r.name||'Цель'),saved:sav,target:tgt,pct:pct,urgent:!!r.urgent});
    });
    (st.debts||[]).forEach(function(d){
      if(!d)return;
      var left=Math.max(0,(Number(d.total)||0)-(Number(d.paid)||0));
      if(left<=0)return;
      list.push({id:'debt_'+d.id,type:'debt',name:String(d.name||'Долг'),saved:Number(d.paid)||0,target:Number(d.total)||0,pct:0,urgent:false});
    });
  }catch(e){}
  if(!list.length){
    list=[
      {id:'demo1',type:'goal',name:'Подушка безопасности',saved:12000,target:50000,pct:24},
      {id:'demo2',type:'goal',name:'Права',saved:8000,target:30000,pct:27},
      {id:'demo3',type:'goal',name:'Отпуск',saved:0,target:100000,pct:0}
    ];
  }
  return list.slice(0,12);
}

/* ---------- audio ---------- */
var AC=null;
function ac(){
  if(AC)return AC;
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
  return AC;
}
function playCreak(){
  var a=ac();if(!a)return;
  try{
    var t=a.currentTime;
    var o=a.createOscillator(), g=a.createGain(), f=a.createBiquadFilter();
    o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(70,t+0.55);
    f.type='lowpass';f.frequency.value=900;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.08,t+0.05);g.gain.exponentialRampToValueAtTime(0.0001,t+0.7);
    o.connect(f);f.connect(g);g.connect(a.destination);
    o.start(t);o.stop(t+0.72);
  }catch(e){}
}
function startAmbient(){
  stopAmbient();
  // Используем заранее «разблокированный» на клике элемент, если он есть —
  // иначе .play() после setTimeout будет заблокирован политикой автозапуска.
  try{
    if(unlockedRoomAudio){
      roomAudio=unlockedRoomAudio;
      roomAudio.loop=true;
      roomAudio.volume=0.22;
      roomAudio.currentTime=0;
      var p2=roomAudio.play();
      if(p2&&p2.catch)p2.catch(function(){ startSynthAmbient(); });
      ambient={type:'mp3'};
      applyMatterMute();
      return;
    }
    roomAudio=new Audio('matter-room.mp3');
    roomAudio.loop=true;
    roomAudio.volume=0.22;
    var p=roomAudio.play();
    if(p&&p.catch)p.catch(function(){ startSynthAmbient(); });
    ambient={type:'mp3'};
    applyMatterMute();
    return;
  }catch(e){}
  startSynthAmbient();
}
function startSynthAmbient(){
  var a=ac();if(!a)return;
  try{
    if(a.state==='suspended')a.resume();
    var master=a.createGain();master.gain.value=0.03;master.connect(a.destination);
    ambient={nodes:[],master:master,a:a,type:'synth'};
    [196,246.94,293.66].forEach(function(freq,i){
      var o=a.createOscillator(), g=a.createGain();
      o.type='sine';o.frequency.value=freq*(i===1?1.005:1);
      g.gain.value=0.2/(i+1);
      var lfo=a.createOscillator(), lg=a.createGain();
      lfo.frequency.value=0.04+i*0.02;lg.gain.value=0.07;
      lfo.connect(lg);lg.connect(g.gain);
      o.connect(g);g.connect(master);
      o.start();lfo.start();
      ambient.nodes.push(o,lfo,g,lg);
    });
  }catch(e){ambient=null;}
}
function stopAmbient(){
  try{
    if(roomAudio){
      roomAudio.pause();
      // не убиваем unlockedRoomAudio — иначе при повторном входе в комнату музыка молчит
      if(roomAudio!==unlockedRoomAudio){
        try{roomAudio.src='';}catch(e){}
      }else{
        try{roomAudio.currentTime=0;}catch(e){}
      }
      roomAudio=null;
    }
  }catch(e){}
  if(ambient&&ambient.type==='synth'){
    try{
      ambient.nodes.forEach(function(n){try{n.stop&&n.stop();}catch(e){} try{n.disconnect&&n.disconnect();}catch(e){}});
      ambient.master.disconnect();
    }catch(e){}
  }
  ambient=null;
}



function bindMuteBtn(){
  var b=document.getElementById('matterMuteBtnRoom');
  if(b&&!b._bound){
    b._bound=true;
    b.onclick=function(e){e.preventDefault();e.stopPropagation();toggleMatterMute();};
  }
  applyMatterMute();
}

function applyMatterMute(){
  try{
    if(roomAudio){
      roomAudio.muted=!!matterMuted;
      if(!matterMuted)roomAudio.volume=0.22;
    }
    if(ambient&&ambient.type==='synth'&&ambient.master){
      ambient.master.gain.value=matterMuted?0:0.024;
    }
  }catch(e){}
  var btn=document.getElementById('matterMuteBtnRoom');
  if(btn)btn.textContent=matterMuted?'🔇':'🔊';
}
function toggleMatterMute(){
  matterMuted=!matterMuted;
  try{localStorage.setItem('finna_matter_muted',matterMuted?'1':'0');}catch(e){}
  applyMatterMute();
  if(matterMuted)pauseRoomAudio();
  else resumeRoomAudio();
}

/* ---------- soft Finn speech (like main app) ---------- */
var speechEmbers=[];

function finnSay(text){
  if(!text)return;
  // обычный диалог как в основном приложении Финны
  var el=document.getElementById('matterDialog');
  if(!el){
    el=document.createElement('div');
    el.id='matterDialog';
    el.className='m-dialog';
    if(root)root.appendChild(el);
  }
  // убрать burn-слой если остался
  var burn=document.getElementById('matterSpeech');
  if(burn){burn.innerHTML='';burn.style.display='none';}
  el.textContent=text;
  el.classList.add('show');
  clearTimeout(finnSay._t);
  finnSay._t=setTimeout(function(){el.classList.remove('show');},4800);
  try{
    if(window.speechSynthesis){
      window.speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(text);
      u.lang='ru-RU';u.rate=0.95;u.pitch=1.05;
      window.speechSynthesis.speak(u);
    }
  }catch(e){}
}



/* ---------- root shell ---------- */
function ensureRoot(){
  if(root)return root;
  root=document.createElement('div');
  root.id='matterRoot';
  root.setAttribute('aria-hidden','true');
  root.innerHTML=
    '<canvas id="matterCanvas"></canvas>'+
    '<div id="matterHud" class="m-hud" hidden>'+
      '<button type="button" class="m-exit" id="matterExit">✕</button>'+
      '<div class="m-title">МОЯ МАТЕРИЯ</div>'+
    '</div>'+
    '<div id="matterRoom" class="m-room" hidden>'+
      '<div class="m-room-scene" id="matterRoomScene">'+
        '<div class="m-room-bg"></div>'+
        /* Hotspots: размер зоны ≈ размер объекта; дневник точно на книге-дневнике */
        '<button type="button" class="m-hot m-hot-sm" data-obj="diary"  style="left:13%;top:85%;width:96px;height:80px" title="Дневник"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="book"   style="left:50%;top:71%" title="Книга"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="plant"  style="left:73%;top:55%" title="Растение"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="piggy"  style="left:77%;top:40%" title="Копилка"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="goals"  style="left:81%;top:26%" title="Цели"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="window" style="left:47%;top:39%;width:150px;height:100px" title="Окно"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="desk"   style="left:47%;top:56%" title="Стол"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="bed"    style="left:15%;top:55%" title="Кровать"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="lamp"   style="left:35%;top:44%" title="Лампа"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="focus"  style="left:10%;top:38%" title="Фокус"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="door"   style="left:93%;top:48%" title="Выход"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="globe"  style="left:88%;top:87%" title="Светильник"></button>'+
        '<button type="button" id="matterMuteBtnRoom" class="m-mute" aria-label="Звук">🔊</button>'+
      '</div>'+
    '</div>'+
    '<div id="matterPanel" class="m-panel" hidden>'+
      '<div class="m-panel-card">'+
        '<div class="m-panel-title" id="mPanelTitle"></div>'+
        '<div class="m-panel-body" id="mPanelBody"></div>'+
        '<button type="button" class="m-panel-close" id="mPanelClose">Закрыть</button>'+
      '</div>'+
    '</div>'+
    '<input type="file" id="mBookFile" accept=".fb2,.txt,text/plain,application/x-fictionbook+xml" style="position:fixed;left:-9999px;width:1px;height:1px;opacity:0" tabindex="-1" aria-hidden="true">'+
    '<div id="matterReader" class="m-reader" hidden>'+
      '<div class="m-reader-head" id="mReaderHead"><span id="mReaderTitle">Книга</span><button type="button" id="mReaderClose">✕</button></div>'+
      '<div class="m-reader-page" id="mReaderPage"></div>'+
      '<div class="m-reader-foot" id="mReaderFoot"><span id="mReaderProg">1 / 1</span></div>'+
    '</div>';
  injectCSS();
  document.body.appendChild(root);
  canvas=document.getElementById('matterCanvas');
  ctx=canvas.getContext('2d');
  document.getElementById('matterExit').onclick=function(){if(tourLock||startMatterTour._running)return;exitMatter();};
  document.getElementById('mPanelClose').onclick=function(){hidePanel();};
  document.getElementById('matterPanel').addEventListener('click',function(e){
    if(e.target&&e.target.id==='matterPanel')hidePanel();
  });
  document.getElementById('mReaderClose').onclick=function(){closeReader();};
  root.querySelectorAll('.m-hot').forEach(function(b){
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();onObject(b.dataset.obj);});
  });
  // один путь ввода — без двойного click+touchend (из‑за него мигали панели)
  canvas.addEventListener('pointerup',function(e){
    if(e.pointerType==='mouse' && e.button!==0)return;
    e.preventDefault();
    onCanvasTap({clientX:e.clientX,clientY:e.clientY,preventDefault:function(){}});
  });
  canvas.addEventListener('click',function(e){e.preventDefault();},{passive:false});
  setupReaderSwipe();
  // history back
  window.addEventListener('popstate',function(ev){
    if(phase==='idle')return;
    handleBack();
  });
  window.__matterBack=function(){return handleBack();};
  return root;
}

function injectCSS(){
  if(document.getElementById('matterCSS'))return;
  var s=document.createElement('style');
  s.id='matterCSS';
  s.textContent=
'#matterRoot{position:fixed;inset:0;z-index:2000;background:#000;display:none;overflow:hidden;touch-action:none}'+
'#matterRoot.on{display:block}'+
'#matterCanvas{position:absolute;inset:0;width:100%;height:100%;display:block}'+
'.m-hud{position:absolute;left:0;right:0;top:0;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 8px;display:flex;align-items:center;justify-content:space-between;pointer-events:none;z-index:5}'+
'.m-hud button{pointer-events:auto}'+
'.m-exit{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#E8F0FF;font-size:14px}'+
'.m-title{position:absolute;left:50%;transform:translateX(-50%);font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:600;letter-spacing:.22em;font-size:13px;color:#E8F4FF;'+
  'text-shadow:0 0 12px rgba(120,180,255,.9),0 0 28px rgba(80,140,255,.55),0 0 48px rgba(60,100,255,.35);opacity:1;pointer-events:none;white-space:nowrap}'+
'.m-title.dissolve{animation:mTitleDust 2.4s ease-in forwards}'+
'@keyframes mTitleDust{0%{opacity:1;filter:blur(0);letter-spacing:.22em;transform:translateX(-50%) scale(1);color:#E8F4FF;text-shadow:0 0 12px rgba(200,230,255,.9)}'+
'35%{opacity:.9;filter:blur(0.5px);color:#fff;letter-spacing:.28em;text-shadow:0 0 28px rgba(255,255,255,.95)}'+
'100%{opacity:0;filter:blur(7px);letter-spacing:.6em;transform:translateX(-50%) scale(1.1);color:rgba(255,255,255,0);text-shadow:0 0 40px rgba(255,255,255,0)}}'+
'.m-hint{font-size:11px;color:rgba(180,200,230,.65);max-width:40%;text-align:right}'+
'.m-room{position:absolute;inset:0;z-index:10;background:#0a0604}'+
'.m-room-scene{position:absolute;inset:0;overflow:hidden}'+
'.m-room-bg{position:absolute;inset:0;background:#0a0604 url(matter-room.jpg) center center/cover no-repeat}'+
/* Hotspots: невидимые, разные размеры под объекты */
'.m-hot{position:absolute;margin:0;padding:0;border:0;background:transparent;'+
  'border-radius:50%;transform:translate(-50%,-50%);z-index:3;cursor:pointer;-webkit-tap-highlight-color:transparent;'+
  'pointer-events:auto}'+
'.m-hot-sm{width:64px;height:64px}'+
'.m-hot-md{width:80px;height:80px}'+
'.m-hot-lg{width:110px;height:96px;border-radius:24px}'+
'.m-hot:active{background:rgba(255,220,120,.12);box-shadow:0 0 22px rgba(255,200,80,.28)}.m-mute{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:14px;z-index:30;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.45);color:#E8F0FF;font-size:20px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.m-mute:active{transform:scale(.94)}'+
'.m-room-finn{position:absolute;left:12%;bottom:14%;transform:none;z-index:8;width:120px;height:120px;pointer-events:none}'+
'.m-room-finn canvas{width:120px;height:120px;display:block;pointer-events:none}'+
'.m-finn-x{position:absolute;top:-4px;right:-4px;width:28px;height:28px;border-radius:50%;'+
  'background:rgba(20,12,18,.85);border:1px solid rgba(255,255,255,.2);color:#F8E8F0;font-size:13px;'+
  'pointer-events:auto;z-index:9;display:flex;align-items:center;justify-content:center}'+
'.m-finn-bubble{position:absolute;left:50%;bottom:108%;transform:translateX(-50%) translateY(6px);'+
  'min-width:120px;max-width:220px;padding:8px 12px;border-radius:14px;'+
  'background:rgba(18,12,24,.92);border:1px solid rgba(232,120,249,.35);color:#F5E6F8;'+
  'font-size:12px;line-height:1.35;text-align:center;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;'+
  'box-shadow:0 4px 20px rgba(0,0,0,.45)}'+
'.m-finn-bubble.show{opacity:1;transform:translateX(-50%) translateY(0)}'+
'.m-panel{position:absolute;inset:0;z-index:20;background:radial-gradient(ellipse at 50% 100%,rgba(40,20,60,.55),rgba(0,0,0,.72));display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))}'+
'.m-panel-card{width:100%;max-width:400px;background:linear-gradient(165deg,rgba(28,18,40,.96),rgba(12,10,20,.98));'+
  'border:1px solid rgba(255,180,220,.22);border-radius:28px;padding:20px 18px 16px;'+
  'box-shadow:0 -8px 40px rgba(0,0,0,.5);max-height:70vh;overflow:auto}'+
'.m-panel-title{font-size:17px;font-weight:800;margin-bottom:8px;color:#F5E6C8}'+
'.m-panel-body{font-size:14px;line-height:1.45;color:rgba(230,220,200,.9);margin-bottom:14px;white-space:pre-wrap}'+
'.m-panel-body .m-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.08);margin:8px 0 4px;overflow:hidden}'+
'.m-panel-body .m-bar>i{display:block;height:100%;background:linear-gradient(90deg,#E5A75E,#F0C060);border-radius:99px}'+
'.m-panel-body button.m-act{display:block;width:100%;margin-top:10px;padding:12px;border-radius:12px;'+
'.m-book-row{display:flex;align-items:center;gap:10px;padding:12px;margin-top:8px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}'+
'.m-book-row .m-book-info{flex:1;min-width:0}'+
'.m-book-row .m-book-title{font-weight:700;color:#F5E6C8;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.m-book-row .m-book-meta{font-size:12px;color:rgba(200,190,170,.65);margin-top:3px}'+
'.m-book-row .m-book-del{width:36px;height:36px;border-radius:10px;border:0;background:rgba(220,80,80,.2);color:#f8a0a0;font-size:16px;flex-shrink:0}'+
'.m-book-row .m-book-open{padding:8px 12px;border-radius:10px;border:0;background:rgba(255,200,100,.18);color:#F5E6C8;font-size:13px;font-weight:700;flex-shrink:0}'+
'.m-lib{display:flex;flex-direction:column;gap:12px}'+
'.m-lib-load{width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(140,180,255,.28);'+
'background:linear-gradient(145deg,rgba(40,55,90,.9),rgba(18,24,40,.95));color:#E8F0FF;font-size:15px;font-weight:700}'+
'.m-lib-empty{padding:28px 12px;text-align:center;color:rgba(180,200,230,.55);font-size:14px;line-height:1.5}'+
'.m-lib-list{display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow:auto;-webkit-overflow-scrolling:touch}'+
'.m-lib-item{display:flex;align-items:stretch;gap:8px;padding:12px;border-radius:14px;'+
'border:1px solid rgba(140,170,220,.16);background:rgba(16,22,38,.85);cursor:pointer}'+
'.m-lib-item-main{flex:1;min-width:0}'+
'.m-lib-item-title{font-size:15px;font-weight:700;color:#EEF2FF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.m-lib-item-meta{font-size:12px;color:rgba(170,190,220,.6);margin-top:4px}'+
'.m-lib-bar{height:3px;border-radius:99px;background:rgba(255,255,255,.06);margin-top:8px;overflow:hidden}'+
'.m-lib-bar i{display:block;height:100%;background:linear-gradient(90deg,#6a9cff,#c4a0ff);border-radius:99px}'+
'.m-lib-del{width:40px;flex-shrink:0;border:0;border-radius:12px;background:rgba(220,70,70,.15);color:#f0a0a0;font-size:15px}'+
'.m-lib-status{font-size:12px;color:rgba(180,200,230,.55);min-height:16px}'+
'.m-panel-body{max-height:62vh;overflow:auto;-webkit-overflow-scrolling:touch}'+

'.m-lib-status{font-size:12px;opacity:.7;margin:8px 0}'+
  'background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;font-weight:700;border:0}'+
'.m-panel-close{width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.07);'+
  'border:1px solid rgba(255,255,255,.12);color:#E8F0FF;font-weight:600}'+
/* reader — single page, swipe only */
'.m-reader{position:absolute;inset:0;z-index:30;background:#0c0a0e;display:flex;flex-direction:column;padding:0}'+
'.m-reader-head{position:absolute;left:0;right:0;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;'+
'padding:10px 16px;padding-top:calc(8px + env(safe-area-inset-top,0px));color:#E8DCC8;font-size:13px;'+
'transition:opacity .25s,transform .25s;background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);pointer-events:auto}'+
'.m-reader-head button{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#E8F0FF}'+
'.m-reader.chrome-hide .m-reader-head,.m-reader.chrome-hide .m-reader-foot{opacity:0;pointer-events:none;transform:translateY(-6px)}'+
'.m-reader.chrome-hide .m-reader-foot{transform:translateY(6px)}'+
'.m-cosmos-menu{display:flex;flex-direction:column;gap:12px;padding:4px 0 8px}'+
'.m-cosmos-lead{margin:0 0 6px;font-size:13px;letter-spacing:.04em;color:rgba(200,215,240,.55);font-weight:500}'+
'.m-cosmos-btn{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:16px 14px;border-radius:16px;'+
'border:1px solid rgba(140,170,220,.2);background:linear-gradient(145deg,rgba(30,40,70,.85),rgba(12,16,28,.95));color:#E8F0FF;cursor:pointer}'+
'.m-cosmos-btn:active{transform:scale(.98);border-color:rgba(180,210,255,.4)}'+
'.m-cosmos-ico{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;'+
'background:rgba(100,140,220,.15);border:1px solid rgba(160,190,255,.25);font-size:16px;color:#C8D8FF;flex-shrink:0}'+
'.m-cosmos-txt{display:flex;flex-direction:column;gap:3px}'+
'.m-cosmos-txt b{font-size:16px;font-weight:700;letter-spacing:.03em}'+
'.m-cosmos-txt i{font-style:normal;font-size:12px;color:rgba(180,200,230,.55)}'+
'.m-diary-wrap{display:flex;flex-direction:column;gap:12px}'+
'.m-diary-top{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
'.m-diary-date{font-size:15px;font-weight:700;letter-spacing:.04em;color:#E8F0FF}'+
'.m-diary-nav{display:flex;gap:6px}'+
'.m-diary-nav button{width:36px;height:36px;border-radius:10px;border:1px solid rgba(140,170,220,.25);background:rgba(255,255,255,.05);color:#E8F0FF;font-size:16px}'+
'.m-diary-rates{display:flex;gap:8px}'+
'.m-diary-rates button{flex:1;padding:10px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#B8C8E0;font-size:12px;font-weight:600}'+
'.m-diary-rates button.on-bad{background:rgba(220,80,80,.25);border-color:rgba(240,100,100,.45);color:#F8B0B0}'+
'.m-diary-rates button.on-ok{background:rgba(220,150,60,.22);border-color:rgba(240,180,80,.4);color:#F8D0A0}'+
'.m-diary-rates button.on-good{background:rgba(60,180,100,.22);border-color:rgba(100,220,140,.4);color:#B0F0C0}'+
'.m-diary-ta{width:100%;min-height:180px;max-height:42vh;resize:vertical;padding:14px;border-radius:14px;border:1px solid rgba(140,170,220,.18);'+
'background:rgba(8,12,22,.75);color:#E8F0FF;font-size:15px;line-height:1.55;font-family:Georgia,serif;box-sizing:border-box}'+

'.m-reader-page{flex:1;overflow:hidden;padding:8px 18px 20px;color:#EDE4D4;font-size:17px;line-height:1.65;'+
  'font-family:Georgia,"Times New Roman",serif;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;'+
  'user-select:none;-webkit-user-select:none;touch-action:pan-y;box-sizing:border-box}'+
'.m-reader.chrome-hide .m-reader-page{padding-top:6px;padding-bottom:12px}'+
'.m-reader-foot{position:absolute;left:0;right:0;bottom:0;text-align:center;padding:8px;padding-bottom:calc(8px + env(safe-area-inset-bottom,0px));font-size:11px;color:rgba(200,190,170,.55);transition:opacity .25s,transform .25s;background:linear-gradient(0deg,rgba(12,10,14,.92),rgba(12,10,14,0));pointer-events:none;height:36px;box-sizing:content-box}'+
/* HTML hidden must beat display:flex — иначе при входе виден пустой «Книга» */
'.m-reader[hidden],.m-panel[hidden],.m-hud[hidden],.m-room[hidden],.m-room-finn[hidden]{display:none!important}'+
'.m-dialog{position:absolute;left:50%;bottom:calc(16% + 110px);transform:translateX(-50%) translateY(8px);'+
'z-index:15;max-width:min(90vw,340px);max-height:26vh;overflow:auto;padding:12px 16px;border-radius:16px;'+
'background:rgba(14,12,22,.92);border:1px solid rgba(255,255,255,.14);color:#F0EDE6;'+
'font-size:15px;line-height:1.4;font-family:system-ui,-apple-system,sans-serif;text-align:center;'+
'opacity:0;pointer-events:none;transition:opacity .22s,transform .22s;'+
'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 28px rgba(0,0,0,.4)}'+
'.m-dialog.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}'+
'.m-finn-close-space{position:absolute;z-index:16;width:36px;height:36px;border-radius:50%;'+'background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.22);color:#f5efe6;font-size:16px;'+'display:none;align-items:center;justify-content:center;padding:0}'+'.m-finn-close-space.show{display:flex}'+'body.matter-lock{overflow:hidden!important}';
  document.head.appendChild(s);
}

/* ---------- resize ---------- */
function resize(){
  if(!canvas)return;
  dpr=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

var skyMode='home';
var galaxies=[];
var meteors=[];
var meteorSpawnT=0;
var nebulae=[];
var titleDust=[];
var nebulaBirth=null;
var tourLock=false;
var tourHL=null;
var tourAudio=null;

/* ---------- constellation + diagonal door ---------- */
function buildStars(){
  stars=[];
  var goals=getGoals();
  var mode=skyMode||'home';
  // Кассиопея (W) — 5 ярких
  var cassiopeia=[[0.10,0.55],[0.30,0.25],[0.50,0.50],[0.70,0.20],[0.90,0.48]];
  var cassLinks=[[0,1],[1,2],[2,3],[3,4]];
  // Орион — пояс + плечи + ноги (упрощённо)
  var orion=[[0.25,0.15],[0.75,0.18],[0.35,0.45],[0.50,0.48],[0.65,0.45],[0.30,0.78],[0.70,0.80]];
  var orionLinks=[[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[0,1]];
  // Большая Медведица
  var ursaMajor=[
    [0.05,0.05], // 0 Alkaid — кончик ручки (верх-лево)
    [0.18,0.22], // 1 Mizar
    [0.30,0.38], // 2 Alioth
    [0.42,0.50], // 3 Megrez — стык ручки и ковша
    [0.58,0.42], // 4 Dubhe — верх ковша
    [0.72,0.58], // 5 Merak — низ внешнего края ковша
    [0.48,0.70]  // 6 Phecda — низ ковша
  ];
  var majLinks=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]; // ручка + ковш-ромб
  // Малая Медведица — правый верх, компактнее
  var ursaMinor=[
    [0.22,0.08], // 0 Polaris — кончик ручки
    [0.38,0.18], // 1
    [0.50,0.30], // 2
    [0.58,0.42], // 3 стык
    [0.48,0.55], // 4 ковш
    [0.68,0.58], // 5
    [0.72,0.40]  // 6
  ];
  var minLinks=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]];

  function placeInBox(pts, links, list, group, box){
    var placed=[];
    pts.forEach(function(p,i){
      var g=list[i]||null;
      var x=box.ox+p[0]*box.bw, y=box.oy+p[1]*box.bh;
      var hue=g?(g.type==='debt'?8:(g.urgent?38:205)):210;
      var st={
        id:g?g.id:('empty_'+group+'_'+i), g:g, x:x, y:y,
        baseR:g?(g.type==='debt'?5.5:(7+Math.min(6,(g.pct||0)/22))):(group==='min'?2.8:3.2),
        hue:hue, pulse:i*0.7, bright:g?(0.65+(g.pct||0)/220):0.4,
        group:group, idx:i
      };
      stars.push(st);
      placed.push(st);
    });
    return placed;
  }
  // Разные области экрана — не пересекаются
  // Медведицы по краям, центр свободен под чёрную дыру
  var majBox={ox:W*0.02, oy:H*0.42, bw:W*0.38, bh:H*0.42};
  var minBox={ox:W*0.60, oy:H*0.08, bw:W*0.36, bh:H*0.30};
  window.__matterLinks=[];
  if(mode==='cass'){
    // только форма Кассиопеи — без лишних целей снизу
    var box={ox:W*0.14, oy:H*0.28, bw:W*0.72, bh:H*0.36};
    var placed=placeInBox(cassiopeia, cassLinks, goals.slice(0,5), 'cass', box);
    cassLinks.forEach(function(lk){ window.__matterLinks.push([placed[lk[0]], placed[lk[1]]]); });
  }else if(mode==='orion'){
    // только форма Ориона — без россыпи целей
    var box={ox:W*0.20, oy:H*0.20, bw:W*0.60, bh:H*0.55};
    var placed=placeInBox(orion, orionLinks, goals.slice(0,7), 'orion', box);
    orionLinks.forEach(function(lk){ window.__matterLinks.push([placed[lk[0]], placed[lk[1]]]); });
  }else{
  var majGoals=goals.slice(0,7);
  var minGoals=goals.slice(7,14);
  var maj=placeInBox(ursaMajor, majLinks, majGoals, 'maj', majBox);
  var min=placeInBox(ursaMinor, minLinks, minGoals, 'min', minBox);
  majLinks.forEach(function(lk){ window.__matterLinks.push([maj[lk[0]], maj[lk[1]]]); });
  minLinks.forEach(function(lk){ window.__matterLinks.push([min[lk[0]], min[lk[1]]]); });
  // лишние цели — сетка под Большой, не на центр
  var extra=goals.slice(14);
  if(extra.length){
    var cols=Math.max(3,Math.floor(majBox.bw/54));
    var cellW=majBox.bw/cols;
    var rowH=26;
    var baseY=Math.min(H*0.92, majBox.oy+majBox.bh+28);
    extra.forEach(function(g,i){
      var col=i%cols, row=Math.floor(i/cols);
      var x=majBox.ox+cellW*(col+0.5);
      var y=Math.min(H*0.90, baseY+row*rowH);
      // не лезем под дверь справа
      if(x>W*0.72 && y>H*0.65){ x=majBox.ox+cellW*((col%Math.max(1,cols-1))+0.5); }
      stars.push({
        id:g.id,g:g,x:x,y:y,baseR:3.2+Math.min(3,(g.pct||0)/40),
        hue:g.type==='debt'?8:(g.urgent?38:200),pulse:i*0.6,bright:0.5+(g.pct||0)/250
      });
    });
  }
  for(var i=0;i<48;i++){
    stars.push({
      id:'bg'+i,g:null,
      x:Math.random()*W,y:Math.random()*H,
      baseR:0.3+Math.random()*1.2,
      hue:210+Math.random()*40,pulse:Math.random()*6,bright:0.12+Math.random()*0.35,
      bg:true
    });
  }
  } // end home sky
  // Дверь = чёрная дыра справа снизу (не на созвездиях)
  door=null; // комната и чёрная дыра убраны
  // галактики — слева-верх и правее-центр, без пересечений
  galaxies=[
    {id:'cass', x:W*0.18, y:H*0.22, r:Math.min(W,H)*0.08, rot:-0.4, kind:1, label:'Кассиопея'},
    {id:'orion', x:W*0.82, y:H*0.38, r:Math.min(W,H)*0.085, rot:0.55, kind:2, label:'Орион'}
  ];
  buildNebulae();
}

/* ---------- Finn state machine ---------- */
function resetFinn(){
  finn={
    state:'star', // star | fall | morph | idle | toDoor | enter | room
    x:W*0.5, y:H*0.12,
    tx:W*0.5, ty:H*0.12,
    scale:1, alpha:1,
    trail:[], sparks:[],
    faceT:0, blink:0,
    inRoom:false,
    size:58,
    emotion:'idle',
    flash:0,
    fallV:0
  };
}

/* ---------- реалистичное солнце: кэшированная плазменная текстура ---------- */
var sunTex=null, sunTexSize=0, sunTexAt=0;
function paintSunTexture(){
  if(!sunTex)return;
  var tw=sunTex.width, r=tw/2;
  var tctx=sunTex.getContext('2d');
  tctx.clearRect(0,0,tw,tw);
  var base=tctx.createRadialGradient(r,r,0,r,r,r);
  base.addColorStop(0,'#FFF6D8');
  base.addColorStop(0.35,'#FFD37A');
  base.addColorStop(0.68,'#FF9A2E');
  base.addColorStop(1,'#D94A12');
  tctx.fillStyle=base;
  tctx.beginPath();tctx.arc(r,r,r,0,Math.PI*2);tctx.fill();
  // грануляция плазмы — конвективные ячейки внахлёст, имитация реальной поверхности звезды
  tctx.globalCompositeOperation='overlay';
  var n=Math.round(tw*0.55);
  for(var i=0;i<n;i++){
    var ang=Math.random()*Math.PI*2, rad=Math.sqrt(Math.random())*r*0.97;
    var gx=r+Math.cos(ang)*rad, gy=r+Math.sin(ang)*rad;
    var gr=r*(0.02+Math.random()*0.05);
    var br=Math.random();
    tctx.fillStyle= br>0.52 ? 'rgba(255,244,214,'+(0.10+0.16*br)+')' : 'rgba(120,30,0,'+(0.08+0.14*(1-br))+')';
    tctx.beginPath();tctx.arc(gx,gy,gr,0,Math.PI*2);tctx.fill();
  }
  tctx.globalCompositeOperation='source-over';
  sunTexAt=performance.now();
}
function ensureSunTexture(size){
  var want=Math.max(96,Math.round(size*2.4));
  if(sunTex && sunTexSize===want)return;
  sunTex=document.createElement('canvas');
  sunTex.width=sunTex.height=want;
  sunTexSize=want;
  paintSunTexture();
}

function drawFinnFace(c, cx, cy, size, t){
  // Солнце: плавное кипение плазмы каждый кадр (без скачков раз в 420мс)
  var s=size;
  ensureSunTexture(s);
  // редкий фоновый refresh текстуры — незаметный
  /* texture refresh disabled — плавное пылание градиентами */

  c.save();
  c.translate(cx,cy);
  var breath=1+0.02*Math.sin(t*1.4);

  // многослойная диффузная корона
  var layers=[{mul:2.7,a:0.09},{mul:1.9,a:0.15},{mul:1.35,a:0.24}];
  layers.forEach(function(L){
    var rr=s*L.mul*breath;
    var cg=c.createRadialGradient(0,0,s*0.6,0,0,rr);
    cg.addColorStop(0,'rgba(255,210,120,'+L.a+')');
    cg.addColorStop(0.55,'rgba(255,120,40,'+(L.a*0.4)+')');
    cg.addColorStop(1,'rgba(255,60,10,0)');
    c.fillStyle=cg;
    c.beginPath();c.arc(0,0,rr,0,Math.PI*2);c.fill();
  });

  // редкий, сдержанный протуберанец у края — раз в несколько секунд, не «лепестки»
  if(finn){
    if(finn._flareAt==null||t-finn._flareAt>5){
      finn._flareAt=t; finn._flareAng=Math.random()*Math.PI*2; finn._flareLen=0.22+Math.random()*0.3;
    }
    var fadeT=(t-finn._flareAt)/3.2;
    var fa=Math.max(0,1-fadeT)*0.32;
    if(fa>0.015){
      c.save();
      c.rotate(finn._flareAng);
      var flen=s*(0.85+finn._flareLen);
      var fg=c.createLinearGradient(0,-s*0.76,0,-flen);
      fg.addColorStop(0,'rgba(255,205,130,'+fa+')');
      fg.addColorStop(1,'rgba(255,80,20,0)');
      c.strokeStyle=fg;
      c.lineWidth=s*0.045;
      c.lineCap='round';
      c.beginPath();
      c.moveTo(0,-s*0.78);
      c.quadraticCurveTo(s*0.16,-(s*0.78+flen)*0.6,s*0.04,-flen);
      c.stroke();
      c.restore();
    }
  }

  // диск — плавное пылание без пузырей и без скачков кадров
  c.save();
  c.beginPath();c.arc(0,0,s*0.82,0,Math.PI*2);c.clip();
  // базовый градиент (не прыгающая текстура)
  var body=c.createRadialGradient(-s*0.12,-s*0.14,0,0,0,s*0.82);
  body.addColorStop(0,'#FFF8E0');
  body.addColorStop(0.28,'#FFE08A');
  body.addColorStop(0.55,'#FFB040');
  body.addColorStop(0.8,'#E86820');
  body.addColorStop(1,'#A03010');
  c.fillStyle=body;
  c.beginPath();c.arc(0,0,s*0.82,0,Math.PI*2);c.fill();
  // медленные широкие волны жара (не пузырьки)
  for(var i=0;i<5;i++){
    var a=t*0.35+i*1.25;
    var ox=Math.cos(a)*s*0.18;
    var oy=Math.sin(a*0.9)*s*0.14;
    var wave=c.createRadialGradient(ox,oy,0,ox,oy,s*(0.35+0.08*Math.sin(t*1.1+i)));
    wave.addColorStop(0,'rgba(255,250,220,'+(0.12+0.06*Math.sin(t*1.3+i))+')');
    wave.addColorStop(0.6,'rgba(255,160,50,0.06)');
    wave.addColorStop(1,'rgba(255,80,20,0)');
    c.fillStyle=wave;
    c.beginPath();c.arc(0,0,s*0.82,0,Math.PI*2);c.fill();
  }
  // затемнение к краю — сфера
  var limb=c.createRadialGradient(0,0,s*0.35,0,0,s*0.82);
  limb.addColorStop(0,'rgba(0,0,0,0)');
  limb.addColorStop(0.75,'rgba(80,20,0,0.12)');
  limb.addColorStop(1,'rgba(40,5,0,0.55)');
  c.fillStyle=limb;
  c.beginPath();c.arc(0,0,s*0.82,0,Math.PI*2);c.fill();
  // тёплая внутренняя засветка
  var hot=c.createRadialGradient(-s*0.08,-s*0.1,0,0,0,s*0.5);
  hot.addColorStop(0,'rgba(255,250,225,0.35)');
  hot.addColorStop(1,'rgba(255,160,60,0)');
  c.fillStyle=hot;
  c.beginPath();c.arc(0,0,s*0.5,0,Math.PI*2);c.fill();
  c.restore();

  c.restore();
}

function drawFinnStar(c, x, y, t){
  // Маленькая ещё не «родившаяся» звезда — только мягкое сияние, без орбит
  var pulse=0.88+0.12*Math.sin(t*2.4);
  var r=8*pulse;
  var g0=c.createRadialGradient(x,y,0,x,y,r*7);
  g0.addColorStop(0,'rgba(255,250,230,0.9)');
  g0.addColorStop(0.2,'rgba(255,210,140,0.45)');
  g0.addColorStop(0.55,'rgba(255,140,180,0.16)');
  g0.addColorStop(1,'rgba(80,40,120,0)');
  c.fillStyle=g0;
  c.beginPath();c.arc(x,y,r*7,0,Math.PI*2);c.fill();
  var g1=c.createRadialGradient(x,y,0,x,y,r*2.2);
  g1.addColorStop(0,'#fff');
  g1.addColorStop(0.4,'#FFE8B0');
  g1.addColorStop(1,'rgba(255,160,120,0.15)');
  c.fillStyle=g1;
  c.beginPath();c.arc(x,y,r*2.2,0,Math.PI*2);c.fill();
  c.fillStyle='#fff';
  c.beginPath();c.arc(x,y,r*0.55,0,Math.PI*2);c.fill();
}

/* ---------- phases ---------- */
var bh={r:2,max:0,swirl:0,fall:0,done:false};

var fadeIn={t:0,dur:1.35};
function startEnter(){
  setTimeout(bindMuteBtn,50);
  phase='fadein';
  fadeIn={t:0,dur:0.85};
  if(!stars.length){try{buildStars();}catch(e){}}
  resetFinn();
  if(finn){finn.state='star';finn.x=W*0.5;finn.y=H*0.12;}
  lastT=performance.now();
  loop();
}
function drawFadeIn(dt){
  fadeIn.t+=dt;
  var p=Math.min(1,fadeIn.t/fadeIn.dur);
  ctx.fillStyle='rgb('+Math.round(4*p)+','+Math.round(6*p)+','+Math.round(12*p)+')';
  ctx.fillRect(0,0,W,H);
  if(stars&&stars.length){
    var n=Math.min(stars.length, 70);
    for(var si=0;si<n;si++){
      var s=stars[si];
      var a=(s.bright||0.4)*p*0.9;
      if(a<0.05)continue;
      ctx.beginPath();
      ctx.fillStyle='rgba(230,240,255,'+a+')';
      ctx.arc(s.x,s.y,(s.baseR||1)*(s.bg?1:0.7),0,Math.PI*2);ctx.fill();
    }
  }
  if(p>=1)enterConstellation();
}

function enterConstellation(){
  phase='space';
  if(!stars.length)buildStars();
  door=null;
  if(!finn||finn.state==='star'){
    resetFinn();
    finn.state='star';
    finn.x=W*0.5; finn.y=H*0.12;
  }
  var hud=document.getElementById('matterHud');
  if(hud)hud.hidden=false;
  if(!MS.firstEnter){MS.firstEnter=new Date().toISOString();saveState();}
  try{history.pushState({matter:'space'},'','#matter');}catch(e){}
  window.__matterTourPending=false;
  MS.matterTourDone=true;
  try{showMatterTitle();}catch(e){}
}


var tourTracks=[
  {src:'matter-tour-1.mp3', dur:6500, hl:'space'},
  {src:'matter-tour-2.mp3', dur:7500, hl:'sun', fallAt:4500},
  {src:'matter-tour-3.mp3', dur:7600, hl:'ursa'},
  {src:'matter-tour-4.mp3', dur:7600, hl:'galaxies'},
  {src:'matter-tour-5.mp3', dur:12200, hl:'nebulae'}
];
var tourStep=0;
var tourFallbackT=null;
var tourFallT=null;

function stopTourAudio(){
  if(tourFallbackT){clearTimeout(tourFallbackT);tourFallbackT=null;}
  if(tourFallT){clearTimeout(tourFallT);tourFallT=null;}
  try{
    if(tourAudio){
      tourAudio.onended=null;
      tourAudio.onerror=null;
      tourAudio.pause();
      try{tourAudio.currentTime=0;}catch(e){}
    }
  }catch(e){}
}

function ensureTourAudio(){
  if(tourAudio)return tourAudio;
  try{
    tourAudio=new Audio();
    tourAudio.preload='auto';
  }catch(e){ tourAudio=null; }
  return tourAudio;
}

function startFinnFallSmooth(){
  if(!finn||finn.state!=='star')return;
  var sx0=finn.x, sy0=finn.y;
  var tx0=W*0.5, ty0=H*0.88;
  finn.state='fall';
  finn.fallT=0;
  finn.fallDur=1.55;
  finn.sx=sx0; finn.sy=sy0;
  finn.tx=tx0; finn.ty=ty0;
  // лёгкая дуга без «зависания» посередине
  finn.cx=sx0+(tx0-sx0)*0.5;
  finn.cy=sy0+(ty0-sy0)*0.35;
  finn.trail=[];finn.sparks=[];finn.flash=0;
  finn.morph=0;
  finn._tourFall=true;
  finn.emotion='happy';
}

function endMatterTour(){
  tourHL=null;
  tourLock=false;
  startMatterTour._running=false;
  tourStep=0;
  stopTourAudio();
  try{MS.matterTourDone=true;saveState();}catch(e){}
}

function runTourStep(i){
  if(phase!=='space'||!startMatterTour._running)return;
  if(i>=tourTracks.length){ endMatterTour(); return; }
  tourStep=i;
  var tr=tourTracks[i];
  tourHL={kind:tr.hl, t0:performance.now(), until:performance.now()+tr.dur+400};
  if(tourFallT){clearTimeout(tourFallT);tourFallT=null;}
  if(tr.fallAt){
    tourFallT=setTimeout(function(){
      if(phase!=='space'||!startMatterTour._running)return;
      startFinnFallSmooth();
    }, tr.fallAt);
  }
  var done=false;
  function next(){
    if(done)return;
    done=true;
    if(tourFallbackT){clearTimeout(tourFallbackT);tourFallbackT=null;}
    // пауза между дорожками — разгрузить кадр
    setTimeout(function(){ runTourStep(i+1); }, 450);
  }
  var a=ensureTourAudio();
  if(!a){ setTimeout(next, tr.dur); return; }
  try{
    a.onended=function(){ next(); };
    a.onerror=function(){ next(); };
    a.src=tr.src;
    a.load();
    var p=a.play();
    if(p&&p.catch)p.catch(function(){ next(); });
  }catch(e){ next(); }
  // страховка: если onended не сработал (WebView)
  if(tourFallbackT)clearTimeout(tourFallbackT);
  tourFallbackT=setTimeout(next, tr.dur+800);
}

function startMatterTour(){
  return; // обучение отключено
  if(phase!=='space'||!finn)return;
  if(startMatterTour._running)return;
  startMatterTour._running=true;
  tourLock=true;
  tourHL=null;
  tourStep=0;
  meteors=[]; // не грузим звездопад во время тура
  try{
    var d=document.getElementById('matterDialog');
    if(d)d.classList.remove('show');
    hidePanel();
  }catch(e){}
  if(finn){
    finn.state='star';
    finn.x=W*0.5; finn.y=H*0.12;
    finn.scale=1; finn.trail=[]; finn.sparks=[]; finn.flash=0;
  }
  ensureTourAudio();
  // небольшая пауза после титра — стабильный старт звука
  setTimeout(function(){ runTourStep(0); }, 300);
}


function drawTourHighlight(t){
  if(!tourHL||!ctx)return;
  var now=performance.now();
  if(tourHL.until && now>tourHL.until){ tourHL=null; return; }
  var pulse=0.55+0.45*Math.sin(t*2.6);
  ctx.save();
  // мягкое внешнее свечение БЕЗ контура; центр почти прозрачный — объект читается
  if(tourHL.kind==='sun' && finn){
    var rg=ctx.createRadialGradient(finn.x,finn.y,12,finn.x,finn.y,100);
    rg.addColorStop(0,'rgba(255,230,140,0)');
    rg.addColorStop(0.35,'rgba(255,200,100,'+(0.16+0.1*pulse)+')');
    rg.addColorStop(0.7,'rgba(255,160,50,'+(0.1+0.06*pulse)+')');
    rg.addColorStop(1,'rgba(255,120,30,0)');
    ctx.fillStyle=rg;
    ctx.beginPath();ctx.arc(finn.x,finn.y,100,0,Math.PI*2);ctx.fill();
  }else if(tourHL.kind==='ursa'){
    stars.forEach(function(s){
      if(s.bg||s.group!=='maj')return;
      var g=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,36);
      g.addColorStop(0,'rgba(200,230,255,0)');
      g.addColorStop(0.35,'rgba(180,220,255,'+(0.28+0.14*pulse)+')');
      g.addColorStop(1,'rgba(100,160,255,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(s.x,s.y,36,0,Math.PI*2);ctx.fill();
    });
    if(window.__matterLinks){
      ctx.strokeStyle='rgba(190,220,255,'+(0.45+0.2*pulse)+')';
      ctx.lineWidth=1.8;
      window.__matterLinks.forEach(function(pair){
        if(!pair[0]||!pair[1])return;
        if(pair[0].group!=='maj'&&pair[1].group!=='maj')return;
        ctx.beginPath();ctx.moveTo(pair[0].x,pair[0].y);ctx.lineTo(pair[1].x,pair[1].y);ctx.stroke();
      });
    }
  }else if(tourHL.kind==='galaxies'){
    var elapsed=(now-(tourHL.t0||now))/1000;
    if(elapsed<3.8 && galaxies){
      galaxies.forEach(function(G){
        var g=ctx.createRadialGradient(G.x,G.y,G.r*0.35,G.x,G.y,G.r*2.3);
        g.addColorStop(0,'rgba(230,210,255,0)');
        g.addColorStop(0.4,'rgba(190,170,255,'+(0.22+0.12*pulse)+')');
        g.addColorStop(1,'rgba(120,100,200,0)');
        ctx.fillStyle=g;
        ctx.beginPath();ctx.arc(G.x,G.y,G.r*2.3,0,Math.PI*2);ctx.fill();
      });
    }else if(door){
      var g=ctx.createRadialGradient(door.x,door.y,door.r*0.4,door.x,door.y,door.r*2.5);
      g.addColorStop(0,'rgba(200,225,255,0)');
      g.addColorStop(0.4,'rgba(160,200,255,'+(0.22+0.12*pulse)+')');
      g.addColorStop(1,'rgba(80,120,200,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(door.x,door.y,door.r*2.5,0,Math.PI*2);ctx.fill();
    }
  }else if(tourHL.kind==='nebulae' && nebulae){
    nebulae.forEach(function(n){
      if(n.born)return;
      var g=ctx.createRadialGradient(n.x,n.y,n.s*0.25,n.x,n.y,n.s*2.1);
      g.addColorStop(0,'hsla('+n.hue+',80%,70%,0)');
      g.addColorStop(0.4,'hsla('+n.hue+',75%,65%,'+(0.2+0.12*pulse)+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(n.x,n.y,n.s*2.1,0,Math.PI*2);ctx.fill();
    });
  }
  ctx.restore();
}


function openDoorAnim(){
  if(!door||door.opening)return;
  door.opening=true;
  playCreak();
}

function enterRoom(){
  phase='room';
  roomOpen=true;
  MS.visitedRoom=true;saveState();
  hidePanel();
  closeReader();
  var room=document.getElementById('matterRoom');
  if(room){room.hidden=false;room.style.display='';}
  var hud=document.getElementById('matterHud');
  if(hud)hud.hidden=true;
  startAmbient();
  bindMuteBtn();
  if(finn){finn.inRoom=false;finn.state='star';}
  try{history.pushState({matter:'room'},'','#matter-room');}catch(e){}
}

function leaveRoom(){
  stopAmbient();
  roomOpen=false;
  var room=document.getElementById('matterRoom');
  if(room)room.hidden=true;
  if(door){door.open=0;door.opening=false;door.entered=false;}
  if(finn){finn.inRoom=false;finn.state='star';}
  closeReader();
  hidePanel();
  enterConstellation();
}

function handleBack(){
  if(phase==='idle')return false;
  var reader=document.getElementById('matterReader');
  if(reader&&!reader.hidden){closeReader();return true;}
  if(phase==='room'){leaveRoom();return true;}
  if(phase==='space'||phase==='blackhole'||phase==='fadein'){exitMatter();return true;}
  return false;
}

/* ---------- interaction ---------- */
function findGoalStarAt(x,y){
  var best=null,bestD=1e12;
  var blockX=W*0.5, blockY=H*0.12, blockR2=0;
  if(finn&&finn.state==='star'){ blockR2=56*56; }
  stars.forEach(function(s){
    if(s.bg||!s.g)return;
    if(blockR2>0){
      var near=(s.x-blockX)*(s.x-blockX)+(s.y-blockY)*(s.y-blockY);
      if(near<blockR2)return;
    }
    var dx=x-s.x, dy=y-s.y, d=dx*dx+dy*dy;
    var hit=Math.max(44, (s.baseR||5)*6+20);
    hit=hit*hit;
    if(d<hit && d<bestD){bestD=d;best=s;}
  });
  return best;
}

function onCanvasTap(e){
  if(phase!=='space')return;
  if(tourLock||startMatterTour._running)return; // обучение — тапы закрыты
  // антидребезг: один тап = одно действие
  var now=Date.now();
  if(onCanvasTap._lock && now-onCanvasTap._lock<320)return;
  onCanvasTap._lock=now;

  var pan=document.getElementById('matterPanel');
  if(pan&&!pan.hidden&&pan.style.display!=='none'){
    // тап по фону закрывает панель; по карточке — нет
    return;
  }

  var rect=canvas.getBoundingClientRect();
  var x=e.clientX-rect.left, y=e.clientY-rect.top;

  // 1) Звезда-зародыш Фины
  if(finn && finn.state==='star'){
    var dx=x-finn.x, dy=y-finn.y;
    if(dx*dx+dy*dy < 64*64){
      var sx0=finn.x, sy0=finn.y;
      var tx0=W*0.5, ty0=H*0.88;
      finn.state='fall';
      finn.fallT=0;
      finn.fallDur=1.15;
      finn.sx=sx0; finn.sy=sy0;
      finn.tx=tx0; finn.ty=ty0;
      var side=(Math.random()<0.5?-1:1);
      finn.cx=sx0+(tx0-sx0)*0.5+side*W*0.22;
      finn.cy=sy0+(ty0-sy0)*0.15-H*0.05;
      finn.trail=[];finn.sparks=[];
      finn.emotion='happy';
      hidePanel();
      return;
    }
  }
  if(finn && (finn.state==='fall'||finn.state==='birth'))return;

  // 2) Фина idle — космическое меню
  if(finn && finn.state==='idle'){
    var dxf=x-finn.x, dyf=y-finn.y;
    var hitR=(finn.size||58)*1.15;
    if(dxf*dxf+dyf*dyf < hitR*hitR){
      openSpaceMenu();
      return;
    }
  }

  // 3) Галактики — смена неба (цели только на home)
  if(galaxies&&galaxies.length){
    for(var gi=0;gi<galaxies.length;gi++){
      var G=galaxies[gi];
      var gdx=x-G.x, gdy=y-G.y;
      if(gdx*gdx+gdy*gdy < (G.r*1.2)*(G.r*1.2)){
        var next=G.id==='cass'?'cass':(G.id==='orion'?'orion':'home');
        if(skyMode===next)next='home';
        skyMode=next;
        hidePanel();
        buildStars();
        finnSay(next==='home'?'Снова Медведицы.':(next==='cass'?'Кассиопея.':'Орион.'));
        return;
      }
    }
  }

  // 4) Дверь отключена

  // 5) Звёзды целей
  var best=findGoalStarAt(x,y);
  if(best && best.g){
    showStar(best);
    return;
  }

  // 6) Пустота при idle — свернуть Фину
  if(finn && finn.state==='idle'){
    finn.state='star';
    finn.x=W*0.5;finn.y=H*0.12;finn.scale=1;finn.alpha=1;
    finn.emotion='idle';
    finn.trail=[]; finn.sparks=[]; finn.flash=0; finn.fallV=0;
    var d=document.getElementById('matterDialog');
    if(d)d.classList.remove('show');
    try{if(rec){rec.abort();rec=null;}}catch(err){}
  }
}



function fmt(n){
  n=Math.round(+n||0);
  return (n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';
}

function showStar(s){
  var g=s.g;
  var title=(g.type==='debt'?'Долг · ':'Цель · ')+g.name;
  var body='';
  if(g.target>0){
    body+='Прогресс: '+g.pct+'%\n'+fmt(g.saved)+' из '+fmt(g.target)+'\n';
    body+='<div class="m-bar"><i style="width:'+g.pct+'%"></i></div>';
    if(g.pct<100) body+='\nОсталось: '+fmt(Math.max(0,g.target-g.saved));
    else body+='\n★ Цель достигнута';
  }else{
    body+='Накоплено: '+fmt(g.saved);
  }
  if(g.urgent) body+='\n\n⚡ Срочный резерв';
  showPanel(title, body);
}

function showPanel(title, html){
  var p=document.getElementById('matterPanel');
  if(!p)return;
  document.getElementById('mPanelTitle').textContent=title||'';
  document.getElementById('mPanelBody').innerHTML=html||'';
  p.hidden=false;
  p.style.display='flex';
  p.style.opacity='1';
  p.style.visibility='visible';
}
function hidePanel(){
  var p=document.getElementById('matterPanel');
  if(!p)return;
  p.hidden=true;
  p.style.display='none';
  p.style.opacity='0';
}

function onObject(id){
  if(id==='door'){leaveRoom();return;}
  if(id==='piggy'){
    var goals=getGoals().filter(function(g){return g.type==='goal';});
    var total=0,tgt=0;
    goals.forEach(function(g){total+=g.saved;tgt+=g.target;});
    var pct=tgt>0?Math.min(100,Math.round(total/tgt*100)):0;
    var html='В копилках и резервах: <b>'+fmt(total)+'</b>';
    if(tgt>0) html+='\nК целям: '+fmt(tgt)+' · '+pct+'%<div class="m-bar"><i style="width:'+pct+'%"></i></div>';
    html+='\n\nЭто отражение твоих резервов из Финны.';
    showPanel('Копилка', html);
    finnSay('Твои накопления здесь.');
    return;
  }
  if(id==='plant'){
    var names=['Росток','Маленькое растение','Взрослое растение','Цветение'];
    var lvl=MS.plantLevel|0;
    var html='Состояние: <b>'+names[lvl]+'</b>\n\nПолей растение — оно растёт вместе с тобой.';
    html+='<button type="button" class="m-act" id="mWater">Полить</button>';
    showPanel('Растение', html);
    setTimeout(function(){
      var b=document.getElementById('mWater');
      if(b)b.onclick=function(){
        var now=Date.now();
        if(MS.plantWateredAt && now-MS.plantWateredAt<4000){toast('Уже полито');return;}
        MS.plantWateredAt=now;
        if(MS.plantLevel<3) MS.plantLevel++;
        saveState();
        toast(MS.plantLevel>=3?'Цветёт 🌿':'Растение подросло');
        hidePanel();
        onObject('plant');
      };
    },30);
    return;
  }
  if(id==='book'){
    openBookLibrary();
    return;
  }
  if(id==='desk'){
    openNotesApp();
    return;
  }
  if(id==='diary'){
    openDiaryApp();
    return;
  }
  if(id==='goals'){
    var goals=getGoals().filter(function(g){return g.type==='goal';}).slice(0,6);
    var html=goals.map(function(g){
      return (g.pct>=100?'☑ ':'☐ ')+g.name+(g.target?' · '+g.pct+'%':'');
    }).join('\n')||'Пока нет целей. Добавь резерв в Финне — звезда появится в созвездии.';
    showPanel('Доска целей', html);
    return;
  }
  if(id==='window'){
    showPanel('Окно','Ночной город за стеклом.\n\nТихий момент. Космос снаружи — твоя комната внутри.');
    return;
  }
  if(id==='bed'){
    showPanel('Кровать','Место для паузы.\n\nОтдохни — созвездие никуда не денется.');
    return;
  }
  if(id==='lamp'){
    showPanel('Лампа','Тёплый свет. Здесь можно подумать без спешки.');
    return;
  }
  if(id==='globe'){
    showPanel('Светильник','Тёплый огонёк в углу. Просто свет.');
    return;
  }
  if(id==='focus'){
    showPanel('Фокус','Фокус · Дисциплина · Свобода.\n\nНапоминание, зачем ты здесь.');
    return;
  }
}


/* ---------- Notes app (desk) ---------- */
function openNotesApp(){
  MS.notesList=MS.notesList||[];
  var html='<p style="margin:0 0 10px;opacity:.7;font-size:12px">Заметки · только на устройстве</p>';
  if(!MS.notesList.length){
    html+='<p style="opacity:.6;font-size:13px;margin:8px 0 12px">Пока пусто</p>';
  }else{
    MS.notesList.slice().sort(function(a,b){return(b.updated||0)-(a.updated||0);}).forEach(function(n){
      var prev=escapeHtml((n.body||'').slice(0,80));
      html+='<div class="m-book-row" style="cursor:pointer" data-note="'+n.id+'">'+
        '<div class="m-book-info"><div class="m-book-title">'+escapeHtml(n.title||'Без названия')+'</div>'+
        '<div class="m-book-meta">'+prev+'</div></div>'+
        '<button type="button" class="m-book-del" data-ndel="'+n.id+'">✕</button></div>';
    });
  }
  html+='<button type="button" class="m-act" id="mNoteNew" style="margin-top:12px">Новая заметка</button>';
  showPanel('Заметки', html);
  setTimeout(function(){
    var body=document.getElementById('mPanelBody');
    if(!body)return;
    var neu=document.getElementById('mNoteNew');
    if(neu)neu.onclick=function(e){e.preventDefault();e.stopPropagation();editNote(null);};
    body.querySelectorAll('[data-note]').forEach(function(el){
      el.onclick=function(e){
        if(e.target&&e.target.getAttribute('data-ndel'))return;
        e.preventDefault();e.stopPropagation();
        editNote(el.getAttribute('data-note'));
      };
    });
    body.querySelectorAll('[data-ndel]').forEach(function(btn){
      btn.onclick=function(e){
        e.preventDefault();e.stopPropagation();
        var id=btn.getAttribute('data-ndel');
        MS.notesList=(MS.notesList||[]).filter(function(n){return n.id!==id;});
        saveState();toast('Удалено');openNotesApp();
      };
    });
  },20);
}
function editNote(id){
  var n=null;
  if(id){n=(MS.notesList||[]).filter(function(x){return x.id===id;})[0];}
  var title=n?n.title:'';
  var body=n?n.body:'';
  var html='<input id="mNoteTitle" placeholder="Заголовок" value="'+escapeHtml(title)+'" style="width:100%;margin-bottom:8px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#F5E6C8;font-size:15px;outline:none">';
  html+='<textarea id="mNoteBody" placeholder="Текст заметки…" style="width:100%;min-height:160px;border-radius:14px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);color:#F5E6C8;padding:12px;font-size:15px;line-height:1.45;resize:vertical;outline:none">'+escapeHtml(body)+'</textarea>';
  html+='<button type="button" class="m-act" id="mNoteSave" style="margin-top:10px">Сохранить</button>';
  html+='<button type="button" class="m-act" id="mNoteBack" style="margin-top:8px;background:rgba(255,255,255,.06)">К списку</button>';
  showPanel(n?'Заметка':'Новая заметка', html);
  setTimeout(function(){
    var save=document.getElementById('mNoteSave');
    var back=document.getElementById('mNoteBack');
    if(back)back.onclick=function(e){e.preventDefault();openNotesApp();};
    if(save)save.onclick=function(e){
      e.preventDefault();
      var ti=document.getElementById('mNoteTitle');
      var bo=document.getElementById('mNoteBody');
      var title=ti?String(ti.value||'').trim():'';
      var text=bo?String(bo.value||'').trim():'';
      if(!title&&!text){toast('Пусто');return;}
      if(!title)title=(text.slice(0,40)||'Заметка');
      MS.notesList=MS.notesList||[];
      if(n){
        n.title=title.slice(0,80);
        n.body=text.slice(0,8000);
        n.updated=Date.now();
      }else{
        MS.notesList.unshift({id:'n_'+Date.now(),title:title.slice(0,80),body:text.slice(0,8000),updated:Date.now()});
      }
      if(MS.notesList.length>60)MS.notesList=MS.notesList.slice(0,60);
      saveState();toast('Сохранено');openNotesApp();
    };
  },20);
}

/* ---------- Diary (serious, by day) ---------- */
function diaryKey(d){
  var x=d instanceof Date?d:new Date(d);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function openDiaryApp(dateStr){
  MS.diaryDays=MS.diaryDays||{};
  if(typeof MS.diary==='string'&&MS.diary&&!MS.diaryDays._migrated){
    MS.diaryDays[diaryKey(new Date())]={text:MS.diary,rating:0};
    MS.diaryDays._migrated=1;
  }
  var key=dateStr||diaryKey(new Date());
  var entry=MS.diaryDays[key]||{text:'',rating:0};
  var d=new Date(key+'T12:00:00');
  var months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var dateLabel=d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
  var rate=num(entry.rating)||0;
  var html='<div class="m-diary-wrap">'+
    '<div class="m-diary-top">'+
      '<div class="m-diary-date">'+dateLabel+'</div>'+
      '<div class="m-diary-nav">'+
        '<button type="button" id="mDiaryPrev" aria-label="Назад">‹</button>'+
        '<button type="button" id="mDiaryCal" aria-label="Календарь">▦</button>'+
        '<button type="button" id="mDiaryNext" aria-label="Вперёд">›</button>'+
      '</div>'+
    '</div>'+
    '<div class="m-diary-rates">'+
      '<button type="button" data-r="1" class="'+(rate===1?'on-bad':'')+'">Плохо</button>'+
      '<button type="button" data-r="2" class="'+(rate===2?'on-ok':'')+'">Норм</button>'+
      '<button type="button" data-r="3" class="'+(rate===3?'on-good':'')+'">Отлично</button>'+
    '</div>'+
    '<textarea class="m-diary-ta" id="mDiaryText" placeholder="Что было важным сегодня…">'+escapeHtml(entry.text||'')+'</textarea>'+
    '<button type="button" class="m-act" id="mDiarySave">Сохранить</button>'+
    '<div id="mDiaryCalPop" style="display:none;margin-top:8px"></div>'+
  '</div>';
  showPanel('Дневник', html);
  setTimeout(function(){
    var ta=document.getElementById('mDiaryText');
    function saveCur(){
      MS.diaryDays[key]=MS.diaryDays[key]||{text:'',rating:0};
      if(ta)MS.diaryDays[key].text=String(ta.value||'').slice(0,12000);
      try{saveState();}catch(e){}
    }
    var sv=document.getElementById('mDiarySave');
    if(sv)sv.onclick=function(e){e.preventDefault();saveCur();toast('Сохранено');};
    document.querySelectorAll('.m-diary-rates [data-r]').forEach(function(b){
      b.onclick=function(e){
        e.preventDefault();
        var r=num(b.getAttribute('data-r'));
        MS.diaryDays[key]=MS.diaryDays[key]||{text:'',rating:0};
        MS.diaryDays[key].rating=r;
        if(ta)MS.diaryDays[key].text=String(ta.value||'').slice(0,12000);
        saveState();
        openDiaryApp(key);
      };
    });
    var prev=document.getElementById('mDiaryPrev');
    var next=document.getElementById('mDiaryNext');
    if(prev)prev.onclick=function(e){
      e.preventDefault();saveCur();
      var n=new Date(key+'T12:00:00');n.setDate(n.getDate()-1);
      openDiaryApp(diaryKey(n));
    };
    if(next)next.onclick=function(e){
      e.preventDefault();saveCur();
      var n=new Date(key+'T12:00:00');n.setDate(n.getDate()+1);
      openDiaryApp(diaryKey(n));
    };
    var cal=document.getElementById('mDiaryCal');
    if(cal)cal.onclick=function(e){
      e.preventDefault();
      var pop=document.getElementById('mDiaryCalPop');
      if(!pop)return;
      if(pop.style.display==='block'){pop.style.display='none';return;}
      var y=d.getFullYear(),m=d.getMonth();
      var first=new Date(y,m,1);
      var start=(first.getDay()+6)%7;
      var daysIn=new Date(y,m+1,0).getDate();
      var h='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:12px">';
      ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(function(x){h+='<div style="opacity:.45;padding:4px 0">'+x+'</div>';});
      for(var i=0;i<start;i++)h+='<div></div>';
      for(var day=1;day<=daysIn;day++){
        var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        var en=MS.diaryDays[ds];
        var col='#8899aa';
        if(en&&en.rating===1)col='#e85a5a';
        else if(en&&en.rating===2)col='#e8a04a';
        else if(en&&en.rating===3)col='#5ad47a';
        else if(en&&en.text)col='#c8d0e0';
        var sel=ds===key?'box-shadow:0 0 0 1px rgba(200,220,255,.5);':'';
        h+='<button type="button" data-d="'+ds+'" style="padding:7px 0;border-radius:8px;border:0;background:rgba(255,255,255,.05);color:'+col+';'+sel+'">'+day+'</button>';
      }
      h+='</div>';
      pop.innerHTML=h;
      pop.style.display='block';
      pop.querySelectorAll('[data-d]').forEach(function(b){
        b.onclick=function(ev){
          ev.preventDefault();
          saveCur();
          openDiaryApp(b.getAttribute('data-d'));
        };
      });
    };
    // автосохранение при вводе
    if(ta){
      var st=null;
      ta.addEventListener('input',function(){
        if(st)clearTimeout(st);
        st=setTimeout(saveCur,400);
      });
    }
  },20);
}


/* ---------- Book library + swipe reader ---------- */
var reader={pages:[],idx:0,bookId:null,title:'',sessionStart:0,accumSec:0};


function openSpaceMenu(){
  hidePanel();
  var html=''+
    '<div class="m-cosmos-menu">'+
      '<p class="m-cosmos-lead">Пространство рядом с тобой</p>'+
      '<button type="button" class="m-cosmos-btn" id="mMenuBook">'+
        '<span class="m-cosmos-ico">◇</span>'+
        '<span class="m-cosmos-txt"><b>Книги</b><i>Полка и читалка FB2</i></span>'+
      '</button>'+
      '<button type="button" class="m-cosmos-btn" id="mMenuDiary">'+
        '<span class="m-cosmos-ico">✦</span>'+
        '<span class="m-cosmos-txt"><b>Дневник</b><i>Записи и оценка дня</i></span>'+
      '</button>'+
    '</div>';
  showPanel('Материя', html);
  setTimeout(function(){
    var b=document.getElementById('mMenuBook');
    var d=document.getElementById('mMenuDiary');
    if(b)b.onclick=function(e){e.preventDefault();e.stopPropagation();openBookLibrary();};
    if(d)d.onclick=function(e){e.preventDefault();e.stopPropagation();openDiaryApp();};
  },20);
}

function openBookLibrary(){
  MS.books=MS.books||{};
  MS.pageByBook=MS.pageByBook||{};
  MS.readTimeByBook=MS.readTimeByBook||{};
  var keys=Object.keys(MS.books).sort(function(a,b){
    return (MS.books[b].addedAt||0)-(MS.books[a].addedAt||0);
  });
  var html='<div class="m-lib">';
  html+='<button type="button" class="m-lib-load" id="mLoadBook">＋  Загрузить FB2 / TXT</button>';
  if(!keys.length){
    html+='<div class="m-lib-empty">Полка пуста.<br>Загрузи первую книгу — прогресс сохранится.</div>';
  }else{
    html+='<div class="m-lib-list">';
    keys.forEach(function(k){
      var b=MS.books[k]||{};
      var pages=Math.max(1, Number(b.pages)||1);
      var cur=Math.min(pages-1, Math.max(0, Number(MS.pageByBook[k])||0));
      var pct=0;
      if(b.openedOnce){
        if(cur>=pages-1) pct=100;
        else pct=Math.round(((cur+1)/pages)*100);
      }
      var title=escapeHtml(b.title||'Без названия');
      var sec=MS.readTimeByBook[k]|0;
      var mm=Math.floor(sec/60);
      var timeStr=mm>0?(mm+' мин'):'новая';
      html+='<div class="m-lib-item" data-open="'+k+'">'+
        '<div class="m-lib-item-main">'+
          '<div class="m-lib-item-title">'+title+'</div>'+
          '<div class="m-lib-item-meta">'+pct+'% · стр. '+(cur+1)+'/'+pages+' · '+timeStr+'</div>'+
          '<div class="m-lib-bar"><i style="width:'+pct+'%"></i></div>'+
        '</div>'+
        '<button type="button" class="m-lib-del" data-del="'+k+'" aria-label="Удалить">✕</button>'+
      '</div>';
    });
    html+='</div>';
  }
  html+='<div class="m-lib-status" id="mLibStatus"></div>';
  html+='</div>';
  showPanel('Книги', html);
  setTimeout(function(){
    var body=document.getElementById('mPanelBody');
    if(!body)return;
    body.querySelectorAll('[data-open]').forEach(function(row){
      row.onclick=function(e){
        if(e.target&&e.target.closest&&e.target.closest('[data-del]'))return;
        e.preventDefault();e.stopPropagation();
        openSavedBook(row.getAttribute('data-open'));
      };
    });
    body.querySelectorAll('[data-del]').forEach(function(btn){
      btn.onclick=function(e){
        e.preventDefault();e.stopPropagation();
        var id=btn.getAttribute('data-del');
        if(!id)return;
        delete MS.books[id];
        if(MS.pageByBook) delete MS.pageByBook[id];
        if(MS.readTimeByBook) delete MS.readTimeByBook[id];
        try{saveState();}catch(err){}
        toast('Книга удалена');
        openBookLibrary();
      };
    });
    var load=document.getElementById('mLoadBook');
    if(load)load.onclick=function(e){
      e.preventDefault();e.stopPropagation();
      pickBookFile();
    };
  },20);
}

function setLibStatus(msg){
  var el=document.getElementById('mLibStatus');
  if(el)el.textContent=msg||'';
}

function pickBookFile(){
  var input=document.getElementById('mBookFile');
  if(!input){
    toast('Загрузка недоступна');
    return;
  }
  input.value='';
  input.onchange=function(){
    var f=input.files&&input.files[0];
    input.value='';
    if(!f)return;
    if(f.size>2.5*1024*1024){
      toast('Файл слишком большой (макс. 2.5 МБ)');
      return;
    }
    setLibStatus('Читаю файл…');
    var fr=new FileReader();
    fr.onerror=function(){
      setLibStatus('');
      toast('Не удалось прочитать файл');
    };
    fr.onload=function(){
      var raw=String(fr.result||'');
      // отложить тяжёлую работу — не блокировать UI
      setTimeout(function(){importBookText(raw, f.name||'Книга');},30);
    };
    fr.readAsText(f);
  };
  // небольшой delay — WebView иногда глотает синхронный click
  setTimeout(function(){
    try{input.click();}catch(e){toast('Не удалось открыть выбор файла');}
  },50);
}

function importBookText(raw, filename){
  try{
    setLibStatus('Обрабатываю…');
    var isFb2=/<FictionBook|<body/i.test(raw.slice(0,4000)) || /\.fb2$/i.test(filename||'');
    var text=isFb2?parseFb2(raw):String(raw||'');
    text=text.replace(/\r/g,'').trim();
    if(!text){
      setLibStatus('');
      toast('Пустой файл');
      return;
    }
    // лимит хранения — чтобы localStorage не убивал WebView
    if(text.length>180000)text=text.slice(0,180000);
    var title=filename?String(filename).replace(/\.(fb2|txt)$/i,''):'Книга';
    if(isFb2){
      var tm=raw.match(/<book-title[^>]*>([\s\S]*?)<\/book-title>/i);
      if(tm){
        var tt=tm[1].replace(/<[^>]+>/g,'').trim();
        if(tt)title=tt.slice(0,80);
      }
    }
    var pages=paginate(text);
    var id='b_'+Date.now();
    MS.books=MS.books||{};
    MS.pageByBook=MS.pageByBook||{};
    MS.books[id]={
      title:title,
      raw:text,
      pages:pages.length,
      addedAt:Date.now(),
      openedOnce:false
    };
    MS.pageByBook[id]=0;
    try{saveState();}catch(e){
      // если не влезло — урезать текст
      MS.books[id].raw=text.slice(0,60000);
      try{saveState();}catch(e2){toast('Не хватило места для сохранения');}
    }
    setLibStatus('');
    toast('Книга добавлена');
    openBookLibrary();
  }catch(err){
    setLibStatus('');
    toast('Ошибка обработки');
  }
}

function openSavedBook(id){
  reader.sessionStart=Date.now();

  var b=(MS.books||{})[id];
  if(!b||!b.raw){toast('Нет текста книги');return;}
  hidePanel();
  reader.bookId=id;
  reader.title=b.title||'Книга';
  // музыка выкл на время чтения
  pauseRoomAudio();
  openReader(b.raw);
}

function parseFb2(xml){
  var t=String(xml||'');
  t=t.replace(/<\?[^?]*\?>/g,'');
  t=t.replace(/<binary[\s\S]*?<\/binary>/gi,'');
  t=t.replace(/<style[\s\S]*?<\/style>/gi,'');
  t=t.replace(/<\/p>/gi,'\n\n');
  t=t.replace(/<br\s*\/?>/gi,'\n');
  t=t.replace(/<title[\s\S]*?<\/title>/gi,function(m){return m.replace(/<[^>]+>/g,'')+'\n\n';});
  t=t.replace(/<[^>]+>/g,'');
  t=t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
  t=t.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  return t;
}

function paginate(text){
  var pageEl=document.getElementById('mReaderPage');
  var maxH=(pageEl&&pageEl.clientHeight>40)?pageEl.clientHeight:(window.innerHeight-24);
  var width=(pageEl&&pageEl.clientWidth>40)?pageEl.clientWidth:Math.min(360, window.innerWidth-32);
  maxH=Math.max(160, maxH-4);
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  if(!src)return [''];
  var pages=[];
  var probe=document.createElement('div');
  probe.style.cssText='position:fixed;left:-9999px;top:0;visibility:hidden;box-sizing:border-box;'+
    'width:'+width+'px;padding:0;margin:0;'+
    'font-size:17px;line-height:1.65;font-family:Georgia,"Times New Roman",serif;'+
    'white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;hyphens:auto;color:#000';
  document.body.appendChild(probe);
  var pos=0, len=src.length, guard=0;
  try{
    while(pos<len && guard++<800){
      while(pos<len && src.charAt(pos)==='\n') pos++;
      if(pos>=len)break;
      var lo=1, hi=Math.min(len-pos, 3500), best=1;
      while(lo<=hi){
        var mid=(lo+hi)>>1;
        probe.textContent=src.slice(pos, pos+mid);
        if(probe.offsetHeight<=maxH){ best=mid; lo=mid+1; }
        else hi=mid-1;
      }
      if(best<10) best=Math.min(400, len-pos);
      if(pos+best<len){
        var slice=src.slice(pos, pos+best);
        var br=Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
        if(br>best*0.55) best=br+1;
      }
      var chunk=src.slice(pos, pos+best).replace(/[ \t]+$/,'');
      if(chunk.length) pages.push(chunk);
      pos+=best;
    }
  }finally{
    try{document.body.removeChild(probe);}catch(e){}
  }
  return pages.length?pages:[''];
}

function openReader(raw){
  var sample=raw||'';
  if(!sample){toast('Пусто');return;}
  // показать оболочку сразу
  var r=document.getElementById('matterReader');
  if(r){r.hidden=false;r.style.display='';r.classList.add('chrome-hide');}
  var rt=document.getElementById('mReaderTitle');
  if(rt)rt.textContent=reader.title||'Книга';
  var pageEl=document.getElementById('mReaderPage');
  if(pageEl)pageEl.textContent='…';
  var prog=document.getElementById('mReaderProg');
  if(prog)prog.textContent='…';

  pauseRoomAudio();

  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var text=/<FictionBook|<body/i.test(sample.slice(0,800))?parseFb2(sample):sample;
      if(text.length>180000)text=text.slice(0,180000);
      reader.pages=paginate(text);
      var start=0;
      if(reader.bookId && MS.pageByBook && MS.pageByBook[reader.bookId]!=null){
        start=Math.min(reader.pages.length-1, Math.max(0, Number(MS.pageByBook[reader.bookId])||0));
      }
      reader.idx=start;
      if(reader.bookId && MS.books && MS.books[reader.bookId]){
        MS.books[reader.bookId].pages=reader.pages.length;
        MS.books[reader.bookId].openedOnce=true;
      }
      persistReaderProgress();
      renderPage();
    });
  });
}

function persistReaderProgress(){
  if(!reader.bookId)return;
  MS.pageByBook=MS.pageByBook||{};
  MS.pageByBook[reader.bookId]=reader.idx;
  if(MS.books&&MS.books[reader.bookId]){
    MS.books[reader.bookId].pages=Math.max(1, reader.pages.length||1);
  }
  try{saveState();}catch(e){}
}

function renderPage(){
  var page=document.getElementById('mReaderPage');
  var prog=document.getElementById('mReaderProg');
  if(!page)return;
  var txt=reader.pages[reader.idx]||'';
  page.textContent=txt;
  page.scrollTop=0;
  var total=Math.max(1,reader.pages.length);
  var cur=reader.idx+1;
  var pct=Math.round(cur/total*100);
  // накопить время чтения
  MS.readTimeByBook=MS.readTimeByBook||{};
  if(reader.bookId&&reader.sessionStart){
    var add=Math.floor((Date.now()-reader.sessionStart)/1000);
    if(add>0){
      MS.readTimeByBook[reader.bookId]=(MS.readTimeByBook[reader.bookId]|0)+add;
      reader.sessionStart=Date.now();
    }
  }
  var sec=reader.bookId?(MS.readTimeByBook[reader.bookId]|0):0;
  var mm=Math.floor(sec/60), ss=sec%60;
  var timeStr=mm+':'+(ss<10?'0':'')+ss;
  var head=document.getElementById('mReaderTitle');
  if(head)head.textContent=(reader.title||'Книга')+' · '+timeStr;
  if(prog)prog.textContent=cur+' / '+total+' · '+pct+'%';
  if(reader.bookId){
    MS.pageByBook=MS.pageByBook||{};
    MS.pageByBook[reader.bookId]=reader.idx;
    try{saveState();}catch(e){}
  }
}

function closeReader(){
  try{
    if(reader.bookId&&reader.sessionStart){
      MS.readTimeByBook=MS.readTimeByBook||{};
      var add=Math.floor((Date.now()-reader.sessionStart)/1000);
      if(add>0)MS.readTimeByBook[reader.bookId]=(MS.readTimeByBook[reader.bookId]|0)+add;
      reader.sessionStart=0;
      if(reader.bookId!=null){MS.pageByBook=MS.pageByBook||{};MS.pageByBook[reader.bookId]=reader.idx;}
      saveState();
    }
  }catch(e){}

  persistReaderProgress();
  var r=document.getElementById('matterReader');
  if(r){r.hidden=true;r.style.display='none';}
  reader.pages=[];
  reader.idx=0;
  // вернуть музыку комнаты, если ещё в комнате и не muted
  if(phase==='room' && !matterMuted){
    resumeRoomAudio();
  }
}

function setupReaderSwipe(){
  var page=document.getElementById('mReaderPage');
  if(!page||page._swipeBound)return;
  page._swipeBound=true;
  var sx=0,sy=0;
  page.addEventListener('touchstart',function(e){
    if(!e.changedTouches||!e.changedTouches[0])return;
    sx=e.changedTouches[0].clientX; sy=e.changedTouches[0].clientY;
  },{passive:true});
  page.addEventListener('touchend',function(e){
    if(!e.changedTouches||!e.changedTouches[0])return;
    var dx=e.changedTouches[0].clientX-sx;
    var dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy))return;
    if(dx<0){
      if(reader.idx<reader.pages.length-1){reader.idx++;renderPage();}
    }else{
      if(reader.idx>0){reader.idx--;renderPage();}
    }
  },{passive:true});
  page.addEventListener('click',function(e){
    var rect=page.getBoundingClientRect();
    var x=e.clientX-rect.left;
    var r=document.getElementById('matterReader');
    if(x>rect.width*0.72){
      if(reader.idx<reader.pages.length-1){reader.idx++;renderPage();}
    }else if(x<rect.width*0.28){
      if(reader.idx>0){reader.idx--;renderPage();}
    }else{
      // центр — показать/скрыть шапку и прогресс
      if(r)r.classList.toggle('chrome-hide');
    }
  });
}


/* ---------- voice ---------- */
function startListen(){
  try{
    // Android WebView — запросить mic через bridge если есть
    try{if(window.FinBridge&&window.FinBridge.requestMic)window.FinBridge.requestMic();}catch(e){}
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){
      finnSay('Микрофон недоступен на этом устройстве.');
      return;
    }
    if(rec){try{rec.abort();}catch(e){}}
    rec=new SR();
    rec.lang='ru-RU';
    rec.interimResults=false;
    rec.maxAlternatives=1;
    rec.continuous=false;
    if(finn)finn.emotion='listening';
    rec.onresult=function(ev){
      var tx=(ev.results[0]&&ev.results[0][0]&&ev.results[0][0].transcript)||'';
      if(finn)finn.emotion='happy';
      handleCommand(tx);
    };
    rec.onerror=function(ev){
      if(finn)finn.emotion='idle';
      var err=(ev&&ev.error)||'';
      if(err==='not-allowed'||err==='service-not-allowed'){
        finnSay('Нужен доступ к микрофону.');
      }
    };
    rec.onend=function(){
      if(finn&&finn.emotion==='listening')finn.emotion='idle';
    };
    rec.start();
  }catch(e){
    finnSay('Не удалось включить микрофон.');
  }
}

function handleCommand(text){
  var raw=String(text||'').trim();
  var t=raw.toLowerCase();
  if(!raw)return;
  if(false&&/комнат|двер|войд|зайд|пошл|идём|идем/.test(t)){
    if(phase==='space'){
      if(finn&&(finn.state==='star'||finn.state==='idle'||finn.state==='morph')){
        finn.state='toDoor';
        if(door){finn.tx=door.x;finn.ty=door.y;}
        finnSay('Хорошо, идём.');
      }else openDoorAnim();
    }else if(phase==='room'){
      finnSay('Мы уже в комнате.');
    }
    return;
  }
  if(/назад|выйд|выход|созвезд/.test(t)){
    if(phase==='room')leaveRoom();
    return;
  }
  if(/книг|чита/.test(t)){
    if(phase==='room')openReader();
    else finnSay('Сначала зайдём в комнату.');
    return;
  }
  // ИИ Фины — любой вопрос через общий модуль приложения
  askFinnAI(raw);
}

var __matterAIHistory=[];
function askFinnAI(userText){
  if(finn)finn.emotion='thinking';
  finnSay('Думаю…');
  var ai=window.kopeykaAI;
  if(!ai||typeof ai.askConversation!=='function'){
    if(finn)finn.emotion='idle';
    finnSay('ИИ пока недоступен. Проверь сеть или ключ в настройках.');
    return;
  }
  var hist=__matterAIHistory.slice(-12);
  __matterAIHistory.push({role:'user',content:userText});
  ai.askConversation(hist, userText).then(function(o){
    if(finn)finn.emotion='happy';
    var answer='';
    if(o&&o.mode==='action'){
      answer=o.summary||o.text||'Могу выполнить действие — подтверди в основном чате Финны.';
    }else{
      answer=(o&&o.text)||'Не смогла ответить.';
    }
    // короче для бабла в Материи
    if(answer.length>320)answer=answer.slice(0,300).replace(/\s+\S*$/,'')+'…';
    __matterAIHistory.push({role:'assistant',content:answer});
    finnSay(answer);
  }).catch(function(err){
    if(finn)finn.emotion='idle';
    var msg=(err&&err.message)||'Ошибка ИИ';
    finnSay('Не получилось: '+msg);
  });
}

/* ---------- draw loop ---------- */
function loop(t){
  if(phase==='idle')return;
  if(document.hidden&&phase==='room'){pauseRoomAudio();}
  raf=requestAnimationFrame(loop);
  t=t||performance.now();
  var dt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  resize();
  if(phase==='fadein')drawFadeIn(dt);
  else if(phase==='blackhole')drawBlackHole(dt); // legacy
  else if(phase==='space')drawSpace(dt,t/1000);
  else if(phase==='room'){ leaveRoom(); phase='space'; }
}

function drawBlackHole(dt){
  var cx=W/2, cy=H*0.48;
  bh.t=(bh.t||0)+dt;
  // плавный рост
  var target=Math.min(W,H)*0.42;
  bh.max=target;
  bh.r+=(target-bh.r)*Math.min(1,dt*0.55);
  if(bh.r<8)bh.r+=dt*14;
  bh.swirl+=dt*(1.8+bh.r/target*2.2);
  if(bh.r>target*0.55) bh.fall+=dt;

  // космос
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,W,H);

  // далёкие звёзды (статичные + лёгкий drift к центру)
  if(!bh.far){
    bh.far=[];
    for(var i=0;i<90;i++){
      bh.far.push({x:Math.random()*W,y:Math.random()*H,r:0.4+Math.random()*1.2,a:0.2+Math.random()*0.6});
    }
  }
  bh.far.forEach(function(s){
    var dx=s.x-cx, dy=s.y-cy, d=Math.sqrt(dx*dx+dy*dy)||1;
    if(bh.r>20){
      s.x-=dx/d*dt*8;
      s.y-=dy/d*dt*8;
    }
    ctx.beginPath();
    ctx.fillStyle='rgba(210,220,255,'+s.a+')';
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
  });

  // аккреционный диск — длинные штрихи, не «точки»
  if(!bh.streaks){
    bh.streaks=[];
    for(var i=0;i<80;i++){
      bh.streaks.push({
        a:Math.random()*Math.PI*2,
        r:0.35+Math.random()*0.9,
        w:0.4+Math.random()*1.6,
        sp:0.6+Math.random()*1.4,
        len:0.08+Math.random()*0.2
      });
    }
  }
  bh.streaks.forEach(function(s){
    s.a+=dt*s.sp*(0.9+bh.r/target);
    var rr=bh.r*(0.55+s.r*0.7);
    var a0=s.a, a1=s.a+s.len;
    ctx.beginPath();
    for(var k=0;k<=8;k++){
      var aa=a0+(a1-a0)*k/8;
      var px=cx+Math.cos(aa+bh.swirl*0.3)*rr;
      var py=cy+Math.sin(aa+bh.swirl*0.3)*rr*0.38;
      if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.strokeStyle='rgba(200,210,255,'+(0.12+0.25*(1-s.r))+')';
    ctx.lineWidth=s.w;
    ctx.lineCap='round';
    ctx.stroke();
  });

  // гравитационное линзирование — тонкое яркое кольцо (не «Сатурн»)
  var pr=bh.r*0.72;
  ctx.beginPath();
  ctx.strokeStyle='rgba(220,230,255,'+(0.25+0.2*Math.sin(bh.t*2))+')';
  ctx.lineWidth=1.5;
  ctx.ellipse(cx,cy,pr,pr*0.36,0,0,Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle='rgba(120,150,220,0.12)';
  ctx.lineWidth=4;
  ctx.ellipse(cx,cy,pr,pr*0.36,0,0,Math.PI*2);
  ctx.stroke();

  // горизонт событий — чистый чёрный
  var hg=ctx.createRadialGradient(cx,cy,0,cx,cy,bh.r*0.55);
  hg.addColorStop(0,'#000');
  hg.addColorStop(0.7,'#000');
  hg.addColorStop(0.9,'rgba(0,0,0,0.85)');
  hg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();ctx.fillStyle=hg;ctx.arc(cx,cy,bh.r*0.55,0,Math.PI*2);ctx.fill();

  // виньетка падения
  if(bh.fall>0){
    var v=Math.min(1,bh.fall/1.4);
    // лёгкое сжатие к центру
    ctx.fillStyle='rgba(0,0,0,'+(v*0.95)+')';
    ctx.fillRect(0,0,W,H);
    if(v>0.92)enterConstellation();
  }
}


function drawGalaxy(ctx, gx, gy, scale, rot, t, kind){
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(rot + t * 0.01);
  var warm = kind === 2;
  // далёкое гало
  var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 1.75);
  hg.addColorStop(0, warm ? 'rgba(255,200,150,0.09)' : 'rgba(160,185,255,0.11)');
  hg.addColorStop(0.5, warm ? 'rgba(140,70,45,0.035)' : 'rgba(60,80,160,0.04)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, 0, scale * 1.75, 0, Math.PI * 2); ctx.fill();

  // пылевой диск (эллипс)
  ctx.save();
  ctx.scale(1, 0.48);
  var disk = ctx.createRadialGradient(0, 0, scale * 0.04, 0, 0, scale * 1.1);
  disk.addColorStop(0, 'rgba(255,248,235,0.2)');
  disk.addColorStop(0.3, warm ? 'rgba(210,140,90,0.1)' : 'rgba(130,155,220,0.1)');
  disk.addColorStop(0.75, 'rgba(30,40,70,0.03)');
  disk.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = disk;
  ctx.beginPath(); ctx.arc(0, 0, scale * 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // рукава — объёмные облака, не линии
  for (var arm = 0; arm < 2; arm++) {
    for (var i = 0; i < 70; i++) {
      var p = i / 70;
      var ang = arm * Math.PI + p * 4.6 + t * 0.015;
      var rr = scale * (0.07 + p * 0.98);
      var wob = Math.sin(p * 6.5 + t * 0.4 + arm) * scale * 0.028;
      var px = Math.cos(ang) * rr + Math.cos(ang + 1.1) * wob;
      var py = (Math.sin(ang) * rr + Math.sin(ang + 1.1) * wob) * 0.48;
      var sz = scale * (0.045 + (1 - p) * 0.04) * (0.7 + 0.3 * Math.sin(i * 1.7 + t));
      var al = (0.08 + 0.22 * (1 - p * 0.85)) * (0.75 + 0.25 * Math.sin(i + t * 0.5));
      var g = ctx.createRadialGradient(px, py, 0, px, py, sz);
      if (warm) {
        g.addColorStop(0, 'rgba(255,' + Math.floor(210 - p * 40) + ',' + Math.floor(160 - p * 50) + ',' + al + ')');
        g.addColorStop(0.55, 'rgba(220,120,70,' + (al * 0.35) + ')');
      } else {
        g.addColorStop(0, 'rgba(' + Math.floor(190 + p * 30) + ',' + Math.floor(205 + p * 20) + ',255,' + al + ')');
        g.addColorStop(0.55, 'rgba(100,130,220,' + (al * 0.35) + ')');
      }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
    }
  }

  // яркое ядро + внутреннее кольцо
  var core = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 0.28);
  core.addColorStop(0, 'rgba(255,252,245,0.95)');
  core.addColorStop(0.3, warm ? 'rgba(255,210,150,0.5)' : 'rgba(230,235,255,0.45)');
  core.addColorStop(0.7, warm ? 'rgba(200,100,50,0.12)' : 'rgba(120,150,230,0.12)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, scale * 0.28, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}


function spawnMeteor(){
  var fromLeft=Math.random()<0.55;
  var x=fromLeft ? (-30+Math.random()*W*0.5) : (W*0.5+Math.random()*W*0.5);
  var y=-15-Math.random()*H*0.12;
  var speed=180+Math.random()*220;
  var ang=fromLeft ? (0.5+Math.random()*0.4) : (Math.PI-0.5-Math.random()*0.4);
  meteors.push({
    x:x, y:y,
    vx:Math.cos(ang)*speed,
    vy:Math.sin(ang)*speed,
    len:48+Math.random()*52,
    w:1.2+Math.random()*1.4,
    a:0.55+Math.random()*0.35,
    life:1.4+Math.random()*1.2
  });
}


function buildNebulae(){
  nebulae=[];
  var mode=skyMode||'home';
  var slots;
  if(mode==='cass'){
    // низ-лево и верх-право — далеко от центра и галактик
    slots=[
      {x:0.14,y:0.78,s:0.10,hue:300,seed:1.7},
      {x:0.86,y:0.14,s:0.09,hue:200,seed:3.1}
    ];
  }else if(mode==='orion'){
    // далеко от чёрной дыры (0.86,0.76)
    slots=[
      {x:0.12,y:0.22,s:0.10,hue:210,seed:2.2},
      {x:0.30,y:0.82,s:0.11,hue:330,seed:4.4}
    ];
  }else{
    // Медведицы: не рядом с солнцем (0.5,0.12→0.58) и не у двери (0.86,0.76)
    slots=[
      {x:0.22,y:0.30,s:0.09,hue:280,seed:1.3},
      {x:0.38,y:0.68,s:0.10,hue:190,seed:5.6}
    ];
  }
  slots.forEach(function(s,i){
    nebulae.push({
      id:'neb_'+mode+'_'+i,
      x:W*s.x, y:H*s.y,
      s:Math.min(W,H)*s.s,
      hue:s.hue, seed:s.seed,
      pulse:Math.random()*Math.PI*2,
      born:!!(MS&&MS.nebulaBornAt&&i===0)
    });
  });
  tryScheduleNebulaBirth();
}

function tryScheduleNebulaBirth(){
  if(nebulaBirth||!nebulae.length)return;
  var goals=getGoals();
  if(!goals.length)return;
  var allDone=goals.every(function(g){return (g.pct||0)>=100;});
  if(!allDone)return;
  if(MS.nebulaBornAt)return;
  var n=null;
  for(var i=0;i<nebulae.length;i++){ if(!nebulae[i].born){ n=nebulae[i]; break; } }
  if(!n)return;
  nebulaBirth={n:n, t:0, phase:'charge'};
}

function updateNebulaBirth(dt){
  if(!nebulaBirth)return;
  var b=nebulaBirth;
  b.t+=dt;
  if(b.phase==='charge' && b.t>1.2){ b.phase='boom'; b.t=0; }
  else if(b.phase==='boom' && b.t>1.6){
    var n=b.n;
    n.born=true;
    var newGoal={
      id:'neb_goal_'+Date.now(),
      name:'Новая звезда',
      type:'goal',
      saved:0, target:10000, pct:0, urgent:false
    };
    stars.push({
      id:newGoal.id, g:newGoal,
      x:n.x, y:n.y,
      baseR:7.5, hue:48, pulse:0, bright:0.9,
      group:'born', idx:0
    });
    try{MS.nebulaBornAt=new Date().toISOString();saveState();}catch(e){}
    finnSay('Туманность стала звездой — новая цель родилась.');
    nebulaBirth=null;
  }
}

function drawNebulae(t){
  if(!ctx||!nebulae.length)return;
  var lite=!!(tourLock||startMatterTour._running);
  nebulae.forEach(function(n){
    if(n.born)return;
    var pulse=0.92+0.08*Math.sin(t*0.4+n.pulse);
    var R=n.s*pulse;
    ctx.save();
    ctx.translate(n.x,n.y);
    var g0=ctx.createRadialGradient(0,0,0,0,0,R*1.5);
    g0.addColorStop(0,'hsla('+n.hue+',70%,65%,0.07)');
    g0.addColorStop(0.45,'hsla('+(n.hue+40)+',60%,45%,0.04)');
    g0.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g0;
    ctx.beginPath();ctx.arc(0,0,R*1.5,0,Math.PI*2);ctx.fill();
    var layers=lite?1:3;
    for(var i=0;i<layers;i++){
      var ang=(n.seed+i*0.9)+t*0.03*(i%2?1:-1);
      ctx.save();
      ctx.rotate(ang*0.15);
      ctx.scale(1.25+i*0.08, 0.55+i*0.06);
      var g=ctx.createRadialGradient(-R*0.1,0,0,0,0,R*(0.7-i*0.08));
      var a=0.1-i*0.02;
      g.addColorStop(0,'hsla('+(n.hue+i*18)+',75%,70%,'+(a*1.4)+')');
      g.addColorStop(0.5,'hsla('+(n.hue+30)+',55%,50%,'+a+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(0,0,R*(0.75-i*0.08),0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    var core=ctx.createRadialGradient(0,0,0,0,0,R*0.22);
    core.addColorStop(0,'rgba(255,250,240,0.35)');
    core.addColorStop(0.4,'hsla('+n.hue+',80%,75%,0.12)');
    core.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=core;
    ctx.beginPath();ctx.arc(0,0,R*0.22,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
  if(nebulaBirth){
    var b=nebulaBirth, n=b.n;
    if(b.phase==='charge'){
      var c=Math.min(1,b.t/1.2);
      var cg=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.s*(0.5+c*1.2));
      cg.addColorStop(0,'rgba(255,255,255,'+(0.15+0.35*c)+')');
      cg.addColorStop(0.5,'hsla('+n.hue+',90%,70%,'+(0.12*c)+')');
      cg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=cg;
      ctx.beginPath();ctx.arc(n.x,n.y,n.s*(0.5+c*1.2),0,Math.PI*2);ctx.fill();
    }else if(b.phase==='boom'){
      var c=Math.min(1,b.t/1.6);
      var R=n.s*(0.8+c*3.5);
      var bg=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,R);
      bg.addColorStop(0,'rgba(255,255,255,'+(0.9*(1-c))+')');
      bg.addColorStop(0.2,'rgba(255,230,180,'+(0.5*(1-c))+')');
      bg.addColorStop(0.55,'hsla('+n.hue+',90%,60%,'+(0.25*(1-c))+')');
      bg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bg;
      ctx.beginPath();ctx.arc(n.x,n.y,R,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.globalAlpha=0.45*(1-c);
      for(var ri=0;ri<10;ri++){
        var ang=(ri/10)*Math.PI*2+c;
        var len=n.s*(1.5+c*4);
        var grd=ctx.createLinearGradient(n.x,n.y,n.x+Math.cos(ang)*len,n.y+Math.sin(ang)*len);
        grd.addColorStop(0,'rgba(255,255,240,0.9)');
        grd.addColorStop(1,'rgba(255,200,100,0)');
        ctx.strokeStyle=grd;ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(n.x,n.y);
        ctx.lineTo(n.x+Math.cos(ang)*len,n.y+Math.sin(ang)*len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawCosmicDust(t){
  if(!ctx)return;
  ctx.save();
  for(var i=0;i<6;i++){
    var x=((i*97.3+t*2)%W+W)%W;
    var y=((i*53.1+17)%H+H)%H;
    var g=ctx.createRadialGradient(x,y,0,x,y,14+i%4);
    g.addColorStop(0,'rgba(180,190,220,'+(0.012+(i%3)*0.005)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(x,y,16+i%4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function showMatterTitle(){
  var title=document.querySelector('#matterHud .m-title');
  if(!title)return;
  title.classList.remove('dissolve');
  title.style.display='block';
  title.style.opacity='1';
  title.style.visibility='visible';
  clearTimeout(showMatterTitle._t);
  // не пересекаем с падением/взрывом: растворение чуть позже и с малым числом частиц
  showMatterTitle._t=setTimeout(function(){
    title.classList.add('dissolve');
    try{
      var r=title.getBoundingClientRect();
      var cr=canvas.getBoundingClientRect();
      var cx=(r.left+r.width/2-cr.left);
      var cy=(r.top+r.height/2-cr.top);
      titleDust=[];
      for(var i=0;i<10;i++){
        titleDust.push({
          x:cx+(Math.random()-0.5)*r.width*0.7,
          y:cy+(Math.random()-0.5)*6,
          vx:(Math.random()-0.5)*28,
          vy:-(6+Math.random()*22),
          a:0.6+Math.random()*0.3,
          r:0.5+Math.random()*1.0,
          life:0.9+Math.random()*0.5
        });
      }
    }catch(e){}
    setTimeout(function(){
      if(title){title.style.display='none';title.classList.remove('dissolve');}
      titleDust=[];
    },2200);
  },2200);
}

function updateTitleDust(dt){
  if(!titleDust.length||!ctx)return;
  for(var i=titleDust.length-1;i>=0;i--){
    var p=titleDust[i];
    p.life-=dt; p.a=Math.max(0,p.life);
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    p.vx*=0.98;
    if(p.life<=0){titleDust.splice(i,1);continue;}
    ctx.beginPath();
    ctx.fillStyle='rgba(255,255,255,'+(p.a*0.7)+')';
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  }
}

function updateMeteors(dt){
  meteorSpawnT-=dt;
  // редко: ~1 метеор каждые 2.5–5.5 сек, максимум 3 одновременно
  if(meteorSpawnT<=0 && meteors.length<4){
    spawnMeteor();
    meteorSpawnT=1.6+Math.random()*2.2;
  }
  for(var i=meteors.length-1;i>=0;i--){
    var m=meteors[i];
    m.x+=m.vx*dt;
    m.y+=m.vy*dt;
    m.life-=dt;
    if(m.life<=0 || m.x<-80 || m.x>W+80 || m.y>H+40){
      meteors.splice(i,1);
    }
  }
}

function drawMeteors(){
  if(!ctx||!meteors.length)return;
  ctx.save();
  ctx.lineCap='round';
  meteors.forEach(function(m){
    var spd=Math.sqrt(m.vx*m.vx+m.vy*m.vy)||1;
    var ux=m.vx/spd, uy=m.vy/spd;
    var tx=m.x-ux*m.len;
    var ty=m.y-uy*m.len;
    var fade=Math.max(0,Math.min(1,m.life));
    // мягкое свечение хвоста
    var g=ctx.createLinearGradient(tx,ty,m.x,m.y);
    g.addColorStop(0,'rgba(160,190,255,0)');
    g.addColorStop(0.35,'rgba(190,210,255,'+(0.22*m.a*fade)+')');
    g.addColorStop(0.75,'rgba(230,240,255,'+(0.55*m.a*fade)+')');
    g.addColorStop(1,'rgba(255,255,255,'+(0.85*m.a*fade)+')');
    ctx.beginPath();
    ctx.strokeStyle=g;
    ctx.lineWidth=m.w*1.6;
    ctx.moveTo(tx,ty);
    ctx.lineTo(m.x,m.y);
    ctx.stroke();
    // яркое ядро
    ctx.beginPath();
    ctx.strokeStyle='rgba(255,255,255,'+(0.9*m.a*fade)+')';
    ctx.lineWidth=m.w*0.7;
    ctx.moveTo(m.x-ux*m.len*0.25,m.y-uy*m.len*0.25);
    ctx.lineTo(m.x,m.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle='rgba(255,255,255,'+(0.95*m.a*fade)+')';
    ctx.arc(m.x,m.y,m.w*1.1,0,Math.PI*2);
    ctx.fill();
  });
  ctx.restore();
}

function drawSpace(dt,t){
  var g=ctx.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.5,Math.max(W,H)*0.7);
  g.addColorStop(0,'#0a1020');g.addColorStop(0.5,'#05080f');g.addColorStop(1,'#000');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!tourLock && !startMatterTour._running){
    updateMeteors(dt);
    drawMeteors();
    drawCosmicDust(t);
  }
  var inTour=!!(tourLock||startMatterTour._running);
  var nebTrack=inTour&&tourHL&&tourHL.kind==='nebulae';
  if(!inTour){
    drawNebulae(t);
    updateNebulaBirth(dt);
    updateTitleDust(dt);
  }else if(nebTrack){
    // на дорожке про туманности — только они (упрощённо), без галактик
    drawNebulae(t);
  }else{
    drawNebulae(t);
  }
  if(galaxies&&galaxies.length && !nebTrack){
    galaxies.forEach(function(G){
      drawGalaxy(ctx, G.x, G.y, G.r, G.rot, t, G.kind);
    });
  }

  ctx.globalAlpha=0.12;
  var ng=ctx.createRadialGradient(W*0.3,H*0.3,0,W*0.3,H*0.3,W*0.5);
  ng.addColorStop(0,'#2a4a8a');ng.addColorStop(1,'transparent');
  ctx.fillStyle=ng;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=1;

  // линии созвездий Большой/Малой Медведицы
  var links=window.__matterLinks||[];
  ctx.strokeStyle='rgba(160,200,255,0.22)';
  ctx.lineWidth=1.2;
  links.forEach(function(pair){
    if(!pair[0]||!pair[1])return;
    ctx.beginPath();
    ctx.moveTo(pair[0].x,pair[0].y);
    ctx.lineTo(pair[1].x,pair[1].y);
    ctx.stroke();
  });

  var inTourStars=!!(tourLock||startMatterTour._running);
  stars.forEach(function(s){
    var pulse=0.65+0.35*Math.sin(t*1.4+s.pulse);
    var twinkle=0.85+0.15*Math.sin(t*5.2+s.pulse*2.3);
    var r=s.baseR*(s.bg?1:pulse);
    var a=s.bright*pulse*twinkle;
    if(!s.bg && !inTourStars){
      var glow=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,r*5.2);
      glow.addColorStop(0,'hsla('+s.hue+',85%,78%,'+(0.24*pulse)+')');
      glow.addColorStop(0.45,'hsla('+s.hue+',80%,65%,'+(0.1*pulse)+')');
      glow.addColorStop(1,'hsla('+s.hue+',70%,50%,0)');
      ctx.fillStyle=glow;
      ctx.beginPath();ctx.arc(s.x,s.y,r*5.2,0,Math.PI*2);ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle='hsla('+s.hue+',90%,85%,'+a+')';
    ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.fill();
    if(!s.bg && r>3){
      ctx.beginPath();
      ctx.fillStyle='rgba(255,255,255,'+(0.55*pulse)+')';
      ctx.arc(s.x,s.y,r*0.35,0,Math.PI*2);ctx.fill();
    }
  });

  // дверь = чистая чёрная дыра + только вихрь (без «колец Сатурна»)
  if(door){
    if(door.opening){
      door.open=Math.min(1,door.open+dt*0.9);
      if(door.open>=1 && !door.entered){
        door.entered=true;
        setTimeout(function(){enterRoom();},150);
      }
    }
    var dx=door.x, dy=door.y;
    var R=door.r*(1+door.open*0.5);

    door.swirl=(door.swirl||0)+dt*((tourLock||startMatterTour._running)?0.35:(1.6+door.open*2.2));
    // рассеянное свечение — не шар, а мягкий размытый ореол (слабее)
    for(var gi=0;gi<5;gi++){
      var ox=(gi-2)*R*0.35;
      var oy=((gi%3)-1)*R*0.25;
      var sg=ctx.createRadialGradient(dx+ox,dy+oy,R*0.2,dx+ox,dy+oy,R*(1.8+gi*0.15));
      sg.addColorStop(0,'rgba(0,0,0,0)');
      sg.addColorStop(0.55,'rgba(210,220,240,'+(0.012+gi*0.004)+')');
      sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();ctx.fillStyle=sg;ctx.arc(dx+ox,dy+oy,R*(1.8+gi*0.15),0,Math.PI*2);ctx.fill();
    }

    // аккреция: свет, затягиваемый в дыру (эллиптический диск, утончается к горизонту)
    ctx.save();
    for(var arm=0;arm<6;arm++){
      for(var s=0;s<36;s++){
        var p=s/36;
        var aa=door.swirl*0.7+arm*(Math.PI/3)+p*2.6;
        var rr=R*(0.55+p*1.35);
        var px=dx+Math.cos(aa)*rr;
        var py=dy+Math.sin(aa)*rr*0.38; // сильно сплюснуто — диск с ребра
        // яркость растёт к внутреннему краю, гаснет снаружи
        var al=0.04+0.14*(1-p)*Math.sin(p*Math.PI);
        ctx.beginPath();
        ctx.fillStyle='rgba(230,235,255,'+al+')';
        ctx.arc(px,py,0.7+1.1*(1-p),0,Math.PI*2);ctx.fill();
      }
    }
    // тонкое фотонное кольцо — край горизонта
    ctx.beginPath();
    ctx.strokeStyle='rgba(220,230,255,'+(0.18+0.08*Math.sin(door.swirl))+')';
    ctx.lineWidth=1.2;
    ctx.ellipse(dx,dy,R*0.62,R*0.24,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // абсолютно чёрный горизонт событий
    var hg=ctx.createRadialGradient(dx,dy,0,dx,dy,R*0.5);
    hg.addColorStop(0,'#000');
    hg.addColorStop(0.7,'#000');
    hg.addColorStop(0.9,'rgba(0,0,0,0.9)');
    hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath();ctx.fillStyle=hg;ctx.arc(dx,dy,R*0.5,0,Math.PI*2);ctx.fill();

    if(door.open>0.12){
      ctx.fillStyle='rgba(0,0,0,'+Math.min(0.92,door.open)+')';
      ctx.beginPath();ctx.arc(dx,dy,R*0.4+door.open*40,0,Math.PI*2);ctx.fill();
    }
  }

  // Finn
  if(finn){
    updateFinn(dt,t);
    if(finn.state==='star'||finn.state==='fall'){
      var morph=(finn.state==='fall')?(finn.morph||0):0;
      // хвост настоящей падающей звезды — сплошная сглаженная полоса с
      // градиентом от раскалённого белого ядра к огненно-оранжевому краю
      if(finn.trail&&finn.trail.length>2){
        var tn=finn.trail.length;
        ctx.lineCap='round';
        ctx.lineJoin='round';
        for(var ti=1;ti<tn-1;ti++){
          var pPrev=finn.trail[ti-1], pCur=finn.trail[ti], pNext=finn.trail[ti+1];
          var mx0=(pPrev.x+pCur.x)/2, my0=(pPrev.y+pCur.y)/2;
          var mx1=(pCur.x+pNext.x)/2, my1=(pCur.y+pNext.y)/2;
          var ta=ti/tn;
          var rC=255, gC=Math.round(150+90*ta), bC=Math.round(70+165*ta);
          ctx.beginPath();
          ctx.strokeStyle='rgba('+rC+','+gC+','+bC+','+(0.1+0.65*ta)+')';
          ctx.lineWidth=1+6*ta;
          ctx.moveTo(mx0,my0);
          ctx.quadraticCurveTo(pCur.x,pCur.y,mx1,my1);
          ctx.stroke();
        }
        // тонкое раскалённое ядро поверх — как настоящий болид, а не линия
        ctx.beginPath();ctx.strokeStyle='rgba(255,255,250,0.85)';ctx.lineWidth=1.4;
        for(var tj=1;tj<tn;tj++){
          var q0=finn.trail[tj-1], q1=finn.trail[tj];
          if(tj===1)ctx.moveTo(q0.x,q0.y);
          ctx.lineTo(q1.x,q1.y);
        }
        ctx.stroke();
      }
      if(morph<0.92){
        ctx.save();
        ctx.globalAlpha=1-morph*0.85;
        drawFinnStar(ctx, finn.x, finn.y, t);
        ctx.restore();
      }
      if(morph>0.25){
        ctx.save();
        ctx.globalAlpha=Math.min(1,(morph-0.25)/0.6);
        drawFinnFace(ctx, finn.x, finn.y, finn.size*(0.75+0.25*morph), t);
        ctx.restore();
      }
    }else if(finn.state!=='enter' && finn.state!=='room'){
      // импульс взрыва: вспышка + лучи + осколки, БЕЗ колец-границ
      if(finn.flash&&finn.flash>0){
        var fl=finn.flash;
        // ударная волна
        if(finn.blastR&&finn.blastR>0){
          var br=finn.blastR;
          var ba=Math.max(0,0.55*(1-br/280));
          ctx.beginPath();
          var bg=ctx.createRadialGradient(finn.x,finn.y,br*0.55,finn.x,finn.y,br);
          bg.addColorStop(0,'rgba(255,240,200,0)');
          bg.addColorStop(0.7,'rgba(255,200,120,'+(ba*0.35)+')');
          bg.addColorStop(1,'rgba(255,160,60,0)');
          ctx.fillStyle=bg;
          ctx.arc(finn.x,finn.y,br,0,Math.PI*2);ctx.fill();
        }
        var fx=finn.x, fy=finn.y;
        var fg=ctx.createRadialGradient(fx,fy,0,fx,fy,finn.size*(1.4+3.2*fl));
        fg.addColorStop(0,'rgba(255,255,255,'+(0.9*fl)+')');
        fg.addColorStop(0.18,'rgba(255,240,180,'+(0.65*fl)+')');
        fg.addColorStop(0.5,'rgba(255,140,40,'+(0.28*fl)+')');
        fg.addColorStop(1,'rgba(255,60,10,0)');
        ctx.fillStyle=fg;
        ctx.beginPath();ctx.arc(fx,fy,finn.size*(1.4+3.2*fl),0,Math.PI*2);ctx.fill();
        // радиальные лучи (импульс, не кольца)
        ctx.save();
        ctx.globalAlpha=fl*0.45;
        var rayN=(tourLock?6:10);
        for(var ray=0;ray<rayN;ray++){
          var ang=(ray/rayN)*Math.PI*2+fl*0.6;
          var len=finn.size*(2.8+4*(1.15-fl));
          var grd=ctx.createLinearGradient(fx,fy,fx+Math.cos(ang)*len,fy+Math.sin(ang)*len);
          grd.addColorStop(0,'rgba(255,255,230,0.85)');
          grd.addColorStop(0.35,'rgba(255,170,70,0.3)');
          grd.addColorStop(1,'rgba(255,80,20,0)');
          ctx.strokeStyle=grd;
          ctx.lineWidth=1.8;
          ctx.beginPath();
          ctx.moveTo(fx+Math.cos(ang)*finn.size*0.4,fy+Math.sin(ang)*finn.size*0.4);
          ctx.lineTo(fx+Math.cos(ang)*len,fy+Math.sin(ang)*len);
          ctx.stroke();
        }
        ctx.restore();
        finn.flash=Math.max(0,finn.flash-0.034);
      }
      finn.sparks.forEach(function(sp){
        ctx.beginPath();
        ctx.fillStyle='rgba(255,230,180,'+Math.max(0,sp.a)+')';
        ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2);ctx.fill();
        sp.x+=(sp.vx||0)*0.016; sp.y+=(sp.vy||0)*0.016; sp.vy=(sp.vy||0)+2; sp.a-=0.045;
      });
      finn.sparks=finn.sparks.filter(function(s){return s.a>0;});
      // лицо проявляется плавно поверх вспышки, а не мгновенной подменой
      var faceA=(finn.state==='birth')?Math.min(1,(finn.birthT||0)/0.32):1;
      ctx.save();ctx.globalAlpha=faceA;
      drawFinnFace(ctx, finn.x, finn.y, finn.size*finn.scale, t);
      ctx.restore();
    }
  }

  drawTourHighlight(t);
  // vignette
  var vg=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}


function ensureSpaceCloseBtn(){
  var b=document.getElementById('matterSpaceFinnClose');
  if(b)return b;
  if(!root)return null;
  b=document.createElement('button');
  b.id='matterSpaceFinnClose';
  b.type='button';
  b.className='m-finn-close-space';
  b.textContent='✕';
  b.setAttribute('aria-label','Скрыть Фину');
  b.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    if(!finn)return;
    finn.state='star';
    finn.x=W*0.5;finn.y=H*0.12;finn.scale=1;finn.alpha=1;
    b.classList.remove('show');
    var d=document.getElementById('matterSpeech');
    if(d){d.innerHTML='';d.style.display='none';}
    if(finnSay._timers){finnSay._timers.forEach(function(id){clearTimeout(id);});finnSay._timers=[];}
  };
  root.appendChild(b);
  return b;
}
function syncSpaceCloseBtn(){
  var b=document.getElementById('matterSpaceFinnClose');
  if(b)b.classList.remove('show'); // крестик убран — закрытие тапом мимо Фины
}

function updateFinn(dt,t){
  if(!finn)return;
  // blink
  if(Math.random()<0.004)finn.blink=0.12;
  if(finn.blink>0)finn.blink-=dt;

  if(finn.state==='fall'){
    var prevFX=finn.x, prevFY=finn.y;
    finn.fallT+=dt;
    var p=Math.min(1,finn.fallT/(finn.fallDur||1.5));
    // smoothstep — без зависания и без рывка в конце
    var ep=p*p*(3-2*p);
    var omp=1-ep;
    finn.x=omp*omp*finn.sx+2*omp*ep*(finn.cx||finn.sx)+ep*ep*finn.tx;
    finn.y=omp*omp*finn.sy+2*omp*ep*(finn.cy||finn.sy)+ep*ep*finn.ty;
    // морф в солнце сжат в последние ~22% полёта — большую часть пути это
    // яркая маленькая звезда с длинным хвостом (эпичный пролёт), и только
    // перед самой посадкой она резко превращается в солнце
    var morphT=Math.max(0,(p-0.78)/0.22);
    finn.morph=morphT*morphT*(3-2*morphT);
    var fdist=Math.hypot(finn.x-prevFX,finn.y-prevFY);
    if(fdist>3){
      finn.trail.push({x:finn.x,y:finn.y});
      if(finn.trail.length>44)finn.trail.splice(0,finn.trail.length-44);
    }
    finn.scale=0.85+0.2*ep;
    if(p>=1){
      finn.x=finn.tx; finn.y=finn.ty;
      finn.morph=1;
      finn.state='birth';
      finn.birthT=0;
      finn.scale=1;
      finn.alpha=1;
      finn.emotion='happy';
      // мощный взрыв рождения
      finn.flash=1.9;
      finn.blastR=0;
      finn.trail=[];
      finn.sparks=[];
      for(var bi=0;bi<32;bi++){
        var ang=Math.random()*Math.PI*2;
        var spd=70+Math.random()*200;
        finn.sparks.push({
          x:finn.x,y:finn.y,
          vx:Math.cos(ang)*spd,
          vy:Math.sin(ang)*spd-20,
          a:1,
          r:1.5+Math.random()*3.2
        });
      }
      finn._tourFall=false;
      if(!tourLock && !startMatterTour._running){
        setTimeout(function(){finnSay('Эй! Я с тобой.');},320);
      }
    }
  }else if(finn.state==='birth'){
    finn.birthT=(finn.birthT||0)+dt;
    var bp=Math.min(1,finn.birthT/0.7);
    finn.morph=1;
    // лёгкая пульсация масштаба от взрыва, без рывка позиции
    finn.scale=1+0.18*Math.sin(bp*Math.PI)*Math.exp(-bp*2.2);
    finn.blastR=(finn.blastR||0)+dt*220;
    if(bp>=1){
      finn.state='idle';
      finn.morph=1;
      finn.scale=1;
      finn.alpha=1;
      finn.flash=0;
      finn.blastR=0;
    }
  }else if(finn.state==='toDoor'){
    finn.x+=(finn.tx-finn.x)*Math.min(1,dt*2.4);
    finn.y+=(finn.ty-finn.y)*Math.min(1,dt*2.4);
    finn.trail.push({x:finn.x,y:finn.y});
    if(finn.trail.length>10)finn.trail.shift();
    var dx=finn.tx-finn.x, dy=finn.ty-finn.y;
    if(dx*dx+dy*dy<100){
      finn.state='enter';
      finn.scale=1;
      openDoorAnim();
    }
  }else if(finn.state==='enter'){
    finn.scale=Math.max(0.05,finn.scale-dt*2.5);
    finn.alpha=finn.scale;
  }else if(finn.state==='idle'){
    var bx=W*0.5, by=H*0.88;
    finn.x=bx+Math.sin(t*1.1)*3;
    finn.y=by+Math.cos(t*0.9)*2;
  }
  syncSpaceCloseBtn();
}

/* ---------- public API ---------- */
function enterMatter(){
  var opts=arguments[0]||{};
  window.__matterTourPending=!!(opts&&opts.tour);

  ensureRoot();
  // разблокировка аудио — обязательно синхронно в обработчике клика,
  // иначе .play() внутри setTimeout при входе в комнату будет заблокирован
  try{
    if(!unlockedRoomAudio){
      unlockedRoomAudio=new Audio('matter-room.mp3');
      unlockedRoomAudio.loop=true;
      unlockedRoomAudio.volume=0;
      var up=unlockedRoomAudio.play();
      if(up&&up.then)up.then(function(){
        try{unlockedRoomAudio.pause();unlockedRoomAudio.currentTime=0;unlockedRoomAudio.volume=0.22;}catch(e){}
      }).catch(function(){ unlockedRoomAudio=null; });
    }
  }catch(e){unlockedRoomAudio=null;}
  root.classList.add('on');
  root.setAttribute('aria-hidden','false');
  document.body.classList.add('matter-lock');
  // chrome гасим с небольшой задержкой — пока растёт дыра, ещё видно приложение
  setTimeout(function(){
    try{
      var tb=document.querySelector('.topbar');if(tb)tb.style.visibility='hidden';
      var bn=document.querySelector('.bottom-nav');if(bn)bn.style.visibility='hidden';
      var fw=document.querySelector('.fab-wrap');if(fw)fw.style.visibility='hidden';
    }catch(e){}
  },480);
  resize();
  hidePanel();
  closeReader();
  var room=document.getElementById('matterRoom');if(room){room.hidden=true;room.style.display='none';}
  var hud=document.getElementById('matterHud');if(hud){hud.hidden=true;}
  var panel=document.getElementById('matterPanel');if(panel){panel.hidden=true;panel.style.display='none';}
  stopAmbient();
  startEnter();
}

function exitMatter(){
  tourLock=false;startMatterTour._running=false;tourHL=null;stopTourAudio();
  phase='idle';
  if(raf){cancelAnimationFrame(raf);raf=0;}
  stopAmbient();
  roomOpen=false;
  if(root){
    root.classList.remove('on');
    root.setAttribute('aria-hidden','true');
  }
  document.body.classList.remove('matter-lock');
  try{
    var tb=document.querySelector('.topbar');if(tb)tb.style.visibility='';
    var bn=document.querySelector('.bottom-nav');if(bn)bn.style.visibility='';
    var fw=document.querySelector('.fab-wrap');if(fw)fw.style.visibility='';
  }catch(e){}
  hidePanel();
  closeReader();
  try{
    if(location.hash.indexOf('matter')>=0)history.replaceState(null,'',location.pathname+location.search);
  }catch(e){}
}

// отключаем кривой второй слой matter-finn.js, если он успел загрузиться
try{if(window.__MatterFinn){try{window.__MatterFinn.hideRoomFinn&&window.__MatterFinn.hideRoomFinn();}catch(e){}window.__MatterFinn={finn:{mode:'off'},startFall:function(){},startListen:function(){},showRoomFinn:function(){},hideRoomFinn:function(){}};}}catch(e){}



function pauseRoomAudio(){
  try{if(roomAudio){roomAudio.pause();}}catch(e){}
  try{if(ambient&&ambient.type==='synth'&&ambient.master)ambient.master.gain.value=0;}catch(e){}
}
function resumeRoomAudio(){
  if(phase!=='room')return;
  try{
    if(roomAudio){
      var pr=roomAudio.play();
      if(pr&&pr.catch)pr.catch(function(){});
    }else if(ambient&&ambient.type==='synth'&&ambient.master){
      ambient.master.gain.value=0.03;
    }
  }catch(e){}
}
function bindAudioLifecycle(){
  if(bindAudioLifecycle._done)return;
  bindAudioLifecycle._done=true;
  document.addEventListener('visibilitychange',function(){
    if(document.hidden)pauseRoomAudio();
    else resumeRoomAudio();
  },false);
  window.addEventListener('pagehide',pauseRoomAudio,false);
  window.addEventListener('blur',function(){
    // WebView часто не шлёт visibilitychange при сворачивании
    setTimeout(function(){
      if(document.hidden||!document.hasFocus())pauseRoomAudio();
    },80);
  },false);
  window.addEventListener('focus',function(){
    if(!document.hidden)resumeRoomAudio();
  },false);
}
bindAudioLifecycle();

window.FinMatter={
  enter:enterMatter,
  exit:exitMatter,
  isOpen:function(){return phase!=='idle';},
  back:handleBack
};
})();
