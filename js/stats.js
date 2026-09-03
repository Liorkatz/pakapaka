const DEVICE_ID_KEY = 'pakapaka_device_id_v1';
const NO_DEPARTMENT_LABEL = 'ללא מחלקה';

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (id) return id;
  const randomPart = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  id = `pk-${randomPart}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

async function recordPakapakaScan(data = {}) {
  try {
    const selectedDepartment = typeof getDepartment === 'function' ? String(getDepartment() || '').trim() : '';
    const department = selectedDepartment || NO_DEPARTMENT_LABEL;
    const barcode = String(data.barcode || '').trim();
    const name = String(data.name || '').trim();
    const deviceId = getDeviceId();

    if (!barcode) return false;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_pakapaka_scan`, {
      method: 'POST',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify({
        p_device_id: deviceId,
        p_department: department,
        p_barcode: barcode,
        p_name: name
      })
    });

    return response.ok;
  } catch (e) {
    return false;
  }
}
