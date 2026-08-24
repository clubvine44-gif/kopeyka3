package app.fin.kopeyka;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.IntentSender;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.PackageInstaller;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import android.app.PendingIntent;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Финн — Android WebView shell. */
public class MainActivity extends AppCompatActivity {
    private static final int REQ_MIC = 1001;
    private static final int REQ_FILE_CHOOSER = 2002;
    private static final String UPDATE_URL = "https://raw.githubusercontent.com/clubvine44-gif/kopeyka3/main/update.json";
    private static final String RELEASES_PAGE_URL = "https://github.com/clubvine44-gif/kopeyka3/releases/latest";
    private static final String PREFS = "fin_update";
    private static final String KEY_SKIP_CODE = "skip_code";
    private static final String KEY_SKIP_UNTIL = "skip_until";
    private static final String KEY_PENDING_APK = "pending_apk";
    private static final long SKIP_MS = 48L * 60L * 60L * 1000L;

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private PermissionRequest pendingMicRequest;
    private ValueCallback<Uri[]> filePathCallback;
    private long lastResumeAt = 0L;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean updateDialogShowing = new AtomicBoolean(false);
    private final AtomicBoolean updateCheckRunning = new AtomicBoolean(false);
    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private AlertDialog progressDlg;
    private long lastInstallAttemptAt = 0L;
    private boolean installInFlight = false;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        refreshLayout = new SwipeRefreshLayout(this);
        refreshLayout.setLayoutParams(new ViewGroup.LayoutParams(-1, -1));
        refreshLayout.setColorSchemeColors(Color.rgb(229, 167, 94));
        setContentView(refreshLayout);
        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(-1, -1));
        webView.setBackgroundColor(Color.parseColor("#0A0B0E"));
        refreshLayout.addView(webView);
        setupWebView();
        refreshLayout.setOnRefreshListener(() -> webView.reload());
        refreshLayout.setEnabled(false);
        // Не даём SwipeRefresh перехватывать скролл в модалках/настройках
        refreshLayout.setOnChildScrollUpCallback((parent, child) -> true);
        refreshLayout.setEnabled(false);
        ensureMicPermission();
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
        checkForUpdate();
        try { UpdateCheckReceiver.scheduleSoon(this); } catch (Exception ignored) {}
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " FinApp/2.9.0");
        webView.addJavascriptInterface(new FinBridge(this), "FinBridge");
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(@NonNull WebView view, @NonNull WebResourceRequest request) {
                return false;
            }
            @Override public void onPageFinished(WebView view, String url) {
                refreshLayout.setRefreshing(false);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "Выбери файл бэкапа"), REQ_FILE_CHOOSER);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
            @Override public void onPermissionRequest(final PermissionRequest request) {
                boolean audio = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) audio = true;
                }
                if (!audio) { request.grant(request.getResources()); return; }
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    pendingMicRequest = request;
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                }
            }
        });
    }

    private void ensureMicPermission() {
        java.util.List<String> needed = new java.util.ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
            needed.add(Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        if (!needed.isEmpty())
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), REQ_MIC);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) results = new Uri[]{data.getData()};
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MIC && pendingMicRequest != null) {
            boolean ok = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) pendingMicRequest.grant(pendingMicRequest.getResources());
            else pendingMicRequest.deny();
            pendingMicRequest = null;
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            long now = System.currentTimeMillis();
            // не дёргаем проверку обновлений при каждом мгновенном resume (мигание UI)
            boolean cool = (now - lastResumeAt) > 120_000L;
            long prevResume = lastResumeAt;
            lastResumeAt = now;
            if (cool && prevResume > 0L) {
                checkForUpdate();
                try { UpdateCheckReceiver.scheduleSoon(this); } catch (Exception ignored) {}
            }
            // Только если ждали разрешение «неизвестные источники» — один раз
            maybeResumePendingInstall();
        }
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    void setPullRefreshEnabled(boolean on) {
        if (refreshLayout != null) refreshLayout.setEnabled(on);
    }

    void forceCheckUpdate() {
        // сброс snooze чтобы проверка была принудительной
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putInt(KEY_SKIP_CODE, 0)
                .putLong(KEY_SKIP_UNTIL, 0L)
                .apply();
        updateCheckRunning.set(false);
        checkForUpdate();
    }

    private void checkForUpdate() {
        if (updateDialogShowing.get() || downloading.get()) return;
        if (!updateCheckRunning.compareAndSet(false, true)) return;

        updateExecutor.execute(() -> {
            HttpURLConnection c = null;
            try {
                URL url = new URL(UPDATE_URL + "?t=" + System.currentTimeMillis());
                c = (HttpURLConnection) url.openConnection();
                c.setConnectTimeout(12000);
                c.setReadTimeout(12000);
                c.setRequestMethod("GET");
                c.setUseCaches(false);
                c.setRequestProperty("Cache-Control", "no-cache");
                c.setInstanceFollowRedirects(true);
                int status = c.getResponseCode();
                if (status != 200) throw new IllegalStateException("HTTP " + status);

                InputStream in = c.getInputStream();
                StringBuilder out = new StringBuilder();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.append(new String(buf, 0, n, "UTF-8"));
                in.close();

                JSONObject j = new JSONObject(out.toString());
                int remoteCode = j.optInt("versionCode", 0);
                String remoteName = j.optString("versionName", "");
                String apkUrl = j.optString("apkUrl", "");
                String notes = j.optString("notes", "");
                int localCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;

                if (remoteCode <= localCode || apkUrl.isEmpty()) return;

                SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
                int skipCode = prefs.getInt(KEY_SKIP_CODE, 0);
                long skipUntil = prefs.getLong(KEY_SKIP_UNTIL, 0L);
                long nowMs = System.currentTimeMillis();
                // «Позже» или уже пробовали ЭТУ версию — не долбим. Старый флаг 999999 игнорим.
                if (skipCode == remoteCode && nowMs < skipUntil) return;
                if (skipCode == 999999) {
                    // миграция со сломанного skip: сбрасываем
                    prefs.edit().putInt(KEY_SKIP_CODE, 0).putLong(KEY_SKIP_UNTIL, 0L).apply();
                }

                runOnUiThread(() -> showUpdateDialog(remoteCode, remoteName, apkUrl, notes));
            } catch (Exception e) {
                android.util.Log.e("FinUpdate", "check failed: " + e.getMessage(), e);
            } finally {
                if (c != null) c.disconnect();
                updateCheckRunning.set(false);
            }
        });
    }

    private void showUpdateDialog(int code, String name, String apkUrl, String notes) {
        if (isFinishing() || (Build.VERSION.SDK_INT >= 17 && isDestroyed())) return;
        if (!updateDialogShowing.compareAndSet(false, true)) return;

        View root = LayoutInflater.from(this).inflate(R.layout.dialog_update, null, false);
        TextView title = root.findViewById(R.id.updTitle);
        TextView ver = root.findViewById(R.id.updVersion);
        TextView notesV = root.findViewById(R.id.updNotes);
        TextView later = root.findViewById(R.id.updLater);
        TextView install = root.findViewById(R.id.updInstall);
        if (title != null) title.setText("Доступна новая версия");
        if (ver != null) ver.setText(name == null || name.isEmpty() ? "Финна" : ("Финна " + name));
        if (notesV != null) notesV.setText(notes == null || notes.isEmpty() ? "Улучшения стабильности и интерфейса." : notes);

        AlertDialog dlg = new AlertDialog.Builder(this)
                .setView(root)
                .setCancelable(true)
                .create();
        if (dlg.getWindow() != null) {
            dlg.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        }
        Runnable skip = () -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putInt(KEY_SKIP_CODE, code)
                    .putLong(KEY_SKIP_UNTIL, System.currentTimeMillis() + SKIP_MS)
                    .apply();
            updateDialogShowing.set(false);
        };
        if (later != null) later.setOnClickListener(v -> { dlg.dismiss(); skip.run(); });
        if (install != null) install.setOnClickListener(v -> {
            dlg.dismiss();
            updateDialogShowing.set(false);
            // на 45 мин не предлагать ЭТУ же versionCode снова (новая версия прилетит)
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putInt(KEY_SKIP_CODE, code)
                    .putLong(KEY_SKIP_UNTIL, System.currentTimeMillis() + 45L * 60L * 1000L)
                    .apply();
            downloadAndInstall(apkUrl, name);
        });
        dlg.setOnCancelListener(d -> skip.run());
        dlg.show();
    }

    /** Прямое скачивание APK с проверкой ZIP-сигнатуры — без битых файлов DownloadManager. */
    private void downloadAndInstall(String apkUrl, String versionName) {
        if (!downloading.compareAndSet(false, true)) return;
        runOnUiThread(() -> {
            try {
                if (progressDlg != null && progressDlg.isShowing()) progressDlg.dismiss();
                View root = LayoutInflater.from(this).inflate(R.layout.dialog_progress, null, false);
                TextView pt = root.findViewById(R.id.progTitle);
                TextView pm = root.findViewById(R.id.progMsg);
                if (pt != null) pt.setText("Обновление Финны" + (versionName != null && !versionName.isEmpty() ? (" " + versionName) : ""));
                if (pm != null) pm.setText("Загрузка…");
                progressDlg = new AlertDialog.Builder(this).setView(root).setCancelable(false).create();
                if (progressDlg.getWindow() != null) {
                    progressDlg.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
                }
                progressDlg.show();
            } catch (Exception ignored) {}
        });

        updateExecutor.execute(() -> {
            File dir = getExternalFilesDir(null);
            if (dir == null) dir = getFilesDir();
            File apk = new File(dir, "Fin-update.apk");
            if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                apk.delete();

            HttpURLConnection c = null;
            try {
                URL url = new URL(apkUrl);
                c = openFollowingRedirects(url);
                int status = c.getResponseCode();
                if (status == 404) throw new IllegalStateException("APK не найден (404). Релиз ещё не опубликован.");
                if (status != 200) throw new IllegalStateException("HTTP " + status);

                String ctype = String.valueOf(c.getContentType()).toLowerCase();
                // GitHub иногда отдаёт application/octet-stream — это ок
                if (ctype.contains("text/html") || ctype.contains("text/plain"))
                    throw new IllegalStateException("Сервер вернул текст вместо APK. Релиз ещё не готов.");

                long contentLen = c.getContentLengthLong();
                final long finalLen = contentLen;
                runOnUiThread(() -> {
                    try {
                        if (progressDlg != null) {
                            if (finalLen > 0) {
                                { ProgressBar pb = progressDlg.findViewById(R.id.progBar); if (pb != null) pb.setIndeterminate(false); }
                                { ProgressBar pb = progressDlg.findViewById(R.id.progBar); if (pb != null) pb.setMax(100); }
                                { ProgressBar pb = progressDlg.findViewById(R.id.progBar); if (pb != null) { pb.setIndeterminate(false); pb.setProgress(0); } TextView pctV = progressDlg.findViewById(R.id.progPct); if (pctV != null) pctV.setText(0 + "%"); }
                                { TextView pm = progressDlg.findViewById(R.id.progMsg); if (pm != null) pm.setText("Загрузка… 0%"); }
                            } else {
                                { ProgressBar pb = progressDlg.findViewById(R.id.progBar); if (pb != null) pb.setIndeterminate(true); }
                                { TextView pm = progressDlg.findViewById(R.id.progMsg); if (pm != null) pm.setText("Загрузка…"); }
                            }
                        }
                    } catch (Exception ignored) {}
                });
                InputStream in = c.getInputStream();
                FileOutputStream out = new FileOutputStream(apk);
                byte[] buf = new byte[8192];
                int n;
                long total = 0;
                int lastPct = -1;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                    total += n;
                    if (contentLen > 0) {
                        int pct = (int) Math.min(100, (total * 100) / contentLen);
                        if (pct != lastPct) {
                            lastPct = pct;
                            final int p = pct;
                            runOnUiThread(() -> {
                                try {
                                    if (progressDlg != null && progressDlg.isShowing()) {
                                        { ProgressBar pb = progressDlg.findViewById(R.id.progBar); if (pb != null) { pb.setIndeterminate(false); pb.setProgress(p); } TextView pctV = progressDlg.findViewById(R.id.progPct); if (pctV != null) pctV.setText(p + "%"); }
                                        { TextView pm = progressDlg.findViewById(R.id.progMsg); if (pm != null) pm.setText("Загрузка… " + p + "%"); }
                                    }
                                } catch (Exception ignored) {}
                            });
                        }
                    }
                }
                out.flush();
                out.close();
                in.close();

                if (total < 100_000) throw new IllegalStateException("Файл слишком маленький (" + total + " байт) — это не APK");
                if (contentLen > 0 && total < contentLen * 0.95) throw new IllegalStateException("Скачивание оборвалось");

                // APK = ZIP, магия PK\x03\x04
                java.io.RandomAccessFile raf = new java.io.RandomAccessFile(apk, "r");
                byte[] magic = new byte[4];
                raf.readFully(magic);
                raf.close();
                if (magic[0] != 'P' || magic[1] != 'K') {
                    //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                    throw new IllegalStateException("Скачанный файл не APK. Возможно, релиз ещё не опубликован.");
                }

                runOnUiThread(() -> {
                    try { if (progressDlg != null && progressDlg.isShowing()) progressDlg.dismiss(); } catch (Exception ignored) {}
                    installApk(apk);
                });
            } catch (Exception e) {
                android.util.Log.e("FinUpdate", "download failed: " + e.getMessage(), e);
                if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                final String msg = e.getMessage() != null ? e.getMessage() : "неизвестная ошибка";
                runOnUiThread(() -> {
                    try { if (progressDlg != null && progressDlg.isShowing()) progressDlg.dismiss(); } catch (Exception ignored) {}
                    Toast.makeText(this,
                        "Не удалось обновить: " + msg
                                + "\nСкачай APK вручную с GitHub Releases.",
                        Toast.LENGTH_LONG).show();
                });
            } finally {
                if (c != null) c.disconnect();
                downloading.set(false);
            }
        });
    }

    private HttpURLConnection openFollowingRedirects(URL url) throws Exception {
        URL current = url;
        for (int i = 0; i < 8; i++) {
            HttpURLConnection c = (HttpURLConnection) current.openConnection();
            c.setConnectTimeout(20000);
            c.setReadTimeout(60000);
            c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent", "FinApp-Updater/2.5");
            c.setRequestProperty("Accept", "application/vnd.android.package-archive,application/octet-stream,*/*");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) {
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (loc == null || loc.isEmpty()) throw new IllegalStateException("Redirect without Location");
                current = new URL(current, loc);
                continue;
            }
            return c;
        }
        throw new IllegalStateException("Слишком много редиректов");
    }

    private void installApk(File apk) {
        try {
            if (apk == null || !apk.exists() || apk.length() < 100_000L) {
                Toast.makeText(this, "APK не найден или повреждён. Попробуй ещё раз.", Toast.LENGTH_LONG).show();
                return;
            }

            long now = System.currentTimeMillis();
            // анти-мигание: не чаще одного запуска установщика в 3 минуты
            if (installInFlight || (now - lastInstallAttemptAt) < 180_000L) {
                Toast.makeText(this, "Установщик уже запускался. Подтверди установку в системном окне или подожди пару минут.", Toast.LENGTH_LONG).show();
                return;
            }
            installInFlight = true;
            lastInstallAttemptAt = now;

            // Не блокируем будущие версии. Кулдаун установщика — через lastInstallAttemptAt.
            updateDialogShowing.set(false);
            downloading.set(false);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getPackageManager().canRequestPackageInstalls()) {
                // Только в этом случае сохраняем pending — продолжим ПОСЛЕ настроек один раз
                getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                        .putString(KEY_PENDING_APK, apk.getAbsolutePath())
                        .putBoolean("pending_from_settings", true)
                        .apply();
                installInFlight = false; // разрешим повтор после возврата из настроек
                try {
                    startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())));
                    Toast.makeText(this,
                            "Разреши установку из этого источника и вернись в Финну.",
                            Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Разреши установку неизвестных приложений в настройках.", Toast.LENGTH_LONG).show();
                }
                return;
            }

            // Обычный запуск установщика — pending НЕ пишем (иначе onResume зациклится)
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .remove(KEY_PENDING_APK)
                    .remove("pending_from_settings")
                    .apply();

            try {
                installWithPackageInstaller(apk);
                Toast.makeText(this, "Подтверди установку в системном окне.", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                android.util.Log.e("FinUpdate", "PackageInstaller failed: " + e.getMessage(), e);
                try {
                    installWithViewIntent(apk);
                    Toast.makeText(this, "В установщике нажми «Установить».", Toast.LENGTH_LONG).show();
                } catch (Exception e2) {
                    android.util.Log.e("FinUpdate", "VIEW install failed: " + e2.getMessage(), e2);
                    installInFlight = false;
                    try {
                        Intent openReleases = new Intent(Intent.ACTION_VIEW, Uri.parse(RELEASES_PAGE_URL));
                        openReleases.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(openReleases);
                        Toast.makeText(this, "Скачай APK вручную со страницы релиза.", Toast.LENGTH_LONG).show();
                    } catch (Exception e3) {
                        Toast.makeText(this, "Не удалось запустить установщик.", Toast.LENGTH_LONG).show();
                    }
                }
            } finally {
                // Через 2с снимаем inFlight, но lastInstallAttemptAt держит кулдаун 3 мин
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> installInFlight = false, 2000);
            }
        } catch (Exception e) {
            installInFlight = false;
            android.util.Log.e("FinUpdate", "installApk: " + e.getMessage(), e);
            Toast.makeText(this, "Не удалось запустить установщик: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void installWithPackageInstaller(File apk) throws Exception {
        PackageInstaller installer = getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        try {
            params.setAppPackageName(getPackageName());
        } catch (Exception ignored) {}
        if (Build.VERSION.SDK_INT >= 34) {
            try {
                params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED);
            } catch (Exception ignored) {}
        }
        int sessionId = installer.createSession(params);
        PackageInstaller.Session session = installer.openSession(sessionId);
        try {
            try (OutputStream out = session.openWrite("fin-update.apk", 0, apk.length());
                 FileInputStream in = new FileInputStream(apk)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                }
                session.fsync(out);
            }
            // Broadcast, не Activity — иначе MainActivity мигает в цикле
            Intent callback = new Intent(this, UpdateCheckReceiver.class);
            callback.setAction("app.fin.kopeyka.INSTALL_STATUS");
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
            else if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getBroadcast(this, sessionId, callback, flags);
            session.commit(pi.getIntentSender());
        } finally {
            try { session.close(); } catch (Exception ignored) {}
        }
    }

    private void installWithViewIntent(File apk) throws Exception {
        String authority = getPackageName() + ".fileprovider";
        Uri apkUri = FileProvider.getUriForFile(this, authority, apk);
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        install.setClipData(android.content.ClipData.newRawUri("apk", apkUri));
        try {
            java.util.List<android.content.pm.ResolveInfo> res =
                    getPackageManager().queryIntentActivities(install, PackageManager.MATCH_DEFAULT_ONLY);
            for (android.content.pm.ResolveInfo ri : res) {
                grantUriPermission(ri.activityInfo.packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
        } catch (Exception ignored) {}
        if (install.resolveActivity(getPackageManager()) == null) {
            Intent alt = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            alt.setData(apkUri);
            alt.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            alt.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
            if (alt.resolveActivity(getPackageManager()) != null) {
                startActivity(alt);
                return;
            }
            throw new ActivityNotFoundException("No package installer activity");
        }
        startActivity(install);
    }

    /** Только после возврата из настроек «неизвестные источники» — один раз. */
    private void maybeResumePendingInstall() {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            if (!prefs.getBoolean("pending_from_settings", false)) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getPackageManager().canRequestPackageInstalls()) return;
            String path = prefs.getString(KEY_PENDING_APK, null);
            // сразу гасим флаги — до вызова install, чтобы onResume не зациклил
            prefs.edit()
                    .remove(KEY_PENDING_APK)
                    .remove("pending_from_settings")
                    .apply();
            if (path == null || path.isEmpty()) return;
            File apk = new File(path);
            if (!apk.exists() || apk.length() < 100_000L) return;
            // сброс кулдауна только для этого осознанного продолжения
            lastInstallAttemptAt = 0L;
            installInFlight = false;
            installApk(apk);
        } catch (Exception e) {
            android.util.Log.e("FinUpdate", "resume install: " + e.getMessage(), e);
        }
    }





    @Override public void onBackPressed() {
        if (webView != null) {
            // Matter / in-app back first (room → constellation, etc.)
            webView.evaluateJavascript(
                "(function(){try{if(window.__matterBack&&window.__matterBack())return true;if(window.FinMatter&&window.FinMatter.back&&window.FinMatter.back())return true;}catch(e){}return false;})()",
                value -> {
                    boolean handled = value != null && value.contains("true");
                    if (!handled) {
                        if (webView.canGoBack()) webView.goBack();
                        else MainActivity.super.onBackPressed();
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }

    @Override protected void onDestroy() {
        updateExecutor.shutdownNow();
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
