import type {
  LeaderboardEntry,
  QuestionResult,
  QuestionType,
  ReadingTest,
  TestAttempt,
  TypeBreakdown,
  UserProfile,
  WeeklyProgress,
} from '../types/ielts';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  tfng: 'True / False / Not Given',
  ynng: 'Yes / No / Not Given',
  mcq: 'Trắc nghiệm (Multiple Choice)',
  matching_headings: 'Nối tiêu đề (Matching Headings)',
  fill_blank: 'Điền từ (Completion)',
};

export function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()]/g, '')
    .replace(/\s+/g, ' ');
}

export function roundToHalfBand(score: number): number {
  const clamped = Math.max(4.0, Math.min(9.0, score));
  return Math.round(clamped * 2) / 2;
}

/**
 * Computes an IELTS Reading Band (4.5 - 9.0) calibrated to passage difficulty
 * and accuracy percentage.
 */
export function calculateEstimatedBand(
  correctCount: number,
  totalQuestions: number,
  targetBand: number
): number {
  if (totalQuestions <= 0) return 4.5;
  const ratio = Math.max(0, Math.min(1, correctCount / totalQuestions));

  // If 100% accurate on a passage, award max(targetBand, 8.5+) or 9.0 for high-tier
  if (ratio >= 0.99) {
    return roundToHalfBand(Math.max(targetBand + 0.5, targetBand >= 8.0 ? 9.0 : targetBand + 0.5));
  }

  // Baseline floor starts at 4.0; scales smoothly up to targetBand + 0.5
  const ceiling = Math.min(9.0, targetBand + 0.5);
  const floor = Math.max(4.0, targetBand - 2.5);
  const rawBand = floor + Math.pow(ratio, 0.9) * (ceiling - floor);
  return roundToHalfBand(Math.max(4.5, rawBand));
}

/**
 * Official IELTS Academic Reading 40-question raw score to Band conversion table.
 */
export function calculateOfficial40Band(correctCount: number): number {
  const c = Math.max(0, Math.min(40, Math.round(correctCount)));
  if (c >= 39) return 9.0;
  if (c >= 37) return 8.5;
  if (c >= 35) return 8.0;
  if (c >= 33) return 7.5;
  if (c >= 30) return 7.0;
  if (c >= 27) return 6.5;
  if (c >= 23) return 6.0;
  if (c >= 19) return 5.5;
  if (c >= 15) return 5.0;
  if (c >= 13) return 4.5;
  return 4.0;
}

export function gradeTestAttempt(
  test: ReadingTest,
  answers: Record<string, string>,
  durationSeconds: number,
  options?: { isOfflineAttempt?: boolean; now?: Date }
): TestAttempt {
  const results: QuestionResult[] = test.questions.map((q) => {
    const userAnswer = (answers[q.id] ?? '').trim();
    const normalizedUser = normalizeAnswer(userAnswer);
    const isCorrect =
      normalizedUser.length > 0 &&
      q.acceptedAnswers.some((acc) => normalizeAnswer(acc) === normalizedUser);

    return {
      questionId: q.id,
      questionNumber: q.number,
      type: q.type,
      userAnswer,
      correctAnswers: q.acceptedAnswers,
      isCorrect,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalQuestions = test.questions.length;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const estimatedBand = test.isFullIeltsTest
    ? calculateOfficial40Band(correctCount)
    : calculateEstimatedBand(correctCount, totalQuestions, test.targetBand);
  const timestamp = (options?.now ?? new Date()).toISOString();

  return {
    id: `attempt_${test.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    testId: test.id,
    testTitle: test.title,
    bandTier: test.bandTier,
    targetBand: test.targetBand,
    completedAt: timestamp,
    durationSeconds: Math.max(1, Math.round(durationSeconds)),
    correctCount,
    totalQuestions,
    accuracyPercent,
    estimatedBand,
    answers: { ...answers },
    results,
    isOfflineAttempt: Boolean(options?.isOfflineAttempt),
  };
}

export function getTypeBreakdown(attempts: TestAttempt[]): TypeBreakdown[] {
  const map = new Map<QuestionType, { correct: number; total: number }>();

  for (const attempt of attempts) {
    for (const res of attempt.results) {
      const current = map.get(res.type) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (res.isCorrect) current.correct += 1;
      map.set(res.type, current);
    }
  }

  return Array.from(map.entries()).map(([type, stats]) => ({
    type,
    labelVi: QUESTION_TYPE_LABELS[type],
    correct: stats.correct,
    total: stats.total,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));
}

/**
 * Returns local calendar YYYY-MM-DD key for a Date.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes Monday 00:00:00 and Sunday 23:59:59 of the week containing `refDate`.
 */
export function getWeekBounds(refDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(refDate);
  const day = start.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function calculateWeeklyProgress(
  attempts: TestAttempt[],
  weeklyTarget: number = 2,
  refDate: Date = new Date()
): WeeklyProgress {
  const safeTarget = Math.max(2, weeklyTarget);
  const { start, end } = getWeekBounds(refDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  const completedThisWeek = attempts.filter((a) => {
    const t = new Date(a.completedAt).getTime();
    return t >= startMs && t <= endMs;
  }).length;

  const remaining = Math.max(0, safeTarget - completedThisWeek);
  const progressPercent = Math.min(100, Math.round((completedThisWeek / safeTarget) * 100));

  return {
    completedThisWeek,
    weeklyTarget: safeTarget,
    remaining,
    isGoalMet: completedThisWeek >= safeTarget,
    weekStartIso: start.toISOString(),
    weekEndIso: end.toISOString(),
    progressPercent,
  };
}

export function calculateDailyStreak(
  attempts: TestAttempt[],
  refDate: Date = new Date()
): number {
  if (attempts.length === 0) return 0;

  const daysWithAttempts = new Set(
    attempts.map((a) => toDateKey(new Date(a.completedAt)))
  );

  const cursor = new Date(refDate);
  cursor.setHours(0, 0, 0, 0);

  // If user hasn't done a test today yet, check if they had one yesterday to preserve active streak
  if (!daysWithAttempts.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daysWithAttempts.has(toDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (daysWithAttempts.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function buildDailyProgressSeries(
  attempts: TestAttempt[],
  days: number = 7,
  refDate: Date = new Date()
): Array<{ dateKey: string; label: string; count: number; avgBand: number | null }> {
  const result: Array<{
    dateKey: string;
    label: string;
    count: number;
    avgBand: number | null;
  }> = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    const key = toDateKey(d);
    const dayAttempts = attempts.filter((a) => toDateKey(new Date(a.completedAt)) === key);
    const avgBand =
      dayAttempts.length > 0
        ? roundToHalfBand(
            dayAttempts.reduce((acc, item) => acc + item.estimatedBand, 0) /
              dayAttempts.length
          )
        : null;

    result.push({
      dateKey: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: dayAttempts.length,
      avgBand,
    });
  }

  return result;
}

export function computeLeaderboard(
  seeded: LeaderboardEntry[],
  attempts: TestAttempt[],
  profile: UserProfile,
  refDate: Date = new Date()
): LeaderboardEntry[] {
  const weekly = calculateWeeklyProgress(attempts, 2, refDate);
  const streak = calculateDailyStreak(attempts, refDate);

  const avgBand =
    attempts.length > 0
      ? Math.round(
          (attempts.reduce((sum, a) => sum + a.estimatedBand, 0) / attempts.length) * 10
        ) / 10
      : 0;
  const bestBand =
    attempts.length > 0
      ? Math.max(...attempts.map((a) => a.estimatedBand))
      : 0;

  const userEntry: LeaderboardEntry = {
    id: 'current_user',
    displayName: profile.displayName.trim() || 'Bạn (Học viên)',
    targetBand: profile.targetBand,
    avgBand,
    bestBand,
    testsCompleted: attempts.length,
    weeklyTests: weekly.completedThisWeek,
    streakDays: streak,
    isCurrentUser: true,
  };

  const combined = [...seeded, userEntry].sort((a, b) => {
    if (b.avgBand !== a.avgBand) return b.avgBand - a.avgBand;
    if (b.bestBand !== a.bestBand) return b.bestBand - a.bestBand;
    if (b.testsCompleted !== a.testsCompleted) return b.testsCompleted - a.testsCompleted;
    return b.streakDays - a.streakDays;
  });

  return combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export const SKIM_SIGNPOST_WORDS = [
  'however',
  'nevertheless',
  'consequently',
  'therefore',
  'in contrast',
  'on the other hand',
  'furthermore',
  'moreover',
  'importantly',
  'researchers found',
  'according to',
  'as a result',
  'despite',
  'although',
  'significantly',
];

/**
 * Extracts scan-friendly tokens (years, numbers/percentages, capitalized proper nouns)
 * from a paragraph for the interactive Scan Strategy coach.
 */
export function extractScanTokens(text: string): string[] {
  const tokens = new Set<string>();
  const numberMatches = text.match(/\b\d+(?:[.,]\d+)?%?(?!\w)/g) ?? [];
  for (const m of numberMatches) {
    tokens.add(m);
  }
  // Proper nouns / acronyms mid-sentence (words starting with uppercase not at sentence start)
  const properMatches = text.match(/(?<=[a-z,;]\s)[A-Z][a-zA-Z-]{2,}/g) ?? [];
  for (const m of properMatches) {
    tokens.add(m);
  }
  return Array.from(tokens);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
