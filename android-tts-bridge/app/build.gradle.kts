plugins {
    id("com.android.application")
    kotlin("android")
}

android { namespace = "com.kopeyka.ttsbridge"; compileSdk = 36
    defaultConfig { applicationId = "com.kopeyka.ttsbridge"; minSdk = 26; targetSdk = 36; versionCode = 1; versionName = "1.0" }
}
