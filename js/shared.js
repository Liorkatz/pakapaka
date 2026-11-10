const SHARED_EDIT_SECRET_KEY = 'pakapaka_shared_edit_secret_v1';
function getSharedEditSecret() {
  let token = localStorage.getItem(SHARED_EDIT_SECRET_KEY);
  if (!/^[0-9a-f]{64}$/.test(token || '')) {
    if (!crypto?.getRandomValues) throw new Error('הדפדפן לא תומך בשמירה מאובטחת של בעלות');
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(SHARED_EDIT_SECRET_KEY,token);
  }
  return token;
}
async function sharedEditRpc(name, params) {
  const r = await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify(params)});
  if(!r.ok) throw new Error(await errorText(r));
  return r.json();
}
async function createOwnedShared(name,code,notes,department,totalHours=null){
  return await sharedEditRpc('pakapaka_shared_create_owned',{
    p_name:name,p_barcode:code,p_notes:notes,p_department:department,p_secret:getSharedEditSecret(),p_total_hours:totalHours
  });
}
async function ownedSharedIds(department){
  try{
    const ids=await sharedEditRpc('pakapaka_shared_owned_ids',{p_secret:getSharedEditSecret(),p_department:department});
    return new Set((ids||[]).map(x=>String(x.item_id)));
  }catch(e){return new Set();}
}

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
    const owned = await ownedSharedIds(department);
    sharedItems = (await r.json()).map(x => ({
      canEdit: owned.has(String(x.id)),
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
  const q = `?select=id&department=eq.${encodeURIComponent(department)}&barcode=eq.${encodeURIComponent(code)}&limit=1`;
  const r = await fetch(apiUrl(q), {
    headers: headers(),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('בדיקת כפילות נכשלה. נסה שוב.');
  return (await r.json()).length > 0;
}

function isDuplicateError(msg) {
  return /duplicate key|unique constraint|Pakatable_department_barcode_key|Pakatable_barcode_key/i.test(String(msg || ''));
}

async function saveShared(name, code, notes) {
  const department = getDepartment();
  if (!department) throw new Error('חסרה מחלקה');

  const lockKey = `pakapaka_saving_${department}_${code}`;
  if (window[lockKey]) return true;
  window[lockKey] = true;

  try {
    try {
      await createOwnedShared(name,code,notes,department,null);
    } catch(e){
      if (isDuplicateError(e.message)) throw new Error('הברקוד כבר קיים במחלקה הזאת');
      throw e;
    }
    sharedLoaded = false;
    await loadShared();
    return true;
  } finally {
    window[lockKey] = false;
  }
}