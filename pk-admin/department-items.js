(function(){
  const $=id=>document.getElementById(id);
  const panel=$('departmentItemManager');
  if(!panel)return;
  const departmentSelect=$('editItemsDepartment');
  const list=$('departmentItemsList');
  const status=$('departmentItemsStatus');
  const filter=$('departmentItemsFilter');
  let items=[];
  let busy=false;
  function message(text){status.textContent=text;}
  function element(tag,cls,txt){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=txt;
    return e;
  }
  async function rpc(name,params){
    const token=getAdminToken();
    if(!token)throw Error('יש להיכנס לפאנל הניהול מחדש');
    const r=await fetch(adminRpcUrl(name),{
      method:'POST',headers:headers(),cache:'no-store',body:JSON.stringify({...params,p_token:token})
    });
    if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.message||'שגיאת שרת '+r.status);}
    return r.json();
  }
  async function departments(){
    try{
      const rows=await rpc('pakapaka_admin_item_departments',{});
      const old=departmentSelect.value;
      departmentSelect.replaceChildren();
      departmentSelect.appendChild(element('option',null,'בחר מחלקה'));
      departmentSelect.firstChild.value='';
      for(const row of rows){
        const opt=element('option',null,'מחלקה '+row.department+' ('+row.item_count+' פקעות)');
        opt.value=row.department;
        departmentSelect.appendChild(opt);
      }
      if([...departmentSelect.options].some(o=>o.value===old))departmentSelect.value=old;
      message(rows.length?'בחר מחלקה כדי לראות ולערוך את כל הפקעות שלה.':'לא נמצאו מחלקות עם פקעות.');
      if(departmentSelect.value)await load();
    }catch(e){message('טעינת המחלקות נכשלה: '+e.message);}
  }
  function display(){
    list.replaceChildren();
    const term=filter.value.trim().toLowerCase();
    const matching=items.filter(i=>!term||[i.name,i.barcode,i.notes].some(v=>String(v||'').toLowerCase().includes(term)));
    $('departmentItemsCount').textContent=matching.length+' פקעות';
    if(!matching.length){list.appendChild(element('p','itemManagerEmpty',items.length?'לא נמצאו פקעות שתואמות לחיפוש.':'אין פקעות במחלקה שנבחרה.'));return;}
    for(const item of matching){
      const row=element('div','managedItemRow');
      const info=element('div','managedItemInfo');
      info.append(element('strong',null,item.name),element('span','managedItemCode',item.barcode));
      const edit=element('button','smallBtn managedItemEdit','עריכה');
      edit.type='button';edit.onclick=()=>openEditor(item);
      row.append(info,edit);
      list.appendChild(row);
    }
  }
  async function load(){
    if(busy)return;
    const department=departmentSelect.value;
    items=[];list.replaceChildren();
    if(!department){message('בחר מחלקה');display();return;}
    busy=true;message('טוענת את פקעות המחלקה...');
    try{
      items=await rpc('pakapaka_admin_department_items',{p_department:department});
      message('מחלקה '+department+' — ניתן לערוך שם, מספר והערות. אין שינוי בשעות או בסריקות.');
      display();
    }catch(e){message('טעינת הפקעות נכשלה: '+e.message);}
    finally{busy=false;}
  }
  function openEditor(item){
    const overlay=element('div','managedItemOverlay');
    const dialog=element('div','managedItemDialog');
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label','עריכת פקעה');
    dialog.appendChild(element('h2',null,'עריכת פקעה'));
    function field(label,value,multi=false){
      const wrap=element('label','managedField');
      wrap.appendChild(element('span',null,label));
      const input=element(multi?'textarea':'input');
      if(!multi)input.type='text';else input.rows=3;
      input.value=String(value||'');
      input.maxLength=multi?3000:label==='שם הפקעה'?160:15;
      if(label==='מספר פקעה'){input.inputMode='numeric';input.dir='ltr';}
      wrap.appendChild(input);dialog.appendChild(wrap);
      return input;
    }
    const name=field('שם הפקעה',item.name);
    const code=field('מספר פקעה',item.barcode);
    const notes=field('הערות',item.notes,true);
    const error=element('p','managedItemError');error.setAttribute('role','status');dialog.appendChild(error);
    const actions=element('div','managedItemActions');
    const cancel=element('button','smallBtn','ביטול');
    cancel.type='button';cancel.onclick=()=>overlay.remove();
    const save=element('button','smallBtn managedSave','שמור שינויים');
    save.type='button';
    save.onclick=async()=>{
      const n=name.value.trim(),c=code.value.trim(),t=notes.value.trim();
      if(!n||!/^[0-9]{15}$/.test(c)){error.textContent='יש להזין שם ומספר פקעה בן 15 ספרות.';return;}
      if(items.some(x=>String(x.id)!==String(item.id)&&x.barcode===c)){error.textContent='מספר זה כבר קיים במחלקה.';return;}
      save.disabled=true;error.textContent='שומרת...';
      try{
        const ok=await rpc('pakapaka_admin_edit_department_item',{
          p_id:item.id,p_department:item.department,p_name:n,p_barcode:c,p_notes:t
        });
        if(!ok)throw Error('הפקעה לא נמצאה או שהנתונים אינם תקינים');
        overlay.remove();
        message('השינויים נשמרו בשרת. מספר מעודכן יסתנכרן למכשירים עם עותק מקושר.');
        await load();
      }catch(e){
        error.textContent=/duplicate|unique/i.test(e.message)?'מספר הפקעה כבר קיים במחלקה.':'השמירה נכשלה: '+e.message;
      }finally{save.disabled=false;}
    };
    actions.append(cancel,save);dialog.appendChild(actions);overlay.appendChild(dialog);
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
    document.body.appendChild(overlay);
    name.focus();
  }
  departmentSelect.addEventListener('change',load);
  filter.addEventListener('input',display);
  $('refreshDepartmentItems').addEventListener('click',departments);
  // Load only after authentication; an empty/stale token never grants access.
  $('departmentItemsNavAnchor')?.addEventListener('click',departments);
  window.loadAdminDepartmentItems=departments;
  if(getAdminToken())departments();
})();