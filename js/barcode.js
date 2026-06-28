const ITF_PATTERNS = {
  '0': 'nnwwn',
  '1': 'wnnnw',
  '2': 'nwnnw',
  '3': 'wwnnn',
  '4': 'nnwnw',
  '5': 'wnwnn',
  '6': 'nwwnn',
  '7': 'nnnww',
  '8': 'wnnwn',
  '9': 'nwnwn'
};

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

function itfMod10CheckDigit(code) {
  code = onlyDigits(code);
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = Number(code[code.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

function normalizeItfCode(code) {
  code = onlyDigits(code);
  if (!code) return '';
  if (code.length % 2 === 1) return code + itfMod10CheckDigit(code);
  return code;
}

function itfSvg(text) {
  const code = normalizeItfCode(text);
  if (!/^\d+$/.test(code) || code.length % 2 !== 0) return '';

  const module = 2.9;
  const height = 180;
  const quiet = module * 10;
  let x = quiet;
  let bars = '';

  function addBar(widthUnits) {
    const w = widthUnits * module;
    bars += `<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" fill="#000"/>`;
    x += w;
  }

  function addSpace(widthUnits) {
    x += widthUnits * module;
  }

  addBar(1);
  addSpace(1);
  addBar(1);
  addSpace(1);

  for (let i = 0; i < code.length; i += 2) {
    const barsPattern = ITF_PATTERNS[code[i]];
    const spacesPattern = ITF_PATTERNS[code[i + 1]];
    for (let j = 0; j < 5; j++) {
      addBar(barsPattern[j] === 'w' ? 3 : 1);
      addSpace(spacesPattern[j] === 'w' ? 3 : 1);
    }
  }

  addBar(3);
  addSpace(1);
  addBar(1);

  const width = Math.ceil(x + quiet);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" data-encoded="${code}">${bars}</svg>`;
}

function code128Bsvg(text) {
  return itfSvg(text);
}
