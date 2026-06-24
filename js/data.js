/* ============================================================
   DATA + HELPERS  (logic ported from original prototype)
   ============================================================ */
const LOGO_SRC='assets/logo.jpg';
const GOOGLE_REVIEW_URL='https://g.page/r/CdVVCz82yKK2EAE/review';
const API_BASE='https://tactile-pointless-landlady.ngrok-free.dev';
const NGROK_HEADERS={'ngrok-skip-browser-warning':'true'};

let SERVICES = [];
let PRODUCTS = [];
let LEAD_SOURCE_ROWS = [];

function jobCost(j){let t=0;(j.services||[]).forEach(id=>{const s=SERVICES.find(x=>x.id===id);if(s)t+=s.cost||0;});(j.products||[]).forEach(id=>{const p=PRODUCTS.find(x=>x.id===id);if(p)t+=p.cost||0;});return t;}
function jobCharge(j){let t=j.surchargeAmt||0;(j.services||[]).forEach(id=>{const s=SERVICES.find(x=>x.id===id);if(s)t+=s.price||0;});(j.products||[]).forEach(id=>{const p=PRODUCTS.find(x=>x.id===id);if(p)t+=p.price||0;});return t;}
function svcName(id){const s=SERVICES.find(x=>x.id===id)||PRODUCTS.find(x=>x.id===id);return s?s.name:id;}
function svcPrice(id){const s=SERVICES.find(x=>x.id===id)||PRODUCTS.find(x=>x.id===id);return s?s.price:0;}

const PAYMENT_METHODS=['Cash','Check','Venmo','Zelle','CashApp','Invoice'];
const NEXT_SERVICE=[6,12,24,36];
let LEAD_SOURCES=`Return Customer
From Us Calling Back
Google
Yanky Leiser (Appliance Repair)
Smartlist Listing
Referred by Friend/Neighbor
Neighborhood Chat
Smartlist (Ad)
Shpilman (Appliance Repair)
Rush Appliance Repair
Feder Status
Yad Shniya Status
CBN
Four Seasons Cranbury
The Club East Brunswick
Concordia
Greenbriar Whittingham
Stonebridge & the Ponds
The Ponds
Four Seasons Upper Freehold
Marlboro Greens
The Villages
Equestra
Riviera Freehold
Regency Freehold
Surrey Downs
Four Seasons Monmouth Woods
Pine View Estates
Covered Bridge
Four Seasons Manalapan
Greenbriar Marlboro
Shadow Lake
Jumping Brook
Rolling Meadows
Cedar Village
Nobility Crest
Shady Oaks
Trotters Pointe
Four Seasons Wall
Xandau Wall
Four Seasons Mirage
Heritage Point
Heritage Bay
Horizons Barnegat
Sonata Bay Club
Greenbriar 1
Lions Head South
Princeton Commons
Greenbriar 2
Lions Head North
Seaview Village
Woodlake Greens
Winding River Village
The Pavillion
Wedgewood Place
Westlake
Four Seasons South Knoll
Four Seasons Metedeconk
Greenbriar Winding Ways
Sunrise Bay
Sea Breeze Lacey
Leisure Village Original
Fairways
Enclave
Four Seasons Lakewood
Leisure Village East
Country Place
Covington Village
Mystic Shores
Cranberry Creek
Perry’s Lake
Fawn Lakes
Atlantic Hills
Escapes Ocean Breeze
Leisure Village West
Leisure Knoll
Renaissance Manchester
Cedar Glen West
Leisure Ridge
Legacy Oaks
Holiday City Berkeley
Holiday City South
Holiday City West
Carefree Village
Holiday Heights
Greenbriar Woodlands
Silver Ridge Park West
Holiday City Silverton 1
Homestead Run
Gardens @ Pleasant Plains
Four Seasons Harbor Bay
Four Seasons Sea Oaks
Greenbriar Oceanaire
Crestwood Village
Cedar Glen Lakes
Crestwood VI
Crestwood 5
Crestwood VII
Pine Ridge
Pine Ridge South
Whiting Station
Country Walk
Reserve Lake Ridge
Meadows @ Lake Ridge
Venue Woodlands
Lions Head Woods
Locust Hill
Riviera East Windsor
Village Grand at Bear Creek
Crestwood Village 2
Lakewood Weekly
Crestwood Village 3`.split('\n');

const FAKE_ADDRESSES=[
  {main:'24 Maple Drive',sub:'Manalapan, NJ 07726'},
  {main:'24 Maple Street',sub:'Marlboro, NJ 07746'},
  {main:'24 Maple Avenue',sub:'Freehold, NJ 07728'},
  {main:'24 Maple Court',sub:'Howell, NJ 07731'},
  {main:'244 Maple Boulevard',sub:'Old Bridge, NJ 08857'},
];

function dOff(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function addDays(ds,n){const d=new Date(ds);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

let customers = [];
let jobs = [];
let reminders = [];
let nextCustId=1,nextJobId=1,nextReminderId=1,nextTaskId=1,selectedPayment='';
let SJ_CUST={id:null,q:'',open:false};
let SJ_DURATION=2;
let CS_DURATION=2;
let CS_TIME='';
let tasks = [];
let currentView='dashboard';
let activeLoc='nj';
const STORE={};
const LOCATIONS={nj:{name:'New Jersey',sub:'Residential \u00b7 New Jersey'},mw:{name:'Midwest',sub:'Commercial / Healthcare \u00b7 Midwest'}};

function snapshotLoc(loc){STORE[loc]={customers,jobs,reminders,tasks,SERVICES,PRODUCTS,LEAD_SOURCES,LEAD_SOURCE_ROWS,nextCustId,nextJobId,nextReminderId,nextTaskId};}
function applyLoc(loc){const d=STORE[loc];customers=d.customers;jobs=d.jobs;reminders=d.reminders;tasks=d.tasks;SERVICES=d.SERVICES;PRODUCTS=d.PRODUCTS;LEAD_SOURCES=d.LEAD_SOURCES;LEAD_SOURCE_ROWS=d.LEAD_SOURCE_ROWS||LEAD_SOURCES.map((name,i)=>({id:'demo-'+i,name}));nextCustId=d.nextCustId;nextJobId=d.nextJobId;nextReminderId=d.nextReminderId;nextTaskId=d.nextTaskId;}
function switchLocation(loc){if(loc===activeLoc)return;snapshotLoc(activeLoc);activeLoc=loc;applyLoc(loc);updateLocUI();showView(currentView);}
function updateLocUI(){const m=LOCATIONS[activeLoc];const s=document.getElementById('brand-sub');if(s)s.textContent=m.sub;const sel=document.getElementById('loc-select');if(sel)sel.value=activeLoc;}
function rowLoc(row){return row&&row.location?row.location:'nj';}
function rowsForLoc(rows,loc){return (rows||[]).filter(row=>rowLoc(row)===loc);}
function ensureLoc(row,loc){if(row&&!row.location)row.location=loc;return row;}
function maxNextId(rows){return rows&&rows.length?Math.max(...rows.map(r=>r.id||0))+1:1;}

function buildMidwest(){
  const SVC=[
    {id:'cde',name:'Commercial dryer exhaust cleaning',price:850,cost:320},
    {id:'rooftop',name:'Rooftop exhaust fan cleaning',price:1200,cost:480},
    {id:'hcduct',name:'Healthcare duct sanitizing',price:2400,cost:1050},
    {id:'hood',name:'Kitchen hood & grease duct cleaning',price:1450,cost:600},
    {id:'coil',name:'HVAC coil cleaning',price:980,cost:380},
    {id:'inspect',name:'Compliance inspection & report',price:450,cost:120},
  ];
  const PRD=[
    {id:'mp1',name:'Commercial access panel',price:180,cost:70},
    {id:'mp2',name:'HEPA filter (commercial)',price:140,cost:55},
    {id:'mp3',name:'Grease containment tray',price:95,cost:38},
    {id:'mp4',name:'Backdraft damper',price:120,cost:48},
  ];
  const LEADS=['Property manager referral','Facilities RFP','Existing contract','Trade show'];
  const cust=[
    {id:1,isCompany:true,contactName:'Mercy General Hospital (Facilities)',contactPhone:'(312) 555-0140',firstName:'Daniel',lastName:'Brennan',phone:'(312) 555-0141',phone2:'',email:'d.brennan@mercygen.org',address:'500 W Adams St, Chicago IL 60661',leadSources:['Facilities RFP'],serviceRequested:['hcduct'],notes:'Net-30 billing, COI required',lastService:dOff(-150),nextDue:dOff(30),nextServiceMonths:6,jobs:1,snoozeUntil:''},
    {id:2,isCompany:true,contactName:'Lakeside Senior Living',contactPhone:'(317) 555-0150',firstName:'Renee',lastName:'Coleman',phone:'(317) 555-0151',phone2:'',email:'rcoleman@lakesidesl.com',address:'1820 N Meridian St, Indianapolis IN 46202',leadSources:['Property manager referral'],serviceRequested:['cde','coil'],notes:'After-hours access only',lastService:dOff(-200),nextDue:dOff(-4),nextServiceMonths:6,jobs:1,snoozeUntil:''},
    {id:3,isCompany:true,contactName:'Buckeye Property Group',contactPhone:'(614) 555-0160',firstName:'Marcus',lastName:'Hale',phone:'(614) 555-0161',phone2:'',email:'mhale@buckeyepg.com',address:'250 S High St, Columbus OH 43215',leadSources:['Existing contract'],serviceRequested:['cde','hood'],notes:'12-building portfolio',lastService:dOff(-90),nextDue:dOff(10),nextServiceMonths:6,jobs:1,snoozeUntil:''},
    {id:4,isCompany:true,contactName:'St. Francis Medical Plaza',contactPhone:'(414) 555-0170',firstName:'Olivia',lastName:'Park',phone:'(414) 555-0171',phone2:'',email:'opark@stfrancismp.org',address:'3070 N Wisconsin Ave, Milwaukee WI 53211',leadSources:['Facilities RFP'],serviceRequested:['hcduct','inspect'],notes:'Quarterly compliance contract',lastService:dOff(-120),nextDue:dOff(0),nextServiceMonths:6,jobs:1,snoozeUntil:''},
    {id:5,isCompany:true,contactName:'Great Plains Dining Group',contactPhone:'(816) 555-0180',firstName:'Victor',lastName:'Reyes',phone:'(816) 555-0181',phone2:'',email:'vreyes@gpdining.com',address:'1200 Main St, Kansas City MO 64105',leadSources:['Trade show'],serviceRequested:['hood'],notes:'8 restaurant locations',lastService:dOff(-60),nextDue:dOff(120),nextServiceMonths:6,jobs:1,snoozeUntil:''},
  ];
  const jb=[
    {id:1,customerId:1,customerName:'Daniel Brennan',date:dOff(1),time:'07:30',status:'scheduled',services:['hcduct'],products:['mp2'],surcharge:false,surchargeAmt:0,total:0,payment:'',notes:'East wing',techNotes:'',photos:[],nextServiceMonths:6},
    {id:2,customerId:3,customerName:'Marcus Hale',date:dOff(2),time:'09:00',status:'scheduled',services:['cde'],products:[],surcharge:false,surchargeAmt:0,total:0,payment:'',notes:'Buildings 4-6',techNotes:'',photos:[],nextServiceMonths:6},
    {id:3,customerId:2,customerName:'Renee Coleman',date:dOff(-10),time:'16:00',status:'completed',services:['cde','coil'],products:['mp2'],surcharge:false,surchargeAmt:0,total:1830,payment:'Invoice',notes:'',techNotes:'After-hours, 3 units',photos:[],nextServiceMonths:6},
    {id:4,customerId:4,customerName:'Olivia Park',date:dOff(-25),time:'08:00',status:'completed',services:['hcduct','inspect'],products:[],surcharge:false,surchargeAmt:0,total:2850,payment:'Invoice',notes:'',techNotes:'Compliance passed',photos:[],nextServiceMonths:6},
    {id:5,customerId:5,customerName:'Victor Reyes',date:dOff(-40),time:'13:00',status:'completed',services:['hood'],products:['mp3'],surcharge:false,surchargeAmt:0,total:1545,payment:'Check',notes:'',techNotes:'Quarterly hood service',photos:[],nextServiceMonths:6},
  ];
  const rem=[{id:1,customerId:2,dueDate:dOff(0),reason:'Overdue \u2014 schedule fall service'}];
  const mwTasks=[
    {id:1,text:'Renew the facilities contract with Mercy General',date:dOff(0),time:'09:00',customerId:1,contact:'d.brennan@mercygen.org',done:false},
    {id:2,text:'Submit compliance reports for St. Francis',date:dOff(1),time:'',customerId:4,contact:'(414) 555-0171',done:false},
    {id:3,text:'Order commercial HEPA filters \u2014 running low',date:dOff(-1),time:'',customerId:null,done:false},
  ];
  let mwNextJob=seedSourceHistory(cust,jb,SVC,PRD,6,MW_LS_WEIGHTS,'mw');
  STORE.mw={customers:cust,jobs:jb,reminders:rem,tasks:mwTasks,SERVICES:SVC,PRODUCTS:PRD,LEAD_SOURCES:LEADS,LEAD_SOURCE_ROWS:LEADS.map((name,i)=>({id:'mw-'+i,name})),nextCustId:6,nextJobId:mwNextJob,nextReminderId:2,nextTaskId:4};
}

/* ---- name / lookup helpers ---- */
function nameOf(c){return ((c.firstName||'')+' '+(c.lastName||'')).trim()||c.contactName||'Customer';}
function initials(c){return (((c.firstName||c.contactName||'?')[0]||'')+((c.lastName||'')[0]||'')).toUpperCase();}
function hasScheduledJob(id){return jobs.some(j=>j.customerId===id&&j.status==='scheduled');}
function hasReminder(id){return reminders.some(r=>r.customerId===id);}
function fmtDate(d){if(!d)return'\u2014';const p=d.split('-');const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return months[parseInt(p[1])-1]+' '+parseInt(p[2])+', '+p[0];}
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);const ap=h<12?'AM':'PM';const hh=h%12===0?12:h%12;return hh+':'+String(m).padStart(2,'0')+' '+ap;}
function money(n){return '$'+(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})}
function money2(n){return '$'+(Number(n)||0).toFixed(2)}
function statusBadge(s){return{scheduled:'badge-ink badge-dot',completed:'badge-green badge-dot'}[s]||'badge-ink'}

/* ---- CSV export ---- */
function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function downloadCsv(filename,rows){
  const csv=rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---- dashboard task computation ---- */
function getDashboardTasks(){
  const today=dOff(0);const out=[];
  reminders.forEach(r=>{if(r.dueDate>today)return;const c=customers.find(x=>x.id===r.customerId);if(!c||hasScheduledJob(c.id))return;out.push({kind:'followup',customer:c,date:r.dueDate,reason:r.reason,reminderId:r.id});});
  customers.forEach(c=>{if(!c.nextDue)return;if(addDays(c.nextDue,-7)>today)return;if(hasScheduledJob(c.id))return;if(c.snoozeUntil&&c.snoozeUntil>today)return;if(hasReminder(c.id))return;out.push({kind:'service',customer:c,date:c.nextDue,reason:'Service due'});});
  return out.sort((a,b)=>a.date>b.date?1:-1);
}
function getUpcoming(){
  const today=dOff(0),horizon=addDays(today,30);const out=[];
  reminders.forEach(r=>{if(r.dueDate<=today||r.dueDate>horizon)return;const c=customers.find(x=>x.id===r.customerId);if(!c||hasScheduledJob(c.id))return;out.push({kind:'followup',customer:c,date:r.dueDate,reason:r.reason});});
  customers.forEach(c=>{if(!c.nextDue)return;const trig=addDays(c.nextDue,-7);if(trig<=today||trig>horizon)return;if(hasScheduledJob(c.id))return;if(hasReminder(c.id))return;out.push({kind:'service',customer:c,date:c.nextDue,reason:'Service due'});});
  return out.sort((a,b)=>a.date>b.date?1:-1);
}

/* ---- demo seed (unchanged) ---- */
function seedDemo(){
  const demoPeople=[
    ['James','Whitfield','14 Sycamore Dr, Manalapan NJ 07726','(732) 555-0101'],
    ['Patricia','Nguyen','220 Hawthorne Ave, Marlboro NJ 07746','(732) 555-0102'],
    ['Marcus','Bell','7 Dogwood Ln, Freehold NJ 07728','(732) 555-0103'],
    ['Aisha','Rahman','19 Juniper Ct, Howell NJ 07731','(732) 555-0104'],
    ['Frank','DeLuca','305 Cherry St, Old Bridge NJ 08857','(732) 555-0105'],
    ['Karen','Olsen','42 Magnolia Dr, Manalapan NJ 07726','(732) 555-0106'],
    ['Devon','Pierce','88 Aspen Way, Marlboro NJ 07746','(732) 555-0107'],
    ['Sofia','Marino','11 Linden Rd, Freehold NJ 07728','(732) 555-0108'],
    ['Henry','Cho','27 Poplar Ave, Howell NJ 07731','(732) 555-0109'],
    ['Tanya','Brooks','150 Walnut St, Old Bridge NJ 08857','(732) 555-0110'],
    ['Raymond','Ford','63 Birchwood Dr, Manalapan NJ 07726','(732) 555-0111'],
    ['Elena','Vasquez','9 Maplecrest Ct, Marlboro NJ 07746','(732) 555-0112'],
    ['Greg','Sanderson','201 Elmwood Ave, Freehold NJ 07728','(732) 555-0113'],
    ['Nadia','Khan','34 Cedarbrook Rd, Howell NJ 07731','(732) 555-0114'],
  ];
  const demoLS=['Google','Referred by Friend/Neighbor','Google','Neighborhood Chat','Smartlist (Ad)','Google','Four Seasons Manalapan','Referred by Friend/Neighbor','Greenbriar Whittingham','Google','Covered Bridge','Holiday City Berkeley','Referred by Friend/Neighbor','Concordia'];
  let cid=100;const demoIds=[];
  demoPeople.forEach(function(p,i){customers.push({id:cid,isCompany:false,contactName:'',contactPhone:'',firstName:p[0],lastName:p[1],phone:p[3],phone2:'',email:(p[0][0]+p[1]).toLowerCase()+'@email.com',address:p[2],leadSources:[demoLS[i%demoLS.length]],serviceRequested:['dvc1'],notes:'',lastService:'',nextDue:'',nextServiceMonths:12,jobs:0,snoozeUntil:''});demoIds.push(cid);cid++;});
  nextCustId=Math.max(nextCustId,cid);
  const start=weekStartKey(dOff(0));
  const times=['08:00','08:00','09:30','11:00','11:00','13:00','14:30','16:00'];
  const svcBySlot=[['dvc1'],['bfc1'],['dvc2'],['bn1'],['dvc1'],['di1'],['bfc1'],['dvc1']];
  const today=dOff(0);
  let jid=200,pick=0;
  for(let dd=0;dd<7;dd++){
    const dateKey=addDays(start,dd);
    const past=dateKey<today;
    for(let n=0;n<8;n++){
      const cu=customers.find(function(x){return x.id===demoIds[pick%demoIds.length];});pick++;
      const svc=svcBySlot[n].slice();
      const prod=(n%3===0)?['p1']:[];
      let total=0,payment='',techNotes='';
      if(past){svc.forEach(function(s){const o=SERVICES.find(function(x){return x.id===s;});if(o)total+=o.price;});prod.forEach(function(s){const o=PRODUCTS.find(function(x){return x.id===s;});if(o)total+=o.price;});payment=['Cash','Check','Zelle','Venmo'][n%4];techNotes='Completed on schedule';}
      jobs.push({id:jid++,customerId:cu.id,customerName:nameOf(cu),date:dateKey,time:times[n],status:past?'completed':'scheduled',services:svc,products:prod,surcharge:false,surchargeAmt:0,total:total,payment:payment,notes:'',techNotes:techNotes,photos:[],nextServiceMonths:12});
    }
  }
  nextJobId=Math.max(nextJobId,jid);
  nextJobId=seedSourceHistory(customers,jobs,SERVICES,PRODUCTS,nextJobId,NJ_LS_WEIGHTS,'nj');
  // returning customers are a manual lead source in this business — tag repeat customers
  const _rc=_lsRng(424242);const _cnt={};
  jobs.forEach(j=>{if(j.status==='completed')_cnt[j.customerId]=(_cnt[j.customerId]||0)+1;});
  customers.forEach(c=>{if((_cnt[c.id]||0)>=2&&_rc()<0.6&&!c.leadSources.includes('Return Customer'))c.leadSources.push('Return Customer');});
}

/* ---- historical completed jobs across the past 12 months, attributed
   to each customer's lead source. Deterministic so numbers are stable. ---- */
const NJ_LS_WEIGHTS=[['Google',24],['Referred by Friend/Neighbor',16],['Neighborhood Chat',9],['Smartlist (Ad)',8],['Greenbriar Whittingham',6],['Four Seasons Manalapan',6],['Covered Bridge',5],['Holiday City Berkeley',5],['Leisure Village East',4],['Concordia',4],['Yanky Leiser (Appliance Repair)',4],['Rush Appliance Repair',3],['CBN',3],['From Us Calling Back',3],['Greenbriar Marlboro',3],['Lions Head North',2],['Crestwood Village',2],['Shpilman (Appliance Repair)',2],['Smartlist Listing',2]];
const MW_LS_WEIGHTS=[['Existing contract',34],['Property manager referral',28],['Facilities RFP',26],['Trade show',12]];
function _lsRng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function _pickW(rng,entries){const tot=entries.reduce((s,e)=>s+e[1],0);let r=rng()*tot;for(const e of entries){r-=e[1];if(r<=0)return e[0];}return entries[0][0];}
function seedSourceHistory(custArr,jobsArr,svcArr,prdArr,startId,weights,tag){
  const rng=_lsRng(tag==='mw'?990013:550021);
  let id=startId;
  let cid=Math.max(...custArr.map(c=>c.id))+1;
  const FN=['Miriam','Aaron','Esther','David','Rachel','Samuel','Leah','Joseph','Hannah','Benjamin','Sarah','Daniel','Ruth','Jacob','Naomi','Ezra','Shira','Eli','Devorah','Yosef','Malka','Chaim','Tova','Mordechai','Rivka','Shmuel','Bracha','Ari','Faiga','Zev'];
  const LN=['Friedman','Katz','Goldberg','Schwartz','Rosenberg','Klein','Weiss','Greenberg','Stern','Berg','Adler','Hoffman','Roth','Diamond','Fischer','Wexler','Brand','Lowy','Marcus','Perl'];
  const ST=['Madison Ave','Oak Knoll Rd','Forest Dr','Birchwood Ln','Sunset Blvd','Park Pl','Cedar Ct','Lake Dr','Hillside Ave','Maple Way','Spring St','Willow Bend'];
  // build per-source customer pools: reuse existing single-source customers, top up with new ones
  const bySource={};
  custArr.forEach(c=>{const s=c.leadSources&&c.leadSources[0];if(s){(bySource[s]=bySource[s]||[]).push(c);}});
  weights.forEach(([src,w])=>{
    const target=tag==='mw'?(bySource[src]?bySource[src].length:1):Math.max(1,Math.round(w/4));
    bySource[src]=bySource[src]||[];
    while(bySource[src].length<target){
      const fn=FN[Math.floor(rng()*FN.length)],ln=LN[Math.floor(rng()*LN.length)];
      const c={id:cid++,isCompany:false,contactName:'',contactPhone:'',firstName:fn,lastName:ln,phone:'(732) 555-'+String(1000+Math.floor(rng()*8999)).slice(0,4),phone2:'',email:(fn[0]+ln).toLowerCase()+'@email.com',address:(10+Math.floor(rng()*240))+' '+ST[Math.floor(rng()*ST.length)]+', NJ',leadSources:[src],serviceRequested:['dvc1'],notes:'',lastService:'',nextDue:'',nextServiceMonths:tag==='mw'?6:12,jobs:0,snoozeUntil:''};
      custArr.push(c);bySource[src].push(c);
    }
  });
  const perBase=tag==='mw'?2:6, perVar=tag==='mw'?3:6;
  for(let mb=1;mb<=12;mb++){
    const base=new Date();base.setDate(1);base.setMonth(base.getMonth()-mb);
    const y=base.getFullYear(),m=base.getMonth();const dim=new Date(y,m+1,0).getDate();
    const seas=[0.95,0.85,1.05,1.1,0.95,0.8,0.75,0.85,1.2,1.35,1.3,1.0][m];
    const n=Math.max(1,Math.round((perBase+Math.floor(rng()*perVar))*(tag==='mw'?1:seas)));
    for(let k=0;k<n;k++){
      const day=1+Math.floor(rng()*dim);
      const dateKey=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const ls=_pickW(rng,weights);
      const pool=bySource[ls];
      const cu=pool[Math.floor(rng()*pool.length)];
      const svc=[svcArr[Math.floor(rng()*svcArr.length)].id];
      const prod=rng()<0.3?[prdArr[Math.floor(rng()*prdArr.length)].id]:[];
      let total=0;svc.forEach(s=>{const o=svcArr.find(x=>x.id===s);if(o)total+=o.price;});prod.forEach(s=>{const o=prdArr.find(x=>x.id===s);if(o)total+=o.price;});
      const pay=['Cash','Check','Zelle','Venmo','CashApp'][Math.floor(rng()*5)];
      const hh=8+Math.floor(rng()*9);
      cu.jobs=(cu.jobs||0)+1;
      jobsArr.push({id:id++,customerId:cu.id,customerName:nameOf(cu),date:dateKey,time:String(hh).padStart(2,'0')+':00',status:'completed',services:svc,products:prod,surcharge:false,surchargeAmt:0,total:total,payment:pay,notes:'',techNotes:'Completed on schedule',photos:[],nextServiceMonths:tag==='mw'?6:12});
    }
  }
  if(tag!=='mw')nextCustId=Math.max(nextCustId,cid);
  return id;
}
async function loadData(baseUrl = API_BASE + '/api') {
  try {
    const endpoints = [
      fetch(baseUrl + '/customers',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/jobs',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/services',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/products',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/tasks',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/reminders',{headers:NGROK_HEADERS}),
      fetch(baseUrl + '/lead-sources',{headers:NGROK_HEADERS}),
    ];
    const [custRes, jobsRes, svcRes, prdRes, tasksRes, remRes, leadRes] = await Promise.all(endpoints);
    if (!custRes.ok || !jobsRes.ok || !svcRes.ok || !prdRes.ok || !tasksRes.ok || !remRes.ok || !leadRes.ok) {
      throw new Error('One or more API requests failed');
    }
    const [custJson, jobsJson, svcJson, prdJson, tasksJson, remJson, leadJson] = await Promise.all([
      custRes.json(), jobsRes.json(), svcRes.json(), prdRes.json(), tasksRes.json(), remRes.json(), leadRes.json()
    ]);

    const allCustomers = Array.isArray(custJson) ? custJson : (custJson.customers || []);
    const allJobs = Array.isArray(jobsJson) ? jobsJson : (jobsJson.jobs || []);
    const allServices = Array.isArray(svcJson) ? svcJson : (svcJson.services || []);
    const allProducts = Array.isArray(prdJson) ? prdJson : (prdJson.products || []);
    const allTasks = Array.isArray(tasksJson) ? tasksJson : (tasksJson.tasks || []);
    const allReminders = Array.isArray(remJson) ? remJson : (remJson.reminders || []);
    LEAD_SOURCE_ROWS = Array.isArray(leadJson) ? leadJson : (leadJson.leadSources || []);
    LEAD_SOURCES = LEAD_SOURCE_ROWS.map(s => s.name).filter(Boolean);

    Object.keys(LOCATIONS).forEach(loc=>{
      const locCustomers=rowsForLoc(allCustomers,loc).map(r=>ensureLoc(r,loc));
      const locJobs=rowsForLoc(allJobs,loc).map(r=>ensureLoc(r,loc));
      const locReminders=rowsForLoc(allReminders,loc).map(r=>ensureLoc(r,loc));
      const locTasks=rowsForLoc(allTasks,loc).map(r=>ensureLoc(r,loc));
      const locServices=rowsForLoc(allServices,loc).map(r=>ensureLoc(r,loc));
      const locProducts=rowsForLoc(allProducts,loc).map(r=>ensureLoc(r,loc));
      STORE[loc]={
        customers:locCustomers,
        jobs:locJobs,
        reminders:locReminders,
        tasks:locTasks,
        SERVICES:locServices,
        PRODUCTS:locProducts,
        LEAD_SOURCES,
        LEAD_SOURCE_ROWS,
        nextCustId:maxNextId(locCustomers),
        nextJobId:maxNextId(locJobs),
        nextReminderId:maxNextId(locReminders),
        nextTaskId:maxNextId(locTasks)
      };
    });
    applyLoc(activeLoc);

    const banner=document.getElementById('conn-banner');
    if(banner)banner.classList.remove('show');

    // re-render UI now that data is populated
    try { updateLocUI(); } catch(e) { /* ignore if called before DOM ready */ }
    try { showView(currentView || 'dashboard'); } catch(e) { /* ignore if called before DOM ready */ }
  } catch (err) {
    console.error('loadData error', err);
    if (typeof toast === 'function') toast('Error loading data from server');
    const banner=document.getElementById('conn-banner');
    if(banner)banner.classList.add('show');
  }
}
async function retryLoadData(){
  const btn=document.querySelector('#conn-banner button');
  if(btn){btn.disabled=true;btn.textContent='Retrying…';}
  await loadData();
  if(btn){btn.disabled=false;btn.textContent='Retry';}
}
