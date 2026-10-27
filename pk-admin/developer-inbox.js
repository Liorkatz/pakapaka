(function(){
const rpc=async(name,data)=>{const r=await fetch(adminRpcUrl(name),{method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify(data)});if(!r.ok)throw Error('שגיאת שרת');return r.json();};
async function loadInbox(){
 const box=document.getElementById('developerInbox');if(!box)return;
 try{
  const rows=await rpc('pakapaka_admin_contact_inbox',{p_token:getAdminToken()});box.replaceChildren();
  if(!rows.length){box.textContent='אין הודעות';return;}
  for(const x of rows){
   const item=document.createElement('div');item.className='deptRow';
   const title=document.createElement('strong');title.textContent=x.display_name+' · מחלקה '+x.department;item.appendChild(title);
   const preview=document.createElement('p');preview.textContent=x.last_message;item.appendChild(preview);
   const actions=document.createElement('div');actions.className='adminActions';
   const reply=document.createElement('button');reply.className='smallBtn';reply.textContent='פתח שיחה והשב';reply.onclick=()=>openThread(x,item);
   const rename=document.createElement('button');rename.className='smallBtn';rename.textContent='שינוי שם';rename.onclick=async()=>{const n=prompt('שם המשתמש',x.display_name);if(n===null)return;try{if(await rpc('pakapaka_admin_contact_rename',{p_token:getAdminToken(),p_device_id:x.device_id,p_name:n.trim()})){await loadInbox();}else alert('שם לא תקין');}catch{alert('לא ניתן לעדכן שם');}};
   actions.append(reply,rename);item.appendChild(actions);box.appendChild(item);
  }
 }catch{box.textContent='לא ניתן לטעון הודעות';}
}
async function openThread(x,item){
 let panel=item.querySelector('.adminContactThread');if(panel){panel.remove();return;}
 panel=document.createElement('div');panel.className='adminContactThread';item.appendChild(panel);
 try{
  const rows=await rpc('pakapaka_admin_contact_thread',{p_token:getAdminToken(),p_device_id:x.device_id});
  for(const m of rows.reverse()){const p=document.createElement('p');p.textContent=(m.sender==='admin'?'אני: ':'משתמש: ')+m.body;panel.appendChild(p);}
  const area=document.createElement('textarea');area.rows=3;area.placeholder='כתוב תשובה';panel.appendChild(area);
  const send=document.createElement('button');send.className='smallBtn';send.textContent='שלח תשובה';send.onclick=async()=>{send.disabled=true;try{const ok=await rpc('pakapaka_admin_contact_reply',{p_token:getAdminToken(),p_device_id:x.device_id,p_name:x.display_name,p_message:area.value.trim()});if(!ok)throw Error();await loadInbox();}catch{alert('שליחת התשובה נכשלה');send.disabled=false;}};panel.appendChild(send);
 }catch{panel.textContent='לא ניתן לטעון שיחה';}
}
document.getElementById('refreshDeveloperInbox').addEventListener('click',loadInbox);
const old=window.showDashboard;window.showDashboard=async function(...args){const result=await old.apply(this,args);await loadInbox();return result;};
})();