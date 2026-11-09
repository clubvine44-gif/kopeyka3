package app.fin.fina;

import org.junit.Test;
import static org.junit.Assert.*;

public class MoneySpeechTest {
  @Test public void understandsCommonRussianAmounts(){
    assertEquals(500,MoneySpeech.amount("запиши расход пятьсот рублей"));
    assertEquals(4800,MoneySpeech.amount("получил четыре тысячи восемьсот рублей"));
    assertEquals(35000,MoneySpeech.amount("тридцать пять тысяч"));
    assertEquals(5000,MoneySpeech.amount("на 5000 рублей"));
    assertEquals(1100000,MoneySpeech.amount("один миллион сто тысяч"));
    assertEquals(530,MoneySpeech.amount("пятьсот тридцать"));
    assertEquals(0,MoneySpeech.amount("ничего"));
  }
}
