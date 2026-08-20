package ru.kopeyka.voice;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final int RECOGNIZE = 1001;
    private static final int AUDIO = 1002;
    private static final String VOICE_URL = "https://clubvine44-gif.github.io/kopeyka3/voice.html";

    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        int p = dp(28);
        root.setPadding(p, p, p, p);

        TextView title = new TextView(this);
        title.setText("Копейка Голос");
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);

        status = new TextView(this);
        status.setText("Нажми кнопку и скажи, например:\n«Добавь расход 500 рублей сигареты»");
        status.setTextSize(17);
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, dp(20), 0, dp(20));

        Button speak = new Button(this);
        speak.setText("Говорить");
        speak.setOnClickListener(v -> startVoice());

        root.addView(title, new LinearLayout.LayoutParams(-1, -2));
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));
        root.addView(speak, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);
    }

    private void startVoice() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO);
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            status.setText("На телефоне недоступно распознавание речи.");
            return;
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU");
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Скажи операцию для Копейки");
        startActivityForResult(i, RECOGNIZE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != RECOGNIZE) return;
        if (resultCode != RESULT_OK || data == null) {
            status.setText("Не удалось получить голосовую команду.");
            return;
        }
        ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (results == null || results.isEmpty()) {
            status.setText("Не удалось распознать команду.");
            return;
        }
        String command = results.get(0);
        Command c = parse(command);
        if (c == null) {
            status.setText("Не поняла команду:\n«" + command + "»\n\nПример: «Добавь расход 500 рублей сигареты»");
            return;
        }
        openKopeyka(c);
    }

    private Command parse(String raw) {
        String s = raw.toLowerCase(Locale.ROOT).replace('ё', 'е').trim();
        boolean income = containsAny(s, "доход", "получил", "получила", "зарплат", "заработал", "заработала");
        boolean expense = containsAny(s, "расход", "потрат", "покуп", "запиши", "добавь");
        if (!income && !expense) return null;

        double amount = extractNumber(s);
        if (amount <= 0) return null;
        long rounded = Math.round(amount);
        String type = income ? "income" : "expense";

        String text = s;
        text = text.replaceAll("\\b(добавь|добавить|запиши|записать|мне|пожалуйста|расход|доход|получил|получила|зарплату|зарплата|потратил|потратила|потратилa)\\b", " ");
        text = text.replaceAll("\\b" + Pattern.quote(numberToken(s)) + "\\b", " ");
        text = text.replaceAll("\\b(руб(ль|ля|лей)?|р(уб)?|российских|денег)\\b", " ");
        text = text.replaceAll("\\s+", " ").trim();
        text = text.replaceAll("^(на|за|в|из|по)\\s+", "").trim();
        if (text.length() > 80) text = text.substring(0, 80).trim();

        return new Command(type, rounded, text);
    }

    private double extractNumber(String s) {
        Matcher m = Pattern.compile("(\\d+(?:[.,]\\d+)?)").matcher(s);
        if (m.find()) return Double.parseDouble(m.group(1).replace(',', '.'));
        String[] ones = {"ноль","один","два","три","четыре","пять","шесть","семь","восемь","девять","десять"};
        for (int i = 1; i < ones.length; i++) if (s.contains(ones[i])) return i;
        return 0;
    }

    private String numberToken(String s) {
        Matcher m = Pattern.compile("\\d+(?:[.,]\\d+)?").matcher(s);
        return m.find() ? m.group() : "";
    }

    private boolean containsAny(String s, String... words) {
        for (String w : words) if (s.contains(w)) return true;
        return false;
    }

    private void openKopeyka(Command c) {
        try {
            String url = VOICE_URL + "?type=" + enc(c.type) + "&amount=" + c.amount + "&comment=" + enc(c.comment);
            status.setText("Добавляю:\n" + c.type + " " + c.amount + " ₽" + (c.comment.isEmpty() ? "" : "\n" + c.comment));
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            status.setText("Не удалось открыть Копейку.");
        }
    }

    private String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private static class Command {
        final String type, comment;
        final long amount;
        Command(String type, long amount, String comment) { this.type = type; this.amount = amount; this.comment = comment; }
    }
}
