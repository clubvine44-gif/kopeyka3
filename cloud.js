/* cloud.js — Supabase for Kopeyka 3. Isolated per user. */
(function(){
'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co';
const KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY_BASE='kopeyka3_state_v1';
function localKey(){return currentUser&&currentUser.id?(LOCAL_KEY_BASE+'_'+currentUser.id):LOCAL_KEY_BASE;}

let sb=null, ready=false, saving=false, lastSent='', currentUser=null;

function loadSDK(){
  return new Promise((ok,bad)=>{
    if(window.supabase) return ok();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=ok; s.onerror=()=>bad(new Error('SDK'));
    document.head.appendChild(s);
  });
}
function client(){
  if(!sb && window.supabase){
    sb=window.supabase.createClient(URL,KEY,{
      auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}
    });
  }
  return sb;
}
function toast(msg){ if(typeof window.toast==='function') window.toast(msg); else console.log('[cloud]',msg); }
function score(s){
  if(!s||typeof s!=='object') return 0;
  let n=0;
  ['income','expenses','reserves','debts','reserveOps'].forEach(k=>{ if(Array.isArray(s[k])) n+=s[k].length; });
  if(s.shiftsOverride) n+=Object.keys(s.shiftsOverride).length;
  return n;
}
function normalize(raw){
  if(!raw||typeof raw!=='object') raw={};
  const base=typeof window.defaultState==='function'?window.defaultState():{version:3,settings:{},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],shiftsOverride:{}};
  const out=Object.assign({},base,raw);
  out.settings=Object.assign({},base.settings||{},raw.settings||{});
  if(base.settings&&base.settings.shiftTypes){
    out.settings.shiftTypes=Object.assign({},base.settings.shiftTypes,(raw.settings&&raw.settings.shiftTypes)||{});
  }
  if(!Array.isArray(out.settings.cyclePattern)||!out.settings.cyclePattern.length)
    out.settings.cyclePattern=(base.settings&&base.settings.cyclePattern)||['day','day','night','night','off','off'];
  if(!out.shiftsOverride||typeof out.shiftsOverride!=='object') out.shiftsOverride={};
  const okShift={day:1,night:1,off:1};
  const so={};
  Object.keys(out.shiftsOverride).forEach(k=>{ const v=out.shiftsOverride[k]; if(typeof v==='string'&&okShift[v]) so[k]=v; });
  out.shiftsOverride=so;
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(k=>{ if(!Array.isArray(out[k])) out[k]=[]; });
  const sn=v=>{ const n=Number(v); return (!isFinite(n)||n!==n)?0:Math.abs(n)>5e6?0:Math.round(n); };
  (out.reserves||[]).forEach(r=>{ r.saved=sn(r.saved); r.target=sn(r.target); });
  (out.income||[]).forEach(x=>{ x.amount=sn(x.amount); });
  (out.expenses||[]).forEach(x=>{ x.amount=sn(x.amount); });
  (out.debts||[]).forEach(d=>{ d.total=sn(d.total); d.paid=sn(d.paid); });
  out.settings.openingBalance=sn(out.settings.openingBalance);
  return out;
}
function writeLocal(n){
  try{ localStorage.setItem(localKey(), JSON.stringify(n)); }catch(_){}
}
function readLocal(){
  try{ const b=localStorage.getItem(localKey()); return b?JSON.parse(b):null; }catch(_){ return null; }
}
async function loadFromCloud(){
  if(!currentUser) return null;
  try{
    const c=client();
    let q=await c.rpc('load_user_finance_state');
    let state=null;
    if(q.error){
      const t=await c.from('user_finance_state').select('state').eq('user_id',currentUser.id).maybeSingle();
      if(t.data&&t.data.state) state=t.data.state;
    } else if(q.data) state=q.data;
    if(state){
      const n=normalize(state);
      writeLocal(n);
      if(window.setAppState) window.setAppState(n);
      return n;
    }
  }catch(e){ console.error('cloud load',e); }
  return null;
}
async function saveToCloud(force){
  if(!currentUser||!ready) return false;
  if(saving&&!force) return false;
  saving=true;
  try{
    const st=window.STATE||readLocal()||{};
    const clean=normalize(st);
    clean.app='kopeyka3';
    const json=JSON.stringify(clean);
    if(!force&&json===lastSent){ saving=false; return true; }
    const c=client();
    let r=await c.rpc('save_user_finance_state',{p_state:clean,p_version:12});
    if(r.error){
      r=await c.from('user_finance_state').upsert({
        user_id:currentUser.id, state:clean, version:12, updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(r.error) throw new Error(r.error.message||r.error.code||'save failed');
    }
    lastSent=json;
    writeLocal(clean);
    return true;
  }catch(e){
    console.error('cloud save',e);
    return false;
  }finally{ saving=false; }
}
let saveTimer=null;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>saveToCloud(false),1200);
}
function setStatus(on,msg){
  const btn=document.getElementById('btnCloud');
  if(btn){ btn.classList.toggle('on',!!on); btn.title=msg||(on?'Облако':'Локально'); }
}
function updateAccountUI(){
  setStatus(!!currentUser, currentUser?(currentUser.email||'Облако'):'Локально');
}
function injectAuthCSS(){
  if(document.getElementById('cloudAuthCSS')) return;
  const s=document.createElement('style'); s.id='cloudAuthCSS';
  s.textContent=
    '.cloud-auth{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}'+
    '.cloud-auth-card{position:relative;width:100%;max-width:360px;background:#181A21;border:1px solid #2A2D38;border-radius:16px;padding:20px}'+
    '.cloud-auth-card h2{font-size:18px;margin:0 0 8px}'+
    '.cloud-auth-card .sm{font-size:13px;color:#8B90A0}'+
    '.cloud-auth-card .field{margin-bottom:10px}'+
    '.cloud-auth-card input{width:100%;padding:12px 14px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;color:#F2F3F7;box-sizing:border-box}'+
    '.cloud-auth-card .btn{flex:1;padding:12px;border-radius:12px;font-weight:600;border:1px solid #2A2D38;background:#1E2129;color:#F2F3F7;cursor:pointer}'+
    '.cloud-auth-card .btn.bp{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}'+
    '.cloud-auth-msg{font-size:13px;color:#F87171;min-height:18px;margin-bottom:8px}';
  document.head.appendChild(s);
}
function showAuth(){
  injectAuthCSS();
  let root=document.getElementById('cloudAuth');
  if(root) root.remove();
  root=document.createElement('div');
  root.id='cloudAuth'; root.className='cloud-auth';
  root.innerHTML=
    '<div class="cloud-auth-card">'+
    '<h2>Облако</h2>'+
    '<p class="sm">У каждого аккаунта свои данные — они не пересекаются.</p>'+
    '<div class="cloud-auth-msg" id="cloudAuthMsg"></div>'+
    '<div class="field"><input type="email" id="cloudEmailIn" placeholder="Email" autocomplete="username"></div>'+
    '<div class="field"><input type="password" id="cloudPassIn" placeholder="Пароль" autocomplete="current-password"></div>'+
    '<div style="display:flex;gap:8px">'+
    '<button type="button" class="btn" id="cloudLoginBtn">Войти</button>'+
    '<button type="button" class="btn bp" id="cloudSignBtn">Регистрация</button>'+
    '</div>'+
    (currentUser?('<button type="button" class="btn" id="cloudLogout" style="width:100%;margin-top:10px">Выйти</button>'):'')+
    '<button type="button" class="btn" id="cloudAuthClose" style="width:100%;margin-top:8px">Закрыть</button>'+
    '</div>';
  document.body.appendChild(root);
  root.onclick=e=>{ if(e.target===root) root.remove(); };
  document.getElementById('cloudAuthClose').onclick=()=>root.remove();
  async function doAuth(signup){
    const email=(document.getElementById('cloudEmailIn').value||'').trim();
    const password=document.getElementById('cloudPassIn').value||'';
    const msg=document.getElementById('cloudAuthMsg');
    if(!email||!password){ msg.textContent='Введи email и пароль'; return; }
    msg.textContent='...';
    try{
      const c=client();
      const r=signup?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
      if(r.error) throw r.error;
      msg.textContent=signup?'Проверь почту или войди':'Ок';
      if(!signup) root.remove();
    }catch(e){
      let m=e.message||String(e);
      if(/invalid login/i.test(m)) m='Неверный email или пароль';
      else if(/user already/i.test(m)) m='Такой email уже есть — войди';
      msg.textContent=m;
    }
  }
  document.getElementById('cloudLoginBtn').onclick=()=>doAuth(false);
  document.getElementById('cloudSignBtn').onclick=()=>doAuth(true);
  const lo=document.getElementById('cloudLogout');
  if(lo) lo.onclick=async()=>{
    try{ await client().auth.signOut(); }catch(_){}
    currentUser=null; ready=false; lastSent='';
    try{
      const empty=typeof window.defaultState==='function'?window.defaultState():{};
      localStorage.setItem(LOCAL_KEY_BASE, JSON.stringify(empty));
      if(window.setAppState) window.setAppState(empty);
    }catch(_){}
    updateAccountUI(); setStatus(false,'Вышли');
    root.remove();
  };
}
async function onSession(session){
  if(!session||!session.user){
    currentUser=null; ready=false; updateAccountUI(); return;
  }
  currentUser=session.user;
  ready=true;
  updateAccountUI();
  const cloud=await loadFromCloud();
  if(!cloud){
    const local=readLocal();
    if(local&&score(local)>0){
      if(window.setAppState) window.setAppState(normalize(local));
      await saveToCloud(true);
    }
  }
}
async function bootCloud(){
  try{
    await loadSDK();
    const c=client();
    const {data}=await c.auth.getSession();
    await onSession(data&&data.session);
    c.auth.onAuthStateChange(async(ev,session)=>{
      if(ev==='SIGNED_IN'||ev==='TOKEN_REFRESHED'||ev==='INITIAL_SESSION') await onSession(session);
      if(ev==='SIGNED_OUT'){ currentUser=null; ready=false; updateAccountUI(); }
    });
  }catch(e){ console.error('cloud boot',e); setStatus(false,'Офлайн'); }
  const btn=document.getElementById('btnCloud');
  if(btn) btn.onclick=()=>showAuth();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootCloud);
else bootCloud();
window.kopeykaCloud={ save:()=>saveToCloud(true), user:()=>currentUser, scheduleSave };
})();
