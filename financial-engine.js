/* FINO projections. Pure, offline, integer kopecks. Legacy amounts are rubles. */
(function(root, factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FinoFinancialEngine=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var DAY=86400000, DEFAULT_CYCLE=['day','day','night','night','off','off'];
  function iso(d){return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
  function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))throw Error('Invalid date');var d=new Date(s+'T00:00:00Z');if(!Number.isFinite(d.getTime())||iso(d)!==s)throw Error('Invalid date');return d;}
  function add(s,n){return iso(new Date(date(s).getTime()+n*DAY));}
  function days(a,b){return Math.round((date(b)-date(a))/DAY);}
  function month(s){return s.slice(0,7);}
  function dim(s){var d=date(s);return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();}
  function money(value){
    var s=String(value==null?'0':value).trim().replace(/\s/g,'').replace(',','.');
    if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))throw Error('Invalid amount');
    var neg=s[0]==='-',parts=(neg?s.slice(1):s).split('.');
    var n=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
    if(!Number.isSafeInteger(n))throw Error('Amount exceeds safe range');
    return neg?-n:n;
  }
  function rub(cents){if(!Number.isSafeInteger(cents))throw Error('Unsafe amount');return cents/100;}
  function live(x){return x&&x.deleted!==true&&x.active!==false;}
  function sum(xs,fn){return (xs||[]).reduce(function(v,x){return v+(live(x)?fn(x):0);},0);}
  function payday(after,day){
    if(!Number.isInteger(day)||day<1||day>31)return null;
    var d=date(after),y=d.getUTCFullYear(),m=d.getUTCMonth();
    for(var i=0;i<14;i++){
      var x=new Date(Date.UTC(y,m+i,1));
      var last=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();
      var candidate=iso(new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),Math.min(day,last))));
      if(candidate>after)return candidate;
    }
    throw Error('Payday overflow');
  }
  function shift(state,on){
    date(on);
    var settings=state.settings||{},override=(state.shiftsOverride||{})[on];
    if(override!=null)return override;
    var cycle=Array.isArray(settings.shiftCycle)&&settings.shiftCycle.length?settings.shiftCycle:DEFAULT_CYCLE;
    var anchor=settings.shiftAnchor||'2026-08-17';
    var i=((days(anchor,on)%cycle.length)+cycle.length)%cycle.length;
    return cycle[i];
  }
  function shiftValue(state,on){
    var settings=state.settings||{},kind=shift(state,on);
    if(kind==='off'||kind==='sick'||kind==='vacation'||kind==='В'||kind==='Б'||kind==='О')return 0;
    var rate=kind==='night'||kind==='Н'?settings.nightRate:settings.dayRate;
    if(kind==='extra'||kind==='ДОП')rate=settings.extraRate!=null?settings.extraRate:settings.dayRate;
    var adjustment=(settings.rateChanges||[]).filter(function(x){return x.date<=on;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
    if(adjustment)rate=kind==='night'||kind==='Н'?adjustment.nightRate:adjustment.dayRate;
    return money(rate||0);
  }
  function wages(state,from,to,asOf){
    date(from);date(to);asOf=asOf||state.asOf||to;date(asOf);
    var earned=0,expected=0,count=0;
    for(var on=from;on<=to;on=add(on,1)){
      var amount=shiftValue(state,on);if(!amount)continue;
      count++;
      if(on<=asOf)earned+=amount;else expected+=amount;
    }
    return {earned:earned,expected:expected,total:earned+expected,shifts:count};
  }
  function cash(state,on){
    var settings=state.settings||{},anchor=settings.month||month(on);
    var start=anchor+'-01';date(start);
    var value=money(settings.openingBalance||0);
    function inRange(x){return x.date>=start&&x.date<=on;}
    value+=sum(state.income,function(x){return inRange(x)?money(x.amount):0;});
    value-=sum(state.expenses,function(x){return inRange(x)?money(x.amount):0;});
    value+=sum(state.reserveOps,function(x){return inRange(x)?(x.type==='withdraw'?1:-1)*money(x.amount):0;});
    return value;
  }
  function due(state,from,to){
    var items=[];
    (state.obligations||[]).forEach(function(o){
      if(!live(o))return;
      var day=Number(o.day);if(!Number.isInteger(day)||day<1||day>31)return;
      for(var cursor=month(from)+'-01';cursor<=to;cursor=add(cursor,dim(cursor))){
        var on=cursor.slice(0,7)+'-'+String(Math.min(day,dim(cursor))).padStart(2,'0');
        if(on>to)continue;
        // An unpaid due date earlier this month is still owed today.
        if(on<from){if(month(on)!==month(from))continue;on=from;}
        var paid=sum(state.obligationPays,function(p){return p.obligId===o.id&&p.month===month(on)?money(p.amount):0;});
        var remaining=Math.max(0,money(o.amount)-paid);
        if(remaining)items.push({id:o.id,date:on,name:o.name||'Платёж',amount:remaining});
      }
    });
    return items.sort(function(a,b){return a.date.localeCompare(b.date);});
  }
  function reserve(state){return sum(state.reserves,function(x){return Math.max(0,money(x.saved||0));});}
  function debt(state,on){return sum(state.debts,function(x){return (!x.deferUntil||x.deferUntil<=on)?Math.max(0,money(x.total||0)-money(x.paid||0)):0;});}
  function snapshot(state,on){
    date(on);
    var balance=cash(state,on),next=payday(on,Number((state.settings||{}).paydayDay));
    var end=next?add(next,-1):add(on,29);
    var obligations=due(state,on,end),owed=obligations.reduce(function(v,x){return v+x.amount;},0);
    var debts=debt(state,on),free=balance-owed-debts;
    var span=days(on,end)+1;
    return {date:on,cash:balance,goals:reserve(state),reserved:owed+debts,free:free,daily:Math.floor(Math.max(0,free)/span),days:span,nextPayday:next,obligations:obligations,confidence:next?'configured payday; receipt is unconfirmed':'payday unknown'};
  }
  function forecast(state,on,horizon,opts){
    opts=opts||{};date(on);
    if(!Number.isInteger(horizon)||horizon<1||horizon>366)throw Error('Invalid horizon');
    var end=add(on,horizon-1),base=snapshot(state,on),events=due(state,add(on,1),end);
    var variable=opts.dailyVariable==null?0:money(opts.dailyVariable);
    var salary=0,bonuses=0;
    for(var cursor=on;cursor<end;){
      cursor=payday(cursor,Number((state.settings||{}).paydayDay));if(!cursor||cursor>end)break;
      var prior=add(cursor,-1),priorMonth=new Date(Date.UTC(date(cursor).getUTCFullYear(),date(cursor).getUTCMonth()-1,1));
      var priorDay=Math.min(Number((state.settings||{}).paydayDay),new Date(Date.UTC(priorMonth.getUTCFullYear(),priorMonth.getUTCMonth()+1,0)).getUTCDate());
      var start=iso(new Date(Date.UTC(priorMonth.getUTCFullYear(),priorMonth.getUTCMonth(),priorDay)));
      salary+=wages(state,start,prior,on).total;
    }
    bonuses=sum(state.plannedIncome,function(x){return x.date>on&&x.date<=end?money(x.amount):0;});
    var compulsory=events.reduce(function(v,x){return v+x.amount;},0);
    return {from:on,to:end,actualCash:base.cash,predictedSalary:salary,otherIncome:bonuses,obligations:compulsory,variableExpense:variable*horizon,estimatedCash:base.cash+salary+bonuses-compulsory-variable*horizon,confidence:variable?'based on supplied daily spending':'variable expenses unknown; estimate is incomplete'};
  }
  function scenario(state,on,price,mode,opts){
    opts=opts||{};
    var cost=money(price);if(cost<=0)throw Error('Price must be positive');
    var base=snapshot(state,on),buy=mode==='afterPayday'?base.nextPayday:on;
    if(!buy)throw Error('Payday is not configured');
    var horizon=forecast(state,on,90,opts),immediate=base.free-cost;
    if(mode==='afterPayday'){
      var before=forecast(state,on,days(on,buy)+1,opts);
      var next=payday(buy,Number((state.settings||{}).paydayDay));
      var reservedAfter=due(state,add(buy,1),next?add(next,-1):add(buy,29)).reduce(function(n,x){return n+x.amount;},0)+debt(state,buy);
      immediate=before.estimatedCash-reservedAfter-cost;
    }
    if(mode==='installment'){
      var months=Number(opts.months);
      if(!Number.isInteger(months)||months<2||months>60)throw Error('Invalid installment term');
      var down=money(opts.downPayment||0);
      if(down<0||down>cost)throw Error('Invalid down payment');
      var payment=Math.ceil((cost-down)/months);
      immediate=base.free-down;
      var paymentsInHorizon=0;
      for(var d=add(on,1);d<=horizon.to;d=add(d,1))if(d.slice(8)===on.slice(8))paymentsInHorizon++;
      return {purchaseDate:on,price:cost,freeImmediately:immediate,shortfall:Math.max(0,-immediate),monthlyPayment:payment,inThreeMonths:horizon.estimatedCash-down-payment*Math.min(months,paymentsInHorizon),confidence:'zero interest and fees assumed; '+horizon.confidence};
    }
    if(mode!=='now'&&mode!=='afterPayday')throw Error('Invalid scenario');
    return {purchaseDate:buy,price:cost,freeImmediately:immediate,shortfall:Math.max(0,-immediate),inThreeMonths:horizon.estimatedCash-cost,confidence:horizon.confidence};
  }
  return {money:money,rubles:rub,date:date,addDays:add,days:days,payday:payday,shift:shift,shiftValue:shiftValue,wages:wages,cash:cash,due:due,snapshot:snapshot,forecast:forecast,scenario:scenario};
});
