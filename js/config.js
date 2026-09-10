const VERSION = '1.37';
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
    const script = document.createElement('script');
    script.src = `js/hours.js?v=${encodeURIComponent(VERSION)}`;
    script.dataset.pakapakaHours = '1';
    script.onload = () => {
      const fix = document.createElement('script');
      fix.src = `js/hours-display-fix.js?v=${encodeURIComponent(VERSION)}`;
      fix.dataset.pakapakaHoursDisplayFix = '1';
      document.body.appendChild(fix);
    };
    document.body.appendChild(script);
  });
}
