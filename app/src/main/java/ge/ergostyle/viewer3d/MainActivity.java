package ge.ergostyle.viewer3d;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    private static final int PICK = 41;
    private WebView web;
    private ValueCallback<Uri[]> pickCallback;
    private boolean pageReady = false;
    private Intent pendingIntent;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (pendingIntent != null) { Intent i = pendingIntent; pendingIntent = null; handleIntent(i); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pickCallback != null) pickCallback.onReceiveValue(null);
                pickCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "აირჩიე .b3d ფაილი"), PICK);
                } catch (Exception e) {
                    pickCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.loadUrl("file:///android_asset/index.html");
        pendingIntent = getIntent();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (pageReady) handleIntent(intent); else pendingIntent = intent;
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = null;
        if (Intent.ACTION_VIEW.equals(intent.getAction())) uri = intent.getData();
        else if (Intent.ACTION_SEND.equals(intent.getAction())) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) return;
        try {
            InputStream in = getContentResolver().openInputStream(uri);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            String b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
            String name = displayName(uri).replaceAll("(?i)\\.b3d$", "").replace("\\", "").replace("'", "");
            web.evaluateJavascript("openB64('" + b64 + "','" + name + "')", null);
        } catch (Exception e) {
            Toast.makeText(this, "ფაილი ვერ გაიხსნა", Toast.LENGTH_LONG).show();
        }
    }

    private String displayName(Uri uri) {
        String name = "ნახაზი";
        try (Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) name = c.getString(i);
            }
        } catch (Exception ignored) {
            String p = uri.getLastPathSegment();
            if (p != null) name = p;
        }
        return name;
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != PICK || pickCallback == null) return;
        Uri[] r = null;
        if (res == RESULT_OK && data != null && data.getData() != null) r = new Uri[]{data.getData()};
        pickCallback.onReceiveValue(r);
        pickCallback = null;
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.goBack ? goBack() : false", v -> {
            if (!"true".equals(v)) MainActivity.super.onBackPressed();
        });
    }
}
