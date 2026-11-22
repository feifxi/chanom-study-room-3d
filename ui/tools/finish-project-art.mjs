import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json')); const {chromium}=require('playwright');const prettier=require('prettier');
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();await p.route('**/*',r=>r.abort());
try{for(const {file} of manifest.uiConsistencyRevision.files){
 const html=await readFile(path.join(root,file),'utf8');const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 await p.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{waitUntil:'domcontentloaded'});
 const output=await p.evaluate(({file,scripts})=>{
  if(file==='plus.html'){
   const cards=[...document.querySelectorAll('.plus-benefit-grid > div')];
   const maps=cards.find(e=>e.firstElementChild.textContent==='Premium maps');
   maps.querySelector(':scope > div').innerHTML='<div class="plus-map-previews">'+['library','cafe','rooftop'].map((kind,i)=>`<img src="assets/project-images/covers/${kind}.webp" alt="${['Library','Cat Café','Rooftop'][i]} artwork from the project" loading="lazy">`).join('')+'</div>';
   const pets=cards.find(e=>e.firstElementChild.textContent==='Skins & pets');
   pets.querySelector(':scope > div').innerHTML='<div class="plus-style-previews"><img src="assets/project-images/shop/strawberry-dress.webp" alt="Strawberry Dress" loading="lazy"><img src="assets/project-images/shop/pet-cat.webp" alt="Pet Kitten" loading="lazy"></div>';
  }
  for(const btn of document.querySelectorAll('[data-chat-reaction]')){
   const count=btn.textContent.trim();btn.innerHTML='<svg class="ui-line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 4c-3-3-7-1-8 1-1-2-5-4-8-1-6 6 8 17 8 17S26 10 20 4z"/></svg><span>'+count+'</span>';
   btn.setAttribute('aria-label',count+' reactions');
  }
  // NPC name tags already state their identity; they do not need a generic book decoration.
  for(const badge of document.querySelectorAll('.pointer-events-none.absolute.inset-0 .ui-inline-icon')){
   if(/NPC/.test(badge.parentElement?.parentElement?.textContent||''))badge.remove();
  }
  for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 },{file,scripts});
 await writeFile(path.join(root,file),await prettier.format(output,{parser:'html',printWidth:120}));
}}finally{await b.close();}
