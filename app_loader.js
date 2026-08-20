/* app loader v4 */
(function(){
  var files=['ap0a.js?v=4','ap0b.js?v=4','ap1.js?v=4','ap2a.js?v=4','ap2b.js?v=4'];
  Promise.all(files.map(function(f){return fetch(f).then(function(r){return r.text();});})).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts.join('');
    document.head.appendChild(s);
  }).catch(function(e){
    console.error(e);
    var m=document.getElementById('main');
    if(m) m.innerHTML='<div class="card">Ошибка загрузки. Обнови страницу (Ctrl+Shift+R).</div>';
  });
})();
