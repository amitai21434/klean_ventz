/* ============================================================
   TASKS — personal to-do list (text + optional date/time + optional customer)
   Surfaces overdue & today items on the Dashboard.
   ============================================================ */
function tEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function tAttr(s){return String(s||'').replace(/"/g,'&quot;');}

function taskState(t){
  const today=dOff(0);
  if(!t.date)return'nodate';
  if(t.date<today)return'overdue';
  if(t.date===today)return'today';
  return'upcoming';
}
function taskBadge(t){
  const st=taskState(t);
  if(st==='overdue'){const d=Math.round((new Date(dOff(0))-new Date(t.date))/86400000);return['badge-red','Overdue '+d+'d'];}
  if(st==='today')return['badge-amber','Today'];
  if(st==='upcoming')return['badge-ink',fmtDate(t.date)];
  return['badge-outline','No date'];
}
function taskCust(t){if(!t.customerId)return null;return customers.find(c=>c.id===t.customerId)||null;}

/* clickable phone/email chip — auto-detects which */
function taskContactChip(contact){
  if(!contact)return '';
  const isEmail=contact.includes('@');
  if(isEmail)return `<a class="todo-contact" href="mailto:${tAttr(contact)}" onclick="event.stopPropagation()"><i class="ti ti-mail"></i> ${tEsc(contact)}</a>`;
  const digits=contact.replace(/[^0-9+]/g,'');
  return `<a class="todo-contact" href="tel:${digits}" onclick="event.stopPropagation()"><i class="ti ti-phone"></i> ${tEsc(contact)}</a>`;
}

/* tasks due now (overdue + today), not done — for the dashboard */
function getTodayTasks(){
  const today=dOff(0);
  return tasks.filter(t=>!t.done&&t.date&&t.date<=today)
    .sort((a,b)=>{if(a.date!==b.date)return a.date<b.date?-1:1;return (a.time||'99')<(b.time||'99')?-1:1;});
}
function taskSort(a,b){
  const rank={overdue:0,today:1,upcoming:2,nodate:3};
  const ra=rank[taskState(a)],rb=rank[taskState(b)];
  if(ra!==rb)return ra-rb;
  if(a.date&&b.date&&a.date!==b.date)return a.date<b.date?-1:1;
  return (a.time||'99')<(b.time||'99')?-1:1;
}

/* ---------------------------------------------------------- PAGE */
function renderTasks(){
  const open=tasks.filter(t=>!t.done).sort(taskSort);
  const groups=[
    ['overdue','Overdue','ti-alert-triangle'],
    ['today','Today','ti-clock-hour-4'],
    ['upcoming','Upcoming','ti-calendar'],
    ['nodate','No date','ti-inbox'],
  ];
  let lists='';
  groups.forEach(([key,label,icon])=>{
    const items=open.filter(t=>taskState(t)===key);
    if(!items.length)return;
    lists+=`<div class="card"><div class="card-head" style="margin-bottom:6px"><div class="eyebrow ${key==='overdue'?'':''}" style="${key==='overdue'?'color:var(--red)':''}"><i class="ti ${icon}" ${key==='overdue'?'style="color:var(--red)"':''}></i> ${label}</div><span class="badge ${key==='overdue'?'badge-red':'badge-ink'}">${items.length}</span></div>${items.map(taskListRow).join('')}</div>`;
  });
  if(!open.length){
    lists=`<div class="card"><div class="empty"><i class="ti ti-checklist"></i>No tasks yet. Add your first one above \u2014 anything you need to remember to do.</div></div>`;
  }
  return `
  <div class="card">
    <div class="eyebrow" style="margin-bottom:12px"><i class="ti ti-plus"></i> Quick add</div>
    <div class="task-quickadd">
      <input type="text" id="task-quick-input" placeholder="What do you need to do? (e.g. Call the ad agency)" onkeydown="if(event.key==='Enter')quickAddTask('task-quick-input')">
      <button class="btn btn-primary" onclick="quickAddTask('task-quick-input')"><i class="ti ti-plus"></i> Add</button>
    </div>
    <p class="hint" style="margin-top:10px">Added with today\u2019s date. Tap a task to set a date, time, or link a customer.</p>
  </div>
  ${lists}`;
}

function taskListRow(t){
  const [bc,bl]=taskBadge(t);
  const c=taskCust(t);
  const meta=[];
  if(t.date)meta.push(fmtDate(t.date)+(t.time?' \u00b7 '+fmtTime(t.time):''));
  else meta.push('No date set');
  return `<div class="todo-row">
    <button class="todo-check" title="Mark done" onclick="event.stopPropagation();openTaskDone(${t.id})"><i class="ti ti-circle"></i></button>
    <div class="todo-main" onclick="openTaskModal(${t.id})">
      <div class="todo-text">${tEsc(t.text)}</div>
      <div class="todo-meta"><span><i class="ti ti-clock" style="font-size:13px;vertical-align:-2px"></i> ${meta[0]}</span>${c?` \u00b7 <span class="todo-cust" onclick="event.stopPropagation();openCustomer(${c.id})"><i class="ti ti-user" style="font-size:13px;vertical-align:-2px"></i> ${tEsc(nameOf(c))}</span>`:''}</div>
      ${t.contact?`<div class="todo-contactrow">${taskContactChip(t.contact)}</div>`:''}
    </div>
    <span class="badge ${bc}">${bl}</span>
    <div class="task-actions">
      <button class="btn btn-sm btn-icon" title="Edit" onclick="openTaskModal(${t.id})"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-sm btn-icon" title="Delete" onclick="deleteTask(${t.id})"><i class="ti ti-trash"></i></button>
    </div>
  </div>`;
}

/* compact row used on the dashboard */
function taskDashRow(t){
  const [bc,bl]=taskBadge(t);
  const c=taskCust(t);
  return `<div class="todo-row compact">
    <button class="todo-check" title="Mark done" onclick="event.stopPropagation();openTaskDone(${t.id})"><i class="ti ti-circle"></i></button>
    <div class="todo-main" onclick="openTaskModal(${t.id})">
      <div class="todo-text">${tEsc(t.text)}</div>
      <div class="todo-meta">${t.time?`<span><i class="ti ti-clock" style="font-size:13px;vertical-align:-2px"></i> ${fmtTime(t.time)}</span>`:'<span>Anytime</span>'}${c?` \u00b7 <span class="todo-cust" onclick="event.stopPropagation();openCustomer(${c.id})">${tEsc(nameOf(c))}</span>`:''}${t.contact?' \u00b7 '+taskContactChip(t.contact):''}</div>
    </div>
    <span class="badge ${bc}">${bl}</span>
  </div>`;
}

/* ---------------------------------------------------------- QUICK ADD */
function taskPayloadFromTask(t){
  return {
    text:t.text,
    date:t.date||null,
    time:t.time||null,
    customerId:t.customerId||null,
    contact:t.contact||'',
    done:!!t.done,
    location:t.location||activeLoc
  };
}
function firstReturned(json){return Array.isArray(json)?json[0]:json;}
function replaceTask(updated){
  const idx=tasks.findIndex(t=>t.id===updated.id);
  if(idx>=0)tasks[idx]=updated;
  else tasks.push(updated);
  nextTaskId=Math.max(nextTaskId,(updated.id||0)+1);
}
async function createTask(payload){
  const resp=await fetch(API_BASE+'/api/tasks',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create task failed');}
  const created=firstReturned(await resp.json());
  if(!created)throw new Error('No task returned');
  replaceTask(created);
  return created;
}
async function updateTask(id,payload){
  const resp=await fetch(`${API_BASE}/api/tasks/${id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Update task failed');}
  const updated=firstReturned(await resp.json());
  if(!updated)throw new Error('No task returned');
  replaceTask(updated);
  return updated;
}
async function quickAddTask(inputId){
  const inp=document.getElementById(inputId);if(!inp)return;
  const v=inp.value.trim();if(!v)return toast('Type a task first');
  try{
    await createTask({text:v,date:dOff(0),time:null,customerId:null,contact:'',done:false,location:activeLoc});
    inp.value='';
    toast('Task added for today');
    showView(currentView);
  }catch(err){console.error('quickAddTask error',err);toast('Error adding task');}
}

/* ---------------------------------------------------------- ADD / EDIT MODAL */
function openTaskModal(id){
  const t=id?tasks.find(x=>x.id===id):null;
  const custOpts=customers.slice().sort((a,b)=>nameOf(a)<nameOf(b)?-1:1).map(c=>`<option value="${c.id}" ${t&&t.customerId===c.id?'selected':''}>${tEsc(nameOf(c))}${c.isCompany&&c.contactName?' ('+tEsc(c.contactName)+')':''}</option>`).join('');
  showModal(`${headX(id?'Edit task':'New task',id?'':'Add something to your to-do list')}
  <div class="sheet-body">
    <div class="field"><label>Task</label><textarea id="tk-text" placeholder="What needs doing? e.g. Call the advertising agency about next month\u2019s campaign" style="min-height:70px">${t?tEsc(t.text):''}</textarea></div>
    <div class="field-row">
      <div class="field" style="margin:0"><label>Date <span class="optional-tag">optional</span></label><input type="date" id="tk-date" value="${t&&t.date?t.date:''}"></div>
      <div class="field" style="margin:0"><label>Time <span class="optional-tag">optional</span></label><input type="time" id="tk-time" value="${t&&t.time?t.time:''}"></div>
    </div>
    <div class="field"><label>Phone or email <span class="optional-tag">optional - tap to call or email</span></label><input type="text" id="tk-contact" value="${t?tAttr(t.contact||''):''}" placeholder="(732) 555-0000  or  name@company.com"></div>
    <div class="field" style="margin:0"><label>Link a customer <span class="optional-tag">optional</span></label><select id="tk-cust"><option value="">\u2014 none \u2014</option>${custOpts}</select></div>
    <p class="hint" style="margin-top:12px"><i class="ti ti-info-circle" style="font-size:13px;vertical-align:-1px"></i> Tasks with a date show up on your dashboard \u2014 and stay there as \u201cOverdue\u201d until you handle them.</p>
  </div>
  <div class="sheet-foot">${id?`<button class="btn" style="margin-right:auto;color:var(--red)" onclick="deleteTask(${id})"><i class="ti ti-trash"></i> Delete</button>`:''}<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTask(${id||'null'})"><i class="ti ti-check"></i> ${id?'Save':'Add task'}</button></div>`);
  setTimeout(()=>{const el=document.getElementById('tk-text');if(el){el.focus();}},60);
}
async function saveTask(id){
  const text=document.getElementById('tk-text').value.trim();
  if(!text)return toast('Type a task first');
  const date=document.getElementById('tk-date').value;
  const time=document.getElementById('tk-time').value;
  const cv=document.getElementById('tk-cust').value;
  const customerId=cv?parseInt(cv):null;
  const contact=document.getElementById('tk-contact').value.trim();
  try{
    if(id){
      const t=tasks.find(x=>x.id===id);
      const payload=taskPayloadFromTask(Object.assign({},t||{}, {text,date,time,customerId,contact}));
      await updateTask(id,payload);
      toast('Task saved');
    }else{
      await createTask({text,date:date||null,time:time||null,customerId,contact,done:false,location:activeLoc});
      toast('Task added');
    }
    closeModal();showView(currentView);
  }catch(err){console.error('saveTask error',err);toast('Error saving task');}
}

/* ---------------------------------------------------------- COMPLETE / FOLLOW-UP / DELETE */
function openTaskDone(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  showModal(`${headX('Finish task',tEsc(t.text))}
  <div class="sheet-body">
    <div class="choice" onclick="completeTask(${id})"><i class="ti ti-circle-check lead" style="color:var(--green)"></i><div><div class="choice-title">Done \u2014 remove it</div><div class="choice-sub">Crosses it off and clears it from your list</div></div></div>
    <div class="choice" style="align-items:flex-start" onclick="document.getElementById('tk-fu-wrap').style.display='block';this.style.borderColor='var(--ink-900)'"><i class="ti ti-calendar-repeat lead" style="color:var(--ink-700)"></i><div style="flex:1"><div class="choice-title">Follow up again later</div><div class="choice-sub">Keep it, but push it to a future date so it returns to your dashboard then</div><div id="tk-fu-wrap" style="display:none;margin-top:11px"><input type="date" id="tk-fu-date" value="${addDays(dOff(0),7)}" style="margin-bottom:9px"><button class="btn btn-sm btn-primary" onclick="followUpTask(${id})">Set follow-up date</button></div></div></div>
  </div>`);
}
async function completeTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  try{
    await updateTask(id,taskPayloadFromTask(Object.assign({},t,{done:true})));
    closeModal();toast('Task done');showView(currentView);
  }catch(err){console.error('completeTask error',err);toast('Error completing task');}
}
async function followUpTask(id){
  const d=document.getElementById('tk-fu-date').value;if(!d)return toast('Pick a date');
  const t=tasks.find(x=>x.id===id);if(!t)return;
  try{
    await updateTask(id,taskPayloadFromTask(Object.assign({},t,{date:d,done:false})));
    closeModal();toast('Follow-up set for '+fmtDate(d));showView(currentView);
  }catch(err){console.error('followUpTask error',err);toast('Error setting follow-up');}
}
async function deleteTask(id){
  try{
    const resp=await fetch(`${API_BASE}/api/tasks/${id}`,{method:'DELETE',headers:NGROK_HEADERS});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Delete task failed');}
    tasks=tasks.filter(t=>t.id!==id);
    closeModal();toast('Task deleted');showView(currentView);
  }catch(err){console.error('deleteTask error',err);toast('Error deleting task');}
}
