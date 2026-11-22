import{readFile,writeFile,stat,mkdir}from'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');
const base='http://localhost:3200/',out=path.join(root,'reference/home-overview');await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();p.setDefaultTimeout(5000);
const issues=[],views=[];const assert=(v,msg)=>{if(!v)issues.push(msg)};
p.on('pageerror',e=>issues.push(e.message));p.on('response',r=>{if(r.status()>=400)issues.push(r.status()+': '+r.url())});
try{
 await p.setViewportSize({width:1440,height:1000});
 for(const file of manifest.homeOverviewRevision.files){
  await p.goto(base+file);
  const data=await p.evaluate(()=>({rail:[...document.querySelectorAll('.rail-links .rail-link')].map(e=>e.querySelector(':scope > span:last-child')?.textContent||e.getAttribute('aria-label')),actions:document.querySelectorAll('.workspace-account-actions .workspace-action').length,overflow:document.documentElement.scrollWidth>innerWidth+1,toolbar:document.querySelectorAll('.workspace-toolbar').length}));
  assert(data.rail.join(',')===(file==='discover-guest.html'?'Home,Discover':'Home,Chat,Friends,Focus,Discover'),file+': primary navigation');assert(data.toolbar===1,file+': duplicate toolbar');assert(data.actions===(file==='discover-guest.html'?0:file==='home-dashboard-guest.html'?2:3),file+': account actions');assert(!data.overflow,file+': horizontal overflow');
 }
 for(const width of[390,768,1024,1440])for(const theme of['light','dark']){
  const height=width===390?844:1000;await p.setViewportSize({width,height});await p.evaluate(t=>localStorage.setItem('studyroom-ui:theme',t),theme);
  for(const file of['home-dashboard','home-dashboard-guest','home','friends','focus','discover','shop','plus','inbox','profile-menu']){
   await p.goto(base+file+'.html');await p.evaluate(()=>document.fonts.ready);
   const data=await p.evaluate(()=>{
    const rect=s=>{const e=document.querySelector(s);return e?e.getBoundingClientRect().toJSON():null;};
    return{overflow:document.documentElement.scrollWidth>innerWidth+1,sections:[...document.querySelectorAll('.overview-section')].map(s=>({name:s.querySelector('h2').textContent,y:s.getBoundingClientRect().y})),other:document.querySelector('.overview-other-rooms')?.open,visibleRooms:[...document.querySelectorAll('[data-overview-room]')].filter(e=>!e.closest('details:not([open])')&&e.getBoundingClientRect().height>0).length,popup:rect('[data-ui-popover]'),rail:rect('.app-rail'),toolbar:rect('.workspace-toolbar'),profile:rect('.rail-profile'),actions:[...document.querySelectorAll('.workspace-action')].map(e=>e.getBoundingClientRect().toJSON())};
   });
   const label=`${file}/${width}/${theme}`;assert(!data.overflow,label+': overflow');assert(data.actions.every(r=>r.right<=width&&r.y>=0&&r.bottom<=data.toolbar.bottom+1),label+': header actions');assert(data.profile.bottom<=height,label+': profile clipped');
   if(file==='home-dashboard'){
    assert(data.other===false&&data.visibleRooms===3,label+': secondary rooms not collapsed');
    assert(data.sections.map(s=>s.name).join(',')==='Your rooms,Common rooms,Open rooms',label+': content order');
    assert(data.sections[1].y<(width===390?500:500),label+': Common rooms too far down');
    assert(data.sections[2].y<(width===390?850:800),label+': Open rooms too far down');
   }
   if(file==='home-dashboard-guest')assert(data.sections.map(s=>s.name).join(',')==='Common rooms,Open rooms'&&data.visibleRooms===0,label+': new-user content');
   if(data.popup)assert(data.popup.x>=data.rail.right&&data.popup.right<=width&&data.popup.bottom<=height,label+': popup bounds');
   views.push({file,width,theme,...data});
   if([390,1440].includes(width)&&['home-dashboard','home-dashboard-guest','home','inbox'].includes(file))await p.screenshot({path:path.join(out,`${file}-${width}-${theme}.png`),animations:'disabled'});
  }
 }
 await p.setViewportSize({width:1440,height:1000});await p.goto(base+'home-dashboard.html');
 await p.locator('.overview-other-rooms summary').click();assert(await p.locator('[data-overview-room]:visible').count()===11,'Expand other rooms');assert(await p.getByText('Hide rooms',{exact:true}).isVisible(),'Disclosure label');
 await p.locator('.overview-other-rooms summary').click();assert(await p.locator('[data-overview-room]:visible').count()===3,'Collapse other rooms');
 for(const link of await p.locator('a[href]').evaluateAll(links=>[...new Set(links.map(e=>e.getAttribute('href')))])){if(!link||/^(#|https?:|mailto:)/.test(link))continue;try{await stat(path.join(root,link.split(/[?#]/)[0]))}catch{issues.push('Home missing link: '+link)}}
 await p.getByRole('link',{name:'Chat in Chanom Friends',exact:true}).click();await p.waitForURL('**/room-chanom.html');
 await p.locator('[data-workspace-action="inbox"]').click();await p.waitForURL('**/inbox.html');assert(await p.locator('[data-ui-popover]').isVisible(),'Inbox action');
 await p.goto(base+'home-dashboard.html');await p.getByRole('button',{name:'You',exact:true}).click();await p.waitForURL('**/profile-menu.html');await p.getByRole('menuitem',{name:'Character & settings',exact:true}).click();await p.waitForURL('**/settings-profile.html');
}catch(e){issues.push(e.stack||e.message)}finally{await b.close()}
await writeFile(path.join(out,'verification.json'),JSON.stringify({issues,pages:manifest.homeOverviewRevision.files.length,views},null,2));console.log(JSON.stringify({issues,pages:manifest.homeOverviewRevision.files.length,responsiveViews:views.length},null,2));if(issues.length)process.exitCode=1;
