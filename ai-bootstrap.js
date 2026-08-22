(function(){'use strict';
function loadScript(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=function(){reject(new Error('Не удалось загрузить '+src));};document.head.appendChild(s);});}
function load(){
  if(window.kopeykaAI)return Promise.resolve();
  return loadScript('ai-config.js?boot='+Date.now()).catch(function(){return null;}).then(function(){
    return loadScript('ai.js?boot='+Date.now());
  }).then(function(){
    if(window.kopeykaAI)return;
    throw new Error('ai.js загрузился, но window.kopeykaAI не создан');
  });
}
window.kopeykaEnsureAI=load;
load().catch(function(e){window.__kopeykaAIError=e&&e.message||String(e);});
})();
