export interface CurriculumSubject {
  id: string;
  name: string;
  color: string;
  icon: string;
  grades: GradeCurriculum[];
}

export interface GradeCurriculum {
  grade: number;
  strands: CurriculumStrand[];
}

export interface CurriculumStrand {
  id: string;
  name: string;
  description: string;
  topics: CurriculumTopic[];
}

export interface CurriculumTopic {
  id: string;
  name: string;
  description: string;
  keyTerms: string[];
}
