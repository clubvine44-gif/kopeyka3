(function(){'use strict';
function load(){
  if(window.kopeykaAI)return Promise.resolve();
  return new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src='ai.js?boot='+Date.now();
    s.onload=function(){
      if(window.kopeykaAI)resolve();
      else reject(new Error('ai.js загрузился, но window.kopeykaAI не создан'));
    };
    s.onerror=function(){reject(new Error('Не удалось загрузить ai.js'))};
    document.head.appendChild(s);
  });
}
window.kopeykaEnsureAI=load;
load().catch(function(e){window.__kopeykaAIError=e&&e.message||String(e);});
})();
