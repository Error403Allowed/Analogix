import React, { useRef, useCallback, useState, useEffect } from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "react-native-paper";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function buildNotionHtml(theme: any): string {
  const isDark = theme.dark;
  const bg = isDark ? "#1c1c1e" : "#ffffff";
  const fg = isDark ? "#e5e7eb" : "#1f2937";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const border = isDark ? "#3a3a3c" : "#e5e7eb";
  const hoverBg = isDark ? "#2c2c2e" : "#f3f4f6";
  const toolBg = isDark ? "#2c2c2e" : "#ffffff";
  const toolBorder = isDark ? "#3a3a3c" : "#e5e7eb";
  const primary = theme.colors?.primary || "#3b82f6";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
body{background:${bg};color:${fg};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:16px;line-height:1.7}

#editor{max-width:700px;margin:0 auto;padding:12px 20px 40vh;min-height:100%;outline:none;position:relative}
#editor:empty:before{content:attr(data-placeholder);color:${muted}40;pointer-events:none}
#editor p{margin:4px 0;min-height:1.7em}
#editor h1{font-size:28px;font-weight:700;margin:20px 0 8px;line-height:1.3}
#editor h2{font-size:22px;font-weight:600;margin:16px 0 6px;line-height:1.35}
#editor h3{font-size:18px;font-weight:600;margin:12px 0 4px;line-height:1.4}
#editor ul,#editor ol{padding-left:24px;margin:4px 0}
#editor li{margin:2px 0}
#editor blockquote{border-left:3px solid ${primary};margin:8px 0;padding:4px 16px;color:${muted};font-style:italic}
#editor pre{background:${isDark?"#2d2d30":"#f3f4f6"};border-radius:8px;padding:16px;font-family:"SF Mono","Fira Code",monospace;font-size:14px;overflow-x:auto;margin:8px 0}
#editor code{background:${isDark?"#2d2d30":"#f3f4f6"};padding:2px 6px;border-radius:4px;font-family:"SF Mono","Fira Code",monospace;font-size:14px}
#editor a{color:${primary};text-decoration:underline}
#editor img{max-width:100%;border-radius:8px;margin:8px 0}

#editor [data-block]{position:relative;padding-left:24px}
#editor [data-block]:hover .block-handle{opacity:1}
.block-handle{position:absolute;left:-24px;top:4px;width:20px;height:20px;opacity:0;cursor:grab;display:flex;align-items:center;justify-content:center;font-size:14px;color:${muted};transition:opacity .15s;user-select:none;border-radius:4px}
.block-handle:hover{background:${hoverBg}}

.floating-toolbar{position:absolute;display:none;background:${toolBg};border:1px solid ${toolBorder};border-radius:8px;padding:4px 6px;box-shadow:0 4px 12px ${isDark?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.12)"};gap:2px;z-index:100;align-items:center;white-space:nowrap;transform:translateX(-50%)}
.floating-toolbar.show{display:flex}
.floating-toolbar button{width:30px;height:30px;border:none;border-radius:5px;cursor:pointer;background:transparent;color:${muted};font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .12s}
.floating-toolbar button:hover{background:${hoverBg};color:${fg}}
.floating-toolbar button.active{color:${primary};background:${primary}15}
.floating-toolbar .sep{width:1px;height:20px;background:${toolBorder};margin:0 4px}

.slash-menu{position:absolute;display:none;background:${toolBg};border:1px solid ${toolBorder};border-radius:10px;padding:4px;box-shadow:0 6px 16px ${isDark?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.15)"};z-index:100;min-width:220px;max-height:320px;overflow-y:auto}
.slash-menu.show{display:block}
.slash-item{padding:8px 10px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .1s}
.slash-item:hover{background:${hoverBg}}
.slash-item .si-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;background:${isDark?"#3a3a3c":"#f3f4f6"}}
.slash-item .si-label{font-size:14px;font-weight:500;color:${fg}}
.slash-item .si-desc{font-size:11px;color:${muted}}
</style>
</head>
<body>
<div id="toolbar" class="floating-toolbar">
  <button data-cmd="bold" title="Bold"><b>B</b></button>
  <button data-cmd="italic" title="Italic"><i>I</i></button>
  <button data-cmd="underline" title="Underline"><u>U</u></button>
  <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
  <button data-cmd="code" title="Code">&lt;/&gt;</button>
  <div class="sep"></div>
  <button data-cmd="h1" title="Heading 1">H1</button>
  <button data-cmd="h2" title="Heading 2">H2</button>
  <button data-cmd="h3" title="Heading 3">H3</button>
  <div class="sep"></div>
  <button data-cmd="bullet" title="Bullet list">•</button>
  <button data-cmd="ordered" title="Numbered list">1.</button>
  <button data-cmd="quote" title="Blockquote">"</button>
</div>
<div id="slashMenu" class="slash-menu"></div>
<div id="editor" contenteditable="true" data-placeholder="${theme.colors?.placeholder || (isDark?"#6b7280":"#9ca3af")}"></div>
<script>
(function(){
const ed=document.getElementById('editor');
const tb=document.getElementById('toolbar');
const sm=document.getElementById('slashMenu');
let active=false;

function post(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function sel(){return window.getSelection()}

function fmt(cmd,val){document.execCommand(cmd,false,val);ed.focus();updateToolbar()}

function updateToolbar(){
  const s=sel();if(!s.rangeCount||!active){tb.classList.remove('show');return}
  const r=s.getRangeAt(0);if(r.collapsed&&!r.startContainer.textContent){tb.classList.remove('show');return}
  const rect=r.getBoundingClientRect();if(!rect.width){tb.classList.remove('show');return}
  tb.classList.add('show');tb.style.top=(rect.top-48)+'px';tb.style.left=(rect.left+rect.width/2)+'px'
  const b=document.queryCommandState('bold'),it=document.queryCommandState('italic'),u=document.queryCommandState('underline')
  tb.querySelectorAll('button').forEach(btn=>btn.classList.remove('active'))
  if(b)tb.querySelector('[data-cmd=bold]')?.classList.add('active')
  if(it)tb.querySelector('[data-cmd=italic]')?.classList.add('active')
  if(u)tb.querySelector('[data-cmd=underline]')?.classList.add('active')
}

function getBlock(){const s=sel();if(!s.rangeCount)return null;let n=s.getRangeAt(0).commonAncestorContainer;while(n&&n.id!=='editor'&&n!==document.body){if(n.dataset&&n.dataset.block)return n;n=n.parentElement}return null}

function slashItems(q){
  const all=[
    {id:'h1',icon:'H',label:'Heading 1',desc:'Big section heading',cmd:'formatBlock',val:'<h1>'},
    {id:'h2',icon:'H',label:'Heading 2',desc:'Medium section heading',cmd:'formatBlock',val:'<h2>'},
    {id:'h3',icon:'H',label:'Heading 3',desc:'Small section heading',cmd:'formatBlock',val:'<h3>'},
    {id:'bullet',icon:'•',label:'Bullet List',desc:'Create a bulleted list',cmd:'insertUnorderedList'},
    {id:'ordered',icon:'1.',label:'Numbered List',desc:'Create a numbered list',cmd:'insertOrderedList'},
    {id:'quote',icon:'"',label:'Blockquote',desc:'Insert a quote block',cmd:'formatBlock',val:'<blockquote>'},
    {id:'code',icon:'<>',label:'Code Block',desc:'Insert a code block',cmd:'insertHTML',val:'<pre><code></code></pre>'},
    {id:'divider',icon:'—',label:'Divider',desc:'Insert a horizontal divider',cmd:'insertHTML',val:'<hr style="margin:16px 0;border:none;border-top:1px solid ${border}">'},
  ];
  if(!q)return all;
  const l=q.toLowerCase();
  return all.filter(i=>i.label.toLowerCase().includes(l)||i.id.includes(l));
}

function showSlash(x,y,q){
  const items=slashItems(q);
  sm.innerHTML=items.map(i=>'<div class="slash-item" data-cmd="'+i.cmd+'" data-val="'+(i.val||'')+'"><div class="si-icon">'+i.icon+'</div><div><div class="si-label">'+i.label+'</div><div class="si-desc">'+i.desc+'</div></div></div>').join('');
  sm.classList.add('show');
  sm.style.top=Math.min(y,document.body.scrollHeight-340)+'px';
  sm.style.left=Math.min(x,document.body.clientWidth-240)+'px';
  sm.querySelectorAll('.slash-item').forEach(el=>{
    el.addEventListener('mousedown',function(e){e.preventDefault();const cmd=this.dataset.cmd,val=this.dataset.val;fmt(cmd,val||undefined);sm.classList.remove('show');slashQ=''})
  })
}

let slashQ='',slashPos=null;
ed.addEventListener('input',function(){
  post({type:'content',html:ed.innerHTML});
  const s=sel();if(!s.rangeCount||!s.isCollapsed){sm.classList.remove('show');return}
  const txt=s.anchorNode?.textContent||'',pos=s.anchorOffset;
  const before=txt.substring(0,pos);
  const m=before.match(/\\/([\\w]*)$/);
  if(m){slashQ=m[1];const r=s.getRangeAt(0);const rect=r.getBoundingClientRect();showSlash(rect.left,rect.bottom+4,slashQ)}
  else{sm.classList.remove('show');slashQ=''}
})

ed.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&sm.classList.contains('show')){e.preventDefault();const selItem=sm.querySelector('.slash-item');if(selItem){const cmd=selItem.dataset.cmd,val=selItem.dataset.val;fmt(cmd,val||undefined);sm.classList.remove('show');slashQ=''}return}
  if(e.key==='Escape'){sm.classList.remove('show')}
  if(e.key==='Tab'){e.preventDefault();fmt('insertHTML','&emsp;')}
})

ed.addEventListener('focus',function(){active=true})
ed.addEventListener('blur',function(e){
  setTimeout(function(){if(!document.activeElement||document.activeElement.id!=='editor'){active=false;tb.classList.remove('show');sm.classList.remove('show')}},200)
})

tb.addEventListener('mousedown',function(e){e.preventDefault()})
tb.querySelectorAll('button').forEach(function(btn){
  btn.addEventListener('click',function(){
    const cmd=this.dataset.cmd;
    if(cmd==='h1')fmt('formatBlock','<h1>')
    else if(cmd==='h2')fmt('formatBlock','<h2>')
    else if(cmd==='h3')fmt('formatBlock','<h3>')
    else if(cmd==='bullet')fmt('insertUnorderedList')
    else if(cmd==='ordered')fmt('insertOrderedList')
    else if(cmd==='quote')fmt('formatBlock','<blockquote>')
    else if(cmd==='code')fmt('insertHTML','<pre><code></code></pre>')
    else fmt(cmd)
  })
})

document.addEventListener('selectionchange',updateToolbar)

post({type:'ready'})
})();
</script>
</body>
</html>`;
}

function NotionEditor({ value, onChange, placeholder, isWeb }: Props & { isWeb?: boolean }) {
  const paperTheme = useTheme();
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const contentRef = useRef(value);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (msg.type === "ready") setReady(true);
      if (msg.type === "content") {
        contentRef.current = msg.html;
        onChange(msg.html);
      }
    } catch {}
  }, [onChange]);

  const html = buildNotionHtml(paperTheme);

  useEffect(() => {
    if (!ready) return;
    const msg = JSON.stringify({ type: "setHtml", html: value || "" });
    if (isWeb && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(msg, "*");
    } else if (!isWeb && webViewRef.current) {
      webViewRef.current.postMessage(msg);
    }
  }, [value, ready, isWeb]);

  const baseStyle = {
    flex: 1,
    borderWidth: 0,
    minHeight: 300,
    backgroundColor: paperTheme.dark ? "#1c1c1e" : "#ffffff",
  };

  if (isWeb) {
    return (
      <View style={baseStyle}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ width: "100%", height: "100%", border: "none", background: paperTheme.dark ? "#1c1c1e" : "#ffffff" }}
          onLoad={() => {
            iframeRef.current?.contentWindow?.addEventListener("message", handleMessage);
            setReady(true);
          }}
          title="Editor"
        />
      </View>
    );
  }

  return (
    <View style={baseStyle}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        allowFileAccess={false}
        domStorageEnabled={false}
        javaScriptEnabled={true}
        style={{ flex: 1, backgroundColor: "transparent" }}
        scrollEnabled={false}
        hideKeyboardAccessoryView={false}
        keyboardDisplayRequiresUserAction={false}
      />
    </View>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  return <NotionEditor value={value} onChange={onChange} placeholder={placeholder} isWeb={Platform.OS === "web"} />;
}

const styles = StyleSheet.create({});
