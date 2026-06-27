let toastTimer = null;
let pullY = null;
let pullDone = false;
const lastSharedSeenKey = 'pakapaka_last_shared_seen_v1';

function addVersionBadge() {
  if (document.getElementById('versionBadge')) return;
  const d = document.createElement('button');
  d.id = 'versionBadge';
  d.className = 'versionBadge';
  d.type = 'button';
  d.textContent = 'v ' + VERSION;
  d.title = 'גרסה / מחלקה / עדכון';
  d.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof showVersionSettings === 'function') showVersionSettings();
    else if (typeof checkForAppUpdate === 'function') checkForAppUpdate(true);
  });
  const home = document.getElementById('home');
  const topBar = home ? home.querySelector('.topBar') : null;
  if (home && topBar) home.insertBefore(d, topBar);
  else document.body.insertBefore(d, document.body.firstChild);
}

function toast(msg) {
  let t = document.getElementById('toastMsg');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toastMsg';
    t.className = 'toastMsg';
    document.body.appendChild(t);
  }
  t.textContent = msg || 'עודכן';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

function sharedDot() {
  const b = document.getElementById('tabShared');
  if (!b) return null;
  let d = document.getElementById('sharedDot');
  if (!d) {
    d = document.createElement('span');
    d.id = 'sharedDot';
    d.className = 'sharedDot';
    b.appendChild(d);
  }
  return d;
}

function markSharedSeen() {
  try {
    if (Array.isArray(sharedItems) && sharedItems.length) localStorage.setItem(lastSharedSeenKey, String(sharedItems[0].id));
    const d = sharedDot();
    if (d) d.classList.remove('on');
  } catch (e) {}
}

async function checkSharedUpdates() {
  try {
    const department = typeof getDepartment === 'function' ? getDepartment() : '';
    if (!department) return;
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + SHARED_TABLE + '?select=id&department=eq.' + encodeURIComponent(department) + '&order=created_at.desc&limit=1', {
      headers: headers(),
      cache: 'no-store'
    });
    if (!r.ok) return;
    const a = await r.json();
    const latest = a[0] ? String(a[0].id) : '';
    const old = localStorage.getItem(lastSharedSeenKey) || '';
    if (latest && old && latest !== old && activeTab !== 'shared') {
      const d = sharedDot();
      if (d) d.classList.add('on');
    }
    if (latest && !old) localStorage.setItem(lastSharedSeenKey, latest);
  } catch (e) {}
}

function patchForceAppUpdate() {
  window.forceAppUpdate = async function (latest) {
    const v = encodeURIComponent(latest || Date.now());
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister().catch(() => null)));
      }
    } catch (e) {}
    window.location.replace('./?v=' + v + '&t=' + Date.now());
  };
}

function patchSaveItemDoubleSubmit() {
  if (window.__savePatch117) return;
  if (typeof window.saveItem !== 'function') return;
  window.__savePatch117 = true;
  const originalSaveItem = window.saveItem;
  window.saveItem = async function () {
    if (window.__savingItemNow) return;
    window.__savingItemNow = true;
    const btn = document.querySelector('#newPage .save');
    const oldText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'שומר...';
    }
    try {
      return await originalSaveItem.apply(this, arguments);
    } finally {
      window.__savingItemNow = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || 'שמור';
      }
    }
  };
}

function patchRefreshAndTabs() {
  if (window.__v109) return;
  window.__v109 = true;
  const oldRefresh = window.refreshList;
  if (typeof oldRefresh === 'function') {
    window.refreshList = async function () {
      const x = await oldRefresh.apply(this, arguments);
      toast('עודכן');
      if (activeTab === 'shared') markSharedSeen();
      return x;
    };
  }
  const oldSetTab = window.setTab;
  if (typeof oldSetTab === 'function') {
    window.setTab = function (tab) {
      const x = oldSetTab.apply(this, arguments);
      if (tab === 'shared') setTimeout(markSharedSeen, 700);
      return x;
    };
  }
}

function enablePullToRefresh() {
  document.addEventListener('touchstart', e => {
    const h = document.getElementById('home');
    if (!h || !h.classList.contains('active') || window.scrollY > 0) return;
    pullY = e.touches[0].clientY;
    pullDone = false;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (pullY === null || pullDone) return;
    if (e.touches[0].clientY - pullY > 95) {
      pullDone = true;
      if (typeof refreshList === 'function') refreshList();
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    pullY = null;
    pullDone = false;
  }, { passive: true });
}

function updateServiceWorker() {
  try {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.register('./sw.js?v=' + VERSION).then(reg => reg.update()).catch(() => {});
  } catch (e) {}
}

function initPwaEnhancements() {
  addVersionBadge();
  sharedDot();
  patchForceAppUpdate();
  patchRefreshAndTabs();
  patchSaveItemDoubleSubmit();
  enablePullToRefresh();
  checkSharedUpdates();
  updateServiceWorker();
  setInterval(checkSharedUpdates, 30000);
  window.addEventListener('focus', checkSharedUpdates);
}

initPwaEnhancements();