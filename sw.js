const CACHE='kopeyka3-v33';
const APP_SHELL=['./','./index.html','./app.js?v=17','./cloud.js?v=16','./onboard.js?v=13','./voice.js?v=15','./ai.js?v=7','./assistant.js?v=1','./widget.html','./manifest.json','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;var u=new URL(event.request.url);if(u.origin!==self.location.origin)return;event.respondWith(fetch(event.request,{cache:'no-store'}).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone())).catch(()=>{});return r;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));});
