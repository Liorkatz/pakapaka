const CACHE_NAME = 'pakapaka-1-0';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))));
  self.clients.claim();
});

const INJECT = `
<style>
.versionBadge{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:10px;background:#161616;color:#aaa;border:1px solid #333;border-radius:999px;padding:5px 9px;font-size:12px;z-index:9999;direction:ltr}.toastMsg{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#222;color:#fff;border:1px solid #444;border-radius:18px;padding:12px 18px;font-size:17px;z-index:9999;opacity:0;transition:opacity .2s}.toastMsg.show{opacity:1}.sharedDot{display:none;position:absolute;top:8px;left:12px;width:9px;height:9px;background:#ff3b30;border-radius:50%}.sharedDot.on{display:block}.tab{position:relative}
</style>
<script>
(function(){
  var VERSION='1.0', lastKey='pakapaka_last_shared_seen_v1', toastTimer=null, pullY=null, pullDone=false;
  function addVersion(){if(document.getElementById('versionBadge'))return;var d=document.createElement('div');d.id='versionBadge';d.className='versionBadge';d.textContent='v '+VERSION;document.body.appendChild(d)}
  function toast(msg){var t=document.getElementById('toastMsg');if(!t){t=document.createElement('div');t.id='toastMsg';t.className='toastMsg';document.body.appendChild(t)}t.textContent=msg||'עודכן';t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show')},1400)}
  function dot(){var b=document.getElementById('tabShared');if(!b)return null;var d=document.getElementById('sharedDot');if(!d){d=document.createElement('span');d.id='sharedDot';d.className='sharedDot';b.appendChild(d)}return d}
  function seen(){try{if(Array.isArray(sharedItems)&&sharedItems.length)localStorage.setItem(lastKey,String(sharedItems[0].id));var d=dot();if(d)d.classList.remove('on')}catch(e){}}
  async function check(){try{if(typeof SUPABASE_URL==='undefined')return;var r=await fetch(SUPABASE_URL+'/rest/v1/'+SHARED_TABLE+'?select=id&order=created_at.desc&limit=1',{headers:headers(),cache:'no-store'});if(!r.ok)return;var a=await r.json(), latest=a[0]?String(a[0].id):'', old=localStorage.getItem(lastKey)||'';if(latest&&old&&latest!==old&&activeTab!=='shared'){var d=dot();if(d)d.classList.add('on')}if(latest&&!old)localStorage.setItem(lastKey,latest)}catch(e){}}
  function patch(){if(window.__v10)return;window.__v10=true;var oldR=window.refreshList;if(typeof oldR==='function')window.refreshList=async function(){var x=await oldR.apply(this,arguments);toast('עודכן');if(activeTab==='shared')seen();return x};var oldT=window.setTab;if(typeof oldT==='function')window.setTab=function(tab){var x=oldT.apply(this,arguments);if(tab==='shared')setTimeout(seen,700);return x};}
  function pull(){document.addEventListener('touchstart',function(e){var h=document.getElementById('home');if(!h||!h.classList.contains('active')||window.scrollY>0)return;pullY=e.touches[0].clientY;pullDone=false},{passive:true});document.addEventListener('touchmove',function(e){if(pullY===null||pullDone)return;if(e.touches[0].clientY-pullY>95){pullDone=true;if(typeof refreshList==='function')refreshList()}},{passive:true});document.addEventListener('touchend',function(){pullY=null;pullDone=false},{passive:true})}
  function init(){addVersion();dot();patch();pull();check();setInterval(check,30000);window.addEventListener('focus',check)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>`;

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const isHtml = req.mode === 'navigate' || req.destination === 'document' || req.url.endsWith('/pakapaka/') || req.url.endsWith('/pakapaka/index.html');
  if (!isHtml) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }
  event.respondWith(fetch(req, { cache: 'no-store' }).then(r => r.text()).then(html => new Response(html.replace('</body>', INJECT + '</body>'), {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
