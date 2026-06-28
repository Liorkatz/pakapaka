const CODE39_PATTERNS = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  '*': 'nwnnwnwnn'
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

function code39Svg(text) {
  const code = onlyDigits(text);
  if (!/^\d+$/.test(code)) return '';

  const narrow = 3.0;
  const wide = 7.5;
  const height = 180;
  const quiet = narrow * 10;
  const gap = narrow;
  const fullCode = `*${code}*`;
  let x = quiet;
  let bars = '';

  function addBar(width) {
    bars += `<rect x="${x.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="${height}" fill="#000"/>`;
    x += width;
  }

  function addSpace(width) {
    x += width;
  }

  for (let c = 0; c < fullCode.length; c++) {
    const pattern = CODE39_PATTERNS[fullCode[c]];
    if (!pattern) return '';

    for (let i = 0; i < pattern.length; i++) {
      const w = pattern[i] === 'w' ? wide : narrow;
      if (i % 2 === 0) addBar(w);
      else addSpace(w);
    }

    if (c < fullCode.length - 1) addSpace(gap);
  }

  const width = Math.ceil(x + quiet);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" data-symbology="code39" data-encoded="${code}">${bars}</svg>`;
}

function code128Bsvg(text) {
  return code39Svg(text);
}
