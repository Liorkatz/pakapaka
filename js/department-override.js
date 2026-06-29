isValidDepartment = function(value) {
  return /^\d{1,3}$/.test(String(value || '').trim());
};

showDepartmentDialog = function({ title = 'בחירת מחלקה', text = 'הכנס מספר מחלקה עד 3 ספרות.', onSaved } = {}) {
  ensureAppDialogStyles();
  closeAppDialog();
  const backdrop = document.createElement('div');
  backdrop.id = 'appDialogBackdrop';
  backdrop.className = 'appDialogBackdrop';
  const dialog = document.createElement('div');
  dialog.className = 'appDialog';
  dialog.innerHTML = `
    <div class="appDialogTitle">${escapeHtml(title)}</div>
    <div class="appDialogText">${text}</div>
    <input id="departmentInput" class="appDialogInput" inputmode="numeric" maxlength="3" value="${escapeAttr(getDepartment())}" placeholder="000">
    <div id="departmentError" class="appDialogError"></div>
    <div class="appDialogActions two">
      <button type="button" id="departmentCancel" class="appDialogBtn secondary">ביטול</button>
      <button type="button" id="departmentSave" class="appDialogBtn">שמור</button>
    </div>`;
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  const input = document.getElementById('departmentInput');
  const err = document.getElementById('departmentError');
  input.focus();
  input.select();
  input.addEventListener('input', () => {
    input.value = onlyDigits(input.value).slice(0, 3);
    err.textContent = '';
  });
  document.getElementById('departmentCancel').addEventListener('click', closeAppDialog);
  document.getElementById('departmentSave').addEventListener('click', () => {
    const finalValue = onlyDigits(input.value).slice(0, 3);
    if (!isValidDepartment(finalValue)) {
      err.textContent = 'מספר מחלקה חייב להיות עד 3 ספרות.';
      return;
    }
    localStorage.setItem(DEPARTMENT_KEY, finalValue);
    sharedItems = [];
    sharedLoaded = false;
    closeAppDialog();
    updateDepartmentNotice();
    if (typeof onSaved === 'function') onSaved(finalValue);
  });
};
