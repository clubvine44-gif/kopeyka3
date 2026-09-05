(function(){'use strict';
var CSS='#fab{-webkit-touch-callout:none!important;-webkit-user-select:none!important;user-select:none!important;touch-action:manipulation;-webkit-user-drag:none}';
function boot(){
  if(!document.getElementById('finnStyleV9')){
    var s=document.createElement('style');s.id='finnStyleV9';s.textContent=CSS;document.head.appendChild(s);
  }
  var fab=document.getElementById('fab');
  var radial=document.getElementById('radial');
  if(!fab) return;
  fab.classList.add('finn-idle');
  fab.setAttribute('unselectable','on');
  if(!fab._finnTap){
    fab._finnTap=true;
    var holdT=null, longPressed=false, startX=0, startY=0;
    function clearHold(){ if(holdT){ clearTimeout(holdT); holdT=null; } }
    function openRadial(){
      if(!radial) return;
      var o=radial.classList.toggle('show');
      fab.classList.toggle('open', o);
    }
    function startHold(e){
      longPressed=false;
      clearHold();
      try{ var t=e.touches&&e.touches[0]; if(t){ startX=t.clientX; startY=t.clientY; } }catch(x){}
      holdT=setTimeout(function(){
        holdT=null;
        longPressed=true;
        try{ if(window.getSelection) window.getSelection().removeAllRanges(); }catch(x){}
        if(radial){ radial.classList.remove('show'); fab.classList.remove('open'); }
        if(window.kopeykaAssistant) window.kopeykaAssistant.open({listen:false});
      }, 520);
    }
    function endHold(e){
      var wasLong=longPressed;
      clearHold();
      if(wasLong){
        longPressed=false;
        if(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(x){} }
        return;
      }
      if(e && e.type==='touchend'){
        try{
          var t=e.changedTouches&&e.changedTouches[0];
          if(t && (Math.abs(t.clientX-startX)>12 || Math.abs(t.clientY-startY)>12)) return;
        }catch(x){}
        openRadial();
        try{ e.preventDefault(); }catch(x){}
      }
    }
    fab.addEventListener('click', function(e){
      if(longPressed){ e.preventDefault(); e.stopImmediatePropagation(); longPressed=false; return false; }
      openRadial();
    });
    fab.addEventListener('touchstart', startHold, {passive:true});
    fab.addEventListener('touchend', endHold, {passive:false});
    fab.addEventListener('touchcancel', clearHold, {passive:true});
    fab.addEventListener('mousedown', startHold);
    fab.addEventListener('mouseup', endHold);
    fab.addEventListener('mouseleave', clearHold);
    fab.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; });
    fab.addEventListener('selectstart', function(e){ e.preventDefault(); return false; });
  }
}
window.Finn3D={
  start:function(){},
  finish:function(){},
  activate:function(c){ if(window.kopeykaAssistant) window.kopeykaAssistant.open({command:c||null}); },
  deactivate:function(){ var f=document.getElementById('fab'); if(f){ f.classList.remove('finn-active'); f.classList.add('finn-idle'); } },
  pointTo:function(){}
};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

(function(){
  'use strict';
  function setStatus(kind){
    var av=document.getElementById('finnAvatar');
    if(!av) return;
    av.classList.remove('status-green','status-orange','status-red');
    av.classList.add('status-'+kind);
  }
  function updateStatus(){
    var online=false, problems=false;
    try{
      var k=(window.kopeykaAI&&window.kopeykaAI.getKey)?window.kopeykaAI.getKey():'';
      online=!!k;
      if(navigator.onLine===false) problems=true;
    }catch(e){}
    if(!online) setStatus('red');
    else if(problems) setStatus('orange');
    else setStatus('green');
  }
  
  function scheduleBlink(){
    var av=document.getElementById('finnAvatar');
    if(!av) return;
    function doBlink(){
      av.classList.remove('blinking');
      void av.offsetWidth;
      av.classList.add('blinking');
      setTimeout(function(){ av.classList.remove('blinking'); }, 180);
      setTimeout(doBlink, 2200 + Math.random()*3500);
    }
    setTimeout(doBlink, 1200 + Math.random()*1500);
  }

  function bootAvatar(){
    var av=document.getElementById('finnAvatar');
    if(!av) return;
    var slot=document.getElementById('finnFaceSlot');
    if(slot && !slot.firstChild && window.FinnChar){
      slot.innerHTML = window.FinnChar.svgMarkup('finnAvatar','H');
    }
    av.addEventListener('click', function(e){
      e.stopPropagation();
      av.classList.add('show-tip');
      clearTimeout(av._tipT);
      av._tipT=setTimeout(function(){ av.classList.remove('show-tip'); }, 3400);
      try{ if(window.FinnChar) window.FinnChar.flashEmotion(av, 'angry', 850); }catch(x){}
    });
    updateStatus();
    setInterval(updateStatus, 5000);
    scheduleBlink();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootAvatar);
  else bootAvatar();
  window.FinnStatus={ update:updateStatus, setStatus:setStatus };
})();
