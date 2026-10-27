(() => {
 const form=document.getElementById('adminLoginForm');
 const password=document.getElementById('adminPassword');
 const toggle=document.getElementById('toggleAdminPassword');
 toggle.addEventListener('click',()=>{
  const visible=password.type==='text';
  password.type=visible?'password':'text';
  toggle.textContent=visible?'הצג':'הסתר';
  toggle.setAttribute('aria-label',visible?'הצג סיסמה':'הסתר סיסמה');
 });
 // Submission is handled once by admin.js; preserve native form for iOS Password AutoFill.
})();