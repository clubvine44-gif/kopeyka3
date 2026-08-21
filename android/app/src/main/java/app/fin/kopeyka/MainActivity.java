package app.fin.kopeyka;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
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

/** Фин — Android-оболочка: UI и логика приложения работают внутри WebView. */
public class MainActivity extends AppCompatActivity {

    private static final int REQ_MIC = 1001;
    private static final String UPDATE_URL = "https://raw.githubusercontent.com/clubvine44-gif/kopeyka3/main/update.json";
    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private PermissionRequest pendingMicRequest;
    private long lastResumeAt = 0L;
    private long updateDownloadId = -1L;
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id != updateDownloadId) return;
            installDownloadedUpdate();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        refreshLayout = new SwipeRefreshLayout(this);
        refreshLayout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        refreshLayout.setColorSchemeColors(Color.rgb(229, 167, 94));
        setContentView(refreshLayout);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(false);
        s.setUserAgentString(s.getUserAgentString() + " FinApp/1.1");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(@NonNull WebView view, @NonNull WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                refreshLayout.setRefreshing(false);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(final PermissionRequest request) {
                boolean needsAudio = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) { needsAudio = true; break; }
                }
                if (needsAudio) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        pendingMicRequest = request;
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    }
                } else request.grant(request.getResources());
            }
        });
    }

    private void ensureMicPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_MIC && pendingMicRequest != null) {
            boolean ok = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) pendingMicRequest.grant(pendingMicRequest.getResources()); else pendingMicRequest.deny();
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
        updateExecutor.execute(() -> {
            try {
                URL url = new URL(UPDATE_URL + "?t=" + System.currentTimeMillis());
                HttpURLConnection c = (HttpURLConnection) url.openConnection();
                c.setConnectTimeout(7000);
                c.setReadTimeout(7000);
                c.setRequestMethod("GET");
                c.setRequestProperty("Cache-Control", "no-cache");
                InputStream in = c.getInputStream();
                StringBuilder out = new StringBuilder();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) out.append(new String(buf, 0, n, "UTF-8"));
                in.close();
                c.disconnect();

                JSONObject j = new JSONObject(out.toString());
                int remoteCode = j.optInt("versionCode", 0);
                String remoteName = j.optString("versionName", "");
                String apkUrl = j.optString("apkUrl", "");
                String notes = j.optString("notes", "");
                int localCode = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                if (remoteCode > localCode && !apkUrl.isEmpty()) {
                    runOnUiThread(() -> showUpdateDialog(remoteCode, remoteName, apkUrl, notes));
                }
            } catch (Exception ignored) { }
        });
    }

    private void showUpdateDialog(int code, String name, String apkUrl, String notes) {
        String message = "Доступна новая версия Финн" + (name.isEmpty() ? "" : " " + name)
                + "\n\n" + (notes.isEmpty() ? "Обновление приложения." : notes);
        new AlertDialog.Builder(this)
                .setTitle("Доступно обновление")
                .setMessage(message)
                .setNegativeButton("Позже", null)
                .setPositiveButton("Установить", (d, w) -> downloadUpdate(apkUrl, name))
                .show();
    }

    private void downloadUpdate(String apkUrl, String versionName) {
        try {
            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            Uri uri = Uri.parse(apkUrl);
            DownloadManager.Request req = new DownloadManager.Request(uri);
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
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getPackageName()));
                startActivity(settings);
                Toast.makeText(this, "Разреши установку из этого источника и снова нажми установить обновление.", Toast.LENGTH_LONG).show();
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
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) { }
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
