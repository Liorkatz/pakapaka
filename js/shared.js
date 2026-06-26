async function loadShared() {
  if (activeTab === 'shared') showLoading();
  try {
    const r = await fetch(apiUrl('?select=id,name,barcode,notes,created_at&order=created_at.desc'), {
      headers: headers(),
      cache: 'no-store'
    });
    if (!r.ok) throw new Error(await errorText(r));
    const favs = getSharedFavs();
    sharedItems = (await r.json()).map(x => ({
      id: x.id,
      createdAt: new Date(x.created_at).getTime(),
      name: x.name,
      code: x.barcode,
      notes: x.notes || '',
      favorite: favs.includes(String(x.id))
    }));
    sharedLoaded = true;
    renderList();
  } catch (e) {
    document.getElementById('list').innerHTML = `<div class="empty">שגיאה בטעינת המשותף.<br>${escapeHtml(e.message)}</div>`;
  }
}

async function sharedCodeExists(code) {
  const r = await fetch(apiUrl(`?select=id&barcode=eq.${encodeURIComponent(code)}&limit=1`), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) return false;
  return (await r.json()).length > 0;
}

async function saveShared(name, code, notes) {
  const r = await fetch(apiUrl(), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({ name, barcode: code, notes })
  });
  if (!r.ok) {
    const msg = await errorText(r);
    alert('שמירה למשותף נכשלה:\n' + msg);
    throw new Error(msg);
  }
  sharedLoaded = false;
  await loadShared();
}
