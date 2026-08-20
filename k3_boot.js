(function(){
var b64=(window.__k3p1||'')+(window.__k3p2||'');
function b64ToU8(s){var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
async function boot(){
  try{
    var ds=new DecompressionStream('gzip');
    var ab=await new Response(new Blob([b64ToU8(b64)]).stream().pipeThrough(ds)).arrayBuffer();
    (0,eval)(new TextDecoder().decode(ab));
  }catch(e){
    console.error(e);
    var a=document.getElementById('app');
    if(a)a.innerHTML='<div class="card"><p>Ошибка загрузки. Обнови страницу (жёсткое обновление).</p></div>';
  }
}
boot();
})();
