(function(){
'use strict';
/* Fin 4.9.7 — mobile-first dashboard redesign. Keeps existing business logic; changes hierarchy, spacing and visual emphasis. */
function inject(){
  if(document.getElementById('finDesignStyle'))return;
  var s=document.createElement('style');s.id='finDesignStyle';s.textContent=`
:root{
  --fin-bg:#070B12;--fin-surface:#101722;--fin-surface-2:#141D2A;--fin-line:rgba(255,255,255,.075);
  --fin-text:#F4F7FB;--fin-muted:#8D9AAC;--fin-accent:#65C7FF;--fin-good:#54D68A;--fin-warn:#F4C86A;--fin-bad:#FF7373;
  --fin-radius:20px;
}
body{background:radial-gradient(900px 420px at 50% -100px,rgba(65,143,210,.16),transparent 65%),linear-gradient(180deg,#070B12 0%,#0A1019 55%,#0B111A 100%)}
.wrap{max-width:560px;padding:10px 15px 28px}
.topbar{padding:9px 13px;background:rgba(7,11,18,.97);border-bottom:1px solid rgba(255,255,255,.065)}
.top-title{font-size:16px}.top-title .tt-model{display:none}
.icon-btn{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.045)}
.finn-avatar{width:42px;height:42px}
.card{border-radius:20px;background:linear-gradient(145deg,rgba(18,27,40,.98),rgba(13,20,30,.98));border-color:var(--fin-line);box-shadow:0 7px 24px rgba(0,0,0,.20);margin-bottom:12px;padding:16px}
.card.hero{padding:18px;background:radial-gradient(500px 220px at 15% 15%,rgba(101,199,255,.13),transparent 62%),linear-gradient(145deg,#172538,#101923 72%);border-color:rgba(101,199,255,.20);box-shadow:0 10px 30px rgba(0,0,0,.28)}
.hero-main{gap:15px;align-items:center}.orbit-wrap{width:116px;height:116px}.orbit-svg{width:116px;height:116px}.orbit-val{font-size:23px}.hero-shift{margin-bottom:8px;padding:5px 10px;font-size:12px}
.ring-legend{gap:6px}.ring-leg-item{font-size:12px}.spark-wrap{margin-top:8px}
#finPlanCard{order:-1;margin-bottom:12px;border-color:rgba(101,199,255,.24)!important;background:linear-gradient(145deg,rgba(18,35,53,.99),rgba(12,22,34,.99))!important;padding:18px!important}
.fin-plan-head{align-items:flex-end}.fin-plan-kicker{font-size:15px;letter-spacing:-.01em}.fin-plan-sub{font-size:11px}.fin-plan-value{font-size:31px;line-height:1;letter-spacing:-.055em;color:#fff}.fin-plan-track{height:7px;margin:15px 0 8px;background:rgba(255,255,255,.08)}.fin-plan-meta{font-size:11px}.fin-plan-extra{padding-top:1px}.fin-plan-advice{margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.07);font-size:12px;color:#DDE6F2}
.fin-plan-card:has(.fin-plan-value){position:relative;overflow:hidden}.fin-plan-card:has(.fin-plan-value)::after{content:'СЕГОДНЯ';position:absolute;right:16px;top:14px;font-size:9px;letter-spacing:.11em;color:rgba(101,199,255,.48);font-weight:800}
.month-nav{padding:2px 1px 0;margin-bottom:9px}.month-title{font-size:16px}.mnav{width:38px;height:38px;border-radius:13px}
.cal{gap:4px}.cal-d{border-radius:11px;background:rgba(255,255,255,.032);font-size:12px}.cal-d.today{box-shadow:0 0 0 1px rgba(244,200,106,.18),0 0 16px rgba(244,200,106,.12)}
.sec{border-radius:18px!important;border-color:var(--fin-line)!important;background:rgba(15,23,34,.92)!important}
.bottom-nav{height:72px;border-top:1px solid rgba(255,255,255,.08);background:rgba(7,11,18,.97)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.bottom-nav button,.bottom-nav .nav-item{min-height:54px;border-radius:15px}
.fab{width:58px!important;height:58px!important;border-radius:19px!important;box-shadow:0 8px 25px rgba(0,0,0,.32)!important}
@media(max-width:390px){.wrap{padding-left:12px;padding-right:12px}.hero-main{gap:10px}.orbit-wrap,.orbit-svg{width:104px;height:104px}.orbit-val{font-size:20px}.fin-plan-value{font-size:28px}.card{padding:14px}}
@media(min-width:700px){.wrap{max-width:620px}.card{margin-bottom:14px}}
`;
  document.head.appendChild(s);
}
function enhance(){
  var host=document.querySelector('.wrap');
  var plan=document.getElementById('finPlanCard');
  var hero=document.querySelector('.card.hero');
  if(host&&plan&&hero&&plan.previousElementSibling!==null){
    if(hero.parentNode===host && plan.parentNode===host && host.firstElementChild!==plan)host.insertBefore(plan,host.firstElementChild);
  }
}
function boot(){inject();enhance();var mo=new MutationObserver(function(){enhance();});var root=document.querySelector('.wrap')||document.body;mo.observe(root,{childList:true,subtree:false});setTimeout(enhance,300);setTimeout(enhance,1000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
