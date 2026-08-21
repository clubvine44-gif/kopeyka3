(function(){
'use strict';
if(window.__kopeykaVoiceLoaded)return;
window.__kopeykaVoiceLoaded=true;
function load(src,cb){var s=document.createElement('script');s.src=src;s.async=false;s.onload=cb;s.onerror=function(){console.error('Копейка: не загрузился',src);if(cb)cb();};document.head.appendChild(s);}
load('products.js?v=6',function(){load('voice2.js?v=6');});
})();
