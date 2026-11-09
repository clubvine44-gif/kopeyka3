package app.fin.fina;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class Ledger {
  public static final class Entry {
    public final long id, timestamp, amount;
    public final String category, note;
    public Entry(long id,long timestamp,long amount,String category,String note){
      this.id=id;this.timestamp=timestamp;this.amount=amount;this.category=category;this.note=note;
    }
  }
  private final SharedPreferences prefs;
  private final List<Entry> entries=new ArrayList<>();
  private long openingBalance=0L;
  public Ledger(Context c){prefs=c.getSharedPreferences("fina_native_ledger_v1",Context.MODE_PRIVATE);load();}
  private void load(){
    entries.clear();
    try {
      JSONObject root=new JSONObject(prefs.getString("ledger","{}"));
      openingBalance=root.optLong("openingBalance",0L);
      JSONArray a=root.optJSONArray("entries");
      if(a!=null)for(int i=0;i<a.length();i++){JSONObject o=a.optJSONObject(i);if(o!=null)entries.add(new Entry(o.optLong("id"),o.optLong("date"),o.optLong("amount"),o.optString("category","Другое"),o.optString("note","")));}
    }catch(Exception ignored){}
    Collections.sort(entries,(a,b)->Long.compare(b.timestamp,a.timestamp));
  }
  private void persist(){
    try{
      JSONObject root=new JSONObject();root.put("schema",1);root.put("openingBalance",openingBalance);
      JSONArray arr=new JSONArray();
      for(Entry e:entries){JSONObject o=new JSONObject();o.put("id",e.id);o.put("date",e.timestamp);o.put("amount",e.amount);o.put("category",e.category);o.put("note",e.note);arr.put(o);}
      root.put("entries",arr);
      if(!prefs.edit().putString("ledger",root.toString()).commit())throw new IllegalStateException("Storage failed");
    }catch(Exception e){throw new IllegalStateException("Не удалось сохранить данные",e);}
  }
  public synchronized void add(long amount,String category,String note){
    if(amount==0||Math.abs(amount)>100000000000L)throw new IllegalArgumentException("Проверь сумму");
    entries.add(0,new Entry(System.currentTimeMillis(),System.currentTimeMillis(),amount,category,note));
    persist();
  }
  public synchronized void setOpeningBalance(long value){openingBalance=value;persist();}
  public synchronized long openingBalance(){return openingBalance;}
  public synchronized long balance(){long result=openingBalance;for(Entry e:entries)result+=e.amount;return result;}
  public synchronized long monthExpense(){return monthSum(false);}
  public synchronized long monthIncome(){return monthSum(true);}
  private long monthSum(boolean positive){
    Calendar c=Calendar.getInstance();c.set(Calendar.DAY_OF_MONTH,1);c.set(Calendar.HOUR_OF_DAY,0);c.set(Calendar.MINUTE,0);c.set(Calendar.SECOND,0);c.set(Calendar.MILLISECOND,0);
    long start=c.getTimeInMillis(),sum=0;for(Entry e:entries)if(e.timestamp>=start && (positive?e.amount>0:e.amount<0))sum+=Math.abs(e.amount);return sum;
  }
  public synchronized List<Entry> recent(int n){return new ArrayList<>(entries.subList(0,Math.min(n,entries.size())));}
  public synchronized String exportJson(){try{JSONObject root=new JSONObject();root.put("format","fina-native-v1");root.put("openingBalance",openingBalance);JSONArray a=new JSONArray();
    for(Entry e:entries){JSONObject o=new JSONObject();o.put("id",e.id);o.put("date",e.timestamp);o.put("amount",e.amount);o.put("category",e.category);o.put("note",e.note);a.put(o);}
    root.put("entries",a);return root.toString(2);}catch(Exception e){throw new IllegalStateException(e);}}
  public synchronized void importJson(String json){
    try{
      JSONObject o=new JSONObject(json);if(!"fina-native-v1".equals(o.optString("format")))throw new IllegalArgumentException("Неподдерживаемый формат");
      JSONArray a=o.getJSONArray("entries");if(a.length()>100000)throw new IllegalArgumentException("Слишком много записей");
      List<Entry> next=new ArrayList<>();
      for(int i=0;i<a.length();i++){JSONObject e=a.getJSONObject(i);next.add(new Entry(e.getLong("id"),e.getLong("date"),e.getLong("amount"),e.optString("category","Другое"),e.optString("note","")));}
      long old=openingBalance;List<Entry> previous=new ArrayList<>(entries);
      openingBalance=o.getLong("openingBalance");entries.clear();entries.addAll(next);Collections.sort(entries,(x,y)->Long.compare(y.timestamp,x.timestamp));
      try{persist();}catch(Exception failure){openingBalance=old;entries.clear();entries.addAll(previous);throw failure;}
    }catch(Exception e){throw new IllegalArgumentException("Не удалось импортировать данные: "+e.getMessage(),e);}
  }
  public static String money(long amount){return String.format(new Locale("ru","RU"),"%,d ₽",amount).replace('\u00a0',' ');}
  public static String date(long ts){return new SimpleDateFormat("dd MMM",new Locale("ru","RU")).format(new Date(ts));}
}
