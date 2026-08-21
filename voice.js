(function(){
'use strict';
if(window.__kopeykaVoiceLoader)return;
window.__kopeykaVoiceLoader=true;
function load(src,done){var s=document.createElement('script');s.src=src;s.async=false;s.onload=done;s.onerror=function(){console.error('Копейка: не загрузился '+src);};document.head.appendChild(s);}
load('ai.js?v=7',function(){load('assistant.js?v=1');});
})();
