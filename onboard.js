(function(){
'use strict';
var KEY='kopeyka3_onboarded_v3';
var slides=[
 {title:'Добро пожаловать в Финну',text:'Твой персональный ИИ-агент для финансов. Я помогу учитывать деньги, планировать бюджет и принимать решения на основе твоих данных.',target:'.hero',tone:'hero',time:5000},
 {title:'Главный экран',text:'Здесь всё главное сразу перед глазами: баланс, доступные деньги, доходы, расходы и текущая финансовая ситуация.',target:'.hero',time:5000},
 {title:'Добавляй операции за секунды',text:'Кнопка «+» открывает быстрые действия. Доход, расход, резерв, долг или обязательный платёж — без сложных форм.',target:'.fab',time:5000},
 {title:'Календарь смен',text:'Календарь показывает твой график. У нового пользователя все дни изначально выходные. Смена появляется только после твоего ручного выбора.',target:'.cal',time:5000},
 {title:'Резерв и цели',text:'Отделяй деньги на подушку, права, отпуск или любую другую цель. Так накопления не смешиваются с деньгами на обычные расходы.',target:'[id*=res], .sec',time:5000},
 {title:'Долги и обязательства',text:'Храни обязательства в одном месте, отмечай выплаты и всегда видь, сколько осталось.',target:'[id*=debt], .sec',time:5000},
 {title:'Аналитика',text:'Смотри категории расходов, доходы и динамику. Вместо догадок — понятная картина твоих финансов.',target:'[id*=an], .sec',time:5000},
 {title:'Фина — твой ИИ-агент',text:'Пиши обычными словами: «сколько у меня доступно?», «добавь расход 450 на продукты» или попроси разобрать бюджет. Фина работает с данными приложения.',target:'.finn-avatar',time:6000},
 {title:'Настройки и контроль',text:'Ключ ИИ, ставки, резервные копии и остальные параметры остаются доступны в настройках. Ты всегда можешь изменить конфигурацию.',target:'.top-actions',time:5000},
 {title:'Готово',text:'Теперь ты знаешь основу. Дальше просто пользуйся Финной — добавляй операции, ставь цели и разговаривай со своим ИИ-агентом.',target:'.hero',time:5000}
];
var index=0,timer=null,root=null,spot=null,caption=null,progress=null;
function done(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function finish(){if(timer)clearTimeout(timer);try{localStorage.setItem(KEY,'1');}catch(e){}document.body.classList.remove('fin-tour-active');if(root)root.remove();root=null;}
function css(){if(document.getElementById('finTourStyle'))return;var s=document.createElement('style');s.id='finTourStyle';s.textContent=`
#finTour{position:fixed;inset:0;z-index:5000;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif}
#finTour .tour-dim{position:fixed;inset:0;background:rgba(4,5,8,.62);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;animation:tourIn .45s forwards}
#finTour .tour-spot{position:fixed;border:2px solid #E5A75E;border-radius:18px;box-shadow:0 0 0 9999px rgba(4,5,8,.62),0 0 0 5px rgba(229,167,94,.12),0 0 35px rgba(229,167,94,.35);transition:all .55s cubic-bezier(.2,.8,.2,1);pointer-events:none;animation:spotPulse 2s ease-in-out infinite}
#finTour .tour-card{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:520px;margin:auto;padding:18px 18px 15px;background:rgba(22,24,31,.97);border:1px solid rgba(229,167,94,.28);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.55);color:#F2F3F7;pointer-events:auto}
#finTour .tour-brand{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:800;letter-spacing:.14em;color:#E5A75E;text-transform:uppercase;margin-bottom:8px}
#finTour .tour-brand i{width:7px;height:7px;border-radius:50%;background:#E5A75E;box-shadow:0 0 12px #E5A75E}
#finTour h2{font-size:21px;line-height:1.12;margin:0 0 7px;letter-spacing:-.025em}
#finTour p{font-size:13px;line-height:1.5;color:#C8CCD6;margin:0 0 13px}
#finTour .tour-meta{display:flex;align-items:center;gap:10px}
#finTour .tour-progress{height:3px;flex:1;background:#2A2E38;border-radius:10px;overflow:hidden}.tour-progress i{display:block;height:100%;background:linear-gradient(90deg,#F0C384,#E5A75E);transition:width .4s}
#finTour .tour-count{font-size:10px;color:#8F96A7;white-space:nowrap}
#finTour .tour-actions{display:flex;gap:8px;margin-top:10px}
#finTour button{padding:10px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.1);font-weight:700;font-size:12px;background:#20232C;color:#F2F3F7}
#finTour .tour-next{margin-left:auto;background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:0;min-width:92px}
@keyframes tourIn{to{opacity:1}}@keyframes spotPulse{0%,100%{box-shadow:0 0 0 9999px rgba(4,5,8,.62),0 0 0 4px rgba(229,167,94,.12),0 0 28px rgba(229,167,94,.28)}50%{box-shadow:0 0 0 9999px rgba(4,5,8,.62),0 0 0 7px rgba(229,167,94,.18),0 0 42px rgba(229,167,94,.42)}}`;
document.head.appendChild(s);}
function findTarget(sel){var el=null;try{el=document.querySelector(sel);}catch(e){}if(el)return el;return null;}
function make(){css();root=document.createElement('div');root.id='finTour';root.innerHTML='<div class="tour-dim"></div><div class="tour-spot"></div><div class="tour-card"><div class="tour-brand"><i></i>ФИННА · ПРЕЗЕНТАЦИЯ</div><h2></h2><p></p><div class="tour-meta"><div class="tour-progress"><i></i></div><span class="tour-count"></span></div><div class="tour-actions"><button class="tour-skip">Пропустить</button><button class="tour-back">Назад</button><button class="tour-next">Далее</button></div></div>';document.body.appendChild(root);spot=root.querySelector('.tour-spot');caption=root.querySelector('.tour-card');root.querySelector('.tour-skip').onclick=finish;root.querySelector('.tour-back').onclick=function(){show(index-1,false);};root.querySelector('.tour-next').onclick=function(){show(index+1,false);};}
function position(el){if(!el){spot.style.left='7%';spot.style.top='22%';spot.style.width='86%';spot.style.height='28%';return;}try{el.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}var r=el.getBoundingClientRect(),pad=7;spot.style.left=Math.max(4,r.left-pad)+'px';spot.style.top=Math.max(4,r.top-pad)+'px';spot.style.width=Math.min(window.innerWidth-8,r.width+pad*2)+'px';spot.style.height=Math.min(window.innerHeight-8,r.height+pad*2)+'px';}
function show(i,auto){if(i>=slides.length){finish();return;}if(i<0)i=0;index=i;var s=slides[i],el=findTarget(s.target);if(el&&el.closest&&el.closest('#finTour'))el=null;position(el);caption.querySelector('h2').textContent=s.title;caption.querySelector('p').textContent=s.text;caption.querySelector('.tour-count').textContent=(i+1)+' / '+slides.length;caption.querySelector('.tour-progress i').style.width=((i+1)/slides.length*100)+'%';caption.querySelector('.tour-next').textContent=i===slides.length-1?'Начать пользоваться':'Далее';caption.querySelector('.tour-back').style.display=i===0?'none':'inline-block';if(timer)clearTimeout(timer);if(auto!==false)timer=setTimeout(function(){show(index+1,true);},s.time||5000);}
function start(){if(done()&&!location.search.includes('presentation=1'))return;make();document.body.classList.add('fin-tour-active');show(0,true);}
window.FinnIntro={start:start,replay:function(){try{localStorage.removeItem(KEY);}catch(e){}start();}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
