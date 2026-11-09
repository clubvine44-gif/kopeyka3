package app.fin.fina;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import java.util.ArrayList;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Voice control separated from rendering and finance logic.
 * SpeechRecognizer is only a platform adapter, NOT guaranteed offline.
 * No cloud API keys or LLM integrations.
 */
public final class FinVoice {
  public interface Actions {
    void onStatus(String text,FinOrbView.Mood mood);
    void onCommand(String text);
  }
  private final Activity activity;
  private final Actions actions;
  private SpeechRecognizer recognizer;
  private TextToSpeech tts;
  private boolean alive=true;
  public FinVoice(Activity activity,Actions actions){
    this.activity=activity;this.actions=actions;
    tts=new TextToSpeech(activity,status->{if(status==TextToSpeech.SUCCESS&&tts!=null)tts.setLanguage(new Locale("ru","RU"));});
  }
  public void listen(){
    if(!alive)return;
    if(activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
      activity.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},100);actions.onStatus("Разреши доступ к микрофону",FinOrbView.Mood.IDLE);return;
    }
    if(!SpeechRecognizer.isRecognitionAvailable(activity)){actions.onStatus("На устройстве нет службы распознавания речи",FinOrbView.Mood.IDLE);return;}
    stopRecognizer();
    recognizer=SpeechRecognizer.createSpeechRecognizer(activity);
    recognizer.setRecognitionListener(new RecognitionListener(){
      public void onReadyForSpeech(Bundle params){actions.onStatus("Слушаю",FinOrbView.Mood.LISTENING);}
      public void onBeginningOfSpeech(){actions.onStatus("Слушаю",FinOrbView.Mood.LISTENING);}
      public void onRmsChanged(float rms){}
      public void onBufferReceived(byte[] buffer){}
      public void onEndOfSpeech(){actions.onStatus("Обрабатываю",FinOrbView.Mood.THINKING);}
      public void onError(int error){actions.onStatus("Не расслышала. Попробуй ещё раз",FinOrbView.Mood.IDLE);stopRecognizer();}
      public void onResults(Bundle results){
        ArrayList<String> candidates=results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if(candidates!=null&&!candidates.isEmpty())actions.onCommand(candidates.get(0));
        else actions.onStatus("Команда не распознана",FinOrbView.Mood.IDLE);
        stopRecognizer();
      }
      public void onPartialResults(Bundle results){}
      public void onEvent(int eventType,Bundle params){}
    });
    Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"ru-RU");
    i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);
    i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true);
    recognizer.startListening(i);
  }
  public void say(String text){
    actions.onStatus(text,FinOrbView.Mood.SPEAKING);
    if(tts!=null)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"fina-response");
  }
  private void stopRecognizer(){if(recognizer!=null){try{recognizer.cancel();recognizer.destroy();}catch(Exception ignored){}recognizer=null;}}
  public void pause(){stopRecognizer();}
  public void destroy(){alive=false;stopRecognizer();if(tts!=null){tts.stop();tts.shutdown();tts=null;}}
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
