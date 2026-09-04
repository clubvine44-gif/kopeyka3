(function(){
'use strict';
/* Fin 4.9.8 — visual redesign only. Existing financial hero is the single primary dashboard object. */
function inject(){
  if(document.getElementById('finDesignStyle'))return;
  var s=document.createElement('style');s.id='finDesignStyle';s.textContent=`
:root{
  --fin-bg:#070B12;--fin-surface:#101722;--fin-surface-2:#141D2A;
  --fin-line:rgba(255,255,255,.075);--fin-text:#F4F7FB;--fin-muted:#8D9AAC;
  --fin-accent:#65C7FF;--fin-good:#54D68A;--fin-warn:#F4C86A;--fin-bad:#FF7373;--fin-radius:18px;
}
html,body{background:var(--fin-bg);color:var(--fin-text)}
body{background:linear-gradient(180deg,#070B12 0%,#0A1019 58%,#0B111A 100%)}
.wrap{max-width:560px;padding:8px 14px 28px}

/* HEADER: quiet navigation, no competition with the financial state. */
.topbar{padding:8px 12px;background:rgba(7,11,18,.985);border-bottom:1px solid rgba(255,255,255,.06)}
.top-title{font-size:16px;letter-spacing:0}.top-title .tt-model{display:none}
.icon-btn{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.07)}
.finn-avatar{width:42px;height:42px}

/* PRIMARY OBJECT: the original hero, enlarged and clarified — no second financial card. */
.card.hero{
  padding:20px 18px 17px;margin:6px 0 15px;border-radius:22px;
  background:radial-gradient(620px 280px at 10% 0%,rgba(101,199,255,.17),transparent 63%),linear-gradient(145deg,#192A43 0%,#111C2B 62%,#0F1824 100%);
  border:1px solid rgba(101,199,255,.27);box-shadow:0 13px 34px rgba(0,0,0,.30);
}
.card.hero::before{background:linear-gradient(115deg,rgba(101,199,255,.065),transparent 48%)}
.hero-main{gap:18px;align-items:center}
.orbit-wrap,.orbit-svg{width:124px;height:124px}
.orbit-val{font-size:24px;font-weight:900;letter-spacing:-.05em;text-shadow:0 0 16px rgba(101,199,255,.30)}
.orbit-sub{font-size:10px;color:rgba(244,247,251,.58)}
.hero-stats{padding-top:0}
.hero-shift{margin-bottom:8px;padding:5px 9px;font-size:12px;border-radius:10px}
.ring-legend{gap:7px;margin-top:8px}.ring-leg-item{font-size:11px}
.spark-wrap{margin-top:9px;opacity:.72}

/* Inside the hero: labels stay quiet, important values stay strong. */
.card.hero .hero-stats>*{position:relative;z-index:2}
.card.hero .hero-kpis{gap:7px;margin-top:9px}
.card.hero .hero-kpis b{font-size:15px;font-variant-numeric:tabular-nums}

/* SECONDARY CONTENT: compact, consistent, clearly below the hero. */
.card{border-radius:var(--fin-radius);background:linear-gradient(145deg,rgba(18,27,40,.98),rgba(13,20,30,.98));border-color:var(--fin-line);box-shadow:0 5px 18px rgba(0,0,0,.18);margin-bottom:10px;padding:15px}
.card.tight{padding:14px}
.sec{border-radius:16px!important;border-color:var(--fin-line)!important;background:rgba(15,23,34,.82)!important;box-shadow:none!important;overflow:hidden}
.sec-head{padding:13px 14px!important;min-height:48px}
.sec-title{font-size:13px;font-weight:700;letter-spacing:-.01em}
.sec-right{font-size:12px;color:var(--fin-muted)}
.sec-chev{font-size:20px;color:rgba(255,255,255,.32)}
.sec.open{border-color:rgba(101,199,255,.12)!important}
.sec-body{padding:0 14px 14px!important}
.sec-title-sm{font-size:10px;letter-spacing:.09em;font-weight:800;color:var(--fin-muted)}

/* Budget / necessary spending: useful information, but visually subordinate. */
.budget-card{background:rgba(14,21,31,.82)!important;box-shadow:none!important}
.budget-card .sec-title-sm{margin-bottom:9px}
.limit-card,.today-card{border-radius:15px!important;background:rgba(255,255,255,.028)!important;border-color:rgba(255,255,255,.055)!important;box-shadow:none!important}
.limit-card .limit-head{margin-bottom:5px}
.today-card .today-shift b{font-size:15px}

/* CALENDAR: navigation first, individual days second. */
.month-nav{padding:2px 1px 1px;margin-bottom:8px}
.month-title{font-size:16px;font-weight:750;letter-spacing:-.02em}
.mnav{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.06)}
.cal{gap:4px}.cal-d{border-radius:10px;background:rgba(255,255,255,.028);font-size:12px;min-height:34px}
.cal-d.today{box-shadow:0 0 0 1px rgba(244,200,106,.22),0 0 14px rgba(244,200,106,.10)}

/* ACTIONS: make the existing primary action obvious, not decorative. */
.fab{width:58px!important;height:58px!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(0,0,0,.30)!important}
.bottom-nav{height:70px;border-top:1px solid rgba(255,255,255,.075);background:rgba(7,11,18,.985)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.bottom-nav button,.bottom-nav .nav-item{min-height:52px;border-radius:14px}

/* State colors remain semantic and restrained. */
.fin-good,.positive,.hero-kpis .pos{color:var(--fin-good)}
.fin-warn,.warning,.hero-kpis .warn{color:var(--fin-warn)}
.fin-bad,.negative,.hero-kpis .neg{color:var(--fin-bad)}

@media(max-width:390px){
  .wrap{padding-left:11px;padding-right:11px}
  .card.hero{padding:17px 13px 15px;border-radius:20px}
  .hero-main{gap:10px}.orbit-wrap,.orbit-svg{width:106px;height:106px}.orbit-val{font-size:21px}
  .card{padding:13px}.sec-head{padding:12px!important}.sec-body{padding:0 12px 12px!important}
}
@media(min-width:700px){.wrap{max-width:620px}.card{margin-bottom:12px}}
`;
  document.head.appendChild(s);
}
function boot(){inject();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
