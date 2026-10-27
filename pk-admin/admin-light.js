(function(){
 function initLightDashboard(){
  const dashboard=document.getElementById('dashboardScreen');
  if(!dashboard||dashboard.querySelector('.adminNav'))return;
  const header=dashboard.querySelector('.adminHeader');
  const cards=dashboard.querySelector('.cardsGrid');
  const top=dashboard.querySelector('.topDepartmentCard');
  const blocks=[...dashboard.querySelectorAll('.panelBlock')];
  const requests=blocks.find(x=>x.querySelector('#managerRequestList'));
  const managers=blocks.find(x=>x.querySelector('#activeManagerList'));
  const inbox=blocks.find(x=>x.querySelector('#developerInbox'));
  const departments=blocks.find(x=>x.querySelector('#departmentsList'));
  if(cards&&header)header.after(cards);
  if(top&&cards)cards.after(top);
  if(departments&&top)top.after(departments);
  if(requests&&departments)departments.after(requests);
  if(managers&&requests)requests.after(managers);
  if(inbox&&managers)managers.after(inbox);
  const nav=document.createElement('nav');nav.className='adminNav';nav.setAttribute('aria-label','ניווט פאנל ניהול');
  const items=[['סקירה',cards],['מחלקות',departments],['בקשות מנהלים',requests],['מנהלי מחלקות',managers],['הודעות למפתח',inbox]];
  for(const [label,target] of items){if(!target)continue;const button=document.createElement('button');button.type='button';button.textContent=label;
   button.onclick=()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));button.classList.add('active');target.scrollIntoView({behavior:'smooth',block:'start'});};
   nav.appendChild(button);}
  if(nav.firstElementChild)nav.firstElementChild.classList.add('active');
  header.after(nav);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initLightDashboard);
 else initLightDashboard();
})();
