import React, { useRef, useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { renderLatex, stripDelimiters, KATEX_CSS } from "../utils/katexUtils";

interface FormulaItem {
  id: string;
  name: string;
  latex: string;
  description?: string;
}

interface CategoryGroup {
  name: string;
  formulas: FormulaItem[];
}

interface Props {
  categories: CategoryGroup[];
  minHeight?: number;
}

export default function BatchFormulaRenderer({ categories, minHeight = 48 }: Props) {
  const [webViewHeight, setWebViewHeight] = useState(Math.max(minHeight, 200));
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const h = parseInt(event.nativeEvent.data, 10);
      if (Number.isFinite(h) && h > 0) setWebViewHeight(h + 8);
    } catch { /* ignore */ }
  }, []);

  const html = useMemo(() => {
    if (categories.length === 0) return "";

    const sectionsHtml = categories.map(cat => {
      const formulasHtml = cat.formulas.map(f => {
        const latex = stripDelimiters(f.latex);
        const formulaHtml = renderLatex(latex);
        const nameHtml = `<div class="formula-name">${escapeHtml(f.name)}</div>`;
        const descHtml = f.description
          ? `<div class="formula-desc">${escapeHtml(f.description)}</div>`
          : "";
        return `<div class="formula-card">${nameHtml}<div class="katex-container">${formulaHtml}</div>${descHtml}</div>`;
      }).join("");

      return `<div class="category-section"><div class="cat-header"><span class="cat-name">${escapeHtml(cat.name)}</span><span class="cat-count">${cat.formulas.length} formulas</span></div><div class="formulas-grid">${formulasHtml}</div></div>`;
    }).join("");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>${KATEX_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;min-height:100%}
body{padding:8px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:transparent}
.category-section{margin-bottom:20px}
.cat-header{display:flex;align-items:center;justify-content:space-between;padding:0 4px;margin-bottom:8px}
.cat-name{font-size:16px;font-weight:800;color:#111827}
.cat-count{font-size:11px;color:#6b7280}
.formulas-grid{display:flex;flex-direction:column;gap:10px}
.formula-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}
.formula-name{font-size:14px;font-weight:700;color:#111827;margin-bottom:8px}
.katex-container{width:100%;overflow-x:auto;text-align:center;padding:4px 0;min-height:48px;-webkit-overflow-scrolling:touch}
.katex{font-size:1.12em;line-height:1.4}
.katex-display{margin:4px 0;text-align:center}
.formula-desc{background:#f0f4ff;margin-top:8px;padding:6px 10px;border-radius:6px;font-size:13px;color:#4b5563;line-height:18px}
.katex-fallback{font-family:Menlo,monospace;font-size:12px;color:#6b7280;white-space:pre-wrap;text-align:center;padding:8px;background:#f9fafb;border-radius:6px;word-break:break-word}
</style>
</head>
<body>${sectionsHtml}
<script>
(function(){function r(){var h=document.body.scrollHeight;if(h>0){window.ReactNativeWebView.postMessage(String(h))}}r();if(window.MutationObserver){new MutationObserver(function(){r()}).observe(document.body,{childList:true,subtree:true,characterData:true})}if(window.ResizeObserver){new ResizeObserver(function(){r()}).observe(document.body)}})();
</script>
</body>
</html>`;
  }, [categories]);

  if (Platform.OS === "web" || categories.length === 0) return null;

  if (webViewError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {categories.flatMap(c => c.formulas).map(f => `${f.name}: ${f.latex}`).join("\n\n")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: 8 },
  fallback: { justifyContent: "center", padding: 8 },
  fallbackText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#666",
  },
});
