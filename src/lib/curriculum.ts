import { ACARA_CURRICULUM, ACARA_SUBJECTS, STATE_CURRICULUM_DOCUMENTS, CurriculumSubject, CurriculumYearLevel, CurriculumTopic } from "@/data/curriculum";

export function getSubjectFromKey(key: string): string {
  const subjectMap: Record<string, string> = {
    "maths": "Mathematics",
    "mathematics": "Mathematics",
    "english": "English",
    "science": "Science",
    "physics": "Science",
    "chemistry": "Science",
    "biology": "Science",
    "digital": "Digital Technologies",
    "digital technologies": "Digital Technologies",
    "computing": "Digital Technologies",
    "hass": "HASS",
    "humanities": "HASS",
    "history": "HASS",
    "geography": "HASS",
    "economics": "HASS",
    "business": "HASS",
    "civics": "HASS",
    "design": "Design and Technologies",
    "design and technologies": "Design and Technologies",
    "visual arts": "Visual Arts",
    "arts": "Visual Arts",
    "music": "Music",
    "health": "Health and Physical Education",
    "pe": "Health and Physical Education",
    "physical education": "Health and Physical Education",
    "languages": "Languages",
    "french": "Languages",
    "japanese": "Languages",
    "chinese": "Languages",
    "german": "Languages",
    "italian": "Languages",
    "indonesian": "Languages",
    "spanish": "Languages"
  };
  return subjectMap[key.toLowerCase()] || key;
}

export function getCurriculumSubject(subjectName: string): CurriculumSubject | undefined {
  const normalisedSubject = getSubjectFromKey(subjectName);
  return ACARA_CURRICULUM[normalisedSubject];
}

export function getCurriculumForYearLevel(subjectName: string, yearLevel: number): CurriculumYearLevel | undefined {
  const subject = getCurriculumSubject(subjectName);
  if (!subject) return undefined;
  
  const yearKey = yearLevel.toString();
  return subject.yearLevels[yearKey];
}

export function getCurriculumTopic(subjectName: string, yearLevel: number, topicName: string): CurriculumTopic | undefined {
  const yearLevelData = getCurriculumForYearLevel(subjectName, yearLevel);
  if (!yearLevelData) return undefined;
  
  for (const strand of Object.values(yearLevelData.strands)) {
    for (const topic of strand) {
      if (topic.topic.toLowerCase().includes(topicName.toLowerCase()) ||
          topicName.toLowerCase().includes(topic.topic.toLowerCase())) {
        return topic;
      }
    }
  }
  return undefined;
}

export function getAllTopicsForSubjectAndYear(subjectName: string, yearLevel: number): { strand: string; topic: CurriculumTopic }[] {
  const yearLevelData = getCurriculumForYearLevel(subjectName, yearLevel);
  if (!yearLevelData) return [];
  
  const topics: { strand: string; topic: CurriculumTopic }[] = [];
  for (const [strand, topicsList] of Object.entries(yearLevelData.strands)) {
    for (const topic of topicsList) {
      topics.push({ strand, topic });
    }
  }
  return topics;
}

export function findTopicsByKeyword(subjectName: string, yearLevel: number, keyword: string): CurriculumTopic[] {
  const topics = getAllTopicsForSubjectAndYear(subjectName, yearLevel);
  const keywordLower = keyword.toLowerCase();
  
  return topics
    .filter(({ topic }) => 
      topic.topic.toLowerCase().includes(keywordLower) ||
      topic.contentDescription.toLowerCase().includes(keywordLower) ||
      topic.elaborations.some(e => e.toLowerCase().includes(keywordLower))
    )
    .map(({ topic }) => topic);
}

export function buildCurriculumContext(subjectName: string, yearLevel: number, topic?: string): string {
  const yearLevelData = getCurriculumForYearLevel(subjectName, yearLevel);
  if (!yearLevelData) {
    return "";
  }

  let context = `ACARA CURRICULUM - Year ${yearLevel} ${subjectName}\n`;
  context += `Achievement Standard: ${yearLevelData.achievementStandard}\n\n`;

  if (topic) {
    const matchingTopic = findTopicsByKeyword(subjectName, yearLevel, topic)[0];
    if (matchingTopic) {
      context += `Topic: ${matchingTopic.topic} (${matchingTopic.strand})\n`;
      context += `Content Description: ${matchingTopic.contentDescription}\n`;
      context += `Key Examples (Elaborations):\n`;
      matchingTopic.elaborations.slice(0, 3).forEach(el => {
        context += `- ${el}\n`;
      });
    }
  } else {
    context += `Key Topics by Strand:\n`;
    for (const [strand, topicsList] of Object.entries(yearLevelData.strands)) {
      context += `\n${strand}:\n`;
      topicsList.forEach(t => {
        context += `- ${t.topic}: ${t.contentDescription.slice(0, 100)}...\n`;
      });
    }
  }

  return context;
}

export function buildFullCurriculumPrompt(subjectName: string, yearLevel: number): string {
  const subject = getCurriculumSubject(subjectName);
  if (!subject) return "";
  
  let prompt = `You have deep knowledge of the Australian Curriculum (ACARA v9.0) for ${subjectName} Year ${yearLevel}.\n`;
  prompt += `This is foundational knowledge you carry with you - reference this when answering questions.\n\n`;
  
  prompt += `=== ACARA CURRICULUM: ${subjectName} Year ${yearLevel} ===\n\n`;
  
  const yearLevelData = subject.yearLevels[yearLevel.toString()];
  if (!yearLevelData) {
    return prompt;
  }

  prompt += `ACHIEVEMENT STANDARD:\n${yearLevelData.achievementStandard}\n\n`;

  prompt += `STRANDS AND TOPICS:\n`;
  for (const [strand, topics] of Object.entries(yearLevelData.strands)) {
    prompt += `\n## ${strand}\n`;
    for (const t of topics) {
      prompt += `• ${t.topic}: ${t.contentDescription}\n`;
      if (t.elaborations.length > 0) {
        prompt += `  Examples: ${t.elaborations.slice(0, 2).join("; ")}\n`;
      }
    }
  }

  return prompt;
}

export function getStateCurriculumInfo(state: string | null): string {
  if (!state) return "Australian Curriculum (ACARA v9.0)";
  
  const fullNames: Record<string, string> = {
    NSW: "New South Wales",
    VIC: "Victoria", 
    QLD: "Queensland",
    WA: "Western Australia",
    SA: "South Australia",
    TAS: "Tasmania",
    NT: "Northern Territory",
    ACT: "Australian Capital Territory"
  };
  
  const fullName = fullNames[state.toUpperCase()] || state;
  const stateDoc = STATE_CURRICULUM_DOCUMENTS[state.toUpperCase()];
  
  return `${fullName}: ${stateDoc}`;
}

export function findCurriculumForQuery(subjectName: string, yearLevel: number, query: string): string {
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const matchingTopics: { topic: CurriculumTopic; relevance: number; strand: string }[] = [];
  
  const topics = getAllTopicsForSubjectAndYear(subjectName, yearLevel);
  
  for (const { strand, topic } of topics) {
    let relevance = 0;
    const topicText = (topic.topic + " " + topic.contentDescription).toLowerCase();
    
    for (const keyword of keywords) {
      if (topicText.includes(keyword)) relevance++;
      for (const el of topic.elaborations) {
        if (el.toLowerCase().includes(keyword)) relevance += 0.5;
      }
    }
    
    if (relevance > 0) {
      matchingTopics.push({ topic, relevance, strand });
    }
  }
  
  matchingTopics.sort((a, b) => b.relevance - a.relevance);
  
  if (matchingTopics.length === 0) return "";
  
  const topMatch = matchingTopics[0];
  let result = `CURRICULUM ALIGNMENT: Year ${yearLevel} ${subjectName} - ${topMatch.strand}\n`;
  result += `Topic: ${topMatch.topic.topic}\n`;
  result += `Content: ${topMatch.topic.contentDescription}\n`;
  result += `Examples: ${topMatch.topic.elaborations.slice(0, 2).join("; ")}`;
  
  return result;
}

export { ACARA_CURRICULUM, ACARA_SUBJECTS, STATE_CURRICULUM_DOCUMENTS };