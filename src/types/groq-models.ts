/**
 * Available Groq models for user selection - now with Analogix branding
 */
export type GroqModelId = 
  | "auto"
  | "llama-4-scout"
  | "llama-3.3-70b"
  | "qwen-3-32b"
  | "deepseek-r1-distill"
  | "llama-3.1-8b"
  | "gemma2-9b"
  | "gpt-oss-120b";
export type SubjectId = 
  | "math"
  | "biology"
  | "history"
  | "physics"
  | "chemistry"
  | "english"
  | "computing"
  | "economics"
  | "business"
  | "commerce"
  | "pdhpe"
  | "geography"
  | "engineering"
  | "medicine"
  | "languages";

export interface ModelBranding {
  name: string;
  description: string;
  systemPromptAddition?: string;
}

export interface GroqModelConfig {
  id: GroqModelId;
  name: string;
  description: string;
  modelString: string;
  maxTokens: number;
  brandingBySubject: Record<SubjectId, ModelBranding>;
}

const subjectMap: Record<string, SubjectId> = {
  "math": "math",
  "maths": "math",
  "biology": "biology",
  "history": "history",
  "physics": "physics",
  "chemistry": "chemistry",
  "english": "english",
  "computing": "computing",
  "digital": "computing",
  "economics": "economics",
  "business": "business",
  "commerce": "commerce",
  "pdhpe": "pdhpe",
  "geography": "geography",
  "engineering": "engineering",
  "medicine": "medicine",
  "languages": "languages"
};

export const GROQ_MODELS: GroqModelConfig[] = [
  {
    id: "auto",
    name: "Auto",
    description: "Picks the best model automatically",
    modelString: "auto",
    maxTokens: 8192,
    brandingBySubject: {
      math: { name: "Auto", description: "Picks the best model for maths" },
      physics: { name: "Auto", description: "Picks the best model for physics" },
      chemistry: { name: "Auto", description: "Picks the best model for chemistry" },
      biology: { name: "Auto", description: "Picks the best model for biology" },
      english: { name: "Auto", description: "Picks the best model for English" },
      history: { name: "Auto", description: "Picks the best model for history" },
      geography: { name: "Auto", description: "Picks the best model for geography" },
      computing: { name: "Auto", description: "Picks the best model for computing" },
      economics: { name: "Auto", description: "Picks the best model for economics" },
      business: { name: "Auto", description: "Picks the best model for business" },
      commerce: { name: "Auto", description: "Picks the best model for commerce" },
      pdhpe: { name: "Auto", description: "Picks the best model for health" },
      engineering: { name: "Auto", description: "Picks the best model for engineering" },
      medicine: { name: "Auto", description: "Picks the best model for medicine" },
      languages: { name: "Auto", description: "Picks the best model for languages" }
    }
  },
  {
    id: "deepseek-r1-distill",
    name: "Analogix Maths",
    description: "Good for maths, coding & logic",
    modelString: "deepseek-r1-distill-llama-70b",
    maxTokens: 8192,
    brandingBySubject: {
      math: { 
        name: "Analogix Maths", 
        description: "Specialised for mathematics, algebra & problem solving",
        systemPromptAddition: "You are Analogix Maths, an AI specialised in mathematical reasoning. Focus on step-by-step solutions, show all working, and use precise mathematical notation. Explain concepts clearly and provide examples."
      },
      computing: { 
        name: "Analogix Code", 
        description: "Specialised for programming & computer science",
        systemPromptAddition: "You are Analogix Code, an AI specialised in programming and computer science. Provide clean, well-commented code. Explain algorithms and computational thinking. Focus on practical, working solutions."
      },
      physics: { 
        name: "Analogix Physics", 
        description: "Specialised for physics calculations & problem solving",
        systemPromptAddition: "You are Analogix Physics, an AI specialised in physics. Show all steps in calculations, use appropriate units, and explain the physics concepts behind each solution. Focus on accuracy and clarity."
      },
      chemistry: { 
        name: "Analogix Chemistry", 
        description: "Specialised for chemistry equations & calculations",
        systemPromptAddition: "You are Analogix Chemistry, an AI specialised in chemistry. Focus on balanced equations, stoichiometry, and chemical concepts. Show all working and explain reactions clearly."
      },
      english: { name: "Analogix Maths", description: "Good for structured analytical writing" },
      history: { name: "Analogix Maths", description: "Good for timeline analysis" },
      geography: { name: "Analogix Maths", description: "Good for data analysis" },
      economics: { name: "Analogix Maths", description: "Good for economic modelling" },
      business: { name: "Analogix Maths", description: "Good for financial analysis" },
      commerce: { name: "Analogix Maths", description: "Good for business calculations" },
      pdhpe: { name: "Analogix Maths", description: "Good for sports science data" },
      engineering: { name: "Analogix Maths", description: "Good for engineering calculations" },
      medicine: { name: "Analogix Maths", description: "Good for medical calculations" },
      languages: { name: "Analogix Maths", description: "Good for language structure analysis" },
      biology: { name: "Analogix Maths", description: "Good for biological data analysis" }
    }
  },
  {
    id: "qwen-3-32b",
    name: "Analogix Science",
    description: "Good for science & reasoning",
    modelString: "qwen-3-32b",
    maxTokens: 8192,
    brandingBySubject: {
      physics: { 
        name: "Analogix Physics", 
        description: "Specialised for physics concepts & explanations",
        systemPromptAddition: "You are Analogix Physics, an AI specialised in physics. Explain concepts thoroughly, use diagrams where helpful, and connect theory to real-world applications. Focus on conceptual understanding alongside calculations."
      },
      chemistry: { 
        name: "Analogix Chemistry", 
        description: "Specialised for chemistry reactions & theory",
        systemPromptAddition: "You are Analogix Chemistry, an AI specialised in chemistry. Explain chemical concepts thoroughly, discuss reaction mechanisms, and connect to real-world applications. Use appropriate chemical notation."
      },
      biology: { 
        name: "Analogix Biology", 
        description: "Specialised for biology & living systems",
        systemPromptAddition: "You are Analogix Biology, an AI specialised in biology. Explain biological concepts clearly, discuss processes and systems, and connect to ecology and health. Use appropriate scientific terminology."
      },
      math: { 
        name: "Analogix Science", 
        description: "Good for mathematical reasoning",
        systemPromptAddition: "You are Analogix Science, an AI with strong reasoning capabilities. Approach problems systematically and explain your thinking clearly."
      },
      english: { name: "Analogix Science", description: "Good for analytical essays" },
      history: { name: "Analogix Science", description: "Good for cause and effect analysis" },
      geography: { name: "Analogix Science", description: "Good for environmental science" },
      computing: { name: "Analogix Science", description: "Good for computational thinking" },
      economics: { name: "Analogix Science", description: "Good for economic analysis" },
      business: { name: "Analogix Science", description: "Good for business analysis" },
      commerce: { name: "Analogix Science", description: "Good for commercial analysis" },
      pdhpe: { name: "Analogix Science", description: "Good for sports science" },
      engineering: { name: "Analogix Science", description: "Good for engineering principles" },
      medicine: { name: "Analogix Science", description: "Good for medical science" },
      languages: { name: "Analogix Science", description: "Good for linguistic analysis" }
    }
  },
  {
    id: "llama-4-scout",
    name: "Analogix General",
    description: "Good for all subjects",
    modelString: "meta-llama/llama-4-scout-17b-16e-instruct",
    maxTokens: 8192,
    brandingBySubject: {
      math: { name: "Analogix General", description: "Good for all subjects including maths" },
      physics: { name: "Analogix General", description: "Good for all subjects including physics" },
      chemistry: { name: "Analogix General", description: "Good for all subjects including chemistry" },
      biology: { name: "Analogix General", description: "Good for all subjects including biology" },
      english: { name: "Analogix General", description: "Good for all subjects including English" },
      history: { name: "Analogix General", description: "Good for all subjects including history" },
      geography: { name: "Analogix General", description: "Good for all subjects including geography" },
      computing: { name: "Analogix General", description: "Good for all subjects including computing" },
      economics: { name: "Analogix General", description: "Good for all subjects including economics" },
      business: { name: "Analogix General", description: "Good for all subjects including business" },
      commerce: { name: "Analogix General", description: "Good for all subjects including commerce" },
      pdhpe: { name: "Analogix General", description: "Good for all subjects including PDHPE" },
      engineering: { name: "Analogix General", description: "Good for all subjects including engineering" },
      medicine: { name: "Analogix General", description: "Good for all subjects including medicine" },
      languages: { name: "Analogix General", description: "Good for all subjects including languages" }
    }
  },
  {
    id: "llama-3.3-70b",
    name: "Analogix Expert",
    description: "Reliable for complex tasks",
    modelString: "llama-3.3-70b-versatile",
    maxTokens: 8192,
    brandingBySubject: {
      history: { 
        name: "Analogix History", 
        description: "Specialised for history & historical analysis",
        systemPromptAddition: "You are Analogix History, an AI specialised in history. Provide detailed historical context, analyse cause and effect, and present multiple perspectives on events. Support arguments with evidence and dates."
      },
      geography: { 
        name: "Analogix Geography", 
        description: "Specialised for geography & environmental studies",
        systemPromptAddition: "You are Analogix Geography, an AI specialised in geography. Explain physical and human geography concepts, discuss environmental issues, and analyse spatial patterns. Connect to current events and sustainability."
      },
      economics: { 
        name: "Analogix Business", 
        description: "Specialised for economics & market analysis",
        systemPromptAddition: "You are Analogix Business, an AI specialised in economics and business. Explain economic concepts clearly, analyse markets and policies, and discuss real-world economic applications. Use appropriate economic terminology."
      },
      business: { 
        name: "Analogix Business", 
        description: "Specialised for business studies & management",
        systemPromptAddition: "You are Analogix Business, an AI specialised in business. Explain business concepts, strategies, and management principles. Discuss real-world examples and practical applications."
      },
      commerce: { 
        name: "Analogix Business", 
        description: "Specialised for commerce & trade",
        systemPromptAddition: "You are Analogix Business, an AI specialised in commerce. Explain trade concepts, financial principles, and commercial practices. Focus on practical business applications."
      },
      english: { name: "Analogix Expert", description: "Good for complex essays" },
      languages: { name: "Analogix Expert", description: "Good for complex language tasks" },
      pdhpe: { name: "Analogix Expert", description: "Good for health & sports analysis" },
      engineering: { name: "Analogix Expert", description: "Good for technical concepts" },
      medicine: { name: "Analogix Expert", description: "Good for medical concepts" },
      math: { name: "Analogix Expert", description: "Good for complex maths" },
      physics: { name: "Analogix Expert", description: "Good for complex physics" },
      chemistry: { name: "Analogix Expert", description: "Good for complex chemistry" },
      biology: { name: "Analogix Expert", description: "Good for complex biology" },
      computing: { name: "Analogix Expert", description: "Good for complex computing" }
    }
  },
  {
    id: "gemma2-9b",
    name: "Analogix Creative",
    description: "Good for creative writing & ideas",
    modelString: "gemma2-9b-it",
    maxTokens: 8192,
    brandingBySubject: {
      english: { 
        name: "Analogix English", 
        description: "Specialised for English, essays & creative writing",
        systemPromptAddition: "You are Analogix English, an AI specialised in English language and literature. Help with essay writing, analysis of texts, creative writing, and language techniques. Use expressive, engaging language."
      },
      languages: { 
        name: "Analogix Languages", 
        description: "Specialised for languages & communication",
        systemPromptAddition: "You are Analogix Languages, an AI specialised in languages. Help with vocabulary, grammar, conversation, and cultural understanding. Be encouraging and supportive of language learning."
      },
      history: { name: "Analogix Creative", description: "Good for historical storytelling" },
      geography: { name: "Analogix Creative", description: "Good for environmental storytelling" },
      pdhpe: { name: "Analogix Creative", description: "Good for health narratives" },
      biology: { name: "Analogix Creative", description: "Good for biological explanations" },
      chemistry: { name: "Analogix Creative", description: "Good for chemistry explanations" },
      physics: { name: "Analogix Creative", description: "Good for physics explanations" },
      math: { name: "Analogix Creative", description: "Good for mathematical explanations" },
      computing: { name: "Analogix Creative", description: "Good for creative coding" },
      economics: { name: "Analogix Creative", description: "Good for economic storytelling" },
      business: { name: "Analogix Creative", description: "Good for business storytelling" },
      commerce: { name: "Analogix Creative", description: "Good for commercial storytelling" },
      engineering: { name: "Analogix Creative", description: "Good for engineering explanations" },
      medicine: { name: "Analogix Creative", description: "Good for medical explanations" }
    }
  },
  {
    id: "llama-3.1-8b",
    name: "Analogix Quick",
    description: "Fast responses for simple questions",
    modelString: "llama-3.1-8b-instant",
    maxTokens: 4096,
    brandingBySubject: {
      math: { name: "Analogix Quick", description: "Fast answers for maths" },
      physics: { name: "Analogix Quick", description: "Fast answers for physics" },
      chemistry: { name: "Analogix Quick", description: "Fast answers for chemistry" },
      biology: { name: "Analogix Quick", description: "Fast answers for biology" },
      english: { name: "Analogix Quick", description: "Fast answers for English" },
      history: { name: "Analogix Quick", description: "Fast answers for history" },
      geography: { name: "Analogix Quick", description: "Fast answers for geography" },
      computing: { name: "Analogix Quick", description: "Fast answers for computing" },
      economics: { name: "Analogix Quick", description: "Fast answers for economics" },
      business: { name: "Analogix Quick", description: "Fast answers for business" },
      commerce: { name: "Analogix Quick", description: "Fast answers for commerce" },
      pdhpe: { name: "Analogix Quick", description: "Fast answers for PDHPE" },
      engineering: { name: "Analogix Quick", description: "Fast answers for engineering" },
      medicine: { name: "Analogix Quick", description: "Fast answers for medicine" },
      languages: { name: "Analogix Quick", description: "Fast answers for languages" }
    }
  },
  {
    id: "gpt-oss-120b",
    name: "Analogix Long",
    description: "Long context & high output",
    modelString: "openai/gpt-oss-120b",
    maxTokens: 32000,
    brandingBySubject: {
      math: { name: "Analogix Long", description: "High output for complex maths" },
      physics: { name: "Analogix Long", description: "High output for complex physics" },
      chemistry: { name: "Analogix Long", description: "High output for complex chemistry" },
      biology: { name: "Analogix Long", description: "High output for complex biology" },
      english: { name: "Analogix Long", description: "High output for long essays" },
      history: { name: "Analogix Long", description: "High output for detailed history" },
      geography: { name: "Analogix Long", description: "High output for detailed geography" },
      computing: { name: "Analogix Long", description: "High output for complex computing" },
      economics: { name: "Analogix Long", description: "High output for complex economics" },
      business: { name: "Analogix Long", description: "High output for complex business" },
      commerce: { name: "Analogix Long", description: "High output for complex commerce" },
      pdhpe: { name: "Analogix Long", description: "High output for detailed PDHPE" },
      engineering: { name: "Analogix Long", description: "High output for complex engineering" },
      medicine: { name: "Analogix Long", description: "High output for complex medicine" },
      languages: { name: "Analogix Long", description: "High output for detailed languages" }
    }
  }
];

export function getSubjectId(subject: string | null | undefined): SubjectId | null {
  if (!subject) return null;
  const normalized = subject.toLowerCase().trim();
  return subjectMap[normalized] || null;
}

export const getGroqModelConfig = (modelId: GroqModelId): GroqModelConfig => {
  const config = GROQ_MODELS.find(m => m.id === modelId);
  if (!config) {
    return GROQ_MODELS[0];
  }
  return config;
};

export const getGroqModelString = (modelId: GroqModelId): string | undefined => {
  if (modelId === "auto") {
    return undefined;
  }
  const config = getGroqModelConfig(modelId);
  return config.modelString;
};

export function getModelBranding(
  modelId: GroqModelId, 
  subject: string | null | undefined
): { name: string; description: string; systemPromptAddition?: string } {
  const config = getGroqModelConfig(modelId);
  const subjectId = getSubjectId(subject);
  
  if (subjectId && config.brandingBySubject[subjectId]) {
    return config.brandingBySubject[subjectId];
  }
  
  return {
    name: config.name,
    description: config.description
  };
}