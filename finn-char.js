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
      '<linearGradient id="finnChassis'+uid+'" x1="8" y1="6" x2="56" y2="60">'+
        '<stop stop-color="#232735"/><stop offset=".5" stop-color="#151824"/><stop offset="1" stop-color="#0B0D14"/>'+
      '</linearGradient>'+
      '<linearGradient id="finnEdge'+uid+'" x1="8" y1="6" x2="56" y2="60">'+
        '<stop stop-color="#F8E0A8"/><stop offset=".5" stop-color="#E5A75E"/><stop offset="1" stop-color="#B86B2E"/>'+
      '</linearGradient>'+
      '<linearGradient id="finnVisor'+uid+'" x1="10" y1="24" x2="54" y2="42">'+
        '<stop stop-color="#0E2233"/><stop offset="1" stop-color="#050A12"/>'+
      '</linearGradient>'+
      '<radialGradient id="finnTip'+uid+'" cx=".5" cy=".5" r=".5">'+
        '<stop offset="0" stop-color="#BFF3FF"/><stop offset="1" stop-color="#5EC8FF"/>'+
      '</radialGradient>'+
      '<filter id="finnSoft'+uid+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs>'+
    '<line x1="32" y1="8.5" x2="32" y2="2.5" stroke="#E5A75E" stroke-width="2.1" stroke-linecap="round"/>'+
    '<circle class="finn-tip" cx="32" cy="2.4" r="2.5" fill="url(#finnTip'+uid+')"/>'+
    '<rect x="5" y="8" width="54" height="54" rx="18" fill="url(#finnChassis'+uid+')" stroke="url(#finnEdge'+uid+')" stroke-width="2"/>'+
    '<rect x="9" y="12" width="46" height="46" rx="14" fill="none" stroke="#E5A75E" stroke-opacity=".18" stroke-width="1"/>'+
    '<rect x="8" y="47" width="6" height="3" rx="1.4" fill="#E5A75E" opacity=".4"/>'+
    '<rect x="50" y="47" width="6" height="3" rx="1.4" fill="#E5A75E" opacity=".4"/>'+
    '<path class="finn-brow finn-brow-l"'+eid('BrowL')+' d="M15 22.5h11" stroke="#F87171" stroke-width="3" stroke-linecap="round" fill="none" style="opacity:0;transform-origin:20.5px 22.5px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r"'+eid('BrowR')+' d="M38 22.5h11" stroke="#F87171" stroke-width="3" stroke-linecap="round" fill="none" style="opacity:0;transform-origin:43.5px 22.5px;transition:opacity .18s,transform .18s"/>'+
    '<rect x="11" y="25" width="42" height="18" rx="9" fill="url(#finnVisor'+uid+')" filter="url(#finnSoft'+uid+')"/>'+
    '<path d="M14 29c6-3.5 30-3.5 36 0" stroke="#5EC8FF" stroke-width="1" stroke-opacity=".22" fill="none" stroke-linecap="round"/>'+
    '<g class="finn-eye-g finn-eye-l"><rect class="finn-eye"'+eid('EyeL')+' x="18.5" y="29.5" width="9" height="11" rx="4.2" fill="#4ADE80" style="transition:fill .2s"/></g>'+
    '<g class="finn-eye-g finn-eye-r"><rect class="finn-eye"'+eid('EyeR')+' x="36.5" y="29.5" width="9" height="11" rx="4.2" fill="#4ADE80" style="transition:fill .2s"/></g>'+
    '<path class="finn-mouth finn-mouth-smile"'+eid('MouthSmile')+' d="M20 49c4 4 8.5 5.5 12 5.5s8-1.5 12-5.5" stroke="#E5A75E" stroke-width="3" stroke-linecap="round" fill="none" style="opacity:.9;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M18 48c5 5.6 10 7.5 14 7.5s9-1.9 14-7.5" stroke="#4ADE80" stroke-width="3.2" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M20.5 55.5c4-4 8.5-5.5 11.5-5.5s7.5 1.5 11.5 5.5" stroke="#F87171" stroke-width="3" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M21 51.5h22" stroke="#5EC8FF" stroke-width="3" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
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
