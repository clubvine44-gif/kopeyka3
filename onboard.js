(function(){
'use strict';
var ONBOARD_KEY='kopeyka3_onboarded_v1';
var onboardStep=0;
var STEPS=[
  {t:'Добро пожаловать в Копейку',b:'Личные финансы без лишней сложности. За минуту покажу, где что лежит и как пользоваться.'},
  {t:'Главные цифры',b:'Сверху — сколько можно потратить сегодня, касса и доступно. Доступно = касса − долги − неоплаченные обязательные. Если 0 — лимит на день тоже 0.'},
  {t:'Календарь и смены',b:'Тап по дню меняет смену: день → ночь → выходной. Кнопка «Смены и зарплата» считает смены и ожидаемую ЗП (ставки в ⚙).'},
  {t:'Кнопка +',b:'Внизу справа: доход, расход, резерв, долг, обязательный платёж. Всё сразу идёт в кассу и аналитику.'},
  {t:'Разделы',b:'Обязательные повторяются каждый месяц. Резервы и цели переносятся между месяцами. Долги уменьшают «доступно».'},
  {t:'Облако',b:'Иконка ☁ — вход или регистрация. У каждого аккаунта свои данные, они не смешиваются с чужими.'},
  {t:'Установить как приложение',b:'Chrome (Android): меню ⋮ → «Установить приложение» или «На экран».\nSafari (iPhone): «Поделиться» → «На экран Домой».\nChrome (ПК): иконка установки в адресной строке.'}
];
function done(){try{return localStorage.getItem(ONBOARD_KEY)==='1';}catch(e){return false;}}
function mark(){try{localStorage.setItem(ONBOARD_KEY,'1');}catch(e){}}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function show(step){
  onboardStep=step|0;
  if(onboardStep>=STEPS.length){finish();return;}
  var s=STEPS[onboardStep];
  var root=document.getElementById('onboard');
  if(!root){root=document.createElement('div');root.id='onboard';root.className='onboard';document.body.appendChild(root);}
  var last=onboardStep===STEPS.length-1;
  root.innerHTML='<div class="onboard-card"><div class="onboard-step">Шаг '+(onboardStep+1)+' из '+STEPS.length+'</div><h2>'+esc(s.t)+'</h2><p>'+esc(s.b).replace(/\n/g,'<br>')+'</p><div class="onboard-actions">'+(onboardStep>0?'<button type="button" class="ob-skip" id="obBack">Назад</button>':'<button type="button" class="ob-skip" id="obSkip">Пропустить</button>')+'<button type="button" class="ob-next" id="obNext">'+(last?'Начать':'Далее')+'</button></div></div>';
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
  if(typeof window.toast==='function')window.toast('Готово — можно вести учёт');
}
function bootOnboard(){
  if(done())return;
  try{
    var has=false;
    if(window.STATE){
      var S=window.STATE;
      if((S.income&&S.income.length)||(S.expenses&&S.expenses.length)||(S.reserves&&S.reserves.length)||(S.debts&&S.debts.length)||(S.obligations&&S.obligations.length)) has=true;
      if(!has && S.settings && Number(S.settings.openingBalance)) has=true;
    }
    if(!has && typeof window.defaultState==='function' && window.setAppState){
      window.setAppState(window.defaultState());
    }
  }catch(e){}
  setTimeout(function(){show(0);},450);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootOnboard);
else bootOnboard();
})();
