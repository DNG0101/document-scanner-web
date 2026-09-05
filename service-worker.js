const CACHE='papertrail-c162aae22969';
const SHELL=["./","./index.html","./assets/app-f6c9f4c629cc.js","./assets/index-CHU_86Cc.css","./assets/tools-07b38a4391ec.css","./assets/pdf.worker-TGcf_-kp.mjs","./assets/fonts/NotoSans.ttf","./assets/fonts/NotoSansDevanagari.ttf","./favicon.svg","./icon-192.svg","./icon-512.svg","./manifest.webmanifest"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('papertrail-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
 event.respondWith((async()=>{
   if(event.request.mode==='navigate') {try {const response=await fetch(event.request);if(response.ok)return response;}catch{} return caches.match(new URL('./index.html',self.registration.scope));}
   const cached=await caches.match(event.request); return cached||fetch(event.request);
 })());
});
