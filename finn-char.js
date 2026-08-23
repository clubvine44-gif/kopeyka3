(function(){'use strict';
/*
 * FinnChar — Финна: женственный ИИ-персонаж с эмоциями.
 */
function svgMarkup(idPrefix, uid){
  idPrefix = idPrefix || '';
  uid = uid || String(Math.random()).slice(2,8);
  function eid(name){ return idPrefix ? (' id="'+idPrefix+name+'"') : ''; }
  return ''+
  '<svg class="finn-face" viewBox="0 0 64 64" fill="none">'+
    '<defs>'+
      '<radialGradient id="finnBody'+uid+'" cx="0.34" cy="0.26" r="0.8">'+
        '<stop offset="0" stop-color="#FFF5FB"/>'+
        '<stop offset="0.28" stop-color="#F9A8D4"/>'+
        '<stop offset="0.62" stop-color="#E879F9"/>'+
        '<stop offset="1" stop-color="#A855F7"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnCore'+uid+'" cx="0.5" cy="0.4" r="0.58">'+
        '<stop offset="0" stop-color="#1E1030"/>'+
        '<stop offset="1" stop-color="#0C0614"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnShine'+uid+'" cx="0.28" cy="0.2" r="0.48">'+
        '<stop offset="0" stop-color="#fff" stop-opacity=".6"/>'+
        '<stop offset="1" stop-color="#fff" stop-opacity="0"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnGem'+uid+'" cx="0.5" cy="0.5" r="0.5">'+
        '<stop offset="0" stop-color="#FDE68A"/>'+
        '<stop offset="1" stop-color="#F472B6"/>'+
      '</radialGradient>'+
      '<linearGradient id="finnRing'+uid+'" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0" stop-color="#FBCFE8"/>'+
        '<stop offset="0.5" stop-color="#E879F9"/>'+
        '<stop offset="1" stop-color="#67E8F9"/>'+
      '</linearGradient>'+
      '<filter id="finnGlow'+uid+'" x="-40%" y="-40%" width="180%" height="180%">'+
        '<feGaussianBlur stdDeviation="1.15" result="b"/>'+
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>'+
    '</defs>'+
    '<path d="M28.5 8.5c-2.8-2.4-7.2-.9-7.2 2.2 0 2.3 3.2 3.2 7.2 1.4" fill="#F472B6" opacity=".95"/>'+
    '<path d="M35.5 8.5c2.8-2.4 7.2-.9 7.2 2.2 0 2.3-3.2 3.2-7.2 1.4" fill="#F472B6" opacity=".95"/>'+
    '<circle class="finn-tip" cx="32" cy="7.2" r="2.6" fill="url(#finnGem'+uid+')" filter="url(#finnGlow'+uid+')"/>'+
    '<circle cx="32" cy="7.2" r="1" fill="#fff" opacity=".75"/>'+
    '<circle cx="32" cy="35" r="25.8" fill="none" stroke="url(#finnRing'+uid+')" stroke-width="2.1" opacity=".95"/>'+
    '<circle cx="32" cy="35" r="23.2" fill="url(#finnBody'+uid+')" filter="url(#finnGlow'+uid+')"/>'+
    '<circle cx="32" cy="35" r="17.8" fill="url(#finnCore'+uid+')"/>'+
    '<ellipse cx="24" cy="26" rx="9.5" ry="5.5" fill="url(#finnShine'+uid+')"/>'+
    '<ellipse cx="21.5" cy="41" rx="3.4" ry="2.1" fill="#F472B6" opacity=".32"/>'+
    '<ellipse cx="42.5" cy="41" rx="3.4" ry="2.1" fill="#F472B6" opacity=".32"/>'+
    '<path class="finn-brow finn-brow-l"'+eid('BrowL')+' d="M19.2 27.2c2.6-2.2 6.6-2.4 9-.6" stroke="#FCE7F3" stroke-width="1.7" stroke-linecap="round" fill="none" style="opacity:.92;transform-origin:24px 27px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r"'+eid('BrowR')+' d="M35.8 26.6c2.4-1.8 6.6-1.6 9.2.6" stroke="#FCE7F3" stroke-width="1.7" stroke-linecap="round" fill="none" style="opacity:.92;transform-origin:40px 27px;transition:opacity .18s,transform .18s"/>'+
    '<path d="M19.5 29.5l-1.6-1.3M21.2 28.6l-1-1.7M23 28.1l-.5-1.8" stroke="#F9A8D4" stroke-width=".85" stroke-linecap="round" opacity=".85"/>'+
    '<path d="M44.5 29.5l1.6-1.3M42.8 28.6l1-1.7M41 28.1l.5-1.8" stroke="#F9A8D4" stroke-width=".85" stroke-linecap="round" opacity=".85"/>'+
    '<g class="finn-eye-g finn-eye-l">'+
      '<ellipse class="finn-eye"'+eid('EyeL')+' cx="24.5" cy="34.2" rx="4.5" ry="5.4" fill="#67E8F9" style="transition:fill .2s"/>'+
      '<circle cx="22.9" cy="32.1" r="1.3" fill="#fff" opacity=".92"/>'+
      '<circle cx="25.5" cy="35.4" r=".65" fill="#083344" opacity=".3"/>'+
    '</g>'+
    '<g class="finn-eye-g finn-eye-r">'+
      '<ellipse class="finn-eye"'+eid('EyeR')+' cx="39.5" cy="34.2" rx="4.5" ry="5.4" fill="#67E8F9" style="transition:fill .2s"/>'+
      '<circle cx="37.9" cy="32.1" r="1.3" fill="#fff" opacity=".92"/>'+
      '<circle cx="40.5" cy="35.4" r=".65" fill="#083344" opacity=".3"/>'+
    '</g>'+
    '<path class="finn-mouth finn-mouth-smile"'+eid('MouthSmile')+' d="M24.5 45c2.2 2.4 5.2 3.4 7.5 3.4s5.3-1 7.5-3.4" stroke="#F9A8D4" stroke-width="2.15" stroke-linecap="round" fill="none" style="opacity:.95;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M22.5 44c2.8 3.5 6.6 4.9 9.5 4.9s6.7-1.4 9.5-4.9" stroke="#4ADE80" stroke-width="2.35" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M24.5 49c2.2-2.3 5.2-3.2 7.5-3.2s5.3.9 7.5 3.2" stroke="#F87171" stroke-width="2.15" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M26.5 46.2h11" stroke="#E879F9" stroke-width="2.1" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
  '</svg>';
}
var EMO_COLOR={happy:'#4ADE80',angry:'#F87171',thinking:'#E879F9',listening:'#67E8F9',alert:'#FBBF24',sad:'#94A3B8',idle:'#67E8F9'};
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
  else if(mSmile) mSmile.style.opacity='.95';
  var angry = emotion==='angry';
  var browColor = angry ? '#F87171' : emotion==='happy' ? '#FBCFE8' : (emotion==='thinking'||emotion==='listening') ? '#F5D0FE' : emotion==='alert' ? '#FDE68A' : '#FCE7F3';
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
    else { e.setAttribute('rx','4.5'); e.setAttribute('ry','5.4'); }
  });
  eyeG.forEach(function(g){
    if(emotion==='listening') g.style.transform='scale(1.07)';
    else if(emotion==='thinking') g.style.transform='scale(1.04)';
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
window.FinnChar={svgMarkup:svgMarkup,setEmotion:setEmotion,scheduleBlink:scheduleBlink,flashEmotion:flashEmotion};
})();
