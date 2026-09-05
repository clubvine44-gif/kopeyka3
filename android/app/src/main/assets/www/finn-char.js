/**
 * FinnChar 2.0 — взрослый женственный ИИ-аватар Финны.
 * Не «колобок»: стеклянный силуэт, мягкий свет, живая мимика.
 */
(function(){
'use strict';

function svgMarkup(idPrefix, uid){
  uid = uid || String(Math.random()).slice(2, 8);
  function eid(n){ return ' id="' + idPrefix + n + uid + '"'; }
  return ''+
  '<svg class="finn-svg finn-v2" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">'+
    '<defs>'+
      '<radialGradient id="'+idPrefix+'hg'+uid+'" cx="32%" cy="28%" r="68%">'+
        '<stop offset="0%" stop-color="#E8F4FF" stop-opacity=".55"/>'+
        '<stop offset="42%" stop-color="#7DD3FC" stop-opacity=".28"/>'+
        '<stop offset="100%" stop-color="#0B1220" stop-opacity=".92"/>'+
      '</radialGradient>'+
      '<linearGradient id="'+idPrefix+'rim'+uid+'" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0%" stop-color="#A5F3FC" stop-opacity=".85"/>'+
        '<stop offset="55%" stop-color="#818CF8" stop-opacity=".55"/>'+
        '<stop offset="100%" stop-color="#F0ABFC" stop-opacity=".4"/>'+
      '</linearGradient>'+
      '<radialGradient id="'+idPrefix+'cheek'+uid+'" cx="50%" cy="50%" r="50%">'+
        '<stop offset="0%" stop-color="#F472B6" stop-opacity=".45"/>'+
        '<stop offset="100%" stop-color="#F472B6" stop-opacity="0"/>'+
      '</radialGradient>'+
      '<filter id="'+idPrefix+'soft'+uid+'" x="-20%" y="-20%" width="140%" height="140%">'+
        '<feGaussianBlur stdDeviation="1.1"/>'+
      '</filter>'+
    '</defs>'+
    '<circle cx="32" cy="32" r="29.2" fill="url(#'+idPrefix+'hg'+uid+')" stroke="url(#'+idPrefix+'rim'+uid+')" stroke-width="1.35"/>'+
    '<circle cx="32" cy="32" r="26.8" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".7"/>'+
    '<ellipse cx="24" cy="20" rx="12" ry="7.5" fill="rgba(255,255,255,.14)" filter="url(#'+idPrefix+'soft'+uid+')"/>'+
    '<path class="finn-hair" d="M14 28c1.5-11 8.2-16.5 18-16.5S48.5 17 50 28c-2.2-6.5-7.5-9.8-18-9.8S16.2 21.5 14 28z" fill="rgba(167,139,250,.22)"/>'+
    '<path d="M18.5 22.5c3.2-3.8 7.2-5.2 13.5-5.2s10.3 1.4 13.5 5.2" fill="none" stroke="rgba(224,231,255,.22)" stroke-width="1.2" stroke-linecap="round"/>'+
    '<path class="finn-brow finn-brow-l" d="M20.5 27.2c1.8-1.6 4.2-2.3 6.4-2" fill="none" stroke="#E9D5FF" stroke-width="1.35" stroke-linecap="round" style="opacity:.9;transform-origin:23.5px 26.5px;transition:opacity .18s,transform .18s"/>'+
    '<path class="finn-brow finn-brow-r" d="M37.1 25.2c2.2-.3 4.6.4 6.4 2" fill="none" stroke="#E9D5FF" stroke-width="1.35" stroke-linecap="round" style="opacity:.9;transform-origin:40.5px 26.5px;transition:opacity .18s,transform .18s"/>'+
    '<g class="finn-eye-g finn-eye-l" style="transform-origin:24.5px 33px;transition:transform .2s">'+
      '<ellipse class="finn-eye-white" cx="24.5" cy="33.2" rx="5.6" ry="6.4" fill="rgba(255,255,255,.08)"/>'+
      '<ellipse class="finn-eye"'+eid('EyeL')+' cx="24.5" cy="33.4" rx="4.2" ry="5.1" fill="#67E8F9" style="transition:fill .2s,rx .18s,ry .18s"/>'+
      '<circle class="finn-pupil" cx="24.5" cy="33.8" r="1.85" fill="#0B1220"/>'+
      '<circle cx="23.2" cy="31.8" r="1.15" fill="#fff" opacity=".9"/>'+
      '<circle cx="25.6" cy="34.6" r=".55" fill="#083344" opacity=".35"/>'+
    '</g>'+
    '<g class="finn-eye-g finn-eye-r" style="transform-origin:39.5px 33px;transition:transform .2s">'+
      '<ellipse class="finn-eye-white" cx="39.5" cy="33.2" rx="5.6" ry="6.4" fill="rgba(255,255,255,.08)"/>'+
      '<ellipse class="finn-eye"'+eid('EyeR')+' cx="39.5" cy="33.4" rx="4.2" ry="5.1" fill="#67E8F9" style="transition:fill .2s,rx .18s,ry .18s"/>'+
      '<circle class="finn-pupil" cx="39.5" cy="33.8" r="1.85" fill="#0B1220"/>'+
      '<circle cx="38.2" cy="31.8" r="1.15" fill="#fff" opacity=".9"/>'+
      '<circle cx="40.6" cy="34.6" r=".55" fill="#083344" opacity=".35"/>'+
    '</g>'+
    '<ellipse class="finn-cheek finn-cheek-l" cx="18.8" cy="40.5" rx="4.2" ry="2.6" fill="url(#'+idPrefix+'cheek'+uid+')" opacity=".55"/>'+
    '<ellipse class="finn-cheek finn-cheek-r" cx="45.2" cy="40.5" rx="4.2" ry="2.6" fill="url(#'+idPrefix+'cheek'+uid+')" opacity=".55"/>'+
    '<path d="M31.2 38.2c.5 1.2 1.6 1.2 2.1 0" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1" stroke-linecap="round"/>'+
    '<path class="finn-mouth finn-mouth-smile" d="M25.2 44.2c2 2.6 4.8 3.6 6.8 3.6s4.8-1 6.8-3.6" stroke="#F9A8D4" stroke-width="1.9" stroke-linecap="round" fill="none" style="opacity:.95;transition:opacity .16s"/>'+
    '<path class="finn-mouth finn-mouth-big" d="M23.5 43.5c2.6 3.6 6.2 5.1 8.5 5.1s5.9-1.5 8.5-5.1" stroke="#4ADE80" stroke-width="2.05" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .16s"/>'+
    '<path class="finn-mouth finn-mouth-soft" d="M26.5 44.8c1.6 1.5 3.6 2.1 5.5 2.1s3.9-.6 5.5-2.1" stroke="#E879F9" stroke-width="1.75" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .16s"/>'+
    '<path class="finn-mouth finn-mouth-o" d="M30.2 43.6c0 0 1.2 3.4 1.8 3.4s1.8-3.4 1.8-3.4" stroke="#A5F3FC" stroke-width="1.85" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .16s"/>'+
    '<path class="finn-mouth finn-mouth-frown" d="M25.5 48c2-2.2 4.7-3.1 6.5-3.1s4.5.9 6.5 3.1" stroke="#F87171" stroke-width="1.9" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .16s"/>'+
    '<path class="finn-mouth finn-mouth-neutral" d="M27.2 45.8h9.6" stroke="#C4B5FD" stroke-width="1.8" stroke-linecap="round" fill="none" style="opacity:0;transition:opacity .16s"/>'+
    '<path class="finn-listen-arc finn-listen-l" d="M11.5 28c-3.5 3.2-3.5 8.8 0 12" fill="none" stroke="#67E8F9" stroke-width="1.3" stroke-linecap="round" opacity="0"/>'+
    '<path class="finn-listen-arc finn-listen-r" d="M52.5 28c3.5 3.2 3.5 8.8 0 12" fill="none" stroke="#67E8F9" stroke-width="1.3" stroke-linecap="round" opacity="0"/>'+
  '</svg>';
}

var EMO_COLOR={
  happy:'#4ADE80', angry:'#F87171', thinking:'#E879F9', listening:'#67E8F9',
  alert:'#FBBF24', sad:'#94A3B8', idle:'#67E8F9', speak:'#A5F3FC'
};

function hideMouths(root){
  ['.finn-mouth-smile','.finn-mouth-big','.finn-mouth-soft','.finn-mouth-o','.finn-mouth-frown','.finn-mouth-neutral'].forEach(function(sel){
    var el=root.querySelector(sel);
    if(el) el.style.opacity='0';
  });
}

function setEmotion(root, emotion){
  if(!root) return;
  emotion=emotion||'idle';
  hideMouths(root);
  var mSmile=root.querySelector('.finn-mouth-smile');
  var mBig=root.querySelector('.finn-mouth-big');
  var mSoft=root.querySelector('.finn-mouth-soft');
  var mO=root.querySelector('.finn-mouth-o');
  var mFrown=root.querySelector('.finn-mouth-frown');
  var mNeutral=root.querySelector('.finn-mouth-neutral');
  var browL=root.querySelector('.finn-brow-l');
  var browR=root.querySelector('.finn-brow-r');
  var eyes=root.querySelectorAll('.finn-eye');
  var eyeG=root.querySelectorAll('.finn-eye-g');
  var arcs=root.querySelectorAll('.finn-listen-arc');
  var cheeks=root.querySelectorAll('.finn-cheek');

  if(emotion==='angry' && mFrown) mFrown.style.opacity='.95';
  else if(emotion==='happy' && mBig) mBig.style.opacity='.95';
  else if(emotion==='listening' && mO) mO.style.opacity='.9';
  else if(emotion==='thinking' && mSoft) mSoft.style.opacity='.92';
  else if(emotion==='alert' && mNeutral) mNeutral.style.opacity='.9';
  else if(emotion==='sad' && mFrown) mFrown.style.opacity='.7';
  else if(mSmile) mSmile.style.opacity='.92';

  var angry = emotion==='angry';
  var browColor = angry ? '#F87171'
    : emotion==='happy' ? '#FBCFE8'
    : emotion==='thinking' ? '#F5D0FE'
    : emotion==='listening' ? '#A5F3FC'
    : emotion==='alert' ? '#FDE68A'
    : emotion==='sad' ? '#CBD5E1'
    : '#E9D5FF';

  var browXform =
    angry ? {l:'rotate(-14deg) translateY(1px)', r:'rotate(14deg) translateY(1px)'}
    : emotion==='happy' ? {l:'translateY(-2px)', r:'translateY(-2px)'}
    : emotion==='thinking' ? {l:'rotate(-10deg) translateY(-1px)', r:'rotate(3deg) translateY(-2px)'}
    : emotion==='listening' ? {l:'rotate(-6deg) translateY(-1px)', r:'rotate(6deg) translateY(-1px)'}
    : emotion==='alert' ? {l:'rotate(-12deg) translateY(1px)', r:'rotate(12deg) translateY(1px)'}
    : emotion==='sad' ? {l:'rotate(8deg) translateY(2px)', r:'rotate(-8deg) translateY(2px)'}
    : {l:'none', r:'none'};

  if(browL){ browL.style.opacity=(angry||emotion==='alert')?'1':'.9'; browL.style.transform=browXform.l; browL.setAttribute('stroke',browColor); }
  if(browR){ browR.style.opacity=(angry||emotion==='alert')?'1':'.9'; browR.style.transform=browXform.r; browR.setAttribute('stroke',browColor); }

  var color = EMO_COLOR[emotion] || EMO_COLOR.idle;
  Array.prototype.forEach.call(eyes, function(e){
    e.setAttribute('fill', color);
    if(emotion==='listening'){ e.setAttribute('rx','4.6'); e.setAttribute('ry','5.6'); }
    else if(emotion==='thinking'){ e.setAttribute('rx','4.4'); e.setAttribute('ry','5.3'); }
    else if(emotion==='happy'){ e.setAttribute('rx','4.3'); e.setAttribute('ry','5.0'); }
    else if(emotion==='sad'){ e.setAttribute('rx','4.0'); e.setAttribute('ry','4.6'); }
    else { e.setAttribute('rx','4.2'); e.setAttribute('ry','5.1'); }
  });

  Array.prototype.forEach.call(eyeG, function(g){
    g.style.transition='transform .22s ease';
    if(emotion==='listening') g.style.transform='scale(1.08)';
    else if(emotion==='thinking') g.style.transform='scale(1.04) translateY(-0.5px)';
    else if(emotion==='happy') g.style.transform='scale(1.05)';
    else if(emotion==='sad') g.style.transform='scale(0.96) translateY(1px)';
    else g.style.transform='scale(1)';
  });

  Array.prototype.forEach.call(arcs, function(a){
    a.style.transition='opacity .25s ease';
    a.setAttribute('opacity', emotion==='listening' ? '0.85' : '0');
  });
  Array.prototype.forEach.call(cheeks, function(c){
    c.style.transition='opacity .2s ease';
    c.style.opacity = (emotion==='happy'||emotion==='listening') ? '.75' : (emotion==='sad'?'.25':'.5');
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
    setTimeout(function(){ root.classList.remove('blinking'); }, 160);
    setTimeout(doBlink, 2400 + Math.random()*3800);
  }
  setTimeout(doBlink, 600 + Math.random()*1200);
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

(function injectCharCss(){
  if(document.getElementById('finnCharCss')) return;
  var s=document.createElement('style');
  s.id='finnCharCss';
  s.textContent=''+
  '.finn-svg.finn-v2{display:block;overflow:visible}'+
  '.finn-avatar.blinking .finn-eye{transform:scaleY(0.12);transform-origin:center}'+
  '.finn-avatar.blinking .finn-pupil{opacity:0}'+
  '.finn-avatar.blinking .finn-eye-g{transform:scaleY(0.15)!important}'+
  '.finn-avatar[data-emotion="listening"] .finn-listen-arc{animation:finnArcPulse 1.4s ease-in-out infinite}'+
  '@keyframes finnArcPulse{0%,100%{opacity:.35}50%{opacity:.95}}'+
  '.finn-avatar.finn-shake{animation:finnShake .35s ease}'+
  '@keyframes finnShake{0%,100%{transform:translateX(0)}30%{transform:translateX(-2px)}60%{transform:translateX(2px)}}'+
  '.finn-aura{position:absolute;inset:-10%;border-radius:50%;pointer-events:none;'+
  'background:radial-gradient(circle,rgba(103,232,249,.22),transparent 68%);opacity:.85;'+
  'animation:finnAura 3.2s ease-in-out infinite}'+
  '@keyframes finnAura{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.06);opacity:1}}'+
  '.finn-avatar[data-emotion="listening"] .finn-aura{background:radial-gradient(circle,rgba(103,232,249,.35),transparent 70%)}'+
  '.finn-avatar[data-emotion="thinking"] .finn-aura{background:radial-gradient(circle,rgba(232,121,249,.28),transparent 70%)}'+
  '.finn-avatar[data-emotion="happy"] .finn-aura{background:radial-gradient(circle,rgba(74,222,128,.28),transparent 70%)}'+
  '.finn-avatar[data-emotion="alert"] .finn-aura,.finn-avatar[data-emotion="angry"] .finn-aura{background:radial-gradient(circle,rgba(248,113,113,.28),transparent 70%)}';
  document.head.appendChild(s);
})();

window.FinnChar={svgMarkup:svgMarkup,setEmotion:setEmotion,scheduleBlink:scheduleBlink,flashEmotion:flashEmotion};
})();
