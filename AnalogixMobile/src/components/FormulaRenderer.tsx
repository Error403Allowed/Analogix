import React, { useRef, useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { renderLatex, stripDelimiters, KATEX_CSS } from "../utils/katexUtils";

interface Props {
  math: string;
  style?: object;
  minHeight?: number;
}

export default function FormulaRenderer({ math, style, minHeight: minH = 48 }: Props) {
  const latex = useMemo(() => stripDelimiters(math), [math]);
  const [webViewHeight, setWebViewHeight] = useState(Math.max(minH, 48));
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef<any>(null);
  const renderedHtml = useMemo(() => (latex ? renderLatex(latex) : ""), [latex]);

  const handleMessage = useCallback((event: any) => {
    try {
      const h = parseInt(event.nativeEvent.data, 10);
      if (Number.isFinite(h) && h > 0) setWebViewHeight(h + 12);
    } catch { /* ignore */ }
  }, []);

  if (!math) return null;
  if (Platform.OS === "web") {
    return (
      <View style={[styles.fallback, { minHeight: minH }, style]}>
        <Text style={styles.fallbackText}>{math}</Text>
      </View>
    );
  }

  const katexNoFonts = KATEX_CSS.replace(/@font-face\{[^}]*\}/g, "");
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>${katexNoFonts}</style>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;min-height:100%}
body{display:flex;align-items:center;justify-content:center;padding:6px 4px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:transparent;color:#111827}
#formula{width:100%;overflow-x:auto;text-align:center;-webkit-overflow-scrolling:touch}
.katex{font-size:1.08em;line-height:1.35}
.katex-display{margin:0;text-align:center}
.katex-fallback{font-family:Menlo,monospace;font-size:13px;color:#6b7280;white-space:pre-wrap;text-align:center;padding:8px 4px;background:#f9fafb;border-radius:6px;word-break:break-word}
</style>
</head>
<body><div id="formula">${renderedHtml}</div>
<script>
(function(){function r(){var h=document.body.scrollHeight;if(h>0){window.ReactNativeWebView.postMessage(String(h))}}r();if(window.MutationObserver){new MutationObserver(function(){r()}).observe(document.body,{childList:true,subtree:true,characterData:true})}if(window.ResizeObserver){new ResizeObserver(function(){r()}).observe(document.body)}})();
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
        originWhitelist={[]}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        allowFileAccess={false}
        onMessage={handleMessage}
        onError={() => setWebViewError(true)}
        onHttpError={() => setWebViewError(true)}
        androidLayerType="hardware"
      />
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
