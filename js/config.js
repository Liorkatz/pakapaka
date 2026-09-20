const VERSION = '1.39';
const STORAGE_KEY = 'pekaot_barcode_v3';
const SHARED_FAV_KEY = 'pakapaka_shared_favorites_v1';
const DEPARTMENT_KEY = 'pakapaka_department_v1';
const SUPABASE_URL = 'https://inotumlxglxsilatijat.supabase.co';
const SUPABASE_KEY = 'sb_' + 'publishable_' + '1wmOkorn4YGH1T9ciWIhZw_Gku_NUE9';
const SHARED_TABLE = 'Pakatable';

let activeTab = localStorage.getItem('pakapaka_active_tab') || 'local';
let saveTarget = activeTab;
let sharedItems = [];
let sharedLoaded = false;
let touchState = null;
let isSaving = false;

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => {
    if (document.querySelector('script[data-pakapaka-hours]')) return;

    // Prevent the hours extension from flashing its pre-fix 0/0 state while it boots.
    let bootstrapGuard = document.getElementById('pakapakaHoursBootstrapGuard');
    if (!bootstrapGuard) {
      bootstrapGuard = document.createElement('style');
      bootstrapGuard.id = 'pakapakaHoursBootstrapGuard';
      bootstrapGuard.textContent = '.hoursRemainingText{display:none!important}';
      document.head.appendChild(bootstrapGuard);
    }

    const releaseHoursGuard = () => {
      const guard = document.getElementById('pakapakaHoursBootstrapGuard');
      if (guard) guard.remove();
    };

    const applyHoursFallbackFix = () => {
      window.hasTrackedHours = function (meta) {
        if (!meta) return false;
        if (meta.totalHours === null || meta.totalHours === undefined || meta.totalHours === '') return false;
        const total = Number(meta.totalHours);
        return Number.isFinite(total) && total > 0;
      };
      if (typeof renderList === 'function') renderList();
      releaseHoursGuard();
    };

    const script = document.createElement('script');
    script.src = `js/hours.js?v=${encodeURIComponent(VERSION)}`;
    script.dataset.pakapakaHours = '1';
    script.onload = () => {
      const fix = document.createElement('script');
      fix.src = `js/hours-display-fix.js?v=${encodeURIComponent(VERSION)}`;
      fix.dataset.pakapakaHoursDisplayFix = '1';
      fix.onload = () => {
        if (typeof renderList === 'function') renderList();
        releaseHoursGuard();
      };
      fix.onerror = applyHoursFallbackFix;
      document.body.appendChild(fix);
    };
    script.onerror = releaseHoursGuard;
    document.body.appendChild(script);
  });
}
