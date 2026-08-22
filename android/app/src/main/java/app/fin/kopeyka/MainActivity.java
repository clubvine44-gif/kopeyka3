package app.fin.kopeyka;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
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
    private static final String PREFS = "fin_update";
    private static final String KEY_SKIP_CODE = "skip_code";
    private static final String KEY_SKIP_UNTIL = "skip_until";
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
        ensureMicPermission();
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
        checkForUpdate();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
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
        s.setUserAgentString(s.getUserAgentString() + " FinApp/2.7.0");
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
            if (lastResumeAt > 0 && now - lastResumeAt > 1500) webView.reload();
            lastResumeAt = now;
        }
        checkForUpdate();
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
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
                if (skipCode == remoteCode && System.currentTimeMillis() < skipUntil) return;

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

        String message = "Доступна новая версия Финн"
                + (name.isEmpty() ? "" : " " + name)
                + "\n\n"
                + (notes.isEmpty() ? "Обновление приложения." : notes)
                + "\n\nУстановится поверх текущей версии без удаления данных.";

        new AlertDialog.Builder(this)
                .setTitle("Доступно обновление")
                .setMessage(message)
                .setNegativeButton("Позже", (d, w) -> {
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                            .putInt(KEY_SKIP_CODE, code)
                            .putLong(KEY_SKIP_UNTIL, System.currentTimeMillis() + SKIP_MS)
                            .apply();
                    updateDialogShowing.set(false);
                })
                .setPositiveButton("Установить", (d, w) -> {
                    updateDialogShowing.set(false);
                    downloadAndInstall(apkUrl, name);
                })
                .setOnCancelListener(d -> {
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                            .putInt(KEY_SKIP_CODE, code)
                            .putLong(KEY_SKIP_UNTIL, System.currentTimeMillis() + SKIP_MS)
                            .apply();
                    updateDialogShowing.set(false);
                })
                .setCancelable(true)
                .show();
    }

    /** Прямое скачивание APK с проверкой ZIP-сигнатуры — без битых файлов DownloadManager. */
    private void downloadAndInstall(String apkUrl, String versionName) {
        if (!downloading.compareAndSet(false, true)) return;
        Toast.makeText(this, "Скачиваю обновление…", Toast.LENGTH_SHORT).show();

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
                InputStream in = c.getInputStream();
                FileOutputStream out = new FileOutputStream(apk);
                byte[] buf = new byte[8192];
                int n;
                long total = 0;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                    total += n;
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

                runOnUiThread(() -> installApk(apk));
            } catch (Exception e) {
                android.util.Log.e("FinUpdate", "download failed: " + e.getMessage(), e);
                if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                final String msg = e.getMessage() != null ? e.getMessage() : "неизвестная ошибка";
                runOnUiThread(() -> Toast.makeText(this,
                        "Не удалось обновить: " + msg
                                + "\nСкачай APK вручную с GitHub Releases.",
                        Toast.LENGTH_LONG).show());
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName())));
                Toast.makeText(this, "Разреши установку из этого источника и снова нажми «Установить».", Toast.LENGTH_LONG).show();
                return;
            }
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось открыть установщик: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
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
