(function(){
'use strict';
if(window.__kopeykaVoiceLoaded)return;
window.__kopeykaVoiceLoaded=true;
var s=document.createElement('script');
s.src='voice2.js?v=4';
s.async=false;
s.onerror=function(){console.error('Копейка: не удалось загрузить voice2.js');};
document.head.appendChild(s);
})();
