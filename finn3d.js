(function(){
'use strict';
var started=false,scene,camera,renderer,avatar,arm,forearm,head,targetEl=null,step=0,steps=[],idleBubble=null;
var css=\
'#finn3d{position:fixed;inset:0;z-index:120;pointer-events:none;display:none}'+
'#finn3d.show{display:block}'+
'#finn3d canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
'.f3shade{position:absolute;inset:0;background:rgba(0,0,0,.32);opacity:0;transition:.25s}'+
'.f3shade.on{opacity:1}'+
'.f3card{position:absolute;left:16px;right:16px;bottom:24px;max-width:520px;margin:auto;background:rgba(22,24,31,.97);border:1px solid rgba(229,167,94,.35);border-radius:18px;padding:14px;color:#f2f3f7;pointer-events:auto;box-shadow:0 18px 55px #0008}'+
'.f3name{font-weight:800;color:#f0c384;font-size:12px;letter-spacing:.04em}'+
'.f3text{font-size:14px;line-height:1.45;margin-top:4px}'+
'.f3actions{display:flex;gap:8px;margin-top:12px}'+
'.f3actions button{flex:1;padding:10px;border-radius:11px;background:#1c1f28;color:#fff;border:1px solid #ffffff18;font-weight:700}'+
'.f3actions .primary{background:linear-gradient(135deg,#f0c384,#e5a75e);color:#1a1208;border:0}'+
'.f3skip{position:absolute;right:10px;top:8px;background:none!important;border:0!important;color:#9aa0b0!important}'+
'.f3hl{position:fixed;z-index:119;border:2px solid #e5a75e;border-radius:14px;box-shadow:0 0 0 5px #e5a75e22,0 0 35px #e5a75e44;pointer-events:none;display:none}'+
'#finnFloat{position:fixed;right:14px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:70;width:64px;height:64px;border-radius:50%;border:2px solid rgba(229,167,94,.55);background:radial-gradient(circle at 30% 25%,#2a3144,#12151c);box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto}'+
'#finnFloat canvas{width:100%!important;height:100%!important;display:block}'+
'#finnFloat .f3dot{position:absolute;right:6px;top:6px;width:10px;height:10px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:f3pulse 1.6s infinite}'+
'@keyframes f3pulse{0%,100%{opacity:1}50%{opacity:.35}}'+
'#finnTip{position:fixed;right:86px;bottom:calc(98px + env(safe-area-inset-bottom,0px));z-index:71;max-width:220px;background:rgba(22,24,31,.96);border:1px solid rgba(229,167,94,.35);color:#f2f3f7;border-radius:14px;padding:10px 12px;font-size:12px;line-height:1.35;box-shadow:0 12px 30px #0007;display:none}'+
'#finnTip.show{display:block}';

function inject(){
  if(document.getElementById('finn3d'))return;
  var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
  var r=document.createElement('div');r.id='finn3d';
  r.innerHTML='<div class="f3shade"></div><div class="f3hl"></div><div class="f3card"><button class="f3skip" type="button">Пропустить</button><div class="f3name">ФИНН</div><div class="f3text"></div><div class="f3actions"><button type="button" class="prev">Назад</button><button type="button" class="primary next">Далее</button></div></div>';
  document.body.appendChild(r);
  r.querySelector('.f3skip').onclick=finish;
  r.querySelector('.next').onclick=next;
  r.querySelector('.prev').onclick=prev;
  if(!document.getElementById('finnFloat')){
    var f=document.createElement('button');f.id='finnFloat';f.type='button';f.title='Финн';
    f.innerHTML='<span class="f3dot"></span>';
    f.onclick=function(){window.Finn3D&&window.Finn3D.replay();};
    document.body.appendChild(f);
    var tip=document.createElement('div');tip.id='finnTip';tip.textContent='Нажми на меня — расскажу про интерфейс';document.body.appendChild(tip);
    setTimeout(function(){tip.classList.add('show');setTimeout(function(){tip.classList.remove('show');},4500);},1200);
  }
}

function load3(cb){
  if(window.THREE)return cb();
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
  s.onload=cb;
  s.onerror=function(){
    // запасной CDN
    var s2=document.createElement('script');
    s2.src='https://unpkg.com/three@0.160.0/build/three.min.js';
    s2.onload=cb;s2.onerror=function(){cb();};
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
}

function m(c){return new THREE.MeshStandardMaterial({color:c,roughness:.72,metalness:.08});}
function q(g,ma){return new THREE.Mesh(g,ma);}

function buildAvatar(){
  var skin=m(0xe8b48d),hair=m(0x3d2a22),suit=m(0x2a3a55),dark=m(0x121722),white=m(0xf4f5f8),gold=m(0xe5a75e),eye=m(0x1a1f2b);
  avatar=new THREE.Group();
  var torso=q(new THREE.BoxGeometry(.9,1.15,.42),suit);torso.position.y=1.6;avatar.add(torso);
  head=q(new THREE.SphereGeometry(.38,24,18),skin);head.position.y=2.62;avatar.add(head);
  var hc=q(new THREE.SphereGeometry(.4,24,18),hair);hc.scale.set(1.05,.78,1.05);hc.position.y=2.76;avatar.add(hc);
  // глаза
  [[-.12,.08],[.12,.08]].forEach(function(p){
    var e=q(new THREE.SphereGeometry(.045,12,10),eye);e.position.set(p[0],2.64+p[1],.32);avatar.add(e);
  });
  var smile=q(new THREE.TorusGeometry(.1,.018,8,16,Math.PI),m(0xc47a62));smile.position.set(0,2.48,.33);smile.rotation.x=Math.PI;avatar.add(smile);
  var collar=q(new THREE.BoxGeometry(.32,.36,.46),white);collar.position.set(0,1.98,.05);avatar.add(collar);
  var hips=q(new THREE.BoxGeometry(.8,.32,.4),dark);hips.position.y=1;avatar.add(hips);
  [-.22,.22].forEach(function(x){var l=q(new THREE.CylinderGeometry(.15,.17,1,14),dark);l.position.set(x,.45,0);avatar.add(l);});
  arm=new THREE.Group();arm.position.set(.52,1.95,0);avatar.add(arm);
  var ua=q(new THREE.CylinderGeometry(.11,.13,.58,14),suit);ua.position.y=-.28;ua.rotation.z=-.1;arm.add(ua);
  forearm=new THREE.Group();forearm.position.y=-.55;arm.add(forearm);
  var fa=q(new THREE.CylinderGeometry(.09,.11,.52,14),skin);fa.position.y=-.25;forearm.add(fa);
  var hand=q(new THREE.SphereGeometry(.12,16,12),skin);hand.position.y=-.52;forearm.add(hand);
  var finger=q(new THREE.BoxGeometry(.06,.26,.06),skin);finger.position.set(0,-.64,.08);forearm.add(finger);
  var badge=q(new THREE.SphereGeometry(.08,14,10),gold);badge.position.set(.18,1.62,.24);avatar.add(badge);
  avatar.scale.set(1,1,1);
  return avatar;
}

function init3(){
  if(!window.THREE){fallback();return;}
  inject();
  var host=document.getElementById('finn3d');
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,100);
  camera.position.set(0,1.35,6.2);camera.lookAt(0,1.45,0);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0,0);
  host.insertBefore(renderer.domElement,host.firstChild);
  scene.add(new THREE.HemisphereLight(0xffffff,0x223344,1.6));
  var d=new THREE.DirectionalLight(0xffe6c4,2.4);d.position.set(-3,5,4);scene.add(d);
  var fill=new THREE.DirectionalLight(0x88aaff,.6);fill.position.set(3,1,-2);scene.add(fill);
  avatar=buildAvatar();
  avatar.position.set(1.35,-1.15,0);
  scene.add(avatar);
  // мини-аватар на кнопке
  initFloatAvatar();
  addEventListener('resize',resize);
  animate();
}

var floatRenderer,floatScene,floatCamera,floatAvatar,floatReady=false;
function initFloatAvatar(){
  var btn=document.getElementById('finnFloat');
  if(!btn||!window.THREE||floatReady)return;
  floatScene=new THREE.Scene();
  floatCamera=new THREE.PerspectiveCamera(28,1,.1,20);
  floatCamera.position.set(0,2.1,4.2);floatCamera.lookAt(0,2.1,0);
  floatRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  floatRenderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  floatRenderer.setSize(64,64,false);
  floatRenderer.setClearColor(0,0);
  btn.appendChild(floatRenderer.domElement);
  floatScene.add(new THREE.HemisphereLight(0xffffff,0x333333,1.8));
  var dl=new THREE.DirectionalLight(0xffe0b0,2);dl.position.set(-2,3,3);floatScene.add(dl);
  floatAvatar=buildAvatar();
  floatAvatar.scale.set(1.05,1.05,1.05);
  floatAvatar.position.set(0,-.15,0);
  floatScene.add(floatAvatar);
  floatReady=true;
}

function resize(){
  if(!renderer)return;
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
function world(x,y){
  var v=new THREE.Vector3(x/innerWidth*2-1,-(y/innerHeight)*2+1,.5).unproject(camera);
  var d=v.sub(camera.position).normalize();
  return camera.position.clone().add(d.multiplyScalar(-camera.position.z/d.z));
}
function point(){
  if(!targetEl||!arm)return;
  var r=targetEl.getBoundingClientRect(),p=world(r.left+r.width/2,r.top+r.height/2);
  var a=Math.atan2(p.y-arm.position.y,p.x-arm.position.x)-Math.PI/2;
  arm.rotation.z=a;forearm.rotation.z=-a*.45;
}
function animate(){
  requestAnimationFrame(animate);
  var t=performance.now()/1000;
  if(renderer&&avatar){
    avatar.position.y=-1.15+Math.sin(t*1.5)*.02;
    head.rotation.y=Math.sin(t*.7)*.05;
    if(targetEl)point();
    else{arm.rotation.z=-.05+Math.sin(t*1.4)*.03;forearm.rotation.z=.05+Math.sin(t*1.1)*.025;}
    renderer.render(scene,camera);
  }
  if(floatReady&&floatRenderer&&floatAvatar){
    floatAvatar.rotation.y=Math.sin(t*.8)*.35;
    floatAvatar.position.y=-.15+Math.sin(t*1.8)*.03;
    floatRenderer.render(floatScene,floatCamera);
  }
}
function target(sel){
  targetEl=sel?document.querySelector(sel):null;
  var h=document.querySelector('.f3hl');
  if(!targetEl){if(h)h.style.display='none';return;}
  var r=targetEl.getBoundingClientRect();
  h.style.display='block';h.style.left=(r.left-5)+'px';h.style.top=(r.top-5)+'px';h.style.width=(r.width+10)+'px';h.style.height=(r.height+10)+'px';
  var sh=document.querySelector('.f3shade');if(sh)sh.classList.add('on');
}
function set(i){
  step=i;var x=steps[i],r=document.getElementById('finn3d');
  r.querySelector('.f3text').textContent=x.text;
  target(x.target||null);
  r.querySelector('.prev').style.visibility=i?'visible':'hidden';
  r.querySelector('.next').textContent=i===steps.length-1?'Готово':'Далее';
}
function start(){
  inject();
  steps=[
    {text:'Привет! Я Финн — твой 3D-помощник по финансам.'},
    {target:'.hero',text:'Здесь баланс, касса и сколько можно тратить сегодня.'},
    {target:'#btnCloud',text:'Облако — синхронизация данных.'},
    {target:'#btnSettings',text:'Настройки: ключ ИИ, ставки, бэкап.'},
    {target:'#fab',text:'Плюс — доходы, расходы, резервы и долги.'},
    {target:'.sec',text:'Ниже разделы: обязательные, резервы, долги, операции.'},
    {text:'Скажи «Финн» или нажми на меня справа внизу — помогу командой.'}
  ];
  document.getElementById('finn3d').classList.add('show');
  set(0);
  load3(function(){if(!renderer)init3();});
  started=true;
}
function next(){if(step<steps.length-1)set(step+1);else finish();}
function prev(){if(step>0)set(step-1);}
function finish(){
  try{localStorage.setItem('finn_onboarding_done','1');localStorage.setItem('finn3d_seen_v2','1');}catch(e){}
  var r=document.getElementById('finn3d');if(r)r.classList.remove('show');
  targetEl=null;var h=document.querySelector('.f3hl');if(h)h.style.display='none';
  var sh=document.querySelector('.f3shade');if(sh)sh.classList.remove('on');
}
function fallback(){
  inject();
  var f=document.getElementById('finnFloat');
  if(f&&!f.querySelector('.f3emoji')){
    var e=document.createElement('div');e.className='f3emoji';e.textContent='🧑‍💼';e.style.cssText='font-size:28px;line-height:1';f.appendChild(e);
  }
}

window.Finn3D={
  start:start,
  finish:finish,
  replay:function(){started=false;start();},
  pointTo:function(sel){target(sel);}
};

function boot(){
  document.title='Финн';
  var h=document.querySelector('.topbar h1');if(h)h.textContent='Финн';
  inject();
  load3(function(){
    if(window.THREE)init3();
    else fallback();
    // показать тур один раз после обновления до 2.x, даже если старый флаг был
    var seen=false;
    try{seen=!!localStorage.getItem('finn3d_seen_v2');}catch(e){}
    if(!seen)setTimeout(start,900);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();
