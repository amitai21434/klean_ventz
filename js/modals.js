/* ============================================================
   WORKER PAY MODALS
   ============================================================ */
function openWorkerPay(userId){
  const w=(CRM_USERS||[]).find(u=>u.id===userId);if(!w)return;
  const rate=(SETTINGS.workerRates||{})[userId]||{payType:'flat',payRate:''};
  showModal(`${headX('Pay Rate',tEsc(w.name||w.email))}
  <div class="sheet-body">
    <div class="field"><label>Pay type</label>
      <select id="wpr-type" onchange="document.getElementById('wpr-lbl').textContent=this.value==='percent'?'Percentage of job revenue':'Flat amount per job'">
        <option value="flat" ${rate.payType==='flat'?'selected':''}>Flat per job</option>
        <option value="percent" ${rate.payType==='percent'?'selected':''}>% of job revenue</option>
      </select>
    </div>
    <div class="field"><label id="wpr-lbl">${rate.payType==='percent'?'Percentage of job revenue':'Flat amount per job'}</label>
      <input type="number" id="wpr-rate" value="${rate.payRate||''}" placeholder="${rate.payType==='percent'?'e.g. 25':'e.g. 80'}" min="0" step="0.01">
    </div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveWorkerPay('${userId}',this)"><i class="ti ti-device-floppy"></i> Save</button></div>`);
}
async function saveWorkerPay(userId,btn){
  setBtnLoading(btn,true,'Saving…');
  const payType=document.getElementById('wpr-type').value;
  const payRate=parseFloat(document.getElementById('wpr-rate').value)||0;
  if(!SETTINGS.workerRates)SETTINGS.workerRates={};
  SETTINGS.workerRates[userId]={payType,payRate};
  try{
    const resp=await apiFetch(API_BASE+'/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({workerRates:SETTINGS.workerRates})});
    if(!resp.ok)throw new Error('Save failed');
    closeModal();toast('Pay rate saved');showView('workers');
  }catch(e){toast('Error saving');setBtnLoading(btn,false);}
}
function openWorkerHistory(userId){
  const w=(CRM_USERS||[]).find(u=>u.id===userId);if(!w)return;
  const rate=(SETTINGS.workerRates||{})[userId]||{};
  const wJobs=jobs.filter(j=>j.status==='completed'&&j.techName===w.name).sort((a,b)=>b.date.localeCompare(a.date));
  const payFor=j=>{if(rate.payType==='flat')return rate.payRate||0;if(rate.payType==='percent')return(j.total||0)*(rate.payRate||0)/100;return null;};
  const totalPay=wJobs.reduce((s,j)=>{const p=payFor(j);return s+(p||0);},0);
  const rateLabel=rate.payType==='flat'?`${rate.payRate}/job`:rate.payType==='percent'?`${rate.payRate}% of revenue`:'No rate set';
  showModal(`${headX('Pay History',tEsc(w.name||w.email))}
  <div class="sheet-body">
    ${wJobs.length&&rate.payType?`<div class="callout callout-green" style="margin-bottom:16px"><i class="ti ti-cash"></i><div><strong>${money(totalPay)} total earned</strong><div class="hint">${wJobs.length} job${wJobs.length!==1?'s':''} · ${rateLabel}</div></div></div>`:''}
    ${wJobs.length?`<div style="overflow-x:auto"><table class="data"><thead><tr><th>Date</th><th>Customer</th><th>Revenue</th><th>Pay</th></tr></thead><tbody>
      ${wJobs.map(j=>{const c=customers.find(x=>x.id===j.customerId)||{};const p=payFor(j);return `<tr class="row-link" onclick="openJob(${j.id})"><td data-label="Date">${fmtDate(j.date)}</td><td data-label="Customer">${tEsc(nameOf(c))}</td><td data-label="Revenue">${money(j.total)}</td><td data-label="Pay">${p!==null?money(p):'—'}</td></tr>`;}).join('')}
    </tbody></table></div>`:`<p class="hint" style="text-align:center;padding:24px 0">No completed jobs assigned to ${tEsc(w.name||'this worker')} yet.</p>`}
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Close</button></div>`,'wide');
}

/* ============================================================
   MODALS — flows + infra
   ============================================================ */
function showModal(html,cls){document.getElementById('modal').innerHTML=`<div class="scrim" onclick="bgClose(event)"><div class="sheet${cls?' '+cls:''}">${html}</div></div>`;document.body.style.overflow='hidden';}
function closeModal(){document.getElementById('modal').innerHTML='';document.body.style.overflow='';closeSjJobPop();}
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
function showSuccessFlourish(){
  const el=document.getElementById('success-flourish');
  if(!el)return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
function previewSelectedPhotos(input){
  const box=document.getElementById('cs-photos-preview');if(!box)return;
  box.innerHTML=Array.from(input.files||[]).map(file=>`<img src="${URL.createObjectURL(file)}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" alt="">`).join('');
}

/* confirm-before-destructive-action modal — call confirmAction(message, fn) instead of acting directly */
let PENDING_CONFIRM=null;
function confirmAction(message,fn){
  PENDING_CONFIRM=fn;
  showModal(`${headX('Are you sure?')}
  <div class="sheet-body"><p style="margin:0">${message}</p></div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" style="color:var(--red)" onclick="runConfirmedAction()"><i class="ti ti-trash"></i> Delete</button></div>`);
}
function runConfirmedAction(){
  const fn=PENDING_CONFIRM;
  PENDING_CONFIRM=null;
  closeModal();
  if(fn)fn();
}
function mapsUrl(address){return 'https://maps.google.com/?q='+encodeURIComponent(address);}
function addressLink(address){
  if(!address)return 'No address on file';
  const ea=encodeURIComponent(address);
  return `<span class="addr-link" onclick="event.stopPropagation();showMapsChooser(event,'${address.replace(/'/g,"\\'")}')"><i class="ti ti-map-pin" style="font-size:12px;vertical-align:-1px;margin-right:2px"></i>${tEsc(address)}</span>`;
}
function showMapsChooser(evt,address){
  document.querySelectorAll('.maps-chooser').forEach(el=>el.remove());
  const ea=encodeURIComponent(address);
  const pop=document.createElement('div');
  pop.className='maps-chooser';
  pop.innerHTML=`
    <a href="https://maps.google.com/?q=${ea}" target="_blank" rel="noopener"><i class="ti ti-brand-google-maps"></i> Google Maps</a>
    <a href="https://maps.apple.com/?q=${ea}" target="_blank" rel="noopener"><i class="ti ti-map-2"></i> Apple Maps</a>
    <a href="https://waze.com/ul?q=${ea}&navigate=yes" target="_blank" rel="noopener"><i class="ti ti-navigation"></i> Waze</a>`;
  const r=evt.target.closest('.addr-link').getBoundingClientRect();
  pop.style.cssText=`position:fixed;left:${r.left}px;top:${r.bottom+6}px;`;
  document.body.appendChild(pop);
  const close=e=>{if(!pop.contains(e.target)){pop.remove();document.removeEventListener('click',close);}};
  setTimeout(()=>document.addEventListener('click',close),10);
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
    <div class="choice" style="align-items:flex-start" onclick="document.getElementById('cb-wrap').style.display='block';this.style.borderColor='var(--ink-900)'"><i class="ti ti-calendar-clock lead" style="color:var(--ink-700)"></i><div style="flex:1"><div class="choice-title">Call back later</div><div class="choice-sub">Customer asked you to reach out on a specific date</div><div id="cb-wrap" style="display:none;margin-top:11px"><div style="display:flex;gap:8px;margin-bottom:9px"><input type="date" id="cb-date" value="${addDays(dOff(0),7)}" style="flex:1"><input type="time" id="cb-time" value="" placeholder="Time (optional)" style="flex:1"></div><button class="btn btn-sm btn-primary" onclick="logCallback(${custId},${reminderId||'null'})">Set callback reminder</button></div></div></div>
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
  const resp=await apiFetch(`${API_BASE}/api/customers/${cust.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Customer save failed');}
  const updated=customerFirstReturned(await resp.json());
  if(updated)Object.assign(cust,updated);
  else Object.assign(cust,fields);
  return cust;
}
async function clearCustomerReminders(customerId){
  const existing=reminders.filter(r=>String(r.customerId)===String(customerId));
  await Promise.all(existing.map(async r=>{
    const resp=await apiFetch(`${API_BASE}/api/reminders/${r.id}`,{method:'DELETE'});
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
  const resp=await apiFetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
  const t=document.getElementById('cb-time').value;
  const reason=t?'Callback at '+fmtTime(t):'Callback - customer requested';
  try{
    await upsertReminder(custId,d,reason,reminderId);
    const c=customers.find(x=>x.id===custId);if(c)await updateCustomerFields(c,{snoozeUntil:null});
    closeModal();toast('Callback reminder set for '+fmtDate(d)+(t?' at '+fmtTime(t):''));showView('dashboard');
  }catch(err){console.error('logCallback error',err);toast('Error saving reminder');}
}
async function logDismiss(custId,reminderId){
  try{
    if(reminderId){
      const resp=await apiFetch(`${API_BASE}/api/reminders/${reminderId}`,{method:'DELETE'});
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
    <div class="field-row"><div class="field" style="margin:0"><label>Phone number</label><input type="tel" id="nc-phone" placeholder="(732) 555-0000"></div><div class="field" style="margin:0"><label>Second phone <span class="optional-tag">optional</span></label><input type="tel" id="nc-phone2" placeholder="(732) 555-0001"><input type="text" id="nc-phone2-label" placeholder="Name (e.g. Spouse, Work)" style="margin-top:6px;font-size:12px"></div></div>
    <div class="field"><label>Email</label><input type="email" id="nc-email" placeholder="jane@email.com"></div>
    <div class="field addr-wrap"><label>Address <span class="optional-tag">populates from Google Maps</span></label><input type="text" id="nc-addr" placeholder="123 Main St, City, NJ" autocomplete="off" oninput="addrInput(this.value)" onblur="setTimeout(hideAddrSug,200)"><div id="addr-suggestions" class="addr-suggestions" style="display:none"></div></div>
    <div class="field"><label>Lead source(s) <span class="optional-tag">how did they hear about us \u2014 pick one or more</span></label>${msMount('nc-ls',[])}</div>
    <!-- Service requested removed: customers no longer store requested services -->
    <div class="section-title" style="margin-top:14px">Notes</div>
    <div class="field" style="margin:0"><textarea id="nc-notes" placeholder="Gate code, dog in yard, access instructions\u2026"></textarea></div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveNewCustomerAndLog(this)"><i class="ti ti-notes"></i> Save & log call</button><button class="btn" onclick="saveNewCustomerAndBook(this)"><i class="ti ti-calendar-plus"></i> Save & book</button><button class="btn btn-primary" onclick="saveNewCustomer(this)"><i class="ti ti-user-plus"></i> Save customer</button></div>`);
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
    const cfgResp=await apiFetch(API_BASE+'/api/config/maps');
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
      phone2Label: document.getElementById('nc-phone2-label').value,
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
      const resp=await apiFetch(API_BASE+'/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
      phone2Label: document.getElementById('nc-phone2-label').value,
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
      const resp=await apiFetch(API_BASE+'/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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

function saveNewCustomerAndLog(btn){
  (async function(){
    const firstName=document.getElementById('nc-first').value.trim();const lastName=document.getElementById('nc-last').value.trim();
    const isCompany=document.getElementById('nc-iscompany').checked;const contactName=document.getElementById('nc-contact').value.trim();
    if(!firstName&&!lastName&&!contactName)return toast('Please enter a name');
    const leadSources=msGet('nc-ls');
    const payload={
      isCompany,contactName,contactPhone:document.getElementById('nc-contactphone').value,
      firstName,lastName,
      phone:document.getElementById('nc-phone').value,
      phone2:document.getElementById('nc-phone2').value,
      phone2Label:document.getElementById('nc-phone2-label').value,
      email:document.getElementById('nc-email').value,
      address:document.getElementById('nc-addr').value,
      leadSources:(leadSources||[]),
      notes:document.getElementById('nc-notes').value,
      lastService:null,nextDue:null,nextServiceMonths:12,snoozeUntil:null,location:activeLoc
    };
    setBtnLoading(btn,true,'Saving…');
    try{
      const resp=await apiFetch(API_BASE+'/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
      const json=await resp.json();const created=Array.isArray(json)?json[0]:json;
      if(created){
        customers.push(created);nextCustId=Math.max(nextCustId,(created.id||0)+1);
        closeModal();openLogOutcome(created.id,null);
      }else{throw new Error('No customer returned');}
    }catch(err){console.error('saveNewCustomerAndLog error',err);toast('Error saving customer');}
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
    <div class="field-row"><div class="field" style="margin:0"><label>Phone</label><input type="tel" value="${c.phone}" onchange="updateCust(${c.id},'phone',this.value)"></div><div class="field" style="margin:0"><label>Second phone</label><input type="tel" value="${c.phone2||''}" onchange="updateCust(${c.id},'phone2',this.value)" placeholder="\u2014"><input type="text" value="${tEsc(c.phone2Label||'')}" onchange="updateCust(${c.id},'phone2Label',this.value)" placeholder="Name (e.g. Spouse, Work)" style="margin-top:6px;font-size:12px"></div></div>
    <div class="field"><label>Email</label><input type="email" value="${c.email}" onchange="updateCust(${c.id},'email',this.value)"></div>
    <div class="field"><label>Address</label><input type="text" value="${c.address}" onchange="updateCust(${c.id},'address',this.value)"></div>
    <div class="field"><label>Lead source(s) <span class="optional-tag">how did they hear about us</span></label>${msMount('custls'+c.id,c.leadSources||[],c.id)}</div>
    <div class="field"><label>Notes</label><textarea onchange="updateCust(${c.id},'notes',this.value)">${c.notes}</textarea></div>
    <div class="section-title">Service history</div>
    ${sortedJobs.length?sortedJobs.map((j,i)=>`<div class="history-item"><div class="history-rail"><div class="dot ${j.status==='completed'?'':'amber'}"></div>${i<sortedJobs.length-1?'<div class="history-line"></div>':''}</div><div style="min-width:0;flex:1"><div style="font-size:13.5px;font-weight:600">${fmtDate(j.date)} \u2014 ${j.services.map(id=>svcQtyName(id,j.serviceQtys)).join(', ')}</div><div class="cell-sub" style="margin-top:1px">${j.status}${j.total?' \u00b7 '+money(j.total):''}${j.payment?' \u00b7 '+j.payment:''}${j.photos&&j.photos.length?' \u00b7 '+j.photos.length+' photo'+(j.photos.length>1?'s':''):''}</div>${j.techNotes?`<div class="cell-sub" style="margin-top:3px">${j.techNotes}</div>`:''}</div></div>`).join(''):'<p class="hint">No service history yet.</p>'}
  </div>
  <div class="sheet-foot"><button class="btn" style="margin-right:auto;color:var(--red)" onclick="confirmDeleteCustomer(${id})"><i class="ti ti-trash"></i> Delete</button><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openScheduleJobForCustomer(${id})"><i class="ti ti-calendar-plus"></i> Book job</button></div>`);
}
function confirmDeleteCustomer(id){
  const c=customers.find(x=>x.id===id);if(!c)return;
  const cJobs=jobs.filter(j=>j.customerId===id);
  const warn=cJobs.length?` This will also delete their ${cJobs.length} job${cJobs.length!==1?'s':''} and service history.`:'';
  confirmAction(`Delete ${nameOf(c)}?${warn} This can’t be undone.`,()=>deleteCustomerCascade(id));
}
async function deleteCustomerCascade(id){
  try{
    const cJobs=jobs.filter(j=>j.customerId===id);
    await Promise.all(cJobs.map(j=>apiFetch(`${API_BASE}/api/jobs/${j.id}`,{method:'DELETE'})));
    await Promise.all(cJobs.map(j=>deleteJobPhotos(j.id)));
    await clearCustomerReminders(id);
    const resp=await apiFetch(`${API_BASE}/api/customers/${id}`,{method:'DELETE'});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Delete failed');}
    jobs=jobs.filter(j=>j.customerId!==id);
    customers=customers.filter(c=>c.id!==id);
    closeModal();toast('Customer deleted');showView('customers');
  }catch(err){console.error('deleteCustomerCascade error',err);toast('Error deleting customer');}
}
function updateCust(id,field,val){
  (async function(){
    const c=customers.find(x=>x.id===id);
    if(!c)return;
    c[field]=val;
    const payload={};
    payload[field]=val;
    try{
      const resp=await apiFetch(`${API_BASE}/api/customers/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
      <div class="cell-sub" style="margin-top:2px">${tEsc(c.phone||'\u2014')}${c.phone2?' \u00b7 '+tEsc(c.phone2)+(c.phone2Label?' ('+tEsc(c.phone2Label)+')':''):''}</div>
      <div class="cell-sub">${tEsc(c.address||'No address on file')}</div>
      ${c.email?`<div class="cell-sub">${tEsc(c.email)}</div>`:''}
      ${c.nextDue?`<div class="cell-sub" style="margin-top:4px">Next due ${fmtDate(c.nextDue)}</div>`:''}
      <div style="margin-top:8px;font-weight:600;font-size:12.5px;color:var(--ink-900)">Service history${cJobs.length?` (${cJobs.length})`:''}</div>
      ${cJobs.length?cJobs.slice(0,5).map(j=>`<div class="cell-sub" style="margin-top:2px">${fmtDate(j.date)} \u00b7 ${j.services.map(svcName).join(', ')||'\u2014'} \u00b7 ${j.status}</div>`).join(''):'<div class="cell-sub">No previous jobs</div>'}
    </div>
  </div>`;
}
function timeRangeLabel(startTime,hours){
  if(!startTime)return '';
  const [h,m]=startTime.split(':').map(Number);
  return `${fmtTime(startTime)}–${fmtTime(minsToHHMM(h*60+m+hours*60))}`;
}
function sjUpdateRange(){
  const t=document.getElementById('sj-time')?.value;
  const el=document.getElementById('sj-time-range');
  if(el)el.textContent=t?timeRangeLabel(t,SJ_DURATION):'';
}
function csUpdateRange(){
  const el=document.getElementById('cs-time-range');
  if(el)el.textContent=timeRangeLabel(CS_TIME,CS_DURATION);
}
function sjSetDuration(h,btn){SJ_DURATION=h;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');sjUpdateRange();}
function csSetDuration(h,btn){CS_DURATION=h;btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');csUpdateRange();}
function durationButtons(active,onclickName){return [2,3,4].map(h=>`<button type="button" class="${active===h?'on':''}" onclick="${onclickName}(${h},this)">${h} hr</button>`).join('');}
function openScheduleJob(prefillId){
  const pre=prefillId?customers.find(c=>c.id===prefillId):null;
  SJ_CUST={id:prefillId||null,q:pre?nameOf(pre):'',open:false};
  SJ_DURATION=2;
  SJ_CAL_MODE='week';
  SJ_CAL_DATE=dOff(1);
  const preServ=pre?pre.serviceRequested||[]:[];
  showModal(`<div class="sj-mob-tabs">
    <button class="sj-tab on" id="sj-tab-form" onclick="sjTab('form')"><i class="ti ti-calendar-plus"></i> Book</button>
    <button class="sj-tab" id="sj-tab-cal" onclick="sjTab('cal')"><i class="ti ti-calendar"></i> Schedule</button>
    <button class="close-x sj-tab-close" onclick="closeModal()"><i class="ti ti-x"></i></button>
  </div>
  <div class="sj-form-pane">
    ${headX('Schedule job',pre?'For '+nameOf(pre):'Book a new appointment')}
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
      <div class="field-row"><div class="field" style="margin:0"><label>Date</label><input type="date" id="sj-date" value="${dOff(1)}" oninput="sjSyncCalDate(this.value)"></div><div class="field" style="margin:0"><label>Start time</label><input type="time" id="sj-time" value="10:00" oninput="sjUpdateRange()"></div></div>
      <div class="field"><label>Job length</label><div class="segmented" id="sj-duration">${durationButtons(2,'sjSetDuration')}</div><div class="hint cell-mono" id="sj-time-range" style="margin-top:6px"></div></div>
      <div class="section-title">Services</div>
      <div id="sj-services-list">${SERVICES.map(s=>`<div class="check-row"><input type="checkbox" id="svc-${s.id}" ${preServ.includes(s.id)?'checked':''} onchange="sjQtySync('${s.id}')"><label for="svc-${s.id}">${s.name}</label><span class="svc-qty-ctl" id="sqc-${s.id}" style="display:${preServ.includes(s.id)?'inline-flex':'none'}"><button type="button" class="svc-qty-btn" onclick="sjQtyAdj('${s.id}',-1)">−</button><span class="svc-qty-val" id="sqv-${s.id}">1</span><button type="button" class="svc-qty-btn" onclick="sjQtyAdj('${s.id}',1)">+</button></span><input type="number" class="svc-price-override" id="spo-${s.id}" value="${preServ.includes(s.id)?s.price:''}" placeholder="${s.price}" title="Line total" style="display:${preServ.includes(s.id)?'inline-block':'none'}"><span class="price" id="spl-${s.id}" style="display:${preServ.includes(s.id)?'none':''}">${money(s.price)}</span></div>`).join('')}</div>
      <div id="sj-new-svc-form" style="display:none;margin:6px 0 4px;padding:8px;background:var(--surface-2);border-radius:8px;display:none"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="text" id="sj-ns-name" placeholder="Service name" style="flex:2;min-width:120px"><input type="number" id="sj-ns-price" placeholder="Price" style="flex:1;min-width:72px"><button type="button" class="btn btn-sm btn-primary" onclick="sjSaveNewService(this)">Add</button><button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('sj-new-svc-form').style.display='none'">Cancel</button></div></div>
      <div style="margin-bottom:6px"><button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('sj-new-svc-form').style.display='';document.getElementById('sj-ns-name').focus()"><i class="ti ti-plus"></i> Add new service</button></div>
      <div class="surcharge-box"><input type="checkbox" id="sj-surcharge"><label>Above 2nd floor surcharge</label><input type="number" id="sj-surcharge-amt" placeholder="$0"></div>
      <div class="section-title" style="margin-top:16px">Products</div>
      <div id="sj-products-list">${PRODUCTS.map(p=>`<div class="check-row"><input type="checkbox" id="prd-${p.id}"><label for="prd-${p.id}">${p.name}</label><span class="price">${money(p.price)}</span></div>`).join('')}</div>
      <div id="sj-new-prd-form" style="display:none;margin:6px 0 4px;padding:8px;background:var(--surface-2);border-radius:8px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="text" id="sj-np-name" placeholder="Product name" style="flex:2;min-width:120px"><input type="number" id="sj-np-price" placeholder="Price" style="flex:1;min-width:72px"><button type="button" class="btn btn-sm btn-primary" onclick="sjSaveNewProduct(this)">Add</button><button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('sj-new-prd-form').style.display='none'">Cancel</button></div></div>
      <div style="margin-bottom:6px"><button type="button" class="btn btn-sm btn-ghost" onclick="document.getElementById('sj-new-prd-form').style.display='';document.getElementById('sj-np-name').focus()"><i class="ti ti-plus"></i> Add new product</button></div>
      <div class="section-title" style="margin-top:16px">Job notes</div>
      <div class="field" style="margin:0"><textarea id="sj-notes" placeholder="Access notes, customer requests\u2026">${pre?pre.notes||'':''}</textarea></div>
    </div>
    <div class="sheet-foot"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveJob(this)"><i class="ti ti-calendar-plus"></i> Book job</button></div>
  </div>
  <div class="sj-cal-pane">
    <div id="sj-cal-panel"></div>
  </div>`,'dual');
  renderSjCustInfo();
  sjUpdateRange();
  renderSjCalPanel();
}
function openScheduleJobForCustomer(id){openScheduleJob(id);}

async function sjSaveNewService(btn){
  const name=document.getElementById('sj-ns-name').value.trim();
  const price=parseFloat(document.getElementById('sj-ns-price').value)||0;
  if(!name)return;
  setBtnLoading(btn,true);
  try{
    const res=await apiFetch(API_BASE+'/api/services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,price,cost:0})});
    const body=await res.json();const svc=Array.isArray(body)?body[0]:body;
    SERVICES.push(svc);
    const list=document.getElementById('sj-services-list');
    if(list){const row=document.createElement('div');row.className='check-row';row.innerHTML=`<input type="checkbox" id="svc-${svc.id}" checked onchange="sjQtySync('${svc.id}')"><label for="svc-${svc.id}">${tEsc(svc.name)}</label><span class="svc-qty-ctl" id="sqc-${svc.id}" style="display:inline-flex"><button type="button" class="svc-qty-btn" onclick="sjQtyAdj('${svc.id}',-1)">−</button><span class="svc-qty-val" id="sqv-${svc.id}">1</span><button type="button" class="svc-qty-btn" onclick="sjQtyAdj('${svc.id}',1)">+</button></span><input type="number" class="svc-price-override" id="spo-${svc.id}" placeholder="${svc.price}" title="Price" style="display:inline-block"><span class="price" id="spl-${svc.id}" style="display:none">${money(svc.price)}</span>`;list.appendChild(row);}
    document.getElementById('sj-ns-name').value='';document.getElementById('sj-ns-price').value='';
    document.getElementById('sj-new-svc-form').style.display='none';
    toast('Service added');
  }catch(err){console.error(err);toast('Error saving service');}
  finally{setBtnLoading(btn,false);}
}

async function sjSaveNewProduct(btn){
  const name=document.getElementById('sj-np-name').value.trim();
  const price=parseFloat(document.getElementById('sj-np-price').value)||0;
  if(!name)return;
  setBtnLoading(btn,true);
  try{
    const res=await apiFetch(API_BASE+'/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,price,cost:0})});
    const body=await res.json();const prd=Array.isArray(body)?body[0]:body;
    PRODUCTS.push(prd);
    const list=document.getElementById('sj-products-list');
    if(list){const row=document.createElement('div');row.className='check-row';row.innerHTML=`<input type="checkbox" id="prd-${prd.id}" checked><label for="prd-${prd.id}">${tEsc(prd.name)}</label><span class="price">${money(prd.price)}</span>`;list.appendChild(row);}
    document.getElementById('sj-np-name').value='';document.getElementById('sj-np-price').value='';
    document.getElementById('sj-new-prd-form').style.display='none';
    toast('Product added');
  }catch(err){console.error(err);toast('Error saving product');}
  finally{setBtnLoading(btn,false);}
}

/* ---------------------------------------------------------- EMBEDDED SCHEDULE (booking modal) */
function sjSyncCalDate(v){if(v){SJ_CAL_DATE=v;renderSjCalPanel();}}
function sjCalToggle(active){const m=[['month','Month'],['week','Week'],['day','Day']];return `<div class="segmented">${m.map(x=>`<button class="${active===x[0]?'on':''}" onclick="sjCalSetMode('${x[0]}')">${x[1]}</button>`).join('')}</div>`;}
function sjCalSetMode(m){SJ_CAL_MODE=m;renderSjCalPanel();}
function sjCalNavDay(d){SJ_CAL_DATE=addDays(SJ_CAL_DATE,d);renderSjCalPanel();}
function sjCalNavWeek(d){SJ_CAL_DATE=addDays(SJ_CAL_DATE,7*d);renderSjCalPanel();}
function sjCalNavMonth(d){const p=SJ_CAL_DATE.split('-');const dt=new Date(+p[0],+p[1]-1+d,1);SJ_CAL_DATE=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-01`;renderSjCalPanel();}
function sjCalToday(){SJ_CAL_DATE=dOff(0);renderSjCalPanel();}
function sjOpenCalDay(k){SJ_CAL_DATE=k;SJ_CAL_MODE='day';renderSjCalPanel();}
function renderSjCalPanel(){const el=document.getElementById('sj-cal-panel');if(!el)return;el.innerHTML=SJ_CAL_MODE==='day'?renderSjDay():SJ_CAL_MODE==='week'?renderSjWeek():renderSjMonth();}

function renderSjMonth(){
  const p=SJ_CAL_DATE.split('-');const year=+p[0],month=+p[1]-1;const todayKey=dOff(0);
  const monthName=['January','February','March','April','May','June','July','August','September','October','November','December'][month];
  const firstDay=new Date(year,month,1).getDay();const daysInMonth=new Date(year,month+1,0).getDate();
  const prefix=`${year}-${String(month+1).padStart(2,'0')}-`;
  const jobDates={};jobs.forEach(j=>{if(j.date.startsWith(prefix)){const d=parseInt(j.date.slice(8,10));jobDates[d]=(jobDates[d]||0)+1;}});
  let cells='';['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{cells+='<div class="cal-head">'+d+'</div>';});
  for(let i=0;i<firstDay;i++)cells+='<div class="cal-day blank"></div>';
  for(let d=1;d<=daysInMonth;d++){const key=prefix+String(d).padStart(2,'0');const hasJob=jobDates[d];cells+=`<div class="cal-day${hasJob?' has-job':''}${key===todayKey?' today':''}" onclick="sjOpenCalDay('${key}')"><span class="daynum">${d}</span>${hasJob?`<span class="jobpill">${hasJob}</span>`:''}</div>`;}
  return `<div class="sj-cal-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="sjCalNavMonth(-1)"><i class="ti ti-chevron-left"></i></button><h3 style="font-size:15px;font-weight:700;min-width:130px;text-align:center;letter-spacing:-.01em">${monthName} ${year}</h3><button class="btn btn-sm btn-icon" onclick="sjCalNavMonth(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="sjCalToday()">Today</button></div>${sjCalToggle('month')}</div><div class="cal-grid" style="margin-top:8px">${cells}</div><p class="hint" style="margin-top:10px;text-align:center">Tap any day to see its schedule.</p>`;
}

function renderSjWeek(){
  const start=weekStartKey(SJ_CAL_DATE);
  const days=[];for(let i=0;i<6;i++)days.push(addDays(start,i));
  const H0=7,HH=48,GUT=44,COLW=118;
  const dayEvs=days.map(k=>layoutDay(jobs.filter(j=>j.date===k)));
  const maxEnd=dayEvs.reduce((m,evs)=>evs.reduce((mm,e)=>Math.max(mm,e.end),m),H0*60);
  const H1=Math.max(20,Math.ceil(maxEnd/60));
  const totalW=GUT+6*COLW;const totalH=(H1-H0)*HH+10;
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const todayKey=dOff(0);
  let header=`<div style="display:flex;width:${totalW}px"><div style="width:${GUT}px;flex-shrink:0"></div>`+days.map((k,i)=>{const dp=k.split('-');const isT=k===todayKey;return `<div onclick="sjOpenCalDay('${k}')" style="width:${COLW}px;flex-shrink:0;text-align:center;cursor:pointer;padding:5px 0;border-radius:8px;${isT?'background:var(--ink-900);color:#fff':''}"><div style="font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;${isT?'color:#fff':'color:var(--ink-400)'}">${dayNames[i]}</div><div class="cell-mono" style="font-size:13px;font-weight:600;margin-top:1px">${parseInt(dp[2])}</div></div>`;}).join('')+'</div>';
  let grid='';
  for(let h=H0;h<=H1;h++){const top=(h-H0)*HH;const label=(h%12===0?12:h%12)+(h<12?'a':'p');grid+=`<div style="position:absolute;top:${top}px;left:0;width:${totalW}px;border-top:1px solid var(--line)"></div><div class="cell-mono" style="position:absolute;top:${top-6}px;left:0;width:${GUT-6}px;text-align:right;font-size:9px;color:var(--ink-400)">${label}</div>`;}
  let seps='';for(let i=0;i<6;i++){const left=GUT+i*COLW;seps+=`<div style="position:absolute;top:0;bottom:0;left:${left}px;border-left:1px solid var(--line)"></div>`;}
  let blocks='';
  days.forEach((k,di)=>{const evs=dayEvs[di];evs.forEach(e=>{const j=e.job;const top=Math.max(0,((e.start-H0*60)/60)*HH);const height=(j.durationHours||2)*HH-3;const cw=COLW/e.cols;const left=GUT+di*COLW+e.col*cw+1;const w=cw-3;blocks+=`<div class="cal-event${j.status==='completed'?' done':''}" onclick="sjShowJobPop(${j.id},event)" style="top:${top}px;left:${left}px;width:${w}px;height:${height}px;padding:3px 5px"><div class="cal-event-time" style="color:${j.status==='completed'?'var(--green)':'var(--ink-900)'};font-size:9.5px">${fmtTime(j.time)}</div><div class="cal-event-name" style="font-size:10.5px">${j.customerName}</div></div>`;});});
  return `<div class="sj-cal-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="sjCalNavWeek(-1)"><i class="ti ti-chevron-left"></i></button><h3 style="font-size:13px;font-weight:700;letter-spacing:-.01em">${fmtDate(start)} \u2013 ${fmtDate(addDays(start,6))}</h3><button class="btn btn-sm btn-icon" onclick="sjCalNavWeek(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="sjCalToday()">Today</button></div>${sjCalToggle('week')}</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:8px"><div style="min-width:${totalW}px">${header}<div style="position:relative;height:${totalH}px;margin-top:4px">${grid}${seps}${blocks}</div></div></div>`;
}

function renderSjDay(){
  const key=SJ_CAL_DATE;const dayJobs=jobs.filter(j=>j.date===key);
  const H0=7,HH=60,GUT=58;
  const evs=layoutDay(dayJobs);
  const maxEnd=evs.reduce((m,e)=>Math.max(m,e.end),H0*60);
  const H1=Math.max(20,Math.ceil(maxEnd/60));
  let grid='';
  for(let h=H0;h<=H1;h++){const top=(h-H0)*HH;const label=(h%12===0?12:h%12)+(h<12?' AM':' PM');grid+=`<div style="position:absolute;top:${top}px;left:0;right:0;height:0;border-top:1px solid var(--line)"></div><div class="cell-mono" style="position:absolute;top:${top-7}px;left:0;width:${GUT-10}px;text-align:right;font-size:10px;color:var(--ink-400)">${label}</div>`;}
  let blocks='';
  evs.forEach(e=>{const j=e.job;const top=Math.max(0,((e.start-H0*60)/60)*HH);const height=(j.durationHours||2)*HH-5;const leftCalc=`calc(${GUT}px + (100% - ${GUT}px) * ${e.col/e.cols})`;const widthCalc=`calc((100% - ${GUT}px) * ${1/e.cols} - 6px)`;blocks+=`<div class="cal-event${j.status==='completed'?' done':''}" onclick="sjShowJobPop(${j.id},event)" style="top:${top}px;left:${leftCalc};width:${widthCalc};height:${height}px"><div class="cal-event-time" style="color:${j.status==='completed'?'var(--green)':'var(--ink-900)'}">${fmtTime(j.time)}\u2013${fmtTime(minsToHHMM(e.end))} \u00b7 ${j.status}</div><div class="cal-event-name">${j.customerName}</div><div class="cal-event-meta">${j.services.map(svcName).join(', ')}</div></div>`;});
  const totalH=(H1-H0)*HH+12;
  const dp=key.split('-');const dObj=new Date(+dp[0],+dp[1]-1,+dp[2]);const dayName=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dObj.getDay()];
  const isToday=key===dOff(0);
  return `<div class="sj-cal-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="sjCalNavDay(-1)"><i class="ti ti-chevron-left"></i></button><div><h3 style="font-size:15px;font-weight:700;letter-spacing:-.01em;white-space:nowrap">${dayName}${isToday?' \u00b7 Today':''}</h3><div class="cell-mono" style="font-size:11px;color:var(--ink-500)">${fmtDate(key)}</div></div><button class="btn btn-sm btn-icon" onclick="sjCalNavDay(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="sjCalToday()">Today</button></div>${sjCalToggle('day')}</div><div class="hint" style="margin:8px 0 10px">${dayJobs.length} job${dayJobs.length!==1?'s':''} \u00b7 tap a block to peek</div><div style="position:relative;height:${totalH}px">${grid}${blocks}</div>`;
}

function sjShowJobPop(id,evt){
  evt.stopPropagation();
  const existing=document.getElementById('sj-job-pop');
  if(existing){const wasId=existing.dataset.jobId;existing.remove();if(String(wasId)===String(id))return;}
  const j=jobs.find(x=>x.id===id);if(!j)return;
  const c=customers.find(x=>x.id===j.customerId)||{};
  const [hh,mm]=(j.time||'00:00').split(':').map(Number);
  const endMins=hh*60+mm+(j.durationHours||2)*60;
  const pop=document.createElement('div');
  pop.id='sj-job-pop';pop.dataset.jobId=id;pop.className='sj-job-pop';
  pop.innerHTML=`<button class="sj-job-pop-x" onclick="closeSjJobPop()"><i class="ti ti-x"></i></button>
    <div style="font-weight:700;font-size:14px;padding-right:22px;color:var(--ink-900)">${tEsc(j.customerName)}</div>
    <div class="cell-sub cell-mono" style="margin-top:3px">${fmtDate(j.date)} \u00b7 ${fmtTime(j.time)}\u2013${fmtTime(minsToHHMM(endMins))}</div>
    <div class="cell-sub" style="margin-top:3px">${j.services.map(svcName).join(', ')||'\u2014'}</div>
    ${c.address?`<div class="cell-sub" style="margin-top:4px;display:flex;align-items:center;gap:4px"><i class="ti ti-map-pin" style="font-size:11px;color:var(--ink-400);flex-shrink:0"></i>${addressLink(c.address)}</div>`:''}
    <div style="margin-top:8px"><span class="badge ${statusBadge(j.status)}">${j.status}</span></div>`;
  document.body.appendChild(pop);
  const el=evt.target.closest('.cal-event')||evt.target;
  const rect=el.getBoundingClientRect();
  const popW=pop.offsetWidth||240;
  const popH=pop.offsetHeight||130;
  let left=rect.right+8;
  if(left+popW>window.innerWidth-8)left=rect.left-popW-8;
  if(left<8)left=8;
  let top=rect.top;
  if(top+popH>window.innerHeight-8)top=window.innerHeight-popH-8;
  if(top<8)top=8;
  pop.style.left=left+'px';pop.style.top=top+'px';
  setTimeout(()=>{
    function outside(e){const p=document.getElementById('sj-job-pop');if(p&&!p.contains(e.target)){p.remove();document.removeEventListener('click',outside);}}
    document.addEventListener('click',outside);
  },0);
}
function closeSjJobPop(){const p=document.getElementById('sj-job-pop');if(p)p.remove();}
function sjTab(tab){
  const fp=document.querySelector('.sj-form-pane');
  const cp=document.querySelector('.sj-cal-pane');
  const ft=document.getElementById('sj-tab-form');
  const ct=document.getElementById('sj-tab-cal');
  if(!fp||!cp)return;
  if(tab==='cal'){
    fp.classList.add('sj-mob-hidden');
    cp.classList.add('sj-mob-active');
    if(ft)ft.classList.remove('on');
    if(ct)ct.classList.add('on');
    renderSjCalPanel();
  }else{
    fp.classList.remove('sj-mob-hidden');
    cp.classList.remove('sj-mob-active');
    if(ft)ft.classList.add('on');
    if(ct)ct.classList.remove('on');
  }
}
function sjQtySync(id){const cb=document.getElementById('svc-'+id);const on=cb?.checked;const ctl=document.getElementById('sqc-'+id);if(ctl)ctl.style.display=on?'inline-flex':'none';const spo=document.getElementById('spo-'+id);if(spo){spo.style.display=on?'inline-block':'none';if(on&&!spo.value){const s=SERVICES.find(x=>x.id===id);if(s)spo.value=s.price||0;}}const spl=document.getElementById('spl-'+id);if(spl)spl.style.display=on?'none':'';if(!on){const v=document.getElementById('sqv-'+id);if(v)v.textContent='1';}}
function sjQtyAdj(id,d){const el=document.getElementById('sqv-'+id);if(!el)return;const q=Math.max(1,parseInt(el.textContent||'1')+d);el.textContent=q;const s=SERVICES.find(x=>x.id===id);if(s){const spo=document.getElementById('spo-'+id);if(spo)spo.value=(s.price||0)*q;}}
function sjGetQtys(){const q={};SERVICES.forEach(s=>{const cb=document.getElementById('svc-'+s.id);if(cb?.checked){const v=document.getElementById('sqv-'+s.id);q[s.id]=parseInt(v?.textContent||'1')||1;}});return q;}
function sjGetPrices(){const p={};SERVICES.forEach(s=>{const cb=document.getElementById('svc-'+s.id);if(cb?.checked){const inp=document.getElementById('spo-'+s.id);if(inp&&inp.value!==''){const qEl=document.getElementById('sqv-'+s.id);const q=parseInt(qEl?.textContent||'1')||1;p[s.id]=(parseFloat(inp.value)||0)/q;}}});return p;}
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
      serviceQtys: sjGetQtys(),
      servicePrices: sjGetPrices(),
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
      const resp=await apiFetch(API_BASE+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
  const j=jobs.find(x=>x.id===id);if(!j)return;paymentSet=new Set();
  CS_DURATION=j.durationHours||2;
  CS_TIME=j.time;
  CS_PRICES=j.servicePrices||{};
  const cc=customers.find(x=>x.id===j.customerId)||{};
  showModal(`${headX('Complete job',nameOf(cc))}
  <div class="sheet-body">
    <div class="callout callout-green" style="margin-bottom:14px"><i class="ti ti-calendar-check"></i><div><strong>${fmtDate(j.date)} \u00b7 <span id="cs-time-range">${timeRangeLabel(j.time,j.durationHours||2)}</span></strong><div style="color:var(--ink-500);margin-top:1px"><i class="ti ti-map-pin" style="font-size:12px;vertical-align:-1px"></i> ${addressLink(cc.address)}${cc.phone?' \u00b7 '+cc.phone:''}</div></div></div>
    <div class="field"><label>Job length <span class="optional-tag">set at booking</span></label><div class="callout callout-ink" style="padding:8px 12px;font-weight:600">${j.durationHours||2} hour${(j.durationHours||2)!==1?'s':''}</div></div>
    ${(CRM_USERS||[]).filter(u=>u.role==='technician').length?`<div class="field"><label>Worker <span class="optional-tag">who did this job</span></label><select id="cs-tech"><option value="">— Not assigned —</option>${(CRM_USERS||[]).filter(u=>u.role==='technician').map(u=>`<option value="${tEsc(u.name||u.email)}" ${j.techName===(u.name||u.email)?'selected':''}>` + tEsc(u.name||u.email) + `</option>`).join('')}</select></div>`:''}
    <div class="section-title">Services performed</div>
    ${SERVICES.map(s=>{const q=qtyOf(j,s.id);const chk=j.services.includes(s.id);const bookedPrice=CS_PRICES[s.id]!=null?CS_PRICES[s.id]:s.price;return `<div class="check-row"><input type="checkbox" id="cs-${s.id}" ${chk?'checked':''} onchange="csQtySync('${s.id}');recalcCompleteTotal()"><label for="cs-${s.id}">${s.name}</label><span class="svc-qty-ctl" id="csqc-${s.id}" style="display:${chk?'inline-flex':'none'}"><button type="button" class="svc-qty-btn" onclick="csQtyAdj('${s.id}',-1)">−</button><span class="svc-qty-val" id="csqv-${s.id}">${chk?q:1}</span><button type="button" class="svc-qty-btn" onclick="csQtyAdj('${s.id}',1)">+</button></span><input type="number" class="svc-price-override" id="cspo-${s.id}" value="${chk?bookedPrice*q:''}" placeholder="${bookedPrice*q}" title="Line total" oninput="recalcCompleteTotal()" style="display:${chk?'inline-block':'none'}"><span class="price" id="cspl-${s.id}" style="display:${chk?'none':''}">$${bookedPrice}/ea</span></div>`;}).join('')}
    <div class="surcharge-box"><input type="checkbox" id="cs-surcharge" ${j.surcharge?'checked':''} onchange="recalcCompleteTotal()"><label>Above 2nd floor surcharge</label><input type="number" id="cs-surcharge-amt" value="${j.surchargeAmt||''}" placeholder="$0" oninput="recalcCompleteTotal()"></div>
    <div class="section-title" style="margin-top:16px">Products sold</div>
    ${PRODUCTS.map(p=>`<div class="check-row"><input type="checkbox" id="cp-${p.id}" ${j.products.includes(p.id)?'checked':''} onchange="recalcCompleteTotal()"><label for="cp-${p.id}">${p.name}</label><span class="price">${money(p.price)}</span></div>`).join('')}
    <div class="section-title" style="margin-top:16px">Payment</div>
    <div class="field-row" style="margin-bottom:10px"><div class="field" style="margin:0"><label>Charge total</label><input type="number" id="cs-total" value="${jobCharge(j)}" oninput="updateNet()"></div><div class="field" style="margin:0"><label>Discount <span class="optional-tag">optional</span></label><input type="number" id="cs-discount" value="${j.discount||''}" placeholder="0" oninput="updateNet()"></div></div>
    <div class="field"><label>Discount reason <span class="optional-tag">optional</span></label><input type="text" id="cs-discount-reason" value="${j.discountReason||''}" placeholder="e.g. repeat customer"></div>
    <div class="callout callout-ink" style="margin-bottom:14px;justify-content:space-between;align-items:center"><span style="font-weight:600;color:var(--ink-900)">Net collected</span><span class="mono" id="cs-net" style="font-size:18px;font-weight:700;color:var(--ink-900)">${money2(jobCharge(j))}</span></div>
    <label style="display:block;margin-bottom:7px">Payment method <span class="optional-tag">pick one or more — enter amount if split</span></label>
    <div class="pay-opts">${PAYMENT_METHODS.map(m=>`<div class="pay-opt-wrap"><div class="pay-opt" id="pay-${m}" onclick="togglePay('${m}')">${m}</div><input type="number" class="pay-amt" id="pamt-${m}" placeholder="$" style="display:none" oninput="syncPayLabel()"></div>`).join('')}</div>
    <div class="section-title" style="margin-top:18px">Job record</div>
    ${cc.notes?`<div class="callout callout-ink" style="margin-bottom:10px"><i class="ti ti-user"></i><div><strong>Customer note:</strong> ${tEsc(cc.notes)}</div></div>`:''}
    ${j.notes?`<div class="callout callout-ink" style="margin-bottom:10px"><i class="ti ti-clipboard"></i><div><strong>Job note:</strong> ${tEsc(j.notes)}</div></div>`:''}
    <div class="field"><label>Tech notes</label><textarea id="cs-notes" placeholder="What you found, what you did\u2026">${j.techNotes||''}</textarea></div>
    <div class="field"><label>Photos <span class="optional-tag">before / after</span></label>${j.photos&&j.photos.length?`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">${j.photos.map(url=>`<img src="${url}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid var(--line)" alt="">`).join('')}</div>`:''}<input type="file" id="cs-photos" accept="image/*" multiple onchange="previewSelectedPhotos(this)"><div id="cs-photos-preview" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"></div></div>
    <div class="field" style="margin:0"><label>Next service due in</label><select id="cs-next">${NEXT_SERVICE.map(m=>`<option value="${m}" ${(j.nextServiceMonths||12)===m?'selected':''}>${m} months</option>`).join('')}</select></div>
  </div>
  <div class="sheet-foot" style="flex-wrap:wrap;row-gap:8px"><button class="btn" style="margin-right:auto;color:var(--red)" onclick="confirmDeleteJob(${id},false)"><i class="ti ti-trash"></i> Delete</button><button class="btn" onclick="closeModal()">Cancel</button><button class="btn" onclick="openRescheduleJob(${id})"><i class="ti ti-calendar-repeat"></i> Reschedule</button><button class="btn" onclick="saveJobEdits(${id},this)"><i class="ti ti-device-floppy"></i> Save</button><button class="btn" onclick="completeJob(${id},this,true)"><i class="ti ti-check"></i> Complete only</button><button class="btn btn-success" id="cs-complete-btn" onclick="completeJob(${id},this,false)"><i class="ti ti-check"></i> Complete &amp; send receipt</button></div>`,'wide');
  setTimeout(()=>initPayments(j.payment||''),0);
}
function csQtySync(id){const cb=document.getElementById('cs-'+id);const on=cb?.checked;const ctl=document.getElementById('csqc-'+id);if(ctl)ctl.style.display=on?'inline-flex':'none';const cpo=document.getElementById('cspo-'+id);if(cpo){cpo.style.display=on?'inline-block':'none';if(on&&!cpo.value){const s=SERVICES.find(x=>x.id===id);if(s)cpo.value=s.price||0;}}const cpl=document.getElementById('cspl-'+id);if(cpl)cpl.style.display=on?'none':'';if(!on){const v=document.getElementById('csqv-'+id);if(v)v.textContent='1';}recalcCompleteTotal();}
function csQtyAdj(id,d){const el=document.getElementById('csqv-'+id);if(!el)return;const q=Math.max(1,parseInt(el.textContent||'1')+d);el.textContent=q;const s=SERVICES.find(x=>x.id===id);if(s){const cpo=document.getElementById('cspo-'+id);if(cpo)cpo.value=(s.price||0)*q;}recalcCompleteTotal();}
function csGetQtys(){const q={};SERVICES.forEach(s=>{const cb=document.getElementById('cs-'+s.id);if(cb?.checked){const v=document.getElementById('csqv-'+s.id);q[s.id]=parseInt(v?.textContent||'1')||1;}});return q;}
function csGetPrices(){const p={};SERVICES.forEach(s=>{const cb=document.getElementById('cs-'+s.id);const inp=document.getElementById('cspo-'+s.id);if(cb?.checked&&inp&&inp.value!==''){const qEl=document.getElementById('csqv-'+s.id);const q=parseInt(qEl?.textContent||'1')||1;p[s.id]=(parseFloat(inp.value)||0)/q;}});return p;}
function recalcCompleteTotal(){
  let t=0;
  SERVICES.forEach(s=>{if(document.getElementById('cs-'+s.id)?.checked){const q=parseInt(document.getElementById('csqv-'+s.id)?.textContent||'1')||1;const pinp=document.getElementById('cspo-'+s.id);const lineTotal=pinp?(parseFloat(pinp.value)||parseFloat(pinp.placeholder)||(s.price||0)*q):(CS_PRICES[s.id]!=null?CS_PRICES[s.id]:s.price||0)*q;t+=lineTotal;}});
  PRODUCTS.forEach(p=>{if(document.getElementById('cp-'+p.id)?.checked)t+=p.price||0;});
  if(document.getElementById('cs-surcharge')?.checked)t+=parseFloat(document.getElementById('cs-surcharge-amt').value)||0;
  const el=document.getElementById('cs-total');if(el)el.value=t;updateNet();
}
function togglePay(m){
  const opt=document.getElementById('pay-'+m);
  if(paymentSet.has(m)){
    paymentSet.delete(m);opt&&opt.classList.remove('selected');
  }else{
    paymentSet.add(m);opt&&opt.classList.add('selected');
  }
  const multi=paymentSet.size>1;
  PAYMENT_METHODS.forEach(pm=>{
    const a=document.getElementById('pamt-'+pm);
    if(!a)return;
    if(paymentSet.has(pm)&&multi){a.style.display='';}
    else{a.style.display='none';a.value='';}
  });
  if(paymentSet.has(m)&&multi){const a=document.getElementById('pamt-'+m);if(a)a.focus();}
  syncPayLabel();
}
function syncPayLabel(){
  const hasInv=[...paymentSet].includes('Invoice');
  const cb=document.getElementById('cs-complete-btn');
  if(cb)cb.innerHTML=`<i class="ti ti-check"></i> Complete &amp; send ${hasInv?'invoice':'receipt'}`;
}
function getPaymentString(){
  const parts=[...paymentSet].map(m=>{
    const a=parseFloat(document.getElementById('pamt-'+m)?.value)||0;
    return a>0?`${m} $${a}`:m;
  });
  return parts.join(' · ');
}
function initPayments(str){
  paymentSet=new Set();
  if(!str)return;
  const amounts={};
  const parts=str.split(' · ');
  parts.forEach(part=>{
    const m=PAYMENT_METHODS.find(x=>part.startsWith(x));
    if(!m)return;
    paymentSet.add(m);
    document.getElementById('pay-'+m)?.classList.add('selected');
    const amtMatch=part.match(/\$([\d.]+)/);
    if(amtMatch)amounts[m]=amtMatch[1];
  });
  const multi=paymentSet.size>1;
  PAYMENT_METHODS.forEach(pm=>{
    const a=document.getElementById('pamt-'+pm);
    if(!a)return;
    if(paymentSet.has(pm)&&multi){a.style.display='';if(amounts[pm])a.value=amounts[pm];}
    else{a.style.display='none';}
  });
  syncPayLabel();
}
function updateNet(){const t=parseFloat(document.getElementById('cs-total').value)||0;const d=parseFloat(document.getElementById('cs-discount').value)||0;const el=document.getElementById('cs-net');if(el)el.textContent=money2(Math.max(0,t-d));}
function hydrateJobModal(j){
  j.services=SERVICES.filter(s=>document.getElementById('cs-'+s.id)?.checked).map(s=>s.id);
  j.serviceQtys=csGetQtys();
  j.servicePrices=csGetPrices();
  j.products=PRODUCTS.filter(p=>document.getElementById('cp-'+p.id)?.checked).map(p=>p.id);
  j.surcharge=document.getElementById('cs-surcharge').checked;
  j.surchargeAmt=parseFloat(document.getElementById('cs-surcharge-amt').value)||0;
  j.discount=parseFloat(document.getElementById('cs-discount').value)||0;
  j.discountReason=document.getElementById('cs-discount-reason').value;
  j.total=Math.max(0,(parseFloat(document.getElementById('cs-total').value)||0)-j.discount);
  j.payment=getPaymentString();
  j.techNotes=document.getElementById('cs-notes').value;
  j.nextServiceMonths=parseInt(document.getElementById('cs-next').value)||12;
  j.durationHours=CS_DURATION;
  j.techName=document.getElementById('cs-tech')?.value||j.techName||'';
}
function resizeImage(file,maxDim=1600,quality=0.82){
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let {width,height}=img;
      if(width<=maxDim&&height<=maxDim){resolve(file);return;}
      if(width>height){height=Math.round(height*maxDim/width);width=maxDim;}
      else{width=Math.round(width*maxDim/height);height=maxDim;}
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      canvas.toBlob(blob=>{
        resolve(blob?new File([blob],file.name.replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'}):file);
      },'image/jpeg',quality);
    };
    img.onerror=()=>resolve(file);
    img.src=url;
  });
}
async function uploadJobPhotos(jobId,files){
  const urls=[];
  for(const file of files){
    try{
      const resized=await resizeImage(file);
      const safeName=resized.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
      const path=`${jobId}/${Date.now()}-${safeName}`;
      const {error}=await supabaseBrowser.storage.from('job-photos').upload(path,resized);
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
async function deleteJobPhotos(jobId){
  try{
    const {data:files,error:listErr}=await supabaseBrowser.storage.from('job-photos').list(String(jobId));
    if(listErr||!files||!files.length)return;
    const paths=files.map(f=>`${jobId}/${f.name}`);
    await supabaseBrowser.storage.from('job-photos').remove(paths);
  }catch(err){console.error('deleteJobPhotos error',err);}
}
async function saveJobEdits(id,btn){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  setBtnLoading(btn,true,'Saving…');
  try{
    hydrateJobModal(j);
    await applyPendingPhotos(j);
    const payload={
      services:j.services,
      serviceQtys:j.serviceQtys||{},
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
      status:j.status,
      techName:j.techName||''
    };
    const resp=await apiFetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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

async function completeJob(id,btn,skipEmail=false){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  setBtnLoading(btn,true,'Completing…');
  try{
    hydrateJobModal(j);
    await applyPendingPhotos(j);
    j.status='completed';
    const payload={
      services:j.services,
      serviceQtys:j.serviceQtys||{},
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
    const resp=await apiFetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
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
    let emailSent=false;
    if(!skipEmail)emailSent=await sendJobEmail(API_BASE+'/api/emails/job-completed',j,cust);
    const isInv=[...paymentSet].includes('Invoice');
    closeModal();
    toast(skipEmail?'Job completed — no email sent':(emailSent?(isInv?'Complete — invoice & review sent':'Complete — receipt & review sent'):'Complete — email not sent'));
    showView('jobs');showSuccessFlourish();
  }catch(err){console.error('completeJob error',err);toast('Error completing job');}
  finally{setBtnLoading(btn,false);}
}
function openRescheduleJob(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  const cc=customers.find(x=>x.id===j.customerId)||{};
  showModal(`${headX('Reschedule job',nameOf(cc))}
  <div class="sheet-body">
    <div class="callout callout-ink" style="margin-bottom:14px"><i class="ti ti-calendar-event"></i><div>Currently scheduled: <strong>${fmtDate(j.date)} at ${fmtTime(j.time)}</strong></div></div>
    <div class="field-row">
      <div class="field" style="margin:0"><label>New date</label><input type="date" id="rs-date" value="${j.date}"></div>
      <div class="field" style="margin:0"><label>New time</label><input type="time" id="rs-time" value="${j.time}"></div>
    </div>
  </div>
  <div class="sheet-foot"><button class="btn" onclick="closeModal();openJob(${id})">Back</button><button class="btn btn-primary" onclick="saveReschedule(${id},this)"><i class="ti ti-calendar-check"></i> Confirm reschedule</button></div>`);
}
async function saveReschedule(id,btn){
  const date=document.getElementById('rs-date').value;
  const time=document.getElementById('rs-time').value;
  if(!date||!time)return toast('Pick a date and time');
  const j=jobs.find(x=>x.id===id);if(!j)return;
  setBtnLoading(btn,true,'Saving…');
  try{
    const resp=await apiFetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...j,date,time})});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Reschedule failed');}
    const updated=await resp.json();const u=Array.isArray(updated)?updated[0]:updated;
    if(u){const idx=jobs.findIndex(x=>x.id===id);if(idx>=0)jobs[idx]=u;}
    closeModal();toast('Job rescheduled to '+fmtDate(date));showView(currentView);
  }catch(err){console.error('saveReschedule error',err);toast('Error rescheduling job');}
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
    <div class="callout callout-ink" style="margin-bottom:16px"><i class="ti ti-map-pin"></i><div>${addressLink(cc.address)}${cc.phone?' \u00b7 '+cc.phone:''}</div></div>
    <div style="display:grid;gap:10px;font-size:13.5px">
      <div><span class="cell-sub">Services</span><div style="font-weight:600">${j.services.map(id=>svcQtyName(id,j.serviceQtys)).join(', ')||'\u2014'}</div></div>
      ${j.products.length?`<div><span class="cell-sub">Products</span><div style="font-weight:600">${j.products.map(svcName).join(', ')}</div></div>`:''}
      ${j.discount?`<div><span class="cell-sub">Discount</span><div style="font-weight:600;color:var(--red)">-${money(j.discount)}${j.discountReason?' ('+j.discountReason+')':''}</div></div>`:''}
      <div><span class="cell-sub">Payment</span><div style="font-weight:600">${j.payment||'\u2014'}</div></div>
      ${j.payment&&j.payment.toLowerCase().includes('check')?`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--line)"><input type="checkbox" id="cj-check-dep" ${j.checkDeposited?'checked':''} onchange="toggleCheckDeposited(${j.id},this.checked)"><label for="cj-check-dep" style="font-weight:600;cursor:pointer">Check deposited</label>${j.checkDeposited?'<span class="badge badge-green" style="margin-left:auto">Deposited</span>':'<span class="badge" style="margin-left:auto;background:var(--amber-bg);color:var(--amber)">Pending</span>'}</div>`:''}
      ${cc.notes?`<div><span class="cell-sub">Customer note</span><div style="font-weight:600">${tEsc(cc.notes)}</div></div>`:''}
      ${j.notes?`<div><span class="cell-sub">Job note</span><div style="font-weight:600">${tEsc(j.notes)}</div></div>`:''}
      ${j.techNotes?`<div><span class="cell-sub">Tech notes</span><div style="font-weight:600">${j.techNotes}</div></div>`:''}
      ${j.photos&&j.photos.length?`<div><span class="cell-sub">Photos</span><div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">${j.photos.map(url=>`<a href="${url}" target="_blank" rel="noopener"><img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--line)" alt="Job photo"></a>`).join('')}</div></div>`:''}
      <div><span class="cell-sub">Next service due</span><div style="font-weight:600">${j.nextServiceMonths} months \u00b7 ${cc.nextDue?fmtDate(cc.nextDue):'\u2014'}</div></div>
    </div>
    <div class="callout callout-green" style="margin-top:16px"><i class="ti ti-mail-fast"></i><div><strong>Sent automatically:</strong> ${sentLine}</div></div>
  </div>
  <div class="sheet-foot"><button class="btn" style="margin-right:auto;color:var(--red)" onclick="confirmDeleteJob(${j.id},true)"><i class="ti ti-trash"></i> Delete</button><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="closeModal();openInvoice(${j.id})"><i class="ti ti-file-text"></i> View ${j.payment&&j.payment!=='Invoice'?'receipt':'invoice'}</button></div>`);
}
async function toggleCheckDeposited(id,val){
  try{
    const resp=await apiFetch(`${API_BASE}/api/jobs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({checkDeposited:val})});
    if(!resp.ok)throw new Error('Save failed');
    const j=jobs.find(x=>x.id===id);if(j)j.checkDeposited=val;
    const badge=document.querySelector('#cj-check-dep~span');
    if(badge){badge.textContent=val?'Deposited':'Pending';badge.className='badge '+(val?'badge-green':'');if(!val){badge.style.background='var(--amber-bg)';badge.style.color='var(--amber)';}else{badge.style.background='';badge.style.color='';}}
    toast(val?'Marked as deposited':'Marked as pending');
  }catch(e){console.error(e);toast('Error updating check status');}
}
function confirmDeleteJob(id,wasCompleted){
  confirmAction('Delete this job? This can’t be undone.',()=>deleteJobRecord(id,wasCompleted));
}
async function deleteJobRecord(id,wasCompleted){
  try{
    const j=jobs.find(x=>x.id===id);
    const resp=await apiFetch(`${API_BASE}/api/jobs/${id}`,{method:'DELETE'});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Delete failed');}
    await deleteJobPhotos(id);
    jobs=jobs.filter(x=>x.id!==id);
    if(wasCompleted&&j){
      const cust=customers.find(c=>c.id===j.customerId);
      if(cust)await updateCustomerFields(cust,{jobs:Math.max(0,(cust.jobs||0)-1)});
    }
    closeModal();toast('Job deleted');showView('jobs');
  }catch(err){console.error('deleteJobRecord error',err);toast('Error deleting job');}
}

/* ---------------------------------------------------------- INVOICE / RECEIPT */
function invRow(name,amt){return `<tr><td>${name}</td><td>${money2(amt)}</td></tr>`;}
function openInvoice(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  const c=customers.find(x=>x.id===j.customerId)||{};
  const paid=j.payment&&j.payment!=='Invoice';
  const docType=paid?'RECEIPT':'INVOICE';
  let rows='';let subtotal=0;
  (j.services||[]).forEach(function(sid){const s=SERVICES.find(x=>x.id===sid);if(s){const qty=qtyOf(j,sid);const lineTotal=priceOf(j,sid)*qty;subtotal+=lineTotal;rows+=invRow(svcQtyName(sid,j.serviceQtys),lineTotal);}});
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
      <div class="inv-brand"><div class="brand-badge"><img src="${LOGO_SRC}" alt=""></div><div><div class="inv-co">${SETTINGS.businessName}</div><div class="inv-co-sub">${SETTINGS.businessSub}</div><div class="inv-co-sub mono">${SETTINGS.phone} \u00b7 ${SETTINGS.website}</div></div></div>
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
    <div class="inv-foot">Thank you for your business! We\u2019d love a review:<br><span class="mono" style="color:var(--ink-900);word-break:break-all">${SETTINGS.googleReviewUrl}</span></div>
  </div>
  <div class="sheet-foot no-print"><button class="btn" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="window.print()"><i class="ti ti-printer"></i> Print / Save as PDF</button></div>`);
}
