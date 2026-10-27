(() => {
  const el = id => document.getElementById(id);
  const notice = text => { el('resetMessage').textContent = text; const inline = el('verifyFeedback'); if (inline) inline.textContent = text; };
  const email = 'Liorkatz@gmail.com';
  let recoveryToken = null;
  let secondarySetup = sessionStorage.getItem('pakapaka_secondary_setup') === '1';
  const setupBtn = document.getElementById('setupSecondaryPasswordBtn');
  const resetHeading = document.querySelector('#resetScreen h1');
  const setSecondaryUi = () => { resetHeading.textContent = secondarySetup ? 'הגדרת סיסמת מנהל שנייה' : 'שחזור סיסמה'; };
  setupBtn.addEventListener('click', () => { secondarySetup = true; sessionStorage.setItem('pakapaka_secondary_setup','1'); setSecondaryUi(); showScreen('resetScreen'); });
  document.getElementById('forgotPasswordBtn').addEventListener('click', () => { secondarySetup = false; sessionStorage.removeItem('pakapaka_secondary_setup'); setSecondaryUi(); });
  setSecondaryUi();

  function tokenFromLink(raw) {
    let value = String(raw || '').trim().replace(/&amp;/g, '&');
    if (/^localhost(?::\d+)?\//i.test(value)) value = 'http://' + value;
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol)) return null;
      if (url.protocol === 'http:' && url.hostname !== 'localhost') return null;
      if (url.hostname !== 'localhost' && url.hostname !== location.hostname) return null;
      const values = new URLSearchParams(url.hash.slice(1));
      const token = values.get('access_token');
      if (!token) return null;
      return {token, expiration: Number(values.get('expires_at') || 0)};
    } catch { return null; }
  }

  async function acceptLink(raw) {
    const supplied = String(raw || '').trim();
    let data = tokenFromLink(supplied);
    if (!data && /^\d{6,8}$/.test(supplied)) {
      notice('מאמת קוד חד־פעמי...');
      try {
      const verify = await fetch(SUPABASE_URL + '/auth/v1/verify', {
        method:'POST',
        headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({email,token:supplied,type:'email'}),
        cache:'no-store'
      });
      const result = await verify.json().catch(() => ({}));
      if (!verify.ok || !result.access_token) {
        notice('קוד האימות שגוי או פג תוקף. אפשר להשתמש גם בקישור המלא מהמייל.');
        return;
      }
      data = {token:result.access_token,expiration:0};
      } catch { notice('לא ניתן לתקשר עם שרת האימות. נסה שוב.'); return; }
    }
    if (!data) { notice('הזן קוד אימות בן 6 ספרות, או הדבק את הקישור המלא מהמייל.'); return; }
    if (data.expiration && data.expiration * 1000 <= Date.now()) {
      notice('תוקף קישור האימות פג. יש לבקש קישור חדש.'); return;
    }
    notice('מאמת את הקישור מול השרת...');
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
  }

  el('toggleRecoveryPassword').addEventListener('click', () => {
    const input=el('newAdminPassword'),button=el('toggleRecoveryPassword');
    input.type=input.type==='password'?'text':'password';
    button.textContent=input.type==='password'?'הצג':'הסתר';
  });
  el('forgotPasswordBtn').addEventListener('click', () => showScreen('resetScreen'));
  el('resetCancelBtn').addEventListener('click', () => showScreen('loginScreen'));
  el('useRecoveryLink').addEventListener('click', async () => {
    const button = el('useRecoveryLink');
    if (button.disabled) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'בודק קוד...';
    notice('הבקשה נקלטה. מאמת מול השרת...');
    try { await acceptLink(el('recoveryLink').value); }
    catch { notice('אירעה תקלה באימות הקישור. בדוק חיבור לאינטרנט ונסה שוב.'); }
    finally { button.disabled = false; button.textContent = originalLabel; }
  });

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
    if (password.length < 6 || password.length > 128) { notice('הסיסמה חייבת להכיל 6 עד 128 תווים.'); return; }
    const button = el('saveNewPassword'); button.disabled = true;
    try {
      const response = await fetch(adminRpcUrl(secondarySetup ? 'pakapaka_admin_set_secondary_password' : 'pakapaka_admin_reset_password'),{
        method:'POST',headers:{...headers(),Authorization:'Bearer ' + recoveryToken},
        body:JSON.stringify({p_new_password:password}),cache:'no-store'
      });
      if (!response.ok) throw new Error('החלפת הסיסמה נכשלה. ייתכן שפג תוקף האימות.');
      recoveryToken = null;
      el('newAdminPassword').value = '';
      sessionStorage.removeItem('pakapaka_secondary_setup');
      secondarySetup = false;
      setSecondaryUi();
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      showScreen('loginScreen');
      el('loginError').textContent = 'הסיסמה נשמרה. ניתן להיכנס עם אחת משתי הסיסמאות.';
    } catch(error) { notice(error.message); }
    finally { button.disabled = false; }
  });

  const current = tokenFromLink(location.href);
  if (current) {
    const originalLink = location.href;
    history.replaceState(null, '', location.pathname);
    showScreen('resetScreen');
    acceptLink(originalLink);
  }
})();
