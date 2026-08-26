(function(){
'use strict';
var KEY='finna_profile_v2';

function getProfile(){
  try{ if(window.STATE&&STATE.settings&&STATE.settings.profile) return STATE.settings.profile; }catch(e){}
  try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; }
}
function saveProfile(p){
  try{
    if(!window.STATE) window.STATE={};
    if(!STATE.settings) STATE.settings={};
    STATE.settings.profile=p;
    if(typeof window.saveState==='function') window.saveState();
    else if(typeof save==='function') save(true);
  }catch(e){}
  try{ localStorage.setItem(KEY, JSON.stringify(p)); }catch(e){}
}
function done(){ var p=getProfile(); return !!(p && p.completed); }

/* ===== Scenario engine =====
   mode:
     shift     — смены день/ночь (классика)
     salary    — оклад, без графика смен
     freelance — переменный доход
     budget    — не работаю / живу на бюджет
   focus:
     control | debts | goals | simple
*/
function deriveFlags(p){
  p=p||{};
  var mode=p.mode||'shift';
  return {
    mode: mode,
    showShifts: mode==='shift',
    showRates: mode==='shift',
    showWeekStrip: mode==='shift',
    showPlanCalendar: mode==='budget' || mode==='freelance' || mode==='salary',
    showSalaryBlock: mode==='salary',
    showFreelanceBlock: mode==='freelance',
    showBudgetBlock: mode==='budget',
    prioritizeDebts: p.focus==='debts',
    prioritizeGoals: p.focus==='goals',
    prioritizeControl: p.focus==='control' || p.focus==='simple',
    labelCalendar: mode==='shift' ? 'Смены' : (mode==='budget' ? 'Планы на дни' : 'Календарь')
  };
}

var answers={}, idx=0, steps=[];

function buildSteps(){
  steps=[
    {
      id:'life',
      title:'Как устроены твои деньги?',
      text:'Выбери главное — от этого зависит весь интерфейс.',
      choices:[
        {id:'work_shift', label:'Работаю сменами (день/ночь)'},
        {id:'work_salary', label:'Работаю на окладе / зарплате'},
        {id:'work_freelance', label:'Фриланс / проекты / подработки'},
        {id:'no_work', label:'Сейчас не работаю'}
      ]
    },
    {
      id:'noWorkSub',
      title:'Откуда деньги, если не работаешь?',
      text:'Так Финна правильнее посчитает лимиты.',
      when:function(){return answers.life==='no_work';},
      choices:[
        {id:'savings', label:'Живу на накоплениях'},
        {id:'family', label:'Помогает семья / партнёр'},
        {id:'benefits', label:'Пособие / пенсия / выплаты'},
        {id:'mixed_nw', label:'По-разному'}
      ]
    },
    {
      id:'budget',
      title:'Ориентир на месяц',
      text:'Сколько примерно приходит или можно тратить в месяц?',
      choices:[
        {id:'25', label:'до 25 000 ₽'},
        {id:'40', label:'25–40 000 ₽'},
        {id:'60', label:'40–60 000 ₽'},
        {id:'90', label:'60–90 000 ₽'},
        {id:'130', label:'90–130 000 ₽'},
        {id:'200', label:'от 130 000 ₽'},
        {id:'skip', label:'Пока не указывать'}
      ]
    },
    {
      id:'focus',
      title:'Главная задача сейчас',
      text:'Финна перестроит главную под твой фокус.',
      choices:[
        {id:'control', label:'Контролировать траты каждый день'},
        {id:'debts', label:'Закрыть долги как можно быстрее'},
        {id:'goals', label:'Накопить на цель'},
        {id:'simple', label:'Просто видеть, куда уходят деньги'}
      ]
    },
    {
      id:'goalSub',
      title:'На что копишь?',
      when:function(){return answers.focus==='goals';},
      choices:[
        {id:'pad', label:'Подушка безопасности'},
        {id:'buy', label:'Крупная покупка'},
        {id:'travel', label:'Отпуск / поездка'},
        {id:'other_g', label:'Другое'}
      ]
    },
    {
      id:'debtSub',
      title:'Какие долги в приоритете?',
      when:function(){return answers.focus==='debts';},
      choices:[
        {id:'credit', label:'Кредиты / карты'},
        {id:'people', label:'Долги людям'},
        {id:'both', label:'И то и другое'},
        {id:'later', label:'Разберусь в приложении'}
      ]
    },
    {
      id:'oblig',
      title:'Регулярные платежи',
      text:'Аренда, коммуналка, подписки, алименты…',
      choices:[
        {id:'many', label:'Да, несколько каждый месяц'},
        {id:'few', label:'1–2 платежа'},
        {id:'none', label:'Почти нет'}
      ]
    }
  ];
}

function mapMode(){
  if(answers.life==='work_shift') return 'shift';
  if(answers.life==='work_salary') return 'salary';
  if(answers.life==='work_freelance') return 'freelance';
  return 'budget';
}

function applyProfile(){
  var budgetMap={25:22000,40:32000,60:50000,90:75000,130:110000,200:160000};
  var mode=mapMode();
  var p={
    completed:true,
    version:2,
    mode:mode,
    life:answers.life,
    noWorkSource:answers.noWorkSub||null,
    monthlyIncome:budgetMap[answers.budget]||null,
    focus:answers.focus||'simple',
    goalType:answers.goalSub||null,
    debtType:answers.debtSub||null,
    obligLevel:answers.oblig||'few',
    hasShifts: mode==='shift',
    updatedAt:Date.now()
  };
  var flags=deriveFlags(p);
  p.flags=flags;
  saveProfile(p);

  try{
    if(!STATE.settings) STATE.settings={};
    // budget/salary: set soft daily limit from monthly
    if(p.monthlyIncome && mode!=='shift'){
      var days=new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
      STATE.settings.manualDailyLimit=Math.round(p.monthlyIncome/days);
    }
    if(mode==='shift'){
      // clear forced manual limit from previous budget profile
      // keep user choice if they set it - only clear if we set from profile
    }
    if(typeof window.saveState==='function') window.saveState();
    else if(typeof save==='function') save(true);
  }catch(e){}
  return p;
}

function injectCss(){
  if(document.getElementById('finProfileStyle')) return;
  var s=document.createElement('style');
  s.id='finProfileStyle';
  s.textContent=''+
    '#finProfile{position:fixed;inset:0;z-index:6000;background:rgba(6,8,14,.97);display:flex;align-items:center;justify-content:center;padding:16px;}'+
    '#finProfile .fp-card{width:min(440px,100%);max-height:92vh;overflow:auto;background:rgba(14,22,40,.98);border:1px solid rgba(120,180,255,.28);border-radius:22px;padding:22px 18px 16px;color:#E8F0FF;box-shadow:0 20px 50px rgba(0,0,0,.5);}'+
    '#finProfile .fp-brand{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8BA0C0;font-weight:700;margin-bottom:10px;}'+
    '#finProfile h2{font-size:20px;font-weight:800;margin:0 0 8px;line-height:1.25;}'+
    '#finProfile p{font-size:14px;color:#B8C8E0;margin:0 0 16px;line-height:1.45;}'+
    '#finProfile .fp-choices{display:flex;flex-direction:column;gap:8px;}'+
    '#finProfile .fp-btn{padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#E8F0FF;font-size:15px;font-weight:700;text-align:left;}'+
    '#finProfile .fp-btn:active{transform:scale(.98);background:rgba(94,200,255,.16);border-color:rgba(94,200,255,.4);}'+
    '#finProfile .fp-meta{margin-top:14px;font-size:12px;color:#8BA0C0;display:flex;justify-content:space-between;align-items:center;}'+
    '#finProfile .fp-skip{background:none;border:none;color:#8BA0C0;font-size:13px;padding:8px;}';
  document.head.appendChild(s);
}

function visibleSteps(){ return steps.filter(function(s){ return !s.when || s.when(); }); }

function show(){
  var list=visibleSteps();
  if(idx>=list.length){
    applyProfile();
    close();
    if(typeof render==='function') render();
    try{ toast('Финна перестроила приложение под тебя'); }catch(e){}

    return;
  }
  var s=list[idx];
  var root=document.getElementById('finProfile');
  if(!root) return;
  root.innerHTML='<div class="fp-card"><div class="fp-brand">Финна · твой сценарий</div><h2></h2><p></p><div class="fp-choices"></div><div class="fp-meta"><span></span><button type="button" class="fp-skip">Пропустить</button></div></div>';
  root.querySelector('h2').textContent=s.title;
  root.querySelector('p').textContent=s.text||'';
  root.querySelector('.fp-meta span').textContent=(idx+1)+' / '+list.length;
  var box=root.querySelector('.fp-choices');
  s.choices.forEach(function(ch){
    var b=document.createElement('button');
    b.type='button'; b.className='fp-btn'; b.textContent=ch.label;
    b.onclick=function(){ answers[s.id]=ch.id; idx++; show(); };
    box.appendChild(b);
  });
  root.querySelector('.fp-skip').onclick=function(){
    answers[s.id]=s.choices[s.choices.length-1].id;
    idx++; show();
  };
}

function close(){ var r=document.getElementById('finProfile'); if(r) r.remove(); }

function start(){
  if(done() && location.search.indexOf('profile=1')===-1) return;
  injectCss(); buildSteps(); idx=0; answers={};
  var root=document.createElement('div'); root.id='finProfile';
  document.body.appendChild(root);
  show();
}

function flags(){ return deriveFlags(getProfile()||{}); }

window.FinnaProfile={
  start:start,
  get:getProfile,
  done:done,
  flags:flags,
  mode:function(){ var p=getProfile(); return (p&&p.mode)||'shift'; },
  showShifts:function(){ return flags().showShifts; },
  showRates:function(){ return flags().showRates; },
  showPlanCalendar:function(){ return flags().showPlanCalendar; },
  contextForAI:function(){
    var p=getProfile()||{};
    var f=deriveFlags(p);
    return {
      mode:f.mode,
      focus:p.focus||'simple',
      monthlyIncome:p.monthlyIncome,
      hasShifts:f.showShifts,
      goalType:p.goalType,
      debtType:p.debtType,
      obligLevel:p.obligLevel,
      summary:
        f.mode==='shift' ? 'Пользователь работает сменами (день/ночь).' :
        f.mode==='salary' ? 'Пользователь на окладе, без графика смен.' :
        f.mode==='freelance' ? 'Фриланс/переменный доход.' :
        'Не работает / живёт на бюджет. Календарь — для планов на дни, не смен.'
    };
  }
};

function maybeStart(){
  if(done()) return;
  try{
    var onboarded = localStorage.getItem('kopeyka3_onboarded_v10')==='1' ||
                    localStorage.getItem('kopeyka3_onboarded_v9')==='1' ||
                    localStorage.getItem('kopeyka3_onboarded_v8')==='1';
    if(!onboarded) return;
  }catch(e){}
  setTimeout(function(){ if(!done()) start(); }, 1000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(maybeStart, 1400); });
else setTimeout(maybeStart, 1400);
})();
