/* ============================================================
   LEAD SOURCES — jobs grouped by the source that brought them.
   Driven entirely by completed JOBS (no "lead" concept).
   Pie + drill-down + month / year / all-time.
   ============================================================ */
const LS_RAMP=['#1A1815','#2E7250','#46433D','#946312','#8A847A','#635D53','#B98C3A','#ADA79C','#C2BDB3'];
let lsState={mode:'all',ym:'',year:'',metric:'jobs',sel:null};

function lsCompleted(){return jobs.filter(j=>j.status==='completed');}
function lsSourcesOf(j){const c=customers.find(x=>x.id===j.customerId);return (c&&c.leadSources&&c.leadSources.length)?c.leadSources:['Unspecified'];}
function lsEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function lsAttr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function lsAvailable(){
  const yms=[...new Set(lsCompleted().map(j=>j.date.slice(0,7)))].sort();
  const years=[...new Set(yms.map(x=>x.slice(0,4)))].sort();
  return{yms,years};
}
function lsInitState(){
  const {yms,years}=lsAvailable();
  if(!yms.length){lsState.ym='';lsState.year='';return;}
  if(!lsState.ym||!yms.includes(lsState.ym))lsState.ym=yms[yms.length-1];
  if(!lsState.year||!years.includes(lsState.year))lsState.year=years[years.length-1];
}

/* stable color map: order sources by all-time revenue */
function lsColorMap(){
  const tot={};
  lsCompleted().forEach(j=>{lsSourcesOf(j).forEach(s=>{tot[s]=(tot[s]||0)+(j.total||0);});});
  const ordered=Object.keys(tot).sort((a,b)=>tot[b]-tot[a]);
  const map={};ordered.forEach((s,i)=>map[s]=LS_RAMP[i%LS_RAMP.length]);
  return map;
}

function lsPeriodJobs(){
  const all=lsCompleted();
  if(lsState.mode==='month')return all.filter(j=>j.date.startsWith(lsState.ym));
  if(lsState.mode==='year')return all.filter(j=>j.date.startsWith(lsState.year));
  return all;
}
function lsPeriodLabel(){
  if(lsState.mode==='all'){const {yms}=lsAvailable();return yms.length?'All time \u00b7 '+fmtYMShort(yms[0])+' \u2013 '+fmtYMShort(yms[yms.length-1]):'All time';}
  if(lsState.mode==='year')return lsState.year;
  return fmtYMLong2(lsState.ym);
}
function fmtYMShort(ym){const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mo[+ym.slice(5,7)-1]+' '+ym.slice(2,4);}
function fmtYMLong2(ym){const mo=['January','February','March','April','May','June','July','August','September','October','November','December'];return mo[+ym.slice(5,7)-1]+' '+ym.slice(0,4);}

function lsGroups(){
  const pj=lsPeriodJobs();const cmap=lsColorMap();
  const g={};
  pj.forEach(j=>{lsSourcesOf(j).forEach(s=>{(g[s]=g[s]||{source:s,color:cmap[s]||'#999',count:0,revenue:0,jobs:[]});g[s].count++;g[s].revenue+=(j.total||0);g[s].jobs.push(j);});});
  const arr=Object.values(g);
  arr.forEach(x=>x.avg=x.count?x.revenue/x.count:0);
  return arr.sort((a,b)=>b.revenue-a.revenue);
}

function setLsMode(m){lsState.mode=m;document.getElementById('content').innerHTML=renderLeadSources();}
function setLsMetric(m){lsState.metric=m;document.getElementById('content').innerHTML=renderLeadSources();}
function lsStep(dir){
  const {yms,years}=lsAvailable();
  if(lsState.mode==='month'){let i=yms.indexOf(lsState.ym)+dir;i=Math.max(0,Math.min(yms.length-1,i));lsState.ym=yms[i];}
  else if(lsState.mode==='year'){let i=years.indexOf(lsState.year)+dir;i=Math.max(0,Math.min(years.length-1,i));lsState.year=years[i];}
  document.getElementById('content').innerHTML=renderLeadSources();
}
function lsSelect(src){lsState.sel=(lsState.sel===src)?null:src;document.getElementById('content').innerHTML=renderLeadSources();}

/* ============================================================ RENDER */
function renderLeadSources(){
  lsInitState();
  const groups=lsGroups();
  if(lsState.sel&&!groups.some(g=>g.source===lsState.sel))lsState.sel=null;
  const pj=lsPeriodJobs();
  const dJobs=pj.length;
  const dRev=pj.reduce((s,j)=>s+(j.total||0),0);
  const mJobs=groups.reduce((s,g)=>s+g.count,0);
  const mRev=groups.reduce((s,g)=>s+g.revenue,0);
  const metric=lsState.metric;
  const multi=mJobs>dJobs;
  const modes=[['month','Month'],['year','Year'],['all','All time']];
  const stepper=lsState.mode==='all'?'':`<div class="mkt-stepper"><button class="btn btn-sm btn-icon" onclick="lsStep(-1)"><i class="ti ti-chevron-left"></i></button><span>${lsPeriodLabel()}</span><button class="btn btn-sm btn-icon" onclick="lsStep(1)"><i class="ti ti-chevron-right"></i></button></div>`;

  if(!dJobs){
    return controlsBar(modes,stepper)+`<div class="card"><div class="empty"><i class="ti ti-chart-pie"></i>No completed jobs in this period yet.<br>Complete a job and it\u2019ll show up here, sorted by the lead source that brought it.</div></div>`;
  }

  const top=groups[0];

  return controlsBar(modes,stepper)+`
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi"><div class="kpi-label"><i class="ti ti-clipboard-check"></i> Jobs</div><div class="kpi-val">${dJobs}</div><div class="kpi-foot"><span class="kpi-sub">completed</span></div></div>
    <div class="kpi"><div class="kpi-label"><i class="ti ti-cash"></i> Revenue</div><div class="kpi-val">${money(dRev)}</div><div class="kpi-foot"><span class="kpi-sub">from these jobs</span></div></div>
    <div class="kpi"><div class="kpi-label"><i class="ti ti-receipt-2"></i> Avg job value</div><div class="kpi-val">${money(dJobs?dRev/dJobs:0)}</div><div class="kpi-foot"><span class="kpi-sub">per job</span></div></div>
    <div class="kpi kpi-hero"><div class="kpi-label"><i class="ti ti-trophy"></i> Top source</div><div class="kpi-val" style="font-size:19px">${lsEsc(top.source)}</div><div class="kpi-foot"><span class="kpi-sub">${metric==='jobs'?top.count+' of '+dJobs+' jobs':money(top.revenue)+' of '+money(dRev)}</span></div></div>
  </div>

  <div class="mkt-2col">
    <div class="card">
      <div class="card-head" style="margin-bottom:14px">
        <div class="eyebrow"><i class="ti ti-chart-pie"></i> Jobs by lead source</div>
        <div class="segmented"><button class="${metric==='jobs'?'on':''}" onclick="setLsMetric('jobs')">By jobs</button><button class="${metric==='revenue'?'on':''}" onclick="setLsMetric('revenue')">By revenue</button></div>
      </div>
      <div class="donut-wrap">
        <div class="donut-fig">${lsPie(groups,metric,mJobs,mRev)}<div class="donut-center"><div class="donut-center-val">${metric==='jobs'?dJobs:money(dRev)}</div><div class="donut-center-lbl">${metric==='jobs'?'jobs':'revenue'}</div></div></div>
        <div class="donut-legend">${groups.map(g=>lsLegendRow(g,metric,mJobs,mRev)).join('')}</div>
      </div>
      <p class="hint" style="margin-top:14px"><i class="ti ti-hand-finger" style="font-size:13px;vertical-align:-1px"></i> Tap a source to see every job it brought in.${multi?' <span style="color:var(--ink-400)">Jobs with more than one source count under each, so the slices add up to more than the job total.</span>':''}</p>
    </div>
    ${lsDetailCard(groups,dJobs,dRev)}
  </div>
  `;
}

function controlsBar(modes,stepper){
  return `<div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 18px">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div class="segmented">${modes.map(m=>`<button class="${lsState.mode===m[0]?'on':''}" onclick="setLsMode('${m[0]}')">${m[1]}</button>`).join('')}</div>${stepper}</div>
    <span class="hint">${lsState.mode==='all'?'Lifetime totals':lsPeriodLabel()}</span>
  </div>`;
}

/* donut/pie with clickable arcs */
function lsPie(groups,metric,totJobs,totRev){
  const total=metric==='jobs'?totJobs:totRev;const r=46,C=2*Math.PI*r;let off=0;
  const arcs=groups.map(g=>{
    const val=metric==='jobs'?g.count:g.revenue;const frac=total?val/total:0;const len=frac*C;
    const dim=lsState.sel&&lsState.sel!==g.source;
    const el=`<circle cx="60" cy="60" r="${r}" fill="none" stroke="${g.color}" stroke-width="${lsState.sel===g.source?20:17}" stroke-opacity="${dim?0.28:1}" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)" style="cursor:pointer;transition:stroke-width .12s,stroke-opacity .12s" onclick="lsSelect('${lsAttr(g.source)}')"></circle>`;
    off+=len;return el;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="donut-svg">${arcs}</svg>`;
}

function lsLegendRow(g,metric,totJobs,totRev){
  const val=metric==='jobs'?g.count:g.revenue;const total=metric==='jobs'?totJobs:totRev;
  const pct=total?Math.round(val/total*100):0;
  const sel=lsState.sel===g.source;
  return `<div class="ls-leg ${sel?'sel':''}" onclick="lsSelect('${lsAttr(g.source)}')">
    <span class="leg-dot" style="background:${g.color}"></span>
    <span class="leg-name">${lsEsc(g.source)}</span>
    <span class="ls-leg-jobs mono">${g.count} job${g.count!==1?'s':''}</span>
    <span class="ls-leg-rev mono">${money(g.revenue)}</span>
    <span class="leg-pct mono">${pct}%</span>
  </div>`;
}

function lsDetailCard(groups,totJobs,totRev){
  if(!lsState.sel){
    return `<div class="card ls-detail-empty"><div style="text-align:center;color:var(--ink-500)"><i class="ti ti-arrow-left" style="font-size:26px;color:var(--ink-300);display:block;margin-bottom:10px"></i><div style="font-weight:600;color:var(--ink-700);font-size:14px">Select a lead source</div><p class="hint" style="margin-top:6px;max-width:240px">Tap any slice or row to break it down \u2014 every job, who it was for, and what it earned.</p></div></div>`;
  }
  const g=groups.find(x=>x.source===lsState.sel);
  const jobShare=totJobs?Math.round(g.count/totJobs*100):0;
  const revShare=totRev?Math.round(g.revenue/totRev*100):0;
  const sorted=[...g.jobs].sort((a,b)=>a.date>b.date?-1:1);
  return `<div class="card flush ls-detail">
    <div class="ls-detail-head" style="border-left:4px solid ${g.color}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div><div class="eyebrow" style="margin:0">Lead source</div><div style="font-size:19px;font-weight:700;letter-spacing:-.01em;margin-top:3px">${lsEsc(g.source)}</div></div>
        <button class="close-x" onclick="lsSelect('${lsAttr(g.source)}')"><i class="ti ti-x"></i></button>
      </div>
      <div class="ls-stat-row">
        <div><div class="ls-stat-v">${g.count}</div><div class="ls-stat-l">Jobs \u00b7 ${jobShare}% of all</div></div>
        <div><div class="ls-stat-v">${money(g.revenue)}</div><div class="ls-stat-l">Revenue \u00b7 ${revShare}% of all</div></div>
        <div><div class="ls-stat-v">${money(g.avg)}</div><div class="ls-stat-l">Avg job</div></div>
      </div>
    </div>
    <div class="table-wrap" style="max-height:300px;overflow-y:auto"><table class="data"><thead><tr><th>Date</th><th>Customer</th><th>Services</th><th>Total</th></tr></thead><tbody>
    ${sorted.map(j=>`<tr class="row-link" onclick="openJob(${j.id})">
      <td class="td-primary cell-mono" data-label="Date">${fmtDate(j.date)}</td>
      <td data-label="Customer"><span class="cell-strong">${j.customerName}</span></td>
      <td data-label="Services"><span class="cell-sub truncate">${j.services.map(svcName).join(', ')}</span></td>
      <td data-label="Total" class="cell-mono cell-strong">${money(j.total)}</td>
    </tr>`).join('')}
    </tbody></table></div>
  </div>`;
}
