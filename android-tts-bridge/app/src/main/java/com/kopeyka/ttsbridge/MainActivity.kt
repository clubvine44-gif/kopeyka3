package com.kopeyka.ttsbridge

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private lateinit var statusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP
            setPadding(32, 48, 32, 32)
            setBackgroundColor(Color.WHITE)
        }
        val title = TextView(this).apply {
            text = "Копейка — тест голоса"
            textSize = 24f
            setTextColor(Color.BLACK)
            setPadding(0, 0, 0, 24)
        }
        root.addView(title, LinearLayout.LayoutParams(-1, -2))
        statusView = TextView(this).apply {
            text = "Инициализация TTS…"
            textSize = 16f
            setTextColor(Color.DKGRAY)
            setPadding(0, 0, 0, 24)
        }
        root.addView(statusView, LinearLayout.LayoutParams(-1, -2))
        val button = Button(this).apply {
            text = "Проверить голос SherpaTTS"
            textSize = 16f
            setOnClickListener { speak("Привет, Никита. Это тест голоса Копейки.") }
        }
        root.addView(button, LinearLayout.LayoutParams(-1, -2))
        setContentView(root)
        tts = TextToSpeech(this, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("ru", "RU")) ?: TextToSpeech.ERROR
            statusView.text = if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                "TTS запущен, но русский язык недоступен"
            } else {
                "TTS готов. Выбранный системный движок будет использоваться Android."
            }
        } else {
            statusView.text = "Не удалось запустить TTS"
        }
    }

    private fun speak(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kopeyka-test")
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}
