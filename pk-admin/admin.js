const ADMIN_SETTINGS_TABLE = 'pakapaka_settings';
const ADMIN_STATS_TABLE = 'pakapaka_scan_stats';
const ADMIN_SESSION_KEY = 'pakapaka_admin_ok_v1';

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

async function loadStats() {
  const q = '?select=department,barcode,name,scan_count,last_scanned_at&order=scan_count.desc';
  const r = await fetch(adminApiUrl(ADMIN_STATS_TABLE, q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('לא הצלחתי לקרוא את טבלת הסריקות');
  return await r.json();
}

function groupDepartments(rows) {
  const map = new Map();
  rows.forEach(row => {
    const department = String(row.department || 'ללא מחלקה');
    const count = Number(row.scan_count || 0);
    map.set(department, (map.get(department) || 0) + count);
  });
  return [...map.entries()]
    .map(([department, scans]) => ({ department, scans }))
    .sort((a, b) => b.scans - a.scans || String(a.department).localeCompare(String(b.department), 'he'));
}

function renderDepartmentRows(rows) {
  const box = document.getElementById('departmentsList');
  if (!rows.length) {
    box.innerHTML = '<div class="empty">אין עדיין סריקות להצגה.</div>';
    return;
  }
  box.innerHTML = rows.map((row, index) => `
    <div class="row">
      <div>
        <div class="rowTitle">${index + 1}. מחלקה ${escapeHtml(row.department)}</div>
        <div class="rowSub">דירוג לפי סריקות</div>
      </div>
      <div class="rowCount">${formatNumber(row.scans)}</div>
    </div>
  `).join('');
}

function renderTopItems(rows) {
  const box = document.getElementById('topItemsList');
  const top = rows.slice(0, 10);
  if (!top.length) {
    box.innerHTML = '<div class="empty">אין עדיין פקעות נסרקות.</div>';
    return;
  }
  box.innerHTML = top.map((row, index) => `
    <div class="row">
      <div>
        <div class="rowTitle">${index + 1}. ${escapeHtml(row.name || 'פקעה')}</div>
        <div class="rowSub">${escapeHtml(row.barcode || '')} · מחלקה ${escapeHtml(row.department || '')}</div>
      </div>
      <div class="rowCount">${formatNumber(row.scan_count)}</div>
    </div>
  `).join('');
}

async function showDashboard() {
  showScreen('dashboardScreen');
  const setupError = document.getElementById('setupError');
  setupError.classList.remove('show');
  setupError.textContent = '';

  try {
    const rows = await loadStats();
    const total = rows.reduce((sum, row) => sum + Number(row.scan_count || 0), 0);
    const departments = groupDepartments(rows);
    const topDepartment = departments[0];

    document.getElementById('totalScans').textContent = formatNumber(total);
    document.getElementById('topDepartment').textContent = topDepartment ? topDepartment.department : '—';
    document.getElementById('trackedItems').textContent = formatNumber(rows.length);
    document.getElementById('lastUpdated').textContent = 'עודכן עכשיו';

    renderDepartmentRows(departments);
    renderTopItems(rows);
  } catch (e) {
    setupError.textContent = `${e.message || 'שגיאה בטעינת נתונים'}. ודא שהרצת את קובץ supabase-setup.sql ב-Supabase.`;
    setupError.classList.add('show');
    document.getElementById('lastUpdated').textContent = 'אין נתונים להצגה';
  }
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

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1') showDashboard();
}

initAdmin();
