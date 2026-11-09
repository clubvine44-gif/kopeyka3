package app.fin.fina;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.*;
import android.text.InputType;
import android.os.Build;
import java.util.List;
import java.util.Locale;
import java.util.Calendar;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/** Fully native FINA screen shell: no WebView and no auth/network. */
public final class MainActivity extends Activity implements FinVoice.Actions {
  private static final int BG=Color.rgb(12,17,24), SURFACE=Color.rgb(22,29,38), PANEL=Color.rgb(28,36,46);
  private static final int TEXT=Color.rgb(239,242,240), MUTED=Color.rgb(139,153,161), ACCENT=Color.rgb(159,206,192);
  private static final int RED=Color.rgb(226,152,146), HAIR=Color.rgb(44,54,63);
  private Ledger ledger;
  private Planner planner;
  private FinVoice voice;
  private FinOrbView orb;
  private TextView voiceLabel;
  private LinearLayout root,content,bottom;
  private int tab=0,scrollY=0;
  private boolean foreground=false;
  private long pendingVoiceAmount=0;
  private String pendingVoiceCategory="";
  private boolean pendingVoiceIncome=false;
  @Override public void onCreate(Bundle state){
    super.onCreate(state);
    getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
    getWindow().getDecorView().setSystemUiVisibility(0);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    ledger=new Ledger(this);planner=new Planner(this);voice=new FinVoice(this,this);
    if(state!=null){tab=state.getInt("tab",0);scrollY=state.getInt("scroll",0);}
    render();
  }
  @Override protected void onResume(){super.onResume();foreground=true;if(orb!=null)orb.resume();}
  @Override protected void onPause(){foreground=false;if(orb!=null)orb.pause();if(voice!=null)voice.pause();super.onPause();}
  @Override protected void onDestroy(){if(voice!=null)voice.destroy();super.onDestroy();}
  @Override protected void onSaveInstanceState(Bundle b){b.putInt("tab",tab);b.putInt("scroll",scrollY);super.onSaveInstanceState(b);}
  private int dp(float d){return (int)(d*getResources().getDisplayMetrics().density+.5f);}
  private GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
  private GradientDrawable outline(int color,int radius,int stroke){GradientDrawable d=shape(color,radius);d.setStroke(dp(1),stroke);return d;}
  private GradientDrawable hero(){GradientDrawable d=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(34,57,62),Color.rgb(24,37,48),Color.rgb(20,28,39)});d.setCornerRadius(dp(25));d.setStroke(dp(1),Color.rgb(54,76,76));return d;}
  private LinearLayout linear(boolean vertical){LinearLayout a=new LinearLayout(this);a.setOrientation(vertical?1:0);return a;}
  private LinearLayout.LayoutParams lp(int w,int h){return new LinearLayout.LayoutParams(w<0?w:dp(w),h<0?h:dp(h));}
  private LinearLayout.LayoutParams spaced(int w,int h,int top){LinearLayout.LayoutParams p=lp(w,h);p.topMargin=dp(top);return p;}
  private void pad(View a,int l,int t,int r,int b){a.setPadding(dp(l),dp(t),dp(r),dp(b));}
  private TextView text(String value,int size,int color,boolean bold){
    TextView v=new TextView(this);v.setText(value);v.setTextColor(color);v.setTextSize(size);v.setIncludeFontPadding(false);
    if(bold)v.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
    v.setGravity(Gravity.CENTER_VERTICAL);return v;
  }
  private View line(){View v=new View(this);v.setBackgroundColor(HAIR);return v;}
  private void gap(LinearLayout b,int d){View v=new View(this);b.addView(v,lp(1,d));}
  private void render(){
    root=linear(true);root.setBackgroundColor(BG);
    setContentView(root);
    LinearLayout header=linear(false);header.setGravity(Gravity.CENTER_VERTICAL);pad(header,24,16,24,14);
    LinearLayout title=linear(true);
    title.addView(text("F I N A",20,TEXT,true));
    title.addView(text("ФИНАНСЫ БЕЗ ШУМА",10,MUTED,false),spaced(-2,16,5));
    header.addView(title,new LinearLayout.LayoutParams(0,-2,1f));
    TextView menu=text("•••",25,MUTED,true);menu.setGravity(Gravity.CENTER);
    menu.setBackground(shape(SURFACE,13));header.addView(menu,lp(44,44));
    menu.setOnClickListener(v->{tab=4;scrollY=0;render();});
    root.addView(header,lp(-1,-2));
    ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setVerticalScrollBarEnabled(false);
    content=linear(true);pad(content,20,10,20,26);scroll.addView(content);
    root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1f));
    if(tab==0)home();else if(tab==1)operations();else if(tab==2)plan();else if(tab==3)assistant();else settings();
    scroll.post(()->scroll.scrollTo(0,scrollY));
    scroll.setOnTouchListener((v,e)->{scrollY=scroll.getScrollY();return false;});
    addBottomNav();
    if(foreground&&orb!=null)orb.resume();
  }
  private void section(LinearLayout parent,String title,String subtitle){
    parent.addView(text(title,19,TEXT,true),spaced(-1,-2,22));
    if(subtitle!=null)parent.addView(text(subtitle,12,MUTED,false),spaced(-1,-2,7));
  }
  private LinearLayout card(LinearLayout parent,boolean special){
    LinearLayout box=linear(true);pad(box,20,20,20,20);box.setBackground(special?hero():outline(SURFACE,21,HAIR));
    parent.addView(box,spaced(-1,-2,16));return box;
  }
  private void home(){
    TextView pre=text("ОБЩИЙ БАЛАНС",11,ACCENT,true);
    LinearLayout hero=card(content,true);hero.addView(pre);
    hero.addView(text(Ledger.money(ledger.balance()),34,TEXT,true),spaced(-1,-2,16));
    hero.addView(text("Доступные средства • локально на устройстве",12,MUTED,false),spaced(-1,-2,9));
    gap(hero,20);hero.addView(line(),lp(-1,1));gap(hero,18);
    LinearLayout stats=linear(false);
    addMetric(stats,"ДОХОДЫ ЗА МЕСЯЦ",Ledger.money(ledger.monthIncome()),ACCENT);
    addMetric(stats,"РАСХОДЫ ЗА МЕСЯЦ",Ledger.money(ledger.monthExpense()),RED);
    hero.addView(stats);
    LinearLayout actions=linear(false);actions.setGravity(Gravity.CENTER_VERTICAL);
    actionButton(actions,"＋  Доход",true,()->amountDialog(true));
    actionButton(actions,"−  Расход",false,()->amountDialog(false));
    content.addView(actions,spaced(-1,54,18));
    section(content,"Последние операции","Всё сохранено на этом устройстве");
    List<Ledger.Entry> list=ledger.recent(5);
    if(list.isEmpty())empty("Пока нет операций","Добавь первый расход или доход — история появится здесь.");
    else for(Ledger.Entry e:list)entry(content,e);
    section(content,"Финна","Голосовые команды и финансовый обзор");
    LinearLayout teaser=card(content,false);
    LinearLayout row=linear(false);row.setGravity(Gravity.CENTER_VERTICAL);
    TextView symbol=text("◉",31,ACCENT,true);row.addView(symbol,lp(50,55));
    LinearLayout group=linear(true);group.addView(text("Спросить Финну",16,TEXT,true));group.addView(text("Баланс, расходы, доходы",12,MUTED,false),spaced(-1,-2,6));
    row.addView(group,new LinearLayout.LayoutParams(0,-2,1f));row.addView(text("›",28,ACCENT,true));teaser.addView(row);
    teaser.setOnClickListener(v->{tab=3;scrollY=0;render();});
  }
  private void addMetric(LinearLayout parent,String key,String val,int valueColor){
    LinearLayout group=linear(true);group.addView(text(key,9,MUTED,true));group.addView(text(val,17,valueColor,true),spaced(-1,-2,9));
    parent.addView(group,new LinearLayout.LayoutParams(0,-2,1f));
  }
  private void actionButton(LinearLayout row,String label,boolean primary,Runnable run){
    TextView b=text(label,15,primary?BG:TEXT,true);b.setGravity(Gravity.CENTER);
    b.setBackground(shape(primary?ACCENT:PANEL,16));
    LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(54),1f);if(!primary)p.leftMargin=dp(10);
    row.addView(b,p);b.setOnClickListener(v->run.run());
  }
  private void entry(LinearLayout target,Ledger.Entry e){
    LinearLayout line=linear(false);line.setGravity(Gravity.CENTER_VERTICAL);pad(line,15,15,15,15);
    line.setBackground(outline(SURFACE,16,HAIR));
    TextView emblem=text(e.amount>=0?"+":"−",24,e.amount>=0?ACCENT:RED,true);
    emblem.setGravity(Gravity.CENTER);emblem.setBackground(shape(PANEL,13));line.addView(emblem,lp(45,45));
    LinearLayout detail=linear(true);pad(detail,13,0,0,0);
    detail.addView(text(e.category,15,TEXT,true));
    detail.addView(text(Ledger.date(e.timestamp)+(e.note.isEmpty()?"":" · "+e.note),12,MUTED,false),spaced(-1,-2,5));
    line.addView(detail,new LinearLayout.LayoutParams(0,-2,1f));
    line.addView(text((e.amount>0?"+":"−")+Ledger.money(Math.abs(e.amount)),14,e.amount>0?ACCENT:TEXT,true));
    target.addView(line,spaced(-1,-2,8));
  }
  private void empty(String heading,String sub){
    LinearLayout box=card(content,false);pad(box,19,24,19,25);
    box.addView(text(heading,16,TEXT,true));box.addView(text(sub,13,MUTED,false),spaced(-1,-2,8));
  }
  private void operations(){
    section(content,"История","Операции в обратном хронологическом порядке");
    LinearLayout stat=card(content,true);
    stat.addView(text("БАЛАНС",11,ACCENT,true));
    stat.addView(text(Ledger.money(ledger.balance()),28,TEXT,true),spaced(-1,-2,10));
    List<Ledger.Entry> entries=ledger.recent(200);
    if(entries.isEmpty())empty("Операций пока нет","Сохраняй доходы и расходы, чтобы видеть историю.");
    else for(Ledger.Entry e:entries)entry(content,e);
  }
  private void assistant(){
    section(content,"Финна","Твой голосовой помощник");
    LinearLayout stage=card(content,true);
    orb=new FinOrbView(this);stage.addView(orb,lp(-1,268));
    voiceLabel=text("Готова слушать",15,TEXT,true);voiceLabel.setGravity(Gravity.CENTER);
    stage.addView(voiceLabel,spaced(-1,30,2));stage.addView(text("Пространственная анимация реагирует на состояние",11,MUTED,false),spaced(-1,-2,7));
    TextView start=text("◉   Говорить с Финной",16,BG,true);start.setGravity(Gravity.CENTER);start.setBackground(shape(ACCENT,16));
    stage.addView(start,spaced(-1,57,20));start.setOnClickListener(v->{orb.setMood(FinOrbView.Mood.LISTENING);voice.listen();});
    section(content,"Попробуй сказать",null);
    for(String cmd:new String[]{"Сколько у меня денег?","Запиши расход 500 рублей на продукты","Запиши доход 4800 рублей","Покажи историю операций"}){
      TextView example=text(cmd,14,TEXT,false);pad(example,16,16,16,16);example.setBackground(outline(SURFACE,15,HAIR));
      content.addView(example,spaced(-1,-2,9));example.setOnClickListener(v->onCommand(cmd));
    }
  }
  private void plan(){
    java.time.YearMonth month=java.time.YearMonth.now();
    int[] shifts=planner.monthShiftCounts(month);
    section(content,"План месяца",new java.text.SimpleDateFormat("LLLL yyyy",new Locale("ru","RU")).format(new java.util.Date()));
    LinearLayout forecast=card(content,true);
    forecast.addView(text("ПРОГНОЗ ДОХОДА ПО СМЕНАМ",11,ACCENT,true));
    forecast.addView(text(Ledger.money(planner.forecastIncome(month)),30,TEXT,true),spaced(-1,-2,13));
    forecast.addView(text(shifts[0]+" дневных  ·  "+shifts[1]+" ночных  ·  "+shifts[2]+" выходных",13,MUTED,false),spaced(-1,-2,10));
    forecast.addView(text("После регулярных платежей: "+Ledger.money(planner.forecastIncome(month)-planner.recurringTotal()),13,TEXT,true),spaced(-1,-2,16));
    section(content,"График смен",null);
    LinearLayout calendar=card(content,false);
    android.widget.GridLayout grid=new android.widget.GridLayout(this);
    grid.setColumnCount(7);
    String[] week={"ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"};
    for(String x:week){TextView w=text(x,10,MUTED,true);w.setGravity(Gravity.CENTER);grid.addView(w,new android.widget.GridLayout.LayoutParams(
      android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED,1f),android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED,1f)));}
    int offset=month.atDay(1).getDayOfWeek().getValue()-1;
    for(int i=0;i<offset;i++){TextView blank=text("",13,MUTED,false);grid.addView(blank);}
    for(int n=1;n<=month.lengthOfMonth();n++){
      final java.time.LocalDate day=month.atDay(n);String shift=planner.shift(day);
      int tint=shift.equals("day")?ACCENT:shift.equals("night")?Color.rgb(155,164,220):MUTED;
      TextView d=text(String.valueOf(n)+"\n"+(shift.equals("day")?"Д":shift.equals("night")?"Н":"·"),12,tint,true);
      d.setGravity(Gravity.CENTER);pad(d,2,9,2,9);
      d.setBackground(shape(shift.equals("off")?BG:PANEL,8));
      android.widget.GridLayout.LayoutParams cell=new android.widget.GridLayout.LayoutParams(
        android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED,1f),android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED,1f));
      cell.width=0;cell.setGravity(Gravity.FILL_HORIZONTAL);cell.setMargins(dp(2),dp(2),dp(2),dp(2));
      grid.addView(d,cell);
    }
    calendar.addView(grid,lp(-1,-2));
    calendar.addView(text("Д — дневная смена    Н — ночная    · — выходной",11,MUTED,false),spaced(-1,-2,15));
    TextView changeRates=text("Изменить ставку и начало цикла  ›",13,ACCENT,true);
    calendar.addView(changeRates,spaced(-1,38,12));changeRates.setOnClickListener(v->shiftDialog());
    section(content,"Обязательные платежи",null);
    LinearLayout obligations=card(content,false);
    obligations.addView(text("Всего в месяц: "+Ledger.money(planner.recurringTotal()),16,TEXT,true));
    for(Planner.Recurring p:planner.recurring()){
      TextView item=text(p.name+" · "+p.day+"-е  —  "+Ledger.money(p.amount),13,MUTED,false);
      obligations.addView(item,spaced(-1,41,8));
      item.setOnLongClickListener(v->{new AlertDialog.Builder(this).setTitle("Удалить платёж?")
        .setMessage(p.name).setNegativeButton("Отмена",null)
        .setPositiveButton("Удалить",(dialog,w)->{planner.removeRecurring(p.id);render();}).show();return true;});
    }
    TextView add=text("＋ Добавить платёж",14,ACCENT,true);obligations.addView(add,spaced(-1,43,10));add.setOnClickListener(v->recurringDialog());
    section(content,"Цели и резервы",null);
    LinearLayout goals=card(content,false);
    List<Planner.Goal> all=planner.goals();
    if(all.isEmpty())goals.addView(text("Пока нет целей. Добавь финансовую цель.",13,MUTED,false));
    for(Planner.Goal g:all){
      TextView title=text(g.name,15,TEXT,true);goals.addView(title,spaced(-1,-2,14));
      goals.addView(text(Ledger.money(g.saved)+" из "+Ledger.money(g.target),12,MUTED,false),spaced(-1,-2,6));
      ProgressBar bar=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
      bar.setMax(1000);bar.setProgress((int)Math.min(1000,g.target>0?1000.0*g.saved/g.target:0));
      bar.setProgressTintList(ColorStateList.valueOf(ACCENT));
      goals.addView(bar,spaced(-1,5,9));
      TextView top=text("Пополнить цель  ›",12,ACCENT,true);goals.addView(top,spaced(-1,38,4));
      top.setOnClickListener(v->depositDialog(g));
      title.setOnLongClickListener(v->{new AlertDialog.Builder(this).setTitle("Удалить цель?")
        .setMessage(g.name).setNegativeButton("Отмена",null)
        .setPositiveButton("Удалить",(dialog,w)->{planner.removeGoal(g.id);render();}).show();return true;});
    }
    TextView addGoal=text("＋ Новая цель",14,ACCENT,true);goals.addView(addGoal,spaced(-1,44,11));addGoal.setOnClickListener(v->goalDialog());
    content.addView(text("Прогноз — расчёт по графику, а не гарантия выплаты. Переводы в цели пока не списываются с основного баланса.",11,MUTED,false),spaced(-1,-2,13));
  }
  private EditText edit(String hint,boolean digits){
    EditText e=new EditText(this);e.setHint(hint);e.setTextColor(TEXT);e.setHintTextColor(MUTED);
    e.setSingleLine(true);if(digits)e.setInputType(InputType.TYPE_CLASS_NUMBER);return e;
  }
  private long readMoney(EditText e){long n=Long.parseLong(e.getText().toString().trim());if(n<=0)throw new IllegalArgumentException("Сумма должна быть больше нуля");return n;}
  private void shiftDialog(){
    LinearLayout form=linear(true);pad(form,20,10,20,0);
    EditText anchor=edit("Начало цикла YYYY-MM-DD",false);anchor.setText(planner.shiftStart().toString());form.addView(anchor);
    EditText day=edit("Дневная ставка",true);day.setText(String.valueOf(planner.dayRate()));form.addView(day);
    EditText night=edit("Ночная ставка",true);night.setText(String.valueOf(planner.nightRate()));form.addView(night);
    new AlertDialog.Builder(this).setTitle("График 2/2/2").setView(form)
      .setNegativeButton("Отмена",null).setPositiveButton("Сохранить",(d,w)->{
        try{planner.updateShift(java.time.LocalDate.parse(anchor.getText().toString()),
          Long.parseLong(day.getText().toString()),Long.parseLong(night.getText().toString()));render();}
        catch(Exception e){toast("Проверь дату и ставки");}
      }).show();
  }
  private void recurringDialog(){
    LinearLayout form=linear(true);pad(form,20,10,20,0);
    EditText name=edit("Название платежа",false);form.addView(name);
    EditText amount=edit("Сумма, ₽",true);form.addView(amount);
    EditText day=edit("День месяца (1–31)",true);form.addView(day);
    new AlertDialog.Builder(this).setTitle("Новый платёж").setView(form)
      .setNegativeButton("Отмена",null).setPositiveButton("Добавить",(d,w)->{
        try{planner.addRecurring(name.getText().toString(),readMoney(amount),Integer.parseInt(day.getText().toString()));render();}
        catch(Exception e){toast("Проверь данные платежа");}
      }).show();
  }
  private void goalDialog(){
    LinearLayout form=linear(true);pad(form,20,10,20,0);
    EditText name=edit("Название цели",false);form.addView(name);
    EditText target=edit("Необходимая сумма, ₽",true);form.addView(target);
    new AlertDialog.Builder(this).setTitle("Финансовая цель").setView(form)
      .setNegativeButton("Отмена",null).setPositiveButton("Создать",(d,w)->{
        try{planner.addGoal(name.getText().toString(),readMoney(target));render();}
        catch(Exception e){toast("Проверь цель и сумму");}
      }).show();
  }
  private void depositDialog(Planner.Goal goal){
    EditText amount=edit("Пополнение цели, ₽",true);
    new AlertDialog.Builder(this).setTitle(goal.name).setView(amount)
      .setNegativeButton("Отмена",null).setPositiveButton("Пополнить",(d,w)->{
        try{planner.deposit(goal.id,readMoney(amount));render();}
        catch(Exception e){toast("Проверь сумму");}
      }).show();
  }
  private void settings(){
    section(content,"Настройки","Управление без аккаунта и облачных сервисов");
    LinearLayout box=card(content,false);
    rowButton(box,"Начальный остаток","Установить баланс, с которого начинаем",()->openingDialog());
    box.addView(line(),spaced(-1,1,13));
    rowButton(box,"Экспорт данных","Сохранить резервную копию JSON",()->exportFile());
    box.addView(line(),spaced(-1,1,13));
    rowButton(box,"Импорт данных","Восстановить резервную копию FINA Native",()->importFile());
    section(content,"О приложении",null);
    LinearLayout note=card(content,false);
    note.addView(text("FINA Native 0.1",16,TEXT,true));
    note.addView(text("Нативный интерфейс Android, локальное финансовое хранилище, голосовой модуль и пространственная анимация. Текущая версия — прототип. Не заменяет установленную Финну и пока не переносит её данные.",13,MUTED,false),spaced(-1,-2,12));
  }
  private void rowButton(LinearLayout parent,String title,String sub,Runnable r){
    LinearLayout group=linear(true);pad(group,0,10,0,10);group.addView(text(title,15,TEXT,true));group.addView(text(sub,12,MUTED,false),spaced(-1,-2,6));
    parent.addView(group);group.setOnClickListener(v->r.run());
  }
  private void addBottomNav(){
    bottom=linear(false);pad(bottom,14,10,14,13);bottom.setBackgroundColor(BG);
    root.addView(line(),lp(-1,1));
    String[] items={"Обзор","История","План","Финна","Ещё"};String[] glyph={"◫","≡","▦","◉","⋯"};
    for(int i=0;i<items.length;i++){
      final int target=i;
      LinearLayout item=linear(true);item.setGravity(Gravity.CENTER);
      TextView ic=text(glyph[i],25,i==tab?ACCENT:MUTED,true);ic.setGravity(Gravity.CENTER);
      item.addView(ic,lp(-1,28));
      TextView text=text(items[i],11,i==tab?ACCENT:MUTED,i==tab);text.setGravity(Gravity.CENTER);
      item.addView(text,spaced(-1,19,6));
      bottom.addView(item,new LinearLayout.LayoutParams(0,dp(56),1f));
      item.setOnClickListener(v->{if(tab!=target){tab=target;scrollY=0;orb=null;render();}});
    }
    root.addView(bottom,lp(-1,80));
  }
  private void amountDialog(boolean income){
    LinearLayout form=linear(true);pad(form,18,14,18,0);
    EditText amount=new EditText(this);amount.setHint("Сумма в рублях");amount.setSingleLine(true);amount.setTextColor(TEXT);amount.setHintTextColor(MUTED);
    amount.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);form.addView(amount,lp(-1,60));
    EditText category=new EditText(this);category.setText(income?"Доход":"Продукты");category.setSingleLine(true);category.setTextColor(TEXT);
    category.setHint("Категория");form.addView(category,spaced(-1,58,10));
    EditText note=new EditText(this);note.setHint("Комментарий (необязательно)");note.setTextColor(TEXT);note.setHintTextColor(MUTED);
    form.addView(note,spaced(-1,58,10));
    AlertDialog dlg=new AlertDialog.Builder(this).setTitle(income?"Добавить доход":"Добавить расход").setView(form)
      .setNegativeButton("Отмена",null).setPositiveButton("Сохранить",null).create();
    dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
      try{
        String raw=amount.getText().toString().trim().replace(',','.');
        java.math.BigDecimal rub=new java.math.BigDecimal(raw);
        long kopecks=rub.multiply(java.math.BigDecimal.valueOf(100)).longValueExact();
        if(kopecks%100!=0)throw new IllegalArgumentException("Пока только целые рубли");
        long total=kopecks/100;
        if(total<=0)throw new IllegalArgumentException("Сумма должна быть больше нуля");
        ledger.add(income?total:-total,category.getText().toString().trim(),note.getText().toString().trim());
        dlg.dismiss();render();
      }catch(Exception e){amount.setError(e.getMessage());}
    }));
    dlg.show();
  }
  private void openingDialog(){
    EditText amount=new EditText(this);amount.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_SIGNED);amount.setText(String.valueOf(ledger.openingBalance()));
    new AlertDialog.Builder(this).setTitle("Начальный остаток").setView(amount).setNegativeButton("Отмена",null)
      .setPositiveButton("Сохранить",(d,w)->{try{ledger.setOpeningBalance(Long.parseLong(amount.getText().toString().trim()));render();}catch(Exception e){toast("Неверная сумма");}}).show();
  }
  private void exportFile(){Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"FINA-backup.json");startActivityForResult(i,201);}
  private void importFile(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");startActivityForResult(i,202);}
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;
    try{
      if(request==201){try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){if(stream==null)throw new Exception("Нет доступа к файлу");stream.write(ledger.exportJson().getBytes(StandardCharsets.UTF_8));}toast("Резервная копия сохранена");}
      else if(request==202){byte[] bytes;try(InputStream stream=getContentResolver().openInputStream(data.getData())){if(stream==null)throw new Exception("Нет доступа к файлу");java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();byte[] buffer=new byte[8192];int n,total=0;while((n=stream.read(buffer))>0){total+=n;if(total>5000000)throw new Exception("Файл слишком большой");out.write(buffer,0,n);}bytes=out.toByteArray();}
       new AlertDialog.Builder(this).setTitle("Импортировать данные?").setMessage("Текущие операции будут заменены. Сохрани копию перед импортом.")
        .setNegativeButton("Отмена",null).setPositiveButton("Импортировать",(d,w)->{try{ledger.importJson(new String(bytes,StandardCharsets.UTF_8));render();toast("Импорт выполнен");}catch(Exception e){toast("Ошибка импорта: "+e.getMessage());}}).show();
      }
    }catch(Exception e){toast("Ошибка файла: "+e.getMessage());}
  }
  private void toast(String m){Toast.makeText(this,m,Toast.LENGTH_LONG).show();}
  @Override public void onStatus(String message,FinOrbView.Mood mood){runOnUiThread(()->{if(voiceLabel!=null)voiceLabel.setText(message);if(orb!=null)orb.setMood(mood);});}
  @Override public void onCommand(String text){
    runOnUiThread(()->{
      FinVoice.Parsed cmd=FinVoice.parse(text);
      if(cmd.type.equals("balance"))voice.say("Твой текущий баланс: "+Ledger.money(ledger.balance()));
      else if(cmd.type.equals("history")){tab=1;scrollY=0;render();voice.say("Открываю историю операций");}
      else if(cmd.type.equals("settings")){tab=4;scrollY=0;render();voice.say("Открываю настройки");}
      else if(cmd.type.equals("help"))voice.say("Я могу показать баланс, историю, записать доход или расход.");
      else if(cmd.type.equals("expense")||cmd.type.equals("income")){
        boolean income=cmd.type.equals("income");
        String action=income?"доход":"расход";
        new AlertDialog.Builder(this).setTitle("Подтверди "+action)
         .setMessage((income?"+":"−")+Ledger.money(cmd.amount)+"\nКатегория: "+cmd.category+"\n\nРаспознано: "+text)
         .setNegativeButton("Отмена",(d,w)->voice.say("Отменено"))
         .setPositiveButton("Записать",(d,w)->{try{ledger.add(income?cmd.amount:-cmd.amount,cmd.category,"Голосовая команда");render();voice.say("Записала "+action);}catch(Exception e){toast(e.getMessage());}}).show();
      } else voice.say("Не поняла команду. Скажи: покажи баланс или запиши расход 500 рублей.");
    });
  }
}
