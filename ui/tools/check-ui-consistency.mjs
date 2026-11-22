import { readFile, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const {chromium}=require('playwright');
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage({viewport:{width:1440,height:1000}});
const base='http://localhost:3200/',issues=[],views=[];
const assert=(value,msg)=>{if(!value)issues.push(msg);};
p.on('pageerror',e=>issues.push(e.message));p.on('response',r=>{if(r.status()>=400)issues.push(`${r.status()}: ${r.url()}`);});
try{
 for(const {file,hud} of manifest.uiConsistencyRevision.files){
  const html=await readFile(path.join(root,file),'utf8');
  for(const src of new Set([...html.matchAll(/(?:src|href)="(assets\/[^"?#]+)[^"]*"/g)].map(m=>m[1]))){try{await stat(path.join(root,src));}catch{issues.push(`${file}: missing ${src}`);}}
  await p.goto(base+file);
  const data=await p.evaluate(()=>({emoji:/\p{Extended_Pictographic}/u.test(document.body.innerText),overflow:document.documentElement.scrollWidth>innerWidth+1,menus:document.querySelectorAll('.room-settings-popover').length,media:document.querySelectorAll('canvas,video,audio,iframe').length}));
  assert(!data.emoji,`${file}: emoji remains in visible text`);assert(!data.overflow,`${file}: horizontal overflow`);assert(!data.media,`${file}: media runtime introduced`);
  if(hud)assert(data.menus===2,`${file}: missing desktop/phone room menu`);
 }
 for(const width of [390,1024,1440])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:width===390?844:1000});await p.evaluate(t=>localStorage.setItem('studyroom-ui:theme',t),theme);
  for(const file of ['focus','plus','discover','discover-guest','shop','home','walk-library','walk-tools','walk-guest','common-cafe-2']){
   await p.goto(base+file+'.html');await p.evaluate(()=>document.fonts.ready);
   const data=await p.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null;};
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,font:document.querySelector('.consistent-page h1')&&getComputedStyle(document.querySelector('.consistent-page h1')).fontFamily,hero:box('.focus-summary,.plus-summary,.discover-intro'),menu:box('.room-settings-popover:popover-open'),featured:!!document.querySelector('.discover-featured'),search:box('.discover-search'),room:box(innerWidth<768?'.ui-phone .room-hud-more':'.ui-desktop .room-hud-more')};
   });
   const label=`${file}/${width}/${theme}`;
   assert(!data.overflow,`${label}: horizontal overflow`);
   if(data.font)assert(data.font.includes('Nunito'),`${label}: inconsistent font`);
   if(width>=1024&&['focus','plus'].includes(file))assert(data.hero.height<240,`${label}: oversized header`);
   if(file.startsWith('discover')){assert(!data.featured,`${label}: featured card still present`);if(width>=1024)assert(data.search.x>data.hero.x+data.hero.width/2,`${label}: search not on right`);}
   if(data.menu)assert(data.menu.right<=width&&data.menu.top>=70&&data.menu.bottom<=(width===390?844:1000),`${label}: room menu outside viewport`);
   if(data.room)assert(data.room.right<=width&&data.room.top<20,`${label}: room trigger misplaced`);
   views.push({file,width,theme,...data});
   if([390,1440].includes(width)&&['focus','plus','discover','shop','walk-tools'].includes(file))await p.screenshot({path:path.join(root,`reference/ui-consistency/${file}-${width}-${theme}.png`),animations:'disabled'});
  }
 }
 await p.setViewportSize({width:1916,height:843});await p.goto(base+'walk-library.html');await p.getByRole('button',{name:'Room menu',exact:true}).filter({visible:true}).click();
 assert(await p.locator('.room-settings-popover:popover-open').isVisible(),'Room menu did not open');
 const toggle=p.locator('.room-settings-popover:popover-open .hud-setting-toggle').first();await toggle.click();assert(await toggle.getAttribute('aria-pressed')==='true','Local preview toggle');
 await p.keyboard.press('Escape');assert(await p.locator('.room-settings-popover:popover-open').count()===0,'Escape did not close menu');
 await p.getByRole('button',{name:'Room menu',exact:true}).filter({visible:true}).click();
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(root,'reference/ui-consistency/room-reference-1916-dark.png'),animations:'disabled'});
 await p.goto(base+'inbox.html');const bounds=await p.locator('.inbox-content').boundingBox();assert(bounds.width>1500&&await p.locator('[data-ui-popover]').count()===0,'Inbox full-page layout regressed');
}catch(e){issues.push(e.stack||e.message);}finally{await b.close();}
await writeFile(path.join(root,'reference/ui-consistency/verification.json'),JSON.stringify({issues,pages:manifest.uiConsistencyRevision.files.length,views},null,2));
console.log(JSON.stringify({issues,pages:manifest.uiConsistencyRevision.files.length,responsiveViews:views.length},null,2));if(issues.length)process.exitCode=1;
