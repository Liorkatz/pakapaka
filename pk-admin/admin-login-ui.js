(() => {
 const form=document.getElementById('adminLoginForm');
 const password=document.getElementById('adminPassword');
 const toggle=document.getElementById('toggleAdminPassword');
 form.addEventListener('submit',event=>{event.preventDefault();});
 toggle.addEventListener('click',()=>{
  const visible=password.type==='text';
  password.type=visible?'password':'text';
  toggle.textContent=visible?'הצג':'הסתר';
  toggle.setAttribute('aria-label',visible?'הצג סיסמה':'הסתר סיסמה');
 });
})();