import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "react-native-paper";

interface Props {
  expressions: string[];
  title?: string;
  height?: number;
}

function buildHtml(expressions: string[], isDark: boolean): string {
  const bg = isDark ? "#1c1c1e" : "#ffffff";
  const fg = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "#374151" : "#e5e7eb";
  const xAxisColor = isDark ? "#6b7280" : "#9ca3af";
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://www.desmos.com/api/v1.7/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${bg}; overflow: hidden; }
  #calculator { width: 100%; height: 100vh; }
  .dcg-header { display: none !important; }
</style>
</head>
<body>
<div id="calculator"></div>
<script>
  var el = document.getElementById("calculator");
  var calc = Desmos.GraphingCalculator(el, {
    expressions: true,
    settingsMenu: false,
    zoomButtons: false,
    showGrid: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: "",
    yAxisLabel: "",
    projectorMode: false,
    invertedColors: ${isDark ? "true" : "false"},
    borderColor: "${bg}",
    backgroundColor: "${bg}",
    textColor: "${fg}",
    gridColor: "${gridColor}",
    xAxisColor: "${xAxisColor}",
    yAxisColor: "${xAxisColor}",
    expressionsCollapsed: false,
  });
  var exps = ${JSON.stringify(expressions)};
  exps.forEach(function(expr, i) {
    calc.setExpression({ id: "exp" + i, latex: expr });
  });
  window.addEventListener("message", function(e) {
    try {
      var msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (msg.type === "addExpression") {
        calc.setExpression({ id: "exp" + Date.now(), latex: msg.latex });
      }
      if (msg.type === "setExpressions") {
        calc.removeExpressions(calc.getExpressions());
        msg.expressions.forEach(function(latex, i) {
          calc.setExpression({ id: "exp" + i, latex: latex });
        });
      }
      if (msg.type === "clear") {
        calc.removeExpressions(calc.getExpressions());
      }
    } catch(e) {}
  });
</script>
</body>
</html>`;
}

export function GraphPlotter({ expressions, title, height = 350 }: Props) {
  const paperTheme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const isDark = paperTheme.dark;

  const html = buildHtml(expressions, isDark);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { height, borderColor: paperTheme.colors.outlineVariant, alignItems: "center", justifyContent: "center", backgroundColor: paperTheme.colors.surfaceVariant }]}>
        <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 14 }}>Interactive graph not available on web.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, borderColor: paperTheme.colors.outlineVariant }]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        originWhitelist={["*"]}
        allowFileAccess={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

export function GraphPlotterModal({ expressions, visible, onClose }: { expressions: string[]; visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  const paperTheme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: paperTheme.colors.background, zIndex: 1000 }]}>
      <GraphPlotter expressions={expressions} height={undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  webview: { flex: 1 },
});
