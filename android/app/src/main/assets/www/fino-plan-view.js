(function(root){
  'use strict';
  function fmt(c){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(c/100)+' ₽';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var period=30,price='',name='Покупка';
  function html(state,on){
    var e=root.FinoFinancialEngine;if(!e)return '<div class="fino-note">План временно недоступен</div>';
    try{
      var s=e.snapshot(state,on),f=e.forecast(state,on,period),next=s.nextPayday;
      var goals=(state.reserves||[]).filter(function(x){return !x.deleted;}).map(function(x){
        var target=e.money(x.target||0),saved=e.money(x.saved||0),p=target?Math.min(100,Math.round(saved/target*100)):0;
        return '<div class="fino-goal"><div><b>'+esc(x.name||'Цель')+'</b><span>'+fmt(saved)+' / '+fmt(target)+'</span></div><strong>'+p+'%</strong><div class="fino-progress"><i style="width:'+p+'%"></i></div></div>';
      }).join('')||'<p class="fino-muted">Создай цель кнопкой «+» → «Резерв».</p>';
      var events=s.obligations.slice(0,4).map(function(x){return '<div class="fino-row"><span>'+esc(x.name)+'<small>'+esc(x.date)+'</small></span><b>'+fmt(x.amount)+'</b></div>';}).join('')||'<p class="fino-muted">До зарплаты платежей нет.</p>';
      var result='';
      if(price){try{
        var now=e.scenario(state,on,price,'now'),later=next?e.scenario(state,on,price,'afterPayday'):null;
        var installment=e.scenario(state,on,price,'installment',{months:6});
        result='<div class="fino-result"><span>Купить сейчас · останется свободно</span><strong class="'+(now.freeImmediately<0?'fino-negative':'')+'">'+fmt(now.freeImmediately)+'</strong><small>Через 3 месяца около '+fmt(now.inThreeMonths)+' без переменных расходов.</small></div>'+
          (later?'<div class="fino-result"><span>Купить после зарплаты · '+esc(later.purchaseDate)+'</span><strong class="'+(later.freeImmediately<0?'fino-negative':'')+'">'+fmt(later.freeImmediately)+'</strong></div>':'')+
          '<div class="fino-result"><span>Рассрочка на 6 месяцев · без процентов и взноса</span><strong>'+fmt(installment.monthlyPayment)+'/мес</strong><small>Свободно сейчас '+fmt(installment.freeImmediately)+'. Комиссии и фактические условия договора не включены.</small></div>'+
          '<p class="fino-muted">Накопить: цель '+fmt(e.money(price))+'. Срок зависит от суммы, которую ты сможешь откладывать каждый месяц; без неё дата была бы выдуманной.</p>';
      }catch(err){result='<p class="fino-negative">Проверь сумму покупки.</p>';}}
      return '<section class="fino-plan" aria-label="Финансовый план">'+
        '<div class="fino-eyebrow">FINO / ПЛАН</div><h1>Что дальше с деньгами</h1>'+
        '<div class="fino-balance"><span>Свободно сейчас</span><strong>'+fmt(s.free)+'</strong><div class="fino-balance-grid"><div>Всего<b>'+fmt(s.cash)+'</b></div><div>Предназначено для платежей и долгов<b>'+fmt(s.reserved)+'</b></div></div></div>'+
        '<div class="fino-two"><div><span>До зарплаты</span><b>'+(next?s.days+' дн.':'Дата не задана')+'</b></div><div><span>Безопасно в день</span><b>'+fmt(s.daily)+'</b></div></div>'+
        '<p class="fino-muted">Зарплата попадёт в кассу только после записи фактического дохода. Дневной бюджет учитывает предстоящие платежи и долги.</p>'+
        '<div class="fino-panel"><div class="fino-section-head"><h2>Прогноз</h2><select id="finoPeriod" aria-label="Период прогноза"><option value="7"'+(period===7?' selected':'')+'>7 дней</option><option value="30"'+(period===30?' selected':'')+'>30 дней</option><option value="90"'+(period===90?' selected':'')+'>3 месяца</option><option value="180"'+(period===180?' selected':'')+'>6 месяцев</option></select></div><div class="fino-row"><span>Зарплата по графику · прогноз</span><b class="fino-positive">+'+fmt(f.predictedSalary)+'</b></div><div class="fino-row"><span>Обязательные платежи</span><b>−'+fmt(f.obligations)+'</b></div><div class="fino-row fino-total"><span>Остаток · оценка</span><b>'+fmt(f.estimatedCash)+'</b></div><p class="fino-muted">Переменные расходы не включены. Дата выплаты и сумма зарплаты должны быть подтверждены в настройках.</p></div>'+
        '<div class="fino-panel"><h2>Ближайшие платежи</h2>'+events+'</div>'+
        '<div class="fino-panel"><h2>Цели и подушка</h2>'+goals+'</div>'+
        '<div class="fino-panel"><h2>Что если?</h2><label class="fino-label" for="finoPurchase">Сумма покупки</label><input id="finoPurchase" inputmode="decimal" placeholder="Например, 80 000" value="'+esc(price)+'"><button type="button" id="finoSimulate">Посчитать последствия</button>'+result+'</div>'+
        '</section>';
    }catch(err){return '<section class="fino-plan"><h1>План недоступен</h1><p>Проверь настройки сумм и дат. Данные кассы не изменены.</p></section>';}
  }
  function bind(container,rerender){
    if(container.__finoPlanBound)return;container.__finoPlanBound=true;
    container.addEventListener('change',function(ev){if(ev.target.id==='finoPeriod'){period=Number(ev.target.value)||30;rerender();}});
    container.addEventListener('click',function(ev){if(ev.target.id==='finoSimulate'){price=(container.querySelector('#finoPurchase')||{}).value||'';rerender();}});
  }
  root.FinoPlanView={html:html,bind:bind};
})(typeof window!=='undefined'?window:this);
