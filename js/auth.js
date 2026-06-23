/* ============================================================
   AUTH + ROLES
   ============================================================ */
const SUPABASE_URL='https://fdavbmudszjoqbmxvump.supabase.co';
const SUPABASE_KEY='sb_publishable_PcNC6mPnQasBI5jJJaco1A_QEZv2TI4';

let supabaseBrowser=null;
let currentUser=null;
let currentProfile=null;

function isOwner(){return currentProfile&&currentProfile.role==='owner';}
function isTechnician(){return currentProfile&&currentProfile.role==='technician';}

function renderLogin(){
  document.body.innerHTML=`
  <div class="auth-screen" style="min-height:100vh;display:grid;place-items:center;background:var(--surface-2);padding:24px">
    <div class="card" style="width:min(420px,100%);margin:0">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div class="brand-badge" style="width:48px;height:48px"><img src="assets/logo.jpg" alt=""></div>
        <div><div style="font-size:18px;font-weight:800">Klean Ventz CRM</div><div class="hint">Sign in to continue</div></div>
      </div>
      <div class="field"><label>Email</label><input type="email" id="auth-email" autocomplete="email" placeholder="you@company.com"></div>
      <div class="field"><label>Password</label><input type="password" id="auth-password" autocomplete="current-password" placeholder="Password" onkeydown="if(event.key==='Enter')signIn()"></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="signIn()"><i class="ti ti-login"></i> Sign in</button>
      <p class="hint" id="auth-msg" style="margin-top:12px"></p>
    </div>
  </div>`;
}

async function loadProfile(user){
  const {data,error}=await supabaseBrowser.from('users').select('*').eq('id',user.id).single();
  if(error)throw error;
  return data;
}

async function initializeAuth(){
  if(!window.supabase){console.error('Supabase browser SDK not loaded');renderLogin();return false;}
  supabaseBrowser=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const {data:{session}}=await supabaseBrowser.auth.getSession();
  if(!session){renderLogin();return false;}
  currentUser=session.user;
  try{
    currentProfile=await loadProfile(currentUser);
  }catch(err){
    console.error('loadProfile error',err);
    await supabaseBrowser.auth.signOut();
    renderLogin();
    const msg=document.getElementById('auth-msg');
    if(msg)msg.textContent='No CRM user profile found for this login.';
    return false;
  }
  applyRoleUI();
  return true;
}

async function signIn(){
  const email=document.getElementById('auth-email')?.value.trim();
  const password=document.getElementById('auth-password')?.value;
  const msg=document.getElementById('auth-msg');
  if(!email||!password){if(msg)msg.textContent='Enter your email and password.';return;}
  const {data,error}=await supabaseBrowser.auth.signInWithPassword({email,password});
  if(error){if(msg)msg.textContent=error.message;return;}
  currentUser=data.user;
  try{
    currentProfile=await loadProfile(currentUser);
    window.location.reload();
  }catch(err){
    console.error('signIn profile error',err);
    if(msg)msg.textContent='Signed in, but no CRM user profile exists.';
  }
}

async function signOut(){
  if(supabaseBrowser)await supabaseBrowser.auth.signOut();
  window.location.reload();
}

function applyRoleUI(){
  document.body.classList.toggle('role-owner',!!isOwner());
  document.body.classList.toggle('role-technician',!!isTechnician());
  const restricted=['leadsources','financials','catalog'];
  restricted.forEach(v=>{const el=document.getElementById('nav-'+v);if(el)el.style.display=isOwner()?'':'none';});
  document.querySelectorAll('.nav-label').forEach(label=>{
    if(label.textContent.trim()==='Business')label.style.display=isOwner()?'':'none';
  });
  const loc=document.querySelector('.loc-switch');if(loc)loc.style.display=isOwner()?'':'none';
  const actions=document.getElementById('topbar-actions');
  if(actions&&!document.getElementById('auth-user-chip')){
    actions.insertAdjacentHTML('afterend',`<div id="auth-user-chip" style="display:flex;align-items:center;gap:8px;margin-left:10px"><span class="badge badge-ink">${currentProfile?.name||currentProfile?.email||''}</span><button class="btn btn-sm" onclick="signOut()"><i class="ti ti-logout"></i> Sign out</button></div>`);
  }
}

function canView(v){
  return isOwner()||!['leadsources','financials','catalog'].includes(v);
}
