function showPage(id) {
  document.querySelectorAll('.page,.whitePage').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'newPage') {
    saveTarget = activeTab;
    updateSaveTargetButtons();
  }
  if (id === 'home') renderList();
}

function setSaveTarget(target) {
  saveTarget = target;
  updateSaveTargetButtons();
}

function updateSaveTargetButtons() {
  document.getElementById('saveLocalBtn').classList.toggle('active', saveTarget === 'local');
  document.getElementById('saveSharedBtn').classList.toggle('active', saveTarget === 'shared');
}

function setTab(tab) {
  activeTab = tab;
  localStorage.setItem('pakapaka_active_tab', tab);
  renderList();
  if (tab === 'shared') loadShared();
}

function refreshList() {
  if (activeTab === 'shared') {
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
  if (!name) return alert('חסר שם פקעה');
  if (!built.ok) return alert(built.error);
  if (saveTarget === 'local' && getLocalItems().some(x => x.code === built.code)) return alert('ברקוד זה כבר קיים במקומי');
  if (saveTarget === 'shared' && await sharedCodeExists(built.code)) return alert('ברקוד זה כבר קיים במשותף');

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
  const menu = activeTab === 'local' ? `<button class="itemMenu" data-action="rename" data-id="${escapeAttr(x.id)}">⋯</button>` : '';
  return `<div class="itemShell"><div class="deleteHint">מחק</div><div class="item" data-id="${escapeAttr(x.id)}">${menu}<button class="star ${x.favorite ? 'on' : ''}" data-action="star" data-id="${escapeAttr(x.id)}">★</button><div class="itemDate">${formatDate(x.createdAt)}</div><div class="itemName">${escapeHtml(x.name)}</div>${localMeta}</div></div>`;
}

function bindActions() {
  document.querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.dataset.action === 'star') return;
      if (e.target.dataset.action === 'rename') return;
      handleItemClick(el.dataset.id);
    });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
  });
  document.querySelectorAll('[data-action="star"]').forEach(el => el.addEventListener('click', e => toggleFavorite(e, el.dataset.id)));
  document.querySelectorAll('[data-action="rename"]').forEach(el => el.addEventListener('click', e => renameLocalItem(e, el.dataset.id)));
}

function handleItemClick(id) {
  if (activeTab === 'shared') return promptCopySharedToLocal(id);
  openBarcode(id);
}

function renameLocalItem(event, id) {
  event.stopPropagation();
  if (activeTab !== 'local') return;
  const items = getLocalItems();
  const item = items.find(x => String(x.id) === String(id));
  if (!item) return;
  const name = prompt('שם חדש לפקעה:', item.name || '');
  if (name === null) return;
  const finalName = name.trim();
  if (!finalName) return alert('שם לא יכול להיות ריק');
  item.name = finalName;
  setLocalItems(items);
  renderList();
}

function promptCopySharedToLocal(id) {
  const item = sharedItems.find(x => String(x.id) === String(id));
  if (!item) return;
  const existing = getLocalItems().some(x => x.code === item.code);
  if (existing) return alert('הפקעה כבר קיימת במקומי');
  const name = prompt('שם לשמירה במקומי:', item.name || '');
  if (name === null) return;
  const finalName = name.trim() || item.name || 'פקעה';
  const result = copySharedToLocal(item, finalName);
  if (!result.ok) return alert(result.error);
  alert('נשמר במקומי');
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
  if (!confirm(`למחוק את ${item.name}?`)) {
    renderList();
    return;
  }
  if (activeTab === 'shared') {
    const r = await fetch(apiUrl(`?id=eq.${encodeURIComponent(id)}`), { method: 'DELETE', headers: headers() });
    if (!r.ok) {
      alert('מחיקה מהמשותף נכשלה:\n' + await errorText(r));
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
  touchState = { el: e.currentTarget, id: e.currentTarget.dataset.id, startX: t.clientX, startY: t.clientY, moved: false };
}

function onTouchMove(e) {
  if (!touchState) return;
  const t = e.touches[0];
  const dx = t.clientX - touchState.startX;
  const dy = t.clientY - touchState.startY;
  if (Math.abs(dy) > Math.abs(dx)) return;
  if (dx > 0) {
    e.preventDefault();
    touchState.moved = true;
    touchState.el.style.transform = `translateX(${Math.min(dx, 120)}px)`;
  }
}

function onTouchEnd() {
  if (!touchState) return;
  const current = touchState.el.style.transform.match(/translateX\((\d+)/);
  const dx = current ? Number(current[1]) : 0;
  const id = touchState.id;
  touchState.el.style.transform = '';
  const shouldDelete = touchState.moved && dx > 85;
  touchState = null;
  if (shouldDelete) deleteById(id);
}

function openBarcode(id) {
  const item = incrementLocalOpenCount(id);
  if (!item) return;
  document.getElementById('barcodeName').textContent = item.name;
  document.getElementById('barcodeNumber').textContent = item.code;
  document.getElementById('barcodeSvg').innerHTML = code128Bsvg(item.code);
  showPage('barcodePage');
}

function initApp() {
  migrateOldData();
  setLocalItems(getLocalItems());
  renderList();
}

initApp();
