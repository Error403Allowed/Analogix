import { selectBestInterest, buildMappingSection, getDefaultAnalogy } from "./interestMapper";
import { buildStructuredPrompt, DEFAULT_CONFIG } from "./promptTemplates";
import { buildToneInstructions } from "./toneRules";

export {
  selectBestInterest,
  getMappingsForConcept,
  getDefaultAnalogy,
  buildMappingSection,
  getAllDomains,
  type ConceptMapping,
  type InterestDomain
} from "./interestMapper";

export {
  buildStructuredPrompt,
  getSectionTemplate,
  estimateReadingTime,
  type PromptTemplateConfig,
  type ExplanationSection
} from "./promptTemplates";

export {
  transformTone,
  getToneReport,
  buildToneInstructions,
  type ToneRule
} from "./toneRules";

export function buildExplanationPrompt(
  concept: string,
  userInterests: string[],
  studentYear: string,
  options?: {
    useStructuredFormat?: boolean;
    analogyIntensity?: number;
    includeCoreIdea?: boolean;
    includeWorkedExample?: boolean;
    includeQuickCheck?: boolean;
  }
): string {
  const cfg = { ...DEFAULT_CONFIG, ...options };
  
  const analogyResult = selectBestInterest(userInterests, concept);
  const interest = analogyResult?.interest || userInterests[0] || "their interests";
  const mappings = analogyResult?.mappings || [];

  const mappingSection = buildMappingSection(interest, concept, mappings);
  const toneInstructions = buildToneInstructions();
  const structuredPrompt = buildStructuredPrompt(
    concept,
    interest,
    studentYear,
    {
      includeHook: cfg.useStructuredFormat,
      includeIntuition: cfg.useStructuredFormat,
      includeCoreIdea: cfg.useStructuredFormat && cfg.includeCoreIdea !== false,
      includeFormal: cfg.useStructuredFormat,
      includeWorkedExample: cfg.useStructuredFormat && cfg.includeWorkedExample !== false,
      includeQuickCheck: cfg.useStructuredFormat && cfg.includeQuickCheck !== false
    }
  );

  return [
    structuredPrompt,
    mappingSection,
    toneInstructions
  ].join("\n\n");
}