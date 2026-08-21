(function(){
'use strict';
if(window.__kopeykaVoiceLoader)return;window.__kopeykaVoiceLoader=true;
function load(src,done){var s=document.createElement('script');s.src=src;s.async=false;s.onload=function(){if(done)done();};s.onerror=function(){console.error('Копейка: не загрузился '+src);if(done)done();};document.head.appendChild(s);}
function addButton(){if(document.getElementById('kopeykaAiFab'))return;var st=document.createElement('style');st.textContent='#kopeykaAiFab{position:fixed;right:20px;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:90;width:46px;height:46px;border-radius:50%;border:1px solid rgba(229,167,94,.45);background:#16181F;color:#F0C384;box-shadow:0 6px 20px rgba(0,0,0,.35);font-size:21px;display:flex;align-items:center;justify-content:center}#kopeykaAiFab:active{transform:scale(.94)}';document.head.appendChild(st);var b=document.createElement('button');b.id='kopeykaAiFab';b.type='button';b.title='Копейка AI';b.textContent='◉';b.onclick=function(){if(window.kopeykaAssistant&&window.kopeykaAssistant.open)window.kopeykaAssistant.open();else alert('ИИ ещё загружается.');};document.body.appendChild(b);}
load('engine.js?v=1',function(){load('ai.js?v=13',function(){load('assistant.js?v=8',function(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton);else addButton();});});});
})();
