(function(){
'use strict';
var MEAL_KEY='kopeyka3_meal_v1';
var STORE={id:'magnit',name:'Магнит',address:'Седлогорская, 89',city:'Кисловодск'};
var CATALOG=[
 {id:'milk_1l',name:'Молоко 1 л',unit:'шт',cat:'Молочка',price:89},
 {id:'kefir_1l',name:'Кефир 1 л',unit:'шт',cat:'Молочка',price:95},
 {id:'sourcream_20',name:'Сметана 20% 300г',unit:'шт',cat:'Молочка',price:79},
 {id:'cottage_180',name:'Творог 180г',unit:'шт',cat:'Молочка',price:72},
 {id:'eggs_10',name:'Яйца С1 10 шт',unit:'шт',cat:'Молочка',price:110},
 {id:'butter_180',name:'Масло сливочное 180г',unit:'шт',cat:'Молочка',price:165},
 {id:'cheese_200',name:'Сыр 200г',unit:'шт',cat:'Молочка',price:189},
 {id:'chicken_1kg',name:'Курица 1 кг',unit:'кг',cat:'Мясо',price:249},
 {id:'mince_1kg',name:'Фарш 1 кг',unit:'кг',cat:'Мясо',price:320},
 {id:'pork_1kg',name:'Свинина 1 кг',unit:'кг',cat:'Мясо',price:380},
 {id:'beef_1kg',name:'Говядина 1 кг',unit:'кг',cat:'Мясо',price:520},
 {id:'sausage_400',name:'Колбаса 400г',unit:'шт',cat:'Мясо',price:210},
 {id:'fish_1kg',name:'Рыба 1 кг',unit:'кг',cat:'Рыба',price:280},
 {id:'bread',name:'Хлеб белый',unit:'шт',cat:'Хлеб',price:45},
 {id:'bread_bk',name:'Хлеб бородинский',unit:'шт',cat:'Хлеб',price:52},
 {id:'pasta_400',name:'Макароны 400г',unit:'шт',cat:'Бакалея',price:68},
 {id:'rice_1kg',name:'Рис 1 кг',unit:'шт',cat:'Бакалея',price:95},
 {id:'buckwheat_1kg',name:'Гречка 1 кг',unit:'шт',cat:'Бакалея',price:85},
 {id:'oats_400',name:'Овсянка 400г',unit:'шт',cat:'Бакалея',price:55},
 {id:'flour_1kg',name:'Мука 1 кг',unit:'шт',cat:'Бакалея',price:55},
 {id:'sugar_1kg',name:'Сахар 1 кг',unit:'шт',cat:'Бакалея',price:65},
 {id:'oil_1l',name:'Масло подсолн. 1 л',unit:'шт',cat:'Бакалея',price:120},
 {id:'potato_1kg',name:'Картофель 1 кг',unit:'кг',cat:'Овощи',price:45},
 {id:'carrot_1kg',name:'Морковь 1 кг',unit:'кг',cat:'Овощи',price:40},
 {id:'onion_1kg',name:'Лук 1 кг',unit:'кг',cat:'Овощи',price:35},
 {id:'cabbage_1kg',name:'Капуста 1 кг',unit:'кг',cat:'Овощи',price:30},
 {id:'tomato_1kg',name:'Помидоры 1 кг',unit:'кг',cat:'Овощи',price:160},
 {id:'cucumber_1kg',name:'Огурцы 1 кг',unit:'кг',cat:'Овощи',price:140},
 {id:'apple_1kg',name:'Яблоки 1 кг',unit:'кг',cat:'Фрукты',price:120},
 {id:'banana_1kg',name:'Бананы 1 кг',unit:'кг',cat:'Фрукты',price:110},
 {id:'tea_25',name:'Чай 25 пак.',unit:'шт',cat:'Напитки',price:90},
 {id:'coffee_100',name:'Кофе 100г',unit:'шт',cat:'Напитки',price:180},
 {id:'water_5l',name:'Вода 5 л',unit:'шт',cat:'Напитки',price:70}
];
var DAY_TEMPLATES={maintain:[{title:'Обычный день',meals:[{name:'Завтрак: каша + яйцо',items:[{id:'oats_400',qty:0.15},{id:'eggs_10',qty:0.2},{id:'milk_1l',qty:0.2}]},{name:'Обед: курица + гречка',items:[{id:'chicken_1kg',qty:0.2},{id:'buckwheat_1kg',qty:0.1},{id:'carrot_1kg',qty:0.1},{id:'onion_1kg',qty:0.05}]},{name:'Ужин: рыба + овощи',items:[{id:'fish_1kg',qty:0.2},{id:'cabbage_1kg',qty:0.2},{id:'oil_1l',qty:0.02}]}]},{title:'День с фаршем',meals:[{name:'Завтрак: творог',items:[{id:'cottage_180',qty:1},{id:'banana_1kg',qty:0.15}]},{name:'Обед: котлеты + макароны',items:[{id:'mince_1kg',qty:0.25},{id:'pasta_400',qty:0.5},{id:'onion_1kg',qty:0.05}]},{name:'Ужин: яйца + салат',items:[{id:'eggs_10',qty:0.3},{id:'cucumber_1kg',qty:0.2},{id:'tomato_1kg',qty:0.15}]}]}],lose:[{title:'Лёгкий день',meals:[{name:'Завтрак: овсянка + яблоко',items:[{id:'oats_400',qty:0.12},{id:'apple_1kg',qty:0.2}]},{name:'Обед: курица + овощи',items:[{id:'chicken_1kg',qty:0.18},{id:'cabbage_1kg',qty:0.25},{id:'carrot_1kg',qty:0.1}]},{name:'Ужин: творог + огурец',items:[{id:'cottage_180',qty:1},{id:'cucumber_1kg',qty:0.2}]}]}],gain:[{title:'День на массу',meals:[{name:'Завтрак: каша + яйца',items:[{id:'oats_400',qty:0.2},{id:'milk_1l',qty:0.3},{id:'eggs_10',qty:0.3},{id:'bread',qty:1}]},{name:'Обед: мясо + рис',items:[{id:'beef_1kg',qty:0.25},{id:'rice_1kg',qty:0.15},{id:'tomato_1kg',qty:0.15},{id:'oil_1l',qty:0.03}]},{name:'Ужин: творог + банан',items:[{id:'cottage_180',qty:2},{id:'banana_1kg',qty:0.2},{id:'bread',qty:1}]}]}]};
function load(){try{var r=localStorage.getItem(MEAL_KEY);if(r){var o=JSON.parse(r);if(o)return o;}}catch(e){}return{storeId:'magnit',priceOverrides:{},lastPlan:null,settings:{budgetMonth:0,adults:1,children:0,goal:'maintain'}};}
function save(st){try{localStorage.setItem(MEAL_KEY,JSON.stringify(st));}catch(e){}}
function num(v){if(typeof v==='number')return isFinite(v)?Math.round(v):0;var n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));return(!isFinite(n)||n!==n)?0:Math.round(n);}
/** Дробные граммовки рациона нельзя округлять Math.round — 0.15 кг становилось 0. */
function qtyOf(v){
  if(typeof v==='number')return isFinite(v)?v:0;
  var n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));
  return(!isFinite(n)||n!==n)?0:n;
}
function packQty(raw,unit){
  if(!(raw>0.0001))return 0;
  if(unit==='кг')return Math.ceil(raw*10-1e-9)/10;
  return Math.max(1,Math.ceil(raw-1e-9));
}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function fmtQty(q,unit){
  if(unit==='кг')return (Math.round(q*10)/10).toLocaleString('ru-RU');
  return String(q);
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
function getCatalog(){var st=load();return CATALOG.map(function(p){var price=st.priceOverrides[p.id]!=null?num(st.priceOverrides[p.id]):num(p.price);return Object.assign({},p,{price:price});});}
function setPrice(id,price){var st=load();st.priceOverrides[id]=Math.max(0,num(price));save(st);}
function productById(id){var list=getCatalog();for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return null;}
function openMeal(){try{window.currentView='meal';window.__finView='meal';}catch(e){}if(typeof window.goView==='function'){try{window.goView('meal');return;}catch(e2){}}if(typeof window.render==='function')window.render();}
function buildPlan(opts){
  opts=opts||{};
  var st=load();
  var goal=opts.goal||st.settings.goal||'maintain';
  var adults=Math.max(1,num(opts.adults!=null?opts.adults:st.settings.adults)||1);
  var children=Math.max(0,num(opts.children!=null?opts.children:st.settings.children));
  var budgetMonth=Math.max(0,num(opts.budgetMonth!=null?opts.budgetMonth:st.settings.budgetMonth));
  if(!budgetMonth){try{var bl=(window.STATE&&window.STATE.settings&&window.STATE.settings.budgetLimits)||{};budgetMonth=num(bl['Продукты']);}catch(e){}}
  var days=Math.max(7,Math.min(31,num(opts.days)||30));
  var peopleFactor=adults+children*0.65;
  var budgetTotal=budgetMonth;
  if(days<28)budgetTotal=Math.round(budgetMonth*(days/30));
  var templates=DAY_TEMPLATES[goal]||DAY_TEMPLATES.maintain;
  var catalog=getCatalog(),byId={};catalog.forEach(function(p){byId[p.id]=p;});
  var basket={},menu=[];
  for(var d=0;d<days;d++){
    var tpl=templates[d%templates.length],dayMeals=[];
    (tpl.meals||[]).forEach(function(meal){
      var lines=[];
      (meal.items||[]).forEach(function(it){
        var qty=qtyOf(it.qty)*peopleFactor;
        if(!(qty>0))return;
        if(!basket[it.id])basket[it.id]=0;
        basket[it.id]+=qty;
        var p=byId[it.id];
        lines.push({id:it.id,name:p?p.name:it.id,qty:Math.round(qty*100)/100,unit:p?p.unit:'шт',price:p?p.price:0,cost:p?Math.round(p.price*qty):0});
      });
      dayMeals.push({name:meal.name,lines:lines});
    });
    menu.push({day:d+1,title:tpl.title,meals:dayMeals});
  }
  var basketList=[],total=0;
  Object.keys(basket).forEach(function(id){
    var p=byId[id];if(!p)return;
    var q=packQty(basket[id],p.unit);
    if(!(q>0))return;
    var cost=Math.round(p.price*q);
    total+=cost;
    basketList.push({id:id,name:p.name,cat:p.cat,unit:p.unit,qty:q,price:p.price,cost:cost});
  });
  basketList.sort(function(a,b){return(a.cat||'').localeCompare(b.cat||'')||a.name.localeCompare(b.name);});
  var fits=!budgetTotal||total<=budgetTotal;
  var note=budgetTotal?(total>budgetTotal?('Корзина '+fmt(total)+' при бюджете '+fmt(budgetTotal)):('В бюджете: '+fmt(total)+' из '+fmt(budgetTotal))):'';
  var plan={id:'mp_'+Date.now().toString(36),createdAt:new Date().toISOString(),storeId:'magnit',storeName:'Магнит',storeAddress:STORE.address,goal:goal,adults:adults,children:children,days:days,budgetMonth:budgetMonth,budgetForPeriod:budgetTotal,total:total,fits:fits,note:note,menu:menu.slice(0,7),menuFullDays:days,basket:basketList};
  st.settings={budgetMonth:budgetMonth,adults:adults,children:children,goal:goal};
  st.lastPlan=plan;st.storeId='magnit';save(st);return plan;
}
function mealHtml(){
  var st=load(),s=st.settings||{},plan=st.lastPlan,cat=getCatalog(),html='';
  html+='<div class="view-header"><button type="button" class="back-btn" data-act="go-home">←</button><h2>Рацион · Магнит</h2></div>';
  html+='<div class="card tight"><div class="sec-title-sm">МАГАЗИН</div><div style="font-weight:700">Магнит · Седлогорская, 89</div><div class="muted" style="font-size:12px;margin-top:4px">Кисловодск. Цены можно поправить под ценник.</div></div>';
  html+='<div class="card tight"><div class="sec-title-sm">ПАРАМЕТРЫ</div>';
  html+='<label class="muted">Бюджет на еду в месяц, ₽</label><input id="mealBudget" type="number" value="'+(s.budgetMonth||'')+'" placeholder="25000" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
  html+='<label class="muted">Взрослых</label><input id="mealAdults" type="number" min="1" value="'+(s.adults||1)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
  html+='<label class="muted">Детей</label><input id="mealChildren" type="number" min="0" value="'+(s.children||0)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
  html+='<label class="muted">Цель</label><select id="mealGoal" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
  [['maintain','Как обычно'],['lose','Похудеть'],['gain','Набрать массу']].forEach(function(o){html+='<option value="'+o[0]+'"'+(s.goal===o[0]?' selected':'')+'>'+o[1]+'</option>';});
  html+='</select><button type="button" class="btn-shift" id="mealBuildBtn" style="margin-top:12px">Собрать рацион на месяц</button></div>';
  if(plan){
    html+='<div class="card tight"><div class="sec-title-sm">ПЛАН</div><div style="font-weight:700;font-size:15px">'+fmt(plan.total)+(plan.budgetForPeriod?(' / '+fmt(plan.budgetForPeriod)):'')+'</div>';
    html+='<div class="muted" style="font-size:12px;margin:6px 0 10px">'+(plan.fits===false?'⚠️ ':'')+esc(plan.note||'')+'</div><div class="sec-title-sm">КОРЗИНА</div><div class="list">';
    (plan.basket||[]).forEach(function(b){
      if(!(b.qty>0))return;
      html+='<div class="item"><div class="left"><b>'+esc(b.name)+'</b><span class="muted">'+esc(fmtQty(b.qty,b.unit))+' '+esc(b.unit)+' × '+fmt(b.price)+'</span></div><div class="amt">'+fmt(b.cost)+'</div></div>';
    });
    html+='</div><div class="sec-title-sm" style="margin-top:12px">МЕНЮ (7 ДНЕЙ)</div>';
    (plan.menu||[]).forEach(function(day){
      html+='<div style="margin:8px 0 4px;font-weight:700">День '+day.day+' · '+esc(day.title)+'</div>';
      (day.meals||[]).forEach(function(m){html+='<div class="muted" style="font-size:13px">'+esc(m.name)+'</div>';});
    });
    html+='</div>';
  }
  html+='<div class="card tight"><div class="sec-title-sm">КАТАЛОГ · ЦЕНЫ</div><div class="list">';
  var last='';
  cat.forEach(function(p){
    if(p.cat!==last){last=p.cat;html+='<div class="muted" style="font-size:11px;margin-top:8px">'+esc(p.cat)+'</div>';}
    html+='<div class="item"><div class="left"><b>'+esc(p.name)+'</b></div><button type="button" class="amt" data-edit-price="'+esc(p.id)+'" style="background:rgba(232,166,87,.12);border-radius:10px;padding:6px 10px">'+fmt(p.price)+'</button></div>';
  });
  html+='</div></div>';
  return html;
}
function bindMealUI(root){
  root=root||document;
  var build=root.querySelector('#mealBuildBtn');
  if(build)build.onclick=function(){
    buildPlan({budgetMonth:num((root.querySelector('#mealBudget')||{}).value),adults:num((root.querySelector('#mealAdults')||{}).value)||1,children:num((root.querySelector('#mealChildren')||{}).value),goal:((root.querySelector('#mealGoal')||{}).value)||'maintain',days:30});
    try{if(typeof toast==='function')toast('План собран');}catch(e){}
    openMeal();
  };
  root.querySelectorAll('[data-edit-price]').forEach(function(btn){
    btn.onclick=function(){
      var id=btn.getAttribute('data-edit-price');
      var p=productById(id);
      var ask=(typeof window.appPrompt==='function')?window.appPrompt('Цена в Магните, ₽',String(p?p.price:0),'Цена'):Promise.resolve(window.prompt('Цена в Магните, ₽',String(p?p.price:0)));
      Promise.resolve(ask).then(function(v){
        if(v==null||v==='')return;
        setPrice(id,v);
        openMeal();
      });
    };
  });
}
function injectHomeBtn(){
  try{
    if(window.__finView==='meal'||window.currentView==='meal')return;
    if(document.getElementById('mealHomeCard'))return;
    var wrap=document.querySelector('.wrap');
    if(!wrap)return;
    if(!wrap.querySelector('.card')&&!wrap.querySelector('.sec'))return;
    var hero=wrap.querySelector('.card.hero');
    var anchor=hero||wrap.querySelector('.card')||wrap.querySelector('.sec');
    var card=document.createElement('div');
    card.id='mealHomeCard';
    card.className='card tight';
    card.style.cssText='cursor:pointer;border-color:rgba(232,166,87,.35)';
    card.setAttribute('data-act','open-meal');
    card.innerHTML='<div class="sec-title-sm">РАЦИОН · МАГНИТ</div><div style="font-size:14px;font-weight:700;margin-bottom:4px">Седлогорская, 89</div><div class="muted" style="font-size:12px;margin-bottom:10px">Собрать меню и корзину в бюджет</div><button type="button" class="link-more" data-act="open-meal">Открыть рацион →</button>';
    if(anchor&&anchor.parentNode){
      if(anchor.nextSibling)anchor.parentNode.insertBefore(card,anchor.nextSibling);
      else anchor.parentNode.appendChild(card);
    }else wrap.appendChild(card);
  }catch(e){}
}
function tryHookApp(){
  window.MealPlan={buildPlan:buildPlan,getCatalog:getCatalog,setPrice:setPrice,html:mealHtml,bind:bindMealUI,open:openMeal,qtyOf:qtyOf,packQty:packQty};
  var tries=0;
  function patchRender(){
    tries++;
    if(typeof window.render!=='function'){if(tries<50)setTimeout(patchRender,120);return;}
    if(window.render.__mealFull)return;
    var orig=window.render;
    window.render=function(){
      var isMeal=(window.currentView||window.__finView)==='meal';
      var r=orig.apply(this,arguments);
      var wrap=document.querySelector('.wrap')||document.getElementById('app');
      if(isMeal){
        setTimeout(function(){
          if(!wrap)return;
          if(!wrap.querySelector('#mealBuildBtn')){
            wrap.innerHTML=mealHtml();
          }
          bindMealUI(wrap);
        },0);
      }else{
        setTimeout(injectHomeBtn,20);
        setTimeout(injectHomeBtn,120);
        setTimeout(injectHomeBtn,400);
      }
      return r;
    };
    window.render.__mealFull=true;
  }
  patchRender();
  document.addEventListener('click',function(ev){
    var t=ev.target;
    if(!t||!t.closest)return;
    if(t.closest('[data-act="open-meal"]')){
      ev.preventDefault();
      ev.stopPropagation();
      openMeal();
    }
    if(t.closest('[data-act="go-home"]')){
      try{window.currentView='home';window.__finView='home';}catch(e){}
      if(typeof goHome==='function')goHome();
      else if(typeof render==='function')render();
    }
  },true);
  [300,800,1500,3000,6000].forEach(function(ms){setTimeout(injectHomeBtn,ms);});
  try{
    var mo=new MutationObserver(function(){setTimeout(injectHomeBtn,30);});
    mo.observe(document.body,{childList:true,subtree:true});
  }catch(e){}
  console.log('[FINNA] meal-plan Магнит Седлогорская 4.13.2 qty-fix');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryHookApp);else tryHookApp();
})();
