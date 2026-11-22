// Native disclosure keeps the secondary room collection out of the primary flow.
(() => {
 const details=document.querySelector('.overview-other-rooms');
 if(!details)return;
 details.addEventListener('toggle',()=>{
  const label=details.querySelector('.overview-details-label');
  label.firstChild.textContent=details.open?'Hide rooms':'Show rooms';
 });
})();
