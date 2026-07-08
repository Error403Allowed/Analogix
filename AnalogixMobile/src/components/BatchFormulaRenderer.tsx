import React, { useRef, useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { renderLatex, stripDelimiters, escapeHtml, KATEX_CSS } from "../utils/katexUtils";

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

interface ThemeColors {
  text?: string;
  textSecondary?: string;
  cardBg?: string;
  cardBorder?: string;
  descBg?: string;
  descText?: string;
  fallbackBg?: string;
  fallbackText?: string;
}

interface Props {
  categories: CategoryGroup[];
  minHeight?: number;
  theme?: ThemeColors;
}

const DARK_CSS = `
@media (prefers-color-scheme:dark){
.cat-name, .formula-name{color:#e5e7eb}
.cat-count{color:#9ca3af}
.formula-card{background:#1f2937;border-color:#374151}
.formula-desc{background:#374151;color:#d1d5db}
.katex-fallback{color:#9ca3af;background:#374151}
.katex,.katex .katex-html,.katex .katex-mathml{color:#e5e7eb}
.katex .base,.katex .strut{color:inherit}
}`;

export default function BatchFormulaRenderer({ categories, minHeight = 48, theme }: Props) {
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

    const t = theme ?? {};
    const text = t.text ?? "#111827";
    const textSec = t.textSecondary ?? "#6b7280";
    const cardBg = t.cardBg ?? "#fff";
    const cardBorder = t.cardBorder ?? "#e5e7eb";
    const descBg = t.descBg ?? "#f0f4ff";
    const descText = t.descText ?? "#4b5563";
    const fallbackBg = t.fallbackBg ?? "#f9fafb";
    const fallbackText = t.fallbackText ?? "#6b7280";

    const KATEX_CSS_NO_FONTS = KATEX_CSS.replace(/@font-face\{[^}]*\}/g, "");

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>${KATEX_CSS_NO_FONTS}

*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;min-height:100%}
body{padding:8px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:transparent}
.category-section{margin-bottom:20px}
.cat-header{display:flex;align-items:center;justify-content:space-between;padding:0 4px;margin-bottom:8px}
.cat-name{font-size:16px;font-weight:800;color:${text}}
.cat-count{font-size:11px;color:${textSec}}
.formulas-grid{display:flex;flex-direction:column;gap:10px}
.formula-card{background:${cardBg};border:1px solid ${cardBorder};border-radius:12px;padding:16px}
.formula-name{font-size:14px;font-weight:700;color:${text};margin-bottom:8px}
.katex-container{width:100%;overflow-x:auto;text-align:center;padding:4px 0;min-height:48px;-webkit-overflow-scrolling:touch}
.katex{font-size:1.12em;line-height:1.4}
.katex-display{margin:4px 0;text-align:center}
.formula-desc{background:${descBg};margin-top:8px;padding:6px 10px;border-radius:6px;font-size:13px;color:${descText};line-height:18px}
.katex-fallback{font-family:Menlo,monospace;font-size:12px;color:${fallbackText};white-space:pre-wrap;text-align:center;padding:8px;background:${fallbackBg};border-radius:6px;word-break:break-word}
${DARK_CSS}
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
  container: { overflow: "hidden", borderRadius: 8 },
  fallback: { justifyContent: "center", padding: 8 },
  fallbackText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#666",
  },
});
