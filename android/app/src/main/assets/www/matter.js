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
      pageByBook: r.pageByBook||{}
    };
  }catch(e){
    return {plantLevel:0,plantWateredAt:0,doorUnlocked:true,visitedRoom:false,notes:[],diary:'',firstEnter:null,books:{},pageByBook:{}};
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
      roomAudio.volume=0.28;
      roomAudio.currentTime=0;
      var p2=roomAudio.play();
      if(p2&&p2.catch)p2.catch(function(){ startSynthAmbient(); });
      ambient={type:'mp3'};
      return;
    }
    roomAudio=new Audio('matter-room.mp3');
    roomAudio.loop=true;
    roomAudio.volume=0.28;
    var p=roomAudio.play();
    if(p&&p.catch)p.catch(function(){ startSynthAmbient(); });
    ambient={type:'mp3'};
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

/* ---------- soft Finn speech (like main app) ---------- */
function finnSay(text){
  if(!text)return;
  var el=document.getElementById('matterDialog');
  if(!el){
    el=document.createElement('div');
    el.id='matterDialog';
    el.className='m-dialog';
    if(root)root.appendChild(el);
  }
  el.textContent=text;
  el.classList.add('show');
  clearTimeout(finnSay._t);
  finnSay._t=setTimeout(function(){el.classList.remove('show');},4200);
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
      '<!-- hint removed -->'+
    '</div>'+
    '<div id="matterRoom" class="m-room" hidden>'+
      '<div class="m-room-scene" id="matterRoomScene">'+
        '<div class="m-room-bg"></div>'+
        /* Hotspots: размер зоны ≈ размер объекта; дневник точно на книге-дневнике */
        '<button type="button" class="m-hot m-hot-sm" data-obj="diary"  style="left:16%;top:88%" title="Дневник"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="book"   style="left:50%;top:71%" title="Книга"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="plant"  style="left:73%;top:55%" title="Растение"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="piggy"  style="left:77%;top:40%" title="Копилка"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="goals"  style="left:81%;top:26%" title="Цели"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="window" style="left:48%;top:28%" title="Окно"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="desk"   style="left:47%;top:49%" title="Стол"></button>'+
        '<button type="button" class="m-hot m-hot-lg" data-obj="bed"    style="left:15%;top:55%" title="Кровать"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="lamp"   style="left:35%;top:44%" title="Лампа"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="focus"  style="left:10%;top:38%" title="Фокус"></button>'+
        '<button type="button" class="m-hot m-hot-md" data-obj="door"   style="left:93%;top:48%" title="Выход"></button>'+
        '<button type="button" class="m-hot m-hot-sm" data-obj="globe"  style="left:88%;top:87%" title="Светильник"></button>'+
        /* room Finn removed by design */+
      '</div>'+
    '</div>'+
    '<div id="matterPanel" class="m-panel" hidden>'+
      '<div class="m-panel-card">'+
        '<div class="m-panel-title" id="mPanelTitle"></div>'+
        '<div class="m-panel-body" id="mPanelBody"></div>'+
        '<button type="button" class="m-panel-close" id="mPanelClose">Закрыть</button>'+
      '</div>'+
    '</div>'+
    '<div id="matterReader" class="m-reader" hidden>'+
      '<div class="m-reader-head"><span id="mReaderTitle">Книга</span><button type="button" id="mReaderClose">✕</button></div>'+
      '<div class="m-reader-page" id="mReaderPage"></div>'+
      '<div class="m-reader-foot"><span id="mReaderProg">1 / 1</span></div>'+
    '</div>';
  injectCSS();
  document.body.appendChild(root);
  canvas=document.getElementById('matterCanvas');
  ctx=canvas.getContext('2d');
  document.getElementById('matterExit').onclick=function(){exitMatter();};
  document.getElementById('mPanelClose').onclick=function(){hidePanel();};
  document.getElementById('matterPanel').addEventListener('click',function(e){
    if(e.target&&e.target.id==='matterPanel')hidePanel();
  });
  document.getElementById('mReaderClose').onclick=function(){closeReader();};
  root.querySelectorAll('.m-hot').forEach(function(b){
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();onObject(b.dataset.obj);});
  });
  canvas.addEventListener('click',onCanvasTap);
  canvas.addEventListener('touchend',function(e){
    if(!e.changedTouches||!e.changedTouches[0])return;
    var t=e.changedTouches[0];
    onCanvasTap({clientX:t.clientX,clientY:t.clientY,preventDefault:function(){}});
  },{passive:false});
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
  'text-shadow:0 0 12px rgba(120,180,255,.9),0 0 28px rgba(80,140,255,.55),0 0 48px rgba(60,100,255,.35);animation:mTitlePulse 3.5s ease-in-out infinite alternate}'+
'@keyframes mTitlePulse{from{opacity:.82;filter:brightness(.95)}to{opacity:1;filter:brightness(1.12)}}'+
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
'.m-hot:active{background:rgba(255,220,120,.12);box-shadow:0 0 22px rgba(255,200,80,.28)}'+
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
  'background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;font-weight:700;border:0}'+
'.m-panel-close{width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.07);'+
  'border:1px solid rgba(255,255,255,.12);color:#E8F0FF;font-weight:600}'+
/* reader — single page, swipe only */
'.m-reader{position:absolute;inset:0;z-index:30;background:#0c0a0e;display:flex;flex-direction:column;'+
  'padding:calc(10px + env(safe-area-inset-top,0px)) 0 calc(10px + env(safe-area-inset-bottom,0px))}'+
'.m-reader-head{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;color:#E8DCC8;font-size:13px}'+
'.m-reader-head button{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#E8F0FF}'+
'.m-reader-page{flex:1;overflow:hidden;padding:8px 22px;color:#EDE4D4;font-size:16px;line-height:1.55;'+
  'font-family:Georgia,"Times New Roman",serif;white-space:pre-wrap;user-select:none;'+
  '-webkit-user-select:none;touch-action:pan-y}'+
'.m-reader-foot{text-align:center;padding:8px;font-size:12px;color:rgba(200,190,170,.6)}'+
/* HTML hidden must beat display:flex — иначе при входе виден пустой «Книга» */
'.m-reader[hidden],.m-panel[hidden],.m-hud[hidden],.m-room[hidden],.m-room-finn[hidden]{display:none!important}'+
'.m-dialog{position:absolute;left:50%;bottom:calc(18% + 100px);transform:translateX(-50%) translateY(8px);'+'z-index:15;max-width:min(92vw,360px);max-height:28vh;overflow:auto;padding:14px 16px;border-radius:18px;'+'background:rgba(12,16,28,.88);border:1px solid rgba(255,255,255,.12);color:#E8ECF4;'+'font-size:15px;line-height:1.4;font-family:system-ui,sans-serif;text-align:center;'+'opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;'+'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,.45)}'+'.m-dialog.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}'+'.m-finn-close-space{position:absolute;z-index:16;width:36px;height:36px;border-radius:50%;'+'background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.22);color:#f5efe6;font-size:16px;'+'display:none;align-items:center;justify-content:center;padding:0}'+'.m-finn-close-space.show{display:flex}'+'body.matter-lock{overflow:hidden!important}';
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

/* ---------- constellation + diagonal door ---------- */
function buildStars(){
  stars=[];
  var goals=getGoals();
  // Реальные относительные координаты Большой Медведицы (7) и Малой (7)
  // Нормализованы 0..1 внутри bounding box созвездия
  var ursaMajor=[
    [0.12,0.42],[0.28,0.38],[0.42,0.40],[0.55,0.44], // ковш дно+бок
    [0.62,0.28],[0.48,0.18],[0.32,0.22]               // ручка
  ];
  var ursaMinor=[
    [0.78,0.22], // Полярная
    [0.74,0.32],[0.70,0.42],[0.68,0.52], // ручка
    [0.62,0.58],[0.72,0.62],[0.80,0.56]  // ковш
  ];
  // связи для линий (индексы внутри своей группы)
  var majLinks=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]];
  var minLinks=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]];
  var scale=Math.min(W,H);
  var ox=W*0.08, oy=H*0.22;
  var bw=W*0.84, bh=H*0.48;
  function place(pts, links, list, group){
    var placed=[];
    pts.forEach(function(p,i){
      var g=list[i]||null;
      var x=ox+p[0]*bw, y=oy+p[1]*bh;
      var hue=g?(g.type==='debt'?8:(g.urgent?38:205)):210;
      var st={
        id:g?g.id:('empty_'+group+'_'+i), g:g, x:x, y:y,
        baseR:g?(g.type==='debt'?3.4:(4.2+Math.min(5,(g.pct||0)/28))):2.6,
        hue:hue, pulse:i*0.7, bright:g?(0.6+(g.pct||0)/220):0.35,
        group:group, idx:i
      };
      stars.push(st);
      placed.push(st);
    });
    // store links as pairs of star refs later via indices
    placed._links=links;
    return placed;
  }
  var majGoals=goals.slice(0,7);
  var minGoals=goals.slice(7,14);
  var maj=place(ursaMajor, majLinks, majGoals, 'maj');
  var min=place(ursaMinor, minLinks, minGoals, 'min');
  // link metadata for drawSpace
  window.__matterLinks=[];
  majLinks.forEach(function(lk){ window.__matterLinks.push([maj[lk[0]], maj[lk[1]]]); });
  minLinks.forEach(function(lk){ window.__matterLinks.push([min[lk[0]], min[lk[1]]]); });
  // leftover goals — soft arc near major
  goals.slice(14).forEach(function(g,i){
    var ang=(-0.4)+(i*0.35);
    var x=ox+bw*0.5+Math.cos(ang)*bw*0.22;
    var y=oy+bh*0.85+Math.sin(ang)*bh*0.12;
    stars.push({
      id:g.id,g:g,x:x,y:y,baseR:3.5+Math.min(4,(g.pct||0)/40),
      hue:g.type==='debt'?8:(g.urgent?38:200),pulse:i,bright:0.55+(g.pct||0)/250
    });
  });
  for(var i=0;i<90;i++){
    stars.push({
      id:'bg'+i,g:null,
      x:Math.random()*W,y:Math.random()*H,
      baseR:0.3+Math.random()*1.2,
      hue:210+Math.random()*40,pulse:Math.random()*6,bright:0.12+Math.random()*0.35,
      bg:true
    });
  }
  // Дверь = мини чёрная дыра справа снизу (не на Медведицах)
  var dx=W*0.86, dy=H*0.76;
  var vortex=[];
  for(var vi=0;vi<36;vi++){
    vortex.push({
      a:Math.random()*Math.PI*2,
      r:18+Math.random()*34,
      sp:1.2+Math.random()*2.4,
      s:0.8+Math.random()*1.6
    });
  }
  door={
    x:dx,y:dy,r:48,
    vortex:vortex,
    open:0,opening:false,entered:false,
    swirl:0
  };
}

/* ---------- Finn state machine ---------- */
function resetFinn(){
  finn={
    state:'star', // star | fall | morph | idle | toDoor | enter | room
    x:W*0.5, y:H*0.16,
    tx:W*0.5, ty:H*0.16,
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

function drawFinnFace(c, cx, cy, size, t){
  var s=size;
  var emo=(finn&&finn.emotion)||'idle';
  c.save();
  c.translate(cx,cy);
  var pulse=0.94+0.06*Math.sin(t*2.8);

  // корона
  var g0=c.createRadialGradient(0,0,s*0.2,0,0,s*1.85);
  g0.addColorStop(0,'rgba(255,255,245,0.9)');
  g0.addColorStop(0.25,'rgba(255,200,100,0.5)');
  g0.addColorStop(0.55,'rgba(255,100,60,0.22)');
  g0.addColorStop(1,'rgba(120,20,40,0)');
  c.fillStyle=g0;
  c.beginPath();c.arc(0,0,s*1.85*pulse,0,Math.PI*2);c.fill();

  // мягкие лучи (мало, без «точек»)
  for(var i=0;i<8;i++){
    var ang=(i/8)*Math.PI*2+t*0.2;
    var len=s*(1.25+0.2*Math.sin(t*3+i));
    c.save();c.rotate(ang);
    var fl=c.createLinearGradient(0,0,0,-len);
    fl.addColorStop(0,'rgba(255,255,230,0.75)');
    fl.addColorStop(0.5,'rgba(255,160,50,0.28)');
    fl.addColorStop(1,'rgba(255,80,40,0)');
    c.fillStyle=fl;
    c.beginPath();
    c.moveTo(-s*0.08,0);
    c.lineTo(0,-len);
    c.lineTo(s*0.08,0);
    c.closePath();c.fill();
    c.restore();
  }

  // диск тела
  var body=c.createRadialGradient(-s*0.18,-s*0.22,0,0,0,s*0.9);
  body.addColorStop(0,'#FFFDF5');
  body.addColorStop(0.35,'#FFE29A');
  body.addColorStop(0.7,'#FF9A3C');
  body.addColorStop(1,'#E84860');
  c.fillStyle=body;
  c.beginPath();c.arc(0,0,s*0.88,0,Math.PI*2);c.fill();

  // румянец
  c.fillStyle='rgba(255,90,110,0.28)';
  c.beginPath();c.ellipse(-s*0.38,s*0.12,s*0.14,s*0.09,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(s*0.38,s*0.12,s*0.14,s*0.09,0,0,Math.PI*2);c.fill();

  // брови
  c.strokeStyle=emo==='think'?'rgba(60,20,30,0.55)':'rgba(80,30,40,0.4)';
  c.lineWidth=Math.max(1.4,s*0.045);
  c.lineCap='round';
  var browY=-s*0.22+(emo==='listening'?-s*0.04:0);
  c.beginPath();
  c.moveTo(-s*0.42,browY+(emo==='think'?s*0.04:0));
  c.quadraticCurveTo(-s*0.28,browY-s*0.06,-s*0.12,browY);
  c.stroke();
  c.beginPath();
  c.moveTo(s*0.12,browY);
  c.quadraticCurveTo(s*0.28,browY-s*0.06,s*0.42,browY+(emo==='think'?s*0.04:0));
  c.stroke();

  // глаза
  var eyeOpen=finn&&finn.blink>0?0.08:1;
  var eyeH=s*0.16*eyeOpen*(emo==='listening'?1.1:1);
  var eyeY=-s*0.02;
  [[-0.28],[0.28]].forEach(function(p){
    var ex=p[0]*s;
    // белок
    c.fillStyle='rgba(255,255,255,0.92)';
    c.beginPath();c.ellipse(ex,eyeY,s*0.15,eyeH,0,0,Math.PI*2);c.fill();
    if(eyeOpen>0.2){
      // радужка cyan
      c.fillStyle='#3DD6F5';
      c.beginPath();c.ellipse(ex,eyeY+s*0.01,s*0.09,eyeH*0.75,0,0,Math.PI*2);c.fill();
      c.fillStyle='#0B3A4A';
      c.beginPath();c.arc(ex,eyeY+s*0.02,s*0.04,0,Math.PI*2);c.fill();
      c.fillStyle='#fff';
      c.beginPath();c.arc(ex-s*0.03,eyeY-s*0.03,s*0.035,0,Math.PI*2);c.fill();
    }
  });

  // рот
  c.strokeStyle='rgba(90,25,40,0.65)';
  c.lineWidth=Math.max(1.8,s*0.055);
  c.lineCap='round';
  c.beginPath();
  if(emo==='listening'){
    c.ellipse(0,s*0.32,s*0.07,s*0.09,0,0,Math.PI*2);
  }else if(emo==='think'){
    c.moveTo(-s*0.1,s*0.34);c.quadraticCurveTo(0,s*0.3,s*0.12,s*0.36);
  }else if(emo==='happy'){
    c.moveTo(-s*0.22,s*0.26);
    c.quadraticCurveTo(0,s*0.48,s*0.22,s*0.26);
  }else{
    c.moveTo(-s*0.18,s*0.28);
    c.quadraticCurveTo(0,s*0.4,s*0.18,s*0.28);
  }
  c.stroke();

  // блик
  c.fillStyle='rgba(255,255,255,0.5)';
  c.beginPath();c.ellipse(-s*0.22,-s*0.32,s*0.2,s*0.1,-0.4,0,Math.PI*2);c.fill();

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

function startEnter(){
  phase='blackhole';
  bh={r:1.5,max:Math.max(W,H)*1.05,swirl:0,fall:0,done:false,t:0,bgStars:null};
  particles=[];
  for(var i=0;i<110;i++){
    particles.push({
      a:Math.random()*Math.PI*2,
      r:12+Math.random()*Math.min(W,H)*0.35,
      sp:0.7+Math.random()*2.2,
      s:0.8+Math.random()*2.2
    });
  }
  resetFinn();
  lastT=performance.now();
  // не прячем chrome мгновенно — первые кадры BH поверх приложения (полупрозрачно)
  loop();
}

function enterConstellation(){
  phase='space';
  buildStars();
  resetFinn();
  finn.state='star';
  finn.x=W*0.5; finn.y=H*0.16;
  var hud=document.getElementById('matterHud');
  if(hud)hud.hidden=false;
  if(!MS.firstEnter){MS.firstEnter=new Date().toISOString();saveState();}
  try{history.pushState({matter:'space'},'','#matter');}catch(e){}
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
  var room=document.getElementById('matterRoom');
  if(room){room.hidden=false;room.style.display='';}
  var hud=document.getElementById('matterHud');
  if(hud)hud.hidden=true;
  startAmbient();
  // Фины в комнате нет — комната личная
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
  if(phase==='space'||phase==='blackhole'){exitMatter();return true;}
  return false;
}

/* ---------- interaction ---------- */
function onCanvasTap(e){
  if(phase!=='space')return;
  var rect=canvas.getBoundingClientRect();
  var x=e.clientX-rect.left, y=e.clientY-rect.top;

  // Падающая звезда → рождение Фины
  if(finn && finn.state==='star'){
    var dx=x-finn.x, dy=y-finn.y;
    if(dx*dx+dy*dy < 48*48){
      finn.state='fall';
      finn.fallV=0;
      finn.tx=W*0.5;
      finn.ty=H*0.72;
      finn.trail=[];finn.sparks=[];
      finn.emotion='happy';
      return;
    }
  }

  // Тап по Фине (idle) → слушать; тап мимо → закрыть в звезду
  if(finn && finn.state==='idle'){
    var dx=x-finn.x, dy=y-finn.y;
    var hitR=(finn.size||58)*0.95;
    if(dx*dx+dy*dy < hitR*hitR){
      finn.emotion='listening';
      finnSay('Слушаю…');
      startListen();
      return;
    }
    // мимо — свернуть в звезду и снести все частицы
    finn.state='star';
    finn.x=W*0.5;finn.y=H*0.16;finn.scale=1;finn.alpha=1;
    finn.emotion='idle';
    finn.trail=[]; finn.sparks=[]; finn.flash=0; finn.fallV=0;
    var d=document.getElementById('matterDialog');
    if(d)d.classList.remove('show');
    try{if(rec){rec.abort();rec=null;}}catch(err){}
    return;
  }

  // дверь-чёрная дыра
  if(door){
    var dx2=x-door.x, dy2=y-door.y;
    if(dx2*dx2+dy2*dy2 < (door.r+28)*(door.r+28)){
      if(finn && finn.state==='idle'){
        finn.state='toDoor';
        finn.tx=door.x; finn.ty=door.y;
        finnSay('Идём в комнату.');
      }else{
        openDoorAnim();
      }
      return;
    }
  }

  // goal stars
  var best=null,bestD=42*42;
  stars.forEach(function(s){
    if(s.bg||!s.g)return;
    var dx=x-s.x, dy=y-s.y, d=dx*dx+dy*dy;
    if(d<bestD){bestD=d;best=s;}
  });
  if(best)showStar(best);
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
  document.getElementById('mPanelTitle').textContent=title;
  document.getElementById('mPanelBody').innerHTML=html;
  if(p){p.hidden=false;p.style.display='';}
}
function hidePanel(){
  var p=document.getElementById('matterPanel');
  if(p){p.hidden=true;p.style.display='none';}
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
    var books=MS.books||{};
    var keys=Object.keys(books);
    var html='<p style="margin:0 0 12px;opacity:.85;line-height:1.4">Полка. Можно открыть сохранённую книгу или загрузить FB2.</p>';
    if(keys.length){
      keys.slice(0,8).forEach(function(k){
        var b=books[k]||{};
        html+='<button type="button" class="m-act" data-open-book="'+k+'" style="margin-top:8px">'+(b.title||'Книга')+'</button>';
      });
    }else{
      html+='<p style="opacity:.6;font-size:13px">Пока пусто.</p>';
    }
    html+='<button type="button" class="m-act" id="mAddBook" style="margin-top:14px">+ Загрузить FB2</button>';
    showPanel('Книги', html);
    setTimeout(function(){
      var add=document.getElementById('mAddBook');
      if(add){
        add.onclick=function(ev){
          if(ev){ev.preventDefault();ev.stopPropagation();}
          pickFb2File();
        };
      }
      var panel=document.getElementById('mPanelBody');
      if(panel){
        panel.querySelectorAll('[data-open-book]').forEach(function(btn){
          btn.onclick=function(ev){
            if(ev){ev.preventDefault();ev.stopPropagation();}
            var id=btn.getAttribute('data-open-book');
            var b=(MS.books||{})[id];
            if(!b||!b.raw){toast('Нет текста книги');return;}
            reader.bookId=id;
            hidePanel();
            openReader(b.raw);
            var rt=document.getElementById('mReaderTitle');
            if(rt)rt.textContent=b.title||'Книга';
          };
        });
      }
    },30);
    return;
  }
  if(id==='diary'||id==='desk'){
    var html='Личные заметки только на этом устройстве.\n\n';
    html+='<textarea id="mDiary" style="width:100%;min-height:100px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);color:#F5E6C8;padding:10px;resize:vertical">'+(MS.diary||'')+'</textarea>';
    html+='<button type="button" class="m-act" id="mSaveDiary">Сохранить</button>';
    showPanel(id==='desk'?'Рабочий стол · дневник':'Дневник', html);
    setTimeout(function(){
      var b=document.getElementById('mSaveDiary');
      if(b)b.onclick=function(){
        var t=document.getElementById('mDiary');
        MS.diary=t?String(t.value||'').slice(0,4000):'';
        saveState();toast('Сохранено');hidePanel();
      };
    },30);
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

/* ---------- FB2 / text reader, swipe-only, one page ---------- */
var reader={pages:[],idx:0,bookId:'default'};

function parseFb2(xml){
  // strip tags, keep paragraphs
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
  // fit text into one screen page by measuring
  var pageEl=document.getElementById('mReaderPage');
  if(!pageEl)return [text];
  var maxH=pageEl.clientHeight|| (window.innerHeight*0.72);
  var pages=[], rest=text;
  var probe=document.createElement('div');
  probe.style.cssText='position:absolute;visibility:hidden;width:'+(pageEl.clientWidth||300)+'px;font:16px/1.55 Georgia,serif;white-space:pre-wrap;padding:0';
  document.body.appendChild(probe);
  while(rest.length){
    // binary search length that fits
    var lo=80, hi=rest.length, best=rest.length;
    while(lo<=hi){
      var mid=(lo+hi)>>1;
      probe.textContent=rest.slice(0,mid);
      if(probe.offsetHeight<=maxH-8){best=mid;lo=mid+1;}
      else hi=mid-1;
    }
    // prefer break at paragraph/space
    if(best<rest.length){
      var slice=rest.slice(0,best);
      var br=Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
      if(br>best*0.55) best=br+1;
    }
    pages.push(rest.slice(0,best).trim());
    rest=rest.slice(best).trim();
    if(pages.length>400)break;
  }
  document.body.removeChild(probe);
  return pages.length?pages:[''];
}


function pickFb2File(){
  // отдельный input — не внутри панели, чтобы WebView не зависал
  var old=document.getElementById('mBookFile');
  if(old&&old.parentNode)old.parentNode.removeChild(old);
  var file=document.createElement('input');
  file.type='file';
  file.id='mBookFile';
  file.accept='.fb2,text/xml,application/xml,application/x-fictionbook+xml,*/*';
  file.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;z-index:99999';
  document.body.appendChild(file);
  file.addEventListener('change',function(){
    var f=file.files&&file.files[0];
    try{if(file.parentNode)file.parentNode.removeChild(file);}catch(e){}
    if(!f)return;
    toast('Читаю файл…');
    var fr=new FileReader();
    fr.onerror=function(){toast('Не удалось прочитать файл');};
    fr.onload=function(){
      try{
        var raw=String(fr.result||'');
        if(raw.length>800000) raw=raw.slice(0,800000); // не вешаем UI
        var id='b_'+Date.now();
        var title=(f.name||'Книга').replace(/\.fb2$/i,'');
        // лёгкая пагинация
        var text=/<FictionBook|<body/i.test(raw)?parseFb2(raw):raw;
        if(text.length>400000) text=text.slice(0,400000);
        var pages=paginate(text);
        MS.books=MS.books||{};
        // в storage — урезанный raw
        MS.books[id]={title:title,raw:text.slice(0,300000),pages:pages.length};
        MS.pageByBook[id]=0;
        try{saveState();}catch(e){}
        hidePanel();
        reader.bookId=id;
        reader.pages=pages;
        reader.idx=0;
        var r=document.getElementById('matterReader');
        if(r){r.hidden=false;r.style.display='';}
        renderPage();
        var rt=document.getElementById('mReaderTitle');
        if(rt)rt.textContent=title;
        toast('Книга открыта');
      }catch(err){
        toast('Ошибка книги');
      }
    };
    fr.readAsText(f);
  },{once:true});
  // клик только после добавления в DOM
  setTimeout(function(){
    try{file.click();}catch(e){toast('Не удалось открыть выбор файла');}
  },80);
}

function openReader(raw){
  if(window.__matterReaderBookId){reader.bookId=window.__matterReaderBookId;window.__matterReaderBookId=null;}
  var sample=raw||(
    'Тихая полка.\n\n'+
    'Здесь можно читать то, что важно именно тебе. Добавь FB2-файл позже — прогресс сохранится.\n\n'+
    'А пока — несколько строк для паузы.\n\n'+
    '«Деньги — это инструмент. Спокойствие — цель. '+
    'Каждый маленький шаг в сторону подушки безопасности делает ночь чуть тише.»\n\n'+
    'Когда будешь готов — свайпни влево, чтобы перевернуть страницу. '+
    'Назад — свайп вправо. Без кнопок, только жест.'
  );
  var text=/<FictionBook|<body/i.test(sample)?parseFb2(sample):sample;
  reader.pages=paginate(text);
  reader.idx=MS.pageByBook[reader.bookId]|0;
  if(reader.idx>=reader.pages.length)reader.idx=0;
  var r=document.getElementById('matterReader');
  if(r){r.hidden=false;r.style.display='';}
  renderPage();
}

function renderPage(){
  var el=document.getElementById('mReaderPage');
  var prog=document.getElementById('mReaderProg');
  if(!el)return;
  el.textContent=reader.pages[reader.idx]||'';
  if(prog)prog.textContent=(reader.idx+1)+' / '+reader.pages.length;
  MS.pageByBook[reader.bookId]=reader.idx;
  saveState();
}

function closeReader(){
  var r=document.getElementById('matterReader');
  if(r){r.hidden=true;r.style.display='none';}
}

function setupReaderSwipe(){
  var startX=0,startY=0;
  var page=null;
  function bind(){
    page=document.getElementById('mReaderPage');
    if(!page||page._sw)return;
    page._sw=true;
    page.addEventListener('touchstart',function(e){
      if(!e.touches[0])return;
      startX=e.touches[0].clientX;startY=e.touches[0].clientY;
    },{passive:true});
    page.addEventListener('touchend',function(e){
      if(!e.changedTouches[0])return;
      var dx=e.changedTouches[0].clientX-startX;
      var dy=e.changedTouches[0].clientY-startY;
      if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy))return;
      if(dx<0 && reader.idx<reader.pages.length-1){reader.idx++;renderPage();}
      else if(dx>0 && reader.idx>0){reader.idx--;renderPage();}
    },{passive:true});
  }
  setTimeout(bind,0);
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
  var t=String(text||'').toLowerCase();
  if(/комнат|двер|войд|зайд|пошл|идём|идем/.test(t)){
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
  // soft default like main Finn
  var soft=[
    'Слушаю тебя.',
    'Я рядом.',
    'Можешь просто отдохнуть.',
    'Хочешь — покажу цели на звёздах.',
    'В комнате тише. Зайдём?'
  ];
  finnSay(soft[Math.floor(Math.random()*soft.length)]);
}

/* ---------- draw loop ---------- */
function loop(t){
  if(phase==='idle')return;
  raf=requestAnimationFrame(loop);
  t=t||performance.now();
  var dt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  resize();
  if(phase==='blackhole')drawBlackHole(dt);
  else if(phase==='space')drawSpace(dt,t/1000);
  else if(phase==='room'){ /* room DOM only */ }
}

function drawBlackHole(dt){
  var cx=W/2, cy=H*0.52;
  // рост из точки + ускорение «падения»
  bh.swirl+=dt*(2.4+bh.r/Math.max(1,bh.max)*3.5);
  var target=bh.max*0.72;
  bh.r+= (target - bh.r)*Math.min(1,dt*0.85);
  if(bh.r<8) bh.r+=dt*14; // быстрый старт из точки
  bh.t=(bh.t||0)+dt;
  if(bh.r>bh.max*0.28) bh.fall+=dt;

  // фон: сначала полупрозрачный (ещё видно приложение), потом космос
  var fadeIn=Math.min(1, bh.t/0.9);
  var veil=Math.min(0.92, 0.25+fadeIn*0.7+bh.fall*0.35);
  ctx.fillStyle='rgba(0,0,0,'+veil+')';
  ctx.fillRect(0,0,W,H);

  // мерцающие фоновые звёзды
  if(!bh.bgStars){
    bh.bgStars=[];
    for(var i=0;i<110;i++){
      bh.bgStars.push({
        x:Math.random()*W, y:Math.random()*H,
        r:0.4+Math.random()*1.6,
        ph:Math.random()*6.28, sp:1.5+Math.random()*3
      });
    }
  }
  bh.bgStars.forEach(function(s){
    var a=0.15+0.75*(0.5+0.5*Math.sin(bh.t*s.sp+s.ph));
    // лёгкий засос к центру
    var dx=s.x-cx, dy=s.y-cy;
    var dist=Math.sqrt(dx*dx+dy*dy)||1;
    if(bh.r>20){
      s.x-=dx/dist*dt*(8+bh.r*0.04);
      s.y-=dy/dist*dt*(8+bh.r*0.04);
      // орбитальный закрут
      s.x+=(-dy/dist)*dt*bh.swirl*2.5;
      s.y+=(dx/dist)*dt*bh.swirl*2.5;
    }
    ctx.beginPath();
    ctx.fillStyle='rgba(210,230,255,'+a+')';
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
  });

  // вихрь частиц (аккреция)
  particles.forEach(function(p){
    p.a+=dt*p.sp*(1.2+bh.r/bh.max);
    p.r=Math.max(3,p.r-dt*(10+bh.r*0.02));
    if(p.r<6 && Math.random()<0.08){
      p.r=30+Math.random()*bh.r*0.9;
      p.a=Math.random()*Math.PI*2;
    }
    var rr=p.r*(0.55+0.55*bh.r/Math.max(1,bh.max*0.6));
    var x=cx+Math.cos(p.a+bh.swirl)*rr;
    var y=cy+Math.sin(p.a+bh.swirl)*rr*0.52;
    var a=0.2+0.55*(1-p.r/120);
    ctx.beginPath();
    ctx.fillStyle='rgba(160,200,255,'+a+')';
    ctx.arc(x,y,p.s*(0.8+bh.r/bh.max),0,Math.PI*2);ctx.fill();
  });

  // диск аккреции — эллипсы
  for(var i=0;i<22;i++){
    var rr=bh.r*(0.28+i*0.045);
    ctx.beginPath();
    ctx.strokeStyle='rgba(120,170,255,'+(0.03+i*0.007)+')';
    ctx.lineWidth=1.5+i*0.05;
    ctx.ellipse(cx,cy,rr,rr*0.36,bh.swirl*0.12,0,Math.PI*2);
    ctx.stroke();
  }

  // фотонное кольцо
  if(bh.r>12){
    ctx.beginPath();
    ctx.strokeStyle='rgba(255,220,180,'+(0.25+0.35*Math.sin(bh.t*4))+')';
    ctx.lineWidth=2.5;
    ctx.ellipse(cx,cy,bh.r*0.62,bh.r*0.22,bh.swirl*0.08,0,Math.PI*2);
    ctx.stroke();
  }

  // горизонт событий
  var grd=ctx.createRadialGradient(cx,cy,0,cx,cy,bh.r*0.58);
  grd.addColorStop(0,'rgba(0,0,0,1)');
  grd.addColorStop(0.5,'rgba(5,5,15,1)');
  grd.addColorStop(0.78,'rgba(30,50,110,0.45)');
  grd.addColorStop(0.92,'rgba(180,200,255,0.25)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath();ctx.fillStyle=grd;ctx.arc(cx,cy,bh.r*0.58,0,Math.PI*2);ctx.fill();

  // эффект падения — затемнение + лёгкий zoom vignette
  if(bh.fall>0){
    var v=Math.min(1,bh.fall/1.15);
    ctx.fillStyle='rgba(0,0,0,'+v+')';
    ctx.fillRect(0,0,W,H);
    if(v>0.94){enterConstellation();}
  }
}

function drawSpace(dt,t){
  var g=ctx.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.5,Math.max(W,H)*0.7);
  g.addColorStop(0,'#0a1020');g.addColorStop(0.5,'#05080f');g.addColorStop(1,'#000');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

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

  stars.forEach(function(s){
    var pulse=0.65+0.35*Math.sin(t*1.4+s.pulse);
    var r=s.baseR*(s.bg?1:pulse);
    var a=s.bright*pulse;
    if(!s.bg){
      ctx.beginPath();
      ctx.fillStyle='hsla('+s.hue+',80%,70%,'+(0.08*pulse)+')';
      ctx.arc(s.x,s.y,r*4.5,0,Math.PI*2);ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle='hsla('+s.hue+',90%,85%,'+a+')';
    ctx.arc(s.x,s.y,r,0,Math.PI*2);ctx.fill();
  });

  // дверь = чёрная дыра
  if(door){
    if(door.opening){
      door.open=Math.min(1,door.open+dt*0.85);
      if(door.open>=1 && !door.entered){
        door.entered=true;
        setTimeout(function(){enterRoom();},160);
      }
    }
    door.swirl=(door.swirl||0)+dt*(2.2+door.open*3);
    var dx=door.x, dy=door.y;
    var sc=1+door.open*0.55;
    var R=door.r*sc;

    // вихрь частиц
    if(door.vortex){
      door.vortex.forEach(function(p){
        p.a+=dt*p.sp*(1+door.open);
        var rr=p.r*(0.7+0.5*sc);
        var px=dx+Math.cos(p.a+door.swirl)*rr;
        var py=dy+Math.sin(p.a+door.swirl)*rr*0.55;
        ctx.beginPath();
        ctx.fillStyle='rgba(160,200,255,'+(0.25+0.35*door.open)+')';
        ctx.arc(px,py,p.s,0,Math.PI*2);ctx.fill();
      });
    }
    // диск аккреции
    for(var di=0;di<12;di++){
      var rr=R*(0.35+di*0.07);
      ctx.beginPath();
      ctx.strokeStyle='rgba(120,170,255,'+(0.05+di*0.012+door.open*0.04)+')';
      ctx.lineWidth=1.4;
      ctx.ellipse(dx,dy,rr,rr*0.38,door.swirl*0.15,0,Math.PI*2);
      ctx.stroke();
    }
    // фотонное кольцо
    ctx.beginPath();
    ctx.strokeStyle='rgba(255,220,180,'+(0.35+0.3*Math.sin((t||0)*4))+')';
    ctx.lineWidth=2;
    ctx.ellipse(dx,dy,R*0.55,R*0.2,door.swirl*0.1,0,Math.PI*2);
    ctx.stroke();
    // горизонт
    var hg=ctx.createRadialGradient(dx,dy,0,dx,dy,R*0.5);
    hg.addColorStop(0,'#000');
    hg.addColorStop(0.55,'#050510');
    hg.addColorStop(0.85,'rgba(40,60,120,0.45)');
    hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath();ctx.fillStyle=hg;ctx.arc(dx,dy,R*0.5,0,Math.PI*2);ctx.fill();

    if(door.open>0.15){
      ctx.fillStyle='rgba(0,0,0,'+Math.min(0.85,door.open)+')';
      ctx.beginPath();ctx.arc(dx,dy,R*0.35+door.open*30,0,Math.PI*2);ctx.fill();
    }
  }

  // Finn
  if(finn){
    updateFinn(dt,t);
    if(finn.state==='star'||finn.state==='fall'){
      // хвост падающей звезды
      if(finn.trail&&finn.trail.length){
        for(var ti=0;ti<finn.trail.length;ti++){
          var tp=finn.trail[ti];
          var ta=(ti+1)/finn.trail.length;
          ctx.beginPath();
          ctx.fillStyle='rgba(255,220,160,'+(0.15+0.55*ta)+')';
          ctx.arc(tp.x,tp.y,2+3*ta,0,Math.PI*2);ctx.fill();
        }
      }
      finn.sparks.forEach(function(sp){
        ctx.beginPath();
        ctx.fillStyle='rgba(255,240,200,'+Math.max(0,sp.a)+')';
        ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2);ctx.fill();
      });
      drawFinnStar(ctx, finn.x, finn.y, t);
    }else if(finn.state!=='enter' && finn.state!=='room'){
      // вспышка рождения
      if(finn.flash&&finn.flash>0){
        var fg=ctx.createRadialGradient(finn.x,finn.y,0,finn.x,finn.y,finn.size*2.5*finn.flash);
        fg.addColorStop(0,'rgba(255,255,240,'+(0.7*finn.flash)+')');
        fg.addColorStop(1,'rgba(255,160,80,0)');
        ctx.fillStyle=fg;
        ctx.beginPath();ctx.arc(finn.x,finn.y,finn.size*2.5*finn.flash,0,Math.PI*2);ctx.fill();
        finn.flash=Math.max(0,finn.flash-0.045);
      }
      finn.sparks.forEach(function(sp){
        ctx.beginPath();
        ctx.fillStyle='rgba(255,230,180,'+Math.max(0,sp.a)+')';
        ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2);ctx.fill();
        sp.x+=(sp.vx||0)*0.016; sp.y+=(sp.vy||0)*0.016; sp.a-=0.06;
      });
      finn.sparks=finn.sparks.filter(function(s){return s.a>0;});
      drawFinnFace(ctx, finn.x, finn.y, finn.size*finn.scale, t);
    }
  }

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
    finn.x=W*0.5;finn.y=H*0.16;finn.scale=1;finn.alpha=1;
    b.classList.remove('show');
    var d=document.getElementById('matterDialog');
    if(d)d.classList.remove('show');
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
    // падающая звезда: ускорение вниз + яркий хвост
    finn.fallV=(finn.fallV||0)+dt*2200;
    finn.y+=finn.fallV*dt;
    finn.x+=(finn.tx-finn.x)*Math.min(1,dt*1.8);
    finn.trail.push({x:finn.x,y:finn.y,a:1});
    if(finn.trail.length>18)finn.trail.shift();
    if(Math.random()<0.85){
      finn.sparks.push({
        x:finn.x+(Math.random()-0.5)*14,
        y:finn.y+(Math.random()-0.5)*10,
        r:1.2+Math.random()*2.5,
        a:0.9,
        vx:(Math.random()-0.5)*40,
        vy:20+Math.random()*40
      });
    }
    finn.sparks.forEach(function(s){
      s.a-=dt*1.8; s.x+=(s.vx||0)*dt; s.y+=(s.vy||40)*dt;
    });
    finn.sparks=finn.sparks.filter(function(s){return s.a>0;});
    finn.scale=1; // звезда остаётся звездой до удара
    if(finn.y>=finn.ty){
      // БАХ — вспышка и сразу Фина
      finn.y=finn.ty; finn.x=finn.tx;
      finn.state='idle';
      finn.scale=1; finn.alpha=1;
      finn.emotion='happy';
      finn.flash=1;
      finn.trail=[]; // хвост падения убрать сразу
      finn.sparks=[];
      // короткая вспышка без долгоживущих точек
      for(var i=0;i<12;i++){
        var a=Math.random()*Math.PI*2;
        var sp=60+Math.random()*120;
        finn.sparks.push({x:finn.x,y:finn.y,r:1.2+Math.random()*2,a:0.85,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp});
      }
      setTimeout(function(){finnSay('Эй! Я с тобой.');},220);
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
    // держим внизу экрана, лёгкое дыхание
    var bx=W*0.5, by=H*0.72;
    finn.x=bx+Math.sin(t*1.1)*3;
    finn.y=by+Math.cos(t*0.9)*2;
  }
  syncSpaceCloseBtn();
}

/* ---------- public API ---------- */
function enterMatter(){
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
        try{unlockedRoomAudio.pause();unlockedRoomAudio.currentTime=0;unlockedRoomAudio.volume=0.28;}catch(e){}
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

document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    try{if(roomAudio)roomAudio.pause();}catch(e){}
    try{if(ambient&&ambient.type==='synth'&&ambient.master)ambient.master.gain.value=0;}catch(e){}
  }else if(phase==='room'){
    try{
      if(roomAudio){var p=roomAudio.play();if(p&&p.catch)p.catch(function(){});}
      else if(ambient&&ambient.type==='synth'&&ambient.master)ambient.master.gain.value=0.03;
    }catch(e){}
  }
},false);

window.FinMatter={
  enter:enterMatter,
  exit:exitMatter,
  isOpen:function(){return phase!=='idle';},
  back:handleBack
};
})();
