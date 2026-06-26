import type { CurriculumSubject, GradeCurriculum, CurriculumStrand, CurriculumTopic } from './types.js';

export interface ChunkedCurriculumEntry {
  content: string;
  subject: string;
  grade: string;
  strand: string;
  topic: string;
  acaraCode: string;
  state: string;
  keyTerms: string[];
  chunkType: 'description' | 'elaboration' | 'strand_overview' | 'achievement_standard';
}

export function chunkCurriculum(subjects: CurriculumSubject[]): ChunkedCurriculumEntry[] {
  const chunks: ChunkedCurriculumEntry[] = [];

  for (const subject of subjects) {
    for (const grade of subject.grades) {
      for (const strand of grade.strands) {
        chunks.push({
          content: `${subject.name} Grade ${grade.grade} - ${strand.name}: ${strand.description}`,
          subject: subject.name,
          grade: String(grade.grade),
          strand: strand.name,
          topic: '',
          acaraCode: strand.id,
          state: 'NATIONAL',
          keyTerms: [],
          chunkType: 'strand_overview',
        });

        for (const topic of strand.topics) {
          chunks.push({
            content: `${subject.name} Grade ${grade.grade} > ${strand.name} > ${topic.name} (${topic.id}): ${topic.description}. Key terms: ${topic.keyTerms.join(', ')}.`,
            subject: subject.name,
            grade: String(grade.grade),
            strand: strand.name,
            topic: topic.name,
            acaraCode: topic.id,
            state: 'NATIONAL',
            keyTerms: topic.keyTerms,
            chunkType: 'description',
          });
        }
      }
    }
  }

  return chunks;
}

export function chunkCurriculumWithElaborations(
  subjects: CurriculumSubject[],
  elaborationsMap: Record<string, string[]>
): ChunkedCurriculumEntry[] {
  const chunks = chunkCurriculum(subjects);

  for (const subject of subjects) {
    for (const grade of subject.grades) {
      for (const strand of grade.strands) {
        for (const topic of strand.topics) {
          const key = `${subject.name}:${grade.grade}:${strand.name}:${topic.name}`;
          const elaborations = elaborationsMap[key];
          if (elaborations) {
            for (const elab of elaborations) {
              chunks.push({
                content: `${subject.name} Grade ${grade.grade} > ${strand.name} > ${topic.name} (${topic.id}) elaboration: ${elab}`,
                subject: subject.name,
                grade: String(grade.grade),
                strand: strand.name,
                topic: topic.name,
                acaraCode: topic.id,
                state: 'NATIONAL',
                keyTerms: topic.keyTerms,
                chunkType: 'elaboration',
              });
            }
          }
        }
      }
    }
  }

  return chunks;
}
