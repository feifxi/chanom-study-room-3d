// Add the original room dashboard to the current rail without overwriting comparisons.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const {chromium}=require('playwright');const prettier=require('prettier');
const browser=await chromium.launch({channel:'msedge',args:['--mute-audio']});const page=await browser.newPage();await page.route('**/*',r=>r.abort());
const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const homeLink='<a class="rail-link" href="home-dashboard.html" aria-label="Home"><svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z"/></svg><span>Home</span></a>';
const changed=[];
try{
 const variants=[['home-old.html','home-dashboard.html'],['home-old-active.html','home-dashboard-active.html'],['home-old-you-run.html','home-dashboard-you-run.html']];
 await page.setContent(clean(await readFile(path.join(root,'home.html'),'utf8')));
 const shell=await page.evaluate(()=>({rail:document.querySelector('.app-rail').outerHTML,head:document.head.innerHTML,classes:document.documentElement.className}));
 for(const [source,file] of variants){
  await page.setContent(clean(await readFile(path.join(root,source),'utf8')));
  const main=await page.evaluate(()=>document.querySelector('main').innerHTML);
  await page.setContent(`<!doctype html><html lang="en" class="${shell.classes}" data-ui-page="${file.replace('.html','')}"><head>${shell.head}</head><body class="ui-with-rail app-bg"><div class="rail-page-layout">${shell.rail}<main class="rail-page-content original-home-content">${main}</main></div><button class="chat-demo-control" aria-label="Demo controls" data-ui-toolbar>Demo</button></body></html>`);
  const output=await page.evaluate(({homeLink,variants})=>{
   document.title='Home · Connecta UI';
   document.querySelectorAll('.app-rail .is-active').forEach(e=>e.classList.remove('is-active'));
   const links=document.querySelector('.rail-links');links.insertAdjacentHTML('afterbegin',homeLink);links.firstElementChild.classList.add('is-active');links.firstElementChild.setAttribute('aria-current','page');
   document.querySelectorAll('[data-ui-go],a[href]').forEach(e=>{
    for(const [oldFile,newFile] of variants){if(e.dataset.uiGo===oldFile)e.dataset.uiGo=newFile;if(e.getAttribute('href')===oldFile)e.setAttribute('href',newFile);}
   });
   const emoji=/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
   const nodes=[];const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
   for(const node of nodes){
    const text=node.textContent;emoji.lastIndex=0;if(!emoji.test(text))continue;
    const remainder=text.replace(emoji,'').replace(/[\s\uFE0F\u200D]/g,'');const el=node.parentElement;
    if(!remainder&&/text-(?:[2-9]xl)|size-(?:8|9|10|11|12)/.test(el.className)){
     const textContext=(el.closest('.group')||el.parentElement).textContent;
     const kind=/rooftop|🌙/i.test(textContext+text)?'rooftop':/café|cafe|🐈/i.test(textContext+text)?'cafe':'library';
     el.classList.add('original-home-art');
     const img=document.createElement('img');img.src=`assets/project-images/covers/${kind}.webp`;img.alt='';node.replaceWith(img);
    }else node.textContent=text.replace(emoji,'').replace(/\uFE0F|\u200D/g,'');
   }
   for(const src of ['assets/theme.js','assets/prototype.js']){const s=document.createElement('script');s.src=src;(src.endsWith('theme.js')?document.head:document.body).append(s);}
   return '<!doctype html>\n'+document.documentElement.outerHTML;
  },{homeLink,variants});
  await writeFile(path.join(root,file),await prettier.format(output,{parser:'html',printWidth:120}));changed.push(file);
  if(!manifest.pages.some(p=>p.file===file))manifest.pages.push({id:file.replace('.html',''),file,title:file==='home-dashboard.html'?'Home · original dashboard':file.includes('active')?'Home · active rooms':'Home · rooms you run',group:'Main',url:'/home',adaptedFrom:source});
 }
 const files=(await readdir(root)).filter(f=>f.endsWith('.html')&&!changed.includes(f));
 for(const file of files){
  const html=await readFile(path.join(root,file),'utf8');if(!html.includes('class="app-rail"'))continue;
  const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
  await page.setContent(clean(html));
  const output=await page.evaluate(({homeLink,scripts})=>{
   const links=document.querySelector('.rail-links');if(!links.querySelector('[aria-label="Home"]'))links.insertAdjacentHTML('afterbegin',homeLink);
   document.querySelectorAll('.discover-room-section > .grid > :is(a,button)').forEach(e=>e.classList.add('discover-room-card'));
   for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
   return '<!doctype html>\n'+document.documentElement.outerHTML;
  },{homeLink,scripts});
  await writeFile(path.join(root,file),await prettier.format(output,{parser:'html',printWidth:120}));changed.push(file);
 }
}finally{await browser.close();}
manifest.homeNavigationRevision={date:'2026-11-18',home:'home-dashboard.html',files:changed};await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(root,'assets/pages.js'),`window.UI_PAGES = ${JSON.stringify(manifest.pages,null,2)};\n`);
console.log(`Added Home and updated ${changed.length} rail pages.`);
