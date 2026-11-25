import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyProgressSeries,
  calculateDailyStreak,
  calculateEstimatedBand,
  calculateOfficial40Band,
  calculateWeeklyProgress,
  computeLeaderboard,
  extractScanTokens,
  gradeTestAttempt,
  normalizeAnswer,
} from './ieltsScoring';
import type { LeaderboardEntry, ReadingTest, TestAttempt } from '../types/ielts';
import { READING_TESTS } from '../data/readingTests';

const sampleTest: ReadingTest = {
  id: 'sample-test',
  title: 'Sample Passage',
  subtitle: 'Testing scoring logic',
  topic: 'Science',
  bandTier: '7.0-7.5',
  targetBand: 7.5,
  recommendedMinutes: 20,
  wordCount: 300,
  passageTitle: 'Urban Canopies',
  passageSubtitle: 'How trees cool dense cities',
  paragraphs: [
    {
      id: 'A',
      text: 'In 2022, Melbourne researchers measured a 4.2°C cooling effect under mature eucalyptus trees.',
      skimTopicSentence: 'Cây xanh tại Melbourne giúp giảm nhiệt độ đáng kể.',
    },
  ],
  questions: [
    {
      id: 'q1',
      number: 1,
      type: 'tfng',
      prompt: 'Researchers in Melbourne found that trees lowered temperatures.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      acceptedAnswers: ['TRUE'],
      paragraphRef: 'A',
      evidenceQuote: 'measured a 4.2°C cooling effect',
      explanationVi: 'Đoạn A nêu rõ cây giúp giảm 4.2°C.',
      trapNoteVi: 'Không nhầm sang FALSE.',
      scanKeywords: ['Melbourne', '4.2°C'],
    },
    {
      id: 'q2',
      number: 2,
      type: 'fill_blank',
      prompt: 'The cooling effect was measured under mature _____ trees.',
      acceptedAnswers: ['eucalyptus'],
      paragraphRef: 'A',
      evidenceQuote: 'under mature eucalyptus trees',
      explanationVi: 'Từ cần điền là eucalyptus.',
      trapNoteVi: 'Đúng 1 từ theo đề.',
      scanKeywords: ['mature', 'trees'],
    },
  ],
  vocabulary: [],
  strategyTipVi: 'Scan số liệu 2022 và từ khóa Melbourne.',
};

test('normalizeAnswer trims, lowercases, and strips punctuation', () => {
  assert.equal(normalizeAnswer('  Eucalyptus. '), 'eucalyptus');
  assert.equal(normalizeAnswer("City's  Plan!"), "city's plan");
});

test('calculateEstimatedBand maps scores between 4.5 and 9.0 in 0.5 steps', () => {
  assert.equal(calculateEstimatedBand(2, 2, 7.5), 8.0);
  assert.equal(calculateEstimatedBand(2, 2, 8.5), 9.0);
  assert.equal(calculateEstimatedBand(0, 2, 5.0), 4.5);
});

test('gradeTestAttempt scores mixed question types accurately', () => {
  const attempt = gradeTestAttempt(
    sampleTest,
    { q1: 'true', q2: '  Eucalyptus ' },
    420,
    { now: new Date('2026-11-24T10:00:00Z') }
  );
  assert.equal(attempt.correctCount, 2);
  assert.equal(attempt.totalQuestions, 2);
  assert.equal(attempt.accuracyPercent, 100);
  assert.equal(attempt.estimatedBand, 8.0);
  assert.equal(attempt.results[0].isCorrect, true);
  assert.equal(attempt.results[1].isCorrect, true);
});

test('calculateWeeklyProgress tracks the minimum 2 reading tests per week reminder', () => {
  const ref = new Date(2026, 10, 25, 12, 0, 0); // Wed Nov 25, 2026
  const oneAttempt: TestAttempt = {
    id: 'a1',
    testId: 't1',
    testTitle: 'Test 1',
    bandTier: '6.0-6.5',
    targetBand: 6.5,
    completedAt: new Date(2026, 10, 23, 9, 0, 0).toISOString(), // Mon Nov 23, 2026
    durationSeconds: 900,
    correctCount: 8,
    totalQuestions: 10,
    accuracyPercent: 80,
    estimatedBand: 6.5,
    answers: {},
    results: [],
  };

  const progress1 = calculateWeeklyProgress([oneAttempt], 2, ref);
  assert.equal(progress1.completedThisWeek, 1);
  assert.equal(progress1.remaining, 1);
  assert.equal(progress1.isGoalMet, false);

  const twoAttempts = [
    oneAttempt,
    { ...oneAttempt, id: 'a2', completedAt: new Date(2026, 10, 25, 10, 0, 0).toISOString() },
  ];
  const progress2 = calculateWeeklyProgress(twoAttempts, 2, ref);
  assert.equal(progress2.completedThisWeek, 2);
  assert.equal(progress2.remaining, 0);
  assert.equal(progress2.isGoalMet, true);
});

test('calculateDailyStreak counts consecutive days correctly', () => {
  const ref = new Date(2026, 10, 25, 14, 0, 0);
  const attempts: TestAttempt[] = [
    {
      id: 'a1',
      testId: 't1',
      testTitle: 'T1',
      bandTier: '6.0-6.5',
      targetBand: 6.5,
      completedAt: new Date(2026, 10, 25, 10, 0, 0).toISOString(),
      durationSeconds: 500,
      correctCount: 7,
      totalQuestions: 10,
      accuracyPercent: 70,
      estimatedBand: 6.0,
      answers: {},
      results: [],
    },
    {
      id: 'a2',
      testId: 't2',
      testTitle: 'T2',
      bandTier: '6.0-6.5',
      targetBand: 6.5,
      completedAt: new Date(2026, 10, 24, 20, 0, 0).toISOString(),
      durationSeconds: 500,
      correctCount: 8,
      totalQuestions: 10,
      accuracyPercent: 80,
      estimatedBand: 6.5,
      answers: {},
      results: [],
    },
  ];
  assert.equal(calculateDailyStreak(attempts, ref), 2);
  const series = buildDailyProgressSeries(attempts, 3, ref);
  assert.equal(series.length, 3);
  assert.equal(series[2].count, 1);
});

test('computeLeaderboard ranks user live among seeded learners', () => {
  const seeded: LeaderboardEntry[] = [
    {
      id: 'u1',
      displayName: 'Minh Anh',
      targetBand: 8.0,
      avgBand: 7.5,
      bestBand: 8.0,
      testsCompleted: 6,
      weeklyTests: 2,
      streakDays: 4,
    },
    {
      id: 'u2',
      displayName: 'Hoàng Nam',
      targetBand: 6.5,
      avgBand: 6.0,
      bestBand: 6.5,
      testsCompleted: 3,
      weeklyTests: 1,
      streakDays: 2,
    },
  ];

  const userAttempts: TestAttempt[] = [
    {
      id: 'ua1',
      testId: 't1',
      testTitle: 'T1',
      bandTier: '8.0-8.5',
      targetBand: 8.5,
      completedAt: new Date().toISOString(),
      durationSeconds: 600,
      correctCount: 10,
      totalQuestions: 10,
      accuracyPercent: 100,
      estimatedBand: 9.0,
      answers: {},
      results: [],
    },
  ];

  const ranked = computeLeaderboard(seeded, userAttempts, {
    displayName: 'Bảo',
    targetBand: 8.5,
  });

  assert.equal(ranked[0].isCurrentUser, true);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[0].avgBand, 9.0);
});

test('extractScanTokens finds years, numbers, and proper nouns', () => {
  const tokens = extractScanTokens(
    'In 2022, researchers in Melbourne recorded a 4.2% temperature drop near Kyoto.'
  );
  assert.ok(tokens.includes('2022'));
  assert.ok(tokens.includes('4.2%'));
  assert.ok(tokens.includes('Melbourne'));
  assert.ok(tokens.includes('Kyoto'));
});

test('calculateOfficial40Band follows official IELTS Academic 40-question band scale', () => {
  assert.equal(calculateOfficial40Band(40), 9.0);
  assert.equal(calculateOfficial40Band(39), 9.0);
  assert.equal(calculateOfficial40Band(37), 8.5);
  assert.equal(calculateOfficial40Band(35), 8.0);
  assert.equal(calculateOfficial40Band(33), 7.5);
  assert.equal(calculateOfficial40Band(30), 7.0);
  assert.equal(calculateOfficial40Band(27), 6.5);
  assert.equal(calculateOfficial40Band(23), 6.0);
  assert.equal(calculateOfficial40Band(19), 5.5);
  assert.equal(calculateOfficial40Band(15), 5.0);
  assert.equal(calculateOfficial40Band(13), 4.5);
  assert.equal(calculateOfficial40Band(10), 4.0);
});

test('READING_TESTS includes 12 assignments + 1 Full 3-passage 40-question IELTS test with valid verbatim quotes', () => {
  assert.equal(READING_TESTS.length, 13);
  const fullTests = READING_TESTS.filter((t) => t.isFullIeltsTest);
  assert.equal(fullTests.length, 1);

  const fullMock = fullTests[0];
  assert.equal(fullMock.recommendedMinutes, 60);
  assert.equal(fullMock.sections?.length, 3);
  assert.equal(fullMock.questions.length, 40);

  const bands = READING_TESTS.map((t) => t.targetBand);
  assert.equal(Math.min(...bands), 4.5);
  assert.equal(Math.max(...bands), 9.0);

  for (const t of READING_TESTS) {
    for (const q of t.questions) {
      const targetParagraphs =
        t.isFullIeltsTest && t.sections
          ? t.sections.find((s) => s.sectionNumber === q.sectionNumber)?.paragraphs ?? []
          : t.paragraphs;
      const para = targetParagraphs.find((p) => p.id === q.paragraphRef);
      assert.ok(para, `Missing paragraph ${q.paragraphRef} (section ${q.sectionNumber ?? 1}) in ${t.id}`);
      assert.ok(
        para.text.includes(q.evidenceQuote),
        `Evidence quote mismatch in ${t.id} Q${q.number}: "${q.evidenceQuote}"`
      );
      assert.ok(q.acceptedAnswers.length > 0, `Missing answer in ${t.id} Q${q.number}`);
    }
    for (const v of t.vocabulary) {
      const targetParagraphs =
        t.isFullIeltsTest && t.sections
          ? t.sections.find((s) => s.sectionNumber === v.sectionNumber)?.paragraphs ?? []
          : t.paragraphs;
      const para = targetParagraphs.find((p) => p.id === v.paragraphRef);
      assert.ok(para, `Missing vocab paragraph ${v.paragraphRef} (section ${v.sectionNumber ?? 1}) in ${t.id}`);
      assert.ok(
        para.text.includes(v.contextQuote),
        `Vocab context mismatch in ${t.id} (${v.word}): "${v.contextQuote}"`
      );
    }
  }

  // Grade a 35/40 submission on the Full IELTS Mock Test -> Band 8.0
  const answers35: Record<string, string> = {};
  fullMock.questions.slice(0, 35).forEach((q) => {
    answers35[q.id] = q.acceptedAnswers[0];
  });
  const attempt = gradeTestAttempt(fullMock, answers35, 2800);
  assert.equal(attempt.correctCount, 35);
  assert.equal(attempt.totalQuestions, 40);
  assert.equal(attempt.estimatedBand, 8.0);
});

