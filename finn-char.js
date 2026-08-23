(function(){'use strict';
/*
 * FinnChar — единый переиспользуемый персонаж "Финна" (монетка-ИИ) с эмоциями.
 * Используется в трёх местах:
 *   1) Шапка приложения (#finnAvatar) — анимированный, моргает, злится по тапу.
 *   2) Шапка чата с Финной (#kaFinnAvatar) — анимированный, реагирует эмоциями на ход диалога.
 *   3) Карточка "Финна · совет" на главном экране — статичная версия (без анимаций).
 */

function svgMarkup(idPrefix, uid){
  idPrefix = idPrefix || '';
  uid = uid || String(Math.random()).slice(2,8);
  function eid(name){ return idPrefix ? (' id="'+idPrefix+name+'"') : ''; }
  return ''+
  '<svg class="finn-face" viewBox="0 0 64 64" fill="none">'+
    '<defs>'+
      '<linearGradient id="finnCoin'+uid+'" x1="10" y1="8" x2="54" y2="56">'+
        '<stop stop-color="#F8E0A8"/><stop offset=".45" stop-color="#E5A75E"/><stop offset="1" stop-color="#B86B2E"/>'+
      '</linearGradient>'+
      '<filter id="finnSoft'+uid+'" x="-30%" y="-30%" width="160%" height="160%">'+
        '<feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>'+
    '</defs>'+
    '<circle cx="32" cy="32" r="30" fill="#121018" stroke="#E5A75E" stroke-width="1.8" opacity=".95"/>'+
    '<circle cx="32" cy="32" r="25" fill="url(#finnCoin'+uid+')" filter="url(#finnSoft'+uid+')"/>'+
    '<circle cx="32" cy="32" r="20.5" fill="#1A1208"/>'+
    '<path class="finn-brow finn-brow-l"'+eid('BrowL')+' d="M19.5 23c2.2-2.6 5.6-3.1 8-1.7" stroke="#F87171" stroke-width="2.3" stroke-linecap="round" fill="none" style="opacity:0;transform-origin:23px 22px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r"'+eid('BrowR')+' d="M36.5 21.3c2.4-1.4 5.8-.9 8 1.7" stroke="#F87171" stroke-width="2.3" stroke-linecap="round" fill="none" style="opacity:0;transform-origin:41px 22px;transition:opacity .18s,transform .18s"/>'+
    '<g class="finn-eye-g finn-eye-l"><circle class="finn-eye"'+eid('EyeL')+' cx="24.5" cy="28" r="3.6" fill="#4ADE80" style="transition:fill .2s"/></g>'+
    '<g class="finn-eye-g finn-eye-r"><circle class="finn-eye"'+eid('EyeR')+' cx="39.5" cy="28" r="3.6" fill="#4ADE80" style="transition:fill .2s"/></g>'+
    '<path class="finn-mouth finn-mouth-smile"'+eid('MouthSmile')+' d="M22 41c3.5 3.5 8 5 10 5s6.5-1.5 10-5" stroke="#E5A75E" stroke-width="2.2" stroke-linecap="round" fill="none" style="opacity:.9;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M20 40c4.5 5.2 9.4 7 12 7s7.5-1.8 12-7" stroke="#4ADE80" stroke-width="2.4" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M22.5 46.5c3.4-3.4 7.7-4.6 9.5-4.6s6.1 1.2 9.5 4.6" stroke="#F87171" stroke-width="2.2" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M24 43.5h16" stroke="#5EC8FF" stroke-width="2.2" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<circle cx="17" cy="35" r="1.6" fill="#E5A75E" opacity=".35"/>'+
    '<circle cx="47" cy="35" r="1.6" fill="#E5A75E" opacity=".35"/>'+
  '</svg>';
}

var EMO_COLOR={happy:'#4ADE80',angry:'#F87171',thinking:'#5EC8FF',alert:'#FBBF24',sad:'#8B93A6'};

function setEmotion(root, emotion){
  if(!root) return;
  var mSmile=root.querySelector('.finn-mouth-smile'),
      mBig=root.querySelector('.finn-mouth-big'),
      mFrown=root.querySelector('.finn-mouth-frown'),
      mNeutral=root.querySelector('.finn-mouth-neutral'),
      browL=root.querySelector('.finn-brow-l'),
      browR=root.querySelector('.finn-brow-r'),
      eyes=root.querySelectorAll('.finn-eye');
  [mSmile,mBig,mFrown,mNeutral].forEach(function(m){ if(m) m.style.opacity='0'; });
  if(emotion==='angry' && mFrown) mFrown.style.opacity='.95';
  else if(emotion==='happy' && mBig) mBig.style.opacity='.95';
  else if(emotion==='thinking' && mNeutral) mNeutral.style.opacity='.85';
  else if(mSmile) mSmile.style.opacity='.9';
  var angry = emotion==='angry';
  if(browL){ browL.style.opacity=angry?'1':'0'; browL.style.transform=angry?'rotate(-10deg) translateY(1.5px)':''; }
  if(browR){ browR.style.opacity=angry?'1':'0'; browR.style.transform=angry?'rotate(10deg) translateY(1.5px)':''; }
  var color = EMO_COLOR[emotion] || null;
  if(color){ eyes.forEach(function(e){ e.setAttribute('fill', color); }); }
  root.setAttribute('data-emotion', emotion||'idle');
  if(angry){
    root.classList.remove('finn-shake');
    void root.offsetWidth;
    root.classList.add('finn-shake');
  }
}

function scheduleBlink(root){
  if(!root) return;
  function doBlink(){
    if(!root || !document.body.contains(root)) return;
    root.classList.remove('blinking');
    void root.offsetWidth;
    root.classList.add('blinking');
    setTimeout(function(){ root.classList.remove('blinking'); }, 180);
    setTimeout(doBlink, 2200 + Math.random()*3500);
  }
  setTimeout(doBlink, 700 + Math.random()*1200);
}

function flashEmotion(root, emotion, duration){
  setEmotion(root, emotion);
  if(duration){
    setTimeout(function(){
      if(root) setEmotion(root, 'idle');
      if(root && root.id==='finnAvatar' && window.FinnStatus && window.FinnStatus.update) window.FinnStatus.update();
    }, duration);
  }
}

window.FinnChar={
  svgMarkup: svgMarkup,
  setEmotion: setEmotion,
  scheduleBlink: scheduleBlink,
  flashEmotion: flashEmotion
};
})();
