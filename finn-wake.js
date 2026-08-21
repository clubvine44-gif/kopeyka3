(function(){
'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SR)return;
var wakeOn=true,rec=null,busy=false,restartTimer=null;
function norm(s){
  return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();
}
var WAKE_RE=/(?:^|\s)(?:привет\s+)?(финн?|фенн?|фынн?|fin+n?)(?:\s|$)/i;
function hasWake(s){return WAKE_RE.test(norm(s));}
function stripWake(s){var x=norm(s);x=x.replace(/^(?:привет\s+)?(?:финн?|фенн?|фынн?|fin+n?)\s*/i,'');return x.trim();}
function dialogOpen(){return !!document.getElementById('kopeykaAiDialog');}
function openFinn(cmd){
  if(busy)return;busy=true;stopRec();
  try{
    if(window.kopeykaAssistant&&typeof window.kopeykaAssistant.open==='function')window.kopeykaAssistant.open({command:cmd||null,listen:!cmd});
    else {var fab=document.getElementById('kopeykaAiFab');if(fab)fab.click();}
  }catch(e){}
  setTimeout(function(){busy=false;},800);
}
function stopRec(){if(restartTimer){clearTimeout(restartTimer);restartTimer=null;}if(rec){try{rec.onend=null;rec.onerror=null;rec.onresult=null;rec.abort();}catch(e){}try{rec.stop();}catch(e){}rec=null;}}
function scheduleStart(ms){if(restartTimer)clearTimeout(restartTimer);restartTimer=setTimeout(function(){restartTimer=null;start();},ms||600);}
function start(){
  if(!wakeOn||rec||busy)return;if(dialogOpen()){scheduleStart(1200);return;}
  try{
    rec=new SR();rec.lang='ru-RU';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=3;
    rec.onresult=function(e){for(var i=e.resultIndex;i<e.results.length;i++){var r=e.results[i];var text=(r[0]&&r[0].transcript)||'';if(!hasWake(text))continue;var cmd=stripWake(text);if(r.isFinal){openFinn(cmd||null);return;}if(!cmd){openFinn(null);return;}}};
    rec.onerror=function(){rec=null;if(wakeOn)scheduleStart(1500);};
    rec.onend=function(){rec=null;if(wakeOn&&!busy)scheduleStart(500);};
    rec.start();
  }catch(e){rec=null;scheduleStart(2000);}
}
function init(){
  window.__finnWakeStop=function(){wakeOn=false;stopRec();};window.__finnWakeStart=function(){wakeOn=true;scheduleStart(300);};
  var obs=new MutationObserver(function(){if(!dialogOpen()&&wakeOn&&!rec&&!busy)scheduleStart(400);});obs.observe(document.body,{childList:true,subtree:false});start();
  if(window.Finn3D&&typeof window.Finn3D.start==='function'&&!localStorage.getItem('finn_onboarding_done'))setTimeout(window.Finn3D.start,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
(function(){
  function load(){if(window.Finn3D)return;var s=document.createElement('script');s.src='finn3d.js?v=2026082205';s.async=false;s.onload=function(){if(window.Finn3D&&!localStorage.getItem('finn_onboarding_done'))window.Finn3D.start();};document.head.appendChild(s);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
