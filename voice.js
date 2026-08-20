(function(){
'use strict';

function isVoiceButton(el){
  if(!el || el.tagName!=='BUTTON') return false;
  var t=((el.id||'')+' '+(el.title||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.textContent||'')).toLowerCase();
  return t.indexOf('voice')!==-1 || t.indexOf('голос')!==-1 || t.indexOf('микроф')!==-1 || t.indexOf('🎙')!==-1 || t.indexOf('🎤')!==-1;
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

function addStyle(){
  if(document.getElementById('voiceDockStyle')) return;
  var s=document.createElement('style');
  s.id='voiceDockStyle';
  s.textContent=''+
    '#voiceDock{position:fixed;right:16px;bottom:calc(82px + var(--safe-b));z-index:60;display:flex;align-items:center;justify-content:center}'+
    '#voiceDock .voice-fab{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--card);color:var(--text);border:1px solid rgba(229,167,94,.55);box-shadow:0 6px 20px rgba(0,0,0,.35);font-size:21px;line-height:1;padding:0}'+
    '#voiceDock .voice-fab:active{transform:scale(.94)}'+
    '#voiceDock .voice-fab.on{color:var(--accent);border-color:var(--accent)}';
  document.head.appendChild(s);
}

function cleanupAndDock(){
  addStyle();
  installVoiceDock();
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
  };
  document.head.appendChild(s);

  var observer=new MutationObserver(function(){cleanupAndDock();});
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadVoice); else loadVoice();
})();
