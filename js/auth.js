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
  const inp='width:100%;padding:10px 12px;border:1px solid #DAD5CB;border-radius:10px;font-size:14px;color:#1A1815;font-family:inherit;outline:none;box-sizing:border-box;background:#fff';
  const lbl='display:block;font-size:12px;font-weight:600;color:#46433D;margin-bottom:6px';
  document.body.innerHTML=`
  <div style="min-height:100vh;display:grid;place-items:center;background:#F4F2EC;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
    <div style="width:min(380px,100%);display:flex;flex-direction:column;align-items:center;gap:20px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
        <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;box-shadow:0 12px 40px -8px rgba(24,22,18,.22),0 2px 8px rgba(24,22,18,.10);border:3px solid #fff;flex-shrink:0">
          <img src="assets/logo.jpg" alt="Klean Ventz" style="width:100%;height:100%;object-fit:cover;display:block">
        </div>
        <div style="font-size:21px;font-weight:800;letter-spacing:-.025em;color:#1A1815">Klean Ventz CRM</div>
      </div>
      <div style="width:100%;background:#fff;border:1px solid #E7E3DB;border-radius:16px;padding:22px;box-shadow:0 4px 16px -4px rgba(24,22,18,.10),0 1px 3px rgba(24,22,18,.06)">
        <div style="margin-bottom:14px"><label style="${lbl}">Email</label><input type="email" id="auth-email" autocomplete="email" placeholder="you@company.com" style="${inp}"></div>
        <div style="margin-bottom:22px"><label style="${lbl}">Password</label><input type="password" id="auth-password" autocomplete="current-password" placeholder="Password" onkeydown="if(event.key==='Enter')signIn()" style="${inp}"></div>
        <button onclick="signIn()" style="width:100%;padding:10px 14px;background:#181612;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Sign in</button>
        <p id="auth-msg" style="font-size:12px;color:#A6382F;margin-top:10px;text-align:center;min-height:16px"></p>
      </div>
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
  const restricted=['leadsources','financials','catalog','workers'];
  restricted.forEach(v=>{const el=document.getElementById('nav-'+v);if(el)el.style.display=isOwner()?'':'none';});
  const mypayEl=document.getElementById('nav-mypay');if(mypayEl)mypayEl.style.display=isTechnician()?'':'none';
  document.querySelectorAll('.nav-label').forEach(label=>{
    if(label.textContent.trim()==='Business')label.style.display=isOwner()?'':'none';
  });
  const loc=document.querySelector('.loc-switch');if(loc)loc.style.display=isOwner()?'':'none';
  const sub=document.getElementById('brand-sub');if(sub)sub.style.display=isOwner()?'':'none';
  const actions=document.getElementById('topbar-actions');
  if(actions&&!document.getElementById('auth-user-chip')){
    actions.insertAdjacentHTML('afterend',`<div id="auth-user-chip" style="display:flex;align-items:center;gap:8px;margin-left:10px"><span class="badge badge-ink">${currentProfile?.name||currentProfile?.email||''}</span><button class="btn btn-sm" onclick="signOut()"><i class="ti ti-logout"></i> Sign out</button></div>`);
  }
}

function canView(v){
  if(v==='mypay')return isTechnician();
  return isOwner()||!['leadsources','financials','catalog','workers'].includes(v);
}
