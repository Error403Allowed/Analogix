export interface CurriculumTopic {
  id: string;
  strand: string;
  topic: string;
  contentDescription: string;
  elaborations: string[];
}

export interface CurriculumYearLevel {
  year: number;
  strands: {
    [strand: string]: CurriculumTopic[];
  };
  achievementStandard: string;
}

export interface CurriculumSubject {
  subject: string;
  learningArea: string;
  yearLevels: {
    [year: string]: CurriculumYearLevel;
  };
}
