package app.fin.kopeyka;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
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
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Финн — Android-оболочка: UI и логика приложения работают внутри WebView. */
public class MainActivity extends AppCompatActivity {
    private static final int REQ_MIC = 1001;
    private static final int REQ_FILE_CHOOSER = 2002;
    private static final String UPDATE_URL = "https://raw.githubusercontent.com/clubvine44-gif/kopeyka3/main/update.json";
    private static final String PREFS = "fin_update";
    private static final String KEY_SKIP_CODE = "skip_code";
    private static final String KEY_SKIP_UNTIL = "skip_until";
    // Не блокируем новые релизы старым результатом проверки. URL получает cache-buster ниже.
    private static final long SKIP_MS = 48L * 60L * 60L * 1000L;

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private PermissionRequest pendingMicRequest;
    private ValueCallback<Uri[]> filePathCallback;
    private long lastResumeAt = 0L;
    private long updateDownloadId = -1L;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean updateDialogShowing = new AtomicBoolean(false);
    private final AtomicBoolean updateCheckRunning = new AtomicBoolean(false);

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id == updateDownloadId) installDownloadedUpdate();
        }
    };

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
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
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
        s.setUserAgentString(s.getUserAgentString() + " FinApp/2.0.1");
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
                if (!audio) {
                    request.grant(request.getResources());
                    return;
                }
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
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), REQ_MIC);
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
        // Проверяем каждый возврат в приложение: новый релиз должен приходить сразу.
        checkForUpdate();
    }

    @Override protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    private void checkForUpdate() {
        if (updateDialogShowing.get()) return;
        if (!updateCheckRunning.compareAndSet(false, true)) return;

        updateExecutor.execute(() -> {
            HttpURLConnection c = null;
            try {
                URL url = new URL(UPDATE_URL + "?t=" + System.currentTimeMillis());
                c = (HttpURLConnection) url.openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                c.setRequestMethod("GET");
                c.setUseCaches(false);
                c.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");
                c.setRequestProperty("Pragma", "no-cache");
                c.setRequestProperty("Accept", "application/json");
                int status = c.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) throw new IllegalStateException("HTTP " + status);

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
                android.util.Log.i("FinUpdate", "localCode=" + localCode + ", remoteCode=" + remoteCode + ", name=" + remoteName);

                if (remoteCode <= localCode || apkUrl.isEmpty()) {
                    android.util.Log.i("FinUpdate", "No update needed");
                    return;
                }

                SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
                int skipCode = prefs.getInt(KEY_SKIP_CODE, 0);
                long skipUntil = prefs.getLong(KEY_SKIP_UNTIL, 0L);
                if (skipCode == remoteCode && System.currentTimeMillis() < skipUntil) {
                    android.util.Log.i("FinUpdate", "Skipped by user until " + skipUntil);
                    return;
                }

                runOnUiThread(() -> showUpdateDialog(remoteCode, remoteName, apkUrl, notes));
            } catch (Exception e) {
                android.util.Log.e("FinUpdate", "Update check failed: " + e.getMessage(), e);
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
                + "\n\nНовая версия установится поверх текущей без удаления данных.";

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
                    downloadUpdate(apkUrl, name);
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

    private void downloadUpdate(String apkUrl, String versionName) {
        try {
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(apkUrl));
            req.setTitle("Финн " + versionName);
            req.setDescription("Скачивание обновления");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "Fin-update.apk");
            updateDownloadId = dm.enqueue(req);
            Toast.makeText(this, "Обновление скачивается…", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось скачать обновление: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void installDownloadedUpdate() {
        try {
            File apk = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Fin-update.apk");
            if (!apk.exists()) throw new IllegalStateException("APK не найден");
            Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
                Toast.makeText(this, "Разреши установку из этого источника и снова нажми «Установить».", Toast.LENGTH_LONG).show();
                return;
            }
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            Toast.makeText(this, "Не удалось открыть обновление: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
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
