(function(){
 const key='pakapaka_admin_theme_v1';
 const modes=['auto','light','dark'];
 const stored=localStorage.getItem(key);
 let mode=modes.includes(stored)?stored:'auto';
 const root=document.documentElement;
 const media=window.matchMedia('(prefers-color-scheme: dark)');
 const color=()=>mode==='dark'||(mode==='auto'&&media.matches);
 function update(){
  if(mode==='auto')root.removeAttribute('data-admin-theme');
  else root.setAttribute('data-admin-theme',mode);
  const dark=color();
  const themeColor=document.querySelector('meta[name="theme-color"]');
  if(themeColor)themeColor.content=dark?'#0b1220':'#f4f7fb';
  const button=document.getElementById('adminThemeToggle');
  if(button){button.textContent=mode==='auto'?'◐':mode==='dark'?'☾':'☀';button.title=mode==='auto'?'ערכת נושא: לפי המכשיר':mode==='dark'?'ערכת נושא: כהה':'ערכת נושא: בהירה';button.setAttribute('aria-label',button.title);}
 }
 function init(){const button=document.getElementById('adminThemeToggle');if(button)button.addEventListener('click',()=>{mode=modes[(modes.indexOf(mode)+1)%modes.length];localStorage.setItem(key,mode);update();});update();}
 media.addEventListener?.('change',update);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 update();
})();