(function(){
'use strict';
/**
 * Финна — Рацион / корзина · МАГНИТ (Кисловодск)
 * Цены: стартовые по типичному Магниту + можно править.
 * Полный онлайн-каталог конкретной точки — следующий шаг (нужен код магазина).
 */
var MEAL_KEY='kopeyka3_meal_v1';
var CATALOG=[
 {id:'milk_1l',name:'Молоко 1 л',unit:'шт',cat:'Молочка',price:89,q:'молоко 1л'},
 {id:'kefir_1l',name:'Кефир 1 л',unit:'шт',cat:'Молочка',price:95,q:'кефир'},
 {id:'sourcream_20',name:'Сметана 20% 300г',unit:'шт',cat:'Молочка',price:79,q:'сметана'},
 {id:'cottage_180',name:'Творог 180г',unit:'шт',cat:'Молочка',price:72,q:'творог'},
 {id:'eggs_10',name:'Яйца С1 10 шт',unit:'шт',cat:'Молочка',price:110,q:'яйца 10'},
 {id:'butter_180',name:'Масло сливочное 180г',unit:'шт',cat:'Молочка',price:165,q:'масло сливочное'},
 {id:'cheese_200',name:'Сыр 200г',unit:'шт',cat:'Молочка',price:189,q:'сыр'},
 {id:'chicken_1kg',name:'Курица 1 кг',unit:'кг',cat:'Мясо',price:249,q:'курица'},
 {id:'mince_1kg',name:'Фарш 1 кг',unit:'кг',cat:'Мясо',price:320,q:'фарш'},
 {id:'pork_1kg',name:'Свинина 1 кг',unit:'кг',cat:'Мясо',price:380,q:'свинина'},
 {id:'beef_1kg',name:'Говядина 1 кг',unit:'кг',cat:'Мясо',price:520,q:'говядина'},
 {id:'sausage_400',name:'Колбаса 400г',unit:'шт',cat:'Мясо',price:210,q:'колбаса'},
 {id:'fish_1kg',name:'Рыба 1 кг',unit:'кг',cat:'Рыба',price:280,q:'минтай'},
 {id:'bread',name:'Хлеб белый',unit:'шт',cat:'Хлеб',price:45,q:'хлеб'},
 {id:'bread_bk',name:'Хлеб бородинский',unit:'шт',cat:'Хлеб',price:52,q:'бородинский'},
 {id:'pasta_400',name:'Макароны 400г',unit:'шт',cat:'Бакалея',price:68,q:'макароны'},
 {id:'rice_1kg',name:'Рис 1 кг',unit:'шт',cat:'Бакалея',price:95,q:'рис'},
 {id:'buckwheat_1kg',name:'Гречка 1 кг',unit:'шт',cat:'Бакалея',price:85,q:'гречка'},
 {id:'oats_400',name:'Овсянка 400г',unit:'шт',cat:'Бакалея',price:55,q:'овсянка'},
 {id:'flour_1kg',name:'Мука 1 кг',unit:'шт',cat:'Бакалея',price:55,q:'мука'},
 {id:'sugar_1kg',name:'Сахар 1 кг',unit:'шт',cat:'Бакалея',price:65,q:'сахар'},
 {id:'oil_1l',name:'Масло подсолн. 1 л',unit:'шт',cat:'Бакалея',price:120,q:'масло подсолнечное'},
 {id:'potato_1kg',name:'Картофель 1 кг',unit:'кг',cat:'Овощи',price:45,q:'картофель'},
 {id:'carrot_1kg',name:'Морковь 1 кг',unit:'кг',cat:'Овощи',price:40,q:'морковь'},
 {id:'onion_1kg',name:'Лук 1 кг',unit:'кг',cat:'Овощи',price:35,q:'лук'},
 {id:'cabbage_1kg',name:'Капуста 1 кг',unit:'кг',cat:'Овощи',price:30,q:'капуста'},
 {id:'tomato_1kg',name:'Помидоры 1 кг',unit:'кг',cat:'Овощи',price:160,q:'помидоры'},
 {id:'cucumber_1kg',name:'Огурцы 1 кг',unit:'кг',cat:'Овощи',price:140,q:'огурцы'},
 {id:'apple_1kg',name:'Яблоки 1 кг',unit:'кг',cat:'Фрукты',price:120,q:'яблоки'},
 {id:'banana_1kg',name:'Бананы 1 кг',unit:'кг',cat:'Фрукты',price:110,q:'бананы'},
 {id:'tea_25',name:'Чай 25 пак.',unit:'шт',cat:'Напитки',price:90,q:'чай'},
 {id:'coffee_100',name:'Кофе 100г',unit:'шт',cat:'Напитки',price:180,q:'кофе'},
 {id:'water_5l',name:'Вода 5 л',unit:'шт',cat:'Напитки',price:70,q:'вода 5'}
];
var DAY_TEMPLATES={
 maintain:[
  {title:'Обычный день',meals:[
   {name:'Завтрак: каша + яйцо',items:[{id:'oats_400',qty:0.15},{id:'eggs_10',qty:0.2},{id:'milk_1l',qty:0.2}]},
   {name:'Обед: курица + гречка',items:[{id:'chicken_1kg',qty:0.2},{id:'buckwheat_1kg',qty:0.1},{id:'carrot_1kg',qty:0.1},{id:'onion_1kg',qty:0.05}]},
   {name:'Ужин: рыба + овощи',items:[{id:'fish_1kg',qty:0.2},{id:'cabbage_1kg',qty:0.2},{id:'oil_1l',qty:0.02}]}
  ]},
  {title:'День с фаршем',meals:[
   {name:'Завтрак: творог',items:[{id:'cottage_180',qty:1},{id:'banana_1kg',qty:0.15}]},
   {name:'Обед: котлеты + макароны',items:[{id:'mince_1kg',qty:0.25},{id:'pasta_400',qty:0.5},{id:'onion_1kg',qty:0.05}]},
   {name:'Ужин: яйца + салат',items:[{id:'eggs_10',qty:0.3},{id:'cucumber_1kg',qty:0.2},{id:'tomato_1kg',qty:0.15}]}
  ]}
 ],
 lose:[{title:'Лёгкий день',meals:[
  {name:'Завтрак: овсянка + яблоко',items:[{id:'oats_400',qty:0.12},{id:'apple_1kg',qty:0.2}]},
  {name:'Обед: курица + овощи',items:[{id:'chicken_1kg',qty:0.18},{id:'cabbage_1kg',qty:0.25},{id:'carrot_1kg',qty:0.1}]},
  {name:'Ужин: творог + огурец',items:[{id:'cottage_180',qty:1},{id:'cucumber_1kg',qty:0.2}]}
 ]}],
 gain:[{title:'День на массу',meals:[
  {name:'Завтрак: каша + яйца',items:[{id:'oats_400',qty:0.2},{id:'milk_1l',qty:0.3},{id:'eggs_10',qty:0.3},{id:'bread',qty:1}]},
  {name:'Обед: мясо + рис',items:[{id:'beef_1kg',qty:0.25},{id:'rice_1kg',qty:0.15},{id:'tomato_1kg',qty:0.15},{id:'oil_1l',qty:0.03}]},
  {name:'Ужин: творог + банан',items:[{id:'cottage_180',qty:2},{id:'banana_1kg',qty:0.2},{id:'bread',qty:1}]}
 ]}]
};
function load(){try{var r=localStorage.getItem(MEAL_KEY);if(r){var o=JSON.parse(r);if(o)return o;}}catch(e){}return{storeId:'magnit',priceOverrides:{},lastPlan:null,settings:{budgetMonth:0,adults:1,children:0,goal:'maintain'}};}
function save(st){try{localStorage.setItem(MEAL_KEY,JSON.stringify(st));}catch(e){}}
function num(v){if(typeof v==='number')return isFinite(v)?Math.round(v):0;var n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));return(!isFinite(n)||n!==n)?0:Math.round(n);}
function fmt(n){n=Math.round(+n||0);return(n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽';}
function esc(s){return String(s==null?'':s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');}
function getCatalog(){var st=load();return CATALOG.map(function(p){var price=st.priceOverrides[p.id]!=null?num(st.priceOverrides[p.id]):num(p.price);return Object.assign({},p,{price:price});});}
function setPrice(id,price){var st=load();st.priceOverrides[id]=Math.max(0,num(price));save(st);}
function productById(id){var list=getCatalog();for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return null;}
function buildPlan(opts){
 opts=opts||{};var st=load();
 var goal=opts.goal||st.settings.goal||'maintain';
 var adults=Math.max(1,num(opts.adults!=null?opts.adults:st.settings.adults)||1);
 var children=Math.max(0,num(opts.children!=null?opts.children:st.settings.children));
 var budgetMonth=Math.max(0,num(opts.budgetMonth!=null?opts.budgetMonth:st.settings.budgetMonth));
 if(!budgetMonth){try{var bl=(window.STATE&&STATE.settings&&STATE.settings.budgetLimits)||{};budgetMonth=num(bl['Продукты']);}catch(e){}}
 var days=Math.max(7,Math.min(31,num(opts.days)||30));
 var peopleFactor=adults+children*0.65;
 var budgetTotal=budgetMonth;if(days<28)budgetTotal=Math.round(budgetMonth*(days/30));
 var templates=DAY_TEMPLATES[goal]||DAY_TEMPLATES.maintain;
 var catalog=getCatalog(),byId={};catalog.forEach(function(p){byId[p.id]=p;});
 var basket={},menu=[];
 for(var d=0;d<days;d++){
  var tpl=templates[d%templates.length],dayMeals=[];
  (tpl.meals||[]).forEach(function(meal){
   var lines=[];
   (meal.items||[]).forEach(function(it){
    var qty=num(it.qty)*peopleFactor;if(!basket[it.id])basket[it.id]=0;basket[it.id]+=qty;
    var p=byId[it.id];lines.push({id:it.id,name:p?p.name:it.id,qty:Math.round(qty*100)/100,unit:p?p.unit:'шт',price:p?p.price:0,cost:p?Math.round(p.price*qty):0});
   });
   dayMeals.push({name:meal.name,lines:lines});
  });
  menu.push({day:d+1,title:tpl.title,meals:dayMeals});
 }
 var basketList=[],total=0;
 Object.keys(basket).forEach(function(id){
  var p=byId[id];if(!p)return;var q=Math.ceil(basket[id]*10)/10;var cost=Math.round(p.price*q);total+=cost;
  basketList.push({id:id,name:p.name,cat:p.cat,unit:p.unit,qty:q,price:p.price,cost:cost});
 });
 basketList.sort(function(a,b){return(a.cat||'').localeCompare(b.cat||'')||a.name.localeCompare(b.name);});
 var fits=!budgetTotal||total<=budgetTotal;
 var note=budgetTotal?(total>budgetTotal?('Корзина '+fmt(total)+' при бюджете '+fmt(budgetTotal)):('В бюджете: '+fmt(total)+' из '+fmt(budgetTotal))):'';
 var plan={id:'mp_'+Date.now().toString(36),createdAt:new Date().toISOString(),storeId:'magnit',storeName:'Магнит',goal:goal,adults:adults,children:children,days:days,budgetMonth:budgetMonth,budgetForPeriod:budgetTotal,total:total,fits:fits,note:note,menu:menu.slice(0,7),menuFullDays:days,basket:basketList};
 st.settings={budgetMonth:budgetMonth,adults:adults,children:children,goal:goal};st.lastPlan=plan;st.storeId='magnit';save(st);return plan;
}
function mealHtml(){
 var st=load(),s=st.settings||{},plan=st.lastPlan,cat=getCatalog(),html='';
 html+='<div class="view-header"><button type="button" class="back-btn" data-act="go-home">←</button><h2>Рацион · Магнит</h2></div>';
 html+='<div class="card tight"><div class="card-title">Магазин</div><div style="font-weight:700">Магнит · Кисловодск</div>';
 html+='<div class="muted" style="font-size:12px;margin-top:4px;line-height:1.4">Цены в каталоге — ориентир по Магниту. Нажми цену и поставь как в твоей точке — расчёт станет точным. Полный автокаталог магазина подключим отдельно (нужен код точки).</div></div>';
 html+='<div class="card tight"><div class="card-title">Параметры</div>';
 html+='<label class="muted">Бюджет на еду в месяц, ₽</label><input id="mealBudget" type="number" value="'+(s.budgetMonth||'')+'" placeholder="25000" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
 html+='<label class="muted">Взрослых</label><input id="mealAdults" type="number" min="1" value="'+(s.adults||1)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
 html+='<label class="muted">Детей</label><input id="mealChildren" type="number" min="0" value="'+(s.children||0)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
 html+='<label class="muted">Цель</label><select id="mealGoal" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text);margin:6px 0">';
 [['maintain','Как обычно'],['lose','Похудеть'],['gain','Набрать массу']].forEach(function(o){html+='<option value="'+o[0]+'"'+(s.goal===o[0]?' selected':'')+'>'+o[1]+'</option>';});
 html+='</select><button type="button" class="btn-shift" id="mealBuildBtn" style="margin-top:12px">Собрать рацион на месяц</button></div>';
 if(plan){
  html+='<div class="card tight"><div class="card-title">План</div><div style="font-weight:700;font-size:15px">'+fmt(plan.total)+(plan.budgetForPeriod?(' / '+fmt(plan.budgetForPeriod)):'')+'</div>';
  html+='<div class="muted" style="font-size:12px;margin:6px 0 10px">'+(plan.note||'')+'</div><div class="card-title">Корзина Магнит</div><div class="list">';
  (plan.basket||[]).forEach(function(b){html+='<div class="item"><div class="left"><b>'+esc(b.name)+'</b><span class="muted">'+b.qty+' '+b.unit+' × '+fmt(b.price)+'</span></div><div class="amt">'+fmt(b.cost)+'</div></div>';});
  html+='</div><div class="card-title" style="margin-top:12px">Меню (7 дней)</div>';
  (plan.menu||[]).forEach(function(day){html+='<div style="margin:8px 0 4px;font-weight:700">День '+day.day+' · '+esc(day.title)+'</div>';(day.meals||[]).forEach(function(m){html+='<div class="muted" style="font-size:13px">'+esc(m.name)+'</div>';});});
  html+='</div>';
 }
 html+='<div class="card tight"><div class="card-title">Каталог · цены Магнит</div><div class="muted" style="font-size:12px;margin-bottom:8px">Нажми цену = как в твоём Магните</div><div class="list">';
 var last='';cat.forEach(function(p){if(p.cat!==last){last=p.cat;html+='<div class="muted" style="font-size:11px;margin-top:8px">'+esc(p.cat)+'</div>';}html+='<div class="item"><div class="left"><b>'+esc(p.name)+'</b></div><button type="button" class="amt" data-edit-price="'+esc(p.id)+'" style="background:rgba(232,166,87,.12);border-radius:10px;padding:6px 10px">'+fmt(p.price)+'</button></div>';});
 html+='</div></div><div class="hint">Открыть: goView("meal"). Кнопку на главный — в следующем шаге. Живые цены по коду магазина Магнит — следующий этап.</div>';
 return html;
}
function bindMealUI(root){
 root=root||document;var build=root.querySelector('#mealBuildBtn');
 if(build)build.onclick=function(){var plan=buildPlan({budgetMonth:num((root.querySelector('#mealBudget')||{}).value),adults:num((root.querySelector('#mealAdults')||{}).value)||1,children:num((root.querySelector('#mealChildren')||{}).value),goal:((root.querySelector('#mealGoal')||{}).value)||'maintain',days:30});try{if(typeof toast==='function')toast(fmt(plan.total));}catch(e){}try{if(typeof goView==='function')goView('meal');else if(typeof render==='function')render();}catch(e){};};
 root.querySelectorAll('[data-edit-price]').forEach(function(btn){btn.onclick=function(){var id=btn.getAttribute('data-edit-price');var p=productById(id);var v=prompt('Цена в Магните, ₽',String(p?p.price:0));if(v==null)return;setPrice(id,v);try{if(typeof goView==='function')goView('meal');else if(typeof render==='function')render();}catch(e){};};});
}
function tryHookApp(){
 window.MealPlan={buildPlan:buildPlan,getCatalog:getCatalog,setPrice:setPrice,html:mealHtml,bind:bindMealUI};
 var tries=0;function patchRender(){tries++;if(typeof window.render!=='function'){if(tries<30)setTimeout(patchRender,200);return;}if(window.render.__mealPatched)return;var orig=window.render;window.render=function(){try{if((window.currentView||window.__finView)==='meal'){var r=orig.apply(this,arguments);setTimeout(function(){var wrap=document.querySelector('.wrap');if(wrap){wrap.innerHTML=mealHtml();bindMealUI(wrap);}},0);return r;}}catch(e){}return orig.apply(this,arguments);};window.render.__mealPatched=true;}
 patchRender();
 document.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.closest)return;if(t.closest('[data-act="open-meal"]')){ev.preventDefault();window.currentView='meal';window.__finView='meal';if(typeof goView==='function')goView('meal');else if(typeof render==='function')render();}if(t.closest('[data-act="go-home"]')){if(typeof goHome==='function')goHome();else if(typeof goView==='function')goView('home');}},true);
 console.log('[FINNA meal-plan] Магнит');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tryHookApp);else tryHookApp();
})();
