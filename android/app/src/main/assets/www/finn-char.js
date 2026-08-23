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
      '<radialGradient id="finnCoin'+uid+'" cx=".35" cy=".28" r=".85">'+
        '<stop offset="0" stop-color="#FCE7B8"/><stop offset=".55" stop-color="#E9AE66"/><stop offset="1" stop-color="#B8712E"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnGem'+uid+'" cx=".5" cy=".5" r=".5">'+
        '<stop offset="0" stop-color="#FFD3E6"/><stop offset="1" stop-color="#F472B6"/>'+
      '</radialGradient>'+
      '<filter id="finnSoft'+uid+'" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs>'+
    '<path d="M22 8c-3.2-2.7-8.4-1-8.4 2.7 0 2.7 3.6 3.8 8.4 1.7" fill="#F472B6" stroke="#D9418E" stroke-width=".6"/>'+
    '<path d="M26 8c3.2-2.7 8.4-1 8.4 2.7 0 2.7-3.6 3.8-8.4 1.7" fill="#F472B6" stroke="#D9418E" stroke-width=".6"/>'+
    '<circle class="finn-tip" cx="24" cy="10.4" r="2.1" fill="url(#finnGem'+uid+')"/>'+
    '<circle cx="32" cy="33" r="27" fill="#171018" stroke="#E5A75E" stroke-width="1.8" opacity=".95"/>'+
    '<circle cx="32" cy="33" r="22.5" fill="url(#finnCoin'+uid+')" filter="url(#finnSoft'+uid+')"/>'+
    '<circle cx="32" cy="33" r="18.5" fill="#1A1208"/>'+
    '<ellipse cx="19.5" cy="38" rx="3.2" ry="2" fill="#F472B6" opacity=".28"/>'+
    '<ellipse cx="44.5" cy="38" rx="3.2" ry="2" fill="#F472B6" opacity=".28"/>'+
    '<path class="finn-brow finn-brow-l"'+eid('BrowL')+' d="M18.5 24c2.6-2.2 6.6-2.4 9-.6" stroke="#F2C879" stroke-width="2" stroke-linecap="round" fill="none" style="opacity:.85;transform-origin:23px 23px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r"'+eid('BrowR')+' d="M36.5 23.4c2.4-1.8 6.4-1.6 9 .6" stroke="#F2C879" stroke-width="2" stroke-linecap="round" fill="none" style="opacity:.85;transform-origin:41px 23px;transition:opacity .18s,transform .18s"/>'+
    '<g class="finn-eye-g finn-eye-l">'+
      '<ellipse class="finn-eye"'+eid('EyeL')+' cx="24" cy="31" rx="4.4" ry="5.4" fill="#4ADE80" style="transition:fill .2s"/>'+
      '<circle cx="22.3" cy="28.7" r="1.3" fill="#fff" opacity=".85"/>'+
      '<path d="M19.2 25.9l-2.5-1.5M20.4 24.9l-1.7-2.3M22.1 24.3l-.8-2.7" stroke="#F2C879" stroke-width=".9" stroke-linecap="round"/>'+
    '</g>'+
    '<g class="finn-eye-g finn-eye-r">'+
      '<ellipse class="finn-eye"'+eid('EyeR')+' cx="40" cy="31" rx="4.4" ry="5.4" fill="#4ADE80" style="transition:fill .2s"/>'+
      '<circle cx="38.3" cy="28.7" r="1.3" fill="#fff" opacity=".85"/>'+
      '<path d="M44.8 25.9l2.5-1.5M43.6 24.9l1.7-2.3M41.9 24.3l.8-2.7" stroke="#F2C879" stroke-width=".9" stroke-linecap="round"/>'+
    '</g>'+
    '<path class="finn-mouth finn-mouth-smile"'+eid('MouthSmile')+' d="M23 43.5c2.6 2.8 6 4 9 4s6.4-1.2 9-4" stroke="#E5A75E" stroke-width="2.5" stroke-linecap="round" fill="none" style="opacity:.9;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M21 42.5c3.2 4 7.6 5.6 11 5.6s7.8-1.6 11-5.6" stroke="#4ADE80" stroke-width="2.7" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M23 48.5c2.6-2.8 6-4 9-4s6.4 1.2 9 4" stroke="#F87171" stroke-width="2.5" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M25 45.5h14" stroke="#5EC8FF" stroke-width="2.5" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
  '</svg>';
}

var EMO_COLOR={happy:'#4ADE80',angry:'#F87171',thinking:'#5EC8FF',listening:'#7DD3FC',alert:'#FBBF24',sad:'#8B93A6',idle:'#4ADE80'};

function setEmotion(root, emotion){
  if(!root) return;
  emotion=emotion||'idle';
  var mSmile=root.querySelector('.finn-mouth-smile'),
      mBig=root.querySelector('.finn-mouth-big'),
      mFrown=root.querySelector('.finn-mouth-frown'),
      mNeutral=root.querySelector('.finn-mouth-neutral'),
      browL=root.querySelector('.finn-brow-l'),
      browR=root.querySelector('.finn-brow-r'),
      eyes=root.querySelectorAll('.finn-eye'),
      eyeG=root.querySelectorAll('.finn-eye-g');
  [mSmile,mBig,mFrown,mNeutral].forEach(function(m){ if(m) m.style.opacity='0'; });
  if(emotion==='angry' && mFrown) mFrown.style.opacity='.95';
  else if(emotion==='happy' && mBig) mBig.style.opacity='.95';
  else if((emotion==='thinking'||emotion==='listening') && mNeutral) mNeutral.style.opacity='.9';
  else if(emotion==='alert' && mNeutral) mNeutral.style.opacity='.85';
  else if(mSmile) mSmile.style.opacity='.9';
  var angry = emotion==='angry';
  var browColor = angry ? '#F87171'
    : emotion==='happy' ? '#FFD9A0'
    : (emotion==='thinking'||emotion==='listening') ? '#A5D8FF'
    : emotion==='alert' ? '#FBBF24'
    : '#F2C879';
  var browXform = angry ? {l:'rotate(-16deg) translateY(2px)', r:'rotate(16deg) translateY(2px)'}
    : emotion==='happy' ? {l:'translateY(-2px)', r:'translateY(-2px)'}
    : emotion==='thinking' ? {l:'rotate(-8deg) translateY(-1px)', r:'rotate(4deg) translateY(-1px)'}
    : emotion==='listening' ? {l:'rotate(-5deg) translateY(-1px)', r:'rotate(5deg) translateY(-1px)'}
    : emotion==='alert' ? {l:'rotate(-10deg) translateY(1px)', r:'rotate(10deg) translateY(1px)'}
    : {l:'', r:''};
  if(browL){ browL.style.opacity=(angry||emotion==='alert')?'1':'.9'; browL.style.transform=browXform.l; browL.setAttribute('stroke',browColor); }
  if(browR){ browR.style.opacity=(angry||emotion==='alert')?'1':'.9'; browR.style.transform=browXform.r; browR.setAttribute('stroke',browColor); }
  var color = EMO_COLOR[emotion] || EMO_COLOR.idle;
  eyes.forEach(function(e){
    e.setAttribute('fill', color);
    if(emotion==='listening'||emotion==='thinking'){ e.setAttribute('rx','4.8'); e.setAttribute('ry','5.8'); }
    else if(emotion==='happy'){ e.setAttribute('rx','4.6'); e.setAttribute('ry','5.2'); }
    else { e.setAttribute('rx','4.4'); e.setAttribute('ry','5.4'); }
  });
  eyeG.forEach(function(g){
    if(emotion==='listening') g.style.transform='scale(1.06)';
    else if(emotion==='thinking') g.style.transform='scale(1.03)';
    else if(emotion==='happy') g.style.transform='scale(1.05)';
    else g.style.transform='';
    g.style.transition='transform .25s ease';
  });
  root.setAttribute('data-emotion', emotion);
  if(angry||emotion==='alert'){
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
