(function(){
'use strict';
/* FAB ассистента убран: Финн вызывается только голосом («Привет, Финн» / «Фин»). */
if(window.__kopeykaVoiceLoader)return;
window.__kopeykaVoiceLoader=true;
/* на всякий случай убрать старую кнопку, если осталась в DOM */
function purge(){
  var b=document.getElementById('kopeykaAiFab');
  if(b)b.remove();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',purge);
else purge();
setTimeout(purge,500);
setTimeout(purge,2000);
})();
