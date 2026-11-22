// Preserve the popup reference and reuse its existing notification content in a full page.
import{readFile,writeFile,copyFile}from'node:fs/promises';
import{createRequire}from'node:module';
import{fileURLToPath}from'node:url';
import path from'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const require=createRequire(path.join(manifest.source,'package.json'));const{chromium}=require('playwright');const prettier=require('prettier');
const original=await readFile(path.join(root,'inbox.html'),'utf8');
if(!original.includes('data-ui-popover'))throw Error('Inbox is already a full page. Edit its HTML directly.');
await copyFile(path.join(root,'inbox.html'),path.join(root,'inbox-popup.html'));
const b=await chromium.launch({channel:'msedge',args:['--mute-audio']});const p=await b.newPage();await p.route('**/*',r=>r.abort());
try{
 await p.setContent(original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const output=await p.evaluate(()=>{
  const rail=document.querySelector('.app-rail').cloneNode(true);
  rail.querySelectorAll('.is-active,[aria-current]').forEach(e=>{e.classList.remove('is-active');e.removeAttribute('aria-current');});
  const inbox=rail.querySelector('[data-ui-go="inbox.html"]');inbox.classList.add('is-active');inbox.setAttribute('aria-current','page');
  const paths={check:'<path d="m4 12 5 5L20 6m-9 11 3-3m0-6 2-2"/>',settings:'<path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m7 12h4"/>',single:'<path d="m5 12 4 4L19 6"/>'};
  const icon=(name,cls='')=>`<svg class="inbox-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const kinds=['Gift','Mention','Friend request','Room requests','Event reminder','Room availability','Room invite','Request approved','Account notice'];
  const colors=['#7758c4','#a75230','#aa356a','','','','#327751'];
  const rows=[...document.querySelector('[data-ui-popover]').querySelectorAll('a')].map((a,i)=>{
   const avatar=a.firstElementChild.cloneNode(true);avatar.classList.add('notification-avatar');avatar.style.width='44px';avatar.style.height='44px';
   if(colors[i]){avatar.firstElementChild.style.background=colors[i];avatar.firstElementChild.style.fontSize='17px';}
   const body=a.children[1].cloneNode(true),time=body.lastElementChild.textContent.trim();body.lastElementChild.remove();
   const content=body.innerHTML,unread=!!a.querySelector('[aria-label="New"]');
   return `<article class="notification-row" data-notification="${i}" data-unread="${unread}"><a class="notification-link" href="${a.getAttribute('href')}">${avatar.outerHTML}<div class="notification-copy"><p class="notification-message">${content}</p><p class="notification-context"><span>${kinds[i]}</span><span class="notification-inline-time">· ${time}</span></p></div></a><div class="notification-meta"><span class="notification-time">${time}</span><button type="button" class="notification-read" data-notification-read aria-label="Mark notification ${i+1} as ${unread?'read':'unread'}" title="Mark as ${unread?'read':'unread'}"><span class="notification-dot"></span>${icon('single','notification-check')}</button></div></article>`;
  });
  document.title='Inbox · Connecta UI';document.documentElement.removeAttribute('data-ui-layout');
  document.body.className='app-bg ui-with-rail';document.body.removeAttribute('data-ui-back');
  document.body.innerHTML=`<div class="rail-page-layout">${rail.outerHTML}<main class="rail-page-content inbox-content" aria-labelledby="inbox-title"><div class="inbox-page"><header class="inbox-page-header"><div class="inbox-heading-row"><div><h1 id="inbox-title">Inbox <span class="inbox-title-count" data-inbox-count>4 unread</span></h1><p>Updates from your friends and rooms.</p></div><div class="inbox-page-actions"><button type="button" class="inbox-mark-all" data-inbox-mark-all>${icon('check')}Mark all read</button><a class="inbox-settings" href="settings-notifications.html" aria-label="Notification settings" title="Notification settings">${icon('settings')}</a></div></div><div class="inbox-tabs" role="tablist" aria-label="Notification filter"><button type="button" role="tab" id="inbox-all" aria-controls="inbox-feed" aria-selected="true" data-inbox-filter="all">All<span data-inbox-total>9</span></button><button type="button" role="tab" id="inbox-unread" aria-controls="inbox-feed" aria-selected="false" tabindex="-1" data-inbox-filter="unread">Unread<span data-inbox-unread>4</span></button></div></header><div class="inbox-feed" id="inbox-feed" role="tabpanel" aria-labelledby="inbox-all"><section class="notification-group" aria-labelledby="inbox-today"><h2 id="inbox-today">Today</h2><div>${rows.slice(0,7).join('')}</div></section><section class="notification-group" aria-labelledby="inbox-earlier"><h2 id="inbox-earlier">Earlier</h2><div>${rows.slice(7).join('')}</div></section><div class="inbox-empty" hidden>${icon('check')}<h2>You're all caught up</h2><p>No unread notifications. Everything is still available in All.</p><button type="button" data-inbox-show-all>View all notifications</button></div></div><p class="sr-only" role="status" aria-live="polite" data-inbox-status></p></div></main></div><button class="chat-demo-control" aria-label="Demo controls" data-ui-toolbar>Demo</button>`;
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/inbox.css';document.head.append(css);
  for(const src of['assets/theme.js','assets/prototype.js','assets/inbox.js']){const s=document.createElement('script');s.src=src;(src==='assets/theme.js'?document.head:document.body).append(s);}
  return '<!doctype html>\n'+document.documentElement.outerHTML;
 });await writeFile(path.join(root,'inbox.html'),await prettier.format(output,{parser:'html',printWidth:120}));
}finally{await b.close();}
manifest.inboxPageRevision={date:'2026-11-19',file:'inbox.html',previous:'inbox-popup.html',description:'Full-page notifications using existing mock content'};
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
