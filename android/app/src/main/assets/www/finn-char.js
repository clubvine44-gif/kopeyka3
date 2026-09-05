/**
 * FinnChar 3.0 — «Нейро-ядро» Финны.
 * Абстрактный ИИ-аватар: стеклянная сфера, живое ядро, орбитальные частицы
 * и голосовая волна вместо мультяшного лица. Один компонент для всего
 * приложения (шапка, ассистент, экран знакомства) — единый визуальный язык.
 */
(function(){
'use strict';

function svgMarkup(idPrefix, uid){
  uid = uid || String(Math.random()).slice(2, 8);
  function gid(n){ return idPrefix+n+uid; }
  return ''+
  '<svg class="finn-svg finn-v3" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">'+
    '<defs>'+
      '<radialGradient id="'+gid('hg')+'" cx="34%" cy="26%" r="72%">'+
        '<stop offset="0%" stop-color="#EAF6FF" stop-opacity=".5"/>'+
        '<stop offset="45%" stop-color="#1E3A5F" stop-opacity=".5"/>'+
        '<stop offset="100%" stop-color="#060B14" stop-opacity=".97"/>'+
      '</radialGradient>'+
      '<linearGradient id="'+gid('rim')+'" x1="0" y1="0" x2="1" y2="1">'+
        '<stop offset="0%" stop-color="#8FE3FF" stop-opacity=".8"/>'+
        '<stop offset="55%" stop-color="#5B7CFA" stop-opacity=".5"/>'+
        '<stop offset="100%" stop-color="#7C4DFF" stop-opacity=".32"/>'+
      '</linearGradient>'+
      '<radialGradient id="'+gid('nuc')+'" cx="38%" cy="34%" r="65%">'+
        '<stop offset="0%" stop-color="#FFFFFF" stop-opacity=".95"/>'+
        '<stop offset="38%" class="finn-nuc-mid" stop-color="#5EC8FF" stop-opacity=".9"/>'+
        '<stop offset="100%" class="finn-nuc-edge" stop-color="#5EC8FF" stop-opacity="0"/>'+
      '</radialGradient>'+
      '<filter id="'+gid('blur')+'" x="-60%" y="-60%" width="220%" height="220%">'+
        '<feGaussianBlur stdDeviation="1.3"/>'+
      '</filter>'+
      '<filter id="'+gid('glow')+'" x="-120%" y="-120%" width="340%" height="340%">'+
        '<feGaussianBlur stdDeviation=".9"/>'+
      '</filter>'+
    '</defs>'+
    '<circle cx="32" cy="32" r="29.4" fill="url(#'+gid('hg')+')" stroke="url(#'+gid('rim')+')" stroke-width="1.3"/>'+
    '<circle cx="32" cy="32" r="26.7" fill="none" stroke="rgba(255,255,255,.10)" stroke-width=".6"/>'+
    '<ellipse cx="23" cy="18.5" rx="11.5" ry="7" fill="rgba(255,255,255,.12)" filter="url(#'+gid('blur')+')"/>'+

    '<g class="finn-ring" style="transform-origin:32px 32px">'+
      '<circle cx="32" cy="32" r="18" fill="none" stroke="rgba(140,180,255,.14)" stroke-width=".6" stroke-dasharray="1 3"/>'+
      '<circle class="finn-ring-dot finn-ring-dot-a" cx="32" cy="14" r="2.15" fill="#5EC8FF" filter="url(#'+gid('glow')+')"/>'+
      '<circle class="finn-ring-dot finn-ring-dot-b" cx="47.59" cy="41" r="1.85" fill="#A78BFA" filter="url(#'+gid('glow')+')" opacity=".85"/>'+
      '<circle class="finn-ring-dot finn-ring-dot-c" cx="16.41" cy="41" r="1.6" fill="#FBBF24" filter="url(#'+gid('glow')+')" opacity=".7"/>'+
    '</g>'+

    '<g class="finn-core">'+
      '<circle class="finn-core-halo" cx="32" cy="30" r="12.6" fill="url(#'+gid('nuc')+')" filter="url(#'+gid('blur')+')" style="transform-origin:32px 30px"/>'+
      '<circle class="finn-core-nucleus" id="'+gid('Nuc')+'" cx="32" cy="30" r="5.6" fill="#5EC8FF" style="transform-origin:32px 30px;transition:fill .25s"/>'+
      '<circle class="finn-core-glint" cx="29.7" cy="27.6" r="1.35" fill="#fff" opacity=".85"/>'+
    '</g>'+

    '<g class="finn-wave" style="transform-origin:32px 46px">'+
      '<rect class="finn-bar finn-bar-1" x="22.7" y="41" width="2.6" height="10" rx="1.3" fill="#5EC8FF" style="transform-origin:24px 46px"/>'+
      '<rect class="finn-bar finn-bar-2" x="27.7" y="41" width="2.6" height="10" rx="1.3" fill="#5EC8FF" style="transform-origin:29px 46px"/>'+
      '<rect class="finn-bar finn-bar-3" x="32.7" y="41" width="2.6" height="10" rx="1.3" fill="#5EC8FF" style="transform-origin:34px 46px"/>'+
      '<rect class="finn-bar finn-bar-4" x="37.7" y="41" width="2.6" height="10" rx="1.3" fill="#5EC8FF" style="transform-origin:39px 46px"/>'+
      '<rect class="finn-bar finn-bar-5" x="42.7" y="41" width="2.6" height="10" rx="1.3" fill="#5EC8FF" style="transform-origin:44px 46px"/>'+
    '</g>'+
  '</svg>';
}

var EMO_COLOR={
  idle:'#5EC8FF', listening:'#22D3EE', thinking:'#A78BFA', speak:'#7DD3FC',
  happy:'#34D399', angry:'#F87171', alert:'#FBBF24', sad:'#94A3B8'
};

function setEmotion(root, emotion){
  if(!root) return;
  emotion = EMO_COLOR[emotion] ? emotion : 'idle';
  var color = EMO_COLOR[emotion];

  var nucleus = root.querySelectorAll('.finn-core-nucleus');
  var bars = root.querySelectorAll('.finn-bar');

  Array.prototype.forEach.call(nucleus, function(n){ n.setAttribute('fill', color); });
  Array.prototype.forEach.call(bars, function(b){ b.setAttribute('fill', color); });

  // цвет ядра в градиенте следует за эмоцией (defs уникальны для каждого инстанса)
  var svg = root.querySelector('svg.finn-svg');
  if(svg){
    var mid = svg.querySelector('.finn-nuc-mid');
    var edge = svg.querySelector('.finn-nuc-edge');
    if(mid) mid.setAttribute('stop-color', color);
    if(edge) edge.setAttribute('stop-color', color);
  }

  root.setAttribute('data-emotion', emotion);

  if(emotion==='angry' || emotion==='alert'){
    root.classList.remove('finn-shake');
    void root.offsetWidth;
    root.classList.add('finn-shake');
  }
}

function scheduleBlink(root){
  if(!root) return;
  function doFlash(){
    if(!root || !document.body.contains(root)) return;
    root.classList.remove('blinking');
    void root.offsetWidth;
    root.classList.add('blinking');
    setTimeout(function(){ if(root) root.classList.remove('blinking'); }, 180);
    setTimeout(doFlash, 2600 + Math.random()*3600);
  }
  setTimeout(doFlash, 700 + Math.random()*1300);
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
  '.finn-svg.finn-v3{display:block;overflow:visible}'+

  '.finn-core-halo{animation:finnBreathe 3.4s ease-in-out infinite}'+
  '@keyframes finnBreathe{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}'+
  '.finn-core-nucleus{animation:finnPulse 3.4s ease-in-out infinite}'+
  '@keyframes finnPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}'+

  '.finn-avatar.blinking .finn-core-nucleus,.ka-orb-face.blinking .finn-core-nucleus{animation:finnFlash .18s ease-in-out}'+
  '@keyframes finnFlash{0%,100%{opacity:1}50%{opacity:.3}}'+

  '.finn-ring{animation:finnRingSpin 7.5s linear infinite}'+
  '@keyframes finnRingSpin{to{transform:rotate(360deg)}}'+
  '[data-emotion="listening"] .finn-ring{animation-duration:2.6s}'+
  '[data-emotion="speak"] .finn-ring{animation-duration:2.1s}'+
  '[data-emotion="thinking"] .finn-ring{animation-duration:4.6s}'+
  '[data-emotion="happy"] .finn-ring{animation-duration:1.9s}'+
  '[data-emotion="angry"] .finn-ring{animation-duration:1s}'+
  '[data-emotion="alert"] .finn-ring{animation-duration:1.15s}'+
  '[data-emotion="sad"] .finn-ring{animation-duration:11s}'+
  '.finn-ring-dot{transition:opacity .3s}'+
  '[data-emotion="sad"] .finn-ring-dot{opacity:.35!important}'+
  '[data-emotion="happy"] .finn-ring-dot,[data-emotion="listening"] .finn-ring-dot,[data-emotion="speak"] .finn-ring-dot{opacity:1!important}'+

  '.finn-bar{transition:fill .25s}'+
  '[data-emotion="idle"] .finn-bar{animation:finnBarIdle 3.2s ease-in-out infinite}'+
  '@keyframes finnBarIdle{0%,100%{transform:scaleY(.22)}50%{transform:scaleY(.34)}}'+

  '[data-emotion="listening"] .finn-bar,[data-emotion="speak"] .finn-bar{animation:finnEq .95s ease-in-out infinite}'+
  '[data-emotion="listening"] .finn-bar-1,[data-emotion="speak"] .finn-bar-1{animation-delay:0s}'+
  '[data-emotion="listening"] .finn-bar-2,[data-emotion="speak"] .finn-bar-2{animation-delay:.16s}'+
  '[data-emotion="listening"] .finn-bar-3,[data-emotion="speak"] .finn-bar-3{animation-delay:.32s}'+
  '[data-emotion="listening"] .finn-bar-4,[data-emotion="speak"] .finn-bar-4{animation-delay:.48s}'+
  '[data-emotion="listening"] .finn-bar-5,[data-emotion="speak"] .finn-bar-5{animation-delay:.64s}'+
  '@keyframes finnEq{0%{transform:scaleY(.3)}20%{transform:scaleY(.95)}40%{transform:scaleY(.5)}60%{transform:scaleY(1)}80%{transform:scaleY(.4)}100%{transform:scaleY(.3)}}'+

  '[data-emotion="thinking"] .finn-bar{animation:finnThink 1.7s ease-in-out infinite}'+
  '[data-emotion="thinking"] .finn-bar-1{animation-delay:0s}'+
  '[data-emotion="thinking"] .finn-bar-2{animation-delay:.14s}'+
  '[data-emotion="thinking"] .finn-bar-3{animation-delay:.28s}'+
  '[data-emotion="thinking"] .finn-bar-4{animation-delay:.42s}'+
  '[data-emotion="thinking"] .finn-bar-5{animation-delay:.56s}'+
  '@keyframes finnThink{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(.62)}}'+

  '[data-emotion="happy"] .finn-bar-1{animation:finnHappy1 .9s ease-in-out infinite}'+
  '[data-emotion="happy"] .finn-bar-2{animation:finnHappy2 .9s ease-in-out infinite .05s}'+
  '[data-emotion="happy"] .finn-bar-3{animation:finnHappy3 .9s ease-in-out infinite .1s}'+
  '[data-emotion="happy"] .finn-bar-4{animation:finnHappy2 .9s ease-in-out infinite .05s}'+
  '[data-emotion="happy"] .finn-bar-5{animation:finnHappy1 .9s ease-in-out infinite}'+
  '@keyframes finnHappy1{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(.55)}}'+
  '@keyframes finnHappy2{0%,100%{transform:scaleY(.68)}50%{transform:scaleY(.85)}}'+
  '@keyframes finnHappy3{0%,100%{transform:scaleY(.95)}50%{transform:scaleY(1.15)}}'+

  '[data-emotion="sad"] .finn-bar-1{transform:scaleY(.5)}'+
  '[data-emotion="sad"] .finn-bar-2{transform:scaleY(.34)}'+
  '[data-emotion="sad"] .finn-bar-3{transform:scaleY(.2)}'+
  '[data-emotion="sad"] .finn-bar-4{transform:scaleY(.34)}'+
  '[data-emotion="sad"] .finn-bar-5{transform:scaleY(.5)}'+
  '[data-emotion="sad"] .finn-bar{transition:transform .5s ease,fill .25s;opacity:.75}'+

  '[data-emotion="angry"] .finn-bar{animation:finnAngry .42s ease-in-out infinite}'+
  '[data-emotion="angry"] .finn-bar-1{animation-delay:0s}'+
  '[data-emotion="angry"] .finn-bar-2{animation-delay:.04s}'+
  '[data-emotion="angry"] .finn-bar-3{animation-delay:.09s}'+
  '[data-emotion="angry"] .finn-bar-4{animation-delay:.03s}'+
  '[data-emotion="angry"] .finn-bar-5{animation-delay:.07s}'+
  '@keyframes finnAngry{0%,100%{transform:scaleY(.3)}30%{transform:scaleY(1)}55%{transform:scaleY(.45)}80%{transform:scaleY(.9)}}'+

  '[data-emotion="alert"] .finn-bar{animation:finnAlert .4s ease-in-out infinite}'+
  '@keyframes finnAlert{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(.95)}}'+

  '.finn-shake{animation:finnCharShake .38s ease}'+
  '@keyframes finnCharShake{0%,100%{transform:translateX(0)}30%{transform:translateX(-2px)}60%{transform:translateX(2px)}}';
  document.head.appendChild(s);
})();

window.FinnChar={svgMarkup:svgMarkup,setEmotion:setEmotion,scheduleBlink:scheduleBlink,flashEmotion:flashEmotion};
})();
