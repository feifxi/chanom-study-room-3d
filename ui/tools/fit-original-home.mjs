// Refine the restored dashboard in place; keep the rejected overview and old captures separate.
import{readFile,writeFile,readdir}from'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const browser=await chromium.launch({channel:'msedge',args:['--mute-audio']});const page=await browser.newPage();await page.route('**/*',r=>r.abort());
const changed=[];
try{for(const file of(await readdir(root)).filter(f=>f.endsWith('.html')&&!/home-old|home-chat|home-overview-preview/.test(f))){
 const html=await readFile(path.join(root,file),'utf8');if(!html.includes('class="app-rail"'))continue;
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const result=await page.evaluate(({file,scripts})=>{
  const rail=document.querySelector('.app-rail'),links=rail.querySelector('.rail-links');
  for(const destination of['plus.html','inbox.html','settings-profile.html']){
   const item=[...rail.querySelectorAll('.rail-bottom .rail-link')].find(e=>(e.getAttribute('href')||e.dataset.uiGo)===destination);if(item)links.append(item);
  }
  const home=document.querySelector('.original-home-content');
  if(home){
   home.classList.add('home-fitted');const body=home.firstElementChild;body.classList.add('home-fitted-body');
   body.querySelector(':scope > header').classList.add('home-greeting');
   const sections=[...body.querySelectorAll(':scope > section')];
   const friends=sections.find(s=>s.querySelector('h2')?.textContent==='Friends out right now');
   if(friends){friends.classList.add('home-friends-band');friends.querySelector('div').classList.add('home-friends-strip');}
   const rooms=sections.find(s=>s.querySelector('h2')?.textContent.includes('Your rooms'));
   if(rooms){
    rooms.classList.add('home-your-rooms');rooms.firstElementChild.classList.add('home-rooms-toolbar');
    const grid=rooms.querySelector(':scope > .grid');grid.classList.add('home-featured-grid');
    for(const card of grid.querySelectorAll(':scope > article')){
     card.classList.add('home-featured-room');
     card.querySelector(':scope > div.pointer-events-none.relative:not(.mt-auto)')?.classList.add('home-room-status');
     const content=card.querySelector(':scope > div.mt-auto');content?.classList.add('home-room-content');
     const title=content?.querySelector('p');title?.classList.add('home-room-title');title?.nextElementSibling?.classList.add('home-room-description');
    }
   }
   sections.find(s=>s.querySelector('h2')?.textContent==='Open now')?.classList.add('home-open-section');
  }
  const cards=[...document.querySelectorAll('.home-open-section > .grid > :is(a,button),.discover-room-card')];
  for(const card of cards){
   card.classList.add('aligned-public-card');
   for(const spacer of [...card.children].filter(e=>e.tagName==='SPAN'&&!e.textContent.trim()&&!e.children.length))spacer.remove();
   const action=card.lastElementChild;
   if(action?.tagName==='SPAN'&&/walk in|join|ask to/i.test(action.textContent))action.classList.add('aligned-public-action');
  }
  if(home||cards.length){const css=document.createElement('link');css.rel='stylesheet';css.href='assets/home-fit.css';if(!document.querySelector('link[href="assets/home-fit.css"]'))document.head.append(css);}
  for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 },{file,scripts});await writeFile(path.join(root,file),await prettier.format(result,{parser:'html',printWidth:120}));changed.push(file);
}}finally{await browser.close();}
manifest.homeFitRevision={date:'2026-11-18',files:changed,description:'Compact original Home, aligned public-room actions, contiguous rail destinations'};
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log(`Refined Home and ${changed.length} navigation surfaces.`);
