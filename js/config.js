const VERSION = '1.20';
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
