export type BandTier = '4.5-5.5' | '6.0-6.5' | '7.0-7.5' | '8.0-8.5' | '9.0';

export type QuestionType =
  | 'tfng'
  | 'ynng'
  | 'mcq'
  | 'matching_headings'
  | 'fill_blank';

export interface Paragraph {
  id: string; // e.g., "A", "B", "C"
  text: string;
  skimTopicSentence: string; // Main idea summary in Vietnamese/English for Skimming mode
}

export interface ReadingQuestion {
  id: string;
  number: number;
  sectionNumber?: 1 | 2 | 3; // For 3-passage full IELTS tests
  type: QuestionType;
  prompt: string;
  instruction?: string;
  options?: string[]; // For mcq, matching_headings, tfng, ynng
  acceptedAnswers: string[]; // Case-insensitive accepted answers
  paragraphRef: string; // Paragraph ID e.g., "B"
  evidenceQuote: string; // Exact substring from paragraph text
  explanationVi: string; // Detailed Vietnamese explanation
  trapNoteVi: string; // Why distractors / traps happen
  scanKeywords: string[]; // Keywords to scan for in the passage
}

export interface VocabItem {
  id: string;
  word: string;
  ipa: string;
  pos: string; // n., v., adj., adv.
  bandLevel: string; // e.g., "Band 7.5+"
  meaningVi: string;
  collocations: string[];
  contextQuote: string;
  paragraphRef: string;
  sectionNumber?: 1 | 2 | 3;
}

export interface ReadingSection {
  sectionNumber: 1 | 2 | 3;
  label: string;
  bandRange: string;
  passageTitle: string;
  passageSubtitle: string;
  paragraphs: Paragraph[];
  headingsBank?: string[];
  questionRange: [number, number];
  strategyTipVi: string;
}

export interface ReadingTest {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  bandTier: BandTier;
  targetBand: number; // 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0
  recommendedMinutes: number;
  wordCount: number;
  isFullIeltsTest?: boolean;
  sections?: ReadingSection[];
  passageTitle: string;
  passageSubtitle: string;
  paragraphs: Paragraph[];
  headingsBank?: string[]; // For matching_headings questions
  questions: ReadingQuestion[];
  vocabulary: VocabItem[];
  strategyTipVi: string;
}

export interface QuestionResult {
  questionId: string;
  questionNumber: number;
  type: QuestionType;
  userAnswer: string;
  correctAnswers: string[];
  isCorrect: boolean;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  bandTier: BandTier;
  targetBand: number;
  completedAt: string; // ISO timestamp
  durationSeconds: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  estimatedBand: number;
  answers: Record<string, string>;
  results: QuestionResult[];
  isOfflineAttempt?: boolean;
}

export interface SavedVocabEntry extends VocabItem {
  testId: string;
  testTitle: string;
  savedAt: string;
  mastered: boolean;
}

export interface ReminderSettings {
  weeklyTarget: number; // Minimum 2 per week
  enabled: boolean;
  preferredDays: number[]; // 0=Sun .. 6=Sat, default [3, 6] (Wed & Sat)
  reminderTime: string; // "20:00"
  browserNotificationsEnabled: boolean;
}

export interface UserProfile {
  displayName: string;
  targetBand: number;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  targetBand: number;
  avgBand: number;
  bestBand: number;
  testsCompleted: number;
  weeklyTests: number;
  streakDays: number;
  isCurrentUser?: boolean;
  rank?: number;
}

export interface WeeklyProgress {
  completedThisWeek: number;
  weeklyTarget: number;
  remaining: number;
  isGoalMet: boolean;
  weekStartIso: string;
  weekEndIso: string;
  progressPercent: number;
}

export interface TypeBreakdown {
  type: QuestionType;
  labelVi: string;
  correct: number;
  total: number;
  accuracy: number;
}
