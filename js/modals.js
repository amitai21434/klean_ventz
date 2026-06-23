/* ============================================================
   MODALS — flows + infra
   ============================================================ */
function showModal(html,wide){document.getElementById('modal').innerHTML=`<div class="scrim" onclick="bgClose(event)"><div class="sheet${wide?' wide':''}">${html}</div></div>`;document.body.style.overflow='hidden';}
function closeModal(){document.getElementById('modal').innerHTML='';document.body.style.overflow='';}
function bgClose(e){if(e.target.classList.contains('scrim'))closeModal();}
function toast(msg){const el=document.getElementById('toast');el.innerHTML='<i class="ti ti-check"></i>'+msg;el.classList.add('show');clearTimeout(window.__t);window.__t=setTimeout(()=>el.classList.remove('show'),3400);}
function headX(title,sub){return `<div class="sheet-head"><div><div class="sheet-title">${title}</div>${sub?`<div class="sheet-sub">${sub}</div>`:''}</div><button class="close-x" onclick="closeModal()"><i class="ti ti-x"></i></button></div>`;}

/* button loading state — disables the button and swaps its label while a slow action runs */
function setBtnLoading(btn,loading,loadingText){
  if(!btn)return;
  if(loading){
    btn.dataset.label=btn.innerHTML;
    btn.disabled=true;
    btn.innerHTML=`<i class="ti ti-loader-2 spin"></i> ${loadingText||'Working…'}`;
  }else{
    btn.disabled=false;
    if(btn.dataset.label)btn.innerHTML=btn.dataset.label;
  }
}
function previewSelectedPhotos(input){
  const box=document.getElementById('cs-photos-preview');if(!box)return;
  box.innerHTML=Array.from(input.files||[]).map(file=>`<img src="${URL.createObjectURL(file)}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" alt="">`).join('');
}

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
function reminderFirstReturned(json){return Array.isArray(json)?json[0]:json;}
function replaceReminder(updated){
  const idx=reminders.findIndex(r=>String(r.id)===String(updated.id));
  if(idx>=0)reminders[idx]=updated;
  else reminders.push(updated);
  nextReminderId=Math.max(nextReminderId,(updated.id||0)+1);
}
function customerFirstReturned(json){return Array.isArray(json)?json[0]:json;}
async function updateCustomerFields(cust,fields){
  if(!cust)return null;
  const resp=await fetch(`${API_BASE}/api/customers/${cust.id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(fields)});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Customer save failed');}
  const updated=customerFirstReturned(await resp.json());
  if(updated)Object.assign(cust,updated);
  else Object.assign(cust,fields);
  return cust;
}
async function clearCustomerReminders(customerId){
  const existing=reminders.filter(r=>String(r.customerId)===String(customerId));
  await Promise.all(existing.map(async r=>{
    const resp=await fetch(`${API_BASE}/api/reminders/${r.id}`,{method:'DELETE',headers:NGROK_HEADERS});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Reminder delete failed');}
  }));
  reminders=reminders.filter(r=>String(r.customerId)!==String(customerId));
}
async function upsertReminder(custId,dueDate,reason,reminderId){
  const existing=reminderId
    ? reminders.find(x=>String(x.id)===String(reminderId))
    : reminders.find(x=>String(x.customerId)===String(custId));
  const payload={customerId:custId,dueDate,reason,location:activeLoc};
  const url=existing?`${API_BASE}/api/reminders/${existing.id}`:API_BASE+'/api/reminders';
  const method=existing?'PUT':'POST';
  const resp=await fetch(url,{method,headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Reminder save failed');}
  const saved=reminderFirstReturned(await resp.json());
  if(!saved)throw new Error('No reminder returned');
  replaceReminder(saved);
  return saved;
}
async function logNoAnswer(custId,reminderId){
  const due=addDays(dOff(0),7);
  try{
    await upsertReminder(custId,due,'Left voicemail - follow up',reminderId);
    const c=customers.find(x=>x.id===custId);if(c)await updateCustomerFields(c,{snoozeUntil:null});
    closeModal();toast('Follow-up set for '+fmtDate(due));showView('dashboard');
  }catch(err){console.error('logNoAnswer error',err);toast('Error saving reminder');}
}
async function logCallback(custId,reminderId){
  const d=document.getElementById('cb-date').value;if(!d)return toast('Pick a date');
  try{
    await upsertReminder(custId,d,'Callback - customer requested',reminderId);
    const c=customers.find(x=>x.id===custId);if(c)await updateCustomerFields(c,{snoozeUntil:null});
    closeModal();toast('Callback reminder set for '+fmtDate(d));showView('dashboard');
  }catch(err){console.error('logCallback error',err);toast('Error saving reminder');}
}
async function logDismiss(custId,reminderId){
  try{
    if(reminderId){
      const resp=await fetch(`${API_BASE}/api/reminders/${reminderId}`,{method:'DELETE',headers:NGROK_HEADERS});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Reminder delete failed');}
      reminders=reminders.filter(r=>String(r.id)!==String(reminderId));
    }else{
      const c=customers.find(x=>x.id===custId);if(c)await updateCustomerFields(c,{snoozeUntil:addDays(dOff(0),30)});
    }
    closeModal();toast('Dismissed');showView('dashboard');
  }catch(err){console.error('logDismiss error',err);toast('Error dismissing reminder');}
}

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
async function msCreate(id){
  const st=MS[id];const v=st.q.trim();if(!v)return;
  try{
    const row=await createLeadSource(v);
    const name=row.name||v;
    if(!st.sel.includes(name))st.sel.push(name);
    st.q='';msPaintCtl(id);msPaintDrop(id);msFocus(id);msSync(id);
  }catch(err){console.error('msCreate error',err);toast('Error adding lead source');}
}
function msGet(id){return MS[id]?MS[id].sel.slice():[];}
function msSync(id){
  const st=MS[id];
  if(st&&st.cust){
    const c=customers.find(x=>x.id===st.cust);
    if(c){
      c.leadSources=st.sel.slice();
      updateCustomerFields(c,{leadSources:c.leadSources}).catch(err=>{console.error('msSync error',err);toast('Error saving lead sources');});
    }
  }
}

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
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveNewCustomerAndBook(this)"><i class="ti ti-calendar-plus"></i> Save & book</button><button class="btn btn-primary" onclick="saveNewCustomer(this)"><i class="ti ti-user-plus"></i> Save customer</button></div>`);
}
let googleMapsLoadPromise=null,googleAutocompleteService=null,addrSearchTimer=null,addrSearchSeq=0;
function addrEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function addrAttr(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
async function loadGooglePlaces(){
  if(googleAutocompleteService)return googleAutocompleteService;
  if(googleMapsLoadPromise)return googleMapsLoadPromise;
  googleMapsLoadPromise=(async function(){
    if(window.google&&google.maps&&google.maps.places){
      googleAutocompleteService=new google.maps.places.AutocompleteService();
      return googleAutocompleteService;
    }
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    const cfgResp=await fetch(API_BASE+'/api/config/maps',{headers:{...NGROK_HEADERS,'Authorization':'Bearer '+session.access_token}});
    if(!cfgResp.ok)return null;
    const cfg=await cfgResp.json();
    if(!cfg.enabled||!cfg.apiKey)return null;
    await new Promise((resolve,reject)=>{
      window.__crmGoogleMapsReady=resolve;
      const s=document.createElement('script');
      s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(cfg.apiKey)}&libraries=places&callback=__crmGoogleMapsReady`;
      s.async=true;s.defer=true;s.onerror=reject;document.head.appendChild(s);
    });
    googleAutocompleteService=new google.maps.places.AutocompleteService();
    return googleAutocompleteService;
  })().catch(err=>{console.error('loadGooglePlaces error',err);return null;});
  return googleMapsLoadPromise;
}
function renderLocalAddrSuggestions(val,box){
  const filtered=FAKE_ADDRESSES.filter(a=>a.main.toLowerCase().includes(val.toLowerCase())||a.sub.toLowerCase().includes(val.toLowerCase()));
  if(!filtered.length){box.style.display='none';return;}
  box.style.display='block';
  box.innerHTML=filtered.map(a=>`<div class="addr-suggestion" onmousedown="selectAddr('${addrAttr(a.main+', '+a.sub)}')"><div class="main-text">${addrEsc(a.main)}</div><div class="sub-text">${addrEsc(a.sub)}</div></div>`).join('');
}
function addrInput(val){
  const box=document.getElementById('addr-suggestions');if(!box)return;
  clearTimeout(addrSearchTimer);
  if(val.length<3){box.style.display='none';return;}
  box.style.display='block';
  box.innerHTML='<div class="addr-suggestion"><div class="main-text">Searching addresses...</div></div>';
  const seq=++addrSearchSeq;
  addrSearchTimer=setTimeout(async()=>{
    const svc=await loadGooglePlaces();
    if(seq!==addrSearchSeq)return;
    if(!svc){renderLocalAddrSuggestions(val,box);return;}
    svc.getPlacePredictions({input:val,types:['address'],componentRestrictions:{country:'us'}},(predictions,status)=>{
      if(seq!==addrSearchSeq)return;
      const ok=window.google&&google.maps&&status===google.maps.places.PlacesServiceStatus.OK;
      if(!ok||!predictions||!predictions.length){box.style.display='none';return;}
      box.style.display='block';
      box.innerHTML=predictions.slice(0,6).map(p=>{
        const main=(p.structured_formatting&&p.structured_formatting.main_text)||p.description;
        const sub=(p.structured_formatting&&p.structured_formatting.secondary_text)||'';
        return `<div class="addr-suggestion" onmousedown="selectAddr('${addrAttr(p.description)}')"><div class="main-text">${addrEsc(main)}</div>${sub?`<div class="sub-text">${addrEsc(sub)}</div>`:''}</div>`;
      }).join('');
    });
  },220);
}
function selectAddr(val){const inp=document.getElementById('nc-addr');if(inp)inp.value=val;hideAddrSug();}
function hideAddrSug(){const box=document.getElementById('addr-suggestions');if(box)box.style.display='none';}
function saveNewCustomer(btn){
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
      snoozeUntil: null,
      location: activeLoc
    };
    setBtnLoading(btn,true,'Saving…');
    try{
      const resp=await fetch(API_BASE+'/api/customers',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();
      const created = Array.isArray(json)?json[0]:json;
      if(created){
        customers.push(created);
        nextCustId = Math.max(nextCustId, (created.id||0)+1);
        closeModal();toast('Customer saved');showView('customers');
      }else{throw new Error('No customer returned');}
    }catch(err){console.error('saveNewCustomer error',err);toast('Error saving customer');}
    finally{setBtnLoading(btn,false);}
  })();
}

function saveNewCustomerAndBook(btn){
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
      snoozeUntil: null,
      location: activeLoc
    };
    setBtnLoading(btn,true,'Saving…');
    try{
      const resp=await fetch(API_BASE+'/api/customers',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
    finally{setBtnLoading(btn,false);}
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
      const resp=await fetch(`${API_BASE}/api/customers/${id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();console.error('Update failed',txt);toast('Error saving');}
    }catch(err){console.error('updateCust error',err);toast('Error saving');}
  })();
}

function emailJobPayload(job,cust){
  return {
    job,
    customer:cust,
    servicesText:(job.services||[]).map(svcName).join(', '),
    productsText:(job.products||[]).map(svcName).join(', ')
  };
}
async function sendJobEmail(path,job,cust){
  if(!cust||!cust.email)return false;
  try{
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    const resp=await fetch(path,{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify(emailJobPayload(job,cust))});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Email failed');}
    return true;
  }catch(err){console.error('sendJobEmail error',err);return false;}
}

/* ---------------------------------------------------------- SCHEDULE JOB */
function sjCustMatches(q){
  const s=q.toLowerCase().trim();
  if(!s)return customers.slice(0,8);
  return customers.filter(c=>(nameOf(c)+' '+(c.phone||'')+' '+(c.contactName||'')).toLowerCase().includes(s)).slice(0,8);
}
function sjCustDropHtml(){
  if(!SJ_CUST.open)return '';
  const matches=sjCustMatches(SJ_CUST.q);
  if(!matches.length)return `<div class="ms-drop"><div class="ms-empty">No matching customers</div></div>`;
  return `<div class="ms-drop">${matches.map(c=>`<div class="ms-opt" onmousedown="event.preventDefault();sjSelectCust(${c.id})"><div style="font-weight:600">${tEsc(nameOf(c))}${c.isCompany&&c.contactName?' <span class="cell-sub" style="font-weight:400">\u00b7 '+tEsc(c.contactName)+'</span>':''}</div><div class="cell-sub">${tEsc(c.phone||'')}${c.address?' \u00b7 '+tEsc(c.address):''}</div></div>`).join('')}</div>`;
}
function sjCustPaintDrop(){const el=document.getElementById('sj-cust-drop');if(el)el.innerHTML=sjCustDropHtml();}
function sjCustType(v){SJ_CUST.q=v;SJ_CUST.id=null;SJ_CUST.open=true;sjCustPaintDrop();renderSjCustInfo();}
function sjCustOpen(){SJ_CUST.open=true;sjCustPaintDrop();}
function sjCustBlur(){setTimeout(()=>{SJ_CUST.open=false;sjCustPaintDrop();},160);}
function sjSelectCust(id){
  const c=customers.find(x=>x.id===id);
  SJ_CUST={id,q:c?nameOf(c):'',open:false};
  const inp=document.getElementById('sj-cust-search');if(inp)inp.value=SJ_CUST.q;
  sjCustPaintDrop();
  renderSjCustInfo();
}
function renderSjCustInfo(){
  const el=document.getElementById('sj-cust-info');if(!el)return;
  const c=customers.find(x=>x.id===SJ_CUST.id);
  if(!c){el.innerHTML='';return;}
  const cJobs=jobs.filter(j=>j.customerId===c.id).sort((a,b)=>a.date>b.date?-1:1);
  el.innerHTML=`<div class="callout callout-ink" style="margin-top:10px;align-items:flex-start">
    <i class="ti ti-user-check"></i>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;color:var(--ink-900)">${tEsc(nameOf(c))}${c.isCompany&&c.contactName?' <span class="cell-sub">\u00b7 '+tEsc(c.contactName)+'</span>':''}</div>
      <div class="cell-sub" style="margin-top:2px">${tEsc(c.phone||'\u2014')}${c.phone2?' \u00b7 '+tEsc(c.phone2):''}</div>
      <div class="cell-sub">${tEsc(c.address||'No address on file')}</div>
      ${c.email?`<div class="cell-sub">${tEsc(c.email)}</div>`:''}
      ${c.nextDue?`<div class="cell-sub" style="margin-top:4px">Next due ${fmtDate(c.nextDue)}</div>`:''}
      <div style="margin-top:8px;font-weight:600;font-size:12.5px;color:var(--ink-900)">Service history${cJobs.length?` (${cJobs.length})`:''}</div>
      ${cJobs.length?cJobs.slice(0,5).map(j=>`<div class="cell-sub" style="margin-top:2px">${fmtDate(j.date)} \u00b7 ${j.services.map(svcName).join(', ')||'\u2014'} \u00b7 ${j.status}</div>`).join(''):'<div class="cell-sub">No previous jobs</div>'}
    </div>
  </div>`;
}
function sjSetDuration(h,btn){SJ_DURATION=h;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}
function csSetDuration(h,btn){CS_DURATION=h;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}
function durationButtons(active,onclickName){return [2,3,4].map(h=>`<button type="button" class="${active===h?'on':''}" onclick="${onclickName}(${h},this)">${h} hr</button>`).join('');}
function openScheduleJob(prefillId){
  const pre=prefillId?customers.find(c=>c.id===prefillId):null;
  SJ_CUST={id:prefillId||null,q:pre?nameOf(pre):'',open:false};
  SJ_DURATION=2;
  const preServ=pre?pre.serviceRequested||[]:[];
  showModal(`${headX('Schedule job',pre?'For '+nameOf(pre):'Book a new appointment')}
  <div class="sheet-body">
    <div class="field">
      <label>Customer</label>
      <div class="ms" id="sj-custpick">
        <div class="ms-control"><input type="text" id="sj-cust-search" class="ms-input" style="width:100%" placeholder="Search by name or phone\u2026" autocomplete="off" value="${pre?tAttr(nameOf(pre)):''}" oninput="sjCustType(this.value)" onfocus="sjCustOpen()" onblur="sjCustBlur()"></div>
        <div id="sj-cust-drop"></div>
      </div>
      <div id="sj-cust-info"></div>
      <div style="margin-top:6px"><span class="hint">Not on the books? <span style="color:var(--ink-900);font-weight:600;cursor:pointer;text-decoration:underline" onclick="closeModal();openNewCustomer()">Add a new customer \u2197</span></span></div>
    </div>
    <div class="field-row"><div class="field" style="margin:0"><label>Date</label><input type="date" id="sj-date" value="${dOff(1)}"></div><div class="field" style="margin:0"><label>Start time</label><input type="time" id="sj-time" value="10:00"></div></div>
    <div class="field"><label>Job length</label><div class="segmented" id="sj-duration">${durationButtons(2,'sjSetDuration')}</div></div>
    <div class="section-title">Services</div>
    ${SERVICES.map(s=>`<div class="check-row"><input type="checkbox" id="svc-${s.id}" ${preServ.includes(s.id)?'checked':''}><label for="svc-${s.id}">${s.name}</label><span class="price">${money(s.price)}</span></div>`).join('')}
    <div class="surcharge-box"><input type="checkbox" id="sj-surcharge"><label>Above 2nd floor surcharge</label><input type="number" id="sj-surcharge-amt" placeholder="$0"></div>
    <div class="section-title" style="margin-top:16px">Products</div>
    ${PRODUCTS.map(p=>`<div class="check-row"><input type="checkbox" id="prd-${p.id}"><label for="prd-${p.id}">${p.name}</label><span class="price">${money(p.price)}</span></div>`).join('')}
    <div class="section-title" style="margin-top:16px">Job notes</div>
    <div class="field" style="margin:0"><textarea id="sj-notes" placeholder="Access notes, customer requests\u2026">${pre?pre.notes||'':''}</textarea></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveJob(this)"><i class="ti ti-calendar-plus"></i> Book job</button></div>`);
  renderSjCustInfo();
}
function openScheduleJobForCustomer(id){openScheduleJob(id);}
function saveJob(btn){
  (async function(){
    const custId=SJ_CUST.id;
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
      durationHours: SJ_DURATION,
      status: 'scheduled',
      services: services,
      products: products,
      surcharge: document.getElementById('sj-surcharge').checked,
      surchargeAmt: parseFloat(document.getElementById('sj-surcharge-amt').value)||0,
      total: 0,
      payment: '',
      notes: document.getElementById('sj-notes').value,
      techNotes: '',
      nextServiceMonths: cust.nextServiceMonths||12,
      location: activeLoc
    };
    setBtnLoading(btn,true,'Booking…');
    try{
      const resp=await fetch(API_BASE+'/api/jobs',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();
      const created = Array.isArray(json)?json[0]:json;
      if(created){
        jobs.push(created);
        nextJobId = Math.max(nextJobId, (created.id||0)+1);
        await clearCustomerReminders(custId);
        await updateCustomerFields(cust,{snoozeUntil:null});
        const emailSent=await sendJobEmail(API_BASE+'/api/emails/job-confirmation',created,cust);
        closeModal();toast(emailSent?'Job booked - confirmation sent':'Job booked');
        showView('jobs');
      }else{throw new Error('No job returned');}
    }catch(err){console.error('saveJob error',err);toast('Error saving job');}
    finally{setBtnLoading(btn,false);}
  })();
}

/* ---------------------------------------------------------- JOB OPEN / COMPLETE */
function openJob(id){const j=jobs.find(x=>x.id===id);if(!j)return;if(j.status==='completed'){openCompletedJob(j);return;}openCompleteJob(id);}

function openCompleteJob(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;selectedPayment=j.payment||'';
  CS_DURATION=j.durationHours||2;
  const cc=customers.find(x=>x.id===j.customerId)||{};
  showModal(`${headX('Complete job',nameOf(cc))}
  <div class="sheet-body">
    <div class="callout callout-green" style="margin-bottom:14px"><i class="ti ti-calendar-check"></i><div><strong>${fmtDate(j.date)} at ${fmtTime(j.time)}</strong><div style="color:var(--ink-500);margin-top:1px"><i class="ti ti-map-pin" style="font-size:12px;vertical-align:-1px"></i> ${cc.address||'No address on file'}${cc.phone?' \u00b7 '+cc.phone:''}</div></div></div>
    <div class="field"><label>Job length</label><div class="segmented" id="cs-duration">${durationButtons(j.durationHours||2,'csSetDuration')}</div></div>
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
    <div class="field"><label>Photos <span class="optional-tag">before / after</span></label>${j.photos&&j.photos.length?`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">${j.photos.map(url=>`<img src="${url}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" alt="">`).join('')}</div>`:''}<input type="file" id="cs-photos" accept="image/*" multiple onchange="previewSelectedPhotos(this)"><div id="cs-photos-preview" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"></div></div>
    <div class="field" style="margin:0"><label>Next service due in</label><select id="cs-next">${NEXT_SERVICE.map(m=>`<option value="${m}" ${(j.nextServiceMonths||12)===m?'selected':''}>${m} months</option>`).join('')}</select></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveJobEdits(${id},this)"><i class="ti ti-device-floppy"></i> Save</button><button class="btn btn-success" onclick="completeJob(${id},this)"><i class="ti ti-check"></i> Complete & send receipt</button></div>`);
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
  j.nextServiceMonths=parseInt(document.getElementById('cs-next').value)||12;
  j.durationHours=CS_DURATION;
}
async function uploadJobPhotos(jobId,files){
  const urls=[];
  for(const file of files){
    try{
      const path=`${jobId}/${Date.now()}-${file.name}`;
      const {error}=await supabaseBrowser.storage.from('job-photos').upload(path,file);
      if(error)throw error;
      const {data}=supabaseBrowser.storage.from('job-photos').getPublicUrl(path);
      if(data?.publicUrl)urls.push(data.publicUrl);
    }catch(err){console.error('photo upload error',err);toast('A photo failed to upload');}
  }
  return urls;
}
async function applyPendingPhotos(j){
  const pf=document.getElementById('cs-photos');
  if(!pf||!pf.files||!pf.files.length)return;
  const uploaded=await uploadJobPhotos(j.id,Array.from(pf.files));
  j.photos=[...(j.photos||[]),...uploaded];
}
async function saveJobEdits(id,btn){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  setBtnLoading(btn,true,'Saving…');
  try{
    hydrateJobModal(j);
    await applyPendingPhotos(j);
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
      durationHours:j.durationHours,
      status:j.status
    };
    const resp=await fetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Save failed');}
    const json=await resp.json();
    const updated=Array.isArray(json)?json[0]:json;
    if(!updated)throw new Error('No job returned');
    Object.assign(j,updated);
    toast('Job saved');
    showView('jobs');
  }catch(err){console.error('saveJobEdits error',err);toast('Error saving job');}
  finally{setBtnLoading(btn,false);}
}

async function completeJob(id,btn){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  setBtnLoading(btn,true,'Completing…');
  try{
    hydrateJobModal(j);
    await applyPendingPhotos(j);
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
      durationHours:j.durationHours,
      status:j.status
    };
    const resp=await fetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Complete failed');}
    const json=await resp.json();
    const updated=Array.isArray(json)?json[0]:json;
    if(!updated)throw new Error('No job returned');
    Object.assign(j,updated);
    const cust=customers.find(c=>c.id===j.customerId);
    if(cust){
      const nd=new Date(j.date);nd.setMonth(nd.getMonth()+j.nextServiceMonths);
      await updateCustomerFields(cust,{
        lastService:j.date,
        jobs:(cust.jobs||0)+1,
        snoozeUntil:null,
        nextServiceMonths:j.nextServiceMonths,
        nextDue:nd.toISOString().slice(0,10)
      });
    }
    await clearCustomerReminders(j.customerId);
    const emailSent=await sendJobEmail(API_BASE+'/api/emails/job-completed',j,cust);
    closeModal();toast(emailSent?(selectedPayment&&selectedPayment!=='Invoice'?'Complete - receipt & review sent':'Complete - invoice & review sent'):'Complete - email not sent');showView('jobs');
  }catch(err){console.error('completeJob error',err);toast('Error completing job');}
  finally{setBtnLoading(btn,false);}
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
      ${j.photos&&j.photos.length?`<div><span class="cell-sub">Photos</span><div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">${j.photos.map(url=>`<a href="${url}" target="_blank" rel="noopener"><img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)" alt="Job photo"></a>`).join('')}</div></div>`:''}
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
