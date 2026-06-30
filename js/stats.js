const SCAN_STATS_TABLE = 'pakapaka_scan_stats';

function scanStatsUrl(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SCAN_STATS_TABLE}${query}`;
}

async function recordPakapakaScan(data = {}) {
  try {
    const department = typeof getDepartment === 'function' ? getDepartment() : '';
    const barcode = String(data.barcode || '').trim();
    const name = String(data.name || '').trim();

    if (!department || !barcode) return false;

    const q = `?select=id,scan_count&department=eq.${encodeURIComponent(department)}&barcode=eq.${encodeURIComponent(barcode)}&limit=1`;
    const existingResponse = await fetch(scanStatsUrl(q), {
      headers: headers(),
      cache: 'no-store'
    });

    if (!existingResponse.ok) return false;

    const rows = await existingResponse.json();
    const now = new Date().toISOString();

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
