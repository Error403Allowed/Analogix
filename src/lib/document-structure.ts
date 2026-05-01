/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// STRUCTURED DOCUMENT SCHEMA (Notion-style blocks)
// ============================================================================

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "numberedList"
  | "checklist"
  | "quote"
  | "code"
  | "callout";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  items?: string[]; // for lists
  checked?: boolean[]; // for checklists
  language?: string; // for code blocks
  children?: Block[]; // nested blocks
}

export interface StructuredDocument {
  title: string;
  blocks: Block[];
  metadata?: {
    subjectId?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

// ============================================================================
// JSON PATCH OPERATIONS (RFC 6902 style)
// ============================================================================

export type PatchOperation =
  | ReplaceOperation
  | AddOperation
  | RemoveOperation
  | InsertBlockOperation
  | DeleteBlockOperation;

export interface ReplaceOperation {
  op: "replace";
  path: string; // JSON pointer e.g., "/blocks/2/content"
  value: string | string[] | boolean | boolean[];
}

export interface AddOperation {
  op: "add";
  path: string;
  value: Block | Block[];
}

export interface RemoveOperation {
  op: "remove";
  path: string;
}

export interface InsertBlockOperation {
  op: "insert_block";
  afterBlockId: string;
  block: Block;
}

export interface DeleteBlockOperation {
  op: "delete_block";
  blockId: string;
}

export interface DocumentPatch {
  edits: PatchOperation[];
  summary?: string; // Brief description of what changed
}

// ============================================================================
// AI ACTION TYPES (for structured editing)
// ============================================================================

export type StructuredAIAction =
  | "rewrite_block"
  | "simplify_block"
  | "expand_block"
  | "shorten_block"
  | "fix_grammar_block"
  | "split_to_bullets"
  | "split_to_checklist"
  | "merge_blocks"
  | "add_explanation"
  | "add_example"
  | "add_steps"
  | "extract_key_terms"
  | "summarise_selection"
  | "generate_flashcards"
  | "generate_quiz"
  | "generate_practice_problems";

export interface StructuredAIRequest {
  action: StructuredAIAction;
  document: StructuredDocument;
  selectedBlockIds: string[];
  selectedText?: string;
  subject?: string;
}

export interface StructuredAIResponse {
  patch: DocumentPatch;
  preview?: string; // Human-readable preview of changes
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Generate a unique block ID */
export const generateBlockId = (): string => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/** Convert HTML to structured blocks (basic implementation) */
export const htmlToBlocks = (html: string, title?: string): StructuredDocument => {
  const blocks: Block[] = [];
  
  // Simple HTML parsing - in production, use a proper parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const processNode = (node: Node, parentBlock?: Block) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && parentBlock) {
        parentBlock.content += text;
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as Element;
    
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
export const blocksToHtml = (blocks: Block[]): string => {
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
        return `<ul>${block.items?.map((item, i) => 
          `<li class="task-list-item ${block.checked?.[i] ? 'checked' : ''}">${escapeHtml(item)}</li>`
        ).join("") || ""}</ul>`;
      case "quote":
        return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
      case "code":
        return `<pre><code class="language-${block.language || "text"}">${escapeHtml(block.content)}</code></pre>`;
      default:
        return `<p>${escapeHtml(block.content)}</p>`;
    }
  }).join("\n");
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

/** Apply a patch to a document */
export const applyPatch = (doc: StructuredDocument, patch: DocumentPatch): StructuredDocument => {
  const newDoc: StructuredDocument = {
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
            (newDoc.blocks[blockIndex] as any)[field] = edit.value;
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
            } else {
              newDoc.blocks.splice(index, 0, edit.value as Block);
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
export const findBlocks = (doc: StructuredDocument, blockIds: string[]): Block[] => {
  return doc.blocks.filter(block => blockIds.includes(block.id));
};

/** Get block index by ID */
export const getBlockIndex = (doc: StructuredDocument, blockId: string): number => {
  return doc.blocks.findIndex(b => b.id === blockId);
};
