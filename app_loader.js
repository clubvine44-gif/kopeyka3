/* app loader v3 */
(function(){
  Promise.all([
    fetch('ap0.js?v=3').then(r=>r.text()),
    fetch('ap1.js?v=3').then(r=>r.text()),
    fetch('ap2.js?v=3').then(r=>r.text())
  ]).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts.join('');
    document.head.appendChild(s);
  }).catch(function(e){
    console.error(e);
    var m=document.getElementById('main');
    if(m) m.innerHTML='<div class="card">Ошибка загрузки. Обнови страницу.</div>';
  });
})();
