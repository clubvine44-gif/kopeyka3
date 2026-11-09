package app.fin.fina;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Parses amounts recognized as Russian words, fully offline. */
public final class MoneySpeech {
  private static final Map<String,Integer> VALUES=new HashMap<>();
  static{
    String[][] words={
      {"ноль","0"},{"один","1"},{"одна","1"},{"одно","1"},{"две","2"},{"два","2"},
      {"три","3"},{"четыре","4"},{"пять","5"},{"шесть","6"},{"семь","7"},{"восемь","8"},{"девять","9"},
      {"десять","10"},{"одиннадцать","11"},{"двенадцать","12"},{"тринадцать","13"},{"четырнадцать","14"},{"пятнадцать","15"},
      {"шестнадцать","16"},{"семнадцать","17"},{"восемнадцать","18"},{"девятнадцать","19"},
      {"двадцать","20"},{"тридцать","30"},{"сорок","40"},{"пятьдесят","50"},{"шестьдесят","60"},
      {"семьдесят","70"},{"восемьдесят","80"},{"девяносто","90"},
      {"сто","100"},{"двести","200"},{"триста","300"},{"четыреста","400"},{"пятьсот","500"},
      {"шестьсот","600"},{"семьсот","700"},{"восемьсот","800"},{"девятьсот","900"}
    };
    for(String[] v:words)VALUES.put(v[0],Integer.parseInt(v[1]));
  }
  private MoneySpeech(){}
  public static long amount(String speech){
    String s=speech.toLowerCase(new Locale("ru","RU")).replace('ё','е').replaceAll("[^а-я0-9 ]"," ");
    long best=0,group=0,total=0;
    boolean seen=false;
    for(String token:s.split("\\s+")){
      if(token.isEmpty())continue;
      Integer word=VALUES.get(token);
      if(word!=null){group+=word;seen=true;continue;}
      if(token.matches("[0-9]+")){
        try{group+=Long.parseLong(token);seen=true;}catch(Exception e){return 0;}
        continue;
      }
      if(token.matches("тыс|тысяча|тысячи|тысяч|тыщ|тыщи")){
        if(!seen)group=1;total+=group*1000L;group=0;seen=true;continue;
      }
      if(token.matches("миллион|миллиона|миллионов")){
        if(!seen)group=1;total+=group*1000000L;group=0;seen=true;continue;
      }
      if(seen){best=Math.max(best,total+group);group=0;total=0;seen=false;}
    }
    if(seen)best=Math.max(best,total+group);
    return best>100000000000L?0:best;
  }
}
