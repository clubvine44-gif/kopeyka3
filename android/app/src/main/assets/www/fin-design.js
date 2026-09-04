(function(){
'use strict';

/*
  Finna Design Layer v2 (Qwen + Grok review)
  Только визуальный слой.
  Логика и разметка из app.js не трогаются.
*/

function inject(){
  if(document.getElementById('finDesignStyle')) return;

  var s = document.createElement('style');
  s.id = 'finDesignStyle';
  s.textContent = `
    :root{
      --bg:#05080d;
      --surface:rgba(17,24,36,.94);
      --surface-2:rgba(23,32,47,.94);
      --line:rgba(255,255,255,.08);
      --line-strong:rgba(255,255,255,.13);
      --text:#f5f8fc;
      --muted:#92a0b3;
      --faint:#667389;
      --accent:#66c8ff;
      --accent-soft:rgba(102,200,255,.16);
      --good:#58d68d;
      --warn:#f2c94c;
      --bad:#ff6b6b;
      --radius:18px;
      --radius-lg:24px;
      --shadow:0 12px 32px rgba(0,0,0,.28);
      --nav-h:76px;
    }

    *{
      box-sizing:border-box;
      -webkit-tap-highlight-color:transparent;
    }

    html,body{
      margin:0;
      min-height:100%;
    }

    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Inter','Helvetica Neue',Arial,sans-serif;
      background:
        radial-gradient(1200px 600px at 85% -10%, rgba(102,200,255,.12), transparent 55%),
        radial-gradient(900px 500px at -15% 20%, rgba(88,214,141,.06), transparent 50%),
        linear-gradient(180deg,#05080d 0%,#070b12 45%,#090e17 100%);
      background-color:var(--bg);
      color:var(--text);
      line-height:1.35;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
    }

    button,input,select,textarea{
      font:inherit;
      color:inherit;
    }

    button{
      appearance:none;
      -webkit-appearance:none;
      border:0;
      background:none;
      cursor:pointer;
    }

    a{
      color:var(--accent);
      text-decoration:none;
    }

    #app,
    .wrap{
      width:100%;
      max-width:560px;
      margin:0 auto;
      padding:10px 14px calc(var(--nav-h) + 30px + env(safe-area-inset-bottom));
    }

    /* ===== Header / topbar ===== */
    .topbar,
    header{
      position:sticky;
      top:0;
      z-index:40;
      display:flex;
      align-items:center;
      gap:10px;
      padding:10px 12px;
      padding-top:calc(10px + env(safe-area-inset-top));
      background:rgba(5,8,13,.88);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      border-bottom:1px solid rgba(255,255,255,.06);
    }

    .top-title{
      font-size:16px;
      font-weight:800;
      letter-spacing:-.02em;
    }

    .top-title .tt-model{
      display:none;
    }

    .icon-btn,
    .topbar button,
    #btnSettings,
    #btnFaq,
    #btnNotif,
    #btnCloud{
      position:relative;
      min-width:40px;
      height:40px;
      border-radius:14px;
      background:rgba(255,255,255,.05);
      border:1px solid var(--line);
      color:var(--text);
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-size:16px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
    }

    .icon-btn:active,
    .topbar button:active{
      transform:scale(.96);
    }

    .finn-avatar{
      width:44px;
      height:44px;
      border-radius:16px;
      background:linear-gradient(135deg, rgba(102,200,255,.22), rgba(88,214,141,.14));
      border:1px solid rgba(102,200,255,.2);
      display:inline-flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
      flex:0 0 auto;
    }

    #notifBadge{
      position:absolute;
      top:-4px;
      right:-4px;
      min-width:18px;
      height:18px;
      padding:0 4px;
      border-radius:999px;
      background:var(--bad);
      color:#fff;
      font-size:10px;
      font-weight:800;
      display:flex;
      align-items:center;
      justify-content:center;
      border:2px solid var(--bg);
    }

    /* ===== Cards base ===== */
    .card{
      position:relative;
      border-radius:var(--radius-lg);
      background:linear-gradient(180deg, rgba(22,31,45,.94), rgba(13,19,29,.97));
      border:1px solid var(--line);
      box-shadow:var(--shadow);
      padding:16px;
      margin:0 0 12px;
      overflow:hidden;
    }

    .card:before{
      content:'';
      position:absolute;
      inset:0 0 auto 0;
      height:1px;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
      opacity:.35;
      pointer-events:none;
    }

    .card.tight{
      padding:14px;
    }

    /* ===== Hero / main finance object ===== */
    .card.hero{
      padding:20px 18px 17px;
      margin:6px 0 15px;
      border-radius:26px;
      background:
        radial-gradient(620px 280px at 10% 0%, rgba(102,200,255,.17), transparent 63%),
        linear-gradient(145deg,#192a43 0%,#111c2b 62%,#0f1824 100%);
      border:1px solid rgba(102,200,255,.27);
      box-shadow:0 18px 40px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.05);
    }

    .hero-label{
      font-size:11px;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:var(--muted);
      font-weight:800;
      margin-bottom:8px;
    }

    .hero-main{
      display:flex;
      flex-direction:column;
      gap:14px;
    }

    .hero-dual{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:12px;
      align-items:center;
      margin:8px 0 12px;
    }

    .orbit-wrap{
      position:relative;
      width:100%;
      max-width:148px;
      aspect-ratio:1/1;
      margin:0 auto;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .orbit-svg{
      width:100%;
      height:100%;
      display:block;
    }

    .orbit-core{
      position:absolute;
      inset:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:2px;
      pointer-events:none;
    }

    .orbit-val{
      font-size:clamp(20px, 6vw, 27px);
      font-weight:900;
      letter-spacing:-.05em;
      font-variant-numeric:tabular-nums;
      text-shadow:0 0 18px rgba(102,200,255,.22);
    }

    .orbit-val.orbit-val-sm{
      font-size:22px;
    }

    .orbit-val.orbit-val-md{
      font-size:20px;
    }

    .orbit-val.orbit-val-xs{
      font-size:17px;
    }

    .orbit-val-lim{
      color:#7de3c3;
    }

    .orbit-sub{
      font-size:10px;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:var(--muted);
      font-weight:700;
    }

    .hero-stats{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .hero-shift,
    .today-shift{
      padding:6px 10px;
      border-radius:12px;
      background:rgba(255,255,255,.05);
      border:1px solid var(--line);
      font-size:12px;
      color:var(--muted);
    }

    .today-shift.day{
      border-color:rgba(88,214,141,.22);
    }

    .today-shift.night{
      border-color:rgba(102,200,255,.22);
    }

    .today-shift.off{
      opacity:.75;
    }

    .hero-horizon{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      padding:6px;
      border-radius:16px;
      background:rgba(255,255,255,.045);
      border:1px solid rgba(255,255,255,.06);
      margin:12px 0 6px;
    }

    .hero-horizon .mode,
    .hero-horizon.limit-modes button{
      border:0;
      border-radius:12px;
      padding:10px 12px;
      background:transparent;
      color:var(--muted);
      font-weight:700;
      min-height:42px;
    }

    .hero-horizon .mode.active{
      background:linear-gradient(135deg, rgba(102,200,255,.22), rgba(88,214,141,.14));
      color:var(--text);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
    }

    .hero-horizon .mode.dim{
      opacity:.45;
    }

    .hero-horizon-sub{
      font-size:12px;
      color:var(--muted);
      text-align:center;
      margin:4px 0 10px;
    }

    .hero-kpis{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin-top:10px;
    }

    .kpi{
      min-height:58px;
      border-radius:16px;
      background:rgba(255,255,255,.045);
      border:1px solid rgba(255,255,255,.06);
      padding:9px 10px;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:4px;
    }

    .kpi-l{
      font-size:10px;
      letter-spacing:.08em;
      text-transform:uppercase;
      color:var(--muted);
      font-weight:700;
    }

    .kpi b{
      font-size:16px;
      font-variant-numeric:tabular-nums;
    }

    .ring-legend{
      display:flex;
      flex-direction:column;
      gap:7px;
      margin-top:8px;
    }

    .ring-leg-item{
      display:flex;
      align-items:center;
      gap:8px;
      font-size:12px;
      color:var(--muted);
    }

    .ring-leg-item b{
      margin-left:auto;
      color:var(--text);
      font-variant-numeric:tabular-nums;
    }

    .leg-dot{
      width:10px;
      height:10px;
      border-radius:50%;
      flex:0 0 auto;
    }

    .spark-wrap{
      margin-top:10px;
      opacity:.75;
    }

    .spark-wrap svg{
      width:100%;
      height:42px;
      display:block;
    }

    /* ===== Section titles ===== */
    .sec-title-sm{
      font-size:10px;
      letter-spacing:.09em;
      text-transform:uppercase;
      color:var(--muted);
      font-weight:800;
      margin-bottom:8px;
    }

    /* ===== Budget / needed expenses ===== */
    .budget-card,
    .near-card,
    .forecast-card,
    .urgent-res-card{
      background:linear-gradient(180deg, rgba(19,27,40,.9), rgba(12,18,28,.95));
    }

    .budget-period{
      font-size:12px;
      color:var(--muted);
      margin:0 0 10px;
    }

    .budget-period.budget-roll{
      color:var(--good);
    }

    .budget-row{
      padding:12px;
      border-radius:16px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      margin-bottom:8px;
    }

    .budget-row-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:6px;
    }

    .budget-row-top b{
      font-size:14px;
    }

    .budget-lim{
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.05);
      color:var(--text);
      border-radius:999px;
      padding:6px 10px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
    }

    .budget-row-sub{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      font-size:12px;
      margin-bottom:8px;
      color:var(--muted);
    }

    .limit-bar{
      height:8px;
      border-radius:999px;
      background:rgba(255,255,255,.08);
      overflow:hidden;
    }

    .limit-fill{
      height:100%;
      border-radius:999px;
      transition:width .35s ease;
    }

    .budget-saved{
      display:none;
      margin-top:8px;
      font-size:12px;
      color:var(--muted);
    }

    .budget-saved.has{
      display:block;
      color:var(--good);
    }

    /* ===== Urgent reserves ===== */
    .urgent-res-card{
      border-color:rgba(255,107,107,.16);
    }

    .urgent-res-title{
      color:#ffa3a3;
    }

    .urgent-res-item{
      border-radius:16px;
      padding:12px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.06);
      margin-bottom:8px;
    }

    .urgent-res-item.urg-hot{
      border-color:rgba(255,107,107,.22);
      background:linear-gradient(135deg, rgba(255,107,107,.09), rgba(255,255,255,.02));
    }

    .urgent-res-item.urg-mid{
      border-color:rgba(242,201,76,.18);
    }

    .urg-bar{
      margin-top:8px;
    }

    /* ===== Lists / items ===== */
    .list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .item{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:13px 14px;
      border-radius:16px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      transition:transform .12s ease, background .12s ease, border-color .12s ease;
    }

    .item:active{
      transform:scale(.985);
      background:rgba(255,255,255,.05);
    }

    .item .left{
      min-width:0;
      display:flex;
      flex-direction:column;
      gap:4px;
    }

    .item .left b{
      font-size:14px;
      font-weight:750;
      word-break:break-word;
    }

    .muted{
      color:var(--muted);
      font-size:12px;
    }

    .amt{
      font-weight:850;
      font-variant-numeric:tabular-nums;
      white-space:nowrap;
    }

    .amt.plus,
    .plus,
    .pos,
    .positive,
    .check-paid{
      color:var(--good)!important;
    }

    .amt.minus,
    .minus,
    .neg,
    .negative{
      color:var(--bad)!important;
    }

    .item-paid{
      opacity:.78;
    }

    .item-deferred{
      opacity:.6;
    }

    .op-deleted{
      opacity:.52;
    }

    .op-mark{
      display:inline-block;
      margin-left:6px;
      font-size:10px;
      font-weight:700;
      padding:2px 6px;
      border-radius:999px;
      vertical-align:middle;
    }

    .op-mark.del{
      background:rgba(255,107,107,.14);
      color:#ffb3b3;
    }

    .op-mark.edit{
      background:rgba(255,255,255,.09);
      color:var(--muted);
    }

    .item-priority{
      border-left:3px solid rgba(102,200,255,.5);
    }

    .res-priority{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:20px;
      height:20px;
      border-radius:7px;
      font-size:11px;
      font-weight:800;
      margin-right:6px;
    }

    .res-priority.p1{
      background:rgba(255,107,107,.16);
      color:#ffb3b3;
    }

    .res-priority.p2{
      background:rgba(242,201,76,.16);
      color:#ffe08a;
    }

    .res-priority.p3{
      background:rgba(102,200,255,.16);
      color:#9fe0ff;
    }

    .res-urgent{
      color:#ffb3b3;
      font-size:11px;
    }

    .empty{
      padding:14px;
      border-radius:16px;
      border:1px dashed rgba(255,255,255,.12);
      color:var(--muted);
      text-align:center;
    }

    .empty.tight{
      padding:10px;
    }

    .hint{
      color:var(--muted);
      font-size:12px;
      line-height:1.45;
      margin:8px 0;
    }

    /* ===== Forecast / reserves / debts ===== */
    .forecast-main{
      font-size:14px;
      margin-bottom:8px;
    }

    .forecast-alt{
      font-size:13px;
      margin:4px 0;
      color:var(--text);
    }

    .forecast-alt.muted{
      color:var(--muted);
    }

    .res-total{
      font-size:24px;
      font-weight:900;
      margin:6px 0 8px;
      letter-spacing:-.03em;
    }

    .res-total.neg{
      color:var(--bad)!important;
    }

    /* ===== Week strip / shifts ===== */
    .week-strip{
      display:grid;
      grid-template-columns:repeat(7,1fr);
      gap:6px;
      margin:10px 0;
    }

    .wd{
      min-height:62px;
      border-radius:14px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:4px;
      font-size:12px;
      position:relative;
    }

    .wd-d{
      font-size:10px;
      color:var(--muted);
    }

    .wd-s{
      font-weight:800;
    }

    .wd.today{
      border-color:rgba(102,200,255,.45);
      box-shadow:0 0 0 1px rgba(102,200,255,.24), 0 0 18px rgba(102,200,255,.10);
    }

    .wd.day{
      background:linear-gradient(180deg, rgba(88,214,141,.12), rgba(255,255,255,.02));
    }

    .wd.night{
      background:linear-gradient(180deg, rgba(102,200,255,.14), rgba(255,255,255,.02));
    }

    .wd.off{
      opacity:.72;
    }

    .wd.has-plan:after{
      content:'';
      width:5px;
      height:5px;
      border-radius:50%;
      background:var(--warn);
      margin-top:2px;
    }

    .shift-summary{
      color:var(--muted);
      font-size:12px;
      margin:6px 0 8px;
    }

    /* ===== Calendar modal ===== */
    .month-nav{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin:8px 0 12px;
    }

    .month-title{
      font-size:17px;
      font-weight:800;
      letter-spacing:-.02em;
    }

    .mnav{
      width:40px;
      height:40px;
      border-radius:14px;
      background:rgba(255,255,255,.05);
      border:1px solid var(--line);
      color:var(--text);
      font-size:20px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
    }

    .cal{
      display:grid;
      grid-template-columns:repeat(7,1fr);
      gap:6px;
    }

    .cal-h{
      font-size:11px;
      color:var(--muted);
      text-align:center;
      padding:4px 0;
    }

    .cal-d{
      min-height:44px;
      border-radius:12px;
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      font-size:13px;
    }

    .cal-d.other{
      opacity:.25;
    }

    .cal-d.day{
      background:rgba(88,214,141,.10);
    }

    .cal-d.night{
      background:rgba(102,200,255,.12);
    }

    .cal-d.off{
      opacity:.65;
    }

    .cal-d.today{
      border-color:rgba(242,201,76,.5);
      box-shadow:0 0 0 1px rgba(242,201,76,.24);
    }

    .cal-d.has-obl:after{
      content:'';
      position:absolute;
      bottom:6px;
      width:5px;
      height:5px;
      border-radius:50%;
      background:var(--warn);
    }

    .cal-d.next-shift{
      border-color:rgba(102,200,255,.4);
    }

    .cal-d .star{
      position:absolute;
      top:3px;
      right:5px;
      font-size:9px;
    }

    .cal-d .dot{
      display:none;
    }

    /* ===== Link more ===== */
    .link-more{
      width:100%;
      margin-top:10px;
      padding:11px 12px;
      border-radius:14px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.07);
      color:var(--accent);
      font-weight:700;
      text-align:center;
    }

    .link-more:active{
      transform:scale(.98);
    }

    /* ===== View title ===== */
    .view-title-bar h2{
      margin:16px 0 10px;
      font-size:24px;
      letter-spacing:-.03em;
    }

    /* ===== Sections / accordion ===== */
    .sec{
      margin:0 0 10px;
      border-radius:18px;
      background:rgba(255,255,255,.02);
      border:1px solid var(--line);
      overflow:hidden;
    }

    .sec-head{
      width:100%;
      display:flex;
      align-items:center;
      gap:10px;
      padding:14px;
      background:transparent;
      color:var(--text);
      text-align:left;
    }

    .sec-title{
      flex:1;
      text-align:left;
      font-size:13px;
      font-weight:800;
    }

    .sec-right{
      color:var(--muted);
      font-size:12px;
      font-weight:600;
    }

    .sec-chev{
      color:rgba(255,255,255,.35);
      font-size:18px;
      transform:rotate(0deg);
      transition:transform .18s ease;
    }

    .sec.open .sec-chev{
      transform:rotate(90deg);
    }

    .sec-body{
      display:none;
      padding:0 14px 14px;
    }

    .sec.open .sec-body{
      display:block;
    }

    .sec.open{
      border-color:rgba(102,200,255,.12);
    }

    /* ===== Analytics mini cats ===== */
    .mini-cat{
      display:grid;
      grid-template-columns:12px 1fr auto auto;
      gap:8px;
      align-items:center;
      padding:10px 12px;
      border-radius:14px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      margin-bottom:8px;
    }

    .leg-name{
      font-size:13px;
      color:var(--text);
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .leg-pct{
      color:var(--muted);
      font-size:12px;
    }

    .mini-cat b{
      font-variant-numeric:tabular-nums;
    }

    /* ===== Modals / dialogs ===== */
    .modal-bg{
      position:fixed;
      inset:0;
      z-index:80;
      display:none;
      padding:16px;
      align-items:flex-end;
      justify-content:center;
      background:rgba(2,4,8,.62);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
    }

    .modal-bg.show{
      display:flex;
    }

    .modal-bg.full{
      padding:0;
      align-items:stretch;
    }

    #dlgLayer.modal-bg{
      z-index:90;
    }

    .modal-card{
      width:min(560px, 100%);
      max-height:84vh;
      overflow:auto;
      border-radius:24px;
      background:linear-gradient(180deg,#121b28,#0b121c);
      border:1px solid rgba(255,255,255,.09);
      box-shadow:0 24px 70px rgba(0,0,0,.45);
      padding:18px;
      animation:finSheet .22s ease;
    }

    .modal-bg.full .modal-card.full-screen{
      width:100%;
      height:100%;
      max-height:none;
      border-radius:0;
      border-left:0;
      border-right:0;
      padding:16px 16px calc(18px + env(safe-area-inset-bottom));
    }

    .modal-title{
      font-size:18px;
      font-weight:850;
      margin-bottom:12px;
    }

    .modal-scroll{
      overflow:auto;
    }

    @media(min-width:700px){
      .modal-bg{
        align-items:center;
      }
      .modal-card{
        max-height:min(84vh,720px);
      }
    }

    .dlg-msg{
      color:var(--muted);
      font-size:14px;
      line-height:1.45;
      margin:0 0 10px;
    }

    .dlg-field{
      margin:10px 0;
    }

    .dlg-field label{
      display:block;
      font-size:12px;
      color:var(--muted);
      margin-bottom:6px;
    }

    .dlg-actions{
      display:flex;
      gap:8px;
      margin-top:14px;
    }

    .dlg-actions button{
      flex:1;
    }

    /* ===== Inputs ===== */
    input,
    textarea,
    select{
      width:100%;
      border-radius:14px;
      background:rgba(4,8,14,.55);
      border:1px solid rgba(255,255,255,.09);
      color:var(--text);
      padding:12px 14px;
      outline:none;
    }

    input:focus,
    textarea:focus,
    select:focus{
      border-color:rgba(102,200,255,.55);
      box-shadow:0 0 0 3px rgba(102,200,255,.12);
    }

    input[type=checkbox]{
      width:auto;
    }

    /* ===== Buttons ===== */
    .btn,
    .btn-primary,
    .btn-ghost,
    .dlg-actions button,
    .mnav{
      border-radius:14px;
      padding:12px 16px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.05);
      color:var(--text);
      font-weight:700;
      min-height:46px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
    }

    .btn-primary,
    .btn.primary,
    .dlg-actions .btn.primary{
      background:linear-gradient(135deg,#2e9bff,#59d0ff);
      border-color:rgba(122,214,255,.38);
      color:#041019;
      box-shadow:0 10px 24px rgba(46,155,255,.22);
    }

    .btn-ghost{
      background:transparent;
    }

    .btn:active,
    .btn-primary:active,
    .dlg-actions button:active{
      transform:scale(.98);
    }

    /* ===== Chips ===== */
    .chip-row{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
    }

    .chip{
      padding:9px 12px;
      border-radius:999px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      color:var(--muted);
      font-size:13px;
      font-weight:600;
    }

    .chip.selected{
      background:linear-gradient(135deg, rgba(102,200,255,.22), rgba(88,214,138,.16));
      color:var(--text);
      border-color:rgba(102,200,255,.38);
    }

    /* ===== Settings rows ===== */
    .set-group{
      margin:14px 0;
      padding:6px 0;
      border-top:1px solid rgba(255,255,255,.06);
    }

    .set-group-title{
      font-size:11px;
      letter-spacing:.1em;
      text-transform:uppercase;
      color:var(--muted);
      margin:10px 2px 8px;
      font-weight:800;
    }

    .set-row{
      width:100%;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:14px 12px;
      border-radius:16px;
      background:transparent;
      border:0;
      text-align:left;
      color:var(--text);
    }

    .set-row:active{
      background:rgba(255,255,255,.045);
    }

    .set-main{
      display:flex;
      flex-direction:column;
      gap:4px;
      min-width:0;
    }

    .set-main b{
      font-size:14px;
    }

    .set-main span{
      font-size:12px;
      color:var(--muted);
    }

    .set-val{
      color:var(--accent);
      font-size:13px;
      font-weight:700;
      white-space:nowrap;
    }

    .set-row.danger .set-main b{
      color:var(--bad);
    }

    /* ===== Time/date segmented inputs ===== */
    .seg-time,
    .seg-date{
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      margin:14px 0;
    }

    .seg-box{
      flex:1;
      max-width:110px;
    }

    .seg-box.grow{
      max-width:140px;
    }

    .seg-box label{
      display:block;
      font-size:11px;
      color:var(--muted);
      margin-bottom:6px;
      text-align:center;
    }

    .seg-box input{
      text-align:center;
      font-weight:800;
      font-size:18px;
    }

    .seg-colon{
      font-size:22px;
      font-weight:800;
      color:var(--muted);
      padding-top:18px;
    }

    /* ===== Shift pay modal ===== */
    .sp-grid{
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:8px;
      margin:12px 0;
    }

    .sp-item{
      padding:12px;
      border-radius:16px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      text-align:center;
    }

    .sp-item b{
      display:block;
      font-size:22px;
      margin-bottom:4px;
    }

    .sp-item span{
      color:var(--muted);
      font-size:12px;
    }

    .sp-pay{
      padding:14px;
      border-radius:16px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      text-align:center;
      margin-top:8px;
    }

    .sp-pay .big{
      font-size:24px;
      font-weight:900;
      letter-spacing:-.03em;
    }

    /* ===== Notifications / FAQ ===== */
    .notif-list{
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .n-item{
      padding:13px 14px;
      border-radius:16px;
      background:rgba(255,255,255,.03);
      border:1px solid rgba(255,255,255,.05);
      display:flex;
      flex-direction:column;
      gap:5px;
    }

    .n-item b{
      font-size:14px;
    }

    .n-item span{
      color:var(--muted);
      font-size:13px;
    }

    .n-item.unread{
      border-color:rgba(102,200,255,.24);
      background:linear-gradient(135deg, rgba(102,200,255,.07), rgba(255,255,255,.02));
    }

    .faq-cat{
      border-radius:16px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.06);
      margin-bottom:8px;
      background:rgba(255,255,255,.02);
    }

    .faq-cat > button{
      width:100%;
      display:flex;
      justify-content:space-between;
      gap:10px;
      padding:14px;
      background:transparent;
      font-weight:700;
      text-align:left;
    }

    .faq-body{
      display:none;
      padding:0 14px 14px;
      color:var(--muted);
      font-size:14px;
    }

    .faq-cat.open .faq-body{
      display:block;
    }

    /* ===== Toast ===== */
    #toast{
      position:fixed;
      left:50%;
      bottom:calc(92px + env(safe-area-inset-bottom));
      transform:translateX(-50%) translateY(12px);
      opacity:0;
      pointer-events:none;
      background:rgba(14,20,30,.95);
      border:1px solid rgba(255,255,255,.1);
      color:var(--text);
      padding:11px 14px;
      border-radius:14px;
      box-shadow:var(--shadow);
      z-index:120;
      transition:.2s;
      max-width:calc(100vw - 32px);
      text-align:center;
    }

    #toast.show{
      opacity:1;
      transform:translateX(-50%) translateY(0);
    }

    /* ===== FAB / radial ===== */
    #fab,
    .fab{
      position:fixed;
      right:16px;
      bottom:calc(86px + env(safe-area-inset-bottom));
      width:58px;
      height:58px;
      border-radius:20px;
      z-index:70;
      background:linear-gradient(135deg,#31a2ff,#63d8ff);
      border:0;
      color:#041019;
      font-size:26px;
      font-weight:900;
      box-shadow:0 14px 30px rgba(49,162,255,.30);
      display:flex;
      align-items:center;
      justify-content:center;
    }

    #fab.holding{
      transform:scale(.96);
    }

    #radial{
      position:fixed;
      right:16px;
      bottom:calc(154px + env(safe-area-inset-bottom));
      z-index:69;
      display:none;
      flex-direction:column;
      gap:8px;
    }

    #radial.show{
      display:flex;
    }

    #radial button{
      min-width:160px;
      padding:12px 14px;
      border-radius:16px;
      background:rgba(10,15,24,.92);
      border:1px solid rgba(255,255,255,.1);
      color:var(--text);
      box-shadow:var(--shadow);
      text-align:left;
      font-weight:600;
    }

    /* ===== Bottom navigation ===== */
    .bottom-nav{
      position:fixed;
      left:0;
      right:0;
      bottom:0;
      z-index:60;
      display:flex;
      gap:6px;
      padding:8px 10px calc(8px + env(safe-area-inset-bottom));
      background:rgba(5,8,13,.92);
      backdrop-filter:blur(18px);
      -webkit-backdrop-filter:blur(18px);
      border-top:1px solid rgba(255,255,255,.08);
    }

    .bottom-nav button,
    .bottom-nav .nav-item,
    .quick-nav{
      flex:1;
      min-height:52px;
      border-radius:16px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:4px;
      font-size:11px;
      color:var(--muted);
      background:transparent;
      border:0;
      font-weight:700;
    }

    .bottom-nav button.active,
    .bottom-nav .nav-item.active,
    .quick-nav.active{
      color:var(--text);
      background:rgba(102,200,255,.10);
    }

    /* ===== Finn tip popup ===== */
    .finn-tip-pop{
      position:fixed;
      inset:0;
      z-index:95;
      display:flex;
      align-items:flex-end;
      justify-content:center;
      padding:16px;
      background:rgba(2,4,8,.5);
      backdrop-filter:blur(6px);
      -webkit-backdrop-filter:blur(6px);
      opacity:0;
      pointer-events:none;
      transition:.2s;
    }

    .finn-tip-pop.show{
      opacity:1;
      pointer-events:auto;
    }

    .finn-tip-pop-card{
      width:min(560px,100%);
      background:linear-gradient(180deg,#121b28,#0b121c);
      border:1px solid rgba(255,255,255,.09);
      border-radius:22px;
      padding:16px;
      box-shadow:0 24px 70px rgba(0,0,0,.45);
      animation:finSheet .2s ease;
    }

    .finn-tip-pop-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:8px;
      font-weight:800;
    }

    #finnTipPopClose{
      background:none;
      border:0;
      color:var(--muted);
      font-size:16px;
    }

    .finn-tip-pop-body{
      font-size:14px;
      line-height:1.45;
    }

    .finn-tip-pop-att{
      margin-top:10px;
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    .att-item{
      padding:10px 12px;
      border-radius:12px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.06);
      color:var(--muted);
      font-size:13px;
    }

    /* ===== Shift banner ===== */
    .shift-banner{
      position:fixed;
      top:calc(12px + env(safe-area-inset-top));
      left:50%;
      transform:translateX(-50%) translateY(-16px);
      opacity:0;
      z-index:110;
      background:rgba(10,15,24,.92);
      border:1px solid rgba(255,255,255,.1);
      color:var(--text);
      padding:10px 14px;
      border-radius:999px;
      box-shadow:var(--shadow);
      transition:.25s;
      max-width:calc(100vw - 32px);
      text-align:center;
      font-size:13px;
      font-weight:600;
    }

    .shift-banner.show{
      opacity:1;
      transform:translateX(-50%) translateY(0);
    }

    /* ===== Name intro modal ===== */
    .name-intro{
      text-align:center;
    }

    .ni-face{
      font-size:42px;
      margin-bottom:8px;
    }

    .ni-text{
      color:var(--muted);
      font-size:14px;
      margin:8px 0;
    }

    .ni-input{
      margin:10px 0;
    }

    .ni-check{
      display:flex;
      align-items:center;
      gap:8px;
      justify-content:center;
      color:var(--muted);
      font-size:13px;
      margin:8px 0;
    }

    .ni-check input{
      width:auto;
    }

    /* ===== Splash ===== */
    #finSplash{
      position:fixed;
      inset:0;
      z-index:200;
      background:
        radial-gradient(700px 300px at 50% 0%, rgba(102,200,255,.16), transparent 60%),
        linear-gradient(180deg,#05080d,#090e17);
      display:flex;
      align-items:center;
      justify-content:center;
      transition:opacity .4s ease;
    }

    #finSplash.hide{
      opacity:0;
      pointer-events:none;
    }

    /* ===== Utilities / states ===== */
    .fin-good,
    .positive{
      color:var(--good)!important;
    }

    .fin-warn,
    .warning{
      color:var(--warn)!important;
    }

    .fin-bad,
    .negative{
      color:var(--bad)!important;
    }

    #todayStatusBody,
    #finnTipBody{
      color:var(--muted);
      font-size:13px;
      line-height:1.4;
    }

    /* ===== Responsive ===== */
    @media(max-width:390px){
      #app,
      .wrap{
        padding-left:11px;
        padding-right:11px;
      }

      .card.hero{
        padding:17px 13px 15px;
        border-radius:22px;
      }

      .hero-dual{
        gap:10px;
      }

      .orbit-wrap,
      .orbit-svg{
        max-width:120px;
      }

      .orbit-val{
        font-size:21px;
      }

      .card{
        padding:13px;
      }

      .sec-head{
        padding:12px;
      }

      .sec-body{
        padding:0 12px 12px;
      }

      .hero-kpis{
        grid-template-columns:1fr;
      }

      .kpi{
        flex-direction:row;
        align-items:center;
        justify-content:space-between;
        min-height:44px;
      }
    }

    @media(max-width:360px){
      .hero-dual{
        grid-template-columns:1fr;
      }

      .orbit-wrap,
      .orbit-svg{
        max-width:145px;
      }
    }

    @media(min-width:700px){
      #app,
      .wrap{
        max-width:620px;
      }

      .card{
        margin-bottom:12px;
      }
    }

    @keyframes finSheet{
      from{
        opacity:0;
        transform:translateY(14px);
      }
      to{
        opacity:1;
        transform:translateY(0);
      }
    }

    @media(prefers-reduced-motion: reduce){
      *{
        animation:none!important;
        transition:none!important;
        scroll-behavior:auto!important;
      }
    }
  

    /* ===== perf-mode (Realme C55 / weak GPU) — Grok safety ===== */
    html.perf-mode body,
    body.perf-mode{
      background:#070b12!important;
    }
    html.perf-mode .topbar,
    html.perf-mode header,
    body.perf-mode .topbar,
    body.perf-mode header,
    html.perf-mode .bottom-nav,
    body.perf-mode .bottom-nav{
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
      background:rgba(5,8,13,.98)!important;
    }
    html.perf-mode .modal-bg,
    html.perf-mode .finn-tip-pop,
    body.perf-mode .modal-bg,
    body.perf-mode .finn-tip-pop{
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
    }
    html.perf-mode .card,
    html.perf-mode .card.hero,
    body.perf-mode .card,
    body.perf-mode .card.hero{
      box-shadow:0 4px 12px rgba(0,0,0,.25)!important;
    }
    html.perf-mode #fab,
    body.perf-mode #fab{
      box-shadow:0 6px 14px rgba(49,162,255,.22)!important;
    }
`;

  document.head.appendChild(s);
}

function boot(){
  inject();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

})();
