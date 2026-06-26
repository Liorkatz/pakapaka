const C128 = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];

function updateBaseCounter() {
  const baseEl = document.getElementById('codeBase');
  const counter = document.getElementById('baseCounter');
  if (!baseEl || !counter) return;
  const len = onlyDigits(baseEl.value).length;
  if (len === 8) {
    counter.textContent = '✓ הושלם';
    counter.classList.add('done');
    return;
  }
  counter.classList.remove('done');
  const left = Math.max(8 - Math.min(len, 8), 0);
  counter.textContent = left === 1 ? 'נותרה ספרה אחת' : `נותרו ${left} ספרות`;
}

function cleanCodeFields(source) {
  const baseEl = document.getElementById('codeBase');
  const suffixEl = document.getElementById('codeSuffix');
  if (source === 'base') {
    let v = onlyDigits(baseEl.value);
    if (v.length === 15) {
      const parsed = parseFullBarcode(v);
      if (parsed.ok) {
        baseEl.value = parsed.base;
        suffixEl.value = parsed.suffix;
        updateBaseCounter();
        return;
      }
    }
    baseEl.value = v.slice(0, 15);
    updateBaseCounter();
  } else {
    suffixEl.value = onlyDigits(suffixEl.value).slice(0, 3);
  }
}

function parseFullBarcode(code) {
  code = onlyDigits(code);
  if (code.length !== 15) return { ok: false, error: 'ברקוד מלא חייב להיות בדיוק 15 ספרות' };
  if (code.slice(8, 12) !== '0000') return { ok: false, error: 'בברקוד מלא הספרות 9-12 חייבות להיות 0000' };
  return { ok: true, base: code.slice(0, 8), suffix: code.slice(12, 15), code };
}

function buildCode() {
  let base = onlyDigits(document.getElementById('codeBase').value);
  let suffix = onlyDigits(document.getElementById('codeSuffix').value);
  if (base.length === 15 && !suffix) {
    const parsed = parseFullBarcode(base);
    if (!parsed.ok) return parsed;
    document.getElementById('codeBase').value = parsed.base;
    document.getElementById('codeSuffix').value = parsed.suffix;
    updateBaseCounter();
    base = parsed.base;
    suffix = parsed.suffix;
  }
  if (base.length !== 8) return { ok: false, error: 'בסיס חייב להיות בדיוק 8 ספרות' };
  if (!suffix) return { ok: false, error: 'חסרה סיומת' };
  if (suffix.length > 3) return { ok: false, error: 'סיומת יכולה להיות עד 3 ספרות' };
  suffix = suffix.padStart(3, '0');
  document.getElementById('codeSuffix').value = suffix;
  const code = base + '0000' + suffix;
  if (!/^\d{15}$/.test(code)) return { ok: false, error: 'ברקוד סופי חייב להיות 15 ספרות' };
  return { ok: true, code, base, suffix };
}

function code128Bsvg(text) {
  text = String(text);
  let values = [104];
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 127) return '';
    values.push(c - 32);
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  checksum %= 103;
  values.push(checksum, 106);
  let x = 0, module = 3.0, height = 180, bars = '';
  for (const v of values) {
    const p = C128[v];
    for (let i = 0; i < p.length; i++) {
      const w = parseInt(p[i], 10) * module;
      if (i % 2 === 0) bars += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000"/>`;
      x += w;
    }
  }
  const width = Math.ceil(x);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
}
