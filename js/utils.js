function apiUrl(query = '') {
  return `${SUPABASE_URL}/rest/v1/${SHARED_TABLE}${query}`;
}

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function errorText(r) {
  try {
    const j = await r.json();
    return j.message || j.details || JSON.stringify(j);
  } catch (e) {
    return await r.text();
  }
}

function onlyDigits(s) {
  return (s || '').replace(/\D/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(String(s));
}

function formatDate(value) {
  const d = new Date(Number(value) || Date.now());
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
