(function(){
'use strict';
function loadVoice(){
  var old=document.getElementById('btnVoice');
  if(old)old.remove();
  if(window.__kopeykaVoiceLoaded)return;
  window.__kopeykaVoiceLoaded=true;
  var s=document.createElement('script');
  s.src='voice2.js';
  s.async=false;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadVoice);else loadVoice();
})();
