(function(){
'use strict';
var ONBOARD_KEY='kopeyka3_onboarded_v1';
var onboardStep=0;
var STEPS=[
  {t:'Добро пожаловать в Копейку',b:'Личные финансы без лишней сложности. За минуту покажу главное.'},
  {t:'Главные цифры',b:'Сверху — лимит на сегодня, касса и доступно. Доступно = касса − долги − неоплаченные обязательные.'},
  {t:'Календарь и +',b:'Тап по дню меняет смену. Кнопка + внизу: доход, расход, резерв, долг, обязательный.'},
  {t:'ИИ-помощник',b:'Кнопка ◉ — говори или пиши: «сигареты 100», «удали долг Иван», «сколько в кассе». Перед изменением всегда подтверждение.'},
  {t:'Облако и установка',b:'☁ — синхронизация. Можно установить как приложение из меню браузера.'}
];
function done(){try{return localStorage.getItem(ONBOARD_KEY)==='1';}catch(e){return false;}}
function mark(){try{localStorage.setItem(ONBOARD_KEY,'1');}catch(e){}}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function injectStyle(){
  if(document.getElementById('onboardStyle'))return;
  var s=document.createElement('style');
  s.id='onboardStyle';
  s.textContent=[
    '.onboard{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}',
    '.onboard-card{width:100%;max-width:420px;background:#16181F;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px 18px;color:#F2F3F7;box-shadow:0 16px 48px rgba(0,0,0,.45)}',
    '.onboard-step{font-size:11px;color:#9AA0B0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}',
    '.onboard-card h2{font-size:20px;margin:0 0 10px;font-weight:700}',
    '.onboard-card p{font-size:14px;line-height:1.5;color:#C5C9D3;margin:0 0 18px}',
    '.onboard-actions{display:flex;gap:10px}',
    '.ob-skip,.ob-next{flex:1;padding:12px;border-radius:12px;font-weight:700;border:0;cursor:pointer;font-size:14px}',
    '.ob-skip{background:#1C1F28;color:#F2F3F7;border:1px solid rgba(255,255,255,.12)}',
    '.ob-next{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208}'
  ].join('');
  document.head.appendChild(s);
}
function show(step){
  onboardStep=step|0;
  if(onboardStep>=STEPS.length){finish();return;}
  injectStyle();
  var s=STEPS[onboardStep];
  var root=document.getElementById('onboard');
  if(!root){root=document.createElement('div');root.id='onboard';root.className='onboard';document.body.appendChild(root);}
  var last=onboardStep===STEPS.length-1;
  root.innerHTML='<div class="onboard-card"><div class="onboard-step">Шаг '+(onboardStep+1)+' из '+STEPS.length+'</div><h2>'+esc(s.t)+'</h2><p>'+esc(s.b)+'</p><div class="onboard-actions">'+(onboardStep>0?'<button type="button" class="ob-skip" id="obBack">Назад</button>':'<button type="button" class="ob-skip" id="obSkip">Пропустить</button>')+'<button type="button" class="ob-next" id="obNext">'+(last?'Начать':'Далее')+'</button></div></div>';
  root.style.display='flex';
  var nb=document.getElementById('obNext'),sk=document.getElementById('obSkip'),bk=document.getElementById('obBack');
  if(nb)nb.onclick=function(){show(onboardStep+1);};
  if(sk)sk.onclick=finish;
  if(bk)bk.onclick=function(){show(onboardStep-1);};
}
function finish(){
  mark();
  var root=document.getElementById('onboard');
  if(root)root.remove();
}
function start(){
  if(done())return;
  injectStyle();
  show(0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
})();
