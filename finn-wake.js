(function(){'use strict';
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
var wakeOn=true,rec=null,busy=false;
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]+/gi,' ').replace(/\s+/g,' ').trim();}
function isWake(s){var x=norm(s);return /(^|\s)(финн|фин|финь|фынн|фенн)(\s|$)/i.test(x);}
function openAndListen(){if(busy)return;busy=true;try{if(rec)rec.abort();}catch(e){};rec=null;var fab=document.getElementById('kopeykaAiFab');if(fab)fab.click();else if(window.kopeykaAssistant&&window.kopeykaAssistant.open)window.kopeykaAssistant.open();setTimeout(function(){var orb=document.getElementById('kaOrb');if(orb&&!orb.classList.contains('listening'))orb.click();busy=false;},500);}
function start(){if(!wakeOn||rec)return;try{rec=new SR();rec.lang='ru-RU';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=3;rec.onresult=function(e){for(var i=e.resultIndex;i<e.results.length;i++){var r=e.results[i];var text=r[0]&&r[0].transcript||'';if(isWake(text)){openAndListen();return;}}};rec.onerror=function(){rec=null;if(wakeOn)setTimeout(start,1200);};rec.onend=function(){rec=null;if(wakeOn&&!busy)setTimeout(start,500);};rec.start();}catch(e){rec=null;setTimeout(start,1500);}}
function init(){var old=window.__finnWakeStop;window.__finnWakeStop=function(){wakeOn=false;try{if(rec)rec.abort();}catch(e){}};start();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
