let toastTimer = null;
let pullY = null;
let pullDone = false;
const lastSharedSeenKey = 'pakapaka_last_shared_seen_v1';

function addVersionBadge() {
  if (document.getElementById('versionBadge')) return;
  const d = document.createElement('div');
  d.id = 'versionBadge';
  d.className = 'versionBadge';
  d.textContent = 'v ' + VERSION;
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
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + SHARED_TABLE + '?select=id&order=created_at.desc&limit=1', {
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

function patchRefreshAndTabs() {
  if (window.__v102) return;
  window.__v102 = true;
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
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update();
      });
    }
  } catch (e) {}
}

function initPwaEnhancements() {
  addVersionBadge();
  sharedDot();
  patchRefreshAndTabs();
  enablePullToRefresh();
  checkSharedUpdates();
  updateServiceWorker();
  setInterval(checkSharedUpdates, 30000);
  window.addEventListener('focus', checkSharedUpdates);
}

initPwaEnhancements();
