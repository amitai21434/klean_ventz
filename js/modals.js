/* ============================================================
   MODALS — flows + infra
   ============================================================ */
function showModal(html,wide){document.getElementById('modal').innerHTML=`<div class="scrim" onclick="bgClose(event)"><div class="sheet${wide?' wide':''}">${html}</div></div>`;document.body.style.overflow='hidden';}
function closeModal(){document.getElementById('modal').innerHTML='';document.body.style.overflow='';}
function bgClose(e){if(e.target.classList.contains('scrim'))closeModal();}
function toast(msg){const el=document.getElementById('toast');el.innerHTML='<i class="ti ti-check"></i>'+msg;el.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>el.classList.remove('show'),3400);}
function headX(title,sub){return `<div class="sheet-head"><div><div class="sheet-title">${title}</div>${sub?`<div class="sheet-sub">${sub}</div>`:''}</div><button class="close-x" onclick="closeModal()"><i class="ti ti-x"></i></button></div>`;}

/* nav drawer (mobile) */
function toggleNav(){document.getElementById('app').classList.toggle('nav-open');}
function closeNav(){document.getElementById('app').classList.remove('nav-open');}

/* ---------------------------------------------------------- LOG CALL OUTCOME */
function openLogOutcome(custId,reminderId){
  const c=customers.find(x=>x.id===custId);if(!c)return;
  showModal(`${headX('Log call','How did the call with '+nameOf(c)+' go?')}
  <div class="sheet-body">
    <div class="choice" onclick="logNoAnswer(${custId},${reminderId||'null'})"><i class="ti ti-phone-x lead" style="color:var(--amber)"></i><div><div class="choice-title">No answer / left voicemail</div><div class="choice-sub">Sets a follow-up reminder for one week from today</div></div></div>
    <div class="choice" style="align-items:flex-start" onclick="document.getElementById('cb-wrap').style.display='block';this.style.borderColor='var(--ink-900)'"><i class="ti ti-calendar-clock lead" style="color:var(--ink-700)"></i><div style="flex:1"><div class="choice-title">Call back later</div><div class="choice-sub">Customer asked you to reach out on a specific date</div><div id="cb-wrap" style="display:none;margin-top:11px"><input type="date" id="cb-date" value="${addDays(dOff(0),180)}" style="margin-bottom:9px"><button class="btn btn-sm btn-primary" onclick="logCallback(${custId},${reminderId||'null'})">Set callback reminder</button></div></div></div>
    <div class="choice" onclick="closeModal();openScheduleJobForCustomer(${custId})"><i class="ti ti-calendar-check lead" style="color:var(--green)"></i><div><div class="choice-title">Ready to schedule</div><div class="choice-sub">Book the job now</div></div></div>
    <div style="margin-top:10px;text-align:center"><button class="btn btn-sm btn-ghost" onclick="logDismiss(${custId},${reminderId||'null'})">Dismiss for now</button></div>
  </div>`);
}
function upsertReminder(custId,dueDate,reason,reminderId){
  if(reminderId){const r=reminders.find(x=>x.id===reminderId);if(r){r.dueDate=dueDate;r.reason=reason;return;}}
  const existing=reminders.find(x=>x.customerId===custId);
  if(existing){existing.dueDate=dueDate;existing.reason=reason;}
  else reminders.push({id:nextReminderId++,customerId:custId,dueDate,reason});
}
function logNoAnswer(custId,reminderId){upsertReminder(custId,addDays(dOff(0),7),'Left voicemail \u2014 follow up',reminderId);const c=customers.find(x=>x.id===custId);if(c)c.snoozeUntil='';closeModal();toast('Follow-up set for '+fmtDate(addDays(dOff(0),7)));showView('dashboard');}
function logCallback(custId,reminderId){const d=document.getElementById('cb-date').value;if(!d)return toast('Pick a date');upsertReminder(custId,d,'Callback \u2014 customer requested',reminderId);const c=customers.find(x=>x.id===custId);if(c)c.snoozeUntil='';closeModal();toast('Callback reminder set for '+fmtDate(d));showView('dashboard');}
function logDismiss(custId,reminderId){if(reminderId){reminders=reminders.filter(r=>r.id!==reminderId);}else{const c=customers.find(x=>x.id===custId);if(c)c.snoozeUntil=addDays(dOff(0),30);}closeModal();toast('Dismissed');showView('dashboard');}

/* ---------------------------------------------------------- NEW CUSTOMER */
/* ---------- searchable multi-select (lead sources) ---------- */
const MS={};
function msMount(id,selected,custId){MS[id]={sel:selected?selected.slice():[],open:false,q:'',cust:custId||null};return `<div class="ms" id="${id}">${msInner(id)}</div>`;}
function msInner(id){return `<div class="ms-control" id="${id}-ctl">${msCtl(id)}</div><div id="${id}-drop">${msDrop(id)}</div>`;}
function msCtl(id){const st=MS[id];const chips=st.sel.map(s=>`<span class="ms-chip">${lsEsc(s)}<i class="ti ti-x" onmousedown="event.preventDefault();msRemove('${id}','${lsAttr(s)}')"></i></span>`).join('');return `${chips}<input class="ms-input" id="${id}-input" placeholder="${st.sel.length?'Add another\u2026':'Search lead sources\u2026'}" autocomplete="off" oninput="msType('${id}',this.value)" onfocus="msOpen('${id}')" onblur="msBlur('${id}')">`;}
function msDrop(id){const st=MS[id];if(!st.open)return '';const q=st.q.toLowerCase().trim();const avail=LEAD_SOURCES.filter(s=>!st.sel.includes(s));const filtered=(q?avail.filter(s=>s.toLowerCase().includes(q)):avail).slice(0,80);let items=filtered.map(s=>`<div class="ms-opt" onmousedown="event.preventDefault();msAdd('${id}','${lsAttr(s)}')">${lsEsc(s)}</div>`).join('');if(!filtered.length)items=`<div class="ms-empty">No match${q?` \u2014 <span class="ms-create" onmousedown="event.preventDefault();msCreate('${id}')">add \u201c${lsEsc(st.q)}\u201d</span>`:''}</div>`;return `<div class="ms-drop">${items}</div>`;}
function msPaintCtl(id){const el=document.getElementById(id+'-ctl');if(el)el.innerHTML=msCtl(id);}
function msPaintDrop(id){const el=document.getElementById(id+'-drop');if(el)el.innerHTML=msDrop(id);}
function msFocus(id){const i=document.getElementById(id+'-input');if(i)i.focus();}
function msOpen(id){MS[id].open=true;msPaintDrop(id);}
function msBlur(id){setTimeout(()=>{if(MS[id]){MS[id].open=false;MS[id].q='';msPaintDrop(id);}},160);}
function msType(id,v){MS[id].q=v;MS[id].open=true;msPaintDrop(id);}
function msAdd(id,v){const st=MS[id];if(!st.sel.includes(v))st.sel.push(v);st.q='';st.open=true;msPaintCtl(id);msPaintDrop(id);msFocus(id);msSync(id);}
function msRemove(id,v){const st=MS[id];st.sel=st.sel.filter(x=>x!==v);msPaintCtl(id);msPaintDrop(id);msFocus(id);msSync(id);}
function msCreate(id){const st=MS[id];const v=st.q.trim();if(!v)return;if(!LEAD_SOURCES.includes(v))LEAD_SOURCES.push(v);if(!st.sel.includes(v))st.sel.push(v);st.q='';msPaintCtl(id);msPaintDrop(id);msFocus(id);msSync(id);}
function msGet(id){return MS[id]?MS[id].sel.slice():[];}
function msSync(id){const st=MS[id];if(st&&st.cust){const c=customers.find(x=>x.id===st.cust);if(c)c.leadSources=st.sel.slice();}}

function openNewCustomer(){
  showModal(`${headX('New customer','Add someone to the books')}
  <div class="sheet-body">
    <div class="section-title">Account type</div>
    <div class="check-row" style="margin-bottom:14px"><input type="checkbox" id="nc-iscompany"><label for="nc-iscompany">This is a company / landlord account</label></div>
    <div id="nc-company-fields">
      <div class="field"><label>Company / landlord contact name</label><input type="text" id="nc-contact" placeholder="e.g. Okafor Properties (David)"></div>
      <div class="field"><label>Contact phone <span class="optional-tag">for billing</span></label><input type="tel" id="nc-contactphone" placeholder="(732) 555-0000"></div>
    </div>
    <div class="section-title" style="margin-top:8px">Customer</div>
    <div class="field-row"><div class="field" style="margin:0"><label>First name</label><input type="text" id="nc-first" placeholder="Jane"></div><div class="field" style="margin:0"><label>Last name</label><input type="text" id="nc-last" placeholder="Smith"></div></div>
    <div class="field-row"><div class="field" style="margin:0"><label>Phone number</label><input type="tel" id="nc-phone" placeholder="(732) 555-0000"></div><div class="field" style="margin:0"><label>Second phone <span class="optional-tag">optional</span></label><input type="tel" id="nc-phone2" placeholder="(732) 555-0001"></div></div>
    <div class="field"><label>Email</label><input type="email" id="nc-email" placeholder="jane@email.com"></div>
    <div class="field addr-wrap"><label>Address <span class="optional-tag">populates from Google Maps</span></label><input type="text" id="nc-addr" placeholder="123 Main St, City, NJ" autocomplete="off" oninput="addrInput(this.value)" onblur="setTimeout(hideAddrSug,200)"><div id="addr-suggestions" class="addr-suggestions" style="display:none"></div></div>
    <div class="field"><label>Lead source(s) <span class="optional-tag">how did they hear about us \u2014 pick one or more</span></label>${msMount('nc-ls',[])}</div>
    <!-- Service requested removed: customers no longer store requested services -->
    <div class="section-title" style="margin-top:14px">Notes</div>
    <div class="field" style="margin:0"><textarea id="nc-notes" placeholder="Gate code, dog in yard, access instructions\u2026"></textarea></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveNewCustomerAndBook()"><i class="ti ti-calendar-plus"></i> Save & book</button><button class="btn btn-primary" onclick="saveNewCustomer()"><i class="ti ti-user-plus"></i> Save customer</button></div>`);
}
function addrInput(val){const box=document.getElementById('addr-suggestions');if(!box)return;if(val.length<3){box.style.display='none';return;}const filtered=FAKE_ADDRESSES.filter(a=>a.main.toLowerCase().includes(val.toLowerCase())||a.sub.toLowerCase().includes(val.toLowerCase()));if(!filtered.length){box.style.display='none';return;}box.style.display='block';box.innerHTML=filtered.map(a=>`<div class="addr-suggestion" onmousedown="selectAddr('${a.main}, ${a.sub}')"><div class="main-text">${a.main}</div><div class="sub-text">${a.sub}</div></div>`).join('');}
function selectAddr(val){const inp=document.getElementById('nc-addr');if(inp)inp.value=val;hideAddrSug();}
function hideAddrSug(){const box=document.getElementById('addr-suggestions');if(box)box.style.display='none';}
function saveNewCustomer(){
  (async function(){
    const firstName=document.getElementById('nc-first').value.trim();const lastName=document.getElementById('nc-last').value.trim();
    const isCompany=document.getElementById('nc-iscompany').checked;const contactName=document.getElementById('nc-contact').value.trim();
    if(!firstName&&!lastName&&!contactName)return toast('Please enter a name');
    const leadSources=msGet('nc-ls');
    const payload={
      isCompany: isCompany,
      contactName: contactName,
      contactPhone: document.getElementById('nc-contactphone').value,
      firstName: firstName,
      lastName: lastName,
      phone: document.getElementById('nc-phone').value,
      phone2: document.getElementById('nc-phone2').value,
      email: document.getElementById('nc-email').value,
      address: document.getElementById('nc-addr').value,
      leadSources: (leadSources||[]),
      notes: document.getElementById('nc-notes').value,
      lastService: null,
      nextDue: null,
      nextServiceMonths: 12,
      snoozeUntil: null
    };
    try{
      const resp=await fetch('/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();
      const created = Array.isArray(json)?json[0]:json;
      if(created){
        customers.push(created);
        nextCustId = Math.max(nextCustId, (created.id||0)+1);
        closeModal();toast('Customer saved');showView('customers');
      }else{throw new Error('No customer returned');}
    }catch(err){console.error('saveNewCustomer error',err);toast('Error saving customer');}
  })();
}

function saveNewCustomerAndBook(){
  (async function(){
    const firstName=document.getElementById('nc-first').value.trim();const lastName=document.getElementById('nc-last').value.trim();
    const isCompany=document.getElementById('nc-iscompany').checked;const contactName=document.getElementById('nc-contact').value.trim();
    if(!firstName&&!lastName&&!contactName)return toast('Please enter a name');
    const leadSources=msGet('nc-ls');
    const payload={
      isCompany: isCompany,
      contactName: contactName,
      contactPhone: document.getElementById('nc-contactphone').value,
      firstName: firstName,
      lastName: lastName,
      phone: document.getElementById('nc-phone').value,
      phone2: document.getElementById('nc-phone2').value,
      email: document.getElementById('nc-email').value,
      address: document.getElementById('nc-addr').value,
      leadSources: (leadSources||[]),
      notes: document.getElementById('nc-notes').value,
      lastService: null,
      nextDue: null,
      nextServiceMonths: 12,
      snoozeUntil: null
    };
    try{
      const resp=await fetch('/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();
      const created = Array.isArray(json)?json[0]:json;
      if(created){
        customers.push(created);
        nextCustId = Math.max(nextCustId, (created.id||0)+1);
        closeModal();toast('Customer saved');
        // open booking modal prefilled for this customer
        openScheduleJobForCustomer(created.id);
      }else{throw new Error('No customer returned');}
    }catch(err){console.error('saveNewCustomerAndBook error',err);toast('Error saving customer');}
  })();
}

/* ---------------------------------------------------------- CUSTOMER DETAIL */
function openCustomer(id){
  const c=customers.find(x=>x.id===id);if(!c)return;
  const cJobs=jobs.filter(j=>j.customerId===id);const phoneDigits=c.phone.replace(/[^0-9]/g,'');
  const openRem=reminders.find(r=>r.customerId===id);
  const sortedJobs=cJobs.sort((a,b)=>a.date>b.date?-1:1);
  showModal(`<div class="sheet-head"><div style="display:flex;align-items:center;gap:12px"><div class="avatar lg ${c.isCompany?'company':''}">${initials(c)}</div><div><div class="sheet-title">${nameOf(c)}</div>${c.isCompany?`<div class="sheet-sub"><i class="ti ti-building" style="font-size:12px;vertical-align:-1px"></i> ${c.contactName||'Company / landlord'}</div>`:'<div class="sheet-sub">Individual customer</div>'}</div></div><button class="close-x" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="sheet-body">
    <div style="display:flex;gap:9px;margin-bottom:16px"><a class="btn btn-primary" href="tel:${phoneDigits}" style="flex:1"><i class="ti ti-phone"></i> Call ${c.phone}</a><button class="btn" onclick="closeModal();openLogOutcome(${c.id},${openRem?openRem.id:'null'})"><i class="ti ti-notes"></i> Log call</button></div>
    ${openRem?`<div class="callout callout-ink" style="margin-bottom:14px"><i class="ti ti-bell"></i><div>Reminder set: <strong>${openRem.reason}</strong> \u2014 ${fmtDate(openRem.dueDate)}</div></div>`:''}
    <div class="grid3" style="margin-bottom:18px">
      <div class="stat"><div class="stat-label">Total jobs</div><div class="stat-val sm">${c.jobs}</div></div>
      <div class="stat"><div class="stat-label">Next due</div><div class="stat-val sm">${c.nextDue?fmtDate(c.nextDue):'\u2014'}</div></div>
      <div class="stat"><div class="stat-label">Lead sources</div><div class="stat-val sm">${(c.leadSources&&c.leadSources.length)?c.leadSources.length:'\u2014'}</div></div>
    </div>
    ${c.isCompany?`<div class="section-title">Company / landlord</div><div class="field-row"><div class="field" style="margin:0"><label>Contact name</label><input type="text" value="${c.contactName||''}" onchange="updateCust(${c.id},'contactName',this.value)"></div><div class="field" style="margin:0"><label>Contact phone</label><input type="tel" value="${c.contactPhone||''}" onchange="updateCust(${c.id},'contactPhone',this.value)"></div></div>`:''}
    <div class="section-title" ${c.isCompany?'style="margin-top:16px"':''}>Customer details</div>
    <div class="field-row"><div class="field" style="margin:0"><label>First name</label><input type="text" value="${c.firstName}" onchange="updateCust(${c.id},'firstName',this.value)"></div><div class="field" style="margin:0"><label>Last name</label><input type="text" value="${c.lastName}" onchange="updateCust(${c.id},'lastName',this.value)"></div></div>
    <div class="field-row"><div class="field" style="margin:0"><label>Phone</label><input type="tel" value="${c.phone}" onchange="updateCust(${c.id},'phone',this.value)"></div><div class="field" style="margin:0"><label>Second phone</label><input type="tel" value="${c.phone2||''}" onchange="updateCust(${c.id},'phone2',this.value)" placeholder="\u2014"></div></div>
    <div class="field"><label>Email</label><input type="email" value="${c.email}" onchange="updateCust(${c.id},'email',this.value)"></div>
    <div class="field"><label>Address</label><input type="text" value="${c.address}" onchange="updateCust(${c.id},'address',this.value)"></div>
    <div class="field"><label>Lead source(s) <span class="optional-tag">how did they hear about us</span></label>${msMount('custls'+c.id,c.leadSources||[],c.id)}</div>
    <div class="field"><label>Notes</label><textarea onchange="updateCust(${c.id},'notes',this.value)">${c.notes}</textarea></div>
    <div class="section-title">Service history</div>
    ${sortedJobs.length?sortedJobs.map((j,i)=>`<div class="history-item"><div class="history-rail"><div class="dot ${j.status==='completed'?'':'amber'}"></div>${i<sortedJobs.length-1?'<div class="history-line"></div>':''}</div><div style="min-width:0;flex:1"><div style="font-size:13.5px;font-weight:600">${fmtDate(j.date)} \u2014 ${j.services.map(svcName).join(', ')}</div><div class="cell-sub" style="margin-top:1px">${j.status}${j.total?' \u00b7 '+money(j.total):''}${j.payment?' \u00b7 '+j.payment:''}${j.photos&&j.photos.length?' \u00b7 '+j.photos.length+' photo'+(j.photos.length>1?'s':''):''}</div>${j.techNotes?`<div class="cell-sub" style="margin-top:3px">${j.techNotes}</div>`:''}</div></div>`).join(''):'<p class="hint">No service history yet.</p>'}
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openScheduleJobForCustomer(${id})"><i class="ti ti-calendar-plus"></i> Book job</button></div>`);
}
function updateCust(id,field,val){
  (async function(){
    const c=customers.find(x=>x.id===id);
    if(!c)return;
    c[field]=val;
    const payload={};
    payload[field]=val;
    try{
      const resp=await fetch(`/api/customers/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();console.error('Update failed',txt);toast('Error saving');}
    }catch(err){console.error('updateCust error',err);toast('Error saving');}
  })();
}

/* ---------------------------------------------------------- SCHEDULE JOB */
function openScheduleJob(prefillId){
  const custOpts=customers.map(c=>`<option value="${c.id}" ${prefillId===c.id?'selected':''}>${nameOf(c)}${c.isCompany&&c.contactName?' ('+c.contactName+')':''}</option>`).join('');
  const pre=prefillId?customers.find(c=>c.id===prefillId):null;
  const preServ=pre?pre.serviceRequested||[]:[];
  showModal(`${headX('Schedule job',pre?'For '+nameOf(pre):'Book a new appointment')}
  <div class="sheet-body">
    <div class="field"><label>Customer</label><select id="sj-cust"><option value="">\u2014 select \u2014</option>${custOpts}</select><div style="margin-top:6px"><span class="hint">Not on the books? <span style="color:var(--ink-900);font-weight:600;cursor:pointer;text-decoration:underline" onclick="closeModal();openNewCustomer()">Add a new customer \u2197</span></span></div></div>
    <div class="field-row"><div class="field" style="margin:0"><label>Date</label><input type="date" id="sj-date" value="${dOff(1)}"></div><div class="field" style="margin:0"><label>Start time <span class="optional-tag">2-hr slot</span></label><input type="time" id="sj-time" value="10:00"></div></div>
    <div class="section-title">Services</div>
    ${SERVICES.map(s=>`<div class="check-row"><input type="checkbox" id="svc-${s.id}" ${preServ.includes(s.id)?'checked':''}><label for="svc-${s.id}">${s.name}</label><span class="price">${money(s.price)}</span></div>`).join('')}
    <div class="surcharge-box"><input type="checkbox" id="sj-surcharge"><label>Above 2nd floor surcharge</label><input type="number" id="sj-surcharge-amt" placeholder="$0"></div>
    <div class="section-title" style="margin-top:16px">Products</div>
    ${PRODUCTS.map(p=>`<div class="check-row"><input type="checkbox" id="prd-${p.id}"><label for="prd-${p.id}">${p.name}</label><span class="price">${money(p.price)}</span></div>`).join('')}
    <div class="section-title" style="margin-top:16px">Job notes</div>
    <div class="field" style="margin:0"><textarea id="sj-notes" placeholder="Access notes, customer requests\u2026">${pre?pre.notes||'':''}</textarea></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveJob()"><i class="ti ti-calendar-plus"></i> Book job</button></div>`);
}
function openScheduleJobForCustomer(id){openScheduleJob(id);}
function saveJob(){
  (async function(){
    const custId=parseInt(document.getElementById('sj-cust').value);
    if(!custId)return toast('Please select a customer');
    const cust=customers.find(c=>c.id===custId);
    const services=SERVICES.filter(s=>document.getElementById('svc-'+s.id)?.checked).map(s=>s.id);
    if(!services.length)return toast('Please select at least one service');
    const products=PRODUCTS.filter(p=>document.getElementById('prd-'+p.id)?.checked).map(p=>p.id);
    const payload={
      customerId: custId,
      customerName: nameOf(cust),
      date: document.getElementById('sj-date').value,
      time: document.getElementById('sj-time').value,
      status: 'scheduled',
      services: services,
      products: products,
      surcharge: document.getElementById('sj-surcharge').checked,
      surchargeAmt: parseFloat(document.getElementById('sj-surcharge-amt').value)||0,
      total: 0,
      payment: '',
      notes: document.getElementById('sj-notes').value,
      techNotes: '',
      nextServiceMonths: cust.nextServiceMonths||12
    };
    try{
      const resp=await fetch('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();
      const created = Array.isArray(json)?json[0]:json;
      if(created){
        jobs.push(created);
        nextJobId = Math.max(nextJobId, (created.id||0)+1);
        reminders=reminders.filter(r=>r.customerId!==custId);
        cust.snoozeUntil=null;
        closeModal();toast('Job booked');
        showView('jobs');
      }else{throw new Error('No job returned');}
    }catch(err){console.error('saveJob error',err);toast('Error saving job');}
  })();
}

/* ---------------------------------------------------------- JOB OPEN / COMPLETE */
function openJob(id){const j=jobs.find(x=>x.id===id);if(!j)return;if(j.status==='completed'){openCompletedJob(j);return;}openCompleteJob(id);}

function openCompleteJob(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;selectedPayment=j.payment||'';
  const cc=customers.find(x=>x.id===j.customerId)||{};
  showModal(`${headX('Complete job',nameOf(cc))}
  <div class="sheet-body">
    <div class="callout callout-green" style="margin-bottom:14px"><i class="ti ti-calendar-check"></i><div><strong>${fmtDate(j.date)} at ${fmtTime(j.time)}</strong><div style="color:var(--ink-500);margin-top:1px"><i class="ti ti-map-pin" style="font-size:12px;vertical-align:-1px"></i> ${cc.address||'No address on file'}${cc.phone?' \u00b7 '+cc.phone:''}</div></div></div>
    <div class="section-title">Services performed</div>
    ${SERVICES.map(s=>`<div class="check-row"><input type="checkbox" id="cs-${s.id}" ${j.services.includes(s.id)?'checked':''} onchange="recalcCompleteTotal()"><label for="cs-${s.id}">${s.name}</label><span class="price">${money(s.price)}</span></div>`).join('')}
    <div class="surcharge-box"><input type="checkbox" id="cs-surcharge" ${j.surcharge?'checked':''} onchange="recalcCompleteTotal()"><label>Above 2nd floor surcharge</label><input type="number" id="cs-surcharge-amt" value="${j.surchargeAmt||''}" placeholder="$0" oninput="recalcCompleteTotal()"></div>
    <div class="section-title" style="margin-top:16px">Products sold</div>
    ${PRODUCTS.map(p=>`<div class="check-row"><input type="checkbox" id="cp-${p.id}" ${j.products.includes(p.id)?'checked':''} onchange="recalcCompleteTotal()"><label for="cp-${p.id}">${p.name}</label><span class="price">${money(p.price)}</span></div>`).join('')}
    <div class="section-title" style="margin-top:16px">Payment</div>
    <div class="field-row" style="margin-bottom:10px"><div class="field" style="margin:0"><label>Charge total</label><input type="number" id="cs-total" value="${jobCharge(j)}" oninput="updateNet()"></div><div class="field" style="margin:0"><label>Discount <span class="optional-tag">optional</span></label><input type="number" id="cs-discount" value="${j.discount||''}" placeholder="0" oninput="updateNet()"></div></div>
    <div class="field"><label>Discount reason <span class="optional-tag">optional</span></label><input type="text" id="cs-discount-reason" value="${j.discountReason||''}" placeholder="e.g. repeat customer"></div>
    <div class="callout callout-ink" style="margin-bottom:14px;justify-content:space-between;align-items:center"><span style="font-weight:600;color:var(--ink-900)">Net collected</span><span class="mono" id="cs-net" style="font-size:18px;font-weight:700;color:var(--ink-900)">${money2(jobCharge(j))}</span></div>
    <label style="display:block;margin-bottom:7px">Payment method</label>
    <div class="pay-opts">${PAYMENT_METHODS.map(m=>`<div class="pay-opt" id="pay-${m}" onclick="selectPay('${m}')">${m}</div>`).join('')}</div>
    <div class="section-title" style="margin-top:18px">Job record</div>
    <div class="field"><label>Tech notes</label><textarea id="cs-notes" placeholder="What you found, what you did\u2026">${j.techNotes||''}</textarea></div>
    <div class="field"><label>Photos <span class="optional-tag">before / after</span></label><input type="file" id="cs-photos" accept="image/*" multiple></div>
    <div class="field" style="margin:0"><label>Next service due in</label><select id="cs-next">${NEXT_SERVICE.map(m=>`<option value="${m}" ${(j.nextServiceMonths||12)===m?'selected':''}>${m} months</option>`).join('')}</select></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveJobEdits(${id})"><i class="ti ti-device-floppy"></i> Save</button><button class="btn btn-success" onclick="completeJob(${id})"><i class="ti ti-check"></i> Complete & send receipt</button></div>`);
}
function recalcCompleteTotal(){
  let t=0;
  SERVICES.forEach(s=>{if(document.getElementById('cs-'+s.id)?.checked)t+=s.price||0;});
  PRODUCTS.forEach(p=>{if(document.getElementById('cp-'+p.id)?.checked)t+=p.price||0;});
  if(document.getElementById('cs-surcharge')?.checked)t+=parseFloat(document.getElementById('cs-surcharge-amt').value)||0;
  const el=document.getElementById('cs-total');if(el)el.value=t;updateNet();
}
function selectPay(m){selectedPayment=m;document.querySelectorAll('.pay-opt').forEach(el=>el.classList.remove('selected'));const el=document.getElementById('pay-'+m);if(el)el.classList.add('selected');}
function updateNet(){const t=parseFloat(document.getElementById('cs-total').value)||0;const d=parseFloat(document.getElementById('cs-discount').value)||0;const el=document.getElementById('cs-net');if(el)el.textContent=money2(Math.max(0,t-d));}
function hydrateJobModal(j){
  j.services=SERVICES.filter(s=>document.getElementById('cs-'+s.id)?.checked).map(s=>s.id);
  j.products=PRODUCTS.filter(p=>document.getElementById('cp-'+p.id)?.checked).map(p=>p.id);
  j.surcharge=document.getElementById('cs-surcharge').checked;
  j.surchargeAmt=parseFloat(document.getElementById('cs-surcharge-amt').value)||0;
  j.discount=parseFloat(document.getElementById('cs-discount').value)||0;
  j.discountReason=document.getElementById('cs-discount-reason').value;
  j.total=Math.max(0,(parseFloat(document.getElementById('cs-total').value)||0)-j.discount);
  j.payment=selectedPayment;
  j.techNotes=document.getElementById('cs-notes').value;
  const pf=document.getElementById('cs-photos');
  if(pf && pf.files && pf.files.length) j.photos=Array.from(pf.files).map(f=>f.name);
  j.nextServiceMonths=parseInt(document.getElementById('cs-next').value)||12;
}
async function saveJobEdits(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  hydrateJobModal(j);
  const payload={
    services:j.services,
    products:j.products,
    surcharge:j.surcharge,
    surchargeAmt:j.surchargeAmt,
    discount:j.discount,
    discountReason:j.discountReason,
    total:j.total,
    payment:j.payment,
    techNotes:j.techNotes,
    photos:j.photos,
    nextServiceMonths:j.nextServiceMonths,
    status:j.status
  };
  try{
    const resp=await fetch(`/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Save failed');}
    const json=await resp.json();
    const updated=Array.isArray(json)?json[0]:json;
    if(!updated)throw new Error('No job returned');
    Object.assign(j,updated);
    toast('Job saved');
    showView('jobs');
  }catch(err){console.error('saveJobEdits error',err);toast('Error saving job');}
}

async function completeJob(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  hydrateJobModal(j);
  j.status='completed';
  const payload={
    services:j.services,
    products:j.products,
    surcharge:j.surcharge,
    surchargeAmt:j.surchargeAmt,
    discount:j.discount,
    discountReason:j.discountReason,
    total:j.total,
    payment:j.payment,
    techNotes:j.techNotes,
    photos:j.photos,
    nextServiceMonths:j.nextServiceMonths,
    status:j.status
  };
  try{
    const resp=await fetch(`/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Complete failed');}
    const json=await resp.json();
    const updated=Array.isArray(json)?json[0]:json;
    if(!updated)throw new Error('No job returned');
    Object.assign(j,updated);
    const cust=customers.find(c=>c.id===j.customerId);
    if(cust){cust.lastService=j.date;cust.jobs=(cust.jobs||0)+1;cust.snoozeUntil='';cust.nextServiceMonths=j.nextServiceMonths;const nd=new Date(j.date);nd.setMonth(nd.getMonth()+j.nextServiceMonths);cust.nextDue=nd.toISOString().slice(0,10);}
    reminders=reminders.filter(r=>r.customerId!==j.customerId);
    closeModal();toast(selectedPayment&&selectedPayment!=='Invoice'?'Complete - Receipt & review request sent':'Complete - Invoice & review request sent');showView('jobs');
  }catch(err){console.error('completeJob error',err);toast('Error completing job');}
}
function openCompletedJob(j){
  const cc=customers.find(x=>x.id===j.customerId)||{};
  const sentLine=j.payment&&j.payment!=='Invoice'?'Receipt &amp; review request':'Invoice &amp; review request';
  showModal(`${headX('Completed job',nameOf(cc))}
  <div class="sheet-body">
    <div class="grid2" style="margin-bottom:16px">
      <div class="stat"><div class="stat-label">Date</div><div class="stat-val sm">${fmtDate(j.date)} \u00b7 ${fmtTime(j.time)}</div></div>
      <div class="stat accent-green"><div class="stat-label">Total collected</div><div class="stat-val sm">${money(j.total)}</div></div>
    </div>
    <div class="callout callout-ink" style="margin-bottom:16px"><i class="ti ti-map-pin"></i><div>${cc.address||'No address on file'}${cc.phone?' \u00b7 '+cc.phone:''}</div></div>
    <div style="display:grid;gap:10px;font-size:13.5px">
      <div><span class="cell-sub">Services</span><div style="font-weight:600">${j.services.map(svcName).join(', ')||'\u2014'}</div></div>
      ${j.products.length?`<div><span class="cell-sub">Products</span><div style="font-weight:600">${j.products.map(svcName).join(', ')}</div></div>`:''}
      ${j.discount?`<div><span class="cell-sub">Discount</span><div style="font-weight:600;color:var(--red)">-${money(j.discount)}${j.discountReason?' ('+j.discountReason+')':''}</div></div>`:''}
      <div><span class="cell-sub">Payment</span><div style="font-weight:600">${j.payment||'\u2014'}</div></div>
      ${j.techNotes?`<div><span class="cell-sub">Tech notes</span><div style="font-weight:600">${j.techNotes}</div></div>`:''}
      ${j.photos&&j.photos.length?`<div><span class="cell-sub">Photos</span><div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">${j.photos.map(p=>`<div class="placeholder" style="width:72px;height:72px">photo</div>`).join('')}</div></div>`:''}
      <div><span class="cell-sub">Next service due</span><div style="font-weight:600">${j.nextServiceMonths} months \u00b7 ${cc.nextDue?fmtDate(cc.nextDue):'\u2014'}</div></div>
    </div>
    <div class="callout callout-green" style="margin-top:16px"><i class="ti ti-mail-fast"></i><div><strong>Sent automatically:</strong> ${sentLine}</div></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openInvoice(${j.id})"><i class="ti ti-file-text"></i> View ${j.payment&&j.payment!=='Invoice'?'receipt':'invoice'}</button></div>`);
}

/* ---------------------------------------------------------- INVOICE / RECEIPT */
function invRow(name,amt){return `<tr><td>${name}</td><td>${money2(amt)}</td></tr>`;}
function openInvoice(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  const c=customers.find(x=>x.id===j.customerId)||{};
  const paid=j.payment&&j.payment!=='Invoice';
  const docType=paid?'RECEIPT':'INVOICE';
  let rows='';let subtotal=0;
  (j.services||[]).forEach(function(sid){const s=SERVICES.find(x=>x.id===sid);if(s){subtotal+=s.price||0;rows+=invRow(s.name,s.price||0);}});
  (j.products||[]).forEach(function(pid){const p=PRODUCTS.find(x=>x.id===pid);if(p){subtotal+=p.price||0;rows+=invRow(p.name,p.price||0);}});
  if(j.surchargeAmt){subtotal+=j.surchargeAmt;rows+=invRow('Above 2nd floor surcharge',j.surchargeAmt);}
  const discount=j.discount||0;
  const total=(typeof j.total==='number'&&j.total)?j.total:Math.max(0,subtotal-discount);
  const invNo='KV-'+(j.date||'').replace(/-/g,'')+'-'+String(j.id).padStart(3,'0');
  const billName=((c.firstName||'')+' '+(c.lastName||'')).trim()||c.contactName||j.customerName;
  const statusBox=paid
    ? '<div class="callout callout-green"><i class="ti ti-circle-check"></i><div><strong>PAID</strong> \u00b7 '+j.payment+'</div></div>'
    : '<div class="callout callout-amber"><i class="ti ti-clock"></i><div><strong>BALANCE DUE: '+money2(total)+'</strong><div style="font-size:12px;margin-top:2px;color:var(--amber)">Payment options: Cash, Check, Venmo, Zelle, CashApp</div></div></div>';
  showModal(`
  <div class="sheet-head no-print"><div class="sheet-title">${docType}</div><button class="close-x" onclick="closeModal()"><i class="ti ti-x"></i></button></div>
  <div class="sheet-body invoice" id="invoice-doc">
    <div class="inv-head">
      <div class="inv-brand"><div class="brand-badge"><img src="${LOGO_SRC}" alt=""></div><div><div class="inv-co">Klean Ventz</div><div class="inv-co-sub">Dryer Vent Cleaning &amp; Installation LLC</div><div class="inv-co-sub mono">732-808-3637 \u00b7 kleanventz.com</div></div></div>
      <div><div class="inv-doctype">${docType}</div><div class="inv-meta">No. ${invNo}</div><div class="inv-meta">${fmtDate(j.date)}</div></div>
    </div>
    <div class="inv-parties">
      <div><div class="lbl">Bill to</div><div style="font-weight:600;font-size:13.5px">${billName}</div>${c.isCompany&&c.contactName?`<div>${c.contactName}</div>`:''}<div class="cell-sub">${c.address||''}</div><div class="cell-sub mono">${c.phone||''}</div><div class="cell-sub">${c.email||''}</div></div>
      <div style="text-align:right"><div class="lbl">Service date</div><div class="mono" style="font-size:12.5px">${fmtDate(j.date)} ${fmtTime(j.time)}</div></div>
    </div>
    <table class="inv-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${rows||'<tr><td class="cell-sub">No items recorded</td><td></td></tr>'}</tbody></table>
    <div class="inv-totals">
      <div class="row"><span class="cell-sub">Subtotal</span><span>${money2(subtotal)}</span></div>
      ${discount?`<div class="row" style="color:var(--red)"><span>Discount${j.discountReason?' ('+j.discountReason+')':''}</span><span>-${money2(discount)}</span></div>`:''}
      <div class="row grand"><span>Total</span><span>${money2(total)}</span></div>
    </div>
    <div style="margin-top:16px">${statusBox}</div>
    ${j.techNotes?`<div style="margin-top:14px;font-size:12.5px;color:var(--ink-500)"><strong style="color:var(--ink-900)">Notes:</strong> ${j.techNotes}</div>`:''}
    <div class="inv-foot">Thank you for your business! We\u2019d love a review:<br><span class="mono" style="color:var(--ink-900);word-break:break-all">${GOOGLE_REVIEW_URL}</span></div>
  </div>
  <div class="sheet-foot no-print"><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="window.print()"><i class="ti ti-printer"></i> Print / Save as PDF</button></div>`);
}
