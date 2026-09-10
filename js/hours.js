const PAKAPAKA_HOURS_META_KEY = 'pakapaka_hours_meta_v1';
const PAKAPAKA_SCAN_HISTORY_KEY = 'pakapaka_scan_history_v1';
let pakapakaHoursSyncBusy = false;

function getHoursMetaMap() {
  try {
    const value = JSON.parse(localStorage.getItem(PAKAPAKA_HOURS_META_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function setHoursMetaMap(map) {
  localStorage.setItem(PAKAPAKA_HOURS_META_KEY, JSON.stringify(map || {}));
}

function getHoursMeta(code) {
  const map = getHoursMetaMap();
  return map[String(code || '').trim()] || null;
}

function setHoursMeta(code, meta) {
  const key = String(code || '').trim();
  if (!key) return;
  const map = getHoursMetaMap();
  if (!meta) delete map[key];
  else map[key] = {
    totalHours: meta.totalHours === null || meta.totalHours === undefined ? null : Number(meta.totalHours),
    remainingHours: meta.remainingHours === null || meta.remainingHours === undefined ? null : Number(meta.remainingHours),
    sharedId: meta.sharedId === null || meta.sharedId === undefined || meta.sharedId === '' ? null : Number(meta.sharedId),
    sharedDepartment: String(meta.sharedDepartment || '').trim()
  };
  setHoursMetaMap(map);
}

function deleteHoursMeta(code) {
  setHoursMeta(code, null);
}

function hasTrackedHours(meta) {
  return !!meta && Number.isFinite(Number(meta.totalHours));
}

function normalizeHourNumber(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function formatHours(value) {
  const n = normalizeHourNumber(value);
  if (n === null) return '';
  return Number.isInteger(n) ? String(n) : String(n).replace(/0+$/, '').replace(/\.$/, '');
}

function getScanHistory() {
  try {
    const rows = JSON.parse(localStorage.getItem(PAKAPAKA_SCAN_HISTORY_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

function setScanHistory(rows) {
  const limited = (Array.isArray(rows) ? rows : [])
    .sort((a, b) => Number(b.scannedAt || 0) - Number(a.scannedAt || 0))
    .slice(0, 300);
  localStorage.setItem(PAKAPAKA_SCAN_HISTORY_KEY, JSON.stringify(limited));
}

function addScanHistory(entry) {
  const rows = getScanHistory();
  rows.unshift(entry);
  setScanHistory(rows);
}

function latestActiveScan(code) {
  const key = String(code || '').trim();
  return getScanHistory()
    .filter(x => String(x.barcode || '').trim() === key && !x.cancelled)
    .sort((a, b) => Number(b.scannedAt || 0) - Number(a.scannedAt || 0))[0] || null;
}

function ensureHoursStyles() {
  if (document.getElementById('pakapakaHoursStyles')) return;
  const style = document.createElement('style');
  style.id = 'pakapakaHoursStyles';
  style.textContent = `
    .hoursField{margin-top:4px}
    .hoursHint{margin-top:7px;color:#8f8f8f;font-size:13px;line-height:1.3}
    .hoursRemainingText{display:block;margin-top:5px;font-size:13px;font-weight:800;color:#7dd3fc;direction:rtl}
    .hoursRemainingText.low{color:#fbbf24}
    .hoursRemainingText.negative{color:#fb7185}
    .scanFixBtn{display:inline-block;width:auto;margin-top:7px;padding:6px 10px;border-radius:10px;border:1px solid #454545;background:#202020;color:#ddd;font-size:12px;font-weight:700}
    .barcodeActions.hoursMode{display:grid;grid-template-columns:.9fr 1fr 1fr;gap:9px;width:100%}
    .barcodeHoursBtn{background:#111;color:#fff;border:2px solid #111;font-weight:900}
    .barcodeHoursBtn:disabled{opacity:.45}
  `;
  document.head.appendChild(style);
}

function ensureHoursInput() {
  if (document.getElementById('totalHours')) return;
  const notes = document.getElementById('notes');
  if (!notes) return;
  const label = notes.previousElementSibling;
  const wrap = document.createElement('div');
  wrap.className = 'hoursField';
  wrap.innerHTML = `
    <label for="totalHours">סה״כ שעות בפקע <span class="labelHint">לא חובה</span></label>
    <input id="totalHours" inputmode="decimal" autocomplete="off" maxlength="8" placeholder="לדוגמה 100">
    <div class="hoursHint">אם משאירים ריק, הפקע נשאר רגיל ללא ניהול שעות.</div>`;
  if (label && label.tagName === 'LABEL') label.insertAdjacentElement('beforebegin', wrap);
  else notes.insertAdjacentElement('beforebegin', wrap);
}

function readHoursInput() {
  const input = document.getElementById('totalHours');
  if (!input) return { ok: true, value: null };
  const raw = String(input.value || '').trim();
  if (!raw) return { ok: true, value: null };
  const value = normalizeHourNumber(raw);
  if (value === null || value <= 0 || value > 100000) {
    return { ok: false, error: 'מספר השעות חייב להיות גדול מ־0 ועד 100000.' };
  }
  return { ok: true, value };
}

async function loadSharedWithHours() {
  const department = getDepartment();
  if (!department) {
    sharedLoaded = false;
    sharedItems = [];
    if (activeTab === 'shared') showDepartmentRequired();
    return;
  }
  if (activeTab === 'shared') showLoading();
  try {
    const q = `?select=id,name,barcode,notes,created_at,department,total_hours,remaining_hours&department=eq.${encodeURIComponent(department)}&order=created_at.desc`;
    const r = await fetch(apiUrl(q), { headers: headers(), cache: 'no-store' });
    if (!r.ok) throw new Error(await errorText(r));
    const favs = getSharedFavs();
    sharedItems = (await r.json()).map(x => ({
      id: x.id,
      createdAt: new Date(x.created_at).getTime(),
      name: x.name,
      code: x.barcode,
      notes: x.notes || '',
      department: x.department || department,
      favorite: favs.includes(String(x.id)),
      totalHours: x.total_hours === null ? null : Number(x.total_hours),
      remainingHours: x.remaining_hours === null ? null : Number(x.remaining_hours)
    }));
    sharedLoaded = true;
    renderList();
  } catch (e) {
    document.getElementById('list').innerHTML = `<div class="empty">שגיאה בטעינת המשותף.<br>${escapeHtml(e.message)}</div>`;
  }
}

async function saveSharedWithHours(name, code, notes, totalHours) {
  const department = getDepartment();
  if (!department) throw new Error('חסרה מחלקה');
  const lockKey = `pakapaka_saving_${department}_${code}`;
  if (window[lockKey]) return true;
  window[lockKey] = true;
  try {
    const body = { name, barcode: code, notes, department };
    if (totalHours !== null) {
      body.total_hours = totalHours;
      body.remaining_hours = totalHours;
    }
    const r = await fetch(apiUrl(), {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const msg = await errorText(r);
      if (isDuplicateError(msg)) throw new Error('הברקוד כבר קיים במחלקה הזאת');
      throw new Error('השמירה למשותף נכשלה. נסה שוב.');
    }
    sharedLoaded = false;
    await loadSharedWithHours();
    return true;
  } finally {
    window[lockKey] = false;
  }
}

async function saveItemWithHours() {
  if (window.__savingHoursItemNow) return;
  window.__savingHoursItemNow = true;
  const btn = document.querySelector('#newPage .save');
  const oldText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'שומר...';
  }
  try {
    const name = document.getElementById('name').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const built = buildCode();
    const hours = readHoursInput();
    if (!name) return showAppDialog({ title: 'חסר שם פקעה', text: 'יש להזין שם לפני שמירה.', actions: [{ label: 'סגור' }] });
    if (!built.ok) return showAppDialog({ title: 'ברקוד לא תקין', text: escapeHtml(built.error), actions: [{ label: 'סגור' }] });
    if (!hours.ok) return showAppDialog({ title: 'שעות לא תקינות', text: escapeHtml(hours.error), actions: [{ label: 'סגור' }] });
    if (saveTarget === 'shared' && !requireDepartment(() => saveItemWithHours())) return;
    if (saveTarget === 'local' && getLocalItems().some(x => x.code === built.code)) return showAppDialog({ title: 'כפילות', text: 'ברקוד זה כבר קיים במקומי.', actions: [{ label: 'סגור' }] });
    if (saveTarget === 'shared' && await sharedCodeExists(built.code)) return showAppDialog({ title: 'כפילות', text: 'ברקוד זה כבר קיים במחלקה הזאת.', actions: [{ label: 'סגור' }] });

    if (saveTarget === 'shared') {
      await saveSharedWithHours(name, built.code, notes, hours.value);
      activeTab = 'shared';
      localStorage.setItem('pakapaka_active_tab', 'shared');
    } else {
      saveLocal(name, built.code, notes);
      if (hours.value !== null) {
        setHoursMeta(built.code, { totalHours: hours.value, remainingHours: hours.value, sharedId: null, sharedDepartment: '' });
      } else {
        deleteHoursMeta(built.code);
      }
      activeTab = 'local';
      localStorage.setItem('pakapaka_active_tab', 'local');
    }

    document.getElementById('name').value = '';
    document.getElementById('codeBase').value = '';
    document.getElementById('codeSuffix').value = '';
    document.getElementById('notes').value = '';
    const hoursInput = document.getElementById('totalHours');
    if (hoursInput) hoursInput.value = '';
    showPage('home');
  } catch (e) {
    showAppDialog({ title: 'השמירה נכשלה', text: escapeHtml(e.message || 'נסה שוב.'), actions: [{ label: 'סגור' }] });
  } finally {
    window.__savingHoursItemNow = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText || 'שמור';
    }
  }
}

function copySharedToLocalWithHours(item, name) {
  const original = window.__pakapakaOriginalCopySharedToLocal;
  const result = original(item, name);
  if (result && result.ok) {
    setHoursMeta(item.code, {
      totalHours: item.totalHours === null || item.totalHours === undefined ? null : Number(item.totalHours),
      remainingHours: item.remainingHours === null || item.remainingHours === undefined ? null : Number(item.remainingHours),
      sharedId: item.id,
      sharedDepartment: item.department || getDepartment()
    });
  }
  return result;
}

async function syncSharedHoursForLocal(renderAfter = true) {
  if (pakapakaHoursSyncBusy) return;
  const items = getLocalItems();
  const metas = getHoursMetaMap();
  const ids = [...new Set(items.map(x => metas[x.code] && metas[x.code].sharedId).filter(Boolean).map(Number))];
  if (!ids.length) return;
  pakapakaHoursSyncBusy = true;
  try {
    const q = `?select=id,department,total_hours,remaining_hours&id=in.(${ids.join(',')})`;
    const r = await fetch(apiUrl(q), { headers: headers(), cache: 'no-store' });
    if (!r.ok) return;
    const rows = await r.json();
    const byId = new Map(rows.map(x => [String(x.id), x]));
    let changed = false;
    for (const item of items) {
      const meta = metas[item.code];
      if (!meta || !meta.sharedId) continue;
      const row = byId.get(String(meta.sharedId));
      if (!row) continue;
      const nextTotal = row.total_hours === null ? null : Number(row.total_hours);
      const nextRemaining = row.remaining_hours === null ? null : Number(row.remaining_hours);
      if (meta.totalHours !== nextTotal || meta.remainingHours !== nextRemaining || meta.sharedDepartment !== String(row.department || '')) {
        meta.totalHours = nextTotal;
        meta.remainingHours = nextRemaining;
        meta.sharedDepartment = String(row.department || meta.sharedDepartment || '');
        changed = true;
      }
    }
    if (changed) {
      setHoursMetaMap(metas);
      if (renderAfter && activeTab === 'local') renderList();
    }
  } catch (e) {
  } finally {
    pakapakaHoursSyncBusy = false;
  }
}

function getItemHoursState(item) {
  if (activeTab === 'shared') {
    return {
      totalHours: item.totalHours === null || item.totalHours === undefined ? null : Number(item.totalHours),
      remainingHours: item.remainingHours === null || item.remainingHours === undefined ? null : Number(item.remainingHours)
    };
  }
  const meta = getHoursMeta(item.code);
  return meta || { totalHours: null, remainingHours: null };
}

function hoursExtraHtml(item) {
  const state = getItemHoursState(item);
  let html = '';
  if (hasTrackedHours(state)) {
    const remaining = Number(state.remainingHours ?? state.totalHours);
    const total = Number(state.totalHours);
    const cls = remaining < 0 ? ' negative' : remaining <= 12 ? ' low' : '';
    html += `<span class="hoursRemainingText${cls}">נשארו ${escapeHtml(formatHours(remaining))} מתוך ${escapeHtml(formatHours(total))} שעות</span>`;
  }
  if (activeTab === 'local' && latestActiveScan(item.code)) {
    html += `<button type="button" class="scanFixBtn" onclick="event.stopPropagation();openScanCorrection('${escapeAttr(item.id)}')">תיקון סריקה</button>`;
  }
  return html;
}

function patchRenderItemForHours() {
  if (window.__pakapakaHoursRenderPatched) return;
  window.__pakapakaHoursRenderPatched = true;
  const base = window.renderItem;
  window.renderItem = function(item) {
    let html = base(item);
    const extra = hoursExtraHtml(item);
    if (!extra) return html;
    const needle = `<div class="itemName">${escapeHtml(item.name)}`;
    return html.replace(needle, `${needle}${extra}`);
  };
}

function configureBarcodeHoursButtons(item) {
  const actions = document.querySelector('#barcodePage .barcodeActions');
  if (!actions) return;
  const meta = getHoursMeta(item.code);
  actions.classList.toggle('hoursMode', hasTrackedHours(meta));
  if (hasTrackedHours(meta)) {
    actions.innerHTML = `
      <button class="barcodeBackBtn" onclick="showPage('home')">חזרה</button>
      <button class="barcodeScannedBtn barcodeHoursBtn" onclick="handleBarcodeScanned(8.5)">8.5</button>
      <button class="barcodeScannedBtn barcodeHoursBtn" onclick="handleBarcodeScanned(12)">12</button>`;
  } else {
    actions.innerHTML = `
      <button class="barcodeBackBtn" onclick="showPage('home')">חזרה</button>
      <button class="barcodeScannedBtn" onclick="handleBarcodeScanned()">נסרק</button>`;
  }
}

async function recordPakapakaScanV2({ barcode, name, hours, meta }) {
  const selectedDepartment = String((meta && meta.sharedDepartment) || (typeof getDepartment === 'function' ? getDepartment() : '') || '').trim();
  const department = selectedDepartment || 'ללא מחלקה';
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_pakapaka_scan_v2`, {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({
      p_device_id: getDeviceId(),
      p_department: department,
      p_barcode: String(barcode || '').trim(),
      p_name: String(name || '').trim(),
      p_shared_item_id: meta && meta.sharedId ? Number(meta.sharedId) : null,
      p_hours: hours === null || hours === undefined ? null : Number(hours)
    })
  });
  if (!response.ok) throw new Error(await errorText(response));
  const rows = await response.json();
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

function updateLocalAfterScan(item, hours, meta, serverResult) {
  const now = Date.now();
  incrementLocalScanCountByCode(item.code);
  if (hasTrackedHours(meta)) {
    if (meta.sharedId && serverResult && serverResult.remaining_hours !== null && serverResult.remaining_hours !== undefined) {
      meta.remainingHours = Number(serverResult.remaining_hours);
      if (serverResult.total_hours !== null && serverResult.total_hours !== undefined) meta.totalHours = Number(serverResult.total_hours);
    } else {
      meta.remainingHours = Number(meta.remainingHours ?? meta.totalHours) - Number(hours);
    }
    setHoursMeta(item.code, meta);
  }
  addScanHistory({
    localId: `${now}-${Math.random().toString(16).slice(2)}`,
    eventId: serverResult && serverResult.event_id ? serverResult.event_id : null,
    correctionToken: serverResult && serverResult.correction_token ? serverResult.correction_token : null,
    barcode: item.code,
    name: item.name || '',
    hours: hours === null || hours === undefined ? null : Number(hours),
    sharedId: meta && meta.sharedId ? Number(meta.sharedId) : null,
    scannedAt: now,
    cancelled: false
  });
}

async function handleBarcodeScannedWithHours(selectedHours = null) {
  if (window.__pakapakaScanSubmitting) return;
  const barcodeEl = document.getElementById('barcodeNumber');
  const barcode = barcodeEl ? String(barcodeEl.textContent || '').trim() : '';
  const item = getLocalItems().find(x => String(x.code) === barcode);
  if (!item) return showPage('home');
  const meta = getHoursMeta(item.code);
  const tracked = hasTrackedHours(meta);
  if (tracked && ![8.5, 12].includes(Number(selectedHours))) {
    return showAppDialog({
      title: 'כמה שעות להוריד?',
      text: 'בחר את משך הסריקה.',
      actions: [
        { label: '8.5 שעות', onClick: () => handleBarcodeScannedWithHours(8.5) },
        { label: '12 שעות', onClick: () => handleBarcodeScannedWithHours(12) },
        { label: 'ביטול', kind: 'secondary' }
      ]
    });
  }
  const hours = tracked ? Number(selectedHours) : null;
  window.__pakapakaScanSubmitting = true;
  document.querySelectorAll('#barcodePage .barcodeScannedBtn').forEach(b => b.disabled = true);
  try {
    let serverResult = null;
    try {
      serverResult = await recordPakapakaScanV2({ barcode: item.code, name: item.name, hours, meta });
    } catch (e) {
      if (tracked && meta && meta.sharedId) {
        showAppDialog({ title: 'הסריקה לא נרשמה', text: 'לא ניתן לעדכן את יתרת השעות המשותפת. בדוק חיבור ונסה שוב.', actions: [{ label: 'סגור' }] });
        return;
      }
    }
    updateLocalAfterScan(item, hours, meta, serverResult);
    showPage('home');
    if (meta && meta.sharedId) syncSharedHoursForLocal(true);
  } finally {
    window.__pakapakaScanSubmitting = false;
    document.querySelectorAll('#barcodePage .barcodeScannedBtn').forEach(b => b.disabled = false);
  }
}

async function callScanCorrection(scan, newHours, cancel) {
  if (!scan.eventId || !scan.correctionToken) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/correct_pakapaka_scan`, {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({
      p_event_id: scan.eventId,
      p_correction_token: scan.correctionToken,
      p_new_hours: cancel ? null : Number(newHours),
      p_cancel: !!cancel
    })
  });
  if (!response.ok) throw new Error(await errorText(response));
  const rows = await response.json();
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

function updateLocalScanSummaryAfterCancel(code) {
  const rows = getScanHistory();
  const previous = rows
    .filter(x => String(x.barcode) === String(code) && !x.cancelled)
    .sort((a, b) => Number(b.scannedAt || 0) - Number(a.scannedAt || 0))[0] || null;
  const items = getLocalItems();
  const item = items.find(x => String(x.code) === String(code));
  if (!item) return;
  item.openCount = Math.max(0, Number(item.openCount || 0) - 1);
  item.lastScannedAt = previous ? Number(previous.scannedAt || 0) : 0;
  setLocalItems(items);
}

async function correctScanHours(scan, newHours) {
  const next = Number(newHours);
  const old = Number(scan.hours);
  if (![8.5, 12].includes(next) || ![8.5, 12].includes(old) || next === old) return;
  const meta = getHoursMeta(scan.barcode);
  let serverResult = null;
  try {
    if (scan.eventId && scan.correctionToken) serverResult = await callScanCorrection(scan, next, false);
    else if (meta && meta.sharedId) throw new Error('missing correction token');
  } catch (e) {
    return showAppDialog({ title: 'התיקון נכשל', text: 'לא ניתן לעדכן את הסריקה. נסה שוב.', actions: [{ label: 'סגור' }] });
  }

  if (hasTrackedHours(meta)) {
    if (meta.sharedId && serverResult && serverResult.remaining_hours !== null && serverResult.remaining_hours !== undefined) {
      meta.remainingHours = Number(serverResult.remaining_hours);
    } else {
      meta.remainingHours = Number(meta.remainingHours ?? meta.totalHours) + old - next;
    }
    setHoursMeta(scan.barcode, meta);
  }
  const rows = getScanHistory();
  const target = rows.find(x => x.localId === scan.localId);
  if (target) target.hours = next;
  setScanHistory(rows);
  renderList();
  showAppDialog({ title: 'הסריקה תוקנה', text: `עודכן מ־${formatHours(old)} ל־${formatHours(next)} שעות.`, actions: [{ label: 'סגור' }] });
}

async function cancelScan(scan) {
  const meta = getHoursMeta(scan.barcode);
  let serverResult = null;
  try {
    if (scan.eventId && scan.correctionToken) serverResult = await callScanCorrection(scan, null, true);
    else if (meta && meta.sharedId && hasTrackedHours(meta)) throw new Error('missing correction token');
  } catch (e) {
    return showAppDialog({ title: 'ביטול הסריקה נכשל', text: 'לא ניתן להחזיר את השעות. נסה שוב.', actions: [{ label: 'סגור' }] });
  }

  if (hasTrackedHours(meta) && scan.hours !== null && scan.hours !== undefined) {
    if (meta.sharedId && serverResult && serverResult.remaining_hours !== null && serverResult.remaining_hours !== undefined) {
      meta.remainingHours = Number(serverResult.remaining_hours);
    } else {
      meta.remainingHours = Number(meta.remainingHours ?? meta.totalHours) + Number(scan.hours);
    }
    setHoursMeta(scan.barcode, meta);
  }

  const rows = getScanHistory();
  const target = rows.find(x => x.localId === scan.localId);
  if (target) target.cancelled = true;
  setScanHistory(rows);
  updateLocalScanSummaryAfterCancel(scan.barcode);
  renderList();
  showAppDialog({ title: 'הסריקה בוטלה', text: 'הסריקה הוסרה והיתרה הוחזרה במידת הצורך.', actions: [{ label: 'סגור' }] });
}

function openScanCorrection(id) {
  const item = getLocalItems().find(x => String(x.id) === String(id));
  if (!item) return;
  const scan = latestActiveScan(item.code);
  if (!scan) return showAppDialog({ title: 'אין סריקה לתיקון', text: 'לא נמצאה סריקה שניתן לתקן במכשיר הזה.', actions: [{ label: 'סגור' }] });
  const actions = [];
  if (scan.hours !== null && scan.hours !== undefined) {
    actions.push({ label: 'שנה ל־8.5', onClick: () => correctScanHours(scan, 8.5) });
    actions.push({ label: 'שנה ל־12', onClick: () => correctScanHours(scan, 12) });
  }
  actions.push({ label: 'בטל סריקה', kind: 'danger', onClick: () => cancelScan(scan) });
  actions.push({ label: 'סגור', kind: 'secondary' });
  showAppDialog({
    title: 'תיקון סריקה',
    text: scan.hours === null || scan.hours === undefined
      ? `סריקה אחרונה: ${escapeHtml(formatLastScannedDate(scan.scannedAt))}`
      : `סריקה אחרונה: ${escapeHtml(formatLastScannedDate(scan.scannedAt))}<br>נרשמו ${escapeHtml(formatHours(scan.hours))} שעות.`,
    actions
  });
}

function patchOpenBarcodeForHours() {
  if (window.__pakapakaHoursBarcodePatched) return;
  window.__pakapakaHoursBarcodePatched = true;
  const base = window.openBarcode;
  window.openBarcode = function(id) {
    const item = getLocalItems().find(x => String(x.id) === String(id));
    const result = base.apply(this, arguments);
    if (item) configureBarcodeHoursButtons(item);
    return result;
  };
}

function patchCopySharedForHours() {
  if (window.__pakapakaHoursCopyPatched) return;
  window.__pakapakaHoursCopyPatched = true;
  window.__pakapakaOriginalCopySharedToLocal = window.copySharedToLocal;
  window.copySharedToLocal = copySharedToLocalWithHours;
}

function patchDeleteCleanupForHours() {
  if (window.__pakapakaHoursDeletePatched) return;
  window.__pakapakaHoursDeletePatched = true;
  const base = window.confirmDeleteById;
  window.confirmDeleteById = async function(id) {
    const wasLocal = activeTab === 'local';
    const item = wasLocal ? getLocalItems().find(x => String(x.id) === String(id)) : null;
    const result = await base.apply(this, arguments);
    if (item && !getLocalItems().some(x => x.code === item.code)) deleteHoursMeta(item.code);
    return result;
  };
}

function patchRefreshForHours() {
  if (window.__pakapakaHoursRefreshPatched) return;
  window.__pakapakaHoursRefreshPatched = true;
  const base = window.refreshList;
  window.refreshList = async function() {
    const result = await base.apply(this, arguments);
    if (activeTab === 'local') await syncSharedHoursForLocal(true);
    return result;
  };
}

function initPakapakaHours() {
  ensureHoursStyles();
  ensureHoursInput();
  window.loadShared = loadSharedWithHours;
  window.saveItem = saveItemWithHours;
  window.handleBarcodeScanned = handleBarcodeScannedWithHours;
  window.openScanCorrection = openScanCorrection;
  patchCopySharedForHours();
  patchRenderItemForHours();
  patchOpenBarcodeForHours();
  patchDeleteCleanupForHours();
  patchRefreshForHours();
  if (activeTab === 'shared' && getDepartment()) {
    sharedLoaded = false;
    loadSharedWithHours();
  } else {
    renderList();
    syncSharedHoursForLocal(true);
  }
  window.addEventListener('focus', () => syncSharedHoursForLocal(true));
  setInterval(() => syncSharedHoursForLocal(activeTab === 'local'), 30000);
}

initPakapakaHours();