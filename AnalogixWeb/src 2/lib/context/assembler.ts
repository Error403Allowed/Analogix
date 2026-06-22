import type { RetrievedEntity, WorkspaceContext, UserPreferences } from '@/types/workspace';
import type { MemoryContext } from '@/types/memory';

export interface ContextAssemblyConfig {
  maxSystemTokens: number;
  maxContextTokens: number;
  priorityOrder: ContextPriority[];
  includeSections: ContextSectionType[];
}

export type ContextSectionType = 'system' | 'workspace' | 'memory' | 'curriculum' | 'calendar' | 'personality';

export interface ContextPriority {
  section: ContextSectionType;
  priority: number;
  maxTokens: number;
}

export interface ContextSection {
  type: ContextSectionType;
  content: string;
  tokens: number;
  priority: number;
}

export interface AssembledContext {
  sections: ContextSection[];
  totalTokens: number;
  systemPrompt: string;
  workspaceContext: string;
}

const DEFAULT_CONFIG: ContextAssemblyConfig = {
  maxSystemTokens: 800,
  maxContextTokens: 3200,
  priorityOrder: [
    { section: 'system', priority: 1, maxTokens: 400 },
    { section: 'workspace', priority: 2, maxTokens: 1500 },
    { section: 'memory', priority: 3, maxTokens: 500 },
    { section: 'curriculum', priority: 4, maxTokens: 400 },
    { section: 'calendar', priority: 5, maxTokens: 200 },
    { section: 'personality', priority: 6, maxTokens: 200 },
  ],
  includeSections: ['system', 'workspace', 'memory', 'calendar'],
};

const TOKEN_ESTIMATE = 4;

export class ContextAssembler {
  private config: ContextAssemblyConfig;

  constructor(config?: Partial<ContextAssemblyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  assemble(
    entities: RetrievedEntity[],
    workspaceContext: WorkspaceContext,
    memoryContext: MemoryContext,
    personality?: UserPreferences
  ): AssembledContext {
    const sections: ContextSection[] = [];
    let totalTokens = 0;

    for (const priority of this.config.priorityOrder) {
      if (!this.config.includeSections.includes(priority.section)) continue;
      if (totalTokens >= this.config.maxContextTokens) break;

      const sectionContent = this.buildSection(
        priority.section,
        entities,
        workspaceContext,
        memoryContext,
        personality
      );

      if (!sectionContent) continue;

      const sectionTokens = Math.ceil(sectionContent.length / TOKEN_ESTIMATE);
      const allowedTokens = Math.min(priority.maxTokens, this.config.maxContextTokens - totalTokens);

      if (sectionTokens <= allowedTokens) {
        sections.push({
          type: priority.section,
          content: sectionContent,
          tokens: sectionTokens,
          priority: priority.priority,
        });
        totalTokens += sectionTokens;
      } else {
        const truncated = this.truncateContent(sectionContent, allowedTokens);
        sections.push({
          type: priority.section,
          content: truncated,
          tokens: allowedTokens,
          priority: priority.priority,
        });
        totalTokens += allowedTokens;
      }
    }

    return {
      sections,
      totalTokens,
      systemPrompt: this.buildSystemPrompt(sections),
      workspaceContext: this.buildWorkspaceContext(sections),
    };
  }

  private buildSection(
    type: ContextSectionType,
    entities: RetrievedEntity[],
    workspace: WorkspaceContext,
    memory: MemoryContext,
    personality?: UserPreferences
  ): string | null {
    switch (type) {
      case 'system':
        return this.buildSystemSection(workspace, personality);
      case 'workspace':
        return this.buildWorkspaceSection(entities);
      case 'memory':
        return this.buildMemorySection(memory);
      case 'curriculum':
        return this.buildCurriculumSection(workspace);
      case 'calendar':
        return this.buildCalendarSection(workspace);
      case 'personality':
        return personality ? this.buildPersonalitySection(personality) : null;
      default:
        return null;
    }
  }

  private buildSystemSection(workspace: WorkspaceContext, personality?: UserPreferences): string {
    const parts: string[] = [
      'You are "Analogix AI", an AI tutor for Australian students.',
      `Grade: ${workspace.preferences.grade}`,
    ];

    if (workspace.preferences.state) {
      parts.push(`State: ${workspace.preferences.state}`);
    }

    if (workspace.subjects.length > 0) {
      parts.push(`Subjects: ${workspace.subjects.map(s => s.name).join(', ')}`);
    }

    if (personality) {
      const analogyLevel = personality.analogy_intensity;
      if (analogyLevel === 0) {
        parts.push('Mode: School/Assessment — formal, precise, no analogies.');
      } else if (analogyLevel >= 3) {
        parts.push('Learning Mode: Use analogies frequently to explain concepts.');
      }
    }

    return parts.join('\n');
  }

  private buildWorkspaceSection(entities: RetrievedEntity[]): string {
    const docs = entities.filter(e => e.entity.entity_type === 'document');
    const flashcards = entities.filter(e => e.entity.entity_type === 'flashcard_set');
    const quizzes = entities.filter(e => e.entity.entity_type === 'quiz');
    const formulas = entities.filter(e => e.entity.entity_type === 'formula');

    const parts: string[] = ['━━━ YOUR WORKSPACE ━━━'];

    if (docs.length > 0) {
      parts.push('\nDocuments:');
      docs.slice(0, 5).forEach(d => {
        const title = d.entity.metadata?.title || 'Untitled';
        parts.push(`  • ${title}`);
      });
    }

    if (flashcards.length > 0) {
      parts.push('\nFlashcard Sets:');
      flashcards.slice(0, 3).forEach(f => {
        const title = f.entity.metadata?.title || 'Flashcards';
        parts.push(`  • ${title}`);
      });
    }

    if (quizzes.length > 0) {
      parts.push('\nQuizzes:');
      quizzes.slice(0, 3).forEach(q => {
        const title = q.entity.metadata?.title || 'Quiz';
        parts.push(`  • ${title}`);
      });
    }

    if (formulas.length > 0) {
      parts.push('\nFormulas:');
      formulas.slice(0, 3).forEach(f => {
        const title = f.entity.metadata?.title || 'Formula';
        parts.push(`  • ${title}`);
      });
    }

    parts.push('\n━━━ END WORKSPACE ━━━');
    return parts.join('\n');
  }

  private buildMemorySection(memory: MemoryContext): string {
    const parts: string[] = ['━━━ MEMORY ━━━'];

    if (memory.facts.length > 0) {
      parts.push(`Facts: ${memory.facts.slice(0, 3).join(' | ')}`);
    }

    if (memory.preferences.length > 0) {
      parts.push(`Preferences: ${memory.preferences.slice(0, 3).join(' | ')}`);
    }

    if (memory.weak_areas.length > 0) {
      parts.push(`Weak areas: ${memory.weak_areas.slice(0, 3).join(', ')}`);
    }

    if (memory.strengths.length > 0) {
      parts.push(`Strengths: ${memory.strengths.slice(0, 3).join(', ')}`);
    }

    parts.push('━━━ END MEMORY ━━━');
    return parts.join('\n');
  }

  private buildCurriculumSection(workspace: WorkspaceContext): string {
    if (workspace.subjects.length === 0) return '';

    const parts: string[] = ['━━━ CURRICULUM ━━━'];
    
    const relevantSubject = workspace.subjects[0];
    if (relevantSubject.grade) {
      parts.push(`Year ${relevantSubject.grade} ${relevantSubject.name}`);
    }

    parts.push('━━━ END CURRICULUM ━━━');
    return parts.join('\n');
  }

  private buildCalendarSection(workspace: WorkspaceContext): string {
    if (workspace.calendar_events.length === 0) return '';

    const formatDateTime = (isoString: string | undefined | null) => {
      if (!isoString) return null;
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return null;
      const datePart = date.toLocaleDateString('en-AU', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      });
      const timePart = date.toLocaleTimeString('en-AU', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
      return `${datePart} at ${timePart}`;
    };

    const timeOnly = (isoString: string | undefined | null) => {
      if (!isoString) return null;
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleTimeString('en-AU', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    };

    const parts: string[] = ['━━━ CALENDAR & DEADLINES ━━━'];
    
    const upcoming = [...workspace.calendar_events]
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 5);

    upcoming.forEach(e => {
      const start = formatDateTime(e.start_date);
      const end = formatDateTime(e.end_date);
      const subject = e.subject ? ` [${e.subject}]` : '';
      const typeLabel = e.type ? `${e.type.charAt(0).toUpperCase()}${e.type.slice(1)}` : 'Event';
      const timeLabel = start ? (end ? ` from ${start} to ${end}` : ` at ${timeOnly(e.start_date) || start}`) : '';
      parts.push(`• ${typeLabel}: "${e.title}"${subject}${timeLabel}`);
    });

    parts.push('━━━ END CALENDAR ━━━');
    return parts.join('\n');
  }

  private buildPersonalitySection(personality: UserPreferences): string {
    const parts: string[] = ['━━━ PERSONALITY SETTINGS ━━━'];

    const detailMap = { brief: 100, moderate: 200, detailed: 400 };
    parts.push(`Response length: ${detailMap[personality.response_length] || 200} words max.`);

    parts.push('━━━ END PERSONALITY ━━━');
    return parts.join('\n');
  }

  private truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * TOKEN_ESTIMATE;
    if (content.length <= maxChars) return content;
    
    const truncated = content.slice(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    const lastPeriod = truncated.lastIndexOf('. ');
    
    const cutPoint = Math.max(lastNewline, lastPeriod);
    if (cutPoint > maxChars * 0.5) {
      return truncated.slice(0, cutPoint + 1) + '\n[truncated]';
    }
    
    return truncated + '…\n[truncated]';
  }

  private buildSystemPrompt(sections: ContextSection[]): string {
    const systemSection = sections.find(s => s.type === 'system');
    return systemSection?.content || '';
  }

  private buildWorkspaceContext(sections: ContextSection[]): string {
    const relevantSections = sections
      .filter(s => s.type !== 'system')
      .map(s => s.content)
      .join('\n\n');
    
    return relevantSections;
  }
}

export function createContextAssembler(config?: Partial<ContextAssemblyConfig>): ContextAssembler {
  return new ContextAssembler(config);
}