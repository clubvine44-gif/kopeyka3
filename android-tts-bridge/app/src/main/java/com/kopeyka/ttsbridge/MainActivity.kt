package com.kopeyka.ttsbridge

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale

class MainActivity : Activity() {
    private var tts: TextToSpeech? = null
    private lateinit var status: TextView
    private lateinit var engines: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.TOP
            setPadding(32, 48, 32, 32)
        }
        root.addView(TextView(this).apply {
            text = "TTS-движки Android"
            textSize = 24f
        })
        status = TextView(this).apply {
            text = "Проверяю установленные движки…"
            textSize = 16f
            setPadding(0, 24, 0, 24)
        }
        root.addView(status)
        engines = TextView(this).apply { textSize = 15f }
        root.addView(engines)
        root.addView(Button(this).apply {
            text = "Проверить текущий голос"
            setOnClickListener { tts?.speak("Привет, Никита. Это тест выбранного голосового движка.", TextToSpeech.QUEUE_FLUSH, null, "test") }
        })
        setContentView(root)

        val manager = getSystemService(TextToSpeech.Engine::class.java)
        val installed = manager?.voices?.map { it.name }?.distinct()?.sorted() ?: emptyList()
        val defaultEngine = TextToSpeech(this) { init ->
            status.text = if (init == TextToSpeech.SUCCESS) {
                "Системный TTS успешно запущен"
            } else "Не удалось запустить системный TTS"
        }
        tts = defaultEngine

        val enginePackages = packageManager.queryIntentServices(
            android.content.Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE), 0
        ).map { it.serviceInfo.packageName }.distinct()
        engines.text = if (enginePackages.isEmpty()) {
            "Установленные TTS-движки не найдены"
        } else {
            "Найденные TTS-движки:\n\n" + enginePackages.joinToString("\n")
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}
