export const TIPTAP_CONTENT_FORMAT = "tiptap-json-v1";
export const BLOCKNOTE_CONTENT_FORMAT = "blocknote-json-v1";
export const EMPTY_TIPTAP_DOC = {
    type: "doc",
    content: [{ type: "paragraph" }],
};
const BLOCK_BREAK_TYPES = new Set([
    "paragraph",
    "heading",
    "blockquote",
    "bulletList",
    "orderedList",
    "listItem",
    "taskList",
    "taskItem",
    "codeBlock",
    "horizontalRule",
    "callout",
    "table",
    "tableRow",
    "details",
    "detailsSummary",
    "detailsContent",
]);
const normaliseWhitespace = (text) => text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
export const stripHtml = (value) => normaliseWhitespace(value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|tr|table|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'"));
export const parseTipTapContentJson = (value) => {
    if (typeof value !== "string" || !value.trim())
        return null;
    try {
        const parsed = JSON.parse(value);
        if (parsed?.type === "doc")
            return parsed;
    }
    catch {
        return null;
    }
    return null;
};
const collectText = (node, parts) => {
    if (!node)
        return;
    if (Array.isArray(node)) {
        node.forEach((child) => collectText(child, parts));
        return;
    }
    if (node.type === "text" && typeof node.text === "string") {
        parts.push(node.text);
    }
    if (node.type === "hardBreak") {
        parts.push("\n");
    }
    if (node.type === "horizontalRule") {
        parts.push("\n---\n");
    }
    if (Array.isArray(node.content)) {
        collectText(node.content, parts);
    }
    if (node.type && BLOCK_BREAK_TYPES.has(node.type)) {
        parts.push("\n");
    }
};
export const tiptapJsonToPlainText = (content) => {
    const parts = [];
    collectText(content, parts);
    return normaliseWhitespace(parts.join(""));
};
export const blockNoteToPlainText = (content) => {
    if (typeof content !== "string" || !content.startsWith("__BN__"))
        return "";
    try {
        const blocks = JSON.parse(content.slice(6));
        if (!Array.isArray(blocks))
            return "";
        const extractText = (blocks) => {
            return blocks
                .map((block) => {
                let text = "";
                if (Array.isArray(block.content)) {
                    text = block.content
                        .map((item) => {
                        if (item.type === "text")
                            return item.text;
                        if (item.type === "link")
                            return item.content?.map((t) => t.text).join("") || "";
                        return "";
                    })
                        .join("");
                }
                if (Array.isArray(block.children)) {
                    text += "\n" + extractText(block.children);
                }
                return text;
            })
                .join("\n");
        };
        return normaliseWhitespace(extractText(blocks));
    }
    catch {
        return "";
    }
};
export const getDocumentPlainText = (document) => {
    if (!document)
        return "";
    if (typeof document.contentText === "string" && document.contentText.trim()) {
        return normaliseWhitespace(document.contentText);
    }
    if (typeof document.content === "string" && document.content.startsWith("__BN__")) {
        return blockNoteToPlainText(document.content);
    }
    const tiptapContent = document.contentFormat === TIPTAP_CONTENT_FORMAT
        ? parseTipTapContentJson(document.contentJson)
        : null;
    if (tiptapContent) {
        return tiptapJsonToPlainText(tiptapContent);
    }
    if (typeof document.content === "string" && document.content.trim()) {
        const stripped = stripHtml(document.content);
        return stripped || normaliseWhitespace(document.content);
    }
    return "";
};
export const isStudyGuideDocument = (document) => {
    if (!document?.role)
        return false;
    return document.role.trim().toLowerCase() === "study-guide";
};
export const getDocumentPreviewText = (document, maxChars = 180) => {
    const text = getDocumentPlainText(document);
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, maxChars).trim()}…`;
};
//# sourceMappingURL=document-content.js.map