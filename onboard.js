(function(){
'use strict';
var KEY='kopeyka3_onboarded_v4';
var index=0, timer=null, root=null, spot=null, busy=false;

var slides=[
  {title:'Привет, я Финн',text:'Твой умный помощник по деньгам. Покажу, как всё устроено — за минуту поймёшь приложение.',target:'.finn-avatar',action:null},
  {title:'Сколько можно тратить',text:'Большое число — это «на день». Кольцо показывает, сколько свободно, сколько уйдёт на обязательные платежи и долги.',target:'.card.hero',action:null},
  {title:'Смены и график',text:'Календарь — твой график. Жёлтая точка — день, синяя — ночь, серая — выходной. Нажми на день, чтобы поменять смену.',target:'.cal',action:null},
  {title:'Смены и зарплата',text:'Здесь видно, сколько смен осталось и сколько денег ожидается. Ставки за день и ночь задаются в настройках.',target:'.btn-shift',action:null},
  {title:'Быстрые разделы',text:'Обязательные платежи, резервы, долги и операции — всё в один тап. Ничего не теряется.',target:'.quick-grid',action:null},
  {title:'Добавить операцию',text:'Синяя кнопка «+» справа внизу. Короткое нажатие — меню: доход, расход, резерв, долг. Удержание — открывает меня, Финна.',target:'.fab',action:null},
  {title:'Навигация',text:'Внизу пять вкладок: Главная, Операции, Резервы, Долги и Платежи. Свайп вправо возвращает на главную.',target:'.bottom-nav',action:null},
  {title:'Операции',text:'Все доходы и расходы за месяц. Можно открыть любую запись и изменить.',target:'#app',action:function(){ if(typeof goView==='function') goView('ops'); }},
  {title:'Резервы',text:'Копи на цели отдельно: подушка, отпуск, права. Деньги в резерве не смешиваются с кассой на траты.',target:'#app',action:function(){ if(typeof goView==='function') goView('res'); }},
  {title:'Долги',text:'Храни долги здесь. Видно, сколько осталось погасить. Погашение — отдельный расход.',target:'#app',action:function(){ if(typeof goView==='function') goView('debt'); }},
  {title:'Платежи',text:'Обязательные платежи каждый месяц: аренда, связь, подписки. Отмечай оплату — и Финн учтёт это в «на день».',target:'#app',action:function(){ if(typeof goView==='function') goView('obl'); }},
  {title:'Поговори со мной',text:'Удержи «+» или коснись меня в шапке. Можно писать и голосом: «сколько можно тратить», «добавь расход 300 на продукты».',target:'.finn-avatar',action:function(){ if(typeof goView==='function') goView('home'); }},
  {title:'Настройки',text:'Шестерёнка справа вверху: остаток кассы, ставки за смены, ключ ИИ, резервные копии. Всё под контролем.',target:'#btnSettings',action:function(){ if(typeof goView==='function') goView('home'); }},
  {title:'Готово!',text:'Ты в курсе. Добавляй операции, строй график и спрашивай меня в любой момент. Удачного учёта ✨',target:'.card.hero',action:function(){ if(typeof goView==='function') goView('home'); }}
];

function done(){ try{ return localStorage.getItem(KEY)==='1'; }catch(e){ return false; } }
function finish(){
  if(timer) clearTimeout(timer);
  try{ localStorage.setItem(KEY,'1'); }catch(e){}
  document.body.classList.remove('fin-tour-active');
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
  if(root){ root.remove(); root=null; }
  if(typeof goView==='function') goView('home');
  if(typeof render==='function') try{render();}catch(e){}
}
function injectCss(){
  if(document.getElementById('finTourStyle')) return;
  var s=document.createElement('style'); s.id='finTourStyle';
  s.textContent=
    'body.fin-tour-active{overflow:hidden!important;}'+
    '#finTour{position:fixed;inset:0;z-index:6000;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;}'+
    '#finTour .tour-dim{position:absolute;inset:0;background:rgba(4,8,18,.55);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:auto;}'+
    '#finTour .tour-spot{position:absolute;border-radius:18px;border:2px solid rgba(94,200,255,.95);box-shadow:0 0 0 9999px rgba(4,8,18,.62),0 0 28px rgba(94,200,255,.45),inset 0 0 20px rgba(94,200,255,.08);transition:left .55s cubic-bezier(.22,1,.36,1),top .55s cubic-bezier(.22,1,.36,1),width .55s cubic-bezier(.22,1,.36,1),height .55s cubic-bezier(.22,1,.36,1),opacity .3s;pointer-events:none;opacity:0;}'+
    '#finTour .tour-spot.on{opacity:1;}'+
    '#finTour .tour-card{position:absolute;left:14px;right:14px;bottom:calc(18px + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;background:rgba(14,22,40,.94);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(120,180,255,.28);border-radius:22px;padding:18px 16px 14px;box-shadow:0 18px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);color:#E8F0FF;pointer-events:auto;transform:translateY(12px);opacity:0;transition:transform .4s cubic-bezier(.22,1,.36,1),opacity .35s;}'+
    '#finTour .tour-card.show{transform:translateY(0);opacity:1;}'+
    '#finTour .tour-brand{display:flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8BA0C0;font-weight:600;margin-bottom:10px;}'+
    '#finTour .tour-brand i{width:8px;height:8px;border-radius:50%;background:#5EC8FF;box-shadow:0 0 10px rgba(94,200,255,.7);display:inline-block;}'+
    '#finTour h2{font-size:18px;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;line-height:1.25;}'+
    '#finTour p{font-size:14px;line-height:1.5;color:#B8C8E0;margin:0 0 14px;}'+
    '#finTour .tour-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px;}'+
    '#finTour .tour-progress{flex:1;height:4px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;}'+
    '#finTour .tour-progress i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#5EC8FF,#3A8FE8);transition:width .45s cubic-bezier(.22,1,.36,1);}'+
    '#finTour .tour-count{font-size:12px;color:#8BA0C0;font-variant-numeric:tabular-nums;min-width:42px;text-align:right;}'+
    '#finTour .tour-actions{display:flex;gap:8px;}'+
    '#finTour .tour-actions button{flex:1;padding:12px 10px;border-radius:14px;font-size:14px;font-weight:700;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;}'+
    '#finTour .tour-next{background:linear-gradient(135deg,#5EC8FF,#3A8FE8)!important;color:#0A101C!important;border:none!important;flex:1.4;}'+
    '#finTour .tour-skip{flex:.9;font-weight:600;color:#8BA0C0!important;}'+
    '#finTour .tour-back{flex:.9;}';
  document.head.appendChild(s);
}
function findTarget(sel){ if(!sel) return null; try{ return document.querySelector(sel); }catch(e){ return null; } }
function highlightNav(view){
  document.querySelectorAll('#bottomNav .bn-item').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-view')===view);
  });
}
function positionSpot(el){
  if(!spot) return;
  if(!el){ spot.classList.remove('on'); return; }
  try{ el.scrollIntoView({block:'center', behavior:'smooth', inline:'nearest'}); }catch(e){}
  setTimeout(function(){
    if(!spot || !el) return;
    var r=el.getBoundingClientRect(), pad=10;
    var left=Math.max(6, r.left-pad), top=Math.max(6, r.top-pad);
    var w=Math.min(window.innerWidth-12, r.width+pad*2);
    var h=Math.min(window.innerHeight-12, Math.max(40, r.height+pad*2));
    spot.style.left=left+'px'; spot.style.top=top+'px';
    spot.style.width=w+'px'; spot.style.height=h+'px';
    spot.classList.add('on');
  }, 300);
}
function show(i){
  if(busy) return;
  if(i>=slides.length){ finish(); return; }
  if(i<0) i=0;
  index=i;
  var s=slides[i];
  busy=true;
  if(typeof s.action==='function'){ try{ s.action(); }catch(e){} }
  var viewMap={7:'ops',8:'res',9:'debt',10:'obl'};
  if(viewMap[i]) highlightNav(viewMap[i]);
  else highlightNav('home');
  var card=root.querySelector('.tour-card');
  card.classList.remove('show');
  setTimeout(function(){
    card.querySelector('h2').textContent=s.title;
    card.querySelector('p').textContent=s.text;
    card.querySelector('.tour-count').textContent=(i+1)+' / '+slides.length;
    card.querySelector('.tour-progress i').style.width=((i+1)/slides.length*100)+'%';
    card.querySelector('.tour-next').textContent=i===slides.length-1?'Начать':'Далее';
    card.querySelector('.tour-back').style.visibility=i===0?'hidden':'visible';
    card.classList.add('show');
    setTimeout(function(){
      positionSpot(findTarget(s.target));
      busy=false;
    }, 350);
  }, 120);
}
function make(){
  injectCss();
  root=document.createElement('div');
  root.id='finTour';
  root.innerHTML='<div class="tour-dim"></div><div class="tour-spot"></div><div class="tour-card"><div class="tour-brand"><i></i>Финн · знакомство</div><h2></h2><p></p><div class="tour-meta"><div class="tour-progress"><i></i></div><span class="tour-count"></span></div><div class="tour-actions"><button type="button" class="tour-skip">Пропустить</button><button type="button" class="tour-back">Назад</button><button type="button" class="tour-next">Далее</button></div></div>';
  document.body.appendChild(root);
  spot=root.querySelector('.tour-spot');
  root.querySelector('.tour-skip').onclick=finish;
  root.querySelector('.tour-back').onclick=function(){ show(index-1); };
  root.querySelector('.tour-next').onclick=function(){ show(index+1); };
}
function start(){
  if(done() && location.search.indexOf('tour=1')===-1 && location.search.indexOf('presentation=1')===-1) return;
  function tryStart(){
    if(!document.getElementById('app') || !document.querySelector('.card.hero,.orbit-wrap,.cal')){
      setTimeout(tryStart, 250); return;
    }
    make();
    document.body.classList.add('fin-tour-active');
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    show(0);
  }
  tryStart();
}
window.FinnIntro={ start:start, replay:function(){ try{ localStorage.removeItem(KEY); }catch(e){} start(); } };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(start, 500); });
else setTimeout(start, 500);
})();
