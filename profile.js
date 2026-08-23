(function(){
'use strict';
var KEY='finna_profile_v1';

function getProfile(){
  try{
    if(window.STATE&&STATE.settings&&STATE.settings.profile)return STATE.settings.profile;
  }catch(e){}
  try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}
}
function saveProfile(p){
  try{
    if(!window.STATE)window.STATE={};
    if(!STATE.settings)STATE.settings={};
    STATE.settings.profile=p;
    if(typeof save==='function')save(true);
  }catch(e){}
  try{localStorage.setItem(KEY,JSON.stringify(p));}catch(e){}
}
function done(){var p=getProfile();return !!(p&&p.completed);}

var steps=[];
var idx=0;
var answers={};

function buildSteps(){
  steps=[
    {
      id:'works',
      title:'Ты сейчас работаешь?',
      text:'От этого зависит, показывать ли смены и ставки.',
      choices:[
        {id:'yes',label:'Да, работаю'},
        {id:'no',label:'Нет / не сейчас'}
      ]
    },
    {
      id:'incomeType',
      title:'Как приходят деньги?',
      text:'Выбери ближайший вариант — интерфейс подстроится.',
      when:function(){return answers.works==='yes';},
      choices:[
        {id:'shift',label:'Смены (день / ночь)'},
        {id:'salary',label:'Оклад / зарплата'},
        {id:'freelance',label:'Фриланс / проекты'},
        {id:'mixed',label:'По-разному'}
      ]
    },
    {
      id:'budget',
      title:'Ориентир по деньгам на месяц',
      text:'Можно примерно. Это поможет с лимитом на день.',
      choices:[
        {id:'30',label:'до 30 000 ₽'},
        {id:'50',label:'30–50 000 ₽'},
        {id:'80',label:'50–80 000 ₽'},
        {id:'120',label:'80–120 000 ₽'},
        {id:'200',label:'от 120 000 ₽'},
        {id:'skip',label:'Пока не указывать'}
      ]
    },
    {
      id:'focus',
      title:'Что важнее всего сейчас?',
      text:'Финна подчеркнёт нужные блоки на главной.',
      choices:[
        {id:'control',label:'Контроль трат'},
        {id:'debts',label:'Закрыть долги'},
        {id:'goals',label:'Копить на цели'},
        {id:'simple',label:'Просто учёт'}
      ]
    },
    {
      id:'obligations',
      title:'Есть регулярные платежи?',
      text:'Аренда, кредиты, алименты, подписки…',
      choices:[
        {id:'yes',label:'Да, есть'},
        {id:'no',label:'Почти нет'}
      ]
    }
  ];
}

function applyProfile(){
  var budgetMap={30:25000,50:40000,80:65000,120:100000,200:150000};
  var p={
    completed:true,
    works:answers.works==='yes',
    incomeType:answers.works==='yes'?(answers.incomeType||'salary'):'none',
    hasShifts:answers.works==='yes'&&answers.incomeType==='shift',
    monthlyIncome:budgetMap[answers.budget]||null,
    focus:answers.focus||'simple',
    careObligations:answers.obligations==='yes',
    updatedAt:Date.now()
  };
  saveProfile(p);
  // seed manual daily limit from budget if no shifts
  if(p.monthlyIncome&&!p.hasShifts){
    try{
      if(!STATE.settings)STATE.settings={};
      var days=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
      var left=Math.max(1,days-new Date().getDate()+1);
      STATE.settings.manualDailyLimit=Math.round(p.monthlyIncome/days);
      if(typeof save==='function')save(true);
    }catch(e){}
  }
  return p;
}

function injectCss(){
  if(document.getElementById('finProfileStyle'))return;
  var s=document.createElement('style');
  s.id='finProfileStyle';
  s.textContent=''+
    '#finProfile{position:fixed;inset:0;z-index:6000;background:rgba(6,8,14,.96);display:flex;align-items:center;justify-content:center;padding:18px;}'+
    '#finProfile .fp-card{width:min(420px,100%);background:rgba(14,22,40,.98);border:1px solid rgba(120,180,255,.28);border-radius:22px;padding:22px 18px 16px;color:#E8F0FF;box-shadow:0 20px 50px rgba(0,0,0,.5);}'+
    '#finProfile .fp-brand{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8BA0C0;font-weight:700;margin-bottom:10px;}'+
    '#finProfile h2{font-size:20px;font-weight:800;margin:0 0 8px;line-height:1.25;}'+
    '#finProfile p{font-size:14px;color:#B8C8E0;margin:0 0 16px;line-height:1.45;}'+
    '#finProfile .fp-choices{display:flex;flex-direction:column;gap:8px;}'+
    '#finProfile .fp-btn{padding:14px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;font-size:15px;font-weight:700;text-align:left;}'+
    '#finProfile .fp-btn:active{transform:scale(.98);background:rgba(94,200,255,.16);border-color:rgba(94,200,255,.4);}'+
    '#finProfile .fp-meta{margin-top:14px;font-size:12px;color:#8BA0C0;display:flex;justify-content:space-between;align-items:center;}'+
    '#finProfile .fp-skip{background:none;border:none;color:#8BA0C0;font-size:13px;padding:8px;}';
  document.head.appendChild(s);
}

function visibleSteps(){
  return steps.filter(function(s){return !s.when||s.when();});
}

function show(){
  var list=visibleSteps();
  if(idx>=list.length){
    applyProfile();
    close();
    if(typeof render==='function')render();
    try{toast('Готово — Финна подстроилась под тебя');}catch(e){}
    return;
  }
  var s=list[idx];
  var root=document.getElementById('finProfile');
  if(!root)return;
  root.innerHTML='<div class="fp-card"><div class="fp-brand">Финна · настройка</div><h2></h2><p></p><div class="fp-choices"></div><div class="fp-meta"><span></span><button type="button" class="fp-skip">Пропустить</button></div></div>';
  root.querySelector('h2').textContent=s.title;
  root.querySelector('p').textContent=s.text;
  root.querySelector('.fp-meta span').textContent=(idx+1)+' / '+list.length;
  var box=root.querySelector('.fp-choices');
  s.choices.forEach(function(ch){
    var b=document.createElement('button');
    b.type='button';b.className='fp-btn';b.textContent=ch.label;
    b.onclick=function(){
      answers[s.id]=ch.id;
      idx++;
      show();
    };
    box.appendChild(b);
  });
  root.querySelector('.fp-skip').onclick=function(){
    answers[s.id]=s.choices[s.choices.length-1].id;
    idx++;
    show();
  };
}

function close(){
  var r=document.getElementById('finProfile');
  if(r)r.remove();
}

function start(){
  if(done())return;
  injectCss();
  buildSteps();
  idx=0;answers={};
  var root=document.createElement('div');
  root.id='finProfile';
  document.body.appendChild(root);
  show();
}

window.FinnaProfile={
  start:start,
  get:getProfile,
  done:done,
  hasShifts:function(){var p=getProfile();return !p||p.hasShifts!==false&&p.incomeType==='shift';},
  showShifts:function(){var p=getProfile();if(!p||!p.completed)return true;return !!p.hasShifts;},
  showRates:function(){var p=getProfile();if(!p||!p.completed)return true;return p.works&&p.incomeType==='shift';}
};

// auto after short delay only if onboarded and no profile
function maybeStart(){
  if(done())return;
  try{
    if(localStorage.getItem('kopeyka3_onboarded_v8')!=='1'&&localStorage.getItem('kopeyka3_onboarded_v7')!=='1')return;
  }catch(e){}
  setTimeout(function(){if(!done())start();},900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(maybeStart,1200);});
else setTimeout(maybeStart,1200);
})();
