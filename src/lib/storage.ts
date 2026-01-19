export interface StudentProfile {
  yearLevel: string;
  state: string;
  subjects: string[];
  interests: string[];
  onboardingComplete: boolean;
}

export interface LearningStats {
  totalSessions: number;
  totalQuestions: number;
  questionsToday: number;
  streakDays: number;
  lastActiveDate: string;
  subjectBreakdown: Record<string, number>;
  weeklyActivity: number[];
}

const STORAGE_KEY = 'Analogix_profile';
const STATS_KEY = 'Analogix_stats';

export const getStudentProfile = (): StudentProfile | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const saveStudentProfile = (profile: StudentProfile): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const clearStudentProfile = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getLearningStats = (): LearningStats => {
  const stored = localStorage.getItem(STATS_KEY);
  const defaultStats: LearningStats = {
    totalSessions: 0,
    totalQuestions: 0,
    questionsToday: 0,
    streakDays: 0,
    lastActiveDate: '',
    subjectBreakdown: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  };
  
  if (!stored) return defaultStats;
  try {
    return { ...defaultStats, ...JSON.parse(stored) };
  } catch {
    return defaultStats;
  }
};

export const updateLearningStats = (subject?: string): void => {
  const stats = getLearningStats();
  const today = new Date().toDateString();
  const dayOfWeek = new Date().getDay();
  
  // Update streak
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastActiveDate === yesterday.toDateString()) {
      stats.streakDays += 1;
    } else if (stats.lastActiveDate !== today) {
      stats.streakDays = 1;
    }
    stats.questionsToday = 0;
    stats.totalSessions += 1;
  }
  
  stats.totalQuestions += 1;
  stats.questionsToday += 1;
  stats.lastActiveDate = today;
  stats.weeklyActivity[dayOfWeek] = (stats.weeklyActivity[dayOfWeek] || 0) + 1;
  
  if (subject) {
    stats.subjectBreakdown[subject] = (stats.subjectBreakdown[subject] || 0) + 1;
  }
  
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const incrementSession = (): void => {
  const stats = getLearningStats();
  stats.totalSessions += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const YEAR_LEVELS = [
  'Year 7',
  'Year 8', 
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
];

export const STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export const SUBJECTS = [
  { value: 'mathematics', label: 'Mathematics', icon: '📐' },
  { value: 'physics', label: 'Physics', icon: '⚛️' },
  { value: 'chemistry', label: 'Chemistry', icon: '🧪' },
  { value: 'biology', label: 'Biology', icon: '🧬' },
  { value: 'english', label: 'English', icon: '📚' },
  { value: 'history', label: 'History', icon: '🏛️' },
  { value: 'geography', label: 'Geography', icon: '🌏' },
  { value: 'pdhpe', label: 'PDHPE', icon: '🏃' },
  { value: 'digital-tech', label: 'Digital Technologies', icon: '💻' },
  { value: 'economics', label: 'Economics', icon: '📊' },
];

export const INTERESTS = [
  { value: 'cricket', label: 'Cricket', category: 'Sports' },
  { value: 'afl', label: 'AFL', category: 'Sports' },
  { value: 'soccer', label: 'Soccer', category: 'Sports' },
  { value: 'Formula 1', label: 'Formula 1', category: 'Sports' },
  { value: 'basketball', label: 'Basketball', category: 'Sports' },
  { value: 'minecraft', label: 'Minecraft', category: 'Games' },
  { value: 'roblox', label: 'Roblox', category: 'Games' },
  { value: 'fortnite', label: 'Fortnite', category: 'Games' },
  { value: 'chess', label: 'Chess', category: 'Games' },
  { value: 'movies', label: 'Movies', category: 'Entertainment' },
  { value: 'anime', label: 'Anime', category: 'Entertainment' },
  { value: 'music', label: 'Music', category: 'Entertainment' },
  { value: 'coding', label: 'Coding', category: 'Technology' },
  { value: 'gadgets', label: 'Gadgets', category: 'Technology' },
  { value: 'space', label: 'Space', category: 'Exploration' },
  { value: 'cars', label: 'Cars', category: 'Vehicles' },
  { value: 'cooking', label: 'Cooking', category: 'Hobbies' },
  { value: 'art', label: 'Art & Design', category: 'Creative' },
];