const ADMIN_SESSION_KEY = 'pakapaka_admin_token_v2';
const NO_DEPARTMENT_LABEL = 'ללא מחלקה';
const ACTIVE_DAYS = 7;
let pullStartY = null;
let pullArmed = false;
let pullReloading = false;

function adminRpcUrl(name) {
  return `${SUPABASE_URL}/rest/v1/rpc/${name}`;
}

function getAdminToken() {
  return String(sessionStorage.getItem(ADMIN_SESSION_KEY) || '');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('he-IL');
}

function activeSinceIso() {
  return new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isActiveDevice(row) {
  const t = Date.parse(row.last_scan_at || '');
  return Number.isFinite(t) && t >= Date.parse(activeSinceIso());
}

function isRealDepartment(value) {
  return String(value || '').trim() !== NO_DEPARTMENT_LABEL;
}

function departmentTitle(value) {
  return isRealDepartment(value) ? `מחלקה ${value}` : NO_DEPARTMENT_LABEL;
}

async function login() {
  const input = document.getElementById('adminPassword');
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  err.textContent = '';

  const secondInput = document.getElementById('adminSecondaryPassword');
  const secondPassword = String(secondInput?.value || '');
  const primaryPassword = String(input.value || '');
  if (primaryPassword && secondPassword) { err.textContent = 'הזן סיסמה אחת בלבד.'; return; }
  const typed = secondPassword || primaryPassword;
  if (!typed) {
    err.textContent = 'הזן סיסמה.';
    return;
  }

  btn.disabled = true;
  try {
    const r = await fetch(adminRpcUrl(secondPassword ? 'pakapaka_admin_login_secondary' : 'pakapaka_admin_login'), {
      method: 'POST',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify({ p_password: typed })
    });
    if (!r.ok) throw new Error('שגיאה באימות מול השרת');
    const token = await r.json();
    if (!token) {
      err.textContent = 'סיסמה לא נכונה.';
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, String(token));
    input.value = '';
    if (secondInput) secondInput.value = '';
    await showDashboard();
  } catch (e) {
    err.textContent = e.message || 'שגיאה בכניסה.';
  } finally {
    btn.disabled = false;
  }
}

async function loadDevices() {
  const token = getAdminToken();
  if (!token) throw new Error('פג תוקף החיבור');

  const r = await fetch(adminRpcUrl('pakapaka_admin_devices'), {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({ p_token: token })
  });

  if (r.status === 401 || r.status === 403 || r.status === 400) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showScreen('loginScreen');
    throw new Error('פג תוקף החיבור. היכנס מחדש');
  }
  if (!r.ok) throw new Error('לא הצלחתי לקרוא את נתוני הניהול');
  return await r.json();
}

function groupDepartments(devices) {
  const map = new Map();
  devices.forEach(row => {
    const department = String(row.department || '').trim() || NO_DEPARTMENT_LABEL;
    const current = map.get(department) || {
      department,
      users: 0,
      activeUsers: 0,
      totalScans: 0
    };
    current.users += 1;
    current.totalScans += Number(row.total_scans || 0);
    if (isActiveDevice(row)) current.activeUsers += 1;
    map.set(department, current);
  });

  return [...map.values()].sort((a, b) => {
    const aNoDepartment = !isRealDepartment(a.department);
    const bNoDepartment = !isRealDepartment(b.department);
    if (aNoDepartment !== bNoDepartment) return aNoDepartment ? 1 : -1;
    return b.activeUsers - a.activeUsers || b.users - a.users || b.totalScans - a.totalScans || String(a.department).localeCompare(String(b.department), 'he');
  });
}

function renderDepartmentRows(rows) {
  const box = document.getElementById('departmentsList');
  if (!rows.length) {
    box.innerHTML = '<div class="empty">אין עדיין משתמשים להצגה.</div>';
    return;
  }
  box.innerHTML = rows.map((row, index) => `
    <div class="deptRow ${isRealDepartment(row.department) ? '' : 'noDepartmentRow'}">
      <div class="deptHead">
        <div class="rowTitle">${isRealDepartment(row.department) ? `${index + 1}. ` : '⚠️ '}${escapeHtml(departmentTitle(row.department))}</div>
        <div class="rowCount">${formatNumber(row.activeUsers)} פעילים</div>
      </div>
      <div class="deptStats">
        <span>${formatNumber(row.users)} משתמשים</span>
        <span>${formatNumber(row.totalScans)} סריקות</span>
      </div>
    </div>
  `).join('');
}

function renderTopDepartment(row) {
  document.getElementById('topDepartmentNumber').textContent = row ? departmentTitle(row.department) : '—';
  document.getElementById('topDepartmentActiveUsers').textContent = formatNumber(row ? row.activeUsers : 0);
  document.getElementById('topDepartmentUsers').textContent = formatNumber(row ? row.users : 0);
  document.getElementById('topDepartmentScans').textContent = formatNumber(row ? row.totalScans : 0);
}

async function showDashboard() {
  showScreen('dashboardScreen');
  const setupError = document.getElementById('setupError');
  setupError.classList.remove('show');
  setupError.textContent = '';

  try {
    const devices = await loadDevices();
    const departments = groupDepartments(devices);
    const realDepartments = departments.filter(x => isRealDepartment(x.department));
    const activeDevices = devices.filter(isActiveDevice);
    const activeDepartments = realDepartments.filter(x => x.activeUsers > 0);
    const totalScans = devices.reduce((sum, row) => sum + Number(row.total_scans || 0), 0);

    document.getElementById('activeUsers').textContent = formatNumber(activeDevices.length);
    document.getElementById('activeDepartments').textContent = formatNumber(activeDepartments.length);
    document.getElementById('totalUsers').textContent = formatNumber(devices.length);
    document.getElementById('totalScans').textContent = formatNumber(totalScans);
    document.getElementById('lastUpdated').textContent = 'עודכן עכשיו';

    renderTopDepartment(realDepartments[0] || null);
    renderDepartmentRows(departments);
    loadActiveManagers();
    loadManagerRequests();
  } catch (e) {
    setupError.textContent = e.message || 'שגיאה בטעינת נתונים';
    setupError.classList.add('show');
    document.getElementById('lastUpdated').textContent = 'אין נתונים להצגה';
    renderTopDepartment(null);
  }
}

function fullReload() {
  if (pullReloading) return;
  pullReloading = true;
  const indicator = document.getElementById('pullRefresh');
  if (indicator) {
    indicator.textContent = 'מרענן...';
    indicator.classList.add('show', 'ready');
  }
  window.location.replace(`${window.location.pathname}?refresh=${Date.now()}`);
}

function setPullIndicator(visible, ready) {
  const indicator = document.getElementById('pullRefresh');
  if (!indicator) return;
  indicator.textContent = ready ? 'שחרר לרענון' : 'משוך לרענון';
  indicator.classList.toggle('show', !!visible);
  indicator.classList.toggle('ready', !!ready);
}

function initPullToFullRefresh() {
  document.addEventListener('touchstart', e => {
    if (!getAdminToken()) return;
    if (window.scrollY > 0 || pullReloading) return;
    pullStartY = e.touches[0].clientY;
    pullArmed = false;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (pullStartY === null || pullReloading) return;
    const distance = e.touches[0].clientY - pullStartY;
    if (distance > 30) setPullIndicator(true, distance > 105);
    pullArmed = distance > 105;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (pullArmed) fullReload();
    else setPullIndicator(false, false);
    pullStartY = null;
    pullArmed = false;
  }, { passive: true });
}

async function logout() {
  const token = getAdminToken();
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  showScreen('loginScreen');
  if (!token) return;
  try {
    await fetch(adminRpcUrl('pakapaka_admin_logout'), {
      method: 'POST',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify({ p_token: token })
    });
  } catch (e) {
    // Local logout already completed.
  }
}



function fillManagerDevices(devices){
  const select=document.getElementById('managerDeviceSelect');
  select.replaceChildren(new Option('בחר משתמש לפי מכשיר ומחלקה',''));
  for(const d of devices){
    const label='מחלקה '+(d.department||'ללא מחלקה')+' · '+String(d.device_id||'').slice(0,12)+' · '+Number(d.total_scans||0)+' סריקות';
    select.add(new Option(label,String(d.device_id||'')));
  }
}

async function loadManagerRequests(){
 const box=document.getElementById('managerRequestList');
 try{
  const r=await fetch(adminRpcUrl('pakapaka_admin_manager_requests'),{method:'POST',headers:headers(),body:JSON.stringify({p_token:getAdminToken()}),cache:'no-store'});
  if(!r.ok)throw new Error('לא ניתן לטעון בקשות.');
  const requests=await r.json();
  const pending=requests.filter(x=>x.status==='pending');
  box.replaceChildren();
  if(!pending.length){box.textContent='אין בקשות שממתינות לאישור.';return;}
  for(const item of pending){
   const card=document.createElement('div');card.className='deptRow';
   const title=document.createElement('p');title.textContent=item.requester_name+' · מחלקה '+item.department;card.appendChild(title);
   const date=document.createElement('small');date.textContent=new Date(item.requested_at).toLocaleString('he-IL');card.appendChild(date);
   const row=document.createElement('div');row.className='adminActions';
   for(const approved of [true,false]){
    const btn=document.createElement('button');btn.type='button';btn.className='smallBtn';btn.textContent=approved?'אשר':'דחה';
    btn.addEventListener('click',async()=>{
     btn.disabled=true;
     try{
      const answer=await fetch(adminRpcUrl('pakapaka_admin_review_manager'),{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({p_token:getAdminToken(),p_device_id:item.device_id,p_approve:approved})});
      if(!answer.ok||await answer.json()!==true)throw new Error('העדכון נכשל.');
      await loadManagerRequests();
     }catch(e){btn.disabled=false;alert(e.message);}
    });
    row.appendChild(btn);
   }
   card.appendChild(row);box.appendChild(card);
  }
 }catch(e){box.textContent=e.message||'שגיאה';}
}

async function loadActiveManagers(){
 const box=document.getElementById('activeManagerList');
 try{
  const response=await fetch(adminRpcUrl('pakapaka_admin_active_managers'),{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({p_token:getAdminToken()})});
  if(!response.ok)throw new Error('לא ניתן לטעון מנהלים');
  const managers=await response.json();
  box.replaceChildren();
  if(!managers.length){box.textContent='אין מנהלי מחלקות מאושרים.';return;}
  for(const person of managers){
   const item=document.createElement('div');item.className='deptRow';
   const title=document.createElement('strong');title.textContent=person.requester_name+' · מחלקה '+person.department;item.appendChild(title);
   const btn=document.createElement('button');btn.className='smallBtn';btn.type='button';btn.textContent='בטל הרשאת מנהל';btn.style.marginTop='8px';
   btn.addEventListener('click',async()=>{
    if(!confirm('לבטל הרשאת מנהל של '+person.requester_name+'?'))return;
    btn.disabled=true;
    try{
     const r=await fetch(adminRpcUrl('pakapaka_admin_revoke_manager'),{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({p_token:getAdminToken(),p_device_id:person.device_id})});
     if(!r.ok||await r.json()!==true)throw new Error('ביטול הרשאה נכשל');
     await loadActiveManagers();
    }catch(e){alert(e.message);btn.disabled=false;}
   });
   item.appendChild(btn);box.appendChild(item);
  }
 }catch(e){box.textContent=e.message||'שגיאה';}
}
function initPasswordManagement(){
  const panel=document.getElementById('adminChangePasswordPanel');
  document.getElementById('changeAdminPasswordBtn').addEventListener('click',()=>{panel.hidden=!panel.hidden;});
  for(const [inputId,buttonId] of [['dashboardNewPassword','toggleDashboardPassword'],['dashboardConfirmPassword','toggleDashboardConfirm']]){
    const input=document.getElementById(inputId),button=document.getElementById(buttonId);
    button.addEventListener('click',()=>{input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'הצג':'הסתר';});
  }
  document.getElementById('saveDashboardPassword').addEventListener('click',async()=>{
    const password=document.getElementById('dashboardNewPassword').value;
    const confirm=document.getElementById('dashboardConfirmPassword').value;
    const status=document.getElementById('dashboardPasswordStatus');
    const button=document.getElementById('saveDashboardPassword');
    if(password.length<6||password.length>128){status.textContent='יש להזין 6 עד 128 תווים.';return;}
    if(password!==confirm){status.textContent='אימות הסיסמה לא תואם.';return;}
    const token=getAdminToken();
    if(!token){status.textContent='עליך להיכנס מחדש לפאנל.';return;}
    button.disabled=true;status.textContent='שומר סיסמה...';
    try{
      const response=await fetch(adminRpcUrl('pakapaka_admin_change_password'),{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({p_token:token,p_new_password:password})});
      const result=await response.json().catch(()=>null);
      if(!response.ok||result!==true)throw new Error('השרת לא אישר את השינוי.');
      document.getElementById('dashboardNewPassword').value='';
      document.getElementById('dashboardConfirmPassword').value='';
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      showScreen('loginScreen');
      document.getElementById('loginError').textContent='הסיסמה הוחלפה. היכנס מחדש.';
    }catch(e){status.textContent=e.message||'שגיאה בשמירה';}
    finally{button.disabled=false;}
  });
}

function initAdmin() {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  initPullToFullRefresh();
  initPasswordManagement();
  document.getElementById('refreshActiveManagers').addEventListener('click',loadActiveManagers);
  document.getElementById('refreshManagerRequests').addEventListener('click',loadManagerRequests);

  if (getAdminToken()) showDashboard();
}

initAdmin();
