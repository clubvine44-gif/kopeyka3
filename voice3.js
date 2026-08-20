(function(){
'use strict';
function load(){
  var old=document.getElementById('btnVoice');
  if(old)old.remove();
  if(window.__kopeykaVoice3Loaded)return;
  window.__kopeykaVoice3Loaded=true;
  var s=document.createElement('script');
  s.src='voice2.js';
  s.async=false;
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
