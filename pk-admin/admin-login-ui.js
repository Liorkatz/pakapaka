(() => {
 const form=document.getElementById('adminLoginForm');
 const password=document.getElementById('adminPassword');
 const toggle=document.getElementById('toggleAdminPassword');
 form.addEventListener('submit',event=>{event.preventDefault(); if (event.submitter?.id !== 'loginBtn') login();});
 toggle.addEventListener('click',()=>{
  const visible=password.type==='text';
  password.type=visible?'password':'text';
  toggle.textContent=visible?'הצג':'הסתר';
  toggle.setAttribute('aria-label',visible?'הצג סיסמה':'הסתר סיסמה');
 });
 const secondary=document.getElementById('adminSecondaryPassword');
 const secondaryToggle=document.getElementById('toggleSecondaryPassword');
 secondaryToggle.addEventListener('click',()=>{
  const visible=secondary.type==='text';
  secondary.type=visible?'password':'text';
  secondaryToggle.textContent=visible?'הצג':'הסתר';
 });
 secondary.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login();}});
})();