"use client";

export interface SubjectMark {
  id: string;
  title: string;
  score: number;
  total: number;
  date: string;
}

export interface SubjectNotes {
  content: string;
  lastUpdated: string;
}

export interface SubjectData {
  id: string;
  marks: SubjectMark[];
  notes: SubjectNotes;
}

const STORAGE_KEY = "analogix-subject-data";

export const subjectStore = {
  getAll: (): Record<string, SubjectData> => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  },

  getSubject: (subjectId: string): SubjectData => {
    const all = subjectStore.getAll();
    return all[subjectId] || { id: subjectId, marks: [], notes: { content: "", lastUpdated: new Date().toISOString() } };
  },

  saveSubject: (subjectId: string, data: Partial<SubjectData>) => {
    const all = subjectStore.getAll();
    const current = subjectStore.getSubject(subjectId);
    all[subjectId] = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("subjectDataUpdated"));
  },

  addMark: (subjectId: string, mark: Omit<SubjectMark, 'id'>) => {
    const current = subjectStore.getSubject(subjectId);
    const newMark = { ...mark, id: Math.random().toString(36).substr(2, 9) };
    subjectStore.saveSubject(subjectId, { marks: [...current.marks, newMark] });
  },

  updateNotes: (subjectId: string, content: string) => {
    subjectStore.saveSubject(subjectId, { 
      notes: { content, lastUpdated: new Date().toISOString() } 
    });
  }
};
