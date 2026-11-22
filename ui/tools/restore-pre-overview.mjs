// Restore the approved pre-overview Home and rail while leaving other UI refinements intact.
import{readFile,writeFile,copyFile}from'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();await p.route('**/*',r=>r.abort());
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
await copyFile(path.join(root,'home-dashboard.html'),path.join(root,'home-overview-preview.html'));
await copyFile(path.join(root,'home-dashboard-guest.html'),path.join(root,'home-overview-preview-guest.html'));
try{
 await p.setContent(strip(await readFile(path.join(root,'home-chat.html'),'utf8')));
 const nav=await p.locator('.app-rail').evaluate(e=>e.outerHTML);
 for(const file of manifest.homeOverviewRevision.files.filter(f=>f!=='home-dashboard-guest.html')){
  const html=await readFile(path.join(root,file),'utf8');const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]).filter(s=>s!=='assets/home-overview.js');
  await p.setContent(strip(html));
  const result=await p.evaluate(({file,nav,scripts})=>{
   const rail=document.querySelector('.app-rail');const root=rail.parentElement;
   const active=document.querySelector('.workspace-action.is-active')||rail.querySelector('.rail-link.is-active');
   const destination=active?.getAttribute('href')||active?.dataset.uiGo;
   if(file!=='discover-guest.html'){
    const holder=document.createElement('div');holder.innerHTML=nav;const replacement=holder.firstElementChild;
    for(const link of replacement.querySelectorAll('.rail-link')){
     const same=(link.getAttribute('href')||link.dataset.uiGo)===destination;link.classList.toggle('is-active',same);link.removeAttribute('aria-current');if(same)link.setAttribute('aria-current','page');
    }
    replacement.querySelector('.rail-brand').setAttribute('href','home.html');rail.replaceWith(replacement);
   }
   root.classList.remove('workspace-shell');document.querySelectorAll('.workspace-toolbar').forEach(e=>e.remove());
   document.querySelectorAll('link[href="assets/home-overview.css"]').forEach(e=>e.remove());
   for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
   return '<!doctype html>\n'+document.documentElement.outerHTML;
  },{file,nav,scripts});
  await writeFile(path.join(root,file),await prettier.format(result,{parser:'html',printWidth:120}));
 }
 const variants=[['home-old.html','home-dashboard.html'],['home-old-active.html','home-dashboard-active.html'],['home-old-you-run.html','home-dashboard-you-run.html']];
 for(const[source,file]of variants){
  await p.setContent(strip(await readFile(path.join(root,source),'utf8')));const main=await p.locator('main').evaluate(e=>e.innerHTML);
  await p.setContent(strip(await readFile(path.join(root,file),'utf8')));
  const result=await p.evaluate(({main,variants})=>{
   const target=document.querySelector('main');target.className='rail-page-content original-home-content';target.innerHTML=main;
   for(const link of document.querySelectorAll('.app-rail .rail-link')){const same=link.getAttribute('href')==='home-dashboard.html';link.classList.toggle('is-active',same);link.removeAttribute('aria-current');if(same)link.setAttribute('aria-current','page');}
   document.querySelectorAll('[data-ui-go],a[href]').forEach(e=>{for(const[before,after]of variants){if(e.dataset.uiGo===before)e.dataset.uiGo=after;if(e.getAttribute('href')===before)e.setAttribute('href',after);}});
   const emoji=/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
   const nodes=[];const w=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);while(w.nextNode())nodes.push(w.currentNode);
   for(const node of nodes){const text=node.textContent;emoji.lastIndex=0;if(!emoji.test(text))continue;const el=node.parentElement;
    if(!text.replace(emoji,'').replace(/[\s\uFE0F\u200D]/g,'')&&/text-(?:[2-9]xl)|size-(?:8|9|10|11|12)/.test(el.className)){
     const context=(el.closest('.group')||el.parentElement).textContent;const kind=/rooftop|🌙/i.test(context+text)?'rooftop':/café|cafe|🐈/i.test(context+text)?'cafe':'library';el.classList.add('original-home-art');const img=document.createElement('img');img.src=`assets/project-images/covers/${kind}.webp`;img.alt='';node.replaceWith(img);
    }else node.textContent=text.replace(emoji,'').replace(/\uFE0F|\u200D/g,'');
   }
   for(const src of['assets/theme.js','assets/prototype.js']){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
   return '<!doctype html>\n'+document.documentElement.outerHTML;
  },{main,variants});await writeFile(path.join(root,file),await prettier.format(result,{parser:'html',printWidth:120}));
 }
}finally{await b.close();}
await writeFile(path.join(root,'home-dashboard-guest.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=home-dashboard.html"><title>Home</title></head><body><a href="home-dashboard.html">Open Home</a></body></html>');
manifest.homeOverviewRevision.status='reverted';manifest.homeOverviewRevision.archivedHome='home-overview-preview.html';manifest.homeOverviewRevision.archivedNewUser='home-overview-preview-guest.html';
manifest.pages=manifest.pages.filter(p=>p.file!=='home-dashboard-guest.html');
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));await writeFile(path.join(root,'assets/pages.js'),`window.UI_PAGES = ${JSON.stringify(manifest.pages,null,2)};\n`);
const proto=await readFile(path.join(root,'assets/prototype.js'),'utf8');await writeFile(path.join(root,'assets/prototype.js'),proto.replace('<a href="home-dashboard-guest.html">Home · new user</a>',''));
console.log('Restored Home, filter pages and the full left navigation.');
