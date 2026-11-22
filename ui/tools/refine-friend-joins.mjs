// Refine only the current dashboard heading and friend shortcuts.
import{readFile,writeFile}from'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();await p.route('**/*',r=>r.abort());
try{for(const file of['home-dashboard.html','home-dashboard-active.html','home-dashboard-you-run.html']){
 const html=await readFile(path.join(root,file),'utf8');const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 await p.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const output=await p.evaluate(scripts=>{
  const colors=['#7758c4','#a75230','#2e775d','#a1542c','#8351a1'];
  document.querySelectorAll('.home-friends-strip > a').forEach((link,i)=>{
   if(link.classList.contains('home-friend-link'))return;
   const avatar=link.firstElementChild,copy=link.lastElementChild;
   const name=copy.firstElementChild.textContent.trim();
   let room=copy.lastElementChild.textContent.replace(/\s*·\s*Join\s*$/,'').trim();
   if(name==='Mook'&&link.getAttribute('href')==='common-cafe-2.html')room='Cat Café #2';
   link.className='home-friend-link';link.setAttribute('aria-label',`Join ${name} in ${room}`);
   avatar.classList.add('home-friend-avatar');avatar.style.width='38px';avatar.style.height='38px';
   avatar.firstElementChild.style.background=colors[i%colors.length];avatar.firstElementChild.style.fontSize='15px';
   copy.className='home-friend-copy';copy.innerHTML='';
   const person=document.createElement('strong');person.textContent=name;
   const location=document.createElement('span');location.textContent=room;
   copy.append(person,location);
   const action=document.createElement('span');action.className='home-friend-join';action.setAttribute('aria-hidden','true');action.innerHTML='Join<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';link.append(action);
  });
  for(const src of scripts){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 },scripts);await writeFile(path.join(root,file),await prettier.format(output,{parser:'html',printWidth:120}));
}}finally{await b.close();}
