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
    favorite: !!x.favorite
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
  items.unshift({ id: now, createdAt: now, name, code, notes, favorite: false });
  setLocalItems(items);
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
