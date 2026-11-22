// One-time UI experiment. Preserves the original Home comparison files.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const rooms=JSON.parse(await readFile(path.join(root,'tools/chat-content.json'),'utf8')).filter(r=>r.kind==='room');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const clean=s=>s.replace(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?/gu,'').trim();
const icon=name=>`<svg class="overview-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${name==='walk'?'<path d="M10 3H4v18h6m5-16 7 7-7 7M8 12h14"/>':name==='chat'?'<path d="M21 11a9 9 0 0 1-9 9 12 12 0 0 1-5-1l-5 3 2-6a9 9 0 1 1 17-5z"/>':name==='plus'?'<path d="M12 5v14M5 12h14"/>':'<path d="m9 5 7 7-7 7"/>'}</svg>`;
const kind=r=>/café|cafe/i.test(r.summary)?'cafe':/rooftop/i.test(r.summary)?'rooftop':'library';
const homeCard=r=>{
 const count=+(r.summary.match(/(\d+)\//)?.[1]||0),full=/full/.test(r.summary),map=clean(r.summary).split(' · ')[0];
 const people=r.groups?.[0]?.members||[];
 const names=people.length?people.slice(0,2).map(m=>m.name).join(', ')+(people.length>2?` +${people.length-2}`:''):count?`${count} people inside`:'No one inside';
 const presence=people.length?`<span class="overview-faces">${people.slice(0,3).map((m,i)=>`<span style="--face-color:${['#7758c4','#b3612f','#327f68'][i]}">${escape(m.name[0])}</span>`).join('')}</span>`:'';
 const img=r.id==='room-chanom'?'assets/captures/library-social-cover.png':`assets/project-images/covers/${kind(r)}.webp`;
 return `<article class="overview-room-card" data-overview-room="${r.id}"><a class="overview-cover" href="${r.file}" aria-label="Open ${escape(r.name)}"><img src="${img}" alt="${escape(map)} room preview"><span class="overview-count ${count?'has-people':''}"><i></i>${count} inside${full?' · full':''}</span></a><div class="overview-card-body"><h3><a href="${r.file}">${escape(r.name)}</a></h3><p class="overview-map">${escape(map)}</p><div class="overview-presence">${presence}<span>${escape(names)}</span></div><div class="overview-card-actions">${full?'<button class="overview-walk" disabled>Room full</button>':`<a class="overview-walk" href="${r.walk||'walk-library.html'}">${icon('walk')}Walk in</a>`}<a class="overview-chat" href="${r.file}" aria-label="Chat in ${escape(r.name)}">${icon('chat')}Chat</a></div></div></article>`;
};
const topIds=['room-chanom','room-werewolf','room-ielts-buddies'];
const top=topIds.map(id=>rooms.find(r=>r.id===id)),other=rooms.filter(r=>!topIds.includes(r.id));
const common=[['Library','Quiet study · text only','142','library','common-library-2.html'],['Cat Café','Chill and chat · text only','57','cafe','common-cafe-2.html'],['Starry Rooftop','Late night talks · text only','3','rooftop','common-rooftop-1.html']];
const commonCards=common.map(([name,description,count,art,href])=>`<article class="overview-room-card overview-public-card"><a class="overview-cover" href="${href}" aria-label="Enter ${name}"><img src="assets/project-images/covers/${art}.webp" alt="${name} artwork"><span class="overview-count has-people"><i></i>${count} here</span></a><div class="overview-card-body"><h3>${name}</h3><p class="overview-map">${description}</p><a class="overview-walk" href="${href}">${icon('walk')}Walk in</a></div></article>`).join('');
const publicRooms=[['Game Night Club','Werewolf, cards and drawing','41 / 50 inside · Thai','library','room-gamenight.html','walk-rooftop.html'],['Lo-fi Study Hall','Quiet company while you study','96 / 100 inside · English','library','discover.html','walk-library.html'],['IELTS Speaking Café','Practise speaking in small groups','9 / 25 inside · English','cafe','discover.html','discover.html']];
const openCards=publicRooms.map(([name,description,presence,art,chat,walk])=>`<article class="overview-room-card overview-public-card"><a class="overview-cover" href="${chat}" aria-label="View ${name}"><img src="assets/project-images/covers/${art}.webp" alt="Room artwork"><span class="overview-count">Open room</span></a><div class="overview-card-body"><h3>${name}</h3><p class="overview-map">${description}</p><p class="overview-open-presence">${presence}</p><a class="overview-walk" href="${walk}">${icon('walk')}${name==='IELTS Speaking Café'?'Ask to join':name==='Lo-fi Study Hall'?'Join &amp; walk in':'Walk in'}</a></div></article>`).join('');
function home(guest=false){return `<div class="home-overview" data-home-overview${guest?' data-new-user="true"':''}><p class="overview-intro">${guest?'Choose a Common room or meet people in an Open room.':'Join your friends or find a room to settle into.'}</p>${guest?'':`<section class="overview-section" aria-labelledby="your-rooms-title"><div class="overview-section-heading"><div><h2 id="your-rooms-title">Your rooms</h2><p>Start with a room that has people inside.</p></div><a class="overview-create" href="create-room.html">${icon('plus')}Make a room</a></div><div class="overview-room-grid">${top.map(homeCard).join('')}</div></section>`}<section class="overview-section" aria-labelledby="common-rooms-title"><div class="overview-section-heading"><div><h2 id="common-rooms-title">Common rooms</h2><p>By Connecta. Anyone can walk in.</p></div></div><div class="overview-room-grid">${commonCards}</div></section><section class="overview-section" aria-labelledby="open-rooms-title"><div class="overview-section-heading"><div><h2 id="open-rooms-title">Open rooms</h2><p>Made by people. Find a group doing your thing.</p></div><a class="overview-view-all" href="discover.html">Explore rooms${icon('chevron')}</a></div><div class="overview-room-grid">${openCards}</div></section>${guest?'<p class="overview-first-room">Your rooms will appear here after you join one.</p>':`<details class="overview-other-rooms"><summary><span><strong>Your other rooms</strong><span class="overview-other-count">${other.length}</span></span><span class="overview-details-label">Show rooms${icon('chevron')}</span></summary><div class="overview-room-grid">${other.map(homeCard).join('')}</div></details>`}</div>`;}
const browser=await chromium.launch({channel:'msedge',args:['--mute-audio']});const page=await browser.newPage();await page.route('**/*',r=>r.abort());
const files=(await readdir(root)).filter(f=>f.endsWith('.html')&&!/home-old|home-chat/.test(f));
// The signed-in and new-user previews share the same shell and card component.
await writeFile(path.join(root,'home-dashboard-guest.html'),await readFile(path.join(root,'home-dashboard.html'),'utf8'));files.push('home-dashboard-guest.html');
const changed=[];
try{for(const file of files){
 const html=await readFile(path.join(root,file),'utf8');if(!html.includes('class="app-rail"'))continue;
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const result=await page.evaluate(({file,scripts,homeMarkup})=>{
  const rail=document.querySelector('.app-rail');if(!rail)return null;
  const root=rail.parentElement;root.classList.add('workspace-shell');
  const get=destination=>[...rail.querySelectorAll('[href],[data-ui-go]')].find(e=>e.getAttribute('href')===destination||e.dataset.uiGo===destination);
  const actions=document.createElement('div');actions.className='workspace-account-actions';
  for(const [id,label]of[['shop','Shop'],['plus','Plus'],['inbox','Inbox']]){
   const item=get(id+'.html');if(!item)continue;item.classList.remove('rail-link');item.classList.add('workspace-action');item.dataset.workspaceAction=id;
   item.setAttribute('aria-label',id==='inbox'?'Inbox, 4 new':label);actions.append(item);
  }
  get('settings-profile.html')?.remove();
  rail.querySelector('.rail-brand').setAttribute('href','home-dashboard.html');
  rail.querySelectorAll('[aria-current]').forEach(e=>{if(!e.classList.contains('is-active'))e.removeAttribute('aria-current');});
  const isHome=file.startsWith('home-dashboard');
  if(isHome){
   document.documentElement.dataset.uiPage=file.replace('.html','');document.title='Home · Connecta UI';
   const main=document.querySelector('main');main.className='rail-page-content home-overview-content';main.innerHTML=homeMarkup;
  }
  const active=rail.querySelector('.rail-link.is-active');
  const label=isHome?'Home':active?.querySelector(':scope > span:last-child')?.textContent.trim()||document.title.split(' · ')[0];
  const toolbar=document.createElement('header');toolbar.className='workspace-toolbar';toolbar.setAttribute('aria-label','Page and account');
  const title=document.createElement(isHome?'h1':'span');title.className='workspace-context-title';if(isHome)title.classList.add('is-home-title');title.textContent=label;toolbar.append(title,actions);root.insertBefore(toolbar,rail.nextSibling);
  if(file==='shop.html'||file.startsWith('shop-')){ /* Keep product preview/catalogue layout intact below shared chrome. */ }
  if(!document.querySelector('link[href="assets/home-overview.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='assets/home-overview.css';document.head.append(css);}
  // The profile menu already exposes Character & settings.
  if(file==='home-dashboard-guest.html'){
   const profile=rail.querySelector('.rail-profile');profile.querySelector('.chat-avatar > span').textContent='G';profile.lastElementChild.textContent='Guest';profile.setAttribute('aria-label','Guest account');
   actions.querySelector('[data-workspace-action="inbox"]')?.remove();
  }
  for(const src of [...new Set(scripts)]){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  if(isHome){const s=document.createElement('script');s.src='assets/home-overview.js';document.body.append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 },{file,scripts,homeMarkup:home(file==='home-dashboard-guest.html')});
 if(result){await writeFile(path.join(root,file),await prettier.format(result,{parser:'html',printWidth:120}));changed.push(file);}
}}finally{await browser.close();}
manifest.homeOverviewRevision={date:'2026-11-18',files:changed,home:'home-dashboard.html',newUser:'home-dashboard-guest.html'};
if(!manifest.pages.some(p=>p.file==='home-dashboard-guest.html'))manifest.pages.push({id:'home-dashboard-guest',file:'home-dashboard-guest.html',title:'Home · new user',group:'Main'});
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(root,'assets/pages.js'),`window.UI_PAGES = ${JSON.stringify(manifest.pages,null,2)};\n`);
console.log(`Updated ${changed.length} pages with shared account actions and the Home overview.`);
