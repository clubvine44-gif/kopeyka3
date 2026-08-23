(function(){
'use strict';
var KEY='kopeyka3_onboarded_v7';
var index=0, root=null, busy=false, hlEl=null;

var slides=[
  {title:'Привет, я Фин',text:'Я помощник по деньгам в Копейке. Коротко покажу, где что.',target:'.finn-avatar',place:'bottom'},
  {title:'Сколько доступно',text:'Главная цифра — доступные деньги. Касса, резервы и долги рядом. Нажми на кольцо для расшифровки.',target:'#mainFinance',place:'bottom'},
  {title:'Сегодня',text:'Какая сейчас смена и когда ближайшая.',target:'.today-card',place:'bottom'},
  {title:'Лимит на сегодня',text:'Сколько безопасно потратить. Можно переключить на ручной лимит.',target:'.limit-card',place:'bottom'},
  {title:'Ближайшие платежи',text:'Что скоро нужно оплатить — прямо на главной.',target:'.near-card',place:'top'},
  {title:'Совет Фина',text:'Подсказка по твоим цифрам. Зажми кнопку + внизу справа, чтобы открыть чат с Фином.',target:'#finnTipCard',place:'top'},
  {title:'Смены',text:'Ближайшие дни графика. «Полный календарь» откроет окно, где можно менять смены.',target:'.week-strip',place:'top'},
  {title:'Навигация',text:'Вкладки внизу: Главная, Операции, Резервы, Долги, Платежи.',target:'.bottom-nav',place:'top'},
  {title:'Кнопка +',text:'Короткое нажатие — меню добавления. Зажми и держи — откроется Фин.',target:'.fab',place:'top'},
  {title:'Готово',text:'Данные на телефоне, облако — по желанию. Удачного учёта!',target:null,place:'center'}
];

function done(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(KEY,'1');}catch(e){}}

function injectCss(){
  if(document.getElementById('finTourStyle'))return;
  var s=document.createElement('style');
  s.id='finTourStyle';
  s.textContent=''+
    '#finTour{position:fixed;inset:0;z-index:5000;pointer-events:none;}'+
    '#finTour .tour-dim{position:absolute;inset:0;background:rgba(4,8,18,.45);pointer-events:auto;}'+
    '#finTour .tour-card{position:absolute;left:12px;right:12px;max-width:400px;margin:0 auto;'+
      'background:rgba(14,22,40,.98);border:1px solid rgba(120,180,255,.3);border-radius:18px;'+
      'padding:16px 14px 12px;box-shadow:0 16px 40px rgba(0,0,0,.55);color:#E8F0FF;'+
      'pointer-events:auto;z-index:5002;opacity:0;transition:opacity .25s,transform .3s;}'+
    '#finTour .tour-card.show{opacity:1;}'+
    '#finTour .tour-card.place-bottom{bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto;transform:translateY(8px);}'+
    '#finTour .tour-card.place-bottom.show{transform:translateY(0);}'+
    '#finTour .tour-card.place-top{top:calc(12px + env(safe-area-inset-top,0px));bottom:auto;transform:translateY(-8px);}'+
    '#finTour .tour-card.place-top.show{transform:translateY(0);}'+
    '#finTour .tour-card.place-center{top:50%;transform:translateY(-50%);}'+
    '#finTour .tour-brand{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8BA0C0;font-weight:600;margin-bottom:8px;}'+
    '#finTour .tour-brand i{width:8px;height:8px;border-radius:50%;background:#5EC8FF;display:inline-block;}'+
    '#finTour h2{font-size:17px;font-weight:800;margin:0 0 6px;}'+
    '#finTour p{font-size:13.5px;line-height:1.45;color:#B8C8E0;margin:0 0 12px;}'+
    '#finTour .tour-meta{display:flex;align-items:center;gap:10px;margin-bottom:10px;}'+
    '#finTour .tour-progress{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}'+
    '#finTour .tour-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5EC8FF,#3A8FE8);transition:width .35s;}'+
    '#finTour .tour-count{font-size:12px;color:#8BA0C0;min-width:40px;text-align:right;}'+
    '#finTour .tour-actions{display:flex;gap:8px;}'+
    '#finTour .tour-actions button{flex:1;padding:11px 8px;border-radius:12px;font-size:13.5px;font-weight:700;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;}'+
    '#finTour .tour-next{background:linear-gradient(135deg,#5EC8FF,#3A8FE8)!important;color:#0A101C!important;border:none!important;}'+
    'body.fin-tour-active{overflow:hidden!important;}';
  document.head.appendChild(s);
}

function clearHl(){
  if(hlEl){hlEl.classList.remove('tour-hl');hlEl=null;}
  document.querySelectorAll('.tour-hl').forEach(function(el){el.classList.remove('tour-hl');});
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
  // fallback fuzzy for section titles
  return null;
}

function highlight(el){
  clearHl();
  if(!el)return;
  hlEl=el;
  try{
    var place=(root&&root.querySelector('.tour-card')||{}).className||'';
    var r=el.getBoundingClientRect();
    var vh=window.innerHeight||640;
    var targetY = place.indexOf('place-top')>=0 ? (vh*0.55) : (vh*0.38);
    var mid = r.top + r.height/2;
    var delta = mid - targetY;
    if(Math.abs(delta)>24){ window.scrollBy({top:delta, behavior:'smooth'}); }
  }catch(e){ try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(x){} }
  setTimeout(function(){
    if(hlEl!==el)return;
    el.classList.add('tour-hl');
    try{
      var r2=el.getBoundingClientRect();
      var vh2=window.innerHeight||640;
      if(r2.top<12||r2.bottom>vh2-12){ el.scrollIntoView({block:'center',behavior:'smooth'}); }
    }catch(x){}
  },380);
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
  clearHl();
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
      highlight(findTarget(s.target));
      busy=false;
    },200);
  },80);
}

function make(){
  injectCss();
  root=document.createElement('div');
  root.id='finTour';
  root.innerHTML='<div class="tour-dim"></div><div class="tour-card place-bottom">'+
    '<div class="tour-brand"><i></i>Фин · знакомство</div><h2></h2><p></p>'+
    '<div class="tour-meta"><div class="tour-progress"><i></i></div><span class="tour-count"></span></div>'+
    '<div class="tour-actions"><button type="button" class="tour-skip">Пропустить</button>'+
    '<button type="button" class="tour-back">Назад</button><button type="button" class="tour-next">Далее</button></div></div>';
  document.body.appendChild(root);
  root.querySelector('.tour-skip').onclick=finish;
  root.querySelector('.tour-back').onclick=function(){if(!busy)show(index-1);};
  root.querySelector('.tour-next').onclick=function(){if(!busy)show(index+1);};
}

function finish(){
  markDone();
  clearHl();
  if(root){root.remove();root=null;}
  document.body.classList.remove('fin-tour-active');
  if(typeof goHome==='function')try{goHome();}catch(e){}
}

function start(){
  if(done()&&location.search.indexOf('tour=1')===-1&&location.search.indexOf('presentation=1')===-1)return;
  function tryStart(){
    if(!document.getElementById('app')){setTimeout(tryStart,250);return;}
    if(!document.querySelector('#mainFinance,.card.hero')){setTimeout(tryStart,300);return;}
    make();
    document.body.classList.add('fin-tour-active');
    show(0);
  }
  tryStart();
}

window.FinnIntro={start:start,replay:function(){try{localStorage.removeItem(KEY);}catch(e){}start();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,700);});
else setTimeout(start,700);
})();
