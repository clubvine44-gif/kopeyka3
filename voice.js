(function(){
'use strict';
if(window.__kopeykaVoiceLoader)return;
window.__kopeykaVoiceLoader=true;
function purge(){var b=document.getElementById('kopeykaAiFab');if(b)b.remove();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',purge);else purge();
setTimeout(purge,400);setTimeout(purge,1500);
})();
