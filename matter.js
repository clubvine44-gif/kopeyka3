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
  // visual bubble near Finn
  var el=document.getElementById('matterFinnBubble');
  if(el){
    el.textContent=text;
    el.classList.add('show');
    clearTimeout(finnSay._t);
    finnSay._t=setTimeout(function(){el.classList.remove('show');},4200);
  }
  // TTS if available
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
      '<div class="m-hint" id="matterHint">Коснись звезды или двери-созвездия</div>'+
    '</div>'+
    '<div id="matterRoom" class="m-room" hidden>'+
      '<div class="m-room-scene" id="matterRoomScene">'+
        '<div class="m-room-bg"></div>'+
        /* Hotspots: крупнее зона нажатия, центр по объектам комнаты */
        '<button type="button" class="m-hot" data-obj="diary"  style="left:18%;top:86%" title="Дневник"></button>'+
        '<button type="button" class="m-hot" data-obj="book"   style="left:50%;top:70%" title="Книга"></button>'+
        '<button type="button" class="m-hot" data-obj="plant"  style="left:72%;top:54%" title="Растение"></button>'+
        '<button type="button" class="m-hot" data-obj="piggy"  style="left:76%;top:40%" title="Копилка"></button>'+
        '<button type="button" class="m-hot" data-obj="goals"  style="left:80%;top:27%" title="Цели"></button>'+
        '<button type="button" class="m-hot" data-obj="window" style="left:48%;top:30%" title="Окно"></button>'+
        '<button type="button" class="m-hot" data-obj="desk"   style="left:46%;top:48%" title="Стол"></button>'+
        '<button type="button" class="m-hot" data-obj="bed"    style="left:14%;top:52%" title="Кровать"></button>'+
        '<button type="button" class="m-hot" data-obj="lamp"   style="left:34%;top:44%" title="Лампа"></button>'+
        '<button type="button" class="m-hot" data-obj="focus"  style="left:9%;top:38%"  title="Фокус"></button>'+
        '<button type="button" class="m-hot" data-obj="door"   style="left:92%;top:48%" title="Выход"></button>'+
        '<button type="button" class="m-hot" data-obj="globe"  style="left:88%;top:86%" title="Светильник"></button>'+
        /* room Finn + close */
        '<div id="matterRoomFinn" class="m-room-finn" hidden>'+
          '<canvas id="matterRoomFinnCanvas" width="120" height="120"></canvas>'+
          '<button type="button" class="m-finn-x" id="matterFinnClose" aria-label="Закрыть Фину">✕</button>'+
          '<div id="matterFinnBubble" class="m-finn-bubble"></div>'+
        '</div>'+
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
  document.getElementById('matterFinnClose').onclick=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    var f=document.getElementById('matterRoomFinn');
    if(f){f.hidden=true;f.style.display='none';}
    if(finn){finn.inRoom=false;finn.state='idle';}
    try{if(rec){rec.abort();rec=null;}}catch(err){}
  };
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
/* Hotspots ~56px hit area — легко попасть, визуально почти невидимы */
'.m-hot{position:absolute;width:56px;height:56px;margin:0;padding:0;border:0;background:transparent;'+
  'border-radius:50%;transform:translate(-50%,-50%);z-index:3;cursor:pointer;-webkit-tap-highlight-color:transparent;'+
  'pointer-events:auto}'+
'.m-hot:active{background:rgba(255,220,120,.14);box-shadow:0 0 20px rgba(255,200,80,.3)}'+
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
'.m-panel{position:absolute;inset:0;z-index:20;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px}'+
'.m-panel-card{width:100%;max-width:420px;background:linear-gradient(180deg,#1a1420,#100c14);'+
  'border:1px solid rgba(255,200,120,.18);border-radius:20px 20px 16px 16px;padding:18px 16px 14px;'+
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
'body.matter-lock{overflow:hidden!important}';
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
  var n=goals.length;
  var cx=W*0.40, cy=H*0.46;
  goals.forEach(function(g,i){
    var ang=(-Math.PI*0.58)+(i/(Math.max(1,n-1)||1))*Math.PI*1.16;
    var r=Math.min(W,H)*(0.26+0.04*(i%3))+((i*53)%48);
    var x=cx+Math.cos(ang)*r*1.18;
    var y=cy+Math.sin(ang)*r*0.78;
    var hue=g.type==='debt'?8:(g.urgent?38:200);
    stars.push({
      id:g.id,g:g,x:x,y:y,baseR:g.type==='debt'?3.2:(4+g.pct/40),
      hue:hue,pulse:Math.random()*Math.PI*2,bright:0.55+g.pct/250
    });
  });
  for(var i=0;i<70;i++){
    stars.push({
      id:'bg'+i,g:null,
      x:Math.random()*W,y:Math.random()*H,
      baseR:0.35+Math.random()*1.3,
      hue:210+Math.random()*40,pulse:Math.random()*6,bright:0.18+Math.random()*0.45,
      bg:true
    });
  }
  // Diagonal constellation door — slightly tilted, star points forming door shape
  var dx=W*0.78, dy=H*0.58;
  var tilt=-0.22; // radians ~12.5 deg
  var pts=[
    [-22,-48],[22,-48],[28,-20],[28,40],[18,52],[-18,52],[-28,40],[-28,-20]
  ];
  var doorStars=[];
  pts.forEach(function(p,i){
    var cos=Math.cos(tilt),sin=Math.sin(tilt);
    var x=dx+p[0]*cos-p[1]*sin;
    var y=dy+p[0]*sin+p[1]*cos;
    doorStars.push({x:x,y:y,r:2.2+(i%3),pulse:i*0.7});
  });
  // inner cross links for constellation look
  door={
    x:dx,y:dy,r:36,tilt:tilt,
    stars:doorStars,
    open:0,opening:false,entered:false
  };
}

/* ---------- Finn state machine ---------- */
function resetFinn(){
  finn={
    state:'star', // star | fall | morph | idle | toDoor | enter | room
    x:W*0.5, y:H*0.18,
    tx:W*0.5, ty:H*0.18,
    scale:1, alpha:1,
    trail:[], sparks:[],
    faceT:0, blink:0,
    inRoom:false,
    size:52
  };
}

function drawFinnFace(c, cx, cy, size, t){
  // Pink coin-body matching finn-char.js + flame/glow aura (no rings)
  var s=size;
  c.save();
  c.translate(cx,cy);

  // outer soft glow / "burning"
  var g0=c.createRadialGradient(0,0,s*0.2,0,0,s*1.55);
  g0.addColorStop(0,'rgba(232,120,249,0.35)');
  g0.addColorStop(0.4,'rgba(168,85,247,0.18)');
  g0.addColorStop(1,'rgba(80,40,120,0)');
  c.fillStyle=g0;
  c.beginPath();c.arc(0,0,s*1.55,0,Math.PI*2);c.fill();

  // warm flame fringe
  var g1=c.createRadialGradient(0,-s*0.15,s*0.15,0,0,s*1.15);
  g1.addColorStop(0,'rgba(253,230,138,0.22)');
  g1.addColorStop(0.45,'rgba(244,114,182,0.16)');
  g1.addColorStop(1,'rgba(168,85,247,0)');
  c.fillStyle=g1;
  c.beginPath();c.arc(0,0,s*1.15,0,Math.PI*2);c.fill();

  // body
  var body=c.createRadialGradient(-s*0.2,-s*0.25,0,0,0,s*0.95);
  body.addColorStop(0,'#FFF5FB');
  body.addColorStop(0.28,'#F9A8D4');
  body.addColorStop(0.62,'#E879F9');
  body.addColorStop(1,'#A855F7');
  c.fillStyle=body;
  c.beginPath();c.arc(0,0,s*0.92,0,Math.PI*2);c.fill();

  // core dark
  var core=c.createRadialGradient(0,-s*0.08,0,0,0,s*0.62);
  core.addColorStop(0,'#1E1030');
  core.addColorStop(1,'#0C0614');
  c.fillStyle=core;
  c.beginPath();c.arc(0,0,s*0.62,0,Math.PI*2);c.fill();

  // shine
  c.fillStyle='rgba(255,255,255,0.45)';
  c.beginPath();c.ellipse(-s*0.22,-s*0.28,s*0.28,s*0.14, -0.3,0,Math.PI*2);c.fill();

  // bows
  c.fillStyle='#F472B6';
  c.beginPath();c.ellipse(-s*0.55,-s*0.72,s*0.16,s*0.1, -0.5,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(s*0.55,-s*0.72,s*0.16,s*0.1, 0.5,0,Math.PI*2);c.fill();
  // gem
  var gem=c.createRadialGradient(0,-s*0.78,0,0,-s*0.78,s*0.12);
  gem.addColorStop(0,'#FDE68A');gem.addColorStop(1,'#F472B6');
  c.fillStyle=gem;
  c.beginPath();c.arc(0,-s*0.78,s*0.1,0,Math.PI*2);c.fill();
  c.fillStyle='rgba(255,255,255,0.7)';
  c.beginPath();c.arc(-s*0.03,-s*0.81,s*0.03,0,Math.PI*2);c.fill();

  // cyan eyes
  var eyeOpen=finn&&finn.blink>0?0.15:1;
  var ey= s*0.02;
  [['-0.28','0'],['0.28','0']].forEach(function(pair){
    var ex=parseFloat(pair[0])*s;
    c.fillStyle='#67E8F9';
    c.beginPath();c.ellipse(ex,ey,s*0.14,s*0.17*eyeOpen,0,0,Math.PI*2);c.fill();
    if(eyeOpen>0.5){
      c.fillStyle='#fff';
      c.beginPath();c.arc(ex-s*0.04,ey-s*0.05,s*0.045,0,Math.PI*2);c.fill();
    }
  });

  // mouth smile
  c.strokeStyle='#F9A8D4';
  c.lineWidth=Math.max(1.5,s*0.06);
  c.lineCap='round';
  c.beginPath();
  c.moveTo(-s*0.2,s*0.28);
  c.quadraticCurveTo(0,s*0.42,s*0.2,s*0.28);
  c.stroke();

  // cheek blush
  c.fillStyle='rgba(244,114,182,0.28)';
  c.beginPath();c.ellipse(-s*0.38,s*0.18,s*0.1,s*0.06,0,0,Math.PI*2);c.fill();
  c.beginPath();c.ellipse(s*0.38,s*0.18,s*0.1,s*0.06,0,0,Math.PI*2);c.fill();

  c.restore();
}

function drawFinnStar(c, x, y, t){
  // Настоящая горящая звезда: корона, лучи, вспышки, искры
  var pulse=0.82+0.18*Math.sin(t*2.6);
  var flare=0.55+0.45*Math.sin(t*5.1+1.2);
  var r=9*pulse;

  // дальний ореол
  var g0=c.createRadialGradient(x,y,0,x,y,r*9);
  g0.addColorStop(0,'rgba(255,240,200,0.55)');
  g0.addColorStop(0.15,'rgba(255,180,120,0.28)');
  g0.addColorStop(0.4,'rgba(232,120,249,0.14)');
  g0.addColorStop(1,'rgba(80,40,140,0)');
  c.fillStyle=g0;
  c.beginPath();c.arc(x,y,r*9,0,Math.PI*2);c.fill();

  // корона / плазма
  var g1=c.createRadialGradient(x,y,0,x,y,r*4.2);
  g1.addColorStop(0,'rgba(255,255,255,0.95)');
  g1.addColorStop(0.18,'rgba(255,230,160,0.85)');
  g1.addColorStop(0.45,'rgba(255,140,180,0.45)');
  g1.addColorStop(0.75,'rgba(180,80,255,0.18)');
  g1.addColorStop(1,'rgba(80,30,120,0)');
  c.fillStyle=g1;
  c.beginPath();c.arc(x,y,r*4.2,0,Math.PI*2);c.fill();

  // лучи (cross + diagonal)
  c.save();
  c.translate(x,y);
  c.rotate(t*0.35);
  for(var k=0;k<8;k++){
    c.rotate(Math.PI/4);
    var len=r*(3.2+flare*1.8+(k%2?0.6:0));
    var w=r*(0.35+(k%2?0.15:0.08))*flare;
    var lg=c.createLinearGradient(0,0,0,-len);
    lg.addColorStop(0,'rgba(255,255,255,0.95)');
    lg.addColorStop(0.25,'rgba(255,220,160,0.55)');
    lg.addColorStop(0.7,'rgba(244,114,182,0.18)');
    lg.addColorStop(1,'rgba(168,85,247,0)');
    c.fillStyle=lg;
    c.beginPath();
    c.moveTo(-w,0);
    c.lineTo(0,-len);
    c.lineTo(w,0);
    c.closePath();
    c.fill();
  }
  c.restore();

  // ядро
  c.fillStyle='#fff';
  c.beginPath();c.arc(x,y,r*0.55,0,Math.PI*2);c.fill();
  var core=c.createRadialGradient(x,y,0,x,y,r*1.1);
  core.addColorStop(0,'#fff');
  core.addColorStop(0.5,'#FFE8A8');
  core.addColorStop(1,'rgba(255,160,200,0.4)');
  c.fillStyle=core;
  c.beginPath();c.arc(x,y,r*1.05,0,Math.PI*2);c.fill();

  // искры вокруг
  for(var i=0;i<10;i++){
    var a=t*1.7+i*0.62;
    var dist=r*(2.4+1.6*Math.sin(t*3+i));
    var sx=x+Math.cos(a)*dist;
    var sy=y+Math.sin(a)*dist*0.85;
    var sa=0.35+0.55*Math.abs(Math.sin(t*4+i));
    c.fillStyle='rgba(255,240,200,'+sa+')';
    c.beginPath();c.arc(sx,sy,1.1+1.4*sa,0,Math.PI*2);c.fill();
  }
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
  var hint=document.getElementById('matterHint');
  if(hint)hint.textContent='Коснись звезды Фины или двери-созвездия';
  if(!MS.firstEnter){MS.firstEnter=new Date().toISOString();saveState();}
  try{history.pushState({matter:'space'},'','#matter');}catch(e){}
}

function openDoorAnim(){
  if(!door||door.opening)return;
  door.opening=true;
  playCreak();
  var hint=document.getElementById('matterHint');
  if(hint)hint.textContent='Дверь открывается…';
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
  // show Finn in room
  if(finn){
    finn.state='room';
    finn.inRoom=true;
    var rf=document.getElementById('matterRoomFinn');
    if(rf){rf.hidden=false;rf.style.display='';}
    drawRoomFinn();
    setTimeout(function(){finnSay('Я здесь. Что сделаем?');},400);
  }
  try{history.pushState({matter:'room'},'','#matter-room');}catch(e){}
  // auto-listen once
  if(!listenOnce){
    listenOnce=true;
    setTimeout(startListen,700);
  }
}

function leaveRoom(){
  stopAmbient();
  roomOpen=false;
  var room=document.getElementById('matterRoom');
  if(room)room.hidden=true;
  var rf=document.getElementById('matterRoomFinn');
  if(rf)rf.hidden=true;
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

  // Finn star tap → fall & morph
  if(finn && finn.state==='star'){
    var dx=x-finn.x, dy=y-finn.y;
    if(dx*dx+dy*dy < 40*40){
      finn.state='fall';
      finn.ty=H*0.55;
      finn.tx=W*0.5;
      finnSay('Эй! Я с тобой.');
      return;
    }
  }

  // door constellation
  if(door){
    var hit=false;
    door.stars.forEach(function(s){
      var dx=x-s.x, dy=y-s.y;
      if(dx*dx+dy*dy < 28*28) hit=true;
    });
    var dx=x-door.x, dy=y-door.y;
    if(hit || dx*dx+dy*dy < (door.r+20)*(door.r+20)){
      if(finn && (finn.state==='idle'||finn.state==='morph')){
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
  var best=null,bestD=40*40;
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
    openReader();
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

function openReader(raw){
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
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return;
    if(rec){try{rec.abort();}catch(e){}}
    rec=new SR();
    rec.lang='ru-RU';rec.interimResults=false;rec.maxAlternatives=1;
    rec.onresult=function(ev){
      var t=(ev.results[0]&&ev.results[0][0]&&ev.results[0][0].transcript)||'';
      handleCommand(t);
    };
    rec.onerror=function(){};
    rec.start();
  }catch(e){}
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
  else if(phase==='room'){ drawRoomFinn(); }
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

  var goals=stars.filter(function(s){return s.g;});
  ctx.strokeStyle='rgba(140,180,255,0.12)';
  ctx.lineWidth=1;
  for(var i=0;i<goals.length-1;i++){
    ctx.beginPath();
    ctx.moveTo(goals[i].x,goals[i].y);
    ctx.lineTo(goals[i+1].x,goals[i+1].y);
    ctx.stroke();
  }

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

  // diagonal constellation door
  if(door){
    if(door.opening){
      door.open=Math.min(1,door.open+dt*0.9);
      if(door.open>=1 && !door.entered){
        door.entered=true;
        setTimeout(function(){enterRoom();},200);
      }
    }
    // links between door stars
    ctx.strokeStyle='rgba(160,200,255,'+(0.25+door.open*0.45)+')';
    ctx.lineWidth=1.2;
    var ds=door.stars;
    for(var i=0;i<ds.length;i++){
      var a=ds[i], b=ds[(i+1)%ds.length];
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    // a couple diagonals
    ctx.beginPath();ctx.moveTo(ds[0].x,ds[0].y);ctx.lineTo(ds[4].x,ds[4].y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ds[2].x,ds[2].y);ctx.lineTo(ds[6].x,ds[6].y);ctx.stroke();

    ds.forEach(function(s){
      var pulse=0.7+0.3*Math.sin(t*2+s.pulse);
      var rg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*5*pulse);
      rg.addColorStop(0,'rgba(200,230,255,0.9)');
      rg.addColorStop(0.4,'rgba(120,180,255,0.35)');
      rg.addColorStop(1,'rgba(40,80,160,0)');
      ctx.fillStyle=rg;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*5*pulse,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#E8F4FF';
      ctx.beginPath();ctx.arc(s.x,s.y,s.r*pulse,0,Math.PI*2);ctx.fill();
    });

    // soft portal glow when opening
    if(door.open>0){
      var pg=ctx.createRadialGradient(door.x,door.y,0,door.x,door.y,door.r*(1.2+door.open));
      pg.addColorStop(0,'rgba(100,160,255,'+(0.15+door.open*0.4)+')');
      pg.addColorStop(1,'rgba(20,40,80,0)');
      ctx.fillStyle=pg;
      ctx.beginPath();ctx.arc(door.x,door.y,door.r*(1.2+door.open),0,Math.PI*2);ctx.fill();
    }

    ctx.fillStyle='rgba(180,210,255,0.5)';
    ctx.font='600 11px system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.fillText(door.opening?'…':'ДВЕРЬ', door.x, door.y+door.r+18);
  }

  // Finn
  if(finn){
    updateFinn(dt,t);
    if(finn.state==='star'){
      drawFinnStar(ctx, finn.x, finn.y, t);
    }else if(finn.state!=='enter' && finn.state!=='room'){
      // trail
      finn.trail.forEach(function(p,i){
        ctx.beginPath();
        ctx.fillStyle='rgba(244,114,182,'+(0.15*i/Math.max(1,finn.trail.length))+')';
        ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();
      });
      // sparks
      finn.sparks.forEach(function(sp){
        ctx.beginPath();
        ctx.fillStyle='rgba(253,230,138,'+sp.a+')';
        ctx.arc(sp.x,sp.y,sp.r,0,Math.PI*2);ctx.fill();
      });
      drawFinnFace(ctx, finn.x, finn.y, finn.size*finn.scale, t);
    }
  }

  // vignette
  var vg=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

function updateFinn(dt,t){
  if(!finn)return;
  // blink
  if(Math.random()<0.004)finn.blink=0.12;
  if(finn.blink>0)finn.blink-=dt;

  if(finn.state==='fall'){
    finn.y+=(finn.ty-finn.y)*Math.min(1,dt*3.2);
    finn.x+=(finn.tx-finn.x)*Math.min(1,dt*2);
    finn.trail.push({x:finn.x,y:finn.y});
    if(finn.trail.length>12)finn.trail.shift();
    if(Math.random()<0.5)finn.sparks.push({x:finn.x+(Math.random()-0.5)*20,y:finn.y+(Math.random()-0.5)*20,r:1+Math.random()*2,a:0.8});
    finn.sparks.forEach(function(s){s.a-=dt*1.5;s.y+=dt*20;});
    finn.sparks=finn.sparks.filter(function(s){return s.a>0;});
    finn.scale=0.35+0.65*(1-Math.abs(finn.y-finn.ty)/Math.max(1,H*0.4));
    if(Math.abs(finn.y-finn.ty)<8){
      finn.state='morph';
      finn.scale=0.2;
    }
  }else if(finn.state==='morph'){
    finn.scale=Math.min(1.15,finn.scale+dt*2.2);
    if(finn.scale>=1.12){finn.scale=1;finn.state='idle';}
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
    finn.x+=Math.sin(t*1.1)*0.15;
    finn.y+=Math.cos(t*0.9)*0.12;
  }
}

function drawRoomFinn(){
  var c=document.getElementById('matterRoomFinnCanvas');
  if(!c||!finn||!finn.inRoom)return;
  var rc=c.getContext('2d');
  rc.clearRect(0,0,120,120);
  // glow under face
  var t=performance.now()/1000;
  var g=rc.createRadialGradient(60,64,4,60,64,56);
  g.addColorStop(0,'rgba(255,220,160,0.45)');
  g.addColorStop(0.4,'rgba(232,120,249,0.22)');
  g.addColorStop(1,'rgba(80,40,120,0)');
  rc.fillStyle=g;
  rc.beginPath();rc.arc(60,64,56,0,Math.PI*2);rc.fill();
  drawFinnFace(rc, 60, 64, 50, t);
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
  var rf=document.getElementById('matterRoomFinn');if(rf){rf.hidden=true;}
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
window.FinMatter={
  enter:enterMatter,
  exit:exitMatter,
  isOpen:function(){return phase!=='idle';},
  back:handleBack
};
})();
