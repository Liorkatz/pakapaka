let suppressItemClickUntil = 0;

function showPage(id) {
  document.querySelectorAll('.page,.whitePage').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'newPage') {
    saveTarget = activeTab;
    updateSaveTargetButtons();
    updateDepartmentNotice();
  }
  if (id === 'home') renderList();
}

function getDepartment() {
  return String(localStorage.getItem(DEPARTMENT_KEY) || '').trim();
}

function isValidDepartment(value) {
  return /^\d{1,5}$/.test(String(value || '').trim());
}

function ensureAppDialogStyles() {
  if (document.getElementById('appDialogStyles')) return;
  const s = document.createElement('style');
  s.id = 'appDialogStyles';
  s.textContent = `
    .appDialogBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:99999;padding:18px;direction:rtl}
    .appDialog{width:100%;max-width:480px;background:#171717;border:1px solid #333;border-radius:28px;padding:22px 18px 18px;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.55)}
    .appDialogTitle{font-size:26px;font-weight:800;margin:0 0 8px;text-align:right}
    .appDialogText{font-size:17px;line-height:1.45;color:#cfcfcf;margin:0 0 16px;text-align:right}
    .appDialogValue{background:#0f0f0f;border:1px solid #2d2d2d;border-radius:18px;padding:13px 14px;margin:12px 0 16px;font-size:18px;color:#e8e8e8;text-align:right}
    .appDialogInput{width:100%;border-radius:18px;border:1px solid #444;background:#0f0f0f;color:#fff;padding:17px;font-size:28px;text-align:center;letter-spacing:6px;direction:ltr;margin:8px 0 14px}
    .appDialogError{min-height:20px;color:#ff6961;font-size:15px;text-align:right;margin:0 0 10px}
    .appDialogActions{display:grid;gap:10px}
    .appDialogActions.two{grid-template-columns:1fr 1fr}
    .appDialogBtn{width:100%;border:0;border-radius:18px;padding:16px;font-size:19px;font-weight:800;background:#fff;color:#000}
    .appDialogBtn.secondary{background:#2a2a2a;color:#fff;border:1px solid #444}
    .appDialogBtn.danger{background:#8b1616;color:#fff}
    .appDialogBtn.small{font-size:17px;padding:14px}
    .inlineBtn{width:auto;display:inline-block;padding:13px 22px;font-size:18px;margin-top:8px}
    .saveDeptNotice{display:none;margin:10px 0 12px;padding:12px 14px;border-radius:16px;border:1px solid #333;background:#141414;color:#ddd;font-size:16px;line-height:1.35;text-align:right}
    .saveDeptNotice.good{border-color:#2d5a37;color:#dfffe7;background:#102015}
    .saveDeptNotice.warn{border-color:#5a4a20;color:#ffe7a8;background:#211a0d}
  `;
  document.head.appendChild(s);
}

function closeAppDialog() {
  const old = document.getElementById('appDialogBackdrop');
  if (old) old.remove();
}

function showAppDialog({ title, text, value, actions }) {
  ensureAppDialogStyles();
  closeAppDialog();
  const backdrop = document.createElement('div');
  backdrop.id = 'appDialogBackdrop';
  backdrop.className = 'appDialogBackdrop';
  const dialog = document.createElement('div');
  dialog.className = 'appDialog';
  const valueHtml = value ? `<div class="appDialogValue">${escapeHtml(value)}</div>` : '';
  dialog.innerHTML = `<div class="appDialogTitle">${escapeHtml(title || '')}</div><div class="appDialogText">${text || ''}</div>${valueHtml}<div class="appDialogActions"></div>`;
  const area = dialog.querySelector('.appDialogActions');
  if (actions && actions.length === 2) area.classList.add('two');
  (actions || []).forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'appDialogBtn ' + (a.kind || '');
    b.textContent = a.label;
    b.addEventListener('click', () => {
      if (a.close !== false) closeAppDialog();
      if (typeof a.onClick === 'function') a.onClick();
    });
    area.appendChild(b);
  });
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
}

function showDepartmentDialog({ title = 'בחירת מחלקה', text = 'הכנס מספר מחלקה של 1 עד 5 ספרות.', onSaved } = {}) {
  ensureAppDialogStyles();
  closeAppDialog();
  const backdrop = document.createElement('div');
  backdrop.id = 'appDialogBackdrop';
  backdrop.className = 'appDialogBackdrop';
  const dialog = document.createElement('div');
  dialog.className = 'appDialog';
  dialog.innerHTML = `
    <div class="appDialogTitle">${escapeHtml(title)}</div>
    <div class="appDialogText">${text}</div>
    <input id="departmentInput" class="appDialogInput" inputmode="numeric" maxlength="5" value="${escapeAttr(getDepartment())}" placeholder="עד 5 ספרות">
    <div id="departmentError" class="appDialogError"></div>
    <div class="appDialogActions two">
      <button type="button" id="departmentCancel" class="appDialogBtn secondary">ביטול</button>
      <button type="button" id="departmentSave" class="appDialogBtn">שמור</button>
    </div>`;
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  const input = document.getElementById('departmentInput');
  const err = document.getElementById('departmentError');
  input.focus();
  input.select();
  input.addEventListener('input', () => {
    input.value = onlyDigits(input.value).slice(0, 5);
    err.textContent = '';
  });
  document.getElementById('departmentCancel').addEventListener('click', closeAppDialog);
  document.getElementById('departmentSave').addEventListener('click', () => {
    const finalValue = onlyDigits(input.value).slice(0, 5);
    if (!isValidDepartment(finalValue)) {
      err.textContent = 'מספר מחלקה חייב להכיל בין 1 ל־5 ספרות.';
      return;
    }
    localStorage.setItem(DEPARTMENT_KEY, finalValue);
    sharedItems = [];
    sharedLoaded = false;
    closeAppDialog();
    updateDepartmentNotice();
    if (typeof onSaved === 'function') onSaved(finalValue);
  });
}

function requireDepartment(next) {
  const current = getDepartment();
  if (isValidDepartment(current)) {
    if (typeof next === 'function') next(current);
    return true;
  }
  showDepartmentDialog({
    title: 'צריך לבחור מחלקה',
    text: 'כדי לשמור לרשימה המשותפת צריך להגדיר מספר מחלקה בן 2 ספרות. המספר יישמר במכשיר.',
    onSaved: next
  });
  return false;
}

function changeDepartment() {
  const oldDepartment = getDepartment() || 'לא נבחרה';
  showDepartmentDialog({
    title: 'שינוי מחלקה',
    text: `מחלקה נוכחית: ${escapeHtml(oldDepartment)}<br>הפקעות המקומיות לא יימחקו. רק הרשימה המשותפת תתחלף.`,
    onSaved: () => {
      activeTab = 'shared';
      localStorage.setItem('pakapaka_active_tab', 'shared');
      renderList();
      loadShared();
    }
  });
}

function showDepartmentRequired() {
  const list = document.getElementById('list');
  if (!list) return;
  list.innerHTML = '<div class="empty">לא נבחרה מחלקה לרשימה המשותפת.<br>אפשר לבחור מחלקה עכשיו, או לבחור מחלקה רק בזמן שמירה למשותף.<br><br><button class="inlineBtn" onclick="changeDepartment()">בחר מחלקה</button></div>';
}

function ensureDepartmentNotice() {
  ensureAppDialogStyles();
  let notice = document.getElementById('saveDeptNotice');
  if (notice) return notice;
  const tabs = document.querySelector('.saveTabs');
  if (!tabs) return null;
  notice = document.createElement('div');
  notice.id = 'saveDeptNotice';
  notice.className = 'saveDeptNotice';
  tabs.insertAdjacentElement('afterend', notice);
  return notice;
}

function updateDepartmentNotice() {
  const notice = ensureDepartmentNotice();
  if (!notice) return;
  const department = getDepartment();
  notice.classList.remove('good', 'warn');
  if (saveTarget !== 'shared') {
    notice.style.display = 'none';
    notice.textContent = '';
    return;
  }
  notice.style.display = 'block';
  if (department) {
    notice.classList.add('good');
    notice.textContent = `השמירה למשותף משויכת למחלקה ${department}`;
  } else {
    notice.classList.add('warn');
    notice.textContent = 'לא נבחרה מחלקה. בזמן שמירה למשותף תידרש לבחור מספר מחלקה.';
  }
}

function showVersionSettings() {
  const department = getDepartment() || 'לא נבחרה';
  showAppDialog({
    title: 'הגדרות',
    text: 'ניהול גרסה ומחלקה.',
    value: `גרסה נוכחית: v${VERSION} · מחלקה: ${department}`,
    actions: [
      { label: 'בדיקת עדכונים', onClick: () => checkForAppUpdate(true) },
      { label: 'שינוי מחלקה', kind: 'secondary', onClick: changeDepartment },
      { label: 'בקשה לניהול מחלקה', kind: 'secondary', onClick: requestDepartmentManager },
      { label: 'נתוני מנהל מחלקה', kind: 'secondary', onClick: openDepartmentManager },
      { label: 'סגור', kind: 'secondary small' }
    ]
  });
}

function setSaveTarget(target) {
  saveTarget = target;
  updateSaveTargetButtons();
  updateDepartmentNotice();
}

function updateSaveTargetButtons() {
  document.getElementById('saveLocalBtn').classList.toggle('active', saveTarget === 'local');
  document.getElementById('saveSharedBtn').classList.toggle('active', saveTarget === 'shared');
}

function updateHomeHelp() {
  const help = document.getElementById('homeHelp');
  if (!help) return;
  if (activeTab === 'shared') {
    const department = getDepartment();
    help.innerHTML = department
      ? `פקעות משותפות של מחלקה ${escapeHtml(department)}.<br>לחיצה על פק״ע תשמור אותה ברשימה המקומית שלך.`
      : 'רשימה משותפת. כדי לראות פקעות או לשמור למשותף צריך לבחור מחלקה.';
    help.classList.add('sharedHelp');
  } else {
    help.textContent = 'מועדפים למעלה. מחיקה: החלקה ימינה.';
    help.classList.remove('sharedHelp');
  }
}

function setTab(tab) {
  activeTab = tab;
  localStorage.setItem('pakapaka_active_tab', tab);
  renderList();
  if (tab === 'shared' && getDepartment()) loadShared();
}

function versionParts(v) {
  return String(v || '').split('.').map(x => Number(x) || 0);
}

function isVersionNewer(latest, current) {
  const a = versionParts(latest);
  const b = versionParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function checkForAppUpdate(showCurrentMessage = true) {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return false;
    const info = await r.json();
    const latest = String(info.version || '').trim();
    if (!latest) return false;
    if (isVersionNewer(latest, VERSION)) {
      const notes = Array.isArray(info.notes) && info.notes.length ? '<br><br>מה חדש:<br>• ' + info.notes.map(escapeHtml).join('<br>• ') : '';
      showAppDialog({
        title: 'קיים עדכון חדש',
        text: `גרסה נוכחית: ${escapeHtml(VERSION)}<br>גרסה חדשה: ${escapeHtml(latest)}${notes}`,
        actions: [
          { label: 'עדכן עכשיו', onClick: () => forceAppUpdate(latest) },
          { label: 'לא עכשיו', kind: 'secondary' }
        ]
      });
      return true;
    }
    if (showCurrentMessage) showAppDialog({ title: 'אין עדכון חדש', text: `אתה משתמש בגרסה העדכנית ביותר: v${escapeHtml(VERSION)}`, actions: [{ label: 'סגור' }] });
    return false;
  } catch (e) {
    if (showCurrentMessage) showAppDialog({ title: 'בדיקת העדכון נכשלה', text: 'נסה שוב מאוחר יותר.', actions: [{ label: 'סגור' }] });
    return false;
  }
}

async function forceAppUpdate(latest) {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.update().catch(() => null)));
    }
  } catch (e) {}
  window.location.href = `${window.location.pathname}?v=${encodeURIComponent(latest)}&t=${Date.now()}`;
}

async function refreshList() {
  refreshDataOnly();
}

function refreshDataOnly() {
  if (activeTab === 'shared') {
    if (!getDepartment()) return showDepartmentRequired();
    sharedLoaded = false;
    loadShared();
  } else {
    renderList();
  }
}

function showLoading() {
  document.getElementById('list').innerHTML = '<div class="empty">טוען רשימה משותפת...</div>';
}

async function saveItem() {
  const name = document.getElementById('name').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const built = buildCode();
  if (!name) return showAppDialog({ title: 'חסר שם פקעה', text: 'יש להזין שם לפני שמירה.', actions: [{ label: 'סגור' }] });
  if (!built.ok) return showAppDialog({ title: 'ברקוד לא תקין', text: escapeHtml(built.error), actions: [{ label: 'סגור' }] });
  if (saveTarget === 'shared' && !requireDepartment(() => saveItem())) return;
  if (saveTarget === 'local' && getLocalItems().some(x => x.code === built.code)) return showAppDialog({ title: 'כפילות', text: 'ברקוד זה כבר קיים במקומי.', actions: [{ label: 'סגור' }] });
  if (saveTarget === 'shared' && await sharedCodeExists(built.code)) return showAppDialog({ title: 'כפילות', text: 'ברקוד זה כבר קיים במחלקה הזאת.', actions: [{ label: 'סגור' }] });

  if (saveTarget === 'shared') {
    await saveShared(name, built.code, notes);
    activeTab = 'shared';
    localStorage.setItem('pakapaka_active_tab', 'shared');
  } else {
    saveLocal(name, built.code, notes);
    activeTab = 'local';
    localStorage.setItem('pakapaka_active_tab', 'local');
  }

  document.getElementById('name').value = '';
  document.getElementById('codeBase').value = '';
  document.getElementById('codeSuffix').value = '';
  document.getElementById('notes').value = '';
  showPage('home');
}

function renderList() {
  document.getElementById('tabLocal').classList.toggle('active', activeTab === 'local');
  document.getElementById('tabShared').classList.toggle('active', activeTab === 'shared');
  updateHomeHelp();
  if (activeTab === 'shared' && !getDepartment()) {
    showDepartmentRequired();
    return;
  }
  if (activeTab === 'shared' && !sharedLoaded) {
    loadShared();
    return;
  }

  let items = activeTab === 'shared' ? sharedItems : getLocalItems();
  items = [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite) || Number(b.createdAt) - Number(a.createdAt));
  const fav = items.filter(x => x.favorite);
  const all = items.filter(x => !x.favorite);
  const list = document.getElementById('list');
  if (!items.length) {
    list.innerHTML = `<div class="empty">אין פקעות ב${activeTab === 'local' ? 'מקומי' : 'משותף'}.</div>`;
    return;
  }
  list.innerHTML = `${renderSection('⭐ מועדפים', fav)}${renderSection('כל הפקעות', all)}`;
  bindActions();
}

function renderSection(title, items) {
  if (!items.length) return '';
  return `<div class="sectionTitle">${title}</div><div class="sectionLine"></div>${items.map(renderItem).join('')}`;
}

function renderItem(x) {
  const localMeta = activeTab === 'local' ? `<div class="itemMeta"><div class="openCount">נפתחה ${Number(x.openCount || 0)} פעמים</div><div class="num">${escapeHtml(x.code)}</div></div>` : `<div class="num">${escapeHtml(x.code)}</div>`;
  return `<div class="itemShell"><div class="deleteHint">מחק</div><div class="item" data-id="${escapeAttr(x.id)}"><div class="itemTop"><button class="star ${x.favorite ? 'on' : ''}" data-action="star" data-id="${escapeAttr(x.id)}">★</button><div class="itemName">${escapeHtml(x.name)}</div><div class="itemDate">${formatDate(x.createdAt)}</div></div>${localMeta}</div></div>`;
}

function bindActions() {
  document.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.dataset.action === 'star') return;
      if (Date.now() < suppressItemClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      handleItemClick(el.dataset.id);
    });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  });
  document.querySelectorAll('[data-action="star"]').forEach(el => el.addEventListener('click', e => toggleFavorite(e, el.dataset.id)));
}

function handleItemClick(id) {
  if (activeTab === 'shared') return promptCopySharedToLocal(id);
  openBarcode(id);
}

function renameLocalItem(event, id) {
  if (event) event.stopPropagation();
  if (activeTab !== 'local') return;
  const items = getLocalItems();
  const item = items.find(x => String(x.id) === String(id));
  if (!item) return;
  const name = prompt('שם חדש לפקעה:', item.name || '');
  if (name === null) return;
  const finalName = name.trim();
  if (!finalName) return showAppDialog({ title: 'שם לא תקין', text: 'שם לא יכול להיות ריק.', actions: [{ label: 'סגור' }] });
  item.name = finalName;
  setLocalItems(items);
  renderList();
}

function promptCopySharedToLocal(id) {
  const item = sharedItems.find(x => String(x.id) === String(id));
  if (!item) return;
  const existing = getLocalItems().some(x => x.code === item.code);
  if (existing) return showAppDialog({ title: 'כבר קיים', text: 'הפקעה כבר קיימת במקומי.', actions: [{ label: 'סגור' }] });
  const name = prompt('שם לשמירה במקומי:', item.name || '');
  if (name === null) return;
  const finalName = name.trim() || item.name || 'פקעה';
  const result = copySharedToLocal(item, finalName);
  if (!result.ok) return showAppDialog({ title: 'שגיאה', text: escapeHtml(result.error), actions: [{ label: 'סגור' }] });
  showAppDialog({ title: 'נשמר במקומי', text: 'הפקעה נשמרה לרשימה המקומית.', actions: [{ label: 'סגור' }] });
  activeTab = 'local';
  localStorage.setItem('pakapaka_active_tab', 'local');
  renderList();
}

function toggleFavorite(event, id) {
  event.stopPropagation();
  if (activeTab === 'shared') {
    const favs = getSharedFavs();
    const sid = String(id);
    const i = favs.indexOf(sid);
    if (i >= 0) favs.splice(i, 1); else favs.push(sid);
    setSharedFavs(favs);
    sharedItems = sharedItems.map(x => String(x.id) === sid ? { ...x, favorite: !x.favorite } : x);
  } else {
    const items = getLocalItems();
    const item = items.find(x => String(x.id) === String(id));
    if (item) item.favorite = !item.favorite;
    setLocalItems(items);
  }
  renderList();
}

async function deleteById(id) {
  const item = (activeTab === 'shared' ? sharedItems : getLocalItems()).find(x => String(x.id) === String(id));
  if (!item) return;
  showAppDialog({
    title: 'מחיקת פקעה',
    text: `למחוק את ${escapeHtml(item.name)}?`,
    actions: [
      { label: 'מחק', kind: 'danger', onClick: () => confirmDeleteById(id) },
      { label: 'ביטול', kind: 'secondary', onClick: renderList }
    ]
  });
}

async function confirmDeleteById(id) {
  const item = (activeTab === 'shared' ? sharedItems : getLocalItems()).find(x => String(x.id) === String(id));
  if (!item) return;
  if (activeTab === 'shared') {
    const department = getDepartment();
    const r = await fetch(apiUrl(`?id=eq.${encodeURIComponent(id)}&department=eq.${encodeURIComponent(department)}`), { method: 'DELETE', headers: headers() });
    if (!r.ok) {
      showAppDialog({ title: 'מחיקה נכשלה', text: escapeHtml(await errorText(r)), actions: [{ label: 'סגור' }] });
      renderList();
      return;
    }
    sharedItems = sharedItems.filter(x => String(x.id) !== String(id));
  } else {
    setLocalItems(getLocalItems().filter(x => String(x.id) !== String(id)));
  }
  renderList();
}

function onTouchStart(e) {
  const t = e.touches[0];
  const el = e.currentTarget;
  const state = {
    el,
    id: el.dataset.id,
    startX: t.clientX,
    startY: t.clientY,
    moved: false,
    longPressed: false,
    longPressTimer: null
  };
  touchState = state;

  if (activeTab === 'local') {
    state.longPressTimer = setTimeout(() => {
      if (touchState !== state || state.moved) return;
      state.longPressed = true;
      suppressItemClickUntil = Date.now() + 900;
      if (navigator.vibrate) navigator.vibrate(20);
      renameLocalItem(null, state.id);
    }, 650);
  }
}

function onTouchMove(e) {
  if (!touchState) return;
  const t = e.touches[0];
  const dx = t.clientX - touchState.startX;
  const dy = t.clientY - touchState.startY;

  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    touchState.moved = true;
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
  }

  if (Math.abs(dy) > Math.abs(dx)) return;
  if (dx > 0) {
    e.preventDefault();
    touchState.moved = true;
    touchState.el.style.transform = `translateX(${Math.min(dx, 120)}px)`;
  }
}

function onTouchEnd() {
  if (!touchState) return;
  if (touchState.longPressTimer) clearTimeout(touchState.longPressTimer);
  const current = touchState.el.style.transform.match(/translateX\((\d+)/);
  const dx = current ? Number(current[1]) : 0;
  const id = touchState.id;
  const longPressed = touchState.longPressed;
  touchState.el.style.transform = '';
  const shouldDelete = !longPressed && touchState.moved && dx > 85;
  touchState = null;
  if (shouldDelete) deleteById(id);
}

function openBarcode(id) {
  const item = incrementLocalOpenCount(id);
  if (!item) return;
  document.getElementById('barcodeName').textContent = item.name;
  document.getElementById('barcodeNumber').textContent = item.code;
  renderItfCanvas(document.getElementById('barcodeSvg'), item.code);
  showPage('barcodePage');
}

function initApp() {
  migrateOldData();
  setLocalItems(getLocalItems());
  renderList();
}

initApp();

async function openDepartmentManager(){
  const deviceId=typeof getDeviceId==='function'?getDeviceId():'';
  const stored=localStorage.getItem('pakapaka_manager_request_secret_v1')||localStorage.getItem('pakapaka_manager_code_v1')||'';
  ensureAppDialogStyles();
  closeAppDialog();
  const overlay=document.createElement('div');
  overlay.id='appDialogBackdrop';overlay.className='appDialogBackdrop';
  overlay.innerHTML='<div class="appDialog"><div class="appDialogTitle">ניהול מחלקה</div><p class="appDialogText">קוד הרשאה אישי ניתן על ידי מנהל המערכת. הרשאה זו מציגה סיכומי פעילות של המחלקה בלבד.</p><input id="managerAccessInput" class="appDialogInput" type="password" autocomplete="off" placeholder="קוד הרשאה"><button id="managerAccessToggle" class="appDialogBtn secondary small" type="button">הצג קוד</button><div id="managerAccessFeedback" class="appDialogText"></div><div class="appDialogActions"><button id="managerAccessVerify" class="appDialogBtn" type="button">הצג נתוני מחלקה</button><button id="managerAccessClose" class="appDialogBtn secondary" type="button">סגור</button></div></div>';
  document.body.appendChild(overlay);
  const input=document.getElementById('managerAccessInput'),status=document.getElementById('managerAccessFeedback');
  input.value=stored;
  document.getElementById('managerAccessClose').addEventListener('click',closeAppDialog);
  document.getElementById('managerAccessToggle').addEventListener('click',()=>{input.type=input.type==='password'?'text':'password';});
  document.getElementById('managerAccessVerify').addEventListener('click',async()=>{
    const code=input.value.trim();
    if(!deviceId||!code){status.textContent='יש להזין קוד הרשאה שקיבלת ממנהל המערכת.';return;}
    status.textContent='בודק הרשאה...';
    try{
      const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_stats',{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({p_device_id:deviceId,p_code:code})});
      if(!r.ok)throw new Error('אין אפשרות לטעון נתונים כרגע.');
      const data=await r.json();
      if(!data){localStorage.removeItem('pakapaka_manager_code_v1');throw new Error('הקוד אינו תקין עבור מכשיר זה.');}
      localStorage.setItem('pakapaka_manager_code_v1',code);
      status.textContent='מחלקה '+data.department+' · משתמשים: '+data.users+' · פעילים בשבוע האחרון: '+data.active_users+' · סריקות: '+data.scans;
    }catch(e){status.textContent=e.message||'שגיאה באימות הרשאה';}
  });
}

async function requestDepartmentManager(){
 ensureAppDialogStyles();closeAppDialog();
 const dept=getDepartment(),device=typeof getDeviceId==='function'?getDeviceId():'';
 const overlay=document.createElement('div');overlay.id='appDialogBackdrop';overlay.className='appDialogBackdrop';
 overlay.innerHTML='<div class="appDialog"><div class="appDialogTitle">בקשה להיות מנהל מחלקה</div><p class="appDialogText">מחלקה: '+escapeHtml(dept||'לא נבחרה')+'</p><input id="managerRequestName" class="appDialogInput" maxlength="80" placeholder="שם מלא" autocomplete="name"><p id="managerRequestStatus" class="appDialogText"></p><div class="appDialogActions"><button class="appDialogBtn" id="managerRequestSubmit">שלח בקשה</button><button class="appDialogBtn secondary" id="managerRequestClose">סגור</button></div></div>';
 document.body.appendChild(overlay);
 const feedback=document.getElementById('managerRequestStatus'),submit=document.getElementById('managerRequestSubmit');
 const secretKey='pakapaka_manager_request_secret_v1';
 const known=localStorage.getItem('pakapaka_manager_request_secret_v1');
 if(known&&device){
  try{const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_request_status',{method:'POST',headers:headers(),body:JSON.stringify({p_device_id:device,p_secret:known})});
  const st=await res.json();feedback.textContent=st==='approved'?'הבקשה אושרה! אפשר לפתוח את נתוני מנהל המחלקה.':st==='rejected'?'הבקשה נדחתה. ניתן לשלוח בקשה חדשה.':st==='pending'?'הבקשה ממתינה לאישור מנהל המערכת.':'';}catch{}
 }
 document.getElementById('managerRequestClose').addEventListener('click',closeAppDialog);
 submit.addEventListener('click',async()=>{
  const name=document.getElementById('managerRequestName').value.trim();
  if(name.length<2||!dept){feedback.textContent='נדרש שם מלא ומספר מחלקה.';return;}
  submit.disabled=true;feedback.textContent='שולח בקשה...';
  const secret=known||Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  try{
   const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_request',{method:'POST',headers:headers(),body:JSON.stringify({p_device_id:device,p_name:name,p_department:dept,p_secret:secret})});
   const state=await res.json();
   if(!res.ok)throw new Error('השליחה נכשלה.');
   if(state==='device_not_registered')throw new Error('יש לבצע סריקה אחת במחלקה לפני שליחת הבקשה.');
   if(state!=='pending')throw new Error('פרטי הבקשה אינם תקינים.');
   localStorage.setItem(secretKey,secret);localStorage.removeItem('pakapaka_manager_request_notified_v1');feedback.textContent='הבקשה נשלחה וממתינה לאישור. חזור למסך זה כדי לראות את ההחלטה.';
  }catch(e){feedback.textContent=e.message||'שגיאה בשליחת הבקשה';}finally{submit.disabled=false;}
 });
}

async function checkDepartmentManagerDecision(){
 const secret=localStorage.getItem('pakapaka_manager_request_secret_v1');
 if(!secret||typeof getDeviceId!=='function')return;
 try{
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_request_status',{method:'POST',headers:headers(),body:JSON.stringify({p_device_id:getDeviceId(),p_secret:secret}),cache:'no-store'});
  if(!response.ok)return;
  const state=await response.json();
  if(state!=='approved'&&state!=='rejected')return;
  if(localStorage.getItem('pakapaka_manager_request_notified_v1')===state)return;
  localStorage.setItem('pakapaka_manager_request_notified_v1',state);
  showAppDialog({title:'בקשת מנהל מחלקה',text:state==='approved'?'הבקשה אושרה. נתוני מנהל המחלקה זמינים בהגדרות.':'הבקשה נדחתה. ניתן להגיש בקשה חדשה.',actions:[{label:'סגור'}]});
 }catch{}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDepartmentManagerDecision();});
window.addEventListener('load',()=>setTimeout(checkDepartmentManagerDecision,1200));
