/* Manager summary is deliberately hidden until a fresh server-side approval check. */
(function(){
 const panel=()=>document.getElementById('departmentManagerSummary');
 let running=false;
 const privateKey='pakapaka_manager_request_secret_v1';
 const hide=()=>{const p=panel();if(p)p.hidden=true;};
 async function refreshManagerSummary(){
  if(running)return;
  const p=panel();if(!p)return;
  const secret=localStorage.getItem(privateKey);
  const department=typeof getDepartment==='function'?getDepartment():'';
  if(!secret||!department||typeof getDeviceId!=='function'){hide();return;}
  running=true;hide();
  try{
   const device=getDeviceId();
   const statusRes=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_request_status',{
    method:'POST',headers:headers(),cache:'no-store',
    body:JSON.stringify({p_device_id:device,p_secret:secret})
   });
   if(!statusRes.ok||await statusRes.json()!=='approved'){hide();return;}
   const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/pakapaka_manager_stats',{
    method:'POST',headers:headers(),cache:'no-store',
    body:JSON.stringify({p_device_id:device,p_code:secret})
   });
   if(!res.ok){hide();return;}
   const data=await res.json();
   if(!data||String(data.department)!==String(getDepartment())){hide();return;}
   document.getElementById('managerSummaryTitle').textContent='מחלקה '+data.department;
   document.getElementById('managerSummaryUsers').textContent=Number(data.users||0).toLocaleString('he-IL');
   document.getElementById('managerSummaryActive').textContent=Number(data.active_users||0).toLocaleString('he-IL');
   document.getElementById('managerSummaryScans').textContent=Number(data.scans||0).toLocaleString('he-IL');
   p.hidden=false;
  }catch{hide();}
  finally{running=false;}
 }
 window.refreshManagerSummary=refreshManagerSummary;
 window.openDepartmentManager=async function(){
  await refreshManagerSummary();
  const p=panel();
  if(p&&!p.hidden){closeAppDialog();showPage('home');p.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(typeof showAppDialog==='function')showAppDialog({title:'ניהול מחלקה',text:'נתוני הניהול זמינים רק לאחר אישור הרשאה למחלקה הנוכחית.',actions:[{label:'סגור'}]});
 };
 window.addEventListener('load',refreshManagerSummary);
 window.addEventListener('pageshow',refreshManagerSummary);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshManagerSummary();});
 const change=window.changeDepartment;
 if(typeof change==='function')window.changeDepartment=function(...args){hide();return change.apply(this,args);};
})();