package app.fin.fina;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.speech.tts.TextToSpeech;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;
import java.io.IOException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Vosk Russian speech recognition operates wholly on-device; no API keys or network. */
public final class FinVoice {
  public interface Actions {
    void onStatus(String text,FinOrbView.Mood mood);
    void onCommand(String text);
  }
  private final Activity activity;
  private final Actions actions;
  private Model model;
  private SpeechService service;
  private TextToSpeech tts;
  private boolean alive=true,loading=false,pendingListen=false,gotResult=false;
  public FinVoice(Activity activity,Actions actions){
    this.activity=activity;this.actions=actions;
    tts=new TextToSpeech(activity,status->{if(status==TextToSpeech.SUCCESS&&tts!=null)tts.setLanguage(new Locale("ru","RU"));});
  }
  public void listen(){
    if(!alive)return;
    if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
      activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},100);
      actions.onStatus("Разреши доступ к микрофону",FinOrbView.Mood.IDLE);return;
    }
    pendingListen=true;
    if(model!=null){begin();return;}
    if(loading){actions.onStatus("Подготавливаю локальную модель…",FinOrbView.Mood.THINKING);return;}
    loading=true;
    actions.onStatus("Первый запуск: готовлю офлайн-распознавание…",FinOrbView.Mood.THINKING);
    StorageService.unpack(activity,"model-ru","model-ru",
      unpacked->activity.runOnUiThread(()->{
        loading=false;
        if(!alive){unpacked.close();return;}
        model=unpacked;
        if(pendingListen)begin();
        else actions.onStatus("Готова слушать",FinOrbView.Mood.IDLE);
      }),
      error->activity.runOnUiThread(()->{
        loading=false;pendingListen=false;
        if(alive)actions.onStatus("Модель недоступна: "+error.getMessage(),FinOrbView.Mood.IDLE);
      }));
  }
  private void begin(){
    if(!alive||model==null)return;
    halt();
    pendingListen=true;gotResult=false;
    try{
      Recognizer recognizer=new Recognizer(model,16000.0f);
      service=new SpeechService(recognizer,16000.0f);
      actions.onStatus("Слушаю (офлайн)",FinOrbView.Mood.LISTENING);
      service.startListening(new RecognitionListener(){
        @Override public void onPartialResult(String hypothesis){}
        @Override public void onResult(String hypothesis){handle(hypothesis);}
        @Override public void onFinalResult(String hypothesis){handle(hypothesis);}
        @Override public void onError(Exception e){activity.runOnUiThread(()->{if(alive)actions.onStatus("Ошибка микрофона: "+e.getMessage(),FinOrbView.Mood.IDLE);halt();});}
        @Override public void onTimeout(){activity.runOnUiThread(()->{if(alive&&!gotResult)actions.onStatus("Не расслышала",FinOrbView.Mood.IDLE);halt();});}
      });
    }catch(IOException e){halt();actions.onStatus("Не удалось запустить распознавание",FinOrbView.Mood.IDLE);}
  }
  private void handle(String json){
    String recognized="";try{recognized=new JSONObject(json).optString("text","").trim();}catch(Exception ignored){}
    if(recognized.isEmpty())return;
    final String words=recognized;
    activity.runOnUiThread(()->{
      if(!alive||gotResult)return;
      gotResult=true;
      actions.onStatus("Распознано: "+words,FinOrbView.Mood.THINKING);
      halt();
      actions.onCommand(words);
    });
  }
  public void say(String text){
    actions.onStatus(text,FinOrbView.Mood.SPEAKING);
    if(tts!=null)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"fina-response");
  }
  private void halt(){
    pendingListen=false;
    SpeechService old=service;service=null;
    if(old!=null){try{old.stop();old.shutdown();}catch(Exception ignored){}}
  }
  public void pause(){halt();}
  public void destroy(){
    alive=false;halt();
    if(model!=null){model.close();model=null;}
    if(tts!=null){tts.stop();tts.shutdown();tts=null;}
  }
  public static final class Parsed {
    public final String type,category,original;
    public final long amount;
    private Parsed(String type,long amount,String category,String original){this.type=type;this.amount=amount;this.category=category;this.original=original;}
  }
  public static Parsed parse(String raw){
    String s=raw.toLowerCase(new Locale("ru","RU")).replace("ё","е").replaceAll("[^а-яa-z0-9\\s]"," ").replaceAll("\\s+"," ").trim();
    if(s.contains("баланс")||s.contains("сколько денег")||s.contains("остаток"))return new Parsed("balance",0,"",raw);
    if(s.contains("расход")||s.contains("потрат")||s.contains("запиши трат")||s.contains("купил")||s.contains("оплатил")){
      long v=extractAmount(s);return new Parsed(v>0?"expense":"unknown",v,category(s),raw);
    }
    if(s.contains("доход")||s.contains("получил")||s.contains("зарплат")||s.contains("заработал")){
      long v=extractAmount(s);return new Parsed(v>0?"income":"unknown",v,"Доход",raw);
    }
    if(s.contains("операци")||s.contains("истори"))return new Parsed("history",0,"",raw);
    if(s.contains("настройк"))return new Parsed("settings",0,"",raw);
    if(s.contains("помощ")||s.contains("что умеешь"))return new Parsed("help",0,"",raw);
    return new Parsed("unknown",0,"",raw);
  }
  private static String category(String s){
    if(s.contains("еда")||s.contains("продукт")||s.contains("магазин")||s.contains("кафе"))return "Продукты";
    if(s.contains("такси")||s.contains("автобус")||s.contains("бензин")||s.contains("проезд"))return "Транспорт";
    if(s.contains("ребен")||s.contains("еве")||s.contains("дет"))return "Семья";
    if(s.contains("аптек")||s.contains("лекарств")||s.contains("здоров"))return "Здоровье";
    return "Другое";
  }
  private static long extractAmount(String s){
    Matcher m=Pattern.compile("(\\d[\\d\\s]*)(?:\\s*(тысяч|тысячи|тысяча|тыс))?").matcher(s);
    if(!m.find())return 0;
    try{long n=Long.parseLong(m.group(1).replace(" ",""));if(m.group(2)!=null)n=Math.multiplyExact(n,1000);return n;}catch(Exception ignored){return 0;}
  }
}
