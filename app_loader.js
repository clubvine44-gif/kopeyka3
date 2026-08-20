/* app loader */
(function(){
  Promise.all([
    fetch('app_p1.js?v=1').then(r=>r.text()),
    fetch('app_p2.js?v=1').then(r=>r.text())
  ]).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts[0]+parts[1];
    document.head.appendChild(s);
  }).catch(function(e){
    console.error(e);
    var m=document.getElementById('main');
    if(m) m.innerHTML='<div class="card">Ошибка загрузки приложения</div>';
  });
})();
