/* cloud.js v24 — live-key isolation, in-flight merge, cash-anchor reconcile */
(function(){
'use strict';
const URL='https://cqslrfphsjllhltsvvuq.supabase.co';
const KEY='sb_publishable_cM_XCycYRFLIc6qEqlH83Q_5XY6kPzG';
const LOCAL_BASE='kopeyka3_state_v1';
const SYNC_BASE='kopeyka3_sync_base_v1';
const CLEAR_INTENT='kopeyka3_clear_intent_v1';
const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3';
const COLLECTIONS=['income','expenses','reserves','debts','reserveOps','obligations','obligationPays'];
let sb=null,ready=false,saving=false,loading=false,currentUser=null,lastSent='',saveTimer=null,retryTimer=null,suppressSave=false,_baseMem=null;
function toast(m){if(typeof window.toast==='function')window.toast(m);else console.log('[cloud]',m);}
function loadSDK(){return new Promise(function(ok,bad){if(window.supabase)return ok();var s=document.createElement('script');s.src=SDK_URL;s.onload=ok;s.onerror=function(){bad(new Error('Не удалось загрузить Supabase'));};document.head.appendChild(s);});}
function client(){if(!sb&&window.supabase)sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:'kopeyka3-auth'}});return sb;}
function normalize(raw){var base=typeof window.defaultState==='function'?window.defaultState():{version:6,settings:{openingBalance:0,month:'',dayRate:0,nightRate:0},income:[],expenses:[],reserves:[],debts:[],reserveOps:[],obligations:[],obligationPays:[],shiftsOverride:{},dayPlans:{},voiceMap:{}};var r=raw&&typeof raw==='object'?raw:{},o=Object.assign({},base,r);o.settings=Object.assign({},base.settings||{},r.settings||{});COLLECTIONS.forEach(function(k){if(!Array.isArray(o[k]))o[k]=[];});if(!o.shiftsOverride||typeof o.shiftsOverride!=='object')o.shiftsOverride={};if(!o.dayPlans||typeof o.dayPlans!=='object'||Array.isArray(o.dayPlans))o.dayPlans={};if(!o.voiceMap||typeof o.voiceMap!=='object')o.voiceMap={};if(!o._deleted||typeof o._deleted!=='object')o._deleted={};COLLECTIONS.forEach(function(k){if(!o._deleted[k]||typeof o._deleted[k]!=='object')o._deleted[k]={};});if(!Array.isArray(o._conflicts))o._conflicts=[];return o;}
function stamp(s){var n=normalize(s);if(!n.updatedAt)n.updatedAt=new Date().toISOString();return n;}
function liveState(){try{if(window.STATE&&typeof window.STATE==='object')return stamp(window.STATE);}catch(_){}return null;}
function waitAppReady(){return new Promise(function(ok){if(window.__FIN_APP_READY&&!window.__FIN_LOAD_PENDING)return ok();var done=false;function fin(){if(done)return;done=true;ok();}try{window.addEventListener('fin-app-ready',fin,{once:true});}catch(e){}var n=0;var t=setInterval(function(){n++;var ready=!!(window.__FIN_APP_READY&&!window.__FIN_LOAD_PENDING);if(ready||n>=300){clearInterval(t);fin();}},100);});}
function encryptedLocalPresent(){try{var v=localStorage.getItem(LOCAL_BASE);if(v&&String(v).indexOf('FINENC1:')===0)return true;var b=localStorage.getItem('kopeyka3_state_v1__raw_backup');if(b&&String(b).indexOf('FINENC1:')===0)return true;}catch(e){}return false;}
function localNotReady(){try{if(window.__FIN_LOAD_PENDING||window.__FIN_DECRYPT_FAILED)return true;if(encryptedLocalPresent()&&!window.__FIN_APP_READY)return true;}catch(e){}return false;}
function readLocal(){var live=liveState();if(live&&!isEmptyState(live))return live;try{var v=localStorage.getItem(LOCAL_BASE);if(!v){try{v=localStorage.getItem('kopeyka3_state_v1__raw_backup');}catch(e){}}if(!v)return live;if(String(v).indexOf('FINENC1:')===0)return live;return stamp(JSON.parse(v));}catch(_){}return live;}
function writeLocal(s){try{if(localNotReady())return;var n=stamp(s);if(isEmptyState(n)){var live=liveState();if(live&&!isEmptyState(live))return;try{var existing=localStorage.getItem(LOCAL_BASE);if(existing&&String(existing).indexOf('FINENC1:')===0)return;}catch(e){}}if(window.FinSecureStore&&typeof window.FinSecureStore.saveState==='function'){window.FinSecureStore.saveState(LOCAL_BASE,n);}else{localStorage.setItem(LOCAL_BASE,JSON.stringify(n));}}catch(_){} }
function readBase(){if(_baseMem)return stamp(_baseMem);try{var v=localStorage.getItem(SYNC_BASE);if(!v)return null;if(String(v).indexOf('FINENC1:')===0)return null;return stamp(JSON.parse(v));}catch(_){}return null;}
function hydrateBase(){return new Promise(function(ok){try{var v=localStorage.getItem(SYNC_BASE);if(!v){ok();return;}if(String(v).indexOf('FINENC1:')!==0){try{_baseMem=stamp(JSON.parse(v));}catch(e){}if(_baseMem&&window.FinSecureStore&&typeof window.FinSecureStore.saveState==='function'){try{window.FinSecureStore.saveState(SYNC_BASE,_baseMem);}catch(e2){}}ok();return;}if(!window.FinSecureStore||typeof window.FinSecureStore.loadState!=='function'){ok();return;}window.FinSecureStore.loadState(SYNC_BASE,function(){return null;},function(x){return x;}).then(function(st){if(st)_baseMem=stamp(st);ok();}).catch(function(){ok();});}catch(e){ok();}});}
function clearIntent(){try{return Number(localStorage.getItem(CLEAR_INTENT)||0)||0;}catch(_){return 0;}}
function writeBase(s){try{if(s){var n=stamp(s);_baseMem=n;if(window.FinSecureStore&&typeof window.FinSecureStore.saveState==='function'){window.FinSecureStore.saveState(SYNC_BASE,n);}else{localStorage.setItem(SYNC_BASE,JSON.stringify(n));}}else{_baseMem=null;localStorage.removeItem(SYNC_BASE);}}catch(_){} }
function setClearIntent(){try{if(!clearIntent())localStorage.setItem(CLEAR_INTENT,String(Date.now()));}catch(_){} }
function clearClearIntent(){try{localStorage.removeItem(CLEAR_INTENT);}catch(_){} }
function isEmptyState(s){if(!s)return true;function live(arr){return Array.isArray(arr)&&arr.some(function(x){return x&&!x.deleted;});}if(COLLECTIONS.some(function(k){return live(s[k]);}))return false;if(s.shiftsOverride&&Object.keys(s.shiftsOverride).length)return false;if(s.dayPlans&&Object.keys(s.dayPlans).length)return false;var st=s.settings||{};if(Number(st.openingBalance)||Number(st.dayRate)||Number(st.nightRate)||Number(st.paydayDay))return false;if(st.userName)return false;function mapLive(o){if(!o||typeof o!=='object'||Array.isArray(o))return false;return Object.keys(o).some(function(k){return Number(o[k])>0;});}if(mapLive(st.budgetSavings)||mapLive(st.budgetLimits))return false;if(Array.isArray(st.periodReports)&&st.periodReports.length)return false;return true;}
function same(a,b){if(a===b)return true;var x=a&&typeof a==='object'?Object.assign({},a):a,y=b&&typeof b==='object'?Object.assign({},b):b;if(x&&typeof x==='object'){delete x.updatedAt;delete x.app;}if(y&&typeof y==='object'){delete y.updatedAt;delete y.app;}return JSON.stringify(x)===JSON.stringify(y);}
function mapById(a){var m={};(Array.isArray(a)?a:[]).forEach(function(x){if(x&&x.id)m[x.id]=x;});return m;}
function deletedMap(s,k){return s&&s._deleted&&s._deleted[k]&&typeof s._deleted[k]==='object'?s._deleted[k]:{};}
function conflict(conflicts,kind,id,field,local,remote){conflicts.push({kind:kind,id:id,field:field,local:local,remote:remote,at:new Date().toISOString()});}
function mergeRecord(base,local,remote,kind,id,conflicts){if(!base)return local!==undefined?local:remote;if(local===undefined||remote===undefined)return undefined;var out={},keys={};[base,local,remote].forEach(function(o){if(o&&typeof o==='object')Object.keys(o).forEach(function(k){keys[k]=1;});});Object.keys(keys).forEach(function(k){var b=base[k],l=local[k],r=remote[k],lc=!same(l,b),rc=!same(r,b);if(lc&&!rc)out[k]=l;else if(!lc&&rc)out[k]=r;else if(lc&&rc){if(same(l,r))out[k]=l;else{out[k]=l;conflict(conflicts,kind,id,k,l,r);}}else if(r!==undefined)out[k]=r;else if(l!==undefined)out[k]=l;});return out;}
function mergeArray(base,local,remote,k,conflicts,bd,ld,rd){var bm=mapById(base),lm=mapById(local),rm=mapById(remote),ids={},out=[],deleted={};bd=bd&&typeof bd==='object'?bd:{};ld=ld&&typeof ld==='object'?ld:{};rd=rd&&typeof rd==='object'?rd:{};Object.keys(bm).concat(Object.keys(lm),Object.keys(rm)).forEach(function(id){ids[id]=1;});Object.keys(bd).concat(Object.keys(ld),Object.keys(rd)).forEach(function(id){if(ld[id]||rd[id]||bd[id])deleted[id]=Math.max(Number(bd[id])||0,Number(ld[id])||0,Number(rd[id])||0);});Object.keys(ids).forEach(function(id){var b=bm[id],l=lm[id],r=rm[id];
  if(!l&&!r){if(b||deleted[id])deleted[id]=deleted[id]||Date.now();return;}
  if(!l&&ld[id]){deleted[id]=ld[id]||Date.now();return;}
  if(!r&&rd[id]){deleted[id]=rd[id]||Date.now();return;}
  if(!b&&deleted[id]&&l&&r===undefined){delete deleted[id];}
  var v;
  if(l&&r)v=mergeRecord(b,l,r,k,id,conflicts);
  else if(l)v=l;
  else v=r;
  if(v)out.push(v);
});Object.keys(deleted).forEach(function(id){if(!lm[id]&&!rm[id]&&!bm[id])delete deleted[id];});return{items:out,deleted:deleted};}
function mergeObject(base,local,remote,kind,conflicts){var out={},keys={};[base,local,remote].forEach(function(o){if(o&&typeof o==='object')Object.keys(o).forEach(function(k){keys[k]=1;});});Object.keys(keys).forEach(function(k){var b=base&&base[k],l=local&&local[k],r=remote&&remote[k],lc=!same(l,b),rc=!same(r,b);if(lc&&!rc)out[k]=l;else if(!lc&&rc)out[k]=r;else if(lc&&rc){if(same(l,r))out[k]=l;else{out[k]=l;conflict(conflicts,kind,'state',k,l,r);}}else if(r!==undefined)out[k]=r;else if(l!==undefined)out[k]=l;});return out;}
function num0(v){var x=Number(v);return isFinite(x)?x:0;}
function mergeNumericMap(base,local,remote){
  var out={},keys={};
  [base,local,remote].forEach(function(o){if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(function(k){keys[k]=1;});});
  Object.keys(keys).forEach(function(k){
    var b=base&&base[k],l=local&&local[k],r=remote&&remote[k];
    var lc=!same(l,b),rc=!same(r,b);
    if(lc&&!rc)out[k]=l;
    else if(!lc&&rc)out[k]=r;
    else if(lc&&rc){
      if(same(l,r))out[k]=l;
      else out[k]=Math.max(num0(l),num0(r),num0(b));
    }else if(r!==undefined)out[k]=r;
    else if(l!==undefined)out[k]=l;
    if(out[k]==null||out[k]==='')delete out[k];
    else out[k]=num0(out[k]);
  });
  return out;
}
function mergePeriodReports(local,remote){
  var map={};
  function add(arr){
    (arr||[]).forEach(function(r){
      if(!r||typeof r!=='object')return;
      var k=String(r.from||'')+'|'+String(r.end||'');
      if(k==='|')k=String(r.id||'');
      if(!k)return;
      var prev=map[k];
      if(!prev){map[k]=r;return;}
      if(num0(r.totalSaved)>num0(prev.totalSaved))map[k]=r;
    });
  }
  add(local);add(remote);
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.from||'').localeCompare(String(a.from||''));}).slice(0,36);
}
function savingsFromReports(reports){
  var s={};
  (reports||[]).forEach(function(r){
    if(!r||!r.byCat||typeof r.byCat!=='object')return;
    Object.keys(r.byCat).forEach(function(cat){
      var leftover=r.byCat[cat]&&r.byCat[cat].leftover!=null?num0(r.byCat[cat].leftover):0;
      if(leftover>0)s[cat]=(s[cat]||0)+leftover;
    });
  });
  return s;
}
function mergeSettings(base,local,remote,conflicts){
  var out=mergeObject(base,local,remote,'settings',conflicts);
  var reports=mergePeriodReports(local&&local.periodReports, remote&&remote.periodReports);
  out.periodReports=reports;
  var sav=mergeNumericMap(base&&base.budgetSavings, local&&local.budgetSavings, remote&&remote.budgetSavings);
  var rec=savingsFromReports(reports);
  Object.keys(rec).forEach(function(cat){sav[cat]=Math.max(num0(sav[cat]), rec[cat]);});
  out.budgetSavings=sav;
  out.budgetLimits=mergeNumericMap(base&&base.budgetLimits, local&&local.budgetLimits, remote&&remote.budgetLimits);
  if(local&&local.lastPeriodReport)out.lastPeriodReport=local.lastPeriodReport;
  else if(remote&&remote.lastPeriodReport)out.lastPeriodReport=remote.lastPeriodReport;
  return out;
}
function nextMonthKey(m){var p=String(m).split('-').map(Number),y=p[0],x=p[1]+1;if(x>12){x=1;y++;}return y+'-'+String(x).padStart(2,'0');}
function prevMonthKey(m){var p=String(m).split('-').map(Number),y=p[0],x=p[1]-1;if(x<1){x=12;y--;}return y+'-'+String(x).padStart(2,'0');}
function aliveRow(x){return !!(x&&!x.deleted);}
function monthOfDate(d){return String(d||'').slice(0,7);}
function monthDelta(s,m){
  var inc=0,exp=0,dep=0,wd=0;
  (s.income||[]).forEach(function(x){if(!aliveRow(x))return;if(monthOfDate(x.date)===m)inc+=num0(x.amount);});
  (s.expenses||[]).forEach(function(x){if(!aliveRow(x))return;if(monthOfDate(x.date)===m)exp+=num0(x.amount);});
  (s.reserveOps||[]).forEach(function(x){if(!aliveRow(x))return;if(monthOfDate(x.date)!==m)return;var a=num0(x.amount);if(x.type==='deposit')dep+=a;else if(x.type==='withdraw')wd+=a;});
  return inc-exp-dep+wd;
}
function impliedOpeningAt(state,targetMonth){
  if(!state||!targetMonth)return 0;
  var anchor=String((state.settings&&state.settings.month)||targetMonth);
  var open=num0(state.settings&&state.settings.openingBalance);
  if(anchor===targetMonth)return open;
  var guard=0;
  if(targetMonth>anchor){
    for(var x=anchor;x!==targetMonth&&guard++<240;x=nextMonthKey(x))open+=monthDelta(state,x);
    return open;
  }
  for(var y=anchor;y!==targetMonth&&guard++<240;){y=prevMonthKey(y);open-=monthDelta(state,y);}
  return open;
}
function preAnchorDelta(state,anchor){
  var seen={},sum=0;
  function addMonths(arr,field){
    (arr||[]).forEach(function(x){
      if(!aliveRow(x))return;
      var m=monthOfDate(x[field]||x.month);
      if(/^\d{4}-\d{2}$/.test(m)&&m<anchor)seen[m]=1;
    });
  }
  addMonths(state.income,'date');
  addMonths(state.expenses,'date');
  addMonths(state.reserveOps,'date');
  Object.keys(seen).forEach(function(m){sum+=monthDelta(state,m);});
  return sum;
}
function cashAtMonth(state,month){
  month=String(month||'');
  if(!/^\d{4}-\d{2}$/.test(month))return 0;
  return impliedOpeningAt(state,month)+monthDelta(state,month);
}
function reconcileCashAnchor(out,local,remote,base){
  try{
    var months=[base,local,remote].map(function(s){return s&&s.settings&&s.settings.month;}).filter(function(m){return /^\d{4}-\d{2}$/.test(String(m||''));}).sort();
    if(!months.length)return out;
    var earliest=months[0];
    var source=null;
    if(base&&base.settings&&base.settings.month===earliest)source=base;
    if(remote&&remote.settings&&remote.settings.month===earliest)source=remote;
    if(local&&local.settings&&local.settings.month===earliest)source=local;
    if(!source)source=local||remote||base;
    if(!source)return out;
    var opening=impliedOpeningAt(source,earliest);
    opening+=preAnchorDelta(out,earliest)-preAnchorDelta(source,earliest);
    if(!out.settings)out.settings={};
    out.settings.month=earliest;
    out.settings.openingBalance=num0(opening);
  }catch(e){}
  return out;
}
function threeWay(base,local,remote){base=normalize(base||{});local=normalize(local||{});remote=normalize(remote||{});var out=Object.assign({},remote),allDeleted={},conflicts=[];COLLECTIONS.forEach(function(k){var m=mergeArray(base[k],local[k],remote[k],k,conflicts,deletedMap(base,k),deletedMap(local,k),deletedMap(remote,k));out[k]=m.items;allDeleted[k]=m.deleted;});out._deleted=allDeleted;out.shiftsOverride=mergeObject(base.shiftsOverride||{},local.shiftsOverride||{},remote.shiftsOverride||{},'shiftsOverride',conflicts);out.dayPlans=mergeObject(base.dayPlans||{},local.dayPlans||{},remote.dayPlans||{},'dayPlans',conflicts);out.voiceMap=mergeObject(base.voiceMap||{},local.voiceMap||{},remote.voiceMap||{},'voiceMap',conflicts);out.settings=mergeSettings(base.settings||{},local.settings||{},remote.settings||{},conflicts);out._conflicts=(remote._conflicts||[]).concat(local._conflicts||[],conflicts).slice(-100);out.version=Math.max(Number(local.version)||0,Number(remote.version)||0,6);out.app='kopeyka3';out.updatedAt=new Date().toISOString();return normalize(reconcileCashAnchor(out,local,remote,base));}
function localChanged(base,local){return !same(normalize(base||{}),normalize(local||{}));}
function liveDivergedFrom(captured){
  try{
    var live=liveState();
    if(!live||isEmptyState(live)||!captured)return false;
    return localChanged(captured, live);
  }catch(e){return false;}
}
function hasPendingChanges(){var base=readBase(),local=readLocal();return !!clearIntent()||(!base&&!!local&&!isEmptyState(local))||(!!base&&localChanged(base,local));}
function applyState(s,label){if(localNotReady()){if(label)toast('Локальные данные ещё открываются — облако подождёт');return;}var n=stamp(s);if(isEmptyState(n)){var live=liveState();if(live&&!isEmptyState(live)){if(label)toast('Локальные данные сохранены, пустое облако не применено');return;}try{var existing=localStorage.getItem(LOCAL_BASE);if(existing&&String(existing).indexOf('FINENC1:')===0){if(label)toast('Зашифрованные данные на устройстве сохранены');return;}}catch(_){}}var prev=null;try{prev=window.STATE?JSON.stringify(window.STATE):null;}catch(_){}
writeLocal(n);suppressSave=true;try{
  window.STATE=n;
  try{if(typeof window.ensureMonth==='function')window.ensureMonth();}catch(_){}
  var next=JSON.stringify(window.STATE||n);
  if(prev!==next&&typeof window.render==='function')window.render();
}finally{suppressSave=false;}lastSent=JSON.stringify(window.STATE||n);if(label)toast(label);}
async function loadFromCloud(){if(!currentUser)return null;var c=client();if(!c)throw new Error('Облако недоступно');var r=await c.from('user_finance_state').select('state,version,updated_at').eq('user_id',currentUser.id).maybeSingle();if(r.error)throw new Error(r.error.message||r.error.code||'Ошибка загрузки облака');if(!r.data)return null;var state=normalize(r.data.state);if(r.data.updated_at)state.updatedAt=r.data.updated_at;Object.defineProperty(state,'_dbVersion',{value:Number(r.data.version)||0,enumerable:false,writable:true});return state;}
async function writeRemote(merged,remote,capturedLocal){var c=client();if(!c)throw new Error('Облако недоступно');var next=(remote&&remote._dbVersion?remote._dbVersion:0)+1,now=new Date().toISOString(),payload={user_id:currentUser.id,state:merged,version:next,updated_at:now};if(remote){var r=await c.from('user_finance_state').update({state:merged,version:next,updated_at:now}).eq('user_id',currentUser.id).eq('version',remote._dbVersion).select('user_id');if(r.error)throw new Error(r.error.message||r.error.code||'Ошибка сохранения в облако');if(!r.data||!r.data.length)return false;}else{var r2=await c.from('user_finance_state').insert(payload).select('user_id');if(r2.error){if(r2.error.code==='23505'||/duplicate|unique/i.test(r2.error.message||''))return false;throw new Error(r2.error.message||r2.error.code||'Ошибка сохранения в облако');}}merged.updatedAt=now;writeBase(merged);clearClearIntent();lastSent=JSON.stringify(merged);if(liveDivergedFrom(capturedLocal)){try{var kept=threeWay(capturedLocal||{},liveState(),merged);writeLocal(kept);applyState(kept);scheduleSave();}catch(e){scheduleSave();}return true;}writeLocal(merged);applyState(merged);return true;}
async function saveToCloud(force){if(!currentUser||!ready||suppressSave)return false;if(localNotReady())return false;if(saving&&!force)return false;saving=true;try{for(var attempt=0;attempt<3;attempt++){var local=stamp(window.STATE||readLocal()||{}),base=readBase(),remote=await loadFromCloud(),clearAt=clearIntent();
if(remote&&!isEmptyState(remote)&&isEmptyState(local)){applyState(remote);writeBase(remote);return true;}
if(clearAt&&clearAt>(remote&&Date.parse(remote.updatedAt)||0)){if(remote&&!isEmptyState(remote)){try{localStorage.removeItem(CLEAR_INTENT);}catch(e){}applyState(remote);return true;}local=stamp(local);remote=null;base=null;}var merged;if(remote&&base&&localChanged(base,local)&&!isEmptyState(local))merged=threeWay(base,local,remote);else if(remote&&base&&!localChanged(base,local))merged=remote;else if(remote&&!base){merged=remote;if(localChanged(null,local)&&!isEmptyState(local))merged=threeWay(null,local,remote);}else merged=local;if(remote&&!isEmptyState(remote)&&isEmptyState(merged))merged=remote;var lastObj=null;try{lastObj=lastSent?JSON.parse(lastSent):null;}catch(_){}if(!force&&same(merged,lastObj)&&!localChanged(base,local))return true;if(await writeRemote(merged,remote,local))return true;await new Promise(function(res){setTimeout(res,50*(attempt+1));});}throw new Error('Конфликт версии: не удалось сохранить после нескольких попыток');}catch(e){console.error('[cloud] save',e);scheduleRetry();if(force)toast('Не удалось сохранить в облако: '+(e.message||''));return false;}finally{saving=false;}}
function scheduleRetry(){clearTimeout(retryTimer);retryTimer=setTimeout(function(){if(navigator.onLine&&currentUser)saveToCloud(false);},5000);}
function scheduleSave(){if(suppressSave)return;clearTimeout(saveTimer);saveTimer=setTimeout(function(){if(navigator.onLine&&currentUser)saveToCloud(false);},1200);}
function syncNow(){if(!currentUser)return Promise.resolve(false);if(!navigator.onLine){scheduleRetry();return Promise.resolve(false);}return saveToCloud(true);}
function setStatus(synced,msg){
  var b=document.getElementById('btnCloud');
  if(!b)return;
  b.classList.remove('cloud-ok','cloud-off','on','sync-ok','sync-err','sync-busy','sync-pending');
  if(synced){b.classList.add('cloud-ok','on','sync-ok');}
  else{b.classList.add('cloud-off','sync-err');}
  b.style.color=synced?'#FFFFFF':'#F87171';
  b.title=msg||(synced?'Синхронизация включена':'Нет синхронизации');
}
function updateAccountUI(){
  var ok=!!currentUser && navigator.onLine;
  setStatus(ok, currentUser?(currentUser.email||'Облако · синхронизация'):(navigator.onLine?'Не в облаке':'Офлайн'));
}
function injectAuthCSS(){if(document.getElementById('cloudAuthCSS'))return;var s=document.createElement('style');s.id='cloudAuthCSS';s.textContent='.cloud-auth{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:120;display:flex;align-items:center;justify-content:center;padding:16px}.cloud-auth-card{width:100%;max-width:360px;background:#181A21;border:1px solid #2A2D38;border-radius:16px;padding:20px}.cloud-auth-card h2{font-size:18px;margin:0 0 6px}.cloud-auth-card .sm{font-size:13px;color:#8B90A0;margin:0 0 12px;line-height:1.4}.cloud-auth-card .field{margin-bottom:10px}.cloud-auth-card input{width:100%;padding:12px 14px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;color:#F2F3F7;box-sizing:border-box;font-size:15px}.cloud-auth-card .row{display:flex;gap:8px;margin-top:4px}.cloud-auth-card .btn{flex:1;padding:12px;border-radius:12px;font-weight:600;border:1px solid #2A2D38;background:#1E2129;color:#F2F3F7;cursor:pointer;font-size:14px}.cloud-auth-card .btn.bp{background:linear-gradient(135deg,#F0C384,#E5A75E);color:#1A1208;border:none}.cloud-auth-card .btn.full{width:100%;margin-top:8px;display:block}.cloud-auth-card .btn:disabled{opacity:.55;cursor:wait}.cloud-auth-msg{font-size:13px;min-height:18px;margin-bottom:8px;color:#F87171}.cloud-auth-msg.ok{color:#4ADE80}.cloud-user{padding:12px;border-radius:12px;background:#1E2129;border:1px solid #2A2D38;margin-bottom:12px;font-size:14px;word-break:break-all}';document.head.appendChild(s);}
function closeAuth(){var r=document.getElementById('cloudAuth');if(r)r.remove();}
function showAuth(){injectAuthCSS();closeAuth();var root=document.createElement('div');root.id='cloudAuth';root.className='cloud-auth';if(currentUser)root.innerHTML='<div class="cloud-auth-card"><h2>Облако</h2><p class="sm">Аккаунт подключен.</p><div class="cloud-user">'+(currentUser.email||currentUser.id)+'</div><div class="cloud-auth-msg" id="cloudAuthMsg"></div><button type="button" class="btn bp full" id="cloudSyncBtn">Синхронизировать</button><button type="button" class="btn full" id="cloudSaveBtn">Сохранить сейчас</button><button type="button" class="btn full" id="cloudLogout">Выйти</button><button type="button" class="btn full" id="cloudAuthClose">Закрыть</button></div>';else root.innerHTML='<div class="cloud-auth-card"><h2>Вход в облако</h2><p class="sm">Локальные данные текущего пользователя не смешиваются с другими аккаунтами.</p><div class="cloud-auth-msg" id="cloudAuthMsg"></div><div class="field"><input type="email" id="cloudEmailIn" placeholder="Email" autocomplete="username" inputmode="email"></div><div class="field"><input type="password" id="cloudPassIn" placeholder="Пароль" autocomplete="current-password"></div><div class="row"><button type="button" class="btn" id="cloudLoginBtn">Войти</button><button type="button" class="btn bp" id="cloudSignBtn">Регистрация</button></div><button type="button" class="btn full" id="cloudAuthClose">Закрыть</button></div>';document.body.appendChild(root);root.addEventListener('click',function(e){if(e.target===root)closeAuth();});var close=document.getElementById('cloudAuthClose');if(close)close.onclick=closeAuth;function msg(t,ok){var m=document.getElementById('cloudAuthMsg');if(m){m.textContent=t||'';m.className='cloud-auth-msg'+(ok?' ok':'');}}async function auth(signup){var e=(document.getElementById('cloudEmailIn')||{}).value||'',p=(document.getElementById('cloudPassIn')||{}).value||'';e=e.trim();if(!e||!p)return msg('Введи email и пароль');if(p.length<6)return msg('Пароль минимум 6 символов');var a=document.getElementById('cloudLoginBtn'),b=document.getElementById('cloudSignBtn');if(a)a.disabled=true;if(b)b.disabled=true;msg(signup?'Регистрация…':'Вход…');try{await loadSDK();var c=client(),r=signup?await c.auth.signUp({email:e,password:p}):await c.auth.signInWithPassword({email:e,password:p});if(r.error)throw r.error;if(signup&&!r.data.session){msg('Подтверди email из письма, потом войди',true);return;}await onSession(r.data.session);closeAuth();}catch(x){var m=x&&(x.message||x.error_description||String(x));if(/invalid login|invalid credentials/i.test(m))m='Неверный email или пароль';else if(/email not confirmed/i.test(m))m='Подтверди email по ссылке из письма';else if(/rate limit|too many/i.test(m))m='Слишком много попыток';msg(m);}finally{if(a)a.disabled=false;if(b)b.disabled=false;}}var lb=document.getElementById('cloudLoginBtn'),sb2=document.getElementById('cloudSignBtn');if(lb)lb.onclick=function(){auth(false);};if(sb2)sb2.onclick=function(){auth(true);};var pass=document.getElementById('cloudPassIn');if(pass)pass.addEventListener('keydown',function(e){if(e.key==='Enter')auth(false);});var sync=document.getElementById('cloudSyncBtn');if(sync)sync.onclick=async function(){sync.disabled=true;msg('Синхронизация…');try{var ok=await syncNow();msg(ok?'Синхронизация завершена':'Сохранение отложено',ok);}catch(e){msg(e.message||'Ошибка');}finally{sync.disabled=false;}};var save=document.getElementById('cloudSaveBtn');if(save)save.onclick=async function(){save.disabled=true;msg('Сохранение…');var ok=await syncNow();msg(ok?'Сохранено в облако':'Сохранение отложено',ok);save.disabled=false;};var lo=document.getElementById('cloudLogout');if(lo)lo.onclick=async function(){lo.disabled=true;try{if(hasPendingChanges()){if(!navigator.onLine){msg('Есть несинхронизированные изменения. Подключись к интернету перед выходом.');lo.disabled=false;return;}var ok=await syncNow();if(!ok||hasPendingChanges()){msg('Не удалось безопасно сохранить изменения. Выход отменён.');lo.disabled=false;return;}}await client().auth.signOut({scope:'local'});currentUser=null;ready=false;lastSent='';writeBase(null);updateAccountUI();closeAuth();toast('Вышли · данные на устройстве сохранены');}catch(e){msg(e.message||'Не удалось выйти');}finally{lo.disabled=false;}};}
async function onSession(session){if(!session||!session.user){currentUser=null;ready=false;updateAccountUI();return;}if(loading)return;loading=true;try{await waitAppReady();await hydrateBase();currentUser=session.user;ready=true;updateAccountUI();if(window.__FIN_DECRYPT_FAILED){
    var remoteLocked=await loadFromCloud();
    if(remoteLocked&&!isEmptyState(remoteLocked)){
      try{window.__FIN_DECRYPT_FAILED=false;window.__FIN_LOCKED_RAW=null;}catch(e){}
      if(typeof window.recoverLockedState==='function'){
        if(window.recoverLockedState(remoteLocked,'cloud')){
          writeBase(remoteLocked);
          toast('Касса восстановлена из облака');
          return;
        }
      }
      applyState(remoteLocked,'Восстановлено из облака');
      writeBase(remoteLocked);
      toast('Касса восстановлена из облака');
      return;
    }
    toast('Локальные данные зашифрованы и не открылись. Облако пусто — импортируй JSON из Загрузки/Finna.');
    return;
  }var local=readLocal(),remote=await loadFromCloud(),base=readBase(),clearAt=clearIntent();
if(remote&&!isEmptyState(remote)&&(isEmptyState(local)||!local)){try{localStorage.removeItem(CLEAR_INTENT);}catch(e){}applyState(remote,'Восстановлено из облака');writeBase(remote);toast('Данные восстановлены из облака');return;}
if(clearAt&&(!remote||clearAt>(Date.parse(remote.updatedAt)||0))){if(remote&&!isEmptyState(remote)){try{localStorage.removeItem(CLEAR_INTENT);}catch(e){}applyState(remote,'Облако важнее локального сброса');writeBase(remote);return;}local=stamp(local||{});applyState(local,'Локальное очищенное состояние подготовлено');await saveToCloud(true);return;}
if(remote){if(base&&localChanged(base,local)&&!isEmptyState(local))applyState(threeWay(base,local,remote),'Изменения объединены');else if(!base&&!isEmptyState(local))applyState(threeWay(null,local,remote),'Локальные изменения объединены с облаком');else applyState(remote,'Данные аккаунта загружены');if(!isEmptyState(local)||!remote)await saveToCloud(false);}else if(local&&!isEmptyState(local)){applyState(local,'Локальные данные → облако');await saveToCloud(true);}else{var empty=typeof window.defaultState==='function'?window.defaultState():{};applyState(empty);}
}catch(e){console.error('[cloud] session',e);scheduleRetry();toast('Ошибка облака: '+(e.message||''));}finally{loading=false;}}
async function bootCloud(){try{await loadSDK();var c=client();if(!c)throw new Error('Клиент не готов');var res=await c.auth.getSession();await onSession(res.data&&res.data.session);c.auth.onAuthStateChange(function(ev,session){if(ev==='SIGNED_OUT'){currentUser=null;ready=false;lastSent='';updateAccountUI();return;}if(ev==='SIGNED_IN'||ev==='TOKEN_REFRESHED'||ev==='INITIAL_SESSION')setTimeout(function(){onSession(session);},0);});}catch(e){console.error('[cloud] boot',e);setStatus(false,navigator.onLine?'Облако недоступно':'Офлайн');}window.addEventListener('online',function(){updateAccountUI();if(currentUser)syncNow();});window.addEventListener('offline',function(){updateAccountUI();});document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&currentUser&&navigator.onLine){/* тихий sync, без toast */saveToCloud(false);}});window.addEventListener('pagehide',function(){if(currentUser&&navigator.onLine)saveToCloud(false);});var btn=document.getElementById('btnCloud');if(btn)btn.onclick=showAuth;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootCloud);else bootCloud();
window.kopeykaCloud={save:function(){return syncNow();},user:function(){return currentUser;},scheduleSave:scheduleSave,load:function(){return loadFromCloud();},showAuth:showAuth,markLocalReset:function(){setClearIntent();},
  threeWay:threeWay,isEmptyState:isEmptyState,liveDivergedFrom:liveDivergedFrom,cashAtMonth:cashAtMonth,
  forceRestore:async function(){try{if(!currentUser){toast('Сначала войди в облако');if(typeof showAuth==='function')showAuth();return false;}var remote=await loadFromCloud();if(!remote||isEmptyState(remote)){toast('В облаке пусто — восстанавливать нечего');return false;}try{localStorage.removeItem(CLEAR_INTENT);}catch(e){}if(window.__FIN_DECRYPT_FAILED){try{window.__FIN_DECRYPT_FAILED=false;window.__FIN_LOCKED_RAW=null;}catch(e){}if(typeof window.recoverLockedState==='function'&&window.recoverLockedState(remote,'cloud')){writeBase(remote);toast('Данные восстановлены из облака');return true;}}applyState(remote,'Принудительно восстановлено из облака');writeBase(remote);toast('Данные восстановлены из облака');return true;}catch(e){toast('Ошибка восстановления: '+(e.message||''));return false;}}
};
})();
