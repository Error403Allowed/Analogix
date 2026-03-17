import { NextResponse } from "next/server";
import { callHfChat } from "../_utils";
import type {
  StructuredDocument,
  DocumentPatch,
  StructuredAIAction,
  Block,
} from "@/lib/document-structure";
import { generateBlockId } from "@/lib/document-structure";

export const runtime = "nodejs";

// Map simple actions to structured editing actions
const ACTION_MAP: Record<string, StructuredAIAction> = {
  rewrite: "rewrite_block",
  shorten: "shorten_block",
  simplify: "simplify_block",
  expand: "expand_block",
  formal: "rewrite_block",
  casual: "rewrite_block",
  summarise: "summarise_selection",
  "bullet-points": "split_to_bullets",
  checklist: "split_to_checklist",
  "key-terms": "extract_key_terms",
  "revision-summary": "summarise_selection",
  explain: "add_explanation",
  "add-examples": "add_example",
  "add-steps": "add_steps",
  "expand-explanations": "expand_block",
  "fix-grammar": "fix_grammar_block",
  flashcards: "generate_flashcards",
  quiz: "generate_quiz",
  "practice-problems": "generate_practice_problems",
};

const ACTION_PROMPTS: Record<StructuredAIAction, (text: string, subject?: string) => string> = {
  rewrite_block: (text, subject) => 
    `Rewrite this text to improve clarity, flow, and readability while keeping all key information.
Output ONLY the rewritten text.

Text to rewrite:
${text}`,

  shorten_block: (text) => 
    `Make this text significantly shorter while keeping the key information. Remove filler and redundancy.
Output ONLY the shortened text.

Text to shorten:
${text}`,

  simplify_block: (text) => 
    `Simplify this text. Use simpler words and shorter sentences for a high school student.
Output ONLY the simplified text.

Text to simplify:
${text}`,

  expand_block: (text, subject) => 
    `Expand this text with more detail, explanation, and context. Add relevant examples.
Output ONLY the expanded text.

Text to expand:
${text}`,

  fix_grammar_block: (text) => 
    `Fix all spelling, grammar, and punctuation errors. Improve clarity and flow.
Output ONLY the corrected text.

Text to fix:
${text}`,

  split_to_bullets: (text) => 
    `Convert this text into structured bullet points. Use one idea per bullet.
Output ONLY the bullet points, one per line.

Text to convert:
${text}`,

  split_to_checklist: (text) => 
    `Convert this text into a checklist of actionable items.
Output ONLY the checklist items, one per line.

Text to convert:
${text}`,

  merge_blocks: (text) => 
    `Merge this content into a single coherent paragraph.
Output ONLY the merged paragraph.

Text to merge:
${text}`,

  add_explanation: (text, subject) => 
    `Explain this concept in simple terms as if teaching a student. Use analogies where helpful.
Output ONLY the explanation.

Concept to explain:
${text}`,

  add_example: (text, subject) => 
    `Add a relevant, concrete example that illustrates this concept.
Output ONLY the example.

Concept:
${text}`,

  add_steps: (text) => 
    `Break this process into clear, numbered steps. Each step should be specific and actionable.
Output ONLY the numbered steps, one per line.

Process to break down:
${text}`,

  extract_key_terms: (text) => 
    `Extract key terms and their definitions. Format as "Term: Definition" one per line.
Output ONLY the terms and definitions.

Text to extract from:
${text}`,

  summarise_selection: (text) => 
    `Summarise this text into concise bullet points capturing key ideas only.
Output ONLY the bullet points, one per line.

Text to summarise:
${text}`,

  generate_flashcards: (text, subject) => 
    `Create flashcards from this text. Format as:
Q: [question]
A: [answer]

Create 5-10 flashcards. Output ONLY the flashcards.

Text to convert:
${text}`,

  generate_quiz: (text, subject) => 
    `Create practice quiz questions from this text. Include multiple choice with 4 options (A-D) and the correct answer.
Format:
Q: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Answer: [letter]

Create 5-8 questions. Output ONLY the quiz.

Text to convert:
${text}`,

  generate_practice_problems: (text, subject) => 
    `Create practice problems based on this text. Include the problem and full solution.
Format:
Problem: [question]
Solution: [worked solution]

Create 5-8 problems. Output ONLY the problems.

Text to base problems on:
${text}`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, text, subject, document, selectedBlockIds } = body;

    if (!action || !text) {
      return NextResponse.json({ error: "Action and text are required" }, { status: 400 });
    }

    const structuredAction = ACTION_MAP[action] || "rewrite_block";
    const promptFn = ACTION_PROMPTS[structuredAction];
    
    if (!promptFn) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const prompt = promptFn(text, subject);

    // Get AI response
    const result = await callHfChat(
      {
        messages: [
          { role: "system", content: "You are an expert educational AI assistant. Output ONLY the requested content - no preamble, no explanations, no markdown unless specifically requested." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      },
      "default"
    );

    // Build structured patch based on action type
    const patch: DocumentPatch = buildStructuredPatch(
      structuredAction,
      result,
      selectedBlockIds || [],
      document
    );

    return NextResponse.json({
      patch,
      preview: generatePreview(patch, structuredAction),
    });
  } catch (error) {
    console.error("[/api/groq/document-ai] Error:", error);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 }
    );
  }
}

/** Build a structured patch from AI response */
function buildStructuredPatch(
  action: StructuredAIAction,
  aiResponse: string,
  selectedBlockIds: string[],
  document?: StructuredDocument
): DocumentPatch {
  const edits: DocumentPatch["edits"] = [];

  // Parse AI response into structured edits
  const lines = aiResponse.split("\n").filter(line => line.trim());

  switch (action) {
    case "split_to_bullets":
    case "split_to_checklist":
    case "add_steps": {
      // Replace selected block with list
      if (selectedBlockIds.length > 0 && document) {
        const firstBlockId = selectedBlockIds[0];
        const blockIndex = document.blocks.findIndex(b => b.id === firstBlockId);
        
        if (blockIndex !== -1) {
          // Replace the block with a list
          const items = lines.map(line => line.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "").trim());
          
          edits.push({
            op: "replace",
            path: `/blocks/${blockIndex}/type`,
            value: action === "split_to_bullets" ? "bulletList" : 
                   action === "split_to_checklist" ? "checklist" : "numberedList",
          });
          edits.push({
            op: "replace",
            path: `/blocks/${blockIndex}/items`,
            value: items,
          });
          edits.push({
            op: "replace",
            path: `/blocks/${blockIndex}/content`,
            value: "",
          });
        }
      }
      break;
    }

    case "extract_key_terms": {
      // Add new block with key terms after selection
      if (selectedBlockIds.length > 0 && document) {
        const lastBlockId = selectedBlockIds[selectedBlockIds.length - 1];
        const termsBlock: Block = {
          id: generateBlockId(),
          type: "paragraph",
          content: lines.join("\n"),
        };
        
        edits.push({
          op: "insert_block",
          afterBlockId: lastBlockId,
          block: termsBlock,
        });
      }
      break;
    }

    case "generate_flashcards":
    case "generate_quiz":
    case "generate_practice_problems": {
      // Add new block with generated content after selection
      if (selectedBlockIds.length > 0 && document) {
        const lastBlockId = selectedBlockIds[selectedBlockIds.length - 1];
        const contentBlock: Block = {
          id: generateBlockId(),
          type: "paragraph",
          content: aiResponse,
        };
        
        edits.push({
          op: "insert_block",
          afterBlockId: lastBlockId,
          block: contentBlock,
        });
      }
      break;
    }

    case "add_explanation":
    case "add_example": {
      // Add explanation/example as new block after each selected block
      if (selectedBlockIds.length > 0 && document) {
        let afterId = selectedBlockIds[selectedBlockIds.length - 1];
        
        const explanationBlock: Block = {
          id: generateBlockId(),
          type: "callout",
          content: action === "add_explanation" ? "💡 Explanation: " + aiResponse : "📌 Example: " + aiResponse,
        };
        
        edits.push({
          op: "insert_block",
          afterBlockId: afterId,
          block: explanationBlock,
        });
      }
      break;
    }

    default:
      // For rewrite, simplify, expand, etc. - replace selected block content
      if (selectedBlockIds.length > 0 && document) {
        selectedBlockIds.forEach((blockId, index) => {
          const blockIndex = document.blocks.findIndex(b => b.id === blockId);
          if (blockIndex !== -1) {
            // If multiple blocks selected, split response among them
            const responseLines = lines;
            const linesPerBlock = Math.ceil(responseLines.length / selectedBlockIds.length);
            const blockContent = responseLines
              .slice(index * linesPerBlock, (index + 1) * linesPerBlock)
              .join("\n");
            
            edits.push({
              op: "replace",
              path: `/blocks/${blockIndex}/content`,
              value: blockContent || aiResponse,
            });
          }
        });
      }
  }

  return { edits };
}

/** Generate human-readable preview of changes */
function generatePreview(patch: DocumentPatch, action: StructuredAIAction): string {
  const editCount = patch.edits.length;
  
  const actionDescriptions: Record<StructuredAIAction, string> = {
    rewrite_block: "Rewrote",
    shorten_block: "Shortened",
    simplify_block: "Simplified",
    expand_block: "Expanded",
    fix_grammar_block: "Fixed grammar in",
    split_to_bullets: "Converted to bullet points",
    split_to_checklist: "Converted to checklist",
    merge_blocks: "Merged",
    add_explanation: "Added explanation",
    add_example: "Added example",
    add_steps: "Broke into steps",
    extract_key_terms: "Extracted key terms",
    summarise_selection: "Summarised",
    generate_flashcards: "Generated flashcards",
    generate_quiz: "Generated quiz",
    generate_practice_problems: "Generated practice problems",
  };

  return `${actionDescriptions[action]} ${editCount} block${editCount !== 1 ? "s" : ""}`;
}
