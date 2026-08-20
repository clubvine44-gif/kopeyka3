/* cloud.js — Supabase for Kopeyka 3. Same account as kopeyka1/2. */
(function(){
'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co';
const KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_KEY='kopeyka3_state_v1';

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
  // force shifts to strings day/night/off only
  const okShift={day:1,night:1,off:1};
  const so={};
  Object.keys(out.shiftsOverride).forEach(k=>{ const v=out.shiftsOverride[k]; if(typeof v==='string'&&okShift[v]) so[k]=v; });
  out.shiftsOverride=so;
  ['income','expenses','reserves','reserveOps','debts'].forEach(k=>{
    if(!Array.isArray(out[k])) out[k]=Array.isArray(base[k])?base[k].slice():[];
  });
  function sn(v){ var n=Number(v); if(!isFinite(n)||n!==n) return 0; n=Math.round(n); if(Math.abs(n)>5000000) return 0; return n; }
  out.settings.openingBalance=sn(out.settings.openingBalance);
  out.income=(out.income||[]).filter(function(i){return i&&i.id;}).map(function(i){ return Object.assign({},i,{amount:sn(i.amount)}); });
  out.expenses=(out.expenses||[]).filter(function(e){return e&&e.id;}).map(function(e){ return Object.assign({},e,{amount:sn(e.amount)}); });
  out.reserveOps=(out.reserveOps||[]).filter(function(o){return o&&o.id;}).map(function(o){ return Object.assign({},o,{amount:sn(o.amount)}); });
  out.debts=(out.debts||[]).filter(function(d){return d&&d.id;}).map(function(d){ return Object.assign({},d,{total:sn(d.total),paid:sn(d.paid)}); });
  (out.reserves||[]).forEach(r=>{ r.saved=sn(r.saved); r.target=sn(r.target); r.fixedAmount=sn(r.fixedAmount); r.percent=sn(r.percent); if(r.active==null)r.active=true; });
  if(!out.updatedAt) out.updatedAt=new Date().toISOString();
  return out;
}
function mergeStates(a,b){
  const A=normalize(a||{}), B=normalize(b||{});
  const pick=score(A)>=score(B)?A:B;
  const other=pick===A?B:A;
  const out=JSON.parse(JSON.stringify(pick));
  out.settings=Object.assign({},other.settings||{},pick.settings||{});
  ['income','expenses','reserves','reserveOps','debts'].forEach(k=>{
    const m=new Map();
    (other[k]||[]).forEach(x=>{ if(x&&x.id) m.set(x.id,x); });
    (pick[k]||[]).forEach(x=>{ if(x&&x.id) m.set(x.id,x); });
    out[k]=Array.from(m.values());
  });
  out.shiftsOverride=Object.assign({},other.shiftsOverride||{},pick.shiftsOverride||{});
  out.updatedAt=new Date().toISOString();
  return normalize(out);
}
function applyState(raw, source){
  const n=normalize(raw);
  if(typeof window.setAppState==='function') window.setAppState(n);
  else {
    window.STATE=n;
    try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(n)); }catch(_){}
    if(typeof window.render==='function') window.render();
  }
  lastSent=JSON.stringify(n);
  if(source==='cloud') toast('Данные из облака');
  else if(source==='merge') toast('Облако и локальные данные объединены');
}
function readLocal(){
  try{ const b=localStorage.getItem(LOCAL_KEY); return b?JSON.parse(b):null; }catch(_){ return null; }
}
async function loadFromCloud(){
  const c=client(); if(!c||!currentUser) return false;
  try{
    let q=await c.rpc('load_user_finance_state');
    if(q.error){
      const t=await c.from('user_finance_state').select('state').eq('user_id',currentUser.id).maybeSingle();
      if(t.error) throw t.error;
      q={ data: t.data?[{state:t.data.state}]:[] };
    }
    const row=Array.isArray(q.data)?q.data[0]:q.data;
    const local=readLocal()||(window.STATE?window.STATE:null);
    if(row&&row.state&&typeof row.state==='object'){
      const cloudState=normalize(row.state);
      function totals(s){
        let inc=0,exp=0,dep=0;
        (s.income||[]).forEach(i=>inc+=Number(i.amount)||0);
        (s.expenses||[]).forEach(e=>exp+=Number(e.amount)||0);
        (s.reserveOps||[]).forEach(o=>{ if(o.type==='deposit') dep+=Number(o.amount)||0; });
        (s.reserves||[]).forEach(r=>dep+=Number(r.saved)||0);
        const open=Number(s.settings&&s.settings.openingBalance)||0;
        return {inc,exp,dep,open, sum: Math.abs(open)+inc+exp+dep};
      }
      const ct=totals(cloudState);
      const lt=totals(normalize(local||{}));
      const cloudCash = ct.open + ct.inc - ct.exp - ct.dep;
      const localClean = (lt.inc===0 && lt.exp===0 && lt.dep===0 && Math.abs(lt.open)<1);
      if((ct.sum > 2000000 && lt.sum < 500000) || (cloudCash < -50 && ct.inc===0 && ct.exp===0 && localClean)){
        console.warn('cloud rejected bad state', ct, cloudCash);
        toast('В облаке битые данные — сброшены');
        ready=true;
        setStatus(true,'Локальные данные');
        if(typeof window.setAppState==='function' && typeof window.defaultState==='function'){
          window.setAppState(window.defaultState());
        }
        saveToCloud(true).catch(()=>{});
        return true;
      }
      const merged=mergeStates(local, cloudState);
      applyState(merged, score(local)>0&&score(cloudState)>0?'merge':'cloud');
      ready=true;
      saveToCloud(true).catch(()=>{});
      setStatus(true,'Синхронизировано');
      return true;
    }
    ready=true;
    if(local&&score(local)>0){
      const ok=await saveToCloud(true);
      setStatus(ok, ok?'Синхронизировано':'Локально');
      if(ok) toast('Локальные данные в облако');
    } else setStatus(true,'Облако подключено');
    return true;
  }catch(e){
    console.error('cloud load',e);
    ready=false;
    setStatus(false,'Ошибка: '+(e.message||e.code||'сеть'));
    toast('Облако недоступно — данные на устройстве');
    return false;
  }
}
async function saveToCloud(force){
  if(!currentUser){ toast('Сначала войди в облако'); return false; }
  if(saving) return false;
  const st=window.STATE; if(!st) return false;
  saving=true;
  try{
    const clean=JSON.parse(JSON.stringify(normalize(st)));
    clean.updatedAt=new Date().toISOString();
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
    try{ localStorage.setItem(LOCAL_KEY,json); }catch(_){}
    ready=true;
    setStatus(true,'Синхронизировано');
    return true;
  }catch(e){
    console.error('cloud save',e);
    setStatus(false,'Не сохранилось: '+(e.message||'ошибка'));
    return false;
  }finally{ saving=false; }
}
let saveTimer=null;
function scheduleSave(){
  if(!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>saveToCloud(false),1200);
}
function setStatus(ok,text){
  const el=document.getElementById('cloudStatus');
  if(el){ el.textContent=text||''; el.className='cloud-st'+(ok?' ok':''); }
}
function ensureAccountBtn(){
  if(document.getElementById('cloudAccount')) return;
  if(!document.getElementById('cloudCss')){
    const st=document.createElement('style'); st.id='cloudCss';
    st.textContent=
      '.cloud-wrap{position:relative;display:inline-flex;align-items:center}'+
      '.cloud-menu{position:absolute;right:0;top:46px;min-width:220px;background:#1E2129;border:1px solid #2A2D38;border-radius:14px;padding:12px;z-index:90;box-shadow:0 10px 30px rgba(0,0,0,.45)}'+
      '.cloud-menu .cloud-email{font-weight:600;margin-bottom:4px;font-size:13px}'+
      '.cloud-menu .cloud-st{font-size:12px;color:#8B90A0;margin-bottom:10px}'+
      '.cloud-menu .btn{display:block;width:100%;padding:10px;border-radius:10px;margin-bottom:6px;font-weight:600;text-align:center;border:1px solid #2A2D38;background:#181A21;color:#F2F3F7;cursor:pointer}'+
      '.cloud-menu .btn.bp{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}'+
      '.cloud-auth{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}'+
      '.cloud-auth-card{position:relative;width:100%;max-width:360px;background:#181A21;border:1px solid #2A2D38;border-radius:16px;padding:20px}'+
      '.cloud-auth-card h2{font-size:18px;margin:0 0 8px}'+
      '.cloud-auth-card .sm{font-size:13px;color:#8B90A0}'+
      '.cloud-auth-card .field{margin-bottom:10px}'+
      '.cloud-auth-card input{width:100%;padding:12px 14px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;color:#F2F3F7;box-sizing:border-box}'+
      '.cloud-auth-card .btn{flex:1;padding:12px;border-radius:12px;font-weight:600;border:1px solid #2A2D38;background:#1E2129;color:#F2F3F7;cursor:pointer}'+
      '.cloud-auth-card .btn.bp{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}'+
      '.cloud-auth-msg{font-size:13px;color:#F87171;min-height:18px;margin-bottom:8px}'+
      '.icon-btn.on{border-color:#E5A75E;color:#E5A75E}';
    document.head.appendChild(st);
  }
  const existingBtn=document.getElementById('btnCloud')||document.getElementById('cloudBtn');
  const top=document.querySelector('.top-actions')||document.querySelector('.topbar')||document.body;
  const wrap=document.createElement('div');
  wrap.id='cloudAccount'; wrap.className='cloud-wrap';
  let btn;
  if(existingBtn){
    btn=existingBtn;
    btn.id='cloudBtn';
    if(!btn.querySelector('#cloudAvatar') && !document.getElementById('cloudAvatar')){
      btn.innerHTML='<span id="cloudAvatar">☁</span>';
    }
    existingBtn.parentNode.insertBefore(wrap, existingBtn);
    wrap.appendChild(existingBtn);
  } else {
    wrap.innerHTML='<button type="button" class="icon-btn cloud-btn" id="cloudBtn" title="Облако"><span id="cloudAvatar">☁</span></button>';
    top.appendChild(wrap);
    btn=document.getElementById('cloudBtn');
  }
  const menu=document.createElement('div');
  menu.className='cloud-menu'; menu.id='cloudMenu'; menu.hidden=true;
  menu.innerHTML=
    '<div class="cloud-email" id="cloudEmail">Не вошли</div>'+
    '<div class="cloud-st" id="cloudStatus">Нажми «Войти»</div>'+
    '<button type="button" class="btn bp" id="cloudLogin">Войти в облако</button>'+
    '<button type="button" class="btn" id="cloudSync">Синхронизировать</button>'+
    '<button type="button" class="btn" id="cloudLogout" style="display:none">Выйти</button>';
  wrap.appendChild(menu);
  btn.onclick=e=>{ e.stopPropagation(); menu.hidden=!menu.hidden; };
  document.addEventListener('click',()=>{ menu.hidden=true; });
  menu.onclick=e=>e.stopPropagation();
  document.getElementById('cloudSync').onclick=async()=>{
    if(!currentUser){ showAuth(); return; }
    const ok=await saveToCloud(true);
    toast(ok?'Синхронизация завершена':'Не удалось');
  };
  document.getElementById('cloudLogin').onclick=()=>showAuth();
  document.getElementById('cloudLogout').onclick=async()=>{
    try{ await client().auth.signOut(); }catch(_){}
    currentUser=null; ready=false; lastSent='';
    updateAccountUI(); setStatus(false,'Вышли');
  };
}
function updateAccountUI(){
  const email=currentUser&&currentUser.email;
  const av=document.getElementById('cloudAvatar');
  const em=document.getElementById('cloudEmail');
  const btn=document.getElementById('cloudBtn')||document.getElementById('btnCloud');
  if(av) av.textContent=email?email[0].toUpperCase():'☁';
  if(em) em.textContent=email||'Не вошли';
  if(btn) btn.classList.toggle('on', !!email);
  const login=document.getElementById('cloudLogin');
  const logout=document.getElementById('cloudLogout');
  if(login) login.style.display=email?'none':'block';
  if(logout) logout.style.display=email?'block':'none';
  if(email) setStatus(true,'В сети'); else setStatus(false,'Офлайн — нажми Войти');
}
function showAuth(){
  if(document.getElementById('cloudAuth')) return;
  const root=document.createElement('div');
  root.id='cloudAuth'; root.className='cloud-auth';
  root.innerHTML=
    '<div class="cloud-auth-card">'+
    '<button type="button" id="cloudAuthClose" style="position:absolute;right:14px;top:12px;background:none;border:0;font-size:22px;color:#8B90A0;cursor:pointer">×</button>'+
    '<h2 style="margin:0 0 8px">Облако Копейки</h2>'+
    '<p class="sm" style="margin-bottom:12px">Тот же аккаунт, что в прошлых версиях. Данные подтянутся после входа.</p>'+
    '<div class="cloud-auth-msg" id="cloudAuthMsg"></div>'+
    '<div class="field"><input type="email" id="cloudEmailIn" placeholder="Email" autocomplete="username"></div>'+
    '<div class="field"><input type="password" id="cloudPassIn" placeholder="Пароль" autocomplete="current-password"></div>'+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button type="button" class="btn" id="cloudSignup">Создать</button>'+
    '<button type="button" class="btn bp" id="cloudSignin">Войти</button>'+
    '</div></div>';
  document.body.appendChild(root);
  document.getElementById('cloudAuthClose').onclick=()=>root.remove();
  root.addEventListener('click',e=>{ if(e.target===root) root.remove(); });
  async function doAuth(signup){
    const email=document.getElementById('cloudEmailIn').value.trim();
    const password=document.getElementById('cloudPassIn').value;
    const msg=document.getElementById('cloudAuthMsg');
    if(!email||password.length<6){ msg.textContent='Email и пароль (мин. 6 символов)'; return; }
    msg.textContent=signup?'Создаю…':'Вход…';
    try{
      const c=client();
      const r=signup?await c.auth.signUp({email,password}):await c.auth.signInWithPassword({email,password});
      if(r.error) throw r.error;
      if(signup&&!r.data.session){ msg.textContent='Подтверди email, потом войди'; return; }
      root.remove();
      await onSession(r.data.session);
    }catch(e){
      var m=(e&&e.message)||'Ошибка входа';
      if(/invalid login/i.test(m)) m='Неверный email или пароль';
      else if(/email not confirmed/i.test(m)) m='Подтверди email';
      else if(/user already/i.test(m)) m='Такой email уже есть — войди';
      else if(/rate limit|too many/i.test(m)) m='Слишком много попыток, подожди';
      else if(/network|fetch/i.test(m)) m='Нет сети';
      else if(/^[A-Za-z0-9 _.,:;!\-]+$/.test(m) && !/[А-Яа-я]/.test(m)) m='Ошибка входа';
      msg.textContent=m;
    }
  }
  document.getElementById('cloudSignin').onclick=()=>doAuth(false);
  document.getElementById('cloudSignup').onclick=()=>doAuth(true);
}
async function onSession(session){
  if(!session||!session.user){ currentUser=null; ready=false; updateAccountUI(); return; }
  currentUser=session.user;
  updateAccountUI();
  setStatus(true,'Загрузка…');
  await loadFromCloud();
  updateAccountUI();
}
function hookStateSaves(){
  const orig=window.saveState;
  if(typeof orig==='function'&&!orig.__cloud){
    window.saveState=function(){ const r=orig.apply(this,arguments); scheduleSave(); return r; };
    window.saveState.__cloud=true;
  }
}
async function bootCloud(){
  try{
    await loadSDK();
    ensureAccountBtn();
    updateAccountUI();
    hookStateSaves();
    const c=client();
    const {data}=await c.auth.getSession();
    if(data&&data.session) await onSession(data.session);
    c.auth.onAuthStateChange((_e,session)=>onSession(session));
  }catch(e){
    console.error('cloud boot',e);
    ensureAccountBtn();
    setStatus(false,'Облако недоступно');
  }
}
window.kopeykaCloud={ save:()=>saveToCloud(true), user:()=>currentUser, scheduleSave };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootCloud);
else bootCloud();
})();
