const SCAN_STATS_TABLE = 'pakapaka_scan_stats';
const DEVICE_STATS_TABLE = 'pakapaka_devices';
const DEVICE_ID_KEY = 'pakapaka_device_id_v1';

function scanStatsUrl(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SCAN_STATS_TABLE}${query}`;
}

function deviceStatsUrl(query = '') {
  return `${SUPABASE_URL}/rest/v1/${DEVICE_STATS_TABLE}${query}`;
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (id) return id;
  const randomPart = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  id = `pk-${randomPart}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

async function recordDeviceScan(department, now) {
  try {
    const deviceId = getDeviceId();
    const q = `?select=device_id,total_scans&device_id=eq.${encodeURIComponent(deviceId)}&limit=1`;
    const existingResponse = await fetch(deviceStatsUrl(q), {
      headers: headers(),
      cache: 'no-store'
    });

    if (!existingResponse.ok) return false;

    const rows = await existingResponse.json();
    if (rows.length) {
      const nextCount = Number(rows[0].total_scans || 0) + 1;
      const updateResponse = await fetch(deviceStatsUrl(`?device_id=eq.${encodeURIComponent(deviceId)}`), {
        method: 'PATCH',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          department,
          total_scans: nextCount,
          last_scan_at: now
        })
      });
      return updateResponse.ok;
    }

    const createResponse = await fetch(deviceStatsUrl(), {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        device_id: deviceId,
        department,
        total_scans: 1,
        first_scan_at: now,
        last_scan_at: now
      })
    });

    return createResponse.ok;
  } catch (e) {
    return false;
  }
}

async function recordItemScan(department, barcode, name, now) {
  try {
    const q = `?select=id,scan_count&department=eq.${encodeURIComponent(department)}&barcode=eq.${encodeURIComponent(barcode)}&limit=1`;
    const existingResponse = await fetch(scanStatsUrl(q), {
      headers: headers(),
      cache: 'no-store'
    });

    if (!existingResponse.ok) return false;

    const rows = await existingResponse.json();
    if (rows.length) {
      const row = rows[0];
      const nextCount = Number(row.scan_count || 0) + 1;
      const updateResponse = await fetch(scanStatsUrl(`?id=eq.${encodeURIComponent(row.id)}`), {
        method: 'PATCH',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          scan_count: nextCount,
          name,
          last_scanned_at: now
        })
      });
      return updateResponse.ok;
    }

    const createResponse = await fetch(scanStatsUrl(), {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        department,
        barcode,
        name,
        scan_count: 1,
        last_scanned_at: now
      })
    });

    return createResponse.ok;
  } catch (e) {
    return false;
  }
}

async function recordPakapakaScan(data = {}) {
  try {
    const department = typeof getDepartment === 'function' ? getDepartment() : '';
    const barcode = String(data.barcode || '').trim();
    const name = String(data.name || '').trim();

    if (!department || !barcode) return false;

    const now = new Date().toISOString();
    await Promise.all([
      recordItemScan(department, barcode, name, now),
      recordDeviceScan(department, now)
    ]);
    return true;
  } catch (e) {
    return false;
  }
}
