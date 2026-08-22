(function(){
'use strict';

/* Finn 3D v3: self-contained visual assistant. No Three.js/CDN dependency. */
var root,avatar,float,card,spot,shade,targetEl=null,step=0,steps=[];
var css=''+
'#finn3d{position:fixed;inset:0;z-index:210;display:none;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif}'+
'#finn3d.show{display:block}'+
'#finnShade{position:absolute;inset:0;background:rgba(5,7,11,.52);opacity:0;transition:opacity .22s;pointer-events:none}'+
'#finnShade.on{opacity:1}'+
'#finnSpot{position:fixed;z-index:212;display:none;border-radius:16px;box-shadow:0 0 0 9999px rgba(5,7,11,.52),0 0 0 3px rgba(240,195,132,.9),0 0 34px rgba(229,167,94,.58);pointer-events:none;transition:left .28s,top .28s,width .28s,height .28s}'+
'#finnAvatar{position:fixed;z-index:214;right:18px;top:50%;width:150px;height:300px;transform:translateY(-50%);pointer-events:none;filter:drop-shadow(0 18px 25px rgba(0,0,0,.38));perspective:900px}'+
'#finnAvatar .body3d{position:absolute;left:35px;top:88px;width:82px;height:155px;transform-style:preserve-3d;animation:finnFloat 2.8s ease-in-out infinite}'+
'#finnAvatar .torso{position:absolute;left:10px;top:40px;width:62px;height:94px;border-radius:22px 22px 15px 15px;background:linear-gradient(105deg,#243550 0%,#344b70 42%,#172237 100%);transform:rotateY(-12deg);box-shadow:inset 8px 0 10px #ffffff18,inset -10px 0 14px #0005}'+
'#finnAvatar .shirt{position:absolute;left:25px;top:42px;width:30px;height:48px;background:linear-gradient(135deg,#f7f7fa,#c9ced8);clip-path:polygon(0 0,100% 0,78% 100%,22% 100%);transform:translateZ(8px)}'+
'#finnAvatar .head{position:absolute;left:20px;top:0;width:68px;height:78px;border-radius:45% 45% 48% 48%;background:radial-gradient(circle at 35% 30%,#ffd8b8,#e8ae87 60%,#b97558 100%);transform:translateZ(22px);box-shadow:inset -8px -5px 12px #8e543d55}'+
'#finnAvatar .hair{position:absolute;left:15px;top:-8px;width:78px;height:67px;border-radius:48% 52% 38% 42%;background:linear-gradient(120deg,#211a19,#5b3c31 52%,#241a19);transform:translateZ(27px);box-shadow:inset 7px 4px 9px #ffffff15}'+
'#finnAvatar .hair:after{content:"";position:absolute;right:-5px;top:38px;width:22px;height:60px;border-radius:0 18px 20px 0;background:linear-gradient(100deg,#493027,#1d1717);transform:rotate(10deg)}'+
'#finnAvatar .eye{position:absolute;top:34px;width:8px;height:5px;border-radius:50%;background:#1a1d27;transform:translateZ(34px)}'+
'#finnAvatar .eye.l{left:37px}.eye.r{left:63px}'+
'#finnAvatar .mouth{position:absolute;left:48px;top:53px;width:18px;height:8px;border-bottom:2px solid #9b554e;border-radius:50%;transform:translateZ(34px)}'+
'#finnAvatar .neck{position:absolute;left:46px;top:68px;width:18px;height:20px;border-radius:5px;background:#d89570;transform:translateZ(18px)}'+
'#finnAvatar .leg{position:absolute;top:132px;width:25px;height:76px;border-radius:9px;background:linear-gradient(90deg,#111927,#26344d);transform-origin:top center}'+
'#finnAvatar .leg.l{left:16px;transform:rotate(-2deg)}.leg.r{left:47px;transform:rotate(2deg)}'+
'#finnAvatar .shoe{position:absolute;top:199px;width:35px;height:16px;border-radius:12px 16px 8px 8px;background:#11151d;box-shadow:inset 0 3px 5px #ffffff18}'+
'#finnAvatar .shoe.l{left:7px}.shoe.r{left:43px}'+
'#finnAvatar .arm{position:absolute;top:49px;width:18px;height:92px;border-radius:12px;background:linear-gradient(90deg,#1b293f,#3a5278,#172238);transform-origin:9px 8px;z-index:2}'+
'#finnAvatar .arm.left{left:-2px;transform:rotate(12deg)}'+
'#finnAvatar .arm.right{left:68px;transform:rotate(18deg);transition:transform .28s ease}'+
'#finnAvatar .forearm{position:absolute;left:3px;top:73px;width:13px;height:74px;border-radius:10px;background:linear-gradient(90deg,#d58f6b,#f1bd96,#c57b5d);transform-origin:6px 5px;transform:rotate(-10deg);transition:transform .28s ease}'+
'#finnAvatar .hand{position:absolute;left:-4px;top:138px;width:22px;height:25px;border-radius:45% 45% 50% 50%;background:linear-gradient(135deg,#ffd2ae,#d88e69);transform:rotate(-4deg);box-shadow:inset -3px -3px 5px #8c4e3b33}'+
'#finnAvatar .finger{position:absolute;left:15px;top:142px;width:10px;height:29px;border-radius:7px;background:#e9aa84;transform:rotate(-3deg);transform-origin:5px 2px}'+
'#finnAvatar .badge{position:absolute;left:65px;top:69px;width:12px;height:12px;border-radius:50%;background:#e5a75e;box-shadow:0 0 10px #e5a75e99;transform:translateZ(25px)}'+
'#finnAvatar .hello{position:absolute;left:38px;top:235px;color:#f0c384;font-weight:800;font-size:11px;letter-spacing:.08em;text-shadow:0 2px 8px #000;opacity:.9}'+
'@keyframes finnFloat{0%,100%{transform:translateY(0) rotateY(-4deg)}50%{transform:translateY(-7px) rotateY(4deg)}}'+
'#finnCard{position:fixed;z-index:215;left:14px;right:182px;bottom:18px;max-width:430px;background:rgba(20,23,31,.97);border:1px solid rgba(229,167,94,.35);border-radius:18px;padding:15px 16px;color:#f2f3f7;pointer-events:auto;box-shadow:0 20px 55px #0009;backdrop-filter:blur(14px)}'+
'#finnCard .name{font-size:11px;font-weight:900;letter-spacing:.1em;color:#f0c384}'+
'#finnCard .text{font-size:14px;line-height:1.42;margin-top:5px}'+
'#finnCard .actions{display:flex;gap:8px;margin-top:12px}'+
'#finnCard button{flex:1;padding:10px;border-radius:11px;background:#1c2029;color:#fff;border:1px solid #ffffff14;font-weight:700}'+
'#finnCard .primary{background:linear-gradient(135deg,#f0c384,#e5a75e);color:#1a1208;border:0}'+
'#finnCard .skip{position:absolute;right:8px;top:6px;width:auto;padding:4px 7px;background:transparent;border:0;color:#8f96a5}'+
'#finnFloat{position:fixed;right:14px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:205;width:82px;height:82px;border-radius:24px;border:1px solid rgba(229,167,94,.5);background:linear-gradient(145deg,#252c3c,#10131a);box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 0 1px #ffffff0b;display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto;padding:0}'+
'#finnFloat .mini3d{position:relative;width:60px;height:70px;transform:scale(.56);transform-origin:center;pointer-events:none}'+
'#finnFloat .mini3d .body3d{position:absolute;left:0;top:0;width:82px;height:155px;transform-style:preserve-3d}'+
'#finnFloat .online{position:absolute;right:7px;top:7px;width:9px;height:9px;border-radius:50%;background:#4ade80;box-shadow:0 0 9px #4ade80;animation:finnPulse 1.6s infinite}'+
'@keyframes finnPulse{0%,100%{opacity:1}50%{opacity:.3}}'+
'@media(max-width:430px){#finnAvatar{right:4px;width:126px;transform:translateY(-55%) scale(.9)}#finnCard{left:10px;right:126px;bottom:12px}}';

function style(){if(document.getElementById('finn3dStyle'))return;var s=document.createElement('style');s.id='finn3dStyle';s.textContent=css;document.head.appendChild(s);}
function avatarMarkup(){return '<div class="body3d"><div class="hair"></div><div class="head"></div><div class="eye l"></div><div class="eye r"></div><div class="mouth"></div><div class="neck"></div><div class="torso"></div><div class="shirt"></div><div class="arm left"></div><div class="arm right"><div class="forearm"><div class="hand"></div><div class="finger"></div></div></div><div class="leg l"></div><div class="leg r"></div><div class="shoe l"></div><div class="shoe r"></div><div class="badge"></div></div><div class="hello">ФИНН</div>';}
function miniMarkup(){return '<div class="mini3d">'+avatarMarkup().replace('<div class="hello">ФИНН</div>','')+'</div><span class="online"></span>';}
function inject(){
  style();
  if(document.getElementById('finn3d')){root=document.getElementById('finn3d');return;}
  root=document.createElement('div');root.id='finn3d';
  root.innerHTML='<div id="finnShade"></div><div id="finnSpot"></div><div id="finnAvatar">'+avatarMarkup()+'</div><div id="finnCard"><button class="skip">Пропустить</button><div class="name">ФИНН · 3D-АССИСТЕНТ</div><div class="text"></div><div class="actions"><button class="prev">Назад</button><button class="primary next">Далее</button></div></div>';
  document.body.appendChild(root);
  card=root.querySelector('#finnCard');spot=root.querySelector('#finnSpot');shade=root.querySelector('#finnShade');avatar=root.querySelector('#finnAvatar');
  card.querySelector('.skip').onclick=finish;card.querySelector('.next').onclick=next;card.querySelector('.prev').onclick=prev;
  if(!document.getElementById('finnFloat')){float=document.createElement('button');float.id='finnFloat';float.type='button';float.title='Финн — показать помощника';float.innerHTML=miniMarkup();float.onclick=function(){window.Finn3D&&window.Finn3D.replay();};document.body.appendChild(float);}else float=document.getElementById('finnFloat');
}
function ensureVisible(){inject();if(float)float.style.display='flex';}
function scrollTo(el){if(!el)return Promise.resolve();var r=el.getBoundingClientRect(),vh=innerHeight;if(r.top<100||r.bottom>vh-165){var y=window.scrollY+(r.top+r.bottom)/2-vh*.36;window.scrollTo({top:Math.max(0,y),behavior:'smooth'});return new Promise(function(resolve){setTimeout(resolve,460);});}return Promise.resolve();}
function showTarget(sel){targetEl=sel?document.querySelector(sel):null;if(!targetEl){spot.style.display='none';shade.classList.remove('on');resetArm();return Promise.resolve();}return scrollTo(targetEl).then(function(){var r=targetEl.getBoundingClientRect();spot.style.display='block';spot.style.left=(r.left-8)+'px';spot.style.top=(r.top-8)+'px';spot.style.width=(r.width+16)+'px';spot.style.height=(r.height+16)+'px';shade.classList.add('on');pointArm();});}
function pointArm(){if(!targetEl||!avatar)return;var tr=targetEl.getBoundingClientRect(),ar=avatar.getBoundingClientRect();var tx=tr.left+tr.width/2,ty=tr.top+tr.height/2,ax=ar.left+ar.width*.58,ay=ar.top+ar.height*.45;var deg=Math.max(-55,Math.min(55,Math.atan2(ty-ay,tx-ax)*180/Math.PI));var armEl=avatar.querySelector('.arm.right'),fore=avatar.querySelector('.forearm');if(armEl)armEl.style.transform='rotate('+(-12+deg*.42)+'deg)';if(fore)fore.style.transform='rotate('+(-12+deg*.7)+'deg)';}
function resetArm(){if(!avatar)return;var a=avatar.querySelector('.arm.right'),f=avatar.querySelector('.forearm');if(a)a.style.transform='rotate(18deg)';if(f)f.style.transform='rotate(-10deg)';}
function set(i){step=i;var x=steps[i];card.querySelector('.text').textContent=x.text;card.querySelector('.prev').style.visibility=i?'visible':'hidden';card.querySelector('.next').textContent=i===steps.length-1?'Готово':'Далее';showTarget(x.target||null);}
function start(){
  ensureVisible();
  steps=[
    {text:'Привет! Я Финн. Я показываю руками, куда смотреть, а экран сам прокручивается к нужному разделу.'},
    {target:'.hero',text:'Это главный экран: баланс, доступная сумма и основные финансовые показатели.'},
    {target:'#btnCloud',text:'Здесь облако и синхронизация данных.'},
    {target:'#btnSettings',text:'Здесь настройки приложения, ИИ и резервного копирования.'},
    {target:'#fab',text:'Эта кнопка добавляет доход, расход, резерв, долг или обязательный платёж.'},
    {target:'.sec',text:'Ниже находятся разделы с долгами, резервами, обязательными платежами и операциями. Я сама прокручиваю страницу к ним.'},
    {text:'Готово. Я остаюсь здесь как твой визуальный помощник. Нажми на меня справа внизу, чтобы повторить обучение.'}
  ];
  root.classList.add('show');set(0);
}
function next(){if(step<steps.length-1)set(step+1);else finish();}
function prev(){if(step>0)set(step-1);}
function finish(){if(root)root.classList.remove('show');targetEl=null;if(spot)spot.style.display='none';if(shade)shade.classList.remove('on');resetArm();try{localStorage.setItem('finn_onboarding_done','1');localStorage.setItem('finn3d_seen_v3','1');}catch(e){}}
function replay(){try{localStorage.removeItem('finn_onboarding_done');localStorage.removeItem('finn3d_seen_v3');}catch(e){}start();}
function boot(){document.title='Финн';var h=document.querySelector('.topbar h1');if(h)h.textContent='Финн';ensureVisible();var seen=false;try{seen=localStorage.getItem('finn3d_seen_v3')==='1';}catch(e){}if(!seen)setTimeout(start,700);}
window.Finn3D={start:start,finish:finish,replay:replay,pointTo:function(sel){ensureVisible();showTarget(sel);root.classList.add('show');}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
