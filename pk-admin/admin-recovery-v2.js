(() => {
  const email = 'Liorkatz@gmail.com';
  const $ = id => document.getElementById(id);
  const msg = text => { $('resetMessage').textContent = text; };
  const authHeaders = () => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' });
  $('forgotPasswordBtn').addEventListener('click', () => showScreen('resetScreen'));
  $('resetCancelBtn').addEventListener('click', () => showScreen('loginScreen'));

  $('sendResetBtn').addEventListener('click', async () => {
    const button = $('sendResetBtn');
    button.disabled = true;
    msg('');
    try {
      const redirect = new URL(window.location.href);
      redirect.search = '?password_reset=1';
      redirect.hash = '';
      const response = await fetch(SUPABASE_URL + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirect.href), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, create_user: true })
      });
      if (!response.ok) throw new Error('לא ניתן לשלוח קישור כעת');
      msg('אם שירות המייל זמין, קישור אימות נשלח לכתובת המנהל. בדוק גם בספאם.');
    } catch (err) {
      msg(err.message || 'שליחת הקישור נכשלה');
    } finally {
      button.disabled = false;
    }
  });

  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = fragment.get('access_token');
  if (accessToken && (window.location.search.includes('password_reset') || fragment.get('type') === 'magiclink')) {
    history.replaceState(null, '', window.location.pathname);
    showScreen('resetScreen');
    $('sendResetBtn').hidden = true;
    $('setNewPassword').hidden = false;
    msg('המייל אומת. בחר סיסמה חדשה.');
    $('saveNewPassword').addEventListener('click', async () => {
      const password = $('newAdminPassword').value;
      if (password.length < 12 || password.length > 128) {
        msg('יש להקליד סיסמה באורך 12 עד 128 תווים.');
        return;
      }
      const button = $('saveNewPassword');
      button.disabled = true;
      try {
        const response = await fetch(adminRpcUrl('pakapaka_admin_reset_password'), {
          method: 'POST',
          headers: { ...headers(), Authorization: 'Bearer ' + accessToken },
          body: JSON.stringify({ p_new_password: password })
        });
        if (!response.ok) throw new Error('האיפוס נכשל. ודא שכתובת המייל אומתה.');
        $('newAdminPassword').value = '';
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        showScreen('loginScreen');
        $('loginError').textContent = 'הסיסמה עודכנה. התחבר עם הסיסמה החדשה.';
      } catch (error) {
        msg(error.message);
      } finally {
        button.disabled = false;
      }
    });
  }
})();