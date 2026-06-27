async function loadShared() {
  const department = getDepartment();
  if (!department) {
    sharedLoaded = false;
    sharedItems = [];
    if (activeTab === 'shared') showDepartmentRequired();
    return;
  }

  if (activeTab === 'shared') showLoading();
  try {
    const q = `?select=id,name,barcode,notes,created_at,department&department=eq.${encodeURIComponent(department)}&order=created_at.desc`;
    const r = await fetch(apiUrl(q), {
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
      department: x.department || department,
      favorite: favs.includes(String(x.id))
    }));
    sharedLoaded = true;
    renderList();
  } catch (e) {
    document.getElementById('list').innerHTML = `<div class="empty">שגיאה בטעינת המשותף.<br>${escapeHtml(e.message)}</div>`;
  }
}

async function sharedCodeExists(code) {
  const department = getDepartment();
  if (!department) return false;
  const q = `?select=id&barcode=eq.${encodeURIComponent(code)}&department=eq.${encodeURIComponent(department)}&limit=1`;
  const r = await fetch(apiUrl(q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) return false;
  return (await r.json()).length > 0;
}

async function saveShared(name, code, notes) {
  const department = getDepartment();
  if (!department) throw new Error('חסרה מחלקה');

  const r = await fetch(apiUrl(), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({ name, barcode: code, notes, department })
  });
  if (!r.ok) {
    const msg = await errorText(r);
    alert('שמירה למשותף נכשלה:\n' + msg);
    throw new Error(msg);
  }
  sharedLoaded = false;
  await loadShared();
  alert(`נשמר למשותף — מחלקה ${department}`);
}