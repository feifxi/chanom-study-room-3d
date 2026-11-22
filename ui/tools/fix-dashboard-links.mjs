// Captured room URLs also served settings overlays. Resolve dashboard actions by room identity.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const rooms=JSON.parse(await readFile(path.join(root,'tools/chat-content.json'),'utf8')).filter(r=>r.kind==='room');
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();await p.route('**/*',r=>r.abort());
try{for(const file of ['home-dashboard.html','home-dashboard-active.html','home-dashboard-you-run.html']){
 const html=await readFile(path.join(root,file),'utf8');const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);await p.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const result=await p.evaluate(({rooms,scripts})=>{
  for(const card of document.querySelectorAll('main [data-ui-search-item]')){
   const title=card.querySelector('[aria-label^="Open "]')?.getAttribute('aria-label').replace(/^Open /,'');
   const room=rooms.find(r=>title?r.name===title:card.dataset.uiSearchItem.toLowerCase().includes(r.name.toLowerCase()));if(!room)continue;
   for(const link of [card,...card.querySelectorAll('a[href]')].filter(e=>e.matches('a[href]'))){
    const action=link.textContent.replace(/\s+/g,' ').trim();
    if(action==='Chat'||link.getAttribute('aria-label')?.startsWith('Open '))link.setAttribute('href',room.file);
    else if(action==='Walk in'&&room.walk)link.setAttribute('href',room.walk);
   }
  }
  for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 },{rooms,scripts});await writeFile(path.join(root,file),await prettier.format(result,{parser:'html',printWidth:120}));
}}finally{await b.close();}
