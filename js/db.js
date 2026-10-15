/* ============================================================
   DATABASE — talks to Supabase directly with supabase-js
   (replaces the old Fly.io middleman server)
   ============================================================ */
/* the app uses camelCase (firstName); the database uses snake_case (first_name) */
const DB_ARRAY_COLS=['lead_sources','services','products','photos'];
function toCamelKey(s){return s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());}
function toSnakeKey(s){return s.replace(/([A-Z])/g,'_$1').toLowerCase();}
function camelize(v){
  if(Array.isArray(v))return v.map(camelize);
  if(v&&typeof v==='object'){
    const out={};
    for(const k of Object.keys(v)){
      if(DB_ARRAY_COLS.includes(k))out[toCamelKey(k)]=Array.isArray(v[k])?v[k]:(typeof v[k]==='string'?v[k].split(',').map(s=>s.trim()).filter(Boolean):[]);
      else out[toCamelKey(k)]=camelize(v[k]);
    }
    return out;
  }
  return v;
}
function decamelize(v){
  if(Array.isArray(v))return v.map(decamelize);
  if(v&&typeof v==='object'){
    const out={};
    for(const k of Object.keys(v)){
      const sk=toSnakeKey(k);
      if(DB_ARRAY_COLS.includes(sk))out[sk]=Array.isArray(v[k])?v[k]:(typeof v[k]==='string'&&v[k].trim()?v[k].split(',').map(s=>s.trim()).filter(Boolean):[]);
      else out[sk]=decamelize(v[k]);
    }
    return out;
  }
  return v;
}
function dbCheck({data,error}){if(error)throw new Error(error.message||'Database error');return data;}

/* generic table helpers — every one returns camelCase rows and throws on error */
async function dbList(table,orderBy){
  let q=supabaseBrowser.from(table).select('*');
  if(orderBy)q=q.order(orderBy);
  return camelize(dbCheck(await q)||[]);
}
async function dbInsert(table,row){
  return camelize(dbCheck(await supabaseBrowser.from(table).insert([decamelize(row)]).select().single()));
}
async function dbUpdate(table,id,fields){
  return camelize(dbCheck(await supabaseBrowser.from(table).update(decamelize(fields)).eq('id',id).select().single()));
}
async function dbDelete(table,id){
  dbCheck(await supabaseBrowser.from(table).delete().eq('id',id));
}

/* tasks: owners see everyone's, technicians only their own */
async function dbListTasks(){
  let q=supabaseBrowser.from('tasks').select('*');
  if(!isOwner()&&currentUser)q=q.eq('user_id',currentUser.id);
  return camelize(dbCheck(await q)||[]);
}

/* settings live in a single row with id=1 */
async function dbGetSettings(){
  const data=dbCheck(await supabaseBrowser.from('settings').select('*').eq('id',1).maybeSingle());
  return data?camelize(data):{};
}
async function dbSaveSettings(fields){
  return camelize(dbCheck(await supabaseBrowser.from('settings').upsert({id:1,...decamelize(fields)}).select().single()));
}

/* CRM users (owner only — enforced by the database) */
async function dbListUsers(){
  return camelize(dbCheck(await supabaseBrowser.from('users').select('id,email,role,name'))||[]);
}
async function createCrmUserAccount({email,password,role,name}){
  const {data,error}=await supabaseBrowser.functions.invoke('create-user',{body:{email,password,role,name}});
  if(error){
    let msg=error.message;
    try{const b=await error.context.json();if(b&&b.error)msg=b.error;}catch(e){}
    throw new Error(msg||'Create user failed');
  }
  return camelize(data);
}
