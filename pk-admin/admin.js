const ADMIN_SETTINGS_TABLE = 'pakapaka_settings';
const ADMIN_DEVICES_TABLE = 'pakapaka_devices';
const ADMIN_SESSION_KEY = 'pakapaka_admin_ok_v1';
const ACTIVE_DAYS = 7;
let pullStartY = null;
let pullArmed = false;
let pullReloading = false;

function adminApiUrl(table, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query}`;
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

async function fetchAdminPassword() {
  const q = '?select=value&key=eq.admin_password&limit=1';
  const r = await fetch(adminApiUrl(ADMIN_SETTINGS_TABLE, q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('לא הצלחתי לקרוא את טבלת ההגדרות');
  const rows = await r.json();
  return rows[0] ? String(rows[0].value || '') : '';
}

async function login() {
  const input = document.getElementById('adminPassword');
  const err = document.getElementById('loginError');
  err.textContent = '';

  const typed = String(input.value || '');
  if (!typed) {
    err.textContent = 'הזן סיסמה.';
    return;
  }

  try {
    const password = await fetchAdminPassword();
    if (!password) {
      err.textContent = 'לא נמצאה סיסמת ניהול בטבלה.';
      return;
    }
    if (typed !== password) {
      err.textContent = 'סיסמה לא נכונה.';
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    input.value = '';
    showDashboard();
  } catch (e) {
    err.textContent = e.message || 'שגיאה בכניסה.';
  }
}

async function loadDevices() {
  const q = '?select=device_id,department,total_scans,last_scan_at&order=last_scan_at.desc';
  const r = await fetch(adminApiUrl(ADMIN_DEVICES_TABLE, q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('לא הצלחתי לקרוא את טבלת המשתמשים');
  return await r.json();
}

function groupDepartments(devices) {
  const map = new Map();
  devices.forEach(row => {
    const department = String(row.department || 'ללא מחלקה');
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
    <div class="deptRow">
      <div class="deptHead">
        <div class="rowTitle">${index + 1}. מחלקה ${escapeHtml(row.department)}</div>
        <div class="rowCount">${formatNumber(row.activeUsers)} פעילים</div>
      </div>
      <div class="deptStats">
        <span>${formatNumber(row.users)} משתמשים</span>
        <span>${formatNumber(row.totalScans)} סריקות</span>
      </div>
    </div>
  `).join('');
}

async function showDashboard() {
  showScreen('dashboardScreen');
  const setupError = document.getElementById('setupError');
  setupError.classList.remove('show');
  setupError.textContent = '';

  try {
    const devices = await loadDevices();
    const departments = groupDepartments(devices);
    const activeDevices = devices.filter(isActiveDevice);
    const activeDepartments = departments.filter(x => x.activeUsers > 0);
    const totalScans = devices.reduce((sum, row) => sum + Number(row.total_scans || 0), 0);

    document.getElementById('activeUsers').textContent = formatNumber(activeDevices.length);
    document.getElementById('activeDepartments').textContent = formatNumber(activeDepartments.length);
    document.getElementById('totalUsers').textContent = formatNumber(devices.length);
    document.getElementById('totalScans').textContent = formatNumber(totalScans);
    document.getElementById('lastUpdated').textContent = 'עודכן עכשיו';

    renderDepartmentRows(departments);
  } catch (e) {
    setupError.textContent = `${e.message || 'שגיאה בטעינת נתונים'}. יש להריץ את עדכון הטבלאות ב-Supabase.`;
    setupError.classList.add('show');
    document.getElementById('lastUpdated').textContent = 'אין נתונים להצגה';
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
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== '1') return;
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

function logout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  showScreen('loginScreen');
}

function initAdmin() {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  initPullToFullRefresh();

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') showDashboard();
}

initAdmin();
