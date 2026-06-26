function migrateOldData() {
  const old = localStorage.getItem('pekaot_barcode_v2');
  const cur = localStorage.getItem(STORAGE_KEY);
  if (old && !cur) localStorage.setItem(STORAGE_KEY, old);
}

function normalizeLocalItem(x) {
  const id = Number(x.id || Date.now());
  return {
    id,
    createdAt: Number(x.createdAt || id),
    name: x.name || '',
    code: x.code || '',
    notes: x.notes || '',
    favorite: !!x.favorite,
    openCount: Number(x.openCount || 0)
  };
}

function getLocalItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(normalizeLocalItem);
  } catch (e) {
    return [];
  }
}

function setLocalItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeLocalItem)));
}

function saveLocal(name, code, notes) {
  const now = Date.now();
  const items = getLocalItems();
  items.unshift({ id: now, createdAt: now, name, code, notes, favorite: false, openCount: 0 });
  setLocalItems(items);
}

function copySharedToLocal(item, name) {
  const items = getLocalItems();
  if (items.some(x => x.code === item.code)) return { ok: false, error: 'ברקוד זה כבר קיים במקומי' };
  const now = Date.now();
  items.unshift({
    id: now,
    createdAt: now,
    name: name || item.name || '',
    code: item.code || '',
    notes: item.notes || '',
    favorite: false,
    openCount: 0
  });
  setLocalItems(items);
  return { ok: true };
}

function incrementLocalOpenCount(id) {
  const items = getLocalItems();
  const item = items.find(x => String(x.id) === String(id));
  if (!item) return null;
  item.openCount = Number(item.openCount || 0) + 1;
  setLocalItems(items);
  return item;
}

function getSharedFavs() {
  try {
    return JSON.parse(localStorage.getItem(SHARED_FAV_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function setSharedFavs(ids) {
  localStorage.setItem(SHARED_FAV_KEY, JSON.stringify([...new Set(ids)]));
}
