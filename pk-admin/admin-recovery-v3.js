(() => {
 const $ = id => document.getElementById(id);
 const email = 'Liorkatz@gmail.com';
 const message = value => { $('resetMessage').textContent = value; };
 let verifiedAccessToken = '';
 const resetButton = $('saveNewPassword');
 const showReady = token => {
   verifiedAccessToken = token;
   $('setNewPassword').hidden = false;
   $('recoveryFallback').hidden = true;
   $('sendResetBtn').hidden = true;
   $('recoveryLink').value = '';
   message('האימות נקלט. אפשר לבחור סיסמה חדשה.');
 };
 const readToken = text => {
   try {
     const address = new URL(text.trim());
     if (!['http:', 'https:'].includes(address.protocol)) return '';
     const hash = new URLSearchParams(address.hash.slice(1));
     return hash.get('access_token') || '';
   } catch { return ''; }
 };
 $('forgotPasswordBtn').addEventListener('click', () => showScreen('resetScreen'));
 $('resetCancelBtn').addEventListener('click', () => showScreen('loginScreen'));
 $('sendResetBtn').addEventListener('click', async () => {
   const button = $('sendResetBtn');
   button.disabled = true;
   message('');
   try {
     const target = location.origin + location.pathname + '?password_reset=1';
     const response = await fetch(SUPABASE_URL + '/auth/v1/otp?redirect_to=' + encodeURIComponent(target), {
       method: 'POST', headers: {'apikey': SUPABASE_KEY, 'Content-Type': 'application/json'},
       body: JSON.stringify({email, create_user: false}), cache: 'no-store'
     });
     if (!response.ok) throw new Error('שליחת האימות נכשלה. נסה שוב.');
     message('נשלח קישור למייל. אם נפתח localhost, העתק את הכתובת והדבק בשדה למטה.');
   } catch(error) { message(error.message); }
   finally { button.disabled = false; }
 });
 $('useRecoveryLink').addEventListener('click', () => {
   const token = readToken($('recoveryLink').value);
   if (!token) { message('לא נמצא בקישור אסימון אימות. העתק את הכתובת המלאה אחרי פתיחת הקישור במייל.'); return; }
   showReady(token);
 });
 const currentToken = readToken(location.href);
 if (currentToken && (location.search.includes('password_reset') || location.hash.includes('type=magiclink'))) {
   history.replaceState(null, '', location.pathname);
   showScreen('resetScreen');
   showReady(currentToken);
 }
 resetButton.addEventListener('click', async () => {
   const password = $('newAdminPassword').value;
   if (password.length < 12 || password.length > 128) {
     message('הסיסמה חייבת להכיל 12 עד 128 תווים.'); return;
   }
   resetButton.disabled = true;
   try {
     const response = await fetch(adminRpcUrl('pakapaka_admin_reset_password'), {
       method: 'POST', headers: {...headers(), Authorization: 'Bearer ' + verifiedAccessToken},
       body: JSON.stringify({p_new_password: password}), cache: 'no-store'
     });
     if (!response.ok) throw new Error('האימות פג או נדחה. בקש קישור חדש למייל.');
     $('newAdminPassword').value = '';
     verifiedAccessToken = '';
     sessionStorage.removeItem(ADMIN_SESSION_KEY);
     showScreen('loginScreen');
     $('loginError').textContent = 'הסיסמה עודכנה. היכנס עם הסיסמה החדשה.';
   } catch(error) { message(error.message); }
   finally { resetButton.disabled = false; }
 });
})();