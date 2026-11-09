package app.fin.fina;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/** Native financial planning, independent of UI and network. */
public final class Planner {
  public static final class Goal {
    public final String id,name;
    public final long target,saved;
    Goal(String id,String name,long target,long saved){this.id=id;this.name=name;this.target=target;this.saved=saved;}
  }
  public static final class Recurring {
    public final String id,name;
    public final long amount;
    public final int day;
    Recurring(String id,String name,long amount,int day){this.id=id;this.name=name;this.amount=amount;this.day=day;}
  }
  private final SharedPreferences prefs;
  private final List<Goal> goals=new ArrayList<>();
  private final List<Recurring> recurring=new ArrayList<>();
  private LocalDate shiftStart=LocalDate.of(2026,10,30); // first daytime shift
  private long dayRate=4800,nightRate=4800;
  public Planner(Context c){prefs=c.getSharedPreferences("fina_native_plan_v1",Context.MODE_PRIVATE);load();}
  private void load(){
    try{
      JSONObject o=new JSONObject(prefs.getString("state","{}"));
      shiftStart=LocalDate.parse(o.optString("shiftStart","2026-10-30"));
      dayRate=o.optLong("dayRate",4800);nightRate=o.optLong("nightRate",4800);
      JSONArray gs=o.optJSONArray("goals");
      if(gs!=null)for(int i=0;i<gs.length();i++){JSONObject g=gs.optJSONObject(i);if(g!=null)goals.add(new Goal(g.optString("id"),g.optString("name"),g.optLong("target"),g.optLong("saved")));}
      JSONArray rs=o.optJSONArray("recurring");
      if(rs!=null)for(int i=0;i<rs.length();i++){JSONObject r=rs.optJSONObject(i);if(r!=null)recurring.add(new Recurring(r.optString("id"),r.optString("name"),r.optLong("amount"),r.optInt("day",25)));}
    }catch(Exception ignored){}
  }
  private void save(){
    try{
      JSONObject o=new JSONObject();
      o.put("shiftStart",shiftStart.toString());o.put("dayRate",dayRate);o.put("nightRate",nightRate);
      JSONArray gs=new JSONArray();for(Goal g:goals){JSONObject q=new JSONObject();q.put("id",g.id);q.put("name",g.name);q.put("target",g.target);q.put("saved",g.saved);gs.put(q);}o.put("goals",gs);
      JSONArray rs=new JSONArray();for(Recurring r:recurring){JSONObject q=new JSONObject();q.put("id",r.id);q.put("name",r.name);q.put("amount",r.amount);q.put("day",r.day);rs.put(q);}o.put("recurring",rs);
      if(!prefs.edit().putString("state",o.toString()).commit())throw new IllegalStateException("Сбой сохранения");
    }catch(Exception e){throw new IllegalStateException(e);}
  }
  public synchronized String shift(LocalDate day){
    long d=ChronoUnit.DAYS.between(shiftStart,day);
    int i=Math.floorMod(d,6);
    return i<2?"day":i<4?"night":"off";
  }
  public synchronized int[] monthShiftCounts(YearMonth month){
    int day=0,night=0,off=0;
    for(int n=1;n<=month.lengthOfMonth();n++){
      String s=shift(month.atDay(n));if(s.equals("day"))day++;else if(s.equals("night"))night++;else off++;
    }
    return new int[]{day,night,off};
  }
  public synchronized long forecastIncome(YearMonth month){
    int[] count=monthShiftCounts(month);return count[0]*dayRate+count[1]*nightRate;
  }
  public synchronized long recurringTotal(){long s=0;for(Recurring r:recurring)s+=r.amount;return s;}
  public synchronized List<Goal> goals(){return new ArrayList<>(goals);}
  public synchronized List<Recurring> recurring(){return new ArrayList<>(recurring);}
  public synchronized long dayRate(){return dayRate;}
  public synchronized long nightRate(){return nightRate;}
  public synchronized LocalDate shiftStart(){return shiftStart;}
  public synchronized void updateShift(LocalDate firstDay,long day,long night){
    if(day<0||night<0)throw new IllegalArgumentException("Ставка не может быть отрицательной");
    shiftStart=firstDay;dayRate=day;nightRate=night;save();
  }
  public synchronized void addGoal(String name,long target){
    if(name.trim().isEmpty()||target<=0)throw new IllegalArgumentException("Укажи цель и сумму");
    goals.add(new Goal("g"+System.currentTimeMillis(),name.trim(),target,0));save();
  }
  public synchronized void deposit(String id,long amount){
    if(amount<=0)throw new IllegalArgumentException("Неверная сумма");
    for(int i=0;i<goals.size();i++){Goal g=goals.get(i);if(g.id.equals(id)){
      goals.set(i,new Goal(g.id,g.name,g.target,Math.addExact(g.saved,amount)));save();return;
    }}throw new IllegalArgumentException("Цель не найдена");
  }
  public synchronized void addRecurring(String name,long amount,int day){
    if(name.trim().isEmpty()||amount<=0||day<1||day>31)throw new IllegalArgumentException("Проверь платёж");
    recurring.add(new Recurring("r"+System.currentTimeMillis(),name.trim(),amount,day));save();
  }
  public synchronized void removeRecurring(String id){recurring.removeIf(r->r.id.equals(id));save();}
  public synchronized void removeGoal(String id){goals.removeIf(g->g.id.equals(id));save();}
}
