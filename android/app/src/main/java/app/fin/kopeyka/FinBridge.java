package app.fin.kopeyka;

import android.content.Context;
import android.webkit.JavascriptInterface;

/** Bridge between WebView JS and native Android. */
public class FinBridge {
    private final Context context;

    public FinBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public String getVersion() {
        try {
            return context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }

    @JavascriptInterface
    public int getVersionCode() {
        try {
            return context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0).versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }
}
