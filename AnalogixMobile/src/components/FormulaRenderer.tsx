import React, { useRef, useCallback } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";

let WebViewComp: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    WebViewComp = require("react-native-webview").WebView;
  } catch {
    // fall through to plain-text fallback
  }
}

interface Props {
  math: string;
  style?: object;
  minHeight?: number;
}

const KATEX_VERSION = "0.16.11";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function FormulaRenderer({ math, style, minHeight = 80 }: Props) {
  const ref = useRef<any>(null);

  const hasDelimiters = /\\\(|\\\)|\$\$/.test(math);

  const bodyContent = hasDelimiters ? escapeHtml(math) : `\\(${escapeHtml(math)}\\)`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js" crossorigin="anonymous">
  </script>
  <script src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js" crossorigin="anonymous">
  </script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-height: ${minHeight}px; padding: 8px; line-height: 1.5; }
    .katex { font-size: 1.1em; }
    .katex-display { text-align: center; margin: 8px 0; }
  </style>
</head>
<body>
  <div id="root">${bodyContent}</div>
  <script>
    try {
      renderMathInElement(document.getElementById('root'), {
        delimiters: [
          {left: '\\\\[', right: '\\\\]', display: true},
          {left: '\\\\(', right: '\\\\)', display: false},
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
        ],
        throwOnError: false,
      });
    } catch (e) {}
  </script>
</body>
</html>`;

  const handleNavigationStateChange = useCallback((navState: any) => {
    if (!navState.loading && navState.url !== "about:blank") {
      ref.current?.stopLoading();
    }
  }, []);

  if (!WebViewComp) {
    return (
      <View style={[styles.fallback, { minHeight }, style]}>
        <Text style={styles.fallbackText}>{math}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <WebViewComp
        ref={ref}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onNavigationStateChange={handleNavigationStateChange}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden", borderRadius: 8 },
  webview: { backgroundColor: "transparent", opacity: 0.99 },
  fallback: { justifyContent: "center", padding: 8 },
  fallbackText: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 14, color: "#666" },
});
