(function(){
'use strict';
/**
 * Финна — Рацион / корзина
 * Магазин по умолчанию: «Огни» (Кисловодск)
 *
 * У «Огни» нет открытого сайта/API с полным каталогом.
 * Цены: каталог в приложении + твои правки под ценник в зале.
 */

var MEAL_KEY = 'kopeyka3_meal_v1';

var STORES = [
  { id: 'ogni', name: 'Огни', city: 'Кисловодск', note: 'Основной. Цены из каталога + твои правки.' },
  { id: 'magnit', name: 'Магнит (справочно)', city: 'Кисловодск', note: 'Только ориентир, не цены Огни.' }
];

var OGNI_CATALOG = [
  { id: 'milk_1l', name: 'Молоко 1 л', unit: 'шт', cat: 'Молочка', price: 89 },
  { id: 'kefir_1l', name: 'Кефир 1 л', unit: 'шт', cat: 'Молочка', price: 95 },
  { id: 'sourcream_20', name: 'Сметана 20% 300г', unit: 'шт', cat: 'Молочка', price: 79 },
  { id: 'cottage_180', name: 'Творог 180г', unit: 'шт', cat: 'Молочка', price: 72 },
  { id: 'eggs_10', name: 'Яйца С1 10 шт', unit: 'шт', cat: 'Молочка', price: 110 },
  { id: 'butter_180', name: 'Масло сливочное 180г', unit: 'шт', cat: 'Молочка', price: 165 },
  { id: 'cheese_200', name: 'Сыр российский 200г', unit: 'шт', cat: 'Молочка', price: 189 },
  { id: 'chicken_1kg', name: 'Курица (тушка/филе) 1 кг', unit: 'кг', cat: 'Мясо', price: 249 },
  { id: 'mince_1kg', name: 'Фарш 1 кг', unit: 'кг', cat: 'Мясо', price: 320 },
  { id: 'pork_1kg', name: 'Свинина 1 кг', unit: 'кг', cat: 'Мясо', price: 380 },
  { id: 'beef_1kg', name: 'Говядина 1 кг', unit: 'кг', cat: 'Мясо', price: 520 },
  { id: 'sausage_400', name: 'Колбаса варёная 400г', unit: 'шт', cat: 'Мясо', price: 210 },
  { id: 'fish_1kg', name: 'Рыба (минтай/хек) 1 кг', unit: 'кг', cat: 'Рыба', price: 280 },
  { id: 'bread', name: 'Хлеб белый', unit: 'шт', cat: 'Хлеб', price: 45 },
  { id: 'bread_bk', name: 'Хлеб бородинский', unit: 'шт', cat: 'Хлеб', price: 52 },
  { id: 'pasta_400', name: 'Макароны 400г', unit: 'шт', cat: 'Бакалея', price: 68 },
  { id: 'rice_1kg', name: 'Рис 1 кг', unit: 'шт', cat: 'Бакалея', price: 95 },
  { id: 'buckwheat_1kg', name: 'Гречка 1 кг', unit: 'шт', cat: 'Бакалея', price: 85 },
  { id: 'oats_400', name: 'Овсянка 400г', unit: 'шт', cat: 'Бакалея', price: 55 },
  { id: 'flour_1kg', name: 'Мука 1 кг', unit: 'шт', cat: 'Бакалея', price: 55 },
  { id: 'sugar_1kg', name: 'Сахар 1 кг', unit: 'шт', cat: 'Бакалея', price: 65 },
  { id: 'oil_1l', name: 'Масло подсолнечное 1 л', unit: 'шт', cat: 'Бакалея', price: 120 },
  { id: 'potato_1kg', name: 'Картофель 1 кг', unit: 'кг', cat: 'Овощи', price: 45 },
  { id: 'carrot_1kg', name: 'Морковь 1 кг', unit: 'кг', cat: 'Овощи', price: 40 },
  { id: 'onion_1kg', name: 'Лук 1 кг', unit: 'кг', cat: 'Овощи', price: 35 },
  { id: 'cabbage_1kg', name: 'Капуста 1 кг', unit: 'кг', cat: 'Овощи', price: 30 },
  { id: 'tomato_1kg', name: 'Помидоры 1 кг', unit: 'кг', cat: 'Овощи', price: 160 },
  { id: 'cucumber_1kg', name: 'Огурцы 1 кг', unit: 'кг', cat: 'Овощи', price: 140 },
  { id: 'apple_1kg', name: 'Яблоки 1 кг', unit: 'кг', cat: 'Фрукты', price: 120 },
  { id: 'banana_1kg', name: 'Бананы 1 кг', unit: 'кг', cat: 'Фрукты', price: 110 },
  { id: 'tea_25', name: 'Чай 25 пак.', unit: 'шт', cat: 'Напитки', price: 90 },
  { id: 'coffee_100', name: 'Кофе молотый 100г', unit: 'шт', cat: 'Напитки', price: 180 },
  { id: 'water_5l', name: 'Вода 5 л', unit: 'шт', cat: 'Напитки', price: 70 }
];

var DAY_TEMPLATES = {
  maintain: [
    { title: 'Обычный день', meals: [
      { name: 'Завтрак: каша + яйцо', items: [{ id: 'oats_400', qty: 0.15 }, { id: 'eggs_10', qty: 0.2 }, { id: 'milk_1l', qty: 0.2 }] },
      { name: 'Обед: курица + гречка + овощи', items: [{ id: 'chicken_1kg', qty: 0.2 }, { id: 'buckwheat_1kg', qty: 0.1 }, { id: 'carrot_1kg', qty: 0.1 }, { id: 'onion_1kg', qty: 0.05 }] },
      { name: 'Ужин: рыба + овощи', items: [{ id: 'fish_1kg', qty: 0.2 }, { id: 'cabbage_1kg', qty: 0.2 }, { id: 'oil_1l', qty: 0.02 }] }
    ]},
    { title: 'День с фаршем', meals: [
      { name: 'Завтрак: творог', items: [{ id: 'cottage_180', qty: 1 }, { id: 'banana_1kg', qty: 0.15 }] },
      { name: 'Обед: котлеты + макароны', items: [{ id: 'mince_1kg', qty: 0.25 }, { id: 'pasta_400', qty: 0.5 }, { id: 'onion_1kg', qty: 0.05 }] },
      { name: 'Ужин: яйца + салат', items: [{ id: 'eggs_10', qty: 0.3 }, { id: 'cucumber_1kg', qty: 0.2 }, { id: 'tomato_1kg', qty: 0.15 }] }
    ]}
  ],
  lose: [
    { title: 'Лёгкий день', meals: [
      { name: 'Завтрак: овсянка + яблоко', items: [{ id: 'oats_400', qty: 0.12 }, { id: 'apple_1kg', qty: 0.2 }] },
      { name: 'Обед: курица + овощи', items: [{ id: 'chicken_1kg', qty: 0.18 }, { id: 'cabbage_1kg', qty: 0.25 }, { id: 'carrot_1kg', qty: 0.1 }] },
      { name: 'Ужин: творог + огурец', items: [{ id: 'cottage_180', qty: 1 }, { id: 'cucumber_1kg', qty: 0.2 }] }
    ]}
  ],
  gain: [
    { title: 'День на массу', meals: [
      { name: 'Завтрак: каша + яйца + хлеб', items: [{ id: 'oats_400', qty: 0.2 }, { id: 'milk_1l', qty: 0.3 }, { id: 'eggs_10', qty: 0.3 }, { id: 'bread', qty: 1 }] },
      { name: 'Обед: мясо + рис', items: [{ id: 'beef_1kg', qty: 0.25 }, { id: 'rice_1kg', qty: 0.15 }, { id: 'tomato_1kg', qty: 0.15 }, { id: 'oil_1l', qty: 0.03 }] },
      { name: 'Ужин: творог + банан', items: [{ id: 'cottage_180', qty: 2 }, { id: 'banana_1kg', qty: 0.2 }, { id: 'bread', qty: 1 }] }
    ]}
  ]
};

function loadMealState(){
  try{
    var raw = localStorage.getItem(MEAL_KEY);
    if(raw){ var o = JSON.parse(raw); if(o && typeof o === 'object') return o; }
  }catch(e){}
  return { storeId: 'ogni', priceOverrides: {}, lastPlan: null, settings: { budgetMonth: 0, adults: 1, children: 0, goal: 'maintain' } };
}
function saveMealState(st){ try{ localStorage.setItem(MEAL_KEY, JSON.stringify(st)); }catch(e){} }
function getCatalog(){
  var st = loadMealState();
  return OGNI_CATALOG.map(function(p){
    var price = st.priceOverrides[p.id] != null ? num(st.priceOverrides[p.id]) : num(p.price);
    return Object.assign({}, p, { price: price });
  });
}
function setPrice(id, price){
  var st = loadMealState();
  st.priceOverrides[id] = Math.max(0, num(price));
  saveMealState(st);
}
function productById(id){
  var list = getCatalog();
  for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i];
  return null;
}
function num(v){
  if(typeof v==='number') return isFinite(v)?Math.round(v):0;
  var n=Number(String(v==null?'':v).replace(/\s/g,'').replace(',','.'));
  return(!isFinite(n)||n!==n)?0:Math.round(n);
}
function fmt(n){ n=Math.round(+n||0); return (n<0?'−':'')+Math.abs(n).toLocaleString('ru-RU')+' ₽'; }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }

function buildPlan(opts){
  opts = opts || {};
  var st = loadMealState();
  var goal = opts.goal || st.settings.goal || 'maintain';
  var adults = Math.max(1, num(opts.adults != null ? opts.adults : st.settings.adults) || 1);
  var children = Math.max(0, num(opts.children != null ? opts.children : st.settings.children));
  var budgetMonth = Math.max(0, num(opts.budgetMonth != null ? opts.budgetMonth : st.settings.budgetMonth));
  if(!budgetMonth){
    try{
      var bl = (window.STATE && STATE.settings && STATE.settings.budgetLimits) || {};
      budgetMonth = num(bl['Продукты']);
    }catch(e){}
  }
  var days = Math.max(7, Math.min(31, num(opts.days) || 30));
  var peopleFactor = adults + children * 0.65;
  var budgetTotal = budgetMonth;
  if(days < 28) budgetTotal = Math.round(budgetMonth * (days / 30));

  var templates = DAY_TEMPLATES[goal] || DAY_TEMPLATES.maintain;
  var catalog = getCatalog();
  var byId = {};
  catalog.forEach(function(p){ byId[p.id]=p; });

  var basket = {};
  var menu = [];
  for(var d=0; d<days; d++){
    var tpl = templates[d % templates.length];
    var dayMeals = [];
    (tpl.meals||[]).forEach(function(meal){
      var lines = [];
      (meal.items||[]).forEach(function(it){
        var qty = num(it.qty) * peopleFactor;
        if(!basket[it.id]) basket[it.id]=0;
        basket[it.id] += qty;
        var p = byId[it.id];
        var lineCost = p ? Math.round(p.price * qty) : 0;
        lines.push({ id: it.id, name: p?p.name:it.id, qty: Math.round(qty*100)/100, unit: p?p.unit:'шт', price: p?p.price:0, cost: lineCost });
      });
      dayMeals.push({ name: meal.name, lines: lines });
    });
    menu.push({ day: d+1, title: tpl.title, meals: dayMeals });
  }

  var basketList = [];
  var total = 0;
  Object.keys(basket).forEach(function(id){
    var p = byId[id];
    if(!p) return;
    var q = Math.ceil(basket[id] * 10) / 10;
    var cost = Math.round(p.price * q);
    total += cost;
    basketList.push({ id: id, name: p.name, cat: p.cat, unit: p.unit, qty: q, price: p.price, cost: cost });
  });
  basketList.sort(function(a,b){ return (a.cat||'').localeCompare(b.cat||'') || a.name.localeCompare(b.name); });

  var fits = !budgetTotal || total <= budgetTotal;
  var note = '';
  if(budgetTotal && total > budgetTotal) note = 'Корзина '+fmt(total)+' при бюджете '+fmt(budgetTotal)+'. Можно заменить позиции или поднять бюджет.';
  else if(budgetTotal) note = 'В бюджете: '+fmt(total)+' из '+fmt(budgetTotal)+'.';

  var plan = {
    id: 'mp_'+Date.now().toString(36),
    createdAt: new Date().toISOString(),
    storeId: 'ogni', storeName: 'Огни',
    goal: goal, adults: adults, children: children, days: days,
    budgetMonth: budgetMonth, budgetForPeriod: budgetTotal,
    total: total, fits: fits, note: note,
    menu: menu.slice(0, 7), menuFullDays: days, basket: basketList
  };
  st.settings = { budgetMonth: budgetMonth, adults: adults, children: children, goal: goal };
  st.lastPlan = plan; st.storeId = 'ogni';
  saveMealState(st);
  return plan;
}

function mealHtml(){
  var st = loadMealState();
  var s = st.settings || {};
  var plan = st.lastPlan;
  var cat = getCatalog();
  var html = '';
  html += '<div class="view-header"><button type="button" class="back-btn" data-act="go-home" aria-label="Назад">←</button><h2>Рацион · Огни</h2></div>';
  html += '<div class="card tight"><div class="card-title">Магазин</div>';
  html += '<div style="font-weight:700;margin-bottom:4px">Огни · Кисловодск</div>';
  html += '<div class="muted" style="font-size:12px;line-height:1.4">У «Огни» нет открытого прайса в сети. Цены ниже — стартовые; нажми на цену и поставь как на ценнике. Тогда расчёт будет точным.</div></div>';
  html += '<div class="card tight"><div class="card-title">Параметры</div><div class="list" style="gap:10px">';
  html += '<label class="muted" style="display:block">Бюджет на еду в месяц, ₽</label>';
  html += '<input id="mealBudget" type="number" inputmode="numeric" value="'+(s.budgetMonth||'')+'" placeholder="25000" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text)">';
  html += '<label class="muted" style="display:block;margin-top:8px">Взрослых</label>';
  html += '<input id="mealAdults" type="number" min="1" value="'+(s.adults||1)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text)">';
  html += '<label class="muted" style="display:block;margin-top:8px">Детей</label>';
  html += '<input id="mealChildren" type="number" min="0" value="'+(s.children||0)+'" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text)">';
  html += '<label class="muted" style="display:block;margin-top:8px">Цель</label>';
  html += '<select id="mealGoal" style="width:100%;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text)">';
  [['maintain','Питаться как обычно'],['lose','Похудеть'],['gain','Набрать массу']].forEach(function(o){
    html += '<option value="'+o[0]+'"'+(s.goal===o[0]?' selected':'')+'>'+o[1]+'</option>';
  });
  html += '</select>';
  html += '<button type="button" class="btn-shift" id="mealBuildBtn" style="margin-top:12px">Собрать рацион на месяц</button></div></div>';
  if(plan){
    html += '<div class="card tight"><div class="card-title">Последний план</div>';
    html += '<div style="font-size:15px;font-weight:700;margin-bottom:6px">'+fmt(plan.total);
    if(plan.budgetForPeriod) html += ' <span class="muted" style="font-weight:500">/ '+fmt(plan.budgetForPeriod)+'</span>';
    html += '</div><div class="muted" style="font-size:12px;margin-bottom:10px">'+(plan.note||'')+'</div>';
    html += '<div class="card-title">Корзина</div><div class="list">';
    (plan.basket||[]).forEach(function(b){
      html += '<div class="item"><div class="left"><b>'+esc(b.name)+'</b><span class="muted">'+b.qty+' '+b.unit+' × '+fmt(b.price)+'</span></div><div class="amt">'+fmt(b.cost)+'</div></div>';
    });
    html += '</div><div class="card-title" style="margin-top:14px">Меню (7 дней)</div>';
    (plan.menu||[]).forEach(function(day){
      html += '<div style="margin:10px 0 6px;font-weight:700">День '+day.day+' · '+esc(day.title)+'</div>';
      (day.meals||[]).forEach(function(m){ html += '<div class="muted" style="font-size:13px;margin:4px 0 2px">'+esc(m.name)+'</div>'; });
    });
    html += '</div>';
  }
  html += '<div class="card tight"><div class="card-title">Каталог Огни · цены</div>';
  html += '<div class="muted" style="font-size:12px;margin-bottom:10px">Нажми цену = поправить под магазин</div><div class="list">';
  var lastCat = '';
  cat.forEach(function(p){
    if(p.cat !== lastCat){ lastCat = p.cat; html += '<div class="muted" style="font-size:11px;text-transform:uppercase;margin-top:8px">'+esc(p.cat)+'</div>'; }
    html += '<div class="item"><div class="left"><b>'+esc(p.name)+'</b><span class="muted">'+esc(p.unit)+'</span></div>';
    html += '<button type="button" class="amt" data-edit-price="'+esc(p.id)+'" style="background:rgba(232,166,87,.12);border-radius:10px;padding:6px 10px">'+fmt(p.price)+'</button></div>';
  });
  html += '</div></div>';
  html += '<div class="hint">Открыть раздел: в консоли goView("meal") или кнопка «Рацион». Дальше расширим каталог и добавим вход с главного экрана.</div>';
  return html;
}

function bindMealUI(root){
  root = root || document;
  var build = root.querySelector('#mealBuildBtn');
  if(build){
    build.onclick = function(){
      var budget = num((root.querySelector('#mealBudget')||{}).value);
      var adults = num((root.querySelector('#mealAdults')||{}).value) || 1;
      var children = num((root.querySelector('#mealChildren')||{}).value);
      var goal = ((root.querySelector('#mealGoal')||{}).value) || 'maintain';
      var plan = buildPlan({ budgetMonth: budget, adults: adults, children: children, goal: goal, days: 30 });
      try{ if(typeof toast==='function') toast(plan.fits ? ('План: '+fmt(plan.total)) : ('Сверх бюджета: '+fmt(plan.total))); }catch(e){}
      try{ if(typeof goView==='function') goView('meal'); else if(typeof render==='function') render(); }catch(e){}
    };
  }
  root.querySelectorAll('[data-edit-price]').forEach(function(btn){
    btn.onclick = function(){
      var id = btn.getAttribute('data-edit-price');
      var p = productById(id);
      var v = prompt('Цена в Огни, ₽\n'+((p&&p.name)||id), String(p?p.price:0));
      if(v==null) return;
      setPrice(id, v);
      try{ if(typeof goView==='function') goView('meal'); else if(typeof render==='function') render(); }catch(e){}
    };
  });
}

function tryHookApp(){
  window.MealPlan = { buildPlan: buildPlan, getCatalog: getCatalog, setPrice: setPrice, load: loadMealState, html: mealHtml, bind: bindMealUI, stores: STORES };
  var origGoView = window.goView;
  if(typeof origGoView === 'function'){
    window.goView = function(v){
      if(v === 'meal'){ try{ window.currentView = 'meal'; window.__finView = 'meal'; }catch(e){} }
      return origGoView.apply(this, arguments);
    };
  }
  var tries = 0;
  function patchRender(){
    tries++;
    if(typeof window.render !== 'function'){ if(tries < 30) setTimeout(patchRender, 200); return; }
    if(window.render.__mealPatched) return;
    var orig = window.render;
    window.render = function(){
      try{
        if((window.currentView||window.__finView) === 'meal'){
          var r = orig.apply(this, arguments);
          setTimeout(function(){
            try{
              var wrap = document.querySelector('.wrap') || document.getElementById('app');
              if(!wrap) return;
              wrap.innerHTML = mealHtml();
              bindMealUI(wrap);
            }catch(e){}
          }, 0);
          return r;
        }
      }catch(e){}
      return orig.apply(this, arguments);
    };
    window.render.__mealPatched = true;
  }
  patchRender();
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if(t && t.closest && t.closest('[data-act="open-meal"]')){
      ev.preventDefault();
      try{ window.currentView='meal'; window.__finView='meal'; }catch(e){}
      if(typeof window.goView==='function') window.goView('meal');
      else if(typeof window.render==='function') window.render();
    }
    if(t && t.closest && t.closest('[data-act="go-home"]')){
      try{ if(typeof goHome==='function') goHome(); else if(typeof goView==='function') goView('home'); }catch(e){}
    }
  }, true);
  console.log('[FINNA meal-plan] Огни готов');
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryHookApp);
else tryHookApp();
})();
