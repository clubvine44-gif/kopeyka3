(function(){
'use strict';

var started=false, scene, camera, renderer, avatar, mixerClock, raf=0, threeReady=false;
var rightArm, rightForearm, leftArm, head, targetEl=null, stepIndex=0, steps=[];

var CSS=''+
'#finn3d{position:fixed;inset:0;z-index:120;pointer-events:none;display:none}'+
'#finn3d.show{display:block}'+
'#finn3d canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
'.finn3d-shade{position:absolute;inset:0;background:rgba(0,0,0,.32);opacity:0;transition:.28s;pointer-events:none}'+
'.finn3d-shade.on{opacity:1}'+
'.finn3d-card{position:absolute;left:16px;right:16px;bottom:calc(24px + env(safe-area-inset-bottom));max-width:520px;margin:auto;background:rgba(22,24,31,.96);border:1px solid rgba(229,167,94,.3);border-radius:18px;padding:14px 15px;box-shadow:0 18px 55px rgba(0,0,0,.45);pointer-events:auto;backdrop-filter:blur(12px)}'+
'.finn3d-name{font-weight:800;color:#F0C384;font-size:12px;margin-bottom:4px;letter-spacing:.04em}'+
'.finn3d-text{font-size:14px;line-height:1.45;color:#F2F3F7}'+
'.finn3d-actions{display:flex;gap:8px;margin-top:12px}'+
'.finn3d-actions button{flex:1;padding:10px 12px;border-radius:11px;background:#1C1F28;border:1px solid rgba(255,255,255,.09);color:#F2F3F7;font-weight:700}'+
'.finn3d-actions button.primary{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:0}'+
'.finn3d-skip{position:absolute;right:10px;top:8px;border:0!important;background:transparent!important;color:#9AA0B0!important;flex:0 0 auto!important;padding:4px!important;font-size:11px}'+
'.finn3d-highlight{position:fixed;z-index:119;border:2px solid #E5A75E;border-radius:14px;box-shadow:0 0 0 5px rgba(229,167,94,.13),0 0 35px rgba(229,167,94,.28);pointer-events:none;transition:all .35s ease;display:none}';

function inject(){
  if(document.getElementById('finn3d'))return;
  var st=document.createElement('style');st.id='finn3d-style';st.textContent=CSS;document.head.appendChild(st);
  var root=document.createElement('div');root.id='finn3d';root.innerHTML='<div class="finn3d-shade"></div><div class="finn3d-highlight"></div><div class="finn3d-card"><button class="finn3d-skip">Пропустить</button><div class="finn3d-name">ФИНН</div><div class="finn3d-text"></div><div class="finn3d-actions"><button class="prev">Назад</button><button class="primary next">Далее</button></div></div>';
  document.body.appendChild(root);
  root.querySelector('.skip').onclick=function(){};
  root.querySelector('.finn3d-skip').onclick=finish;
  root.querySelector('.next').onclick=next;
  root.querySelector('.prev').onclick=prev;
}

function loadScript(src,cb){
  if(window.THREE){cb();return;}
  var s=document.createElement('script');s.src=src;s.onload=cb;s.onerror=function(){fallback();};document.head.appendChild(s);
}

function mat(color,rough){return new THREE.MeshStandardMaterial({color:color,roughness:rough||.72,metalness:.03});}
function cyl(r1,r2,h,m,seg){return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||16),m);}
function sphere(r,m){return new THREE.Mesh(new THREE.SphereGeometry(r,20,16),m);}
function box(x,y,z,m){return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),m);}

function buildAvatar(){
  avatar=new THREE.Group();
  var skin=mat(0xE7B38C,.85), hair=mat(0x4A3026,.9), suit=mat(0x243047,.82), shirt=mat(0xF2F3F7,.72), gold=mat(0xE5A75E,.55), dark=mat(0x111722,.9);
  var torso=box(.78,1.05,.38,suit);torso.position.y=1.55;avatar.add(torso);
  var collar=box(.28,.34,.42,shirt);collar.position.set(0,1.92,.04);avatar.add(collar);
  var neck=cyl(.12,.12,.18,skin,16);neck.position.y=2.18;avatar.add(neck);
  head=sphere(.34,skin);head.position.y=2.55;avatar.add(head);
  var hairCap=sphere(.36,hair);hairCap.scale.set(1.02,.8,1.02);hairCap.position.set(0,2.66,-.02);avatar.add(hairCap);
  var eyeL=sphere(.028,dark);eyeL.position.set(-.115,2.57,.315);avatar.add(eyeL);
  var eyeR=sphere(.028,dark);eyeR.position.set(.115,2.57,.315);avatar.add(eyeR);
  var smile=box(.12,.025,.02,gold);smile.position.set(0,2.45,.32);avatar.add(smile);
  var hips=box(.72,.3,.36,dark);hips.position.y=1.0;avatar.add(hips);
  var legL=cyl(.14,.16,.95,dark);legL.position.set(-.2,.48,0);avatar.add(legL);
  var legR=cyl(.14,.16,.95,dark);legR.position.set(.2,.48,0);avatar.add(legR);
  var shoeL=box(.25,.11,.48,dark);shoeL.position.set(-.2,-.02,.08);avatar.add(shoeL);
  var shoeR=box(.25,.11,.48,dark);shoeR.position.set(.2,-.02,.08);avatar.add(shoeR);

  rightArm=new THREE.Group();rightArm.position.set(.47,1.88,0);avatar.add(rightArm);
  var ua=cyl(.105,.12,.55,suit);ua.rotation.z=-.08;ua.position.y=-.25;rightArm.add(ua);
  rightForearm=new THREE.Group();rightForearm.position.set(0,-.52,0);rightArm.add(rightForearm);
  var fa=cyl(.085,.1,.5,skin);fa.position.y=-.24;rightForearm.add(fa);
  var hand=sphere(.105,skin);hand.position.y=-.51;rightForearm.add(hand);
  var finger=box(.055,.24,.055,skin);finger.position.set(0,-.62,.07);rightForearm.add(finger);

  leftArm=new THREE.Group();leftArm.position.set(-.47,1.88,0);avatar.add(leftArm);
  var lua=cyl(.105,.12,.55,suit);lua.position.y=-.25;leftArm.add(lua);
  var lfa=cyl(.085,.1,.5,skin);lfa.position.y=-.76;leftArm.add(lfa);
  var lhand=sphere(.105,skin);lhand.position.y=-1.03;leftArm.add(lhand);

  var badge=sphere(.075,gold);badge.position.set(.15,1.55,.21);avatar.add(badge);
  avatar.scale.set(.92,.92,.92);avatar.position.set(1.55,-1.05,0);
  scene.add(avatar);
}

function initThree(){
  if(threeReady)return;
  threeReady=true;
  inject();
  var root=document.getElementById('finn3d');
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,100);camera.position.set(0,1.15,7.2);camera.lookAt(0,1.25,0);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0,0);root.insertBefore(renderer.domElement,root.firstChild);
  scene.add(new THREE.HemisphereLight(0xffffff,0x202020,2.2));
  var key=new THREE.DirectionalLight(0xffe1b8,2.4);key.position.set(-3,5,4);scene.add(key);
  var fill=new THREE.DirectionalLight(0x9db8ff,1.1);fill.position.set(4,2,3);scene.add(fill);
  buildAvatar();
  mixerClock=new THREE.Clock();
  addEventListener('resize',resize);
  animate();
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function animate(){
  raf=requestAnimationFrame(animate);
  if(!avatar)return;
  var t=performance.now()/1000;
  avatar.position.y=-1.05+Math.sin(t*1.6)*.018;
  head.rotation.y=Math.sin(t*.65)*.035;
  head.rotation.z=Math.sin(t*.9)*.012;
  if(!targetEl){rightArm.rotation.z=-.04+Math.sin(t*1.5)*.025;rightForearm.rotation.z=.04+Math.sin(t*1.2)*.02;}
  else pointAt(targetEl);
  renderer.render(scene,camera);
}
function screenToWorld(x,y){
  var nx=(x/innerWidth)*2-1,ny=-(y/innerHeight)*2+1;
  var v=new THREE.Vector3(nx,ny,.5).unproject(camera);var dir=v.sub(camera.position).normalize();
  var dist=(0-camera.position.z)/dir.z;return camera.position.clone().add(dir.multiplyScalar(dist));
}
function pointAt(el){
  if(!el||!rightArm)return;
  var r=el.getBoundingClientRect();var p=screenToWorld(r.left+r.width*.5,r.top+r.height*.5);
  var dx=p.x-rightArm.position.x,dy=p.y-rightArm.position.y;
  var a=Math.atan2(dy,dx)-Math.PI/2;
  rightArm.rotation.z=a;
  rightForearm.rotation.z=-a*.45;
}

function findTarget(sel){if(!sel)return null;return document.querySelector(sel);}
function highlight(el){var h=document.querySelector('.finn3d-highlight');if(!el){h.style.display='none';return;}var r=el.getBoundingClientRect();h.style.display='block';h.style.left=(r.left-5)+'px';h.style.top=(r.top-5)+'px';h.style.width=(r.width+10)+'px';h.style.height=(r.height+10)+'px';}
function setStep(i){
  stepIndex=i;var s=steps[i];var root=document.getElementById('finn3d');if(!root||!s)return;
  root.querySelector('.finn3d-text').textContent=s.text;
  targetEl=findTarget(s.target);highlight(targetEl);
  document.querySelector('.finn3d-shade').classList.toggle('on',!!targetEl);
  root.querySelector('.prev').style.visibility=i?'visible':'hidden';
  root.querySelector('.next').textContent=i===steps.length-1?'Готово':'Далее';
}
function start(){
  if(started)return;started=true;
  inject();
  steps=[
    {target:null,text:'Привет. Я Финн — твой цифровой помощник. Сейчас быстро покажу, где здесь что находится.'},
    {target:'.hero',text:'Здесь находится главное финансовое состояние: текущий баланс и ключевые показатели.'},
    {target:'#btnCloud',text:'Здесь облако. Через него синхронизируются твои данные между устройствами.'},
    {target:'#btnSettings',text:'Здесь настройки приложения и параметры Финна.'},
    {target:'#fab',text:'Эта кнопка открывает быстрые действия: доход, расход, резерв, долг и обязательные платежи.'},
    {target:'.sec',text:'А здесь находятся подробные финансовые разделы. Я могу не только показать их, но и изменить данные по твоей команде.'},
    {target:null,text:'Готово. Теперь просто скажи «Финн», и я начну слушать твою команду.'}
  ];
  document.getElementById('finn3d').classList.add('show');
  setStep(0);
  if(window.THREE)initThree();else loadScript('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.min.js',initThree);
}
function next(){if(stepIndex<steps.length-1)setStep(stepIndex+1);else finish();}
function prev(){if(stepIndex>0)setStep(stepIndex-1);}
function finish(){
  localStorage.setItem('finn_onboarding_done','1');
  var r=document.getElementById('finn3d');if(r)r.classList.remove('show');
  targetEl=null;highlight(null);document.querySelector('.finn3d-shade').classList.remove('on');
}
function fallback(){
  inject();var root=document.getElementById('finn3d');root.classList.add('show');
  var canvas=root.querySelector('canvas');if(canvas)canvas.remove();
  var card=root.querySelector('.finn3d-card');card.style.bottom='24px';
  var bubble=document.createElement('div');bubble.style.cssText='position:absolute;right:22px;bottom:210px;width:150px;height:280px;border-radius:80px 80px 45px 45px;background:linear-gradient(145deg,#243047,#151923);box-shadow:0 18px 45px rgba(0,0,0,.5);border:1px solid rgba(229,167,94,.35);';bubble.innerHTML='<div style="position:absolute;width:86px;height:86px;border-radius:50%;background:#E7B38C;left:32px;top:25px;box-shadow:inset 0 -8px 0 rgba(0,0,0,.04)"><i style="position:absolute;width:95px;height:45px;border-radius:55px 55px 20px 20px;background:#4A3026;left:-4px;top:-8px"></i></div><div style="position:absolute;width:70px;height:8px;border-radius:8px;background:#E5A75E;left:40px;top:150px;transform:rotate(-18deg);transform-origin:left center;animation:finnFallbackPoint 1.5s ease-in-out infinite alternate"></div>';root.appendChild(bubble);
  var s=document.createElement('style');s.textContent='@keyframes finnFallbackPoint{from{transform:rotate(-18deg)}to{transform:rotate(-2deg)}}';document.head.appendChild(s);
}
window.Finn3D={start:start,finish:finish,replay:start,pointTo:function(sel){targetEl=findTarget(sel);highlight(targetEl);}};
function boot(){
  document.title='Финн';var h=document.querySelector('.topbar h1');if(h)h.textContent='Финн';
  if(!localStorage.getItem('finn_onboarding_done'))setTimeout(start,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
