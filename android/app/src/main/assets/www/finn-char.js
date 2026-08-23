(function(){'use strict';
/*
 * FinnChar — персонаж «Финна»: милый ИИ-орб с эмоциями.
 * Классы эмоций сохраняем: .finn-eye, .finn-mouth-*, .finn-brow-*, .finn-tip
 */

function svgMarkup(idPrefix, uid){
  idPrefix = idPrefix || '';
  uid = uid || String(Math.random()).slice(2,8);
  function eid(name){ return idPrefix ? (' id="'+idPrefix+name+'"') : ''; }
  return ''+
  '<svg class="finn-face" viewBox="0 0 64 64" fill="none">'+
    '<defs>'+
      '<radialGradient id="finnBody'+uid+'" cx="0.32" cy="0.28" r="0.78">'+
        '<stop offset="0" stop-color="#E8F7FF"/>'+
        '<stop offset="0.35" stop-color="#7DD3FC"/>'+
        '<stop offset="0.75" stop-color="#38BDF8"/>'+
        '<stop offset="1" stop-color="#0284C7"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnCore'+uid+'" cx="0.5" cy="0.42" r="0.55">'+
        '<stop offset="0" stop-color="#0B1220"/>'+
        '<stop offset="1" stop-color="#020617"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnShine'+uid+'" cx="0.3" cy="0.22" r="0.5">'+
        '<stop offset="0" stop-color="#fff" stop-opacity=".55"/>'+
        '<stop offset="1" stop-color="#fff" stop-opacity="0"/>'+
      '</radialGradient>'+
      '<radialGradient id="finnGem'+uid+'" cx="0.5" cy="0.5" r="0.5">'+
        '<stop offset="0" stop-color="#FDE68A"/>'+
        '<stop offset="1" stop-color="#F59E0B"/>'+
      '</radialGradient>'+
      '<linearGradient id="finnRing'+uid+'" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0" stop-color="#A5F3FC"/>'+
        '<stop offset="0.5" stop-color="#38BDF8"/>'+
        '<stop offset="1" stop-color="#818CF8"/>'+
      '</linearGradient>'+
      '<filter id="finnGlow'+uid+'" x="-40%" y="-40%" width="180%" height="180%">'+
        '<feGaussianBlur stdDeviation="1.2" result="b"/>'+
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'+
      '</filter>'+
    '</defs>'+

    /* антенна */
    '<line x1="32" y1="10" x2="32" y2="4" stroke="url(#finnRing'+uid+')" stroke-width="1.8" stroke-linecap="round"/>'+
    '<circle class="finn-tip" cx="32" cy="3.2" r="2.4" fill="url(#finnGem'+uid+')" filter="url(#finnGlow'+uid+')"/>'+
    '<circle cx="32" cy="3.2" r="1" fill="#fff" opacity=".7"/>'+

    /* внешнее кольцо-обод */
    '<circle cx="32" cy="34" r="26.5" fill="none" stroke="url(#finnRing'+uid+')" stroke-width="2.2" opacity=".9"/>'+
    /* корпус */
    '<circle cx="32" cy="34" r="24" fill="url(#finnBody'+uid+')" filter="url(#finnGlow'+uid+')"/>'+
    /* тёмный «экран» лица */
    '<circle cx="32" cy="34" r="18.5" fill="url(#finnCore'+uid+')"/>'+
    /* блик */
    '<ellipse cx="24" cy="24" rx="10" ry="6" fill="url(#finnShine'+uid+')"/>'+

    /* щёчки */
    '<ellipse cx="21" cy="40" rx="3.2" ry="2" fill="#F472B6" opacity=".22"/>'+
    '<ellipse cx="43" cy="40" rx="3.2" ry="2" fill="#F472B6" opacity=".22"/>'+

    /* брови */
    '<path class="finn-brow finn-brow-l"'+eid('BrowL')+' d="M19 26.5c2.8-2.4 7-2.6 9.5-.7" stroke="#E0F2FE" stroke-width="1.9" stroke-linecap="round" fill="none" style="opacity:.9;transform-origin:24px 26px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r"'+eid('BrowR')+' d="M35.5 25.8c2.6-1.9 6.8-1.7 9.5.7" stroke="#E0F2FE" stroke-width="1.9" stroke-linecap="round" fill="none" style="opacity:.9;transform-origin:40px 26px;transition:opacity .18s,transform .18s"/>'+

    /* глаза */
    '<g class="finn-eye-g finn-eye-l">'+
      '<ellipse class="finn-eye"'+eid('EyeL')+' cx="24.5" cy="33" rx="4.6" ry="5.5" fill="#4ADE80" style="transition:fill .2s"/>'+
      '<circle cx="22.8" cy="30.8" r="1.35" fill="#fff" opacity=".9"/>'+
      '<circle cx="25.6" cy="34.2" r=".7" fill="#052e16" opacity=".35"/>'+
    '</g>'+
    '<g class="finn-eye-g finn-eye-r">'+
      '<ellipse class="finn-eye"'+eid('EyeR')+' cx="39.5" cy="33" rx="4.6" ry="5.5" fill="#4ADE80" style="transition:fill .2s"/>'+
      '<circle cx="37.8" cy="30.8" r="1.35" fill="#fff" opacity=".9"/>'+
      '<circle cx="40.6" cy="34.2" r=".7" fill="#052e16" opacity=".35"/>'+
    '</g>'+

    /* рты */
    '<path class="finn-mouth finn-mouth-smile"'+eid('MouthSmile')+' d="M24 44c2.4 2.6 5.6 3.7 8 3.7s5.6-1.1 8-3.7" stroke="#7DD3FC" stroke-width="2.3" stroke-linecap="round" fill="none" style="opacity:.95;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M22 43c3 3.8 7 5.3 10 5.3s7-1.5 10-5.3" stroke="#4ADE80" stroke-width="2.5" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M24 48.5c2.4-2.5 5.6-3.5 8-3.5s5.6 1 8 3.5" stroke="#F87171" stroke-width="2.3" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M26 45.5h12" stroke="#38BDF8" stroke-width="2.3" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .18s"/>'+

    /* нижний тех-деталь */
    '<path d="M26 54.5h12" stroke="#BAE6FD" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>'+
    '<circle cx="32" cy="54.5" r="1.2" fill="#FDE68A" opacity=".7"/>'+
  '</svg>';
}

var EMO_COLOR={happy:'#4ADE80',angry:'#F87171',thinking:'#5EC8FF',listening:'#7DD3FC',alert:'#FBBF24',sad:'#94A3B8',idle:'#4ADE80'};

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
  var browColor = angry ? '#F87171'
    : emotion==='happy' ? '#BBF7D0'
    : (emotion==='thinking'||emotion==='listening') ? '#BAE6FD'
    : emotion==='alert' ? '#FDE68A'
    : '#E0F2FE';
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
    if(emotion==='listening'||emotion==='thinking'){ e.setAttribute('rx','4.9'); e.setAttribute('ry','5.9'); }
    else if(emotion==='happy'){ e.setAttribute('rx','4.7'); e.setAttribute('ry','5.3'); }
    else { e.setAttribute('rx','4.6'); e.setAttribute('ry','5.5'); }
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

window.FinnChar={
  svgMarkup: svgMarkup,
  setEmotion: setEmotion,
  scheduleBlink: scheduleBlink,
  flashEmotion: flashEmotion
};
})();
