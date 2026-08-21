package com.kopeyka.ttsbridge

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.widget.Button
import android.widget.LinearLayout
import java.util.Locale

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)
        val button = Button(this).apply { text = "Проверить голос SherpaTTS"; setOnClickListener { speak("Привет, Никита. Это тест голоса Копейки.") } }
        setContentView(LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; addView(button) })
    }
    override fun onInit(status: Int) { if (status == TextToSpeech.SUCCESS) tts?.language = Locale("ru", "RU") }
    private fun speak(text: String) { tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kopeyka-test") }
    override fun onDestroy() { tts?.stop(); tts?.shutdown(); super.onDestroy() }
}
