// PakaPaka 1.37 - only show hours UI when a real hours quota was configured.
(function () {
  window.hasTrackedHours = function (meta) {
    if (!meta) return false;
    if (meta.totalHours === null || meta.totalHours === undefined || meta.totalHours === '') return false;
    const total = Number(meta.totalHours);
    return Number.isFinite(total) && total > 0;
  };

  if (typeof renderList === 'function') renderList();
})();
