(function(){'use strict';
var CSS='#fab.finn-idle{box-shadow:0 8px 28px rgba(229,167,94,.42),0 0 0 2px rgba(229,167,94,.4);animation:finnIdlePulse 2.8s ease-in-out infinite}#fab.finn-active{animation:finnFabPulse 1s ease-in-out infinite}@keyframes finnIdlePulse{0%,100%{box-shadow:0 8px 28px rgba(229,167,94,.42),0 0 0 2px rgba(229,167,94,.4)}50%{box-shadow:0 8px 32px rgba(229,167,94,.55),0 0 0 4px rgba(229,167,94,.22)}}@keyframes finnFabPulse{0%,100%{box-shadow:0 0 0 3px rgba(229,167,94,.95),0 0 20px rgba(229,167,94,.6)}50%{box-shadow:0 0 0 9px rgba(229,167,94,.12),0 0 32px rgba(229,167,94,.75)}}';
function boot(){
  if(!document.getElementById('finnStyleV9')){var s=document.createElement('style');s.id='finnStyleV9';s.textContent=CSS;document.head.appendChild(s);}
  var fab=document.getElementById('fab');
  if(fab){
    fab.classList.add('finn-idle');
    if(!fab._finnTap){
      fab._finnTap=true;
      var t=null;
      fab.addEventListener('touchstart',function(){t=setTimeout(function(){t=null;if(window.kopeykaAssistant)window.kopeykaAssistant.open({listen:false});},480);},{passive:true});
      fab.addEventListener('touchend',function(){if(t){clearTimeout(t);t=null;}});
      fab.addEventListener('mousedown',function(){t=setTimeout(function(){t=null;if(window.kopeykaAssistant)window.kopeykaAssistant.open({listen:false});},480);});
      fab.addEventListener('mouseup',function(){if(t){clearTimeout(t);t=null;}});
    }
  }
}
window.Finn3D={
  start:function(){},
  finish:function(){},
  activate:function(c){if(window.kopeykaAssistant)window.kopeykaAssistant.open({command:c||null});},
  deactivate:function(){var f=document.getElementById('fab');if(f){f.classList.remove('finn-active');f.classList.add('finn-idle');}},
  pointTo:function(){}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

/* Live Finn avatar: eyes + aura status + tip */
(function(){
  'use strict';
  function setStatus(kind){
    var av=document.getElementById('finnAvatar');
    if(!av)return;
    av.classList.remove('status-green','status-orange','status-red');
    av.classList.add('status-'+kind);
    var color = kind==='green' ? '#4ADE80' : kind==='orange' ? '#FBBF24' : '#F87171';
    var l=document.getElementById('finnEyeL'), r=document.getElementById('finnEyeR');
    if(l) l.setAttribute('fill', color);
    if(r) r.setAttribute('fill', color);
  }
  function updateStatus(){
    var online=false, problems=false;
    try{
      var k=(window.kopeykaAI&&window.kopeykaAI.getKey)?window.kopeykaAI.getKey():(localStorage.getItem('kopeyka_groq_key')||'');
      online=!!k;
      if(navigator.onLine===false) problems=true;
    }catch(e){}
    if(!online) setStatus('red');
    else if(problems) setStatus('orange');
    else setStatus('green');
  }
  function bootAvatar(){
    var av=document.getElementById('finnAvatar');
    if(!av)return;
    av.addEventListener('click',function(e){
      e.stopPropagation();
      av.classList.add('show-tip');
      clearTimeout(av._tipT);
      av._tipT=setTimeout(function(){av.classList.remove('show-tip');},3400);
    });
    updateStatus();
    setInterval(updateStatus,3500);
    window.addEventListener('online',updateStatus);
    window.addEventListener('offline',updateStatus);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAvatar);
  else bootAvatar();
  window.FinnStatus={update:updateStatus,setStatus:setStatus};
})();
