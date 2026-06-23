/* ============================================================
   VIEWS — render functions + router
   ============================================================ */
function showView(v){
  if(typeof canView==='function'&&!canView(v)){toast('Owner access only');v='dashboard';}
  currentView=v;
  const meta={
    dashboard:['Dashboard','Your day at a glance'],
    customers:['Customers','Everyone on the books'],
    jobs:['Jobs','Scheduled & completed work'],
    calendar:['Calendar','Plan your routes'],
    tasks:['Tasks','Your to-do list'],
    leadsources:['Lead Sources','Which sources bring the work'],
    financials:['Financials','Revenue, cost & profit'],
    catalog:['Services & Products','What you offer and what it costs'],
    settings:['Settings','Business & automation'],
  };
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const nav=document.getElementById('nav-'+v);if(nav)nav.classList.add('active');
  document.getElementById('page-title').textContent=(meta[v]||['',''])[0];
  document.getElementById('page-sub').textContent=(meta[v]||['',''])[1];
  const actions={
    customers:'<button class="btn btn-primary" onclick="openNewCustomer()"><i class="ti ti-plus"></i> New customer</button>',
    jobs:'<button class="btn btn-primary" onclick="openScheduleJob()"><i class="ti ti-plus"></i> Schedule job</button>',
    tasks:'<button class="btn btn-primary" onclick="openTaskModal()"><i class="ti ti-plus"></i> New task</button>',
  };
  document.getElementById('topbar-actions').innerHTML=actions[v]||'';
  const views={dashboard:renderDashboard,customers:renderCustomers,jobs:renderJobs,calendar:renderCalendar,tasks:renderTasks,leadsources:renderLeadSources,financials:renderFinancials,catalog:renderCatalog,settings:renderSettings};
  document.getElementById('content').innerHTML=(views[v]||renderDashboard)();
  document.getElementById('content').scrollTop=0;
  closeNav();
}

/* ---------------------------------------------------------- DASHBOARD */
function renderDashboard(){
  const today=dOff(0);
  const tasks=getDashboardTasks();
  const todoToday=getTodayTasks();
  const upcoming=getUpcoming();
  const todayJobs=jobs.filter(j=>j.date===today).sort((a,b)=>a.time>b.time?1:-1);
  const scheduled=jobs.filter(j=>j.status==='scheduled').length;
  const completedJobs=jobs.filter(j=>j.status==='completed');
  const gross=completedJobs.reduce((s,j)=>s+(j.total||0),0);
  const cogs=completedJobs.reduce((s,j)=>s+jobCost(j),0);
  const profit=gross-cogs;
  const margin=gross?Math.round(profit/gross*100):0;
  const financialStats=typeof isOwner==='function'&&isOwner()?`
  <div class="grid3" style="margin-bottom:18px">
    <div class="stat"><div class="stat-label"><i class="ti ti-cash"></i> Gross revenue</div><div class="stat-val">${money(gross)}</div><div class="stat-foot">All time</div></div>
    <div class="stat accent-red"><div class="stat-label"><i class="ti ti-receipt"></i> Cost of goods</div><div class="stat-val">${money(cogs)}</div><div class="stat-foot">Materials & labor</div></div>
    <div class="stat accent-green"><div class="stat-label"><i class="ti ti-trending-up"></i> Profit</div><div class="stat-val">${money(profit)}</div><div class="stat-foot">${margin}% margin</div></div>
  </div>`:'';
  return `
  <div class="grid3" style="margin-bottom:14px">
    <div class="stat ${tasks.length?'accent-amber':''}"><div class="stat-label"><i class="ti ti-phone-call"></i> Customers to call</div><div class="stat-val">${tasks.length}</div><div class="stat-foot">${tasks.length?'Due for service or follow-up':'All caught up'}</div></div>
    <div class="stat"><div class="stat-label"><i class="ti ti-calendar-event"></i> Scheduled jobs</div><div class="stat-val">${scheduled}</div><div class="stat-foot">On the books</div></div>
    <div class="stat"><div class="stat-label"><i class="ti ti-clock-hour-4"></i> Jobs today</div><div class="stat-val">${todayJobs.length}</div><div class="stat-foot">${fmtDate(today)}</div></div>
  </div>
  ${financialStats}
  <div class="card">
    <div class="card-head" style="margin-bottom:4px"><div class="eyebrow"><i class="ti ti-phone-call"></i> Today\u2019s calls</div>${tasks.length?`<span class="badge badge-amber">${tasks.length} to make</span>`:''}</div>
    <p class="hint" style="margin-bottom:14px">Customers due for service (reminder fires one week before) plus any follow-ups you set. Tap a row for the full profile and history.</p>
    ${tasks.length?tasks.map(taskRow).join(''):'<div class="empty"><i class="ti ti-circle-check"></i>No calls needed today \u2014 you\u2019re all caught up.</div>'}
  </div>
  <div class="card">
    <div class="card-head" style="margin-bottom:4px"><div class="eyebrow"><i class="ti ti-checklist"></i> To-do today</div>${todoToday.length?`<span class="badge ${todoToday.some(t=>t.date<today)?'badge-red':'badge-amber'}">${todoToday.length} to do</span>`:''}</div>
    <p class="hint" style="margin-bottom:14px">Your own to-dos due today or overdue. <span style="color:var(--ink-900);font-weight:600;cursor:pointer;text-decoration:underline" onclick="showView('tasks')">See all tasks \u2197</span></p>
    ${todoToday.length?todoToday.map(taskDashRow).join(''):'<div class="empty" style="padding:20px"><i class="ti ti-circle-check"></i>Nothing due today.</div>'}
    <div class="task-quickadd" style="margin-top:14px">
      <input type="text" id="dash-task-input" placeholder="Quick add a task for today\u2026" onkeydown="if(event.key==='Enter')quickAddTask('dash-task-input')">
      <button class="btn btn-primary" onclick="quickAddTask('dash-task-input')"><i class="ti ti-plus"></i> Add</button>
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="eyebrow" style="margin-bottom:12px"><i class="ti ti-calendar-event"></i> Today\u2019s jobs</div>
      ${todayJobs.length?todayJobs.map(j=>`<div class="list-row row-link" onclick="openJob(${j.id})" style="cursor:pointer"><div style="min-width:0"><div class="lr-title">${j.customerName}</div><div class="lr-sub">${fmtTime(j.time)} \u00b7 ${svcName(j.services[0])}</div></div><span class="badge ${statusBadge(j.status)}">${j.status}</span></div>`).join(''):'<p class="hint">No jobs scheduled today.</p>'}
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:12px"><i class="ti ti-clock"></i> Coming up \u00b7 next 30 days</div>
      ${upcoming.length?upcoming.map(t=>`<div class="list-row"><div style="min-width:0"><div class="lr-title">${nameOf(t.customer)}</div><div class="lr-sub">${t.kind==='service'?'Service due':'Callback'}</div></div><span class="cell-mono" style="color:var(--ink-500)">${fmtDate(t.date)}</span></div>`).join(''):'<p class="hint">Nothing coming up in the next 30 days.</p>'}
    </div>
  </div>`;
}

function taskRow(t){
  const c=t.customer,today=dOff(0);
  let badge,badgeClass;
  if(t.kind==='service'){
    const days=Math.round((new Date(today)-new Date(c.nextDue))/86400000);
    if(c.nextDue<today){badge='Overdue '+days+'d';badgeClass='badge-red';}
    else if(c.nextDue===today){badge='Due today';badgeClass='badge-amber';}
    else{badge='Due in '+Math.abs(days)+'d';badgeClass='badge-amber';}
  } else {badge=t.reason;badgeClass='badge-ink';}
  const phoneDigits=c.phone.replace(/[^0-9]/g,'');
  const sub=t.kind==='service'?`${c.phone} \u00b7 Last cleaned ${fmtDate(c.lastService)}`:`${c.phone} \u00b7 ${t.reason}`;
  return `<div class="task-row">
    <div class="avatar" onclick="openCustomer(${c.id})" style="cursor:pointer">${initials(c)}</div>
    <div class="task-main" onclick="openCustomer(${c.id})"><div class="task-name">${nameOf(c)}${c.isCompany&&c.contactName?' <span style="color:var(--ink-400);font-weight:500">\u00b7 '+c.contactName+'</span>':''}</div><div class="task-sub">${sub}</div></div>
    <span class="badge ${badgeClass}">${badge}</span>
    <div class="task-actions">
      <a class="btn btn-sm" href="tel:${phoneDigits}"><i class="ti ti-phone"></i> Call</a>
      <button class="btn btn-sm btn-primary" onclick="openScheduleJobForCustomer(${c.id})"><i class="ti ti-calendar-plus"></i> Book</button>
      <button class="btn btn-sm btn-icon" title="Log call outcome" onclick="openLogOutcome(${c.id},${t.reminderId||'null'})"><i class="ti ti-dots"></i></button>
    </div>
  </div>`;
}

/* ---------------------------------------------------------- CUSTOMERS */
function renderCustomers(){
  return `
  <div class="card" style="padding:14px 16px;margin-bottom:14px"><div class="search"><i class="ti ti-search"></i><input type="text" id="cust-search" placeholder="Search by name, phone, or company\u2026" oninput="filterCustomerRows(this.value)"></div></div>
  <div class="card flush"><div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Account</th><th>Phone</th><th>Address</th><th>Next due</th><th>Lead source</th><th></th></tr></thead><tbody id="cust-tbody">${customers.map(custRow).join('')}</tbody></table></div></div>`;
}
function custRow(c){
  const today=dOff(0);
  const ls=c.leadSources||[];
  const s=(nameOf(c)+' '+c.phone+' '+(c.contactName||'')+' '+ls.join(' ')).toLowerCase();
  const overdue=c.nextDue&&c.nextDue<today;
  return `<tr class="row-link" data-s="${s}" onclick="openCustomer(${c.id})">
    <td class="td-primary" data-label="Name"><div style="display:flex;align-items:center;gap:11px"><div class="avatar sm">${initials(c)}</div><div style="min-width:0"><div class="cell-strong">${nameOf(c)}</div><div class="cell-sub truncate">${c.email}</div></div></div></td>
    <td data-label="Account">${c.isCompany?'<span class="badge badge-ink"><i class="ti ti-building"></i> Company</span>':'<span class="cell-sub">Individual</span>'}</td>
    <td data-label="Phone" class="cell-mono">${c.phone}</td>
    <td data-label="Address"><span class="cell-sub truncate">${c.address}</span></td>
    <td data-label="Next due">${c.nextDue?`<span class="cell-mono" style="${overdue?'color:var(--red);font-weight:600':''}">${fmtDate(c.nextDue)}</span>`:'<span class="cell-sub">\u2014</span>'}</td>
    <td data-label="Lead source">${ls.length?`<span class="badge badge-ink">${lsEsc(ls[0])}</span>${ls.length>1?` <span class="cell-sub">+${ls.length-1}</span>`:''}`:'<span class="cell-sub">\u2014</span>'}</td>
    <td data-label="" style="text-align:right"><button class="btn btn-sm" onclick="event.stopPropagation();openScheduleJobForCustomer(${c.id})"><i class="ti ti-calendar-plus"></i> Book</button></td>
  </tr>`;
}
function filterCustomerRows(v){const q=v.toLowerCase();document.querySelectorAll('#cust-tbody tr').forEach(tr=>{tr.style.display=tr.getAttribute('data-s').includes(q)?'':'none';});}

/* ---------------------------------------------------------- JOBS */
function renderJobs(){
  const sorted=[...jobs].sort((a,b)=>a.date>b.date?-1:(a.date<b.date?1:(a.time>b.time?-1:1)));
  return `<div class="card flush"><div class="table-wrap"><table class="data"><thead><tr><th>Customer</th><th>Date</th><th>Services</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${sorted.map(j=>`<tr class="row-link" onclick="openJob(${j.id})">
    <td class="td-primary" data-label="Customer"><div class="cell-strong">${j.customerName}</div></td>
    <td data-label="Date" class="cell-mono">${fmtDate(j.date)} \u00b7 ${fmtTime(j.time)}</td>
    <td data-label="Services"><span class="cell-sub truncate">${j.services.map(svcName).join(', ')}</span></td>
    <td data-label="Status"><span class="badge ${statusBadge(j.status)}">${j.status}</span></td>
    <td data-label="Total" class="cell-mono">${j.total?money(j.total):'\u2014'}</td>
    <td data-label="" style="text-align:right">${j.status==='scheduled'?`<button class="btn btn-sm btn-success" onclick="event.stopPropagation();openCompleteJob(${j.id})"><i class="ti ti-check"></i> Complete</button>`:`<button class="btn btn-sm" onclick="event.stopPropagation();openInvoice(${j.id})"><i class="ti ti-file-text"></i> Receipt</button>`}</td>
  </tr>`).join('')}</tbody></table></div></div>`;
}

/* ---------------------------------------------------------- CALENDAR */
let calMode='month';
let calDate=dOff(0);
function renderCalendar(){return calMode==='day'?renderDaySchedule():calMode==='week'?renderWeek():renderMonth();}
function setCalMode(m){calMode=m;document.getElementById('content').innerHTML=renderCalendar();}
function openCalDay(key){calDate=key;calMode='day';document.getElementById('content').innerHTML=renderCalendar();}
function calNavDay(delta){calDate=addDays(calDate,delta);document.getElementById('content').innerHTML=renderCalendar();}
function calNavWeek(delta){calDate=addDays(calDate,7*delta);document.getElementById('content').innerHTML=renderCalendar();}
function calNavMonth(delta){const p=calDate.split('-');const d=new Date(+p[0],+p[1]-1+delta,1);calDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;document.getElementById('content').innerHTML=renderCalendar();}
function calToday(){calDate=dOff(0);document.getElementById('content').innerHTML=renderCalendar();}
function calToggle(active){const m=[['month','Month'],['week','Week'],['day','Day']];return `<div class="segmented">${m.map(x=>`<button class="${active===x[0]?'on':''}" onclick="setCalMode('${x[0]}')">${x[1]}</button>`).join('')}</div>`;}
function weekStartKey(key){const p=key.split('-');const d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()-d.getDay());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

function renderMonth(){
  const p=calDate.split('-');const year=+p[0],month=+p[1]-1;const todayKey=dOff(0);
  const monthName=['January','February','March','April','May','June','July','August','September','October','November','December'][month];
  const firstDay=new Date(year,month,1).getDay();const daysInMonth=new Date(year,month+1,0).getDate();
  const prefix=`${year}-${String(month+1).padStart(2,'0')}-`;
  const jobDates={};jobs.forEach(j=>{if(j.date.startsWith(prefix)){const d=parseInt(j.date.slice(8,10));jobDates[d]=(jobDates[d]||0)+1;}});
  let cells='';['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{cells+='<div class="cal-head">'+d+'</div>';});
  for(let i=0;i<firstDay;i++)cells+='<div class="cal-day blank"></div>';
  for(let d=1;d<=daysInMonth;d++){const key=prefix+String(d).padStart(2,'0');const hasJob=jobDates[d];cells+=`<div class="cal-day${hasJob?' has-job':''}${key===todayKey?' today':''}" onclick="openCalDay('${key}')"><span class="daynum">${d}</span>${hasJob?`<span class="jobpill">${hasJob} job${hasJob>1?'s':''}</span>`:''}</div>`;}
  return `<div class="card"><div class="card-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="calNavMonth(-1)"><i class="ti ti-chevron-left"></i></button><h3 style="font-size:17px;font-weight:700;min-width:150px;text-align:center;letter-spacing:-.01em">${monthName} ${year}</h3><button class="btn btn-sm btn-icon" onclick="calNavMonth(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="calToday()">Today</button></div>${calToggle('month')}</div><div class="cal-grid">${cells}</div><p class="hint" style="margin-top:14px;text-align:center">Tap any day to open its full schedule.</p></div>`;
}

function layoutDay(dayJobs){
  const evs=dayJobs.map(j=>{const p=j.time.split(':');const start=(+p[0])*60+(+(p[1]||0));return{job:j,start,end:start+120};}).sort((a,b)=>a.start-b.start||a.end-b.end);
  let i=0;
  while(i<evs.length){let clusterEnd=evs[i].end;let k=i+1;while(k<evs.length&&evs[k].start<clusterEnd){clusterEnd=Math.max(clusterEnd,evs[k].end);k++;}const cluster=evs.slice(i,k);const cols=[];cluster.forEach(e=>{let placed=false;for(let c=0;c<cols.length;c++){if(cols[c]<=e.start){e.col=c;cols[c]=e.end;placed=true;break;}}if(!placed){e.col=cols.length;cols.push(e.end);}});cluster.forEach(e=>e.cols=cols.length);i=k;}
  return evs;
}

function renderDaySchedule(){
  const key=calDate;const dayJobs=jobs.filter(j=>j.date===key);
  const H0=7,H1=20,HH=60,GUT=58;
  const evs=layoutDay(dayJobs);
  let grid='';
  for(let h=H0;h<=H1;h++){const top=(h-H0)*HH;const label=(h%12===0?12:h%12)+(h<12?' AM':' PM');grid+=`<div style="position:absolute;top:${top}px;left:0;right:0;height:0;border-top:1px solid var(--line)"></div><div class="cell-mono" style="position:absolute;top:${top-7}px;left:0;width:${GUT-10}px;text-align:right;font-size:10px;color:var(--ink-400)">${label}</div>`;}
  let blocks='';
  evs.forEach(e=>{const j=e.job;const c=customers.find(x=>x.id===j.customerId)||{};const top=Math.max(0,((e.start-H0*60)/60)*HH);const height=(120/60)*HH-5;const leftCalc=`calc(${GUT}px + (100% - ${GUT}px) * ${e.col/e.cols})`;const widthCalc=`calc((100% - ${GUT}px) * ${1/e.cols} - 6px)`;blocks+=`<div class="cal-event${j.status==='completed'?' done':''}" onclick="openJob(${j.id})" style="top:${top}px;left:${leftCalc};width:${widthCalc};height:${height}px"><div class="cal-event-time" style="color:${j.status==='completed'?'var(--green)':'var(--ink-900)'}">${fmtTime(j.time)} \u00b7 ${j.status}</div><div class="cal-event-name">${j.customerName}</div><div class="cal-event-meta"><i class="ti ti-map-pin"></i> ${c.address||'No address'}</div><div class="cal-event-meta">${j.services.map(svcName).join(', ')}</div></div>`;});
  const totalH=(H1-H0)*HH+12;
  const dp=key.split('-');const dObj=new Date(+dp[0],+dp[1]-1,+dp[2]);const dayName=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dObj.getDay()];
  const isToday=key===dOff(0);
  return `<div class="card"><div class="card-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="calNavDay(-1)"><i class="ti ti-chevron-left"></i></button><div><h3 style="font-size:16px;font-weight:700;letter-spacing:-.01em;white-space:nowrap">${dayName}${isToday?' \u00b7 Today':''}</h3><div class="cell-mono" style="font-size:11px;color:var(--ink-500)">${fmtDate(key)}</div></div><button class="btn btn-sm btn-icon" onclick="calNavDay(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="calToday()">Today</button></div>${calToggle('day')}</div><div class="hint" style="margin-bottom:12px">${dayJobs.length} job${dayJobs.length!==1?'s':''} \u00b7 2-hour slots \u00b7 tap a job for full details</div><div style="position:relative;height:${totalH}px;margin-top:4px">${grid}${blocks}</div></div>`;
}

function renderWeek(){
  const start=weekStartKey(calDate);
  const days=[];for(let i=0;i<7;i++)days.push(addDays(start,i));
  const H0=7,H1=20,HH=48,GUT=44,COLW=128;
  const totalW=GUT+7*COLW;const totalH=(H1-H0)*HH+10;
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const todayKey=dOff(0);
  let header=`<div style="display:flex;width:${totalW}px"><div style="width:${GUT}px;flex-shrink:0"></div>`+days.map((k,i)=>{const dp=k.split('-');const isT=k===todayKey;return `<div onclick="openCalDay('${k}')" style="width:${COLW}px;flex-shrink:0;text-align:center;cursor:pointer;padding:6px 0;border-radius:8px;${isT?'background:var(--ink-900);color:#fff':''}"><div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;${isT?'color:#fff':'color:var(--ink-400)'}">${dayNames[i]}</div><div class="cell-mono" style="font-size:15px;font-weight:600;margin-top:1px">${parseInt(dp[2])}</div></div>`;}).join('')+`</div>`;
  let grid='';
  for(let h=H0;h<=H1;h++){const top=(h-H0)*HH;const label=(h%12===0?12:h%12)+(h<12?'a':'p');grid+=`<div style="position:absolute;top:${top}px;left:0;width:${totalW}px;border-top:1px solid var(--line)"></div><div class="cell-mono" style="position:absolute;top:${top-6}px;left:0;width:${GUT-6}px;text-align:right;font-size:9px;color:var(--ink-400)">${label}</div>`;}
  let seps='';for(let i=0;i<7;i++){const left=GUT+i*COLW;seps+=`<div style="position:absolute;top:0;bottom:0;left:${left}px;border-left:1px solid var(--line)"></div>`;}
  let blocks='';
  days.forEach((k,di)=>{const dj=jobs.filter(j=>j.date===k);const evs=layoutDay(dj);evs.forEach(e=>{const j=e.job;const top=Math.max(0,((e.start-H0*60)/60)*HH);const height=(120/60)*HH-3;const cw=COLW/e.cols;const left=GUT+di*COLW+e.col*cw+1;const w=cw-3;blocks+=`<div class="cal-event${j.status==='completed'?' done':''}" onclick="openJob(${j.id})" style="top:${top}px;left:${left}px;width:${w}px;height:${height}px;padding:3px 6px"><div class="cal-event-time" style="color:${j.status==='completed'?'var(--green)':'var(--ink-900)'}">${fmtTime(j.time)}</div><div class="cal-event-name" style="font-size:11px">${j.customerName}</div></div>`;});});
  return `<div class="card"><div class="card-head"><div style="display:flex;align-items:center;gap:8px"><button class="btn btn-sm btn-icon" onclick="calNavWeek(-1)"><i class="ti ti-chevron-left"></i></button><h3 style="font-size:15px;font-weight:700;letter-spacing:-.01em">${fmtDate(start)} \u2013 ${fmtDate(addDays(start,6))}</h3><button class="btn btn-sm btn-icon" onclick="calNavWeek(1)"><i class="ti ti-chevron-right"></i></button><button class="btn btn-sm" onclick="calToday()">Today</button></div>${calToggle('week')}</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><div style="min-width:${totalW}px">${header}<div style="position:relative;height:${totalH}px;margin-top:4px">${grid}${seps}${blocks}</div></div></div><p class="hint" style="margin-top:10px;text-align:center">Tap a day to open its full schedule \u00b7 scroll sideways for the whole week.</p></div>`;
}

/* ---------------------------------------------------------- FINANCIALS */
let finPeriod='month';
function setFinPeriod(p){finPeriod=p;document.getElementById('content').innerHTML=renderFinancials();}
function weekKey(ds){const d=new Date(ds);const oneJan=new Date(d.getFullYear(),0,1);const days=Math.floor((d-oneJan)/86400000);const wk=Math.ceil((days+oneJan.getDay()+1)/7);return d.getFullYear()+'-W'+String(wk).padStart(2,'0');}
function periodKey(ds,p){const d=new Date(ds);if(p==='week')return weekKey(ds);if(p==='month')return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(p==='year')return ''+d.getFullYear();return 'all';}
function periodLabel(key,p){if(p==='all')return 'All time';if(p==='year')return key;if(p==='month'){const a=key.split('-');const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mo[parseInt(a[1])-1]+' '+a[0];}if(p==='week'){const a=key.split('-W');return 'Week '+a[1]+', '+a[0];}return key;}
function renderFinancials(){
  const completed=jobs.filter(j=>j.status==='completed');
  const groups={};
  completed.forEach(j=>{const k=periodKey(j.date,finPeriod);(groups[k]=groups[k]||[]).push(j);});
  const keys=Object.keys(groups).sort().reverse();
  const tabs=[['week','Week'],['month','Month'],['year','Year'],['all','All time']];
  let html=`<div class="card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:14px 18px"><span class="eyebrow" style="margin:0">Break down by</span><div class="segmented">${tabs.map(t=>`<button class="${finPeriod===t[0]?'on':''}" onclick="setFinPeriod('${t[0]}')">${t[1]}</button>`).join('')}</div></div>`;
  if(!keys.length){html+='<div class="card"><div class="empty"><i class="ti ti-chart-bar"></i>No completed jobs yet \u2014 your numbers will appear here as you complete jobs.</div></div>';return html;}
  keys.forEach(k=>{
    const arr=groups[k];
    const gross=arr.reduce((s,j)=>s+(j.total||0),0);
    const cost=arr.reduce((s,j)=>s+jobCost(j),0);
    const profit=gross-cost;
    const margin=gross?Math.round(profit/gross*100):0;
    html+=`<div class="card"><div class="card-head" style="margin-bottom:14px"><div style="font-weight:700;font-size:17px;letter-spacing:-.01em">${periodLabel(k,finPeriod)}</div><span class="badge badge-ink">${arr.length} job${arr.length!==1?'s':''} \u00b7 ${margin}% margin</span></div><div class="grid3"><div class="stat"><div class="stat-label">Gross revenue</div><div class="stat-val sm">${money(gross)}</div></div><div class="stat accent-red"><div class="stat-label">Cost of goods</div><div class="stat-val sm">${money(cost)}</div></div><div class="stat accent-green"><div class="stat-label">Profit</div><div class="stat-val sm">${money(profit)}</div></div></div></div>`;
  });
  return html;
}

/* ---------------------------------------------------------- CATALOG */
function renderCatalog(){
  return `
  <div class="card">
    <div class="card-head"><div class="eyebrow"><i class="ti ti-tools"></i> Services</div><button class="btn btn-sm" onclick="addCatalogItem('service')"><i class="ti ti-plus"></i> Add service</button></div>
    <p class="hint" style="margin-bottom:14px">Set what you charge and what each one costs you. Margin updates automatically and feeds the dashboard profit.</p>
    <div class="cat-head"><span>Item</span><span>Charge</span><span>Cost</span><span>Margin</span><span></span></div>
    ${SERVICES.map(s=>catalogRow('service',s)).join('')}
  </div>
  <div class="card">
    <div class="card-head"><div class="eyebrow"><i class="ti ti-package"></i> Products</div><button class="btn btn-sm" onclick="addCatalogItem('product')"><i class="ti ti-plus"></i> Add product</button></div>
    <div class="cat-head"><span>Item</span><span>Charge</span><span>Cost</span><span>Margin</span><span></span></div>
    ${PRODUCTS.map(p=>catalogRow('product',p)).join('')}
  </div>`;
}
function catalogRow(type,it){
  const margin=(it.price||0)-(it.cost||0);
  const nm=(it.name||'').replace(/"/g,'&quot;');
  return `<div class="cat-row">
    <input class="cat-name" type="text" value="${nm}" onchange="updateCatalog('${type}','${it.id}','name',this.value)">
    <input class="cat-num" type="number" value="${it.price||0}" onchange="updateCatalog('${type}','${it.id}','price',parseFloat(this.value)||0)">
    <input class="cat-num" type="number" value="${it.cost||0}" onchange="updateCatalog('${type}','${it.id}','cost',parseFloat(this.value)||0)">
    <span class="cat-margin ${margin>=0?'pos':'neg'}">${money(margin)}</span>
    <button class="btn btn-sm btn-icon" title="Remove" onclick="deleteCatalog('${type}','${it.id}')"><i class="ti ti-trash"></i></button>
  </div>`;
}
function catalogList(type){return type==='service'?SERVICES:PRODUCTS;}
function catalogEndpoint(type){return type==='service'?API_BASE+'/api/services':API_BASE+'/api/products';}
function catalogFirstReturned(json){return Array.isArray(json)?json[0]:json;}
function replaceCatalogItem(type,item){
  const arr=catalogList(type);
  const idx=arr.findIndex(x=>String(x.id)===String(item.id));
  if(idx>=0)arr[idx]=item;
  else arr.push(item);
}
async function updateCatalog(type,id,field,val){
  const it=catalogList(type).find(x=>String(x.id)===String(id));
  if(!it)return;
  try{
    const payload={name:it.name,price:it.price||0,cost:it.cost||0};
    payload[field]=val;
    const resp=await fetch(`${catalogEndpoint(type)}/${id}`,{method:'PUT',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Update failed');}
    const updated=catalogFirstReturned(await resp.json());
    if(!updated)throw new Error('No item returned');
    replaceCatalogItem(type,updated);
    showView('catalog');
  }catch(err){console.error('updateCatalog error',err);toast('Error saving item');showView('catalog');}
}
async function deleteCatalog(type,id){
  try{
    const resp=await fetch(`${catalogEndpoint(type)}/${id}`,{method:'DELETE',headers:NGROK_HEADERS});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Delete failed');}
    if(type==='service')SERVICES=SERVICES.filter(x=>String(x.id)!==String(id));
    else PRODUCTS=PRODUCTS.filter(x=>String(x.id)!==String(id));
    showView('catalog');toast('Removed');
  }catch(err){console.error('deleteCatalog error',err);toast('Error removing item');}
}
async function addCatalogItem(type){
  const payload={id:(type==='service'?'svc':'prd')+Date.now(),name:type==='service'?'New service':'New product',price:0,cost:0,location:activeLoc};
  try{
    const resp=await fetch(catalogEndpoint(type),{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create failed');}
    const created=catalogFirstReturned(await resp.json());
    if(!created)throw new Error('No item returned');
    replaceCatalogItem(type,created);
    showView('catalog');toast('Added - edit the details');
  }catch(err){console.error('addCatalogItem error',err);toast('Error adding item');}
}

/* ---------------------------------------------------------- SETTINGS */
function renderSettings(){
  if(typeof isOwner==='function'&&!isOwner()){
    return `<div class="card" style="max-width:520px">${renderPasswordSettings()}</div>`;
  }
  return `<div class="grid2">
    <div class="card">
      <div class="section-title"><i class="ti ti-building-store"></i> Business info</div>
      <div style="display:flex;align-items:center;gap:13px;margin-bottom:18px;padding:14px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-ctl)">
        <div class="brand-badge" style="width:50px;height:50px"><img src="${LOGO_SRC}" alt=""></div>
        <div><div style="font-weight:700;font-size:15px">Klean Ventz</div><div class="hint">Dryer Vent Cleaning &amp; Installation LLC</div></div>
      </div>
      <div class="field"><label>Business name</label><input type="text" value="Klean Ventz Dryer Vent Cleaning & Installation LLC"></div>
      <div class="field-row"><div class="field" style="margin:0"><label>Phone</label><input type="text" value="732-808-3637"></div><div class="field" style="margin:0"><label>Website</label><input type="text" value="kleanventz.com"></div></div>
      <div class="field"><label>Email</label><input type="email" placeholder="your@email.com"></div>
      <div class="field"><label>Google review link</label><input type="url" value="${GOOGLE_REVIEW_URL}"></div>
      <button class="btn btn-primary" onclick="toast('Settings saved')"><i class="ti ti-check"></i> Save changes</button>
      ${renderPasswordSettings()}
      ${typeof isOwner==='function'&&isOwner()?renderUserAdmin():''}
    </div>
    <div>
      <div class="card">
        <div class="section-title"><i class="ti ti-mail-fast"></i> Automated emails</div>
        <p class="hint" style="margin-bottom:12px">Only these three send automatically. Everything else stays manual.</p>
        <div class="callout callout-green" style="margin-bottom:8px"><i class="ti ti-calendar-check"></i><div><strong>Appointment confirmation</strong><div style="color:var(--ink-500);margin-top:1px">Sent when a job is booked</div></div></div>
        <div class="callout callout-green" style="margin-bottom:8px"><i class="ti ti-file-invoice"></i><div><strong>Receipt or invoice</strong><div style="color:var(--ink-500);margin-top:1px">Sent when a job is completed</div></div></div>
        <div class="callout callout-green"><i class="ti ti-star"></i><div><strong>Review request</strong><div style="color:var(--ink-500);margin-top:1px">Sent with the receipt after payment</div></div></div>
      </div>
      <div class="card">
        <div class="section-title"><i class="ti ti-route"></i> Lead sources</div>
        <p class="hint" style="margin-bottom:12px">The “how did you hear about us” choices shown when adding a customer — ${LEAD_SOURCES.length} on the list. Add or remove any time.</p>
        <div style="display:flex;gap:8px;margin-bottom:12px"><input type="text" id="new-lead-source" placeholder="Add a lead source\u2026" onkeydown="if(event.key==='Enter')addLeadSource()"><button class="btn" onclick="addLeadSource()"><i class="ti ti-plus"></i></button></div>
        <div id="lead-source-list" class="ls-manage">${LEAD_SOURCES.map(leadRow).join('')}</div>
      </div>
    </div>
  </div>`;
}
function renderPasswordSettings(){
  return `<div class="section-title" style="margin-top:24px"><i class="ti ti-lock-password"></i> Change password</div>
  <div class="field"><label>New password</label><input type="password" id="acct-new-password" autocomplete="new-password" placeholder="At least 6 characters"></div>
  <div class="field"><label>Confirm password</label><input type="password" id="acct-confirm-password" autocomplete="new-password" placeholder="Re-enter password"></div>
  <button class="btn" onclick="changeOwnPassword()"><i class="ti ti-key"></i> Update password</button>`;
}
async function changeOwnPassword(){
  const p=document.getElementById('acct-new-password').value;
  const c=document.getElementById('acct-confirm-password').value;
  if(!p||p.length<6)return toast('Password must be at least 6 characters');
  if(p!==c)return toast('Passwords do not match');
  try{
    const {error}=await supabaseBrowser.auth.updateUser({password:p});
    if(error)throw error;
    document.getElementById('acct-new-password').value='';
    document.getElementById('acct-confirm-password').value='';
    toast('Password updated');
  }catch(err){console.error('changeOwnPassword error',err);toast('Error updating password');}
}
function renderUserAdmin(){
  return `<div class="section-title" style="margin-top:24px"><i class="ti ti-user-plus"></i> Add user</div>
  <div class="field"><label>Name</label><input type="text" id="new-user-name" placeholder="Technician name"></div>
  <div class="field"><label>Email</label><input type="email" id="new-user-email" placeholder="tech@example.com"></div>
  <div class="field-row">
    <div class="field" style="margin:0"><label>Role</label><select id="new-user-role"><option value="technician">Technician</option><option value="owner">Owner</option></select></div>
    <div class="field" style="margin:0"><label>Temporary password</label><input type="text" id="new-user-password" placeholder="At least 6 characters"></div>
  </div>
  <button class="btn" onclick="createCrmUser()"><i class="ti ti-user-plus"></i> Create account</button>
  <p class="hint" style="margin-top:10px">Give this temporary password to the user. They can change it later through Supabase password recovery.</p>`;
}
async function createCrmUser(){
  const name=document.getElementById('new-user-name').value.trim();
  const email=document.getElementById('new-user-email').value.trim();
  const role=document.getElementById('new-user-role').value;
  const password=document.getElementById('new-user-password').value;
  if(!email||!password)return toast('Enter email and temporary password');
  try{
    const {data:{session}}=await supabaseBrowser.auth.getSession();
    const resp=await fetch(API_BASE+'/api/users',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({email,password,role,name})});
    if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create user failed');}
    document.getElementById('new-user-name').value='';
    document.getElementById('new-user-email').value='';
    document.getElementById('new-user-password').value='';
    toast('User account created');
  }catch(err){console.error('createCrmUser error',err);toast('Error creating user');}
}
function leadSourceFirstReturned(json){return Array.isArray(json)?json[0]:json;}
function replaceLeadSourceRow(row){
  const idx=LEAD_SOURCE_ROWS.findIndex(x=>String(x.id)===String(row.id));
  if(idx>=0)LEAD_SOURCE_ROWS[idx]=row;
  else LEAD_SOURCE_ROWS.push(row);
  LEAD_SOURCE_ROWS.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  LEAD_SOURCES=LEAD_SOURCE_ROWS.map(x=>x.name).filter(Boolean);
}
async function createLeadSource(name){
  const existing=LEAD_SOURCE_ROWS.find(x=>(x.name||'').toLowerCase()===name.toLowerCase());
  if(existing)return existing;
  const resp=await fetch(API_BASE+'/api/lead-sources',{method:'POST',headers:{...NGROK_HEADERS,'Content-Type':'application/json'},body:JSON.stringify({name})});
  if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Create lead source failed');}
  const created=leadSourceFirstReturned(await resp.json());
  if(!created)throw new Error('No lead source returned');
  replaceLeadSourceRow(created);
  return created;
}
function leadRow(s){return `<div class="lead-chip"><span>${s}</span><i class="ti ti-x" onclick="removeLeadSource('${s.replace(/'/g,"\\'")}')"></i></div>`;}
async function addLeadSource(){
  const inp=document.getElementById('new-lead-source');const val=inp.value.trim();if(!val)return;
  try{
    await createLeadSource(val);
    inp.value='';refreshLeadSourceList();toast('Lead source added');
  }catch(err){console.error('addLeadSource error',err);toast('Error adding lead source');}
}
async function removeLeadSource(s){
  const row=LEAD_SOURCE_ROWS.find(x=>x.name===s);
  try{
    if(row){
      const resp=await fetch(`${API_BASE}/api/lead-sources/${row.id}`,{method:'DELETE',headers:NGROK_HEADERS});
      if(!resp.ok){const txt=await resp.text();throw new Error(txt||'Delete lead source failed');}
      LEAD_SOURCE_ROWS=LEAD_SOURCE_ROWS.filter(x=>String(x.id)!==String(row.id));
    }else{
      LEAD_SOURCE_ROWS=LEAD_SOURCE_ROWS.filter(x=>x.name!==s);
    }
    LEAD_SOURCES=LEAD_SOURCES.filter(x=>x!==s);
    refreshLeadSourceList();toast('Lead source removed');
  }catch(err){console.error('removeLeadSource error',err);toast('Error removing lead source');}
}
function refreshLeadSourceList(){const list=document.getElementById('lead-source-list');if(list)list.innerHTML=LEAD_SOURCES.map(leadRow).join('');}
