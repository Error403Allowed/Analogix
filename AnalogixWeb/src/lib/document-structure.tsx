// ============================================================================
// STRUCTURED DOCUMENT SCHEMA (Notion-style blocks)
// ============================================================================
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/** Generate a unique block ID */
export const generateBlockId = () => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
/** Convert HTML to structured blocks (basic implementation) */
export const htmlToBlocks = (html, title) => {
    const blocks: any[] = [];
    // Simple HTML parsing - in production, use a proper parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const processNode = (node, parentBlock?) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && parentBlock) {
                parentBlock.content += text;
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE)
            return;
        const el = node;
        switch (el.tagName.toLowerCase()) {
            case "h1":
                blocks.push({
                    id: generateBlockId(),
                    type: "heading1",
                    content: el.textContent?.trim() || "",
                });
                break;
            case "h2":
                blocks.push({
                    id: generateBlockId(),
                    type: "heading2",
                    content: el.textContent?.trim() || "",
                });
                break;
            case "h3":
                blocks.push({
                    id: generateBlockId(),
                    type: "heading3",
                    content: el.textContent?.trim() || "",
                });
                break;
            case "p":
                blocks.push({
                    id: generateBlockId(),
                    type: "paragraph",
                    content: el.textContent?.trim() || "",
                });
                break;
            case "ul": {
                const bulletItems: string[] = [];
                el.querySelectorAll("li").forEach(li => {
                    bulletItems.push(li.textContent?.trim() || "");
                });
                if (bulletItems.length > 0) {
                    blocks.push({
                        id: generateBlockId(),
                        type: "bulletList",
                        content: "",
                        items: bulletItems,
                    });
                }
                break;
            }
            case "ol": {
                const numberedItems: string[] = [];
                el.querySelectorAll("li").forEach(li => {
                    numberedItems.push(li.textContent?.trim() || "");
                });
                if (numberedItems.length > 0) {
                    blocks.push({
                        id: generateBlockId(),
                        type: "numberedList",
                        content: "",
                        items: numberedItems,
                    });
                }
                break;
            }
            case "blockquote":
                blocks.push({
                    id: generateBlockId(),
                    type: "quote",
                    content: el.textContent?.trim() || "",
                });
                break;
            case "pre": {
                const codeEl = el.querySelector("code");
                blocks.push({
                    id: generateBlockId(),
                    type: "code",
                    content: codeEl?.textContent?.trim() || el.textContent?.trim() || "",
                    language: codeEl?.className.replace("language-", "") || "text",
                });
                break;
            }
        }
        // Process children
        el.childNodes.forEach(child => processNode(child));
    };
    doc.body.childNodes.forEach(node => processNode(node));
    return {
        title: title || "Untitled",
        blocks: blocks.length > 0 ? blocks : [{
                id: generateBlockId(),
                type: "paragraph",
                content: "",
            }],
    };
};
/** Convert structured blocks back to HTML */
export const blocksToHtml = (blocks) => {
    return blocks.map(block => {
        switch (block.type) {
            case "heading1":
                return `<h1>${escapeHtml(block.content)}</h1>`;
            case "heading2":
                return `<h2>${escapeHtml(block.content)}</h2>`;
            case "heading3":
                return `<h3>${escapeHtml(block.content)}</h3>`;
            case "paragraph":
                return `<p>${escapeHtml(block.content)}</p>`;
            case "bulletList":
                return `<ul>${block.items?.map(item => `<li>${escapeHtml(item)}</li>`).join("") || ""}</ul>`;
            case "numberedList":
                return `<ol>${block.items?.map(item => `<li>${escapeHtml(item)}</li>`).join("") || ""}</ol>`;
            case "checklist":
                return `<ul>${block.items?.map((item, i) => `<li class="task-list-item ${block.checked?.[i] ? 'checked' : ''}">${escapeHtml(item)}</li>`).join("") || ""}</ul>`;
            case "quote":
                return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
            case "code":
                return `<pre><code class="language-${block.language || "text"}">${escapeHtml(block.content)}</code></pre>`;
            default:
                return `<p>${escapeHtml(block.content)}</p>`;
        }
    }).join("\n");
};
const escapeHtml = (text) => {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
};
/** Apply a patch to a document */
export const applyPatch = (doc, patch) => {
    const newDoc = {
        ...doc,
        blocks: [...doc.blocks],
        metadata: {
            ...doc.metadata,
            updatedAt: new Date().toISOString(),
        },
    };
    patch.edits.forEach(edit => {
        switch (edit.op) {
            case "replace": {
                const parts = edit.path.split("/").filter(Boolean);
                if (parts[0] === "blocks" && parts.length >= 3) {
                    const blockIndex = parseInt(parts[1], 10);
                    const field = parts[2];
                    if (!isNaN(blockIndex) && newDoc.blocks[blockIndex]) {
                        newDoc.blocks[blockIndex][field] = edit.value;
                    }
                }
                break;
            }
            case "add": {
                const parts = edit.path.split("/").filter(Boolean);
                if (parts[0] === "blocks" && parts.length === 2) {
                    const index = parseInt(parts[1], 10);
                    if (!isNaN(index)) {
                        if (Array.isArray(edit.value)) {
                            newDoc.blocks.splice(index, 0, ...edit.value);
                        }
                        else {
                            newDoc.blocks.splice(index, 0, edit.value);
                        }
                    }
                }
                break;
            }
            case "remove": {
                const parts = edit.path.split("/").filter(Boolean);
                if (parts[0] === "blocks" && parts.length === 2) {
                    const index = parseInt(parts[1], 10);
                    if (!isNaN(index) && newDoc.blocks[index]) {
                        newDoc.blocks.splice(index, 1);
                    }
                }
                break;
            }
            case "insert_block": {
                const afterIndex = newDoc.blocks.findIndex(b => b.id === edit.afterBlockId);
                if (afterIndex !== -1) {
                    newDoc.blocks.splice(afterIndex + 1, 0, edit.block);
                }
                break;
            }
            case "delete_block": {
                const index = newDoc.blocks.findIndex(b => b.id === edit.blockId);
                if (index !== -1) {
                    newDoc.blocks.splice(index, 1);
                }
                break;
            }
        }
    });
    return newDoc;
};
/** Find blocks by ID */
export const findBlocks = (doc, blockIds) => {
    return doc.blocks.filter(block => blockIds.includes(block.id));
};
/** Get block index by ID */
export const getBlockIndex = (doc, blockId) => {
    return doc.blocks.findIndex(b => b.id === blockId);
};
//# sourceMappingURL=document-structure.js.map