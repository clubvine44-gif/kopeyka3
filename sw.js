const CACHE='kopeyka3-v9';
const APP_SHELL=['./','./index.html','./app.js?v=14','./cloud.js?v=16','./onboard.js?v=13','./voice.js?v=1','./voice2.js','./manifest.json','./icon.svg','./sw.js?v=19'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  let request=event.request;
  if(url.pathname.endsWith('/voice.js')){
    const replacement=new URL('./voice2.js',url.origin+url.pathname.substring(0,url.pathname.lastIndexOf('/')+1));
    replacement.search='';
    request=new Request(replacement.toString(),event.request);
  }
  event.respondWith(
    fetch(request,{cache:'no-store'})
      .then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});