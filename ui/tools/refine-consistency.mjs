// One-time authoring pass on the editable HTML, never on the source application.
import { readFile, writeFile, readdir, cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(path.join(ROOT,'manifest.json'),'utf8'));
const require = createRequire(path.join(manifest.source,'package.json'));
const {chromium} = require('playwright'); const prettier = require('prettier');
const sourceImages = path.join(manifest.source,'demo/public/images');
await mkdir(path.join(ROOT,'assets/project-images'),{recursive:true});
await cp(sourceImages,path.join(ROOT,'assets/project-images'),{recursive:true});
const browser = await chromium.launch({channel:'msedge',args:['--mute-audio']});
const page = await browser.newPage(); await page.route('**/*',r=>r.abort());
const files=(await readdir(ROOT)).filter(f=>f.endsWith('.html')&&!/^home-(old|chat)/.test(f));
const stats=[];
try {
for(const file of files){
 const html=await readFile(path.join(ROOT,file),'utf8');
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 await page.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(({file,scripts})=>{
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
  const svg=(name)=>{
   const paths={
    book:'<path d="M12 7v14M3 3h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6v16h-6a3 3 0 0 0-3 2 3 3 0 0 0-3-2H3z"/>',
    dots:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    exit:'<path d="M9 5H4v14h5m5-14 7 7-7 7M8 12h13"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
    settings:'<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
    shirt:'<path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0z"/>',
    mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/>',
    shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6z"/>',
    leaf:'<path d="M20 3c-7 0-15 1-15 9a6 6 0 0 0 6 6c8 0 9-8 9-15ZM3 21 14 10"/>',
    pointer:'<path d="m4 3 6 18 3-8 8-3zM2 9H0m10-7V0m-7 3L1 1"/>',
    flag:'<path d="M4 22V3m0 1c5-5 11 5 16 0v10c-5 5-11-5-16 0"/>',
    gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13m0-13C0 8 8-4 12 8c4-12 12 0 0 0"/>',
    chat:'<path d="M21 11a9 9 0 0 1-9 9 12 12 0 0 1-5-1l-5 3 2-6a9 9 0 1 1 17-5z"/>',
    heart:'<path d="M20 4c-3-3-7-1-8 1-1-2-5-4-8-1-6 6 8 17 8 17S26 10 20 4z"/>',
    music:'<path d="M9 18V5l12-3v13M9 8l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    users:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-18a4 4 0 0 1 0 8m3 10v-3a7 7 0 0 0-3-6"/>',
   };
   return `<svg class="ui-line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.book}</svg>`;
  };
  if(file==='focus.html'){
   const root=$('main > div'); root.classList.add('focus-page','consistent-page');
   const hero=root.firstElementChild; hero.classList.add('focus-summary');
   hero.querySelector(':scope > span')?.remove();
   const copy=hero.querySelector(':scope > div'); copy.classList.add('focus-summary-copy');
   copy.children[0].classList.add('focus-period'); copy.children[1].classList.add('focus-total');
   const h=document.createElement('h1');h.textContent='Focus';h.className='consistent-title';root.prepend(h);
   root.querySelector(':scope > div').classList.add('focus-details');
   hero.querySelector('a').classList.add('focus-study-link');
   root.querySelectorAll('ol > li > span:first-child').forEach((e,i)=>e.textContent=String(i+1));
  }
  if(file==='plus.html'){
   const root=$('main > div');root.classList.add('plus-page','consistent-page');
   const hero=root.firstElementChild;hero.classList.add('plus-summary');
   hero.querySelectorAll(':scope > svg').forEach(e=>e.remove());
   const layout=hero.querySelector(':scope > div');layout.classList.add('plus-summary-layout');
   const copy=layout.firstElementChild;copy.classList.add('plus-summary-copy');
   const heading=copy.querySelector('h1');heading.classList.add('consistent-title');
   heading.querySelectorAll('br').forEach(br=>br.replaceWith(document.createTextNode(' ')));
   const art=layout.lastElementChild;art.classList.add('plus-character');
   art.querySelectorAll(':scope > span,:scope > div:first-child').forEach(e=>e.remove());
   root.querySelectorAll(':scope > section > div.text-center').forEach(e=>{e.classList.add('plus-section-heading');e.querySelector(':scope > p')?.remove();});
   const benefits=root.children[1];benefits.classList.add('plus-benefits');
   benefits.lastElementChild.classList.add('plus-benefit-grid');
  }
  if(file.startsWith('discover')){
   const intro=$('.discover-intro'),search=$('.discover-search');
   if(intro&&search){$('.discover-featured')?.remove();intro.append(search);intro.classList.add('discover-search-layout');}
  }
  let hud=false;
  for(const surface of $$('.ui-desktop,.ui-phone')){
   const card=surface.querySelector('button[aria-label^="Room:"]');
   const controls=surface.querySelector('nav[aria-label="Controls"]');
   if(!card||!controls)continue;
   hud=true;const phone=surface.classList.contains('ui-phone');const suffix=phone?'phone':'desktop';
   const identity=card.parentElement;identity.classList.add('room-hud-identity');
   card.classList.add('room-hud-card');card.classList.remove('panel');card.querySelector(':scope > span:first-child')?.remove();card.querySelector('svg')?.remove();
   const leave=document.createElement('button');leave.className='room-hud-leave';leave.setAttribute('aria-label','Leave room');leave.dataset.uiGo='home.html';leave.innerHTML=svg('exit');identity.prepend(leave);
   const people=surface.querySelector('button[aria-label^="In this room"]');
   if(people){
    const cluster=people.parentElement.parentElement;cluster.classList.add('room-hud-presence');
    people.classList.add('room-hud-people');
    const more=document.createElement('button');more.className='room-hud-more panel';more.setAttribute('aria-label','Room menu');more.setAttribute('popovertarget','room-menu-'+suffix);more.innerHTML=svg('dots');cluster.append(more);
   }else{
    const cluster=document.createElement('div');cluster.className='room-hud-presence';cluster.innerHTML=`<button class="room-hud-more panel" aria-label="Room menu" popovertarget="room-menu-${suffix}">${svg('dots')}</button>`;card.closest('.relative.min-w-0')?.append(cluster);
   }
   const tools=surface.querySelector('nav[aria-label="Room tools"]');tools?.parentElement.classList.add('room-hud-tool-column');
   const chat=surface.querySelector('[data-ui-chat-panel]');chat?.classList.add('room-hud-chat');chat?.parentElement.classList.add('room-hud-chat-position');
   controls.classList.add('room-hud-dock');
   const zoom=surface.querySelector('[aria-label="Zoom out"]');zoom?.parentElement.classList.add('room-hud-zoom');
   const roomButton=controls.querySelector('[aria-label="Room tools"]');
   if(roomButton){roomButton.removeAttribute('data-ui-go');roomButton.setAttribute('popovertarget','room-menu-'+suffix);}
   if(file==='walk-tools.html')surface.querySelectorAll('[data-ui-popover]').forEach(e=>e.remove());
   const panel=document.createElement('div');panel.id='room-menu-'+suffix;panel.className='room-settings-popover';panel.setAttribute('popover','auto');panel.setAttribute('aria-label','Room menu');
   panel.innerHTML=`<div class="hud-menu-heading"><strong>This room</strong><span>for everyone</span></div><div class="hud-room-actions"><button class="hud-invite" data-hud-preview>${svg('link')}Invite</button><button data-hud-preview>${svg('settings')}Room settings</button></div><section class="hud-personal"><div class="hud-menu-heading"><strong>Your settings</strong><span>only you</span></div><div class="hud-personal-grid"><button data-hud-preview>${svg('shirt')}My look</button><button data-hud-preview>${svg('mic')}Voice &amp; sound</button><button data-hud-preview>${svg('bell')}Notifications</button><button data-hud-preview>${svg('shield')}Privacy</button></div><button class="hud-setting-toggle" aria-pressed="false">${svg('leaf')}<span>Battery saver</span><b>Off</b></button><button class="hud-setting-toggle" aria-pressed="true">${svg('pointer')}<span>Click to walk</span><b>On</b></button><button class="hud-all-settings" data-hud-preview>All your settings →</button></section><button class="hud-report" data-hud-preview>${svg('flag')}Report this room</button>`;
   surface.append(panel);
  }
  // Product artwork and room covers come directly from the owner's source project.
  const productImages={'Strawberry Dress':'strawberry-dress','Matcha Hoodie':'matcha-hoodie','Starry Pajamas':'starry-pajamas','School Uniform':'school-uniform','Bunny Ears':'bunny-ears','Flower Crown':'flower-crown','Round Glasses':'round-glasses','Cat Ears':'cat-ears','Pet Kitten':'pet-cat','Pet Duckling':'pet-duck','Pet Bunny':'pet-bunny','Sakura Photo Frame':'frame-sakura','Polaroid Frame':'frame-polaroid'};
  const emoji=/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
  const onlyEmoji=t=>t.replace(emoji,'').replace(/[\s\uFE0F\u200D]/g,'')==='';
  const nodes=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);
  let replacements=0;
  for(const node of nodes){
   if(!node.parentElement||node.parentElement.closest('script,style,svg'))continue;
   const text=node.textContent;emoji.lastIndex=0;if(!emoji.test(text))continue;
   const el=node.parentElement;const plain=text.trim();
   if(onlyEmoji(plain)){
    const context=el.closest('.shop-product-card')||el.closest('button,a')||el.parentElement;
    const contextText=context?.textContent||'';
    const product=Object.entries(productImages).find(([name])=>contextText.includes(name));
    const visual=product||el.closest('.shop-feature-art,.chat-avatar,.room-emoji,.room-peek-face')||/text-(?:[2-9]xl|\[9rem\])|size-(?:10|11|12|14|16)/.test(el.className)||el.classList.contains('chat-room-icon');
    if(visual){
     let src,alt;
     if(product){src='shop/'+product[1];alt=product[0];}
     else if(el.closest('.shop-feature-art')){src='shop/pet-duck';alt='Pet Duckling';}
     else {const kind=/café|cafe|☕|🐈/i.test(contextText+plain)?'cafe':/rooftop|🌙/i.test(contextText+plain)?'rooftop':'library';src='covers/'+kind;alt=kind==='cafe'?'Cat Café':kind==='rooftop'?'Starry Rooftop':'Cosy Library';}
     const img=document.createElement('img');img.src='assets/project-images/'+src+'.webp';img.alt=alt;img.className='project-art';img.loading='lazy';
     el.classList.add('project-art-holder');if(src.startsWith('covers/'))el.classList.add('project-cover-holder');node.replaceWith(img);
    }else{
     const icon=/🎙|🔇/.test(plain)?'mic':/⏱|🍅|🕐/.test(plain)?'clock':/🎧|🎸/.test(plain)?'music':/💬/.test(plain)?'chat':/🎁/.test(plain)?'gift':/👀|🍪|👍/.test(plain)?'heart':/🚪/.test(plain)?'exit':'book';
     const holder=document.createElement('span');holder.className='ui-inline-icon';holder.innerHTML=svg(icon);node.replaceWith(holder);
    }
   }else{
    let clean=text.replace(emoji,'').replace(/\uFE0F|\u200D/g,'');
    if(/^\s*You:\s*$/.test(clean))clean='You: Sounds good.';
    node.textContent=clean;
   }
   replacements++;
  }
  for(const e of $$('*'))for(const a of [...e.attributes]){if(['class','style','src','href'].includes(a.name))continue;emoji.lastIndex=0;if(emoji.test(a.value))e.setAttribute(a.name,a.value.replace(emoji,'').replace(/\uFE0F|\u200D/g,''));}
  if(!$('link[href="assets/ui-consistency.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='assets/ui-consistency.css';document.head.append(link);}
  if(hud)scripts.push('assets/room-hud.js');
  for(const src of [...new Set(scripts)]){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return {html:'<!doctype html>\n'+document.documentElement.outerHTML,replacements,hud};
 },{file,scripts});
 await writeFile(path.join(ROOT,file),await prettier.format(result.html,{parser:'html',printWidth:120}));
 stats.push({file,replacements:result.replacements,hud:result.hud});
}
}finally{await browser.close();}
manifest.uiConsistencyRevision={date:'2026-11-17',sourceImages,files:stats};
await writeFile(path.join(ROOT,'manifest.json'),JSON.stringify(manifest,null,2));
await writeFile(path.join(ROOT,'assets/project-images/source.json'),JSON.stringify({source:sourceImages,copiedOn:'2026-11-17',note:'Existing project artwork, copied without image generation. Room runtime backgrounds retain real demo captures.'},null,2));
console.log(`Updated ${stats.length} pages; ${stats.reduce((n,s)=>n+s.replacements,0)} emoji contexts replaced.`);
