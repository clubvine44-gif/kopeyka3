(function(){
'use strict';

function isVoiceButton(el){
  if(!el || el.tagName!=='BUTTON') return false;
  var t=((el.id||'')+' '+(el.title||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.textContent||'')).toLowerCase();
  return t.indexOf('voice')!==-1 || t.indexOf('голос')!==-1 || t.indexOf('микроф')!==-1 || t.indexOf('🎙')!==-1 || t.indexOf('🎤')!==-1;
}

function addStyle(){
  if(document.getElementById('voiceDockStyle')) return;
  var s=document.createElement('style');
  s.id='voiceDockStyle';
  s.textContent=''+
    '#voiceDock{position:fixed;right:16px;bottom:calc(82px + var(--safe-b));z-index:60;display:flex;align-items:center;justify-content:center}'+
    '#voiceDock .voice-fab{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--card);color:var(--text);border:1px solid rgba(229,167,94,.55);box-shadow:0 6px 20px rgba(0,0,0,.35);font-size:21px;line-height:1;padding:0}'+
    '#voiceDock .voice-fab:active{transform:scale(.94)}'+
    '#voiceDock .voice-fab.on{color:var(--accent);border-color:var(--accent)}'+
    '#voiceModal .voice-actions{display:flex!important;visibility:visible!important;opacity:1!important;gap:8px!important;margin-top:12px!important;width:100%!important;position:relative!important;z-index:9999!important}'+
    '#voiceModal .voice-actions .voice-btn{display:flex!important;visibility:visible!important;opacity:1!important;flex:1!important;min-height:48px!important;align-items:center!important;justify-content:center!important;padding:12px!important;border-radius:12px!important;background:#1C1F28!important;border:1px solid rgba(255,255,255,.14)!important;color:#F2F3F7!important;font-size:15px!important;font-weight:700!important}'+
    '#voiceModal .voice-actions .voice-btn.primary{background:linear-gradient(135deg,#F0C384,#E5A75E)!important;color:#1A1208!important;border:none!important}';
  document.head.appendChild(s);
}

function installVoiceDock(){
  var all=Array.prototype.slice.call(document.querySelectorAll('button')).filter(isVoiceButton);
  if(!all.length) return;
  var keep=all.find(function(b){return b.id==='btnVoice';}) || all[0];
  all.forEach(function(b){if(b!==keep) b.remove();});
  var fabWrap=document.querySelector('.fab-wrap');
  if(!fabWrap) return;
  var dock=document.getElementById('voiceDock');
  if(!dock){
    dock=document.createElement('div');
    dock.id='voiceDock';
    dock.setAttribute('aria-label','Голосовой ввод');
    fabWrap.parentNode.insertBefore(dock,fabWrap);
  }
  if(keep.parentNode!==dock) dock.appendChild(keep);
  keep.id='btnVoice';
  keep.title='Голосовой ввод';
  keep.setAttribute('aria-label','Голосовой ввод');
  keep.className='voice-fab';
}

function ensureConfirmVisibility(){
  var modal=document.getElementById('voiceModal');
  if(!modal) return;
  var card=modal.querySelector('.voice-card');
  if(!card) return;
  var actions=card.querySelector('.voice-actions');
  if(actions){
    actions.style.setProperty('display','flex','important');
    actions.style.setProperty('visibility','visible','important');
    actions.style.setProperty('opacity','1','important');
    Array.prototype.forEach.call(actions.querySelectorAll('button'),function(b){
      b.style.setProperty('display','flex','important');
      b.style.setProperty('visibility','visible','important');
      b.style.setProperty('opacity','1','important');
      b.style.setProperty('min-height','48px','important');
    });
  }
}

function cleanupAndDock(){
  addStyle();
  installVoiceDock();
  ensureConfirmVisibility();
}

function loadVoice(){
  var old=document.getElementById('btnVoice');
  if(old) old.remove();
  if(window.__kopeykaVoiceLoaded){cleanupAndDock();return;}
  window.__kopeykaVoiceLoaded=true;
  var s=document.createElement('script');
  s.src='voice2.js';
  s.async=false;
  s.onload=function(){
    cleanupAndDock();
    setTimeout(cleanupAndDock,100);
    setTimeout(cleanupAndDock,500);
    setTimeout(cleanupAndDock,1200);
  };
  s.onerror=function(){console.error('Копейка: не удалось загрузить voice2.js');};
  document.head.appendChild(s);
  var observer=new MutationObserver(function(){cleanupAndDock();});
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadVoice); else loadVoice();
})();