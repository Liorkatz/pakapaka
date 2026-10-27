(() => {
  const el = id => document.getElementById(id);
  const notice = text => { el('resetMessage').textContent = text; };
  const email = 'Liorkatz@gmail.com';
  let recoveryToken = null;

  function tokenFromLink(raw) {
    const value = String(raw || '').trim().replace(/&amp;/g, '&');
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
      const values = new URLSearchParams(url.hash.slice(1));
      const token = values.get('access_token');
      if (!token) return null;
      return {token, expiration: Number(values.get('expires_at') || 0)};
    } catch { return null; }
  }

  async function acceptLink(raw) {
    const data = tokenFromLink(raw);
    if (!data) { notice('הקישור לא מכיל אסימון אימות תקין. יש להעתיק את כל שורת הכתובת.'); return; }
    if (data.expiration && data.expiration * 1000 <= Date.now()) {
      notice('תוקף קישור האימות פג. יש לבקש קישור חדש.'); return;
    }
    notice('מאמת את הקישור מול השרת...');
    const button = el('useRecoveryLink');
    button.disabled = true;
    try {
      const result = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + data.token },
        cache: 'no-store'
      });
      if (!result.ok) throw new Error('הקישור אינו פעיל או שפג תוקפו. בקש קישור חדש.');
      const user = await result.json();
      if (String(user.email || '').toLowerCase() !== email.toLowerCase() || !user.email_confirmed_at) {
        throw new Error('קישור האימות אינו שייך למנהל המורשה.');
      }
      recoveryToken = data.token;
      el('recoveryLink').value = '';
      el('recoveryFallback').hidden = true;
      el('sendResetBtn').hidden = true;
      el('setNewPassword').hidden = false;
      notice('האימות הצליח. כעת בחר סיסמה חדשה.');
    } catch(error) { notice(error.message || 'לא ניתן לאמת את הקישור.'); }
    finally { button.disabled = false; }
  }

  el('forgotPasswordBtn').addEventListener('click', () => showScreen('resetScreen'));
  el('resetCancelBtn').addEventListener('click', () => showScreen('loginScreen'));
  el('useRecoveryLink').addEventListener('click', () => acceptLink(el('recoveryLink').value));

  el('sendResetBtn').addEventListener('click', async () => {
    const button = el('sendResetBtn'); button.disabled = true;
    try {
      const redirectTo = location.origin + location.pathname + '?password_reset=1';
      const response = await fetch(SUPABASE_URL + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirectTo), {
        method:'POST',headers:{apikey: SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,create_user:false}),cache:'no-store'
      });
      if (response.status === 429) throw new Error('מכסת שליחת המיילים מוצתה זמנית. נסה שוב לאחר חידוש המכסה.');
      if (!response.ok) throw new Error('לא ניתן לשלוח אימות למייל כרגע.');
      notice('נשלח אימייל אימות. אם הוא מפנה ל-localhost, הדבק כאן את הקישור המלא שנפתח.');
    } catch(error) { notice(error.message); }
    finally { button.disabled = false; }
  });

  el('saveNewPassword').addEventListener('click', async () => {
    const password = el('newAdminPassword').value;
    if (!recoveryToken) { notice('קודם יש לאמת קישור למייל.'); return; }
    if (password.length < 12 || password.length > 128) { notice('הסיסמה חייבת להכיל 12 עד 128 תווים.'); return; }
    const button = el('saveNewPassword'); button.disabled = true;
    try {
      const response = await fetch(adminRpcUrl('pakapaka_admin_reset_password'),{
        method:'POST',headers:{...headers(),Authorization:'Bearer ' + recoveryToken},
        body:JSON.stringify({p_new_password:password}),cache:'no-store'
      });
      if (!response.ok) throw new Error('החלפת הסיסמה נכשלה. ייתכן שפג תוקף האימות.');
      recoveryToken = null;
      el('newAdminPassword').value = '';
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      showScreen('loginScreen');
      el('loginError').textContent = 'הסיסמה שונתה בהצלחה. היכנס עם הסיסמה החדשה.';
    } catch(error) { notice(error.message); }
    finally { button.disabled = false; }
  });

  const current = tokenFromLink(location.href);
  if (current) {
    history.replaceState(null, '', location.pathname);
    showScreen('resetScreen');
    acceptLink(location.href === '' ? '' : location.href);
  }
})();
