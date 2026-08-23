(function(){
'use strict';
var KEY='kopeyka3_onboarded_v10';
var index=0, root=null, busy=false, hlEl=null;

var slides=[
  {title:'Привет, я Финна',text:'Я помогу держать деньги под контролем. Покажу главное за полминуты.',target:'.finn-avatar',place:'bottom'},
  {title:'Сколько доступно',text:'Крупная цифра — то, что можно тратить без срыва планов. Нажми на кольцо — будет расшифровка.',target:'#mainFinance',place:'bottom'},
  {title:'Сегодня и лимит',text:'Смена на сегодня и лимит. Лимит можно сделать ручным.',target:'.limit-card,#limitCard',place:'auto'},
  {title:'Совет Финны',text:'Короткая подсказка по твоим цифрам. Зажми «+» внизу справа — откроется чат с Финной.',target:'#finnTipCard',place:'auto'},
  {title:'Ближайшие платежи',text:'Что скоро нужно оплатить. Отсюда же можно открыть все платежи.',target:'#nearCard,.near-card',place:'auto'},
  {title:'Смены',text:'Лента ближайших дней. Полный календарь — отдельным окном (если у тебя сменный график).',target:'.week-strip,#shiftsCard',place:'auto'},
  {title:'Навигация',text:'Вкладки: Главная, Операции, Резервы, Долги, Платежи.',target:'.bottom-nav',place:'top'},
  {title:'Кнопка +',text:'Короткое нажатие — добавить операцию. Удерживай — откроется Финна.',target:'.fab',place:'top'},
  {title:'Готово',text:'Дальше пара вопросов — и интерфейс подстроится под тебя.',target:null,place:'center'}
];

function done(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function markDone(){try{localStorage.setItem(KEY,'1');}catch(e){}}

function injectCss(){
  if(document.getElementById('finTourStyle'))return;
  var s=document.createElement('style');
  s.id='finTourStyle';
  s.textContent=''+
    '#finTour{position:fixed;inset:0;z-index:5000;pointer-events:none;}'+
    '#finTour .tour-dim{position:absolute;inset:0;background:rgba(4,8,18,.4);pointer-events:none;}'+
    '#finTour .tour-card{position:absolute;left:12px;right:12px;max-width:400px;margin:0 auto;'+
      'background:rgba(14,22,40,.98);border:1px solid rgba(120,180,255,.3);border-radius:18px;'+
      'padding:16px 14px 12px;box-shadow:0 16px 40px rgba(0,0,0,.55);color:#E8F0FF;'+
      'pointer-events:auto;z-index:5002;opacity:0;transition:opacity .25s,transform .3s;}'+
    '#finTour .tour-card.show{opacity:1;}'+
    '#finTour .tour-card.place-bottom{bottom:calc(12px + env(safe-area-inset-bottom,0px));top:auto;}'+
    '#finTour .tour-card.place-top{top:calc(12px + env(safe-area-inset-top,0px));bottom:auto;}'+
    '#finTour .tour-card.place-center{top:50%;transform:translateY(-50%);}'+
    '#finTour .tour-brand{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8BA0C0;font-weight:600;margin-bottom:8px;}'+
    '#finTour h2{font-size:17px;font-weight:800;margin:0 0 6px;}'+
    '#finTour p{font-size:13.5px;line-height:1.45;color:#B8C8E0;margin:0 0 12px;}'+
    '#finTour .tour-meta{display:flex;align-items:center;gap:10px;margin-bottom:10px;}'+
    '#finTour .tour-progress{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}'+
    '#finTour .tour-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5EC8FF,#3A8FE8);transition:width .35s;}'+
    '#finTour .tour-count{font-size:12px;color:#8BA0C0;min-width:40px;text-align:right;}'+
    '#finTour .tour-actions{display:flex;gap:8px;}'+
    '#finTour .tour-actions button{flex:1;padding:11px 8px;border-radius:12px;font-size:13.5px;font-weight:700;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;}'+
    '#finTour .tour-next{background:linear-gradient(135deg,#5EC8FF,#3A8FE8)!important;color:#0A101C!important;border:none!important;}';
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
  return null;
}

function pickPlace(el, preferred){
  if(preferred&&preferred!=='auto')return preferred;
  if(!el)return 'center';
  var r=el.getBoundingClientRect();
  var vh=window.innerHeight||640;
  return (r.top+r.height/2)<vh*0.45?'bottom':'top';
}

function scrollToEl(el, place){
  if(!el)return Promise.resolve();
  return new Promise(function(resolve){
    try{
      // disable content-visibility during tour for correct metrics
      document.documentElement.classList.add('fin-tour-scroll');
      var y=0, node=el;
      while(node){ y+=node.offsetTop||0; node=node.offsetParent; }
      var vh=window.innerHeight||640;
      var target = place==='top' ? Math.max(0, y - 100) : Math.max(0, y - Math.round(vh*0.28));
      window.scrollTo(0, target);
      document.documentElement.scrollTop=target;
      document.body.scrollTop=target;
      try{ el.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e){}
    }catch(e){}
    setTimeout(resolve, 480);
  });
}

function highlight(el){
  clearHl();
  if(!el)return;
  hlEl=el;
  el.classList.add('tour-hl');
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

  // wait a frame for home render
  setTimeout(function(){
    var el=findTarget(s.target);
    var place=pickPlace(el, s.place);
    card.querySelector('h2').textContent=s.title;
    card.querySelector('p').textContent=s.text;
    card.querySelector('.tour-count').textContent=(i+1)+' / '+slides.length;
    card.querySelector('.tour-progress i').style.width=((i+1)/slides.length*100)+'%';
    card.querySelector('.tour-next').textContent=i===slides.length-1?'Дальше':'Далее';
    card.querySelector('.tour-back').style.visibility=i===0?'hidden':'visible';
    card.classList.remove('place-bottom','place-top','place-center');
    card.classList.add('place-'+place);

    scrollToEl(el, place).then(function(){
      // re-find after scroll (DOM same)
      el=findTarget(s.target)||el;
      place=pickPlace(el, s.place);
      card.classList.remove('place-bottom','place-top','place-center');
      card.classList.add('place-'+place);
      card.classList.add('show');
      highlight(el);
      busy=false;
    });
  }, 80);
}

function make(){
  injectCss();
  root=document.createElement('div');
  root.id='finTour';
  root.innerHTML='<div class="tour-dim"></div><div class="tour-card place-bottom">'+
    '<div class="tour-brand">Финна · знакомство</div><h2></h2><p></p>'+
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
  // lifestyle questions next
  setTimeout(function(){
    try{
      if(window.FinnaProfile&&!window.FinnaProfile.done())window.FinnaProfile.start();
    }catch(e){}
  },350);
}

function start(){
  if(done()&&location.search.indexOf('tour=1')===-1)return;
  function tryStart(){
    if(!document.getElementById('app')){setTimeout(tryStart,250);return;}
    if(!document.querySelector('#mainFinance,.card.hero')){setTimeout(tryStart,300);return;}
    make();
    show(0);
  }
  tryStart();
}

window.FinnIntro={start:start,replay:function(){try{localStorage.removeItem(KEY);}catch(e){}start();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,700);});
else setTimeout(start,700);
})();
