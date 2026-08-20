/* cloud.js v12 — robust load of account data, no wipe */
(function(){
'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co';
const KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_BASE='kopeyka3_state_v1';

let sb=null, ready=false, saving=false, lastSent='', currentUser=null, loading=false, suppressSave=false;

function localKey(){
  return (currentUser&&currentUser.id)?(LOCAL_BASE+'_'+currentUser.id):LOCAL_BASE;
}

function loadSDK(){
  return new Promise(function(ok,bad){
    if(window.supabase) return ok();
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=ok;
    s.onerror=function(){ bad(new Error('SDK')); };
    document.head.appendChild(s);
  });
}

function client(){
  if(!sb && window.supabase){
    sb=window.supabase.createClient(URL,KEY,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true,
        storage:window.localStorage,
        storageKey:'kopeyka3-auth'
      }
    });
  }
  return sb;
}

function toast(msg){
  if(typeof window.toast==='function') window.toast(msg);
  else console.log('[cloud]',msg);
}

function score(s){
  if(!s||typeof s!=='object') return 0;
  var n=0;
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays','notes','recurring'].forEach(function(k){
    if(Array.isArray(s[k])) n+=s[k].length;
  });
  if(s.shiftsOverride && typeof s.shiftsOverride==='object') n+=Object.keys(s.shiftsOverride).length;
  if(s.settings){
    if(Number(s.settings.openingBalance)) n+=1;
    if(Number(s.settings.dayRate)||Number(s.settings.nightRate)) n+=1;
  }
  return n;
}

function sn(v){
  var n=Number(v);
  if(!isFinite(n)||n!==n) return 0;
  if(Math.abs(n)>5e7) return 0;
  return Math.round(n);
}

function normalize(raw){
  if(!raw||typeof raw!=='object') raw={};
  var base=typeof window.defaultState==='function'?window.defaultState():{
    version:6,settings:{openingBalance:0,month:'',dayRate:0,nightRate:0},
    income:[],expenses:[],reserves:[],debts:[],reserveOps:[],
    obligations:[],obligationPays:[],shiftsOverride:{}
  };
  var out=Object.assign({},base,raw);
  out.settings=Object.assign({},base.settings||{},raw.settings||{});
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){
    if(!Array.isArray(out[k])) out[k]=[];
  });
  if(!out.shiftsOverride||typeof out.shiftsOverride!=='object') out.shiftsOverride={};
  var ok={day:1,night:1,off:1}, so={};
  Object.keys(out.shiftsOverride).forEach(function(k){
    var v=out.shiftsOverride[k];
    if(typeof v==='string'&&ok[v]) so[k]=v;
    else if(v&&typeof v==='object'&&typeof v.type==='string'&&ok[v.type]) so[k]=v.type;
  });
  out.shiftsOverride=so;
  out.settings.openingBalance=sn(out.settings.openingBalance);
  out.settings.dayRate=sn(out.settings.dayRate);
  out.settings.nightRate=sn(out.settings.nightRate);
  (out.income||[]).forEach(function(x){ if(x) x.amount=sn(x.amount); });
  (out.expenses||[]).forEach(function(x){ if(x) x.amount=sn(x.amount); });
  (out.reserves||[]).forEach(function(r){
    if(!r) return;
    r.saved=sn(r.saved);
    r.target=sn(r.target);
    if(!r.name && r.title) r.name=r.title;
    if(!r.name) r.name='Резерв';
  });
  (out.debts||[]).forEach(function(d){
    if(!d) return;
    d.total=sn(d.total);
    d.paid=sn(d.paid);
    if(!d.name) d.name='Долг';
  });
  (out.reserveOps||[]).forEach(function(o){ if(o) o.amount=sn(o.amount); });
  (out.obligations||[]).forEach(function(o){ if(o) o.amount=sn(o.amount); });
  (out.obligationPays||[]).forEach(function(o){ if(o) o.amount=sn(o.amount); });
  return out;
}

function mergeStates(a,b){
  var A=normalize(a||{}), B=normalize(b||{});
  var sa=score(A), sb=score(B);
  var pick, other;
  if(sb>sa+2){ pick=B; other=A; }
  else if(sa>sb+2){ pick=A; other=B; }
  else {
    var ta=Date.parse(A.updatedAt||0)||0, tb=Date.parse(B.updatedAt||0)||0;
    if(tb>=ta){ pick=B; other=A; } else { pick=A; other=B; }
  }
  var out=normalize(pick);
  ['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'].forEach(function(k){
    var m={};
    (other[k]||[]).forEach(function(x){ if(x&&x.id) m[x.id]=x; });
    (pick[k]||[]).forEach(function(x){ if(x&&x.id) m[x.id]=x; });
    out[k]=Object.keys(m).map(function(id){ return m[id]; });
  });
  out.shiftsOverride=Object.assign({}, other.shiftsOverride||{}, pick.shiftsOverride||{});
  out.settings=Object.assign({}, other.settings||{}, pick.settings||{});
  out.updatedAt=new Date().toISOString();
  return normalize(out);
}

function writeLocal(n){
  try{ localStorage.setItem(localKey(), JSON.stringify(n)); }catch(_){}
}
function readLocal(){
  try{
    var b=localStorage.getItem(localKey());
    if(b) return JSON.parse(b);
    b=localStorage.getItem(LOCAL_BASE);
    return b?JSON.parse(b):null;
  }catch(_){ return null; }
}

function applyState(s, label, allowUpload){
  var n=normalize(s);
  writeLocal(n);
  suppressSave=!allowUpload;
  try{
    if(typeof window.setAppState==='function'){
      window.setAppState(n);
    }else if(window.STATE){
      Object.keys(n).forEach(function(k){ window.STATE[k]=n[k]; });
      if(typeof window.render==='function') window.render();
    }
  }finally{
    suppressSave=false;
  }
  lastSent=JSON.stringify(n);
  if(label) toast(label);
}

function extractState(data){
  if(!data) return null;
  if(Array.isArray(data)){
    if(!data.length) return null;
    return extractState(data[0]);
  }
  if(typeof data!=='object') return null;
  if(data.state && typeof data.state==='object' && !Array.isArray(data.state)){
    if(data.state.state && typeof data.state.state==='object') return data.state.state;
    return data.state;
  }
  if(data.income || data.expenses || data.reserves || data.debts || data.settings || data.shiftsOverride || data.obligations){
    return data;
  }
  return null;
}

async function loadFromCloud(){
  if(!currentUser) return null;
  var c=client();
  if(!c) return null;
  var errors=[];
  var state=null;

  try{
    var q=await c.rpc('load_user_finance_state');
    if(q.error){
      errors.push('rpc: '+(q.error.message||q.error.code));
    }else{
      state=extractState(q.data);
      if(!state) errors.push('rpc: empty');
    }
  }catch(e){
    errors.push('rpc: '+(e.message||e));
  }

  if(!state){
    try{
      var t=await c.from('user_finance_state').select('state,version,updated_at').eq('user_id',currentUser.id).maybeSingle();
      if(t.error) errors.push('table: '+(t.error.message||t.error.code));
      else if(t.data) state=extractState(t.data);
      else errors.push('table: no row');
    }catch(e){
      errors.push('table: '+(e.message||e));
    }
  }

  if(state){
    console.log('[cloud] loaded score=', score(state), state);
    return normalize(state);
  }
  console.warn('[cloud] load failed', errors);
  return null;
}

async function saveToCloud(force){
  if(!currentUser||!ready) return false;
  if(suppressSave && !force) return false;
  if(saving && !force) return false;
  saving=true;
  try{
    var st=window.STATE||readLocal()||{};
    var clean=normalize(st);
    if(!force && score(clean)===0){
      saving=false;
      return false;
    }
    clean.app='kopeyka3';
    clean.updatedAt=new Date().toISOString();
    var json=JSON.stringify(clean);
    if(!force && json===lastSent){ saving=false; return true; }
    var c=client();
    if(!c) return false;
    var r=await c.rpc('save_user_finance_state',{p_state:clean,p_version:12});
    if(r.error){
      r=await c.from('user_finance_state').upsert({
        user_id:currentUser.id,
        state:clean,
        version:12,
        updated_at:new Date().toISOString()
      },{onConflict:'user_id'});
      if(r.error) throw new Error(r.error.message||r.error.code||'save failed');
    }
    lastSent=json;
    writeLocal(clean);
    return true;
  }catch(e){
    console.error('cloud save', e);
    toast('Не удалось сохранить в облако: '+(e.message||''));
    return false;
  }finally{
    saving=false;
  }
}

var saveTimer=null;
function scheduleSave(){
  if(suppressSave) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){ saveToCloud(false); },1500);
}

function setStatus(on, msg){
  var btn=document.getElementById('btnCloud');
  if(btn){
    btn.classList.toggle('on', !!on);
    btn.title=msg||(on?'Облако':'Локально');
  }
}
function updateAccountUI(){
  setStatus(!!currentUser, currentUser?(currentUser.email||'Облако'):'Локально');
}

function injectAuthCSS(){
  if(document.getElementById('cloudAuthCSS')) return;
  var s=document.createElement('style');
  s.id='cloudAuthCSS';
  s.textContent=
    '.cloud-auth{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:120;display:flex;align-items:center;justify-content:center;padding:16px}'+
    '.cloud-auth-card{width:100%;max-width:360px;background:#181A21;border:1px solid #2A2D38;border-radius:16px;padding:20px}'+
    '.cloud-auth-card h2{font-size:18px;margin:0 0 6px}'+
    '.cloud-auth-card .sm{font-size:13px;color:#8B90A0;margin:0 0 12px;line-height:1.4}'+
    '.cloud-auth-card .field{margin-bottom:10px}'+
    '.cloud-auth-card input{width:100%;padding:12px 14px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;color:#F2F3F7;box-sizing:border-box;font-size:15px}'+
    '.cloud-auth-card .row{display:flex;gap:8px;margin-top:4px}'+
    '.cloud-auth-card .btn{flex:1;padding:12px;border-radius:12px;font-weight:600;border:1px solid #2A2D38;background:#1E2129;color:#F2F3F7;cursor:pointer;font-size:14px}'+
    '.cloud-auth-card .btn.bp{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}'+
    '.cloud-auth-card .btn.full{width:100%;margin-top:8px;display:block}'+
    '.cloud-auth-card .btn:disabled{opacity:.55;cursor:wait}'+
    '.cloud-auth-msg{font-size:13px;min-height:18px;margin-bottom:8px;color:#F87171}'+
    '.cloud-auth-msg.ok{color:#4ADE80}'+
    '.cloud-user{padding:12px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;margin-bottom:12px;font-size:14px;word-break:break-all}';
  document.head.appendChild(s);
}

function closeAuth(){
  var root=document.getElementById('cloudAuth');
  if(root) root.remove();
}

function showAuth(){
  injectAuthCSS();
  closeAuth();
  var root=document.createElement('div');
  root.id='cloudAuth';
  root.className='cloud-auth';

  if(currentUser){
    root.innerHTML=
      '<div class="cloud-auth-card">'+
      '<h2>Облако</h2>'+
      '<p class="sm">Аккаунт подключен. Загрузи данные или сохрани текущие.</p>'+
      '<div class="cloud-user">'+(currentUser.email||currentUser.id)+'</div>'+
      '<div class="cloud-auth-msg" id="cloudAuthMsg"></div>'+
      '<button type="button" class="btn bp full" id="cloudSyncBtn">Загрузить мои данные</button>'+
      '<button type="button" class="btn full" id="cloudSaveBtn">Сохранить сейчас</button>'+
      '<button type="button" class="btn full" id="cloudLogout">Выйти</button>'+
      '<button type="button" class="btn full" id="cloudAuthClose">Закрыть</button>'+
      '</div>';
  }else{
    root.innerHTML=
      '<div class="cloud-auth-card">'+
      '<h2>Вход в облако</h2>'+
      '<p class="sm">Данные аккаунта не пересекаются с другими.</p>'+
      '<div class="cloud-auth-msg" id="cloudAuthMsg"></div>'+
      '<div class="field"><input type="email" id="cloudEmailIn" placeholder="Email" autocomplete="username" inputmode="email"></div>'+
      '<div class="field"><input type="password" id="cloudPassIn" placeholder="Пароль" autocomplete="current-password"></div>'+
      '<div class="row">'+
      '<button type="button" class="btn" id="cloudLoginBtn">Войти</button>'+
      '<button type="button" class="btn bp" id="cloudSignBtn">Регистрация</button>'+
      '</div>'+
      '<button type="button" class="btn full" id="cloudAuthClose">Закрыть</button>'+
      '</div>';
  }

  document.body.appendChild(root);
  root.addEventListener('click', function(e){ if(e.target===root) closeAuth(); });

  var closeBtn=document.getElementById('cloudAuthClose');
  if(closeBtn) closeBtn.onclick=closeAuth;

  function setMsg(text, ok){
    var m=document.getElementById('cloudAuthMsg');
    if(!m) return;
    m.textContent=text||'';
    m.className='cloud-auth-msg'+(ok?' ok':'');
  }

  async function doAuth(signup){
    var emailEl=document.getElementById('cloudEmailIn');
    var passEl=document.getElementById('cloudPassIn');
    var email=(emailEl&&emailEl.value||'').trim();
    var password=(passEl&&passEl.value||'');
    if(!email||!password){ setMsg('Введи email и пароль'); return; }
    if(password.length<6){ setMsg('Пароль минимум 6 символов'); return; }

    var loginBtn=document.getElementById('cloudLoginBtn');
    var signBtn=document.getElementById('cloudSignBtn');
    if(loginBtn) loginBtn.disabled=true;
    if(signBtn) signBtn.disabled=true;
    setMsg(signup?'Регистрация…':'Вход…');

    try{
      await loadSDK();
      var c=client();
      if(!c) throw new Error('Клиент не готов');
      var r=signup
        ? await c.auth.signUp({email:email, password:password})
        : await c.auth.signInWithPassword({email:email, password:password});
      if(r.error) throw r.error;

      if(signup){
        if(r.data && r.data.session){
          setMsg('Аккаунт создан', true);
          await onSession(r.data.session);
          closeAuth();
          toast('В облаке');
        }else{
          setMsg('Подтверди email из письма, потом войди', true);
        }
      }else{
        if(!r.data||!r.data.session) throw new Error('Сессия не создана');
        setMsg('Загружаю данные…', true);
        await onSession(r.data.session);
        closeAuth();
      }
    }catch(e){
      var m=e && (e.message||e.error_description||String(e));
      if(/invalid login|invalid credentials/i.test(m)) m='Неверный email или пароль';
      else if(/email not confirmed/i.test(m)) m='Подтверди email по ссылке из письма';
      else if(/user already/i.test(m)) m='Email уже есть — нажми «Войти»';
      else if(/rate limit|too many/i.test(m)) m='Слишком много попыток';
      setMsg(m);
    }finally{
      if(loginBtn) loginBtn.disabled=false;
      if(signBtn) signBtn.disabled=false;
    }
  }

  var lb=document.getElementById('cloudLoginBtn');
  var sb2=document.getElementById('cloudSignBtn');
  if(lb) lb.onclick=function(){ doAuth(false); };
  if(sb2) sb2.onclick=function(){ doAuth(true); };
  var pass=document.getElementById('cloudPassIn');
  if(pass) pass.addEventListener('keydown', function(e){ if(e.key==='Enter') doAuth(false); });

  var syncBtn=document.getElementById('cloudSyncBtn');
  if(syncBtn) syncBtn.onclick=async function(){
    setMsg('Загрузка…');
    syncBtn.disabled=true;
    try{
      var cloud=await loadFromCloud();
      var local=readLocal()||window.STATE;
      if(cloud){
        var merged=mergeStates(local, cloud);
        applyState(merged, 'Загружено: операций ~'+score(merged), true);
        setMsg('Данные на месте ('+score(merged)+')', true);
        await saveToCloud(true);
      }else{
        setMsg('В облаке пусто для этого аккаунта');
        toast('В облаке нет сохранённых данных');
      }
    }catch(e){
      setMsg(e.message||'Ошибка загрузки');
    }finally{
      syncBtn.disabled=false;
    }
  };

  var saveBtn=document.getElementById('cloudSaveBtn');
  if(saveBtn) saveBtn.onclick=async function(){
    setMsg('Сохранение…');
    saveBtn.disabled=true;
    var ok=await saveToCloud(true);
    setMsg(ok?'Сохранено в облако':'Ошибка сохранения', ok);
    saveBtn.disabled=false;
  };

  var lo=document.getElementById('cloudLogout');
  if(lo) lo.onclick=async function(){
    lo.disabled=true;
    try{ await client().auth.signOut({scope:'local'}); }catch(_){}
    currentUser=null; ready=false; lastSent='';
    updateAccountUI();
    toast('Вышли');
    closeAuth();
  };
}

async function onSession(session){
  if(!session||!session.user){
    currentUser=null; ready=false; updateAccountUI();
    return;
  }
  if(loading) return;
  loading=true;
  try{
    currentUser=session.user;
    ready=true;
    updateAccountUI();

    var cloud=await loadFromCloud();
    var local=readLocal()||(window.STATE||null);

    if(cloud && score(cloud)>0){
      var merged=mergeStates(local, cloud);
      applyState(merged, 'Данные аккаунта загружены', false);
      if(score(local)>0) saveToCloud(true).catch(function(){});
    }else if(local && score(local)>0){
      applyState(local, 'Локальные данные → облако', true);
      await saveToCloud(true);
    }else if(cloud){
      applyState(cloud, 'Облако подключено', false);
    }else{
      toast('Вход ок, данных в облаке пока нет');
    }
  }finally{
    loading=false;
  }
}

async function bootCloud(){
  try{
    await loadSDK();
    var c=client();
    if(!c) throw new Error('no client');
    var res=await c.auth.getSession();
    await onSession(res.data && res.data.session);
    c.auth.onAuthStateChange(function(ev, session){
      if(ev==='SIGNED_IN'||ev==='TOKEN_REFRESHED'||ev==='INITIAL_SESSION') onSession(session);
      if(ev==='SIGNED_OUT'){ currentUser=null; ready=false; updateAccountUI(); }
    });
  }catch(e){
    console.error('cloud boot', e);
    setStatus(false, 'Офлайн');
  }
  var btn=document.getElementById('btnCloud');
  if(btn) btn.onclick=function(){ showAuth(); };
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bootCloud);
else bootCloud();

window.kopeykaCloud={
  save:function(){ return saveToCloud(true); },
  user:function(){ return currentUser; },
  scheduleSave:scheduleSave,
  load:function(){ return loadFromCloud(); },
  showAuth:showAuth
};
})();
