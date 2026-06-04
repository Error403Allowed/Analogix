export interface SubjectMark {
  id: string;
  title: string;
  score: number;
  total: number;
  date: string;
}

export interface SubjectHomework {
  id: string;
  title: string;
  dueDate?: string;
  notes?: string;
  link?: string;
  completed?: boolean;
  createdAt: string;
}

export interface SubjectLink {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface AssessmentNotification {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  createdAt: string;
  studyGuide: StudyGuideWeek[];
  rawText: string;
}

export interface StudyGuideWeek {
  week: number;
  label: string;
  tasks: string[];
}

export interface SubjectNotes {
  content: string;
  lastUpdated: string;
  homework?: SubjectHomework[];
  links?: SubjectLink[];
  title?: string;
  documents?: string[];
  assessments?: AssessmentNotification[];
}

export interface SubjectData {
  id: string;
  marks: SubjectMark[];
  notes: SubjectNotes;
}

export interface CustomSubject {
  id: string;
  user_id: string;
  subject_id: string;
  custom_icon: string | null;
  custom_color: string | null;
  custom_cover: string | null;
  custom_title: string | null;
  created_at: string;
  updated_at: string;
}
