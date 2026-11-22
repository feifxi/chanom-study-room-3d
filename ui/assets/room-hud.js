// HUD layout previews only. No room, media or multiplayer runtime is added.
(() => {
  const menus=[...document.querySelectorAll('.room-settings-popover')];
  const mobile=()=>matchMedia('(max-width: 767px), (max-height: 500px)').matches;
  document.querySelectorAll('.room-hud-dock').forEach(dock=>{
    [...dock.querySelectorAll('button')].forEach((button,index)=>{
      if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',['Mic off','Sound','Chat','Photo','Activities','Room'][index]);
    });
  });
  if(document.documentElement.dataset.uiPage==='walk-tools') menus.find(m=>m.id===(mobile()?'room-menu-phone':'room-menu-desktop'))?.showPopover();
  addEventListener('resize',()=>menus.forEach(m=>{if(m.matches(':popover-open'))m.hidePopover();}));
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('.hud-setting-toggle');
    if(toggle){const on=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(on));toggle.querySelector('b').textContent=on?'On':'Off';return;}
    if(!event.target.closest('[data-hud-preview]'))return;
    document.querySelector('.ui-preview-toast')?.remove();
    const toast=document.createElement('div');toast.className='ui-preview-toast';toast.role='status';toast.textContent='UI preview';document.body.append(toast);setTimeout(()=>toast.remove(),1500);
  });
})();
