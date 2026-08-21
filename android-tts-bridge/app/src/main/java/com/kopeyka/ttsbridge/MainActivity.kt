package com.kopeyka.ttsbridge

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private var tts: TextToSpeech? = null
    private lateinit var status: TextView
    private lateinit var enginesView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP
            setPadding(32, 48, 32, 32)
        }
        root.addView(TextView(this).apply { text = "TTS-движки Android"; textSize = 24f })
        status = TextView(this).apply { text = "Инициализация…"; textSize = 16f; setPadding(0, 24, 0, 24) }
        root.addView(status)
        enginesView = TextView(this).apply { textSize = 15f }
        root.addView(enginesView)
        root.addView(Button(this).apply {
            text = "Открыть настройки TTS"
            setOnClickListener { startActivity(Intent("com.android.settings.TTS_SETTINGS")) }
        })
        root.addView(Button(this).apply {
            text = "Проверить текущий голос"
            setOnClickListener { tts?.speak("Привет, Никита. Это тест выбранного голосового движка.", TextToSpeech.QUEUE_FLUSH, null, "test") }
        })
        setContentView(root)

        val enginePackages = packageManager.queryIntentServices(
            Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE), 0
        ).map { it.serviceInfo.packageName }.distinct()
        enginesView.text = if (enginePackages.isEmpty()) {
            "TTS-движки не найдены"
        } else {
            "Найденные TTS-движки:\n\n" + enginePackages.joinToString("\n")
        }

        tts = TextToSpeech(this) { result ->
            status.text = if (result == TextToSpeech.SUCCESS) "Системный TTS запущен" else "Ошибка запуска TTS"
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}
