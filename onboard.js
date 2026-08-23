(function(){
'use strict';
var KEY='kopeyka3_onboarded_v5';
var index=0, root=null, spot=null, busy=false;

var slides=[
  {title:'Привет, я Фин',text:'Я твой помощник по деньгам в Копейке. За минуту покажу, где что лежит и как пользоваться.',target:'.finn-avatar',place:'bottom'},
  {title:'Сколько доступно',text:'Главная цифра — реально доступные деньги. Касса, резервы и долги — ниже. Нажми на кольцо, чтобы увидеть расшифровку.',target:'#mainFinance,.card.hero',place:'bottom'},
  {title:'Сегодня и лимит',text:'Блок «Сегодня» — какая смена. «Лимит на сегодня» — сколько безопасно потратить. Можно переключить на ручной.',target:'.today-card,.limit-card',place:'bottom'},
  {title:'Добавить операцию',text:'Кнопка «＋ Добавить операцию» или синий «+» справа внизу. Быстрые категории — для частых трат.',target:'#btnAddMain,.btn-add-main',place:'top'},
  {title:'Платежи и операции',text:'Ближайшие платежи и последние операции — прямо на главной. «Все … →» открывает полный список.',target:'.link-more',place:'top'},
  {title:'Совет Фина',text:'Карточка с советом учитывает твои цифры. Нажми на меня в шапке или на совет — откроется чат.',target:'#finnTipCard,.finn-tip-card',place:'top'},
  {title:'Смены',text:'Полоска ближайших дней и полный календарь ниже. Нажми день, чтобы сменить день/ночь/выходной.',target:'.week-strip,.cal',place:'top'},
  {title:'Навигация',text:'Внизу: Главная, Операции, Резервы, Долги, Платежи. Свайп вправо — назад на главную.',target:'.bottom-nav',place:'top'},
  {title:'Голос',text:'В чате удерживай микрофон, пока говоришь. Отпустил — сообщение уходит. Свайп вверх — постоянное прослушивание.',target:'.finn-avatar',place:'bottom'},
  {title:'Готово',text:'Данные хранятся у тебя на телефоне и могут синхронизироваться с облаком. Удачного учёта!',target:null,place:'center'}
];

function done(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(KEY,'1');}catch(e){}}

function injectCss(){
  if(document.getElementById('finTourStyle'))return;
  var s=document.createElement('style');
  s.id='finTourStyle';
  s.textContent=''+
    '#finTour{position:fixed;inset:0;z-index:5000;pointer-events:none;}'+
    '#finTour .tour-dim{position:absolute;inset:0;background:transparent;pointer-events:auto;}'+
    '#finTour .tour-spot{position:absolute;border-radius:16px;border:2.5px solid rgba(94,200,255,.95);'+
      'box-shadow:0 0 0 9999px rgba(4,8,18,.72),0 0 24px rgba(94,200,255,.4);'+
      'transition:left .4s cubic-bezier(.22,1,.36,1),top .4s cubic-bezier(.22,1,.36,1),width .4s cubic-bezier(.22,1,.36,1),height .4s cubic-bezier(.22,1,.36,1),opacity .25s;'+
      'pointer-events:none;opacity:0;z-index:1;}'+
    '#finTour .tour-spot.on{opacity:1;}'+
    '#finTour .tour-card{position:absolute;left:12px;right:12px;max-width:400px;margin:0 auto;'+
      'background:rgba(14,22,40,.97);border:1px solid rgba(120,180,255,.3);border-radius:18px;'+
      'padding:16px 14px 12px;box-shadow:0 16px 40px rgba(0,0,0,.55);color:#E8F0FF;'+
      'pointer-events:auto;z-index:2;transform:translateY(8px);opacity:0;'+
      'transition:transform .3s ease,opacity .25s;}'+
    '#finTour .tour-card.show{transform:translateY(0);opacity:1;}'+
    '#finTour .tour-card.place-bottom{bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto;}'+
    '#finTour .tour-card.place-top{top:calc(12px + env(safe-area-inset-top,0px));bottom:auto;}'+
    '#finTour .tour-card.place-center{top:50%;bottom:auto;transform:translateY(-50%);}'+
    '#finTour .tour-card.place-center.show{transform:translateY(-50%);}'+
    '#finTour .tour-brand{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8BA0C0;font-weight:600;margin-bottom:8px;}'+
    '#finTour .tour-brand i{width:8px;height:8px;border-radius:50%;background:#5EC8FF;box-shadow:0 0 10px rgba(94,200,255,.7);display:inline-block;}'+
    '#finTour h2{font-size:17px;font-weight:800;margin:0 0 6px;line-height:1.25;}'+
    '#finTour p{font-size:13.5px;line-height:1.45;color:#B8C8E0;margin:0 0 12px;}'+
    '#finTour .tour-meta{display:flex;align-items:center;gap:10px;margin-bottom:10px;}'+
    '#finTour .tour-progress{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}'+
    '#finTour .tour-progress i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#5EC8FF,#3A8FE8);transition:width .35s ease;}'+
    '#finTour .tour-count{font-size:12px;color:#8BA0C0;min-width:40px;text-align:right;}'+
    '#finTour .tour-actions{display:flex;gap:8px;}'+
    '#finTour .tour-actions button{flex:1;padding:11px 8px;border-radius:12px;font-size:13.5px;font-weight:700;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;}'+
    '#finTour .tour-next{background:linear-gradient(135deg,#5EC8FF,#3A8FE8)!important;color:#0A101C!important;border:none!important;}'+
    'body.fin-tour-active{overflow:hidden!important;}';
  document.head.appendChild(s);
}

function findTarget(sel){
  if(!sel)return null;
  var parts=String(sel).split(',');
  for(var i=0;i<parts.length;i++){
    var el=document.querySelector(parts[i].trim());
    if(el){
      var r=el.getBoundingClientRect();
      if(r.width>2&&r.height>2)return el;
    }
  }
  return null;
}

function positionSpot(el){
  if(!spot)return;
  if(!el){spot.classList.remove('on');return;}
  try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}
  setTimeout(function(){
    var r=el.getBoundingClientRect();
    var pad=8;
    spot.style.left=Math.max(8,r.left-pad)+'px';
    spot.style.top=Math.max(8,r.top-pad)+'px';
    spot.style.width=Math.min(window.innerWidth-16,r.width+pad*2)+'px';
    spot.style.height=Math.min(window.innerHeight-16,r.height+pad*2)+'px';
    spot.classList.add('on');
  },280);
}

function show(i){
  if(i<0)i=0;
  if(i>=slides.length){finish();return;}
  index=i;
  var s=slides[i];
  busy=true;
  if(typeof goHome==='function'){try{goHome();}catch(e){}}
  var card=root.querySelector('.tour-card');
  card.classList.remove('show');
  setTimeout(function(){
    card.querySelector('h2').textContent=s.title;
    card.querySelector('p').textContent=s.text;
    card.querySelector('.tour-count').textContent=(i+1)+' / '+slides.length;
    card.querySelector('.tour-progress i').style.width=((i+1)/slides.length*100)+'%';
    card.querySelector('.tour-next').textContent=i===slides.length-1?'Начать':'Далее';
    card.querySelector('.tour-back').style.visibility=i===0?'hidden':'visible';
    card.classList.remove('place-bottom','place-top','place-center');
    card.classList.add('place-'+(s.place||'bottom'));
    card.classList.add('show');
    setTimeout(function(){
      positionSpot(findTarget(s.target));
      busy=false;
    },320);
  },100);
}

function make(){
  injectCss();
  root=document.createElement('div');
  root.id='finTour';
  root.innerHTML='<div class="tour-dim"></div><div class="tour-spot"></div><div class="tour-card place-bottom">'+
    '<div class="tour-brand"><i></i>Фин · знакомство</div><h2></h2><p></p>'+
    '<div class="tour-meta"><div class="tour-progress"><i></i></div><span class="tour-count"></span></div>'+
    '<div class="tour-actions"><button type="button" class="tour-skip">Пропустить</button>'+
    '<button type="button" class="tour-back">Назад</button><button type="button" class="tour-next">Далее</button></div></div>';
  document.body.appendChild(root);
  spot=root.querySelector('.tour-spot');
  root.querySelector('.tour-skip').onclick=finish;
  root.querySelector('.tour-back').onclick=function(){if(!busy)show(index-1);};
  root.querySelector('.tour-next').onclick=function(){if(!busy)show(index+1);};
}

function finish(){
  markDone();
  if(root){root.remove();root=null;}
  document.body.classList.remove('fin-tour-active');
  if(typeof goHome==='function')try{goHome();}catch(e){}
}

function start(){
  if(done()&&location.search.indexOf('tour=1')===-1&&location.search.indexOf('presentation=1')===-1)return;
  function tryStart(){
    if(!document.getElementById('app')){setTimeout(tryStart,250);return;}
    if(!document.querySelector('.card.hero,#mainFinance,.btn-add-main')){setTimeout(tryStart,300);return;}
    make();
    document.body.classList.add('fin-tour-active');
    show(0);
  }
  tryStart();
}

window.FinnIntro={start:start,replay:function(){try{localStorage.removeItem(KEY);}catch(e){}start();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,600);});
else setTimeout(start,600);
})();
