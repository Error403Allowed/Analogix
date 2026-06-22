import React, { useRef, useState, useCallback } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  math: string;
  style?: object;
  minHeight?: number;
}

const KATEX_VER = "0.16.28";

function stripDelimiters(s: string): string {
  return s
    .replace(/^\\\(|\\\)$/g, "")
    .replace(/^\\\[|\\\]$/g, "")
    .replace(/^\$\$|\$\$$/g, "")
    .replace(/^\$|\$$/g, "");
}

export default function FormulaRenderer({ math, style, minHeight: minH = 48 }: Props) {
  const latex = React.useMemo(() => stripDelimiters(math), [math]);
  const [webViewHeight, setWebViewHeight] = useState(Math.max(minH, 48));
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const h = parseInt(event.nativeEvent.data, 10);
      if (Number.isFinite(h) && h > 0) setWebViewHeight(h + 12);
    } catch { /* ignore */ }
  }, []);

  if (!math) return null;

  if (Platform.OS !== "web") {
    const latexJson = JSON.stringify(latex);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VER}/dist/katex.min.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;min-height:100%}
    body{display:flex;align-items:center;justify-content:center;padding:6px 4px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:transparent;color:#111827}
    #formula{width:100%;overflow-x:auto;text-align:center;-webkit-overflow-scrolling:touch}
    .katex{font-size:1.08em;line-height:1.35}
    .katex-display{margin:0;text-align:center}
    .error{font-family:Menlo,monospace;font-size:13px;color:#6b7280;white-space:pre-wrap;text-align:center;padding:8px 4px;background:#f9fafb;border-radius:6px;word-break:break-word}
    .loading{font-family:Menlo,monospace;font-size:12px;color:#9ca3af;text-align:center;padding:12px}
  </style>
</head>
<body>
  <div id="formula" class="loading">Loading...</div>
  <script>
    (function() {
      var latex = ${latexJson};
      var root = document.getElementById("formula");
      function reportHeight() {
        var h = document.body.scrollHeight;
        if (h > 0) { window.ReactNativeWebView.postMessage(String(h)); }
      }
      try {
        if (typeof katex !== "undefined" && katex && katex.render) {
          katex.render(latex, root, { displayMode: true, throwOnError: false, strict: "ignore" });
        } else {
          root.className = "error";
          root.textContent = latex;
        }
      } catch (err) {
        root.className = "error";
        root.textContent = latex;
      }
      reportHeight();
      if (window.MutationObserver) {
        var mo = new MutationObserver(function() { reportHeight(); });
        mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function() { reportHeight(); });
        ro.observe(document.body);
      }
    })();
  </script>
</body>
</html>`;

    if (webViewError) {
      return (
        <View style={[styles.fallback, { minHeight: minH }, style]}>
          <Text style={styles.fallbackText}>{math}</Text>
        </View>
      );
    }

    return (
      <View style={[{ overflow: "hidden", borderRadius: 8 }, style]}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={{ height: webViewHeight, backgroundColor: "transparent" }}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          onError={() => setWebViewError(true)}
          onHttpError={() => setWebViewError(true)}
          androidLayerType="hardware"
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, { minHeight: minH }, style]}>
      <Text style={styles.fallbackText}>{math}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { justifyContent: "center", padding: 4 },
  fallbackText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    color: "#666",
  },
});
