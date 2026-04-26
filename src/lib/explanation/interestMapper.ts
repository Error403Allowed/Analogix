export interface ConceptMapping {
  conceptElement: string;
  analogyElement: string;
  whyTheyMatch: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface InterestDomain {
  domain: string;
  mappings: Record<string, ConceptMapping[]>;
  defaultAnalogy: string;
}

const INTEREST_DOMAINS: Record<string, InterestDomain> = {
  "F1 racing": {
    domain: "F1 racing",
    defaultAnalogy: "F1 qualifying lap",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "speed", whyTheyMatch: "both measure rate of change", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "grid position", whyTheyMatch: "where you start", difficulty: "easy" },
        { conceptElement: "solution", analogyElement: "race winner", whyTheyMatch: "the answer you're looking for", difficulty: "easy" }
      ],
      "quadratic equation": [
        { conceptElement: "parabola", analogyElement: "racing line", whyTheyMatch: "curves as you turn", difficulty: "medium" },
        { conceptElement: "vertex", analogyElement: "apex of the corner", whyTheyMatch: "closest point to inner edge", difficulty: "medium" },
        { conceptElement: "axis of symmetry", analogyElement: "center of the track", whyTheyMatch: "mirrored on both sides", difficulty: "medium" }
      ],
      "function": [
        { conceptElement: "input", analogyElement: "start of lap", whyTheyMatch: "where you begin", difficulty: "easy" },
        { conceptElement: "output", analogyElement: "lap time", whyTheyMatch: "result after the process", difficulty: "easy" },
        { conceptElement: "domain", analogyElement: "available fuel", whyTheyMatch: "range of possible values", difficulty: "medium" }
      ],
      "gradient": [
        { conceptElement: "slope", analogyElement: "cornering speed", whyTheyMatch: "how steep the angle", difficulty: "easy" },
        { conceptElement: "positive", analogyElement: "speeding up", whyTheyMatch: "going faster into the corner", difficulty: "easy" },
        { conceptElement: "negative", analogyElement: "braking zone", whyTheyMatch: "slowing down", difficulty: "easy" }
      ],
      "algebra": [
        { conceptElement: "variable", analogyElement: "driver position", whyTheyMatch: "what you're solving for", difficulty: "easy" },
        { conceptElement: "coefficient", analogyElement: "engine power", whyTheyMatch: "multiplies the variable", difficulty: "easy" }
      ],
      "calculus": [
        { conceptElement: "derivative", analogyElement: "cornering G-force", whyTheyMatch: "rate of change at a point", difficulty: "hard" },
        { conceptElement: "integral", analogyElement: "total race distance", whyTheyMatch: "accumulated change", difficulty: "hard" }
      ]
    }
  },
  "cricket": {
    domain: "cricket",
    defaultAnalogy: "a cricket match",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "run rate", whyTheyMatch: "runs per over", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "opening batsmen", whyTheyMatch: "where the innings starts", difficulty: "easy" },
        { conceptElement: "solution", analogyElement: "final score", whyTheyMatch: "the result", difficulty: "easy" }
      ],
      "quadratic equation": [
        { conceptElement: "parabola", analogyElement: "ball trajectory", whyTheyMatch: "arc when bowled", difficulty: "medium" },
        { conceptElement: "vertex", analogyElement: "top of the bounce", whyTheyMatch: "highest point", difficulty: "medium" }
      ],
      "function": [
        { conceptElement: "input", analogyElement: "ball delivered", whyTheyMatch: "what comes in", difficulty: "easy" },
        { conceptElement: "output", analogyElement: "runs scored", whyTheyMatch: "what comes out", difficulty: "easy" }
      ],
      "probability": [
        { conceptElement: "sample space", analogyElement: "all possible outcomes", whyTheyMatch: "runs off each ball", difficulty: "medium" },
        { conceptElement: "expected value", analogyElement: "strike rate", whyTheyMatch: "average runs", difficulty: "medium" }
      ],
      "statistics": [
        { conceptElement: "mean", analogyElement: "batting average", whyTheyMatch: "total runs divided by dismissals", difficulty: "easy" },
        { conceptElement: "standard deviation", analogyElement: "consistency", whyTheyMatch: "how reliable the player is", difficulty: "medium" }
      ]
    }
  },
  "chess": {
    domain: "chess",
    defaultAnalogy: "a chess game",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "material advantage", whyTheyMatch: "piece value difference", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "starting position", whyTheyMatch: "opening setup", difficulty: "easy" }
      ],
      "quadratic equation": [
        { conceptElement: "parabola", analogyElement: "knight's L-shape move", whyTheyMatch: "curved path", difficulty: "medium" }
      ],
      "logic": [
        { conceptElement: "if-then", analogyElement: "if I move here, then they checkmate", whyTheyMatch: "conditional outcomes", difficulty: "medium" },
        { conceptElement: "boolean", analogyElement: "legal move or not", whyTheyMatch: "true/false", difficulty: "easy" }
      ],
      "algebra": [
        { conceptElement: "variable", analogyElement: "unknown square", whyTheyMatch: "where the piece goes", difficulty: "easy" },
        { conceptElement: "equation", analogyElement: "capture scenario", whyTheyMatch: "piece trade", difficulty: "easy" }
      ],
      "matrix": [
        { conceptElement: "matrix", analogyElement: "chess board", whyTheyMatch: "grid of positions", difficulty: "medium" },
        { conceptElement: "determinant", analogyElement: "attack strength", whyTheyMatch: "how much control", difficulty: "hard" }
      ]
    }
  },
  "gaming": {
    domain: "gaming",
    defaultAnalogy: "a video game",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "XP gain rate", whyTheyMatch: "how fast you level up", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "starting level", whyTheyMatch: "where you begin", difficulty: "easy" },
        { conceptElement: "solution", analogyElement: "victory condition", whyTheyMatch: "winning the game", difficulty: "easy" }
      ],
      "quadratic equation": [
        { conceptElement: "parabola", analogyElement: "jumping arc", whyTheyMatch: "gravity-affected curve", difficulty: "medium" },
        { conceptElement: "vertex", analogyElement: "jump peak", whyTheyMatch: "highest point", difficulty: "medium" }
      ],
      "function": [
        { conceptElement: "input", analogyElement: "button press", whyTheyMatch: "what you do", difficulty: "easy" },
        { conceptElement: "output", analogyElement: "character action", whyTheyMatch: "what happens", difficulty: "easy" },
        { conceptElement: "domain", analogyElement: "controller buttons", whyTheyMatch: "possible inputs", difficulty: "easy" }
      ],
      "exponential": [
        { conceptElement: "growth", analogyElement: "combo multiplier", whyTheyMatch: "builds on itself", difficulty: "medium" },
        { conceptElement: "decay", analogyElement: "health bar drain", whyTheyMatch: "decreases over time", difficulty: "medium" }
      ],
      "probability": [
        { conceptElement: "drop rate", analogyElement: "loot chance", whyTheyMatch: "random reward", difficulty: "medium" },
        { conceptElement: "critical hit", analogyElement: "critical damage", whyTheyMatch: "rare bonus", difficulty: "medium" }
      ]
    }
  },
  "music": {
    domain: "music",
    defaultAnalogy: "a song or album",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "tempo", whyTheyMatch: "speed of the beat", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "starting note", whyTheyMatch: "where the melody begins", difficulty: "easy" }
      ],
      "wave": [
        { conceptElement: "amplitude", analogyElement: "volume", whyTheyMatch: "how loud", difficulty: "easy" },
        { conceptElement: "frequency", analogyElement: "pitch", whyTheyMatch: "how high/low", difficulty: "easy" },
        { conceptElement: "period", analogyElement: "measure length", whyTheyMatch: "time for one cycle", difficulty: "medium" }
      ],
      "trigonometry": [
        { conceptElement: "sine wave", analogyElement: "waveform", whyTheyMatch: "oscillates up and down", difficulty: "medium" },
        { conceptElement: "period", analogyElement: "chorus repeat", whyTheyMatch: "time before repetition", difficulty: "medium" }
      ],
      "harmonics": [
        { conceptElement: "overtone", analogyElement: " harmonies", whyTheyMatch: "additional notes", difficulty: "hard" },
        { conceptElement: "frequency ratio", analogyElement: "interval", whyTheyMatch: "note relationship", difficulty: "hard" }
      ]
    }
  },
  "football": {
    domain: "football (soccer)",
    defaultAnalogy: "a football match",
    mappings: {
      "linear equation": [
        { conceptElement: "slope", analogyElement: "goals per minute", whyTheyMatch: "scoring rate", difficulty: "easy" },
        { conceptElement: "intercept", analogyElement: "half-time score", whyTheyMatch: "starting point", difficulty: "easy" }
      ],
      "function": [
        { conceptElement: "input", analogyElement: "pass", whyTheyMatch: "what goes in", difficulty: "easy" },
        { conceptElement: "output", analogyElement: "goal", whyTheyMatch: "what comes out", difficulty: "easy" }
      ],
      "quadratic": [
        { conceptElement: "parabola", analogyElement: "ball trajectory", whyTheyMatch: "arc in the air", difficulty: "medium" }
      ],
      "statistics": [
        { conceptElement: "mean", analogyElement: "goals per game", whyTheyMatch: "average scoring", difficulty: "easy" },
        { conceptElement: "correlation", analogyElement: "possession vs wins", whyTheyMatch: "relationship", difficulty: "medium" }
      ]
    }
  }
};

export function selectBestInterest(
  userInterests: string[],
  concept: string
): { interest: string; mappings: ConceptMapping[] } | null {
  if (!userInterests || userInterests.length === 0) {
    return null;
  }

  const conceptLower = concept.toLowerCase();
  let bestMatch: { interest: string; mappings: ConceptMapping[] } | null = null;
  let bestScore = -1;

  for (const interest of userInterests) {
    const interestLower = interest.toLowerCase();
    const domain = Object.keys(INTEREST_DOMAINS).find(d => 
      d.toLowerCase().includes(interestLower) || 
      interestLower.includes(d.toLowerCase())
    );
    
    if (!domain) continue;

    const mappings = INTEREST_DOMAINS[domain].mappings[conceptLower];
    if (!mappings) continue;

    let score = mappings.length;
    score += mappings.filter(m => m.difficulty === "easy").length * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { interest: domain, mappings };
    }
  }

  return bestMatch;
}

export function getMappingsForConcept(
  interest: string,
  concept: string
): ConceptMapping[] {
  const conceptLower = concept.toLowerCase();
  
  for (const [domain, data] of Object.entries(INTEREST_DOMAINS)) {
    if (domain.toLowerCase().includes(interest.toLowerCase()) || 
        interest.toLowerCase().includes(domain.toLowerCase())) {
      return data.mappings[conceptLower] || [];
    }
  }
  
  return [];
}

export function getDefaultAnalogy(interest: string): string {
  for (const [domain, data] of Object.entries(INTEREST_DOMAINS)) {
    if (domain.toLowerCase().includes(interest.toLowerCase()) || 
        interest.toLowerCase().includes(domain.toLowerCase())) {
      return data.defaultAnalogy;
    }
  }
  return "familiar example";
}

export function buildMappingSection(
  interest: string,
  concept: string,
  mappings: ConceptMapping[]
): string {
  if (!mappings || mappings.length === 0) {
    return "";
  }

  const lines = [
    `\nANALOGY MAPPING (${interest} → ${concept}):`
  ];

  for (const m of mappings) {
    lines.push(`  • ${m.conceptElement} ↔ ${m.analogyElement}: ${m.whyTheyMatch}`);
  }

  lines.push("\nIMPORTANT: Use these mappings DIRECTLY in your explanation.");
  lines.push("Every concept element MUST map to an analogy element with explicit correspondence.");

  return lines.join("\n");
}

export function getAllDomains(): string[] {
  return Object.keys(INTEREST_DOMAINS);
}