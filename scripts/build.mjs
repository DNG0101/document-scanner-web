import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const bundle=await rollup({input:'src/legacy-app.js',plugins:[json(),nodeResolve({browser:true,preferBuiltins:false}),commonjs(),terser({maxWorkers:1})]});
await bundle.write({file:'assets/app.js',format:'es',inlineDynamicImports:true});
await bundle.close();
const appHash=createHash('sha256').update(fs.readFileSync('assets/app.js')).digest('hex').slice(0,12);
const appFile=`assets/app-${appHash}.js`;
fs.copyFileSync('assets/app.js',appFile);
fs.unlinkSync('assets/app.js');
for(const file of fs.readdirSync('assets')) if(/^app-[a-f0-9]+\.js$/.test(file)&&'assets/'+file!==appFile) fs.unlinkSync('assets/'+file);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace(/src="\.\/assets\/app(?:-[a-f0-9]+)?\.js"/,`src="./${appFile}"`));
const cssHash=createHash('sha256').update(fs.readFileSync('assets/tools.css')).digest('hex').slice(0,12);
const cssFile=`assets/tools-${cssHash}.css`;
fs.copyFileSync('assets/tools.css',cssFile);
for(const file of fs.readdirSync('assets')) if(/^tools-[a-f0-9]+\.css$/.test(file)&&'assets/'+file!==cssFile) fs.unlinkSync('assets/'+file);
fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace(/href="\.\/assets\/tools(?:-[a-f0-9]+)?\.css"/,`href="./${cssFile}"`));
const shell=['./','./index.html','./'+appFile,'./assets/index-CHU_86Cc.css','./'+cssFile,'./assets/pdf.worker-TGcf_-kp.mjs','./assets/fonts/NotoSans.ttf','./assets/fonts/NotoSansDevanagari.ttf','./favicon.svg','./icon-192.svg','./icon-512.svg','./manifest.webmanifest'];
const version=createHash('sha256').update(Buffer.concat(shell.filter(p=>p!=='./').map(p=>fs.readFileSync(p)))).digest('hex').slice(0,12);
fs.writeFileSync('service-worker.js',`const CACHE='papertrail-${version}';
const SHELL=${JSON.stringify(shell)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('papertrail-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
 event.respondWith((async()=>{
   if(event.request.mode==='navigate') {try {const response=await fetch(event.request);if(response.ok)return response;}catch{} return caches.match(new URL('./index.html',self.registration.scope));}
   const cached=await caches.match(event.request); return cached||fetch(event.request);
 })());
});\n`);
console.log('Built static GitHub Pages app and versioned offline shell.');
