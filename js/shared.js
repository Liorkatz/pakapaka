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
  const q = `?select=id,department&barcode=eq.${encodeURIComponent(code)}&limit=1`;
  const r = await fetch(apiUrl(q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) return false;
  return (await r.json()).length > 0;
}

function isDuplicateError(msg) {
  return /duplicate key|unique constraint|Pakatable_barcode_key/i.test(String(msg || ''));
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
    if (isDuplicateError(msg)) throw new Error('הברקוד כבר קיים ברשימה המשותפת');
    throw new Error('השמירה למשותף נכשלה. נסה שוב.');
  }
  sharedLoaded = false;
  await loadShared();
  return true;
}