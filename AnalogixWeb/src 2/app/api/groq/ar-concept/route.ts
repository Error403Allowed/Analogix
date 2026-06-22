import { NextResponse } from "next/server";
import { callGroqChat, formatError } from "../_utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { concept, subject, grade } = body;

    if (!concept) {
      return NextResponse.json({ error: "No concept provided" }, { status: 400 });
    }

    const systemPrompt = `You are a creative 3D/AR visualisation engine for Australian secondary students.
Given ANY concept — science, maths, history, economics, literature, geography, commerce, music, sport, or anything else — return a JSON object that represents it as an interesting 3D scene.

The goal is always to make the concept VISUAL and memorable, even for abstract ideas. Be creative:
- History/geography: Use nodes for places, people, empires, events — connect them with arrows for influence or time flow
- Economics: Use stacked boxes for supply/demand, spheres for money flows, cylinders for industries
- Literature: Use shapes to represent characters, themes, narrative arcs — connect them with relationship lines
- Maths: Use geometry, grids, orbiting points to show relationships
- Music: Use waves (helix shapes), rings for harmony, pulsating spheres for rhythm
- Law/government: Use pyramids for power structures, interconnected nodes for branches
- Sport: Use spheres for players/teams, cylinders for fields, connections for tactics

The JSON must have this exact shape:
{
  "title": "short display title",
  "description": "1-2 sentence plain-English explanation",
  "sceneType": one of: "atom" | "solar" | "molecule" | "wave" | "dna" | "cell" | "graph" | "geometry" | "network" | "timeline" | "hierarchy" | "flow" | "ecosystem" | "generic",
  "primaryColor": a hex colour string like "#4f46e5",
  "secondaryColor": a hex colour string like "#06b6d4",
  "objects": [
    {
      "id": "unique string",
      "shape": one of: "sphere" | "torus" | "box" | "cylinder" | "cone" | "helix" | "ring" | "pyramid",
      "label": "short label (2-3 words max)",
      "color": "#hexcolor",
      "size": number between 0.3 and 2.5,
      "position": { "x": number between -3 and 3, "y": number between -2 and 2, "z": number between -2 and 2 },
      "orbitRadius": number or null,
      "orbitSpeed": number or null,
      "pulsates": boolean
    }
  ],
  "connections": [
    { "from": "object_id", "to": "object_id", "color": "#hexcolor" }
  ],
  "analogyHint": "A fun one-liner analogy or memory tip for this concept"
}
Rules:
- Return ONLY valid JSON. No markdown, no explanation, no code fences.
- Include 4-10 objects spread across the full position range (-3 to 3 on x, -2 to 2 on y/z). Do NOT cluster everything near 0,0,0.
- Make positions intentional — layout should reflect the concept's structure (e.g. timeline = left to right, hierarchy = top to bottom, flow = circular).
- orbitRadius/orbitSpeed only for objects that should animate (electrons, planets, money flows).
- pulsates: true for living things, energy, or active processes.
- Use meaningful, distinct colours — not everything should be the same colour.
- Tailor complexity and vocabulary for Year ${grade || "10"} in Australia.
- analogyHint should be fun and memorable, not dry.`;

    const userMsg = `Concept: "${concept}"${subject ? `\nSubject: ${subject}` : ""}
Create a 3D AR visualisation JSON for this concept.`;

    const raw = await callGroqChat(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      },
      "reasoning"
    );

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const sceneData = JSON.parse(cleaned);

    return NextResponse.json({ scene: sceneData });
  } catch (error) {
    const message = formatError(error);
    console.error("[/api/groq/ar-concept] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
