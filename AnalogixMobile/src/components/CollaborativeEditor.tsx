import React, { useRef, useCallback, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "react-native-paper";
import { getSupabase } from "../supabase";
import { config } from "../config";

interface Props {
  roomId: string;
  surfaceType: "canvas" | "document";
  surfaceId: string;
  initialContent?: string;
  onContentChange?: (html: string) => void;
  onPeerCount?: (count: number) => void;
  onStatus?: (status: string) => void;
}

function buildHtml(supabaseUrl: string, supabaseAnonKey: string, theme: any): string {
  const isDark = theme.dark;
  const bg = isDark ? "#1c1c1e" : "#ffffff";
  const fg = isDark ? "#e5e7eb" : "#1f2937";
  const placeholder = isDark ? "#6b7280" : "#9ca3af";
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://cdn.jsdelivr.net/npm/yjs@13.6.30/dist/yjs.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: ${fg};
    background: ${bg};
    padding: 16px;
    min-height: 200px;
  }
  #editor { outline: none; min-height: 200px; }
  #editor:empty:before {
    content: attr(data-placeholder);
    color: ${placeholder};
    pointer-events: none;
  }
  #editor h1 { font-size: 24px; font-weight: 700; margin: 12px 0 8px; }
  #editor h2 { font-size: 20px; font-weight: 600; margin: 10px 0 6px; }
  #editor h3 { font-size: 18px; font-weight: 600; margin: 8px 0 4px; }
  #editor ul, #editor ol { padding-left: 24px; margin: 6px 0; }
  #editor li { margin: 2px 0; }
  #editor blockquote {
    border-left: 3px solid ${isDark ? "#4b5563" : "#d1d5db"};
    margin: 8px 0;
    padding: 4px 12px;
    color: ${isDark ? "#9ca3af" : "#6b7280"};
    font-style: italic;
  }
  #editor pre {
    background: ${isDark ? "#2d2d30" : "#f3f4f6"};
    border-radius: 8px;
    padding: 12px;
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 14px;
    overflow-x: auto;
    margin: 8px 0;
  }
  #editor code {
    background: ${isDark ? "#2d2d30" : "#f3f4f6"};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 14px;
  }
  #editor a { color: ${isDark ? "#60a5fa" : "#3b82f6"}; text-decoration: underline; }
  img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
  .status-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 4px 12px;
    font-size: 11px;
    color: ${isDark ? "#6b7280" : "#9ca3af"};
    background: ${bg};
    text-align: center;
  }
</style>
</head>
<body>
<div id="editor" contenteditable="true" data-placeholder="${placeholder}"></div>
<div class="status-bar" id="statusBar">Connecting...</div>
<script>
(function() {
  const editor = document.getElementById("editor");
  const statusBar = document.getElementById("statusBar");
  const SUPABASE_URL = "${supabaseUrl}";
  const SUPABASE_ANON_KEY = "${supabaseAnonKey}";

  let ydoc = new Y.Doc();
  let yText = ydoc.getText("content");
  let channel = null;
  let localSessionId = Math.random().toString(36).substring(2, 10);
  let connected = false;
  let busy = false;

  function setStatus(msg) {
    statusBar.textContent = msg;
  }

  function postToRN(msg) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } catch(e) {}
  }

  function renderYTextToDOM() {
    busy = true;
    const html = yText.toString();
    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
    busy = false;
  }

  yText.observe(function() {
    renderYTextToDOM();
    postToRN({ type: "content", html: editor.innerHTML });
  });

  editor.addEventListener("input", function() {
    if (busy) return;
    const html = editor.innerHTML;
    const text = editor.innerText;
    const oldText = yText.toString();
    if (text !== oldText) {
      yText.delete(0, yText.length);
      yText.insert(0, text);
    }
    postToRN({ type: "content", html: html, text: text });
  });

  function uint8ArrayToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToUint8Array(value) {
    try {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch(e) {
      return new Uint8Array();
    }
  }

  function toUint8Array(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (Array.isArray(value)) return new Uint8Array(value.map(Number));
    if (typeof value === "string") return base64ToUint8Array(value);
    return new Uint8Array();
  }

  async function initChannel(roomId, surfaceType, surfaceId, authToken) {
    try {
      const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      });

      let sb;
      if (typeof supabaseClient !== "undefined") {
        sb = supabaseClient;
      } else {
        const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.97.0/dist/umd/supabase.min.js");
        sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: "Bearer " + authToken } },
        });
      }

      const channelName = "analogix-room-" + roomId + "-" + surfaceType + "-" + surfaceId;
      channel = sb.channel(channelName, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "doc-update" }, function(payload) {
        if (!payload.payload || !payload.payload.update) return;
        try {
          Y.applyUpdate(ydoc, toUint8Array(payload.payload.update), channel);
        } catch(e) {
          console.error("[collab] applyUpdate failed:", e);
        }
      });

      channel.on("broadcast", { event: "sync-request" }, function() {
        const update = Y.encodeStateAsUpdate(ydoc);
        channel.send({
          type: "broadcast",
          event: "doc-update",
          payload: { update: Array.from(update) },
        });
      });

      channel.subscribe(function(status) {
        if (status === "SUBSCRIBED") {
          connected = true;
          setStatus("Connected");
          postToRN({ type: "status", status: "ready" });

          channel.send({
            type: "broadcast",
            event: "sync-request",
            payload: { from: localSessionId },
          });
        } else if (status === "CHANNEL_ERROR") {
          setStatus("Connection error");
          postToRN({ type: "status", status: "error" });
        } else if (status === "TIMED_OUT") {
          setStatus("Timed out");
          postToRN({ type: "status", status: "error" });
        } else if (status === "CLOSED") {
          connected = false;
          setStatus("Disconnected");
          postToRN({ type: "status", status: "disconnected" });
        }
      });

      ydoc.on("update", function(update, origin) {
        if (origin === channel) return;
        if (connected && channel) {
          channel.send({
            type: "broadcast",
            event: "doc-update",
            payload: { update: Array.from(update) },
          });
        }
        postToRN({ type: "ydoc-update" });
      });

    } catch(e) {
      console.error("[collab] init failed:", e);
      setStatus("Error: " + e.message);
      postToRN({ type: "status", status: "error", error: e.message });
    }
  }

  window.addEventListener("message", function(e) {
    try {
      const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      if (msg.type === "setHtml") {
        busy = true;
        editor.innerHTML = msg.html || "";
        yText.delete(0, yText.length);
        yText.insert(0, editor.innerText || "");
        busy = false;
      }
      if (msg.type === "exec") {
        document.execCommand(msg.command, false, msg.value);
      }
      if (msg.type === "init") {
        initChannel(msg.roomId, msg.surfaceType, msg.surfaceId, msg.authToken);
      }
    } catch(e) {}
  });

  postToRN({ type: "ready" });
  setStatus("Initialized");
})();
</script>
</body>
</html>`;
}

export function CollaborativeEditor({ roomId, surfaceType, surfaceId, initialContent, onContentChange, onPeerCount, onStatus }: Props) {
  const paperTheme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [status, setStatus] = useState("initializing");
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, []);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready" && authToken && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: "init",
          roomId,
          surfaceType,
          surfaceId,
          authToken,
        }));
        if (initialContent) {
          setTimeout(() => {
            webViewRef.current?.postMessage(JSON.stringify({ type: "setHtml", html: initialContent }));
          }, 500);
        }
      }
      if (msg.type === "content") {
        onContentChange?.(msg.html);
      }
      if (msg.type === "status") {
        setStatus(msg.status);
        onStatus?.(msg.status);
      }
    } catch {}
  }, [authToken, roomId, surfaceType, surfaceId, initialContent, onContentChange, onStatus]);

  if (!authToken) {
    return (
      <View style={[styles.loading, { backgroundColor: paperTheme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", backgroundColor: paperTheme.colors.surfaceVariant }]}>
        <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: 14 }}>Collaborative editor not available on web.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: buildHtml(config.supabase.url, config.supabase.anonKey, paperTheme) }}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        allowFileAccess={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        style={styles.webview}
        scrollEnabled={true}
        hideKeyboardAccessoryView={false}
        keyboardDisplayRequiresUserAction={false}
        sharedCookiesEnabled={true}
      />
      <View style={[styles.statusRow, { backgroundColor: paperTheme.colors.surface, borderTopColor: paperTheme.colors.outlineVariant }]}>
        <View style={[styles.dot, { backgroundColor: status === "ready" ? "#22C55E" : status === "error" ? "#EF4444" : "#F59E0B" }]} />
        <Text style={[styles.statusText, { color: paperTheme.colors.onSurfaceVariant }]}>
          {status === "ready" ? "Connected" : status === "error" ? "Connection error" : status === "disconnected" ? "Disconnected" : status === "initializing" ? "Initializing..." : "Connecting..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 300 },
  webview: { flex: 1 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11 },
});
