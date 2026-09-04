(function(){
'use strict';
/* Fin 4.9.8 — visual redesign only. The existing hero remains the single primary financial card. */
function inject(){
  if(document.getElementById('finDesignStyle'))return;
  var s=document.createElement('style');s.id='finDesignStyle';s.textContent=`
:root{
  --fin-bg:#070B12;--fin-surface:#101722;--fin-surface-2:#141D2A;--fin-line:rgba(255,255,255,.075);
  --fin-text:#F4F7FB;--fin-muted:#8D9AAC;--fin-accent:#65C7FF;--fin-good:#54D68A;--fin-warn:#F4C86A;--fin-bad:#FF7373;
  --fin-radius:20px;
}
body{background:linear-gradient(180deg,#070B12 0%,#0A1019 55%,#0B111A 100%)}
.wrap{max-width:560px;padding:10px 15px 28px}
.topbar{padding:9px 13px;background:rgba(7,11,18,.98);border-bottom:1px solid rgba(255,255,255,.065)}
.top-title{font-size:16px}.top-title .tt-model{display:none}
.icon-btn{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.045)}
.finn-avatar{width:42px;height:42px}
.card{border-radius:20px;background:linear-gradient(145deg,rgba(18,27,40,.98),rgba(13,20,30,.98));border-color:var(--fin-line);box-shadow:0 7px 24px rgba(0,0,0,.20);margin-bottom:12px;padding:16px}

/* The existing financial hero is the one and only primary dashboard object. */
.card.hero{
  padding:20px 18px 17px;
  background:radial-gradient(520px 260px at 15% 0%,rgba(101,199,255,.16),transparent 64%),linear-gradient(145deg,#182941,#101923 72%);
  border-color:rgba(101,199,255,.28);
  box-shadow:0 12px 34px rgba(0,0,0,.30);
  margin-bottom:16px;
}
.card.hero::before{background:linear-gradient(110deg,rgba(101,199,255,.07),transparent 45%);}
.hero-main{gap:18px;align-items:center}.orbit-wrap{width:124px;height:124px}.orbit-svg{width:124px;height:124px}.orbit-val{font-size:24px}.orbit-sub{font-size:11px}
.hero-stats{padding-top:1px}.hero-shift{margin-bottom:9px;padding:5px 10px;font-size:12px}
.ring-legend{gap:7px;margin-top:8px}.ring-leg-item{font-size:11px}
.spark-wrap{margin-top:10px}

/* Give the main number more hierarchy without creating another number/card. */
.card.hero .orbit-val{font-weight:900;letter-spacing:-.045em;text-shadow:0 0 16px rgba(101,199,255,.32)}
.card.hero .hero-stats>*{position:relative;z-index:2}

/* Secondary information is quieter; it supports the hero instead of competing with it. */
.month-nav{padding:2px 1px 0;margin-bottom:9px}.month-title{font-size:16px}.mnav{width:38px;height:38px;border-radius:13px}
.sec{border-radius:18px!important;border-color:var(--fin-line)!important;background:rgba(15,23,34,.92)!important;box-shadow:none!important}
.cal{gap:4px}.cal-d{border-radius:11px;background:rgba(255,255,255,.032);font-size:12px}
.cal-d.today{box-shadow:0 0 0 1px rgba(244,200,106,.18),0 0 16px rgba(244,200,106,.12)}

/* Avoid visual noise below the hero. */
.bottom-nav{height:72px;border-top:1px solid rgba(255,255,255,.08);background:rgba(7,11,18,.98)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.bottom-nav button,.bottom-nav .nav-item{min-height:54px;border-radius:15px}
.fab{width:58px!important;height:58px!important;border-radius:19px!important;box-shadow:0 8px 25px rgba(0,0,0,.32)!important}
@media(max-width:390px){.wrap{padding-left:12px;padding-right:12px}.hero-main{gap:11px}.orbit-wrap,.orbit-svg{width:106px;height:106px}.orbit-val{font-size:21px}.card{padding:14px}.card.hero{padding:17px 14px 15px}}
@media(min-width:700px){.wrap{max-width:620px}.card{margin-bottom:14px}}
`;
  document.head.appendChild(s);
}
function boot(){inject();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
