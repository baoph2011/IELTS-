import { useEffect, useMemo, useState } from 'react';
import { READING_TESTS } from './data/readingTests';
import { SEED_LEADERBOARD } from './data/seedLeaderboard';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type {
  ReadingTest,
  ReminderSettings,
  SavedVocabEntry,
  TestAttempt,
  UserProfile,
  VocabItem,
} from './types/ielts';
import {
  calculateDailyStreak,
  calculateWeeklyProgress,
  computeLeaderboard,
  gradeTestAttempt,
} from './utils/ieltsScoring';
import {
  type OfflineTestRecord,
  exportOfflineWorksheet,
  getOfflineTests,
  loadAttempts,
  loadOfflineSimulation,
  loadReminderSettings,
  loadSavedVocab,
  loadUserProfile,
  removeOfflineTest,
  saveAttempts,
  saveOfflineBatch,
  saveOfflineSimulation,
  saveOfflineTest,
  saveReminderSettings,
  saveSavedVocab,
  saveUserProfile,
} from './utils/offlineStorage';
import { TopNav, type AppTab } from './components/TopNav';
import { LibraryView } from './components/LibraryView';
import { ReadingWorkspace } from './components/ReadingWorkspace';
import { ProgressHistoryView } from './components/ProgressHistoryView';
import { LeaderboardView } from './components/LeaderboardView';
import { SkimScanLabView } from './components/SkimScanLabView';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<AppTab>('library');
  const [activeTest, setActiveTest] = useState<ReadingTest | null>(null);
  const [reviewAttempt, setReviewAttempt] = useState<TestAttempt | null>(null);

  const [attempts, setAttempts] = useState<TestAttempt[]>(() => loadAttempts());
  const [savedVocab, setSavedVocab] = useState<SavedVocabEntry[]>(() => loadSavedVocab());
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() =>
    loadReminderSettings()
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [offlineRecords, setOfflineRecords] = useState<OfflineTestRecord[]>([]);
  const [offlineSimulation, setOfflineSimulation] = useState<boolean>(() =>
    loadOfflineSimulation()
  );
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);

  useEffect(() => {
    void getOfflineTests().then(setOfflineRecords);
  }, []);

  // Optional ?autostart=1 support for direct workspace launch
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !activeTest) {
      setActiveTest(READING_TESTS[0]);
      setReviewAttempt(null);
    }
  }, []);

  const isOfflineActive = !isOnline || offlineSimulation;

  const offlineIds = useMemo(
    () => new Set(offlineRecords.map((r) => r.id)),
    [offlineRecords]
  );

  // When offline, serve tests directly from the IndexedDB offline cache
  const availableTests = useMemo(() => {
    if (isOfflineActive) {
      return offlineRecords.map((r) => r.test);
    }
    return READING_TESTS;
  }, [isOfflineActive, offlineRecords]);

  const savedVocabIds = useMemo(
    () => new Set(savedVocab.map((v) => v.id)),
    [savedVocab]
  );

  const weeklyProgress = useMemo(
    () => calculateWeeklyProgress(attempts, reminderSettings.weeklyTarget),
    [attempts, reminderSettings.weeklyTarget]
  );

  const streakDays = useMemo(() => calculateDailyStreak(attempts), [attempts]);

  const leaderboardEntries = useMemo(
    () => computeLeaderboard(SEED_LEADERBOARD, attempts, userProfile),
    [attempts, userProfile]
  );

  const allVocabPool = useMemo(
    () => READING_TESTS.flatMap((t) => t.vocabulary),
    []
  );

  const handleStartTest = (test: ReadingTest) => {
    setActiveTest(test);
    setReviewAttempt(null);
    window.scrollTo(0, 0);
  };

  const handleReviewAttempt = (attempt: TestAttempt) => {
    const found =
      READING_TESTS.find((t) => t.id === attempt.testId) ??
      offlineRecords.find((r) => r.id === attempt.testId)?.test;
    if (!found) return;
    setActiveTest(found);
    setReviewAttempt(attempt);
    window.scrollTo(0, 0);
  };

  const handleSubmitAttempt = (
    answers: Record<string, string>,
    durationSeconds: number
  ): TestAttempt => {
    if (!activeTest) {
      throw new Error('No active test');
    }
    const graded = gradeTestAttempt(activeTest, answers, durationSeconds, {
      isOfflineAttempt: isOfflineActive,
    });
    const next = [graded, ...attempts];
    setAttempts(next);
    saveAttempts(next);
    return graded;
  };

  const handleToggleSaveVocab = (item: VocabItem, test: ReadingTest) => {
    const exists = savedVocab.some((v) => v.id === item.id);
    const next = exists
      ? savedVocab.filter((v) => v.id !== item.id)
      : [
          {
            ...item,
            testId: test.id,
            testTitle: test.title,
            savedAt: new Date().toISOString(),
            mastered: false,
          },
          ...savedVocab,
        ];
    setSavedVocab(next);
    saveSavedVocab(next);
  };

  const handleToggleMasteredVocab = (vocabId: string) => {
    const next = savedVocab.map((v) =>
      v.id === vocabId ? { ...v, mastered: !v.mastered } : v
    );
    setSavedVocab(next);
    saveSavedVocab(next);
  };

  const handleRemoveVocab = (vocabId: string) => {
    const next = savedVocab.filter((v) => v.id !== vocabId);
    setSavedVocab(next);
    saveSavedVocab(next);
  };

  const handleSeedSampleVocab = () => {
    const existingIds = new Set(savedVocab.map((v) => v.id));
    const samples: SavedVocabEntry[] = [];
    for (const test of READING_TESTS) {
      for (const item of test.vocabulary.slice(0, 1)) {
        if (!existingIds.has(item.id) && samples.length < 6) {
          samples.push({
            ...item,
            testId: test.id,
            testTitle: test.title,
            savedAt: new Date().toISOString(),
            mastered: false,
          });
        }
      }
    }
    const next = [...samples, ...savedVocab];
    setSavedVocab(next);
    saveSavedVocab(next);
  };

  const handleToggleOfflineTest = async (test: ReadingTest) => {
    if (offlineIds.has(test.id)) {
      const updated = await removeOfflineTest(test.id);
      setOfflineRecords(updated);
    } else {
      const updated = await saveOfflineTest(test);
      setOfflineRecords(updated);
    }
  };

  const handleDownloadAllOffline = async () => {
    const updated = await saveOfflineBatch(READING_TESTS);
    setOfflineRecords(updated);
  };

  const handleRemoveOffline = async (testId: string) => {
    const updated = await removeOfflineTest(testId);
    setOfflineRecords(updated);
  };

  const handleToggleOfflineSimulation = () => {
    const next = !offlineSimulation;
    setOfflineSimulation(next);
    saveOfflineSimulation(next);
  };

  const handleUpdateReminderSettings = (next: ReminderSettings) => {
    setReminderSettings(next);
    saveReminderSettings(next);
  };

  const handleUpdateProfile = (next: UserProfile) => {
    setUserProfile(next);
    saveUserProfile(next);
  };

  const handleSelectTab = (tab: AppTab) => {
    setActiveTest(null);
    setReviewAttempt(null);
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenOfflineModal={() => setOfflineModalOpen(true)}
        offlineCount={offlineRecords.length}
        isOfflineActive={isOfflineActive}
      />

      <div className="flex-1">
        {activeTest ? (
          <ReadingWorkspace
            test={activeTest}
            initialAttempt={reviewAttempt}
            savedVocabIds={savedVocabIds}
            isOfflineActive={isOfflineActive}
            onBack={() => {
              setActiveTest(null);
              setReviewAttempt(null);
            }}
            onSubmitAttempt={handleSubmitAttempt}
            onToggleSaveVocab={handleToggleSaveVocab}
            onExportWorksheet={exportOfflineWorksheet}
            onOpenVocabPractice={() => {
              setActiveTest(null);
              setReviewAttempt(null);
              setActiveTab('progress');
              window.scrollTo(0, 0);
            }}
          />
        ) : activeTab === 'library' ? (
          <LibraryView
            tests={availableTests}
            attempts={attempts}
            offlineIds={offlineIds}
            weeklyProgress={weeklyProgress}
            streakDays={streakDays}
            isOfflineActive={isOfflineActive}
            onStartTest={handleStartTest}
            onReviewAttempt={handleReviewAttempt}
            onToggleOfflineTest={handleToggleOfflineTest}
            onDownloadAllOffline={handleDownloadAllOffline}
            onExportWorksheet={exportOfflineWorksheet}
            onOpenWeeklySettings={() => {
              setActiveTab('progress');
              window.scrollTo(0, 0);
            }}
          />
        ) : activeTab === 'progress' ? (
          <ProgressHistoryView
            attempts={attempts}
            savedVocab={savedVocab}
            distractorPool={allVocabPool}
            weeklyProgress={weeklyProgress}
            streakDays={streakDays}
            reminderSettings={reminderSettings}
            onUpdateReminderSettings={handleUpdateReminderSettings}
            onReviewAttempt={handleReviewAttempt}
            onToggleMasteredVocab={handleToggleMasteredVocab}
            onRemoveVocab={handleRemoveVocab}
            onSeedSampleVocab={handleSeedSampleVocab}
            onGoToLibrary={() => setActiveTab('library')}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardView
            entries={leaderboardEntries}
            profile={userProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : (
          <SkimScanLabView />
        )}
      </div>

      <footer className="no-print mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>LexisBand · Luyện IELTS Reading Band 4.5–9.0</p>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleSelectTab('library')}
              className="hover:text-slate-900"
            >
              Thư viện đề
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('progress')}
              className="hover:text-slate-900"
            >
              Nhắc nhở tuần &amp; Lịch sử
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('strategy')}
              className="hover:text-slate-900"
            >
              Hướng dẫn Skim &amp; Scan
            </button>
            <button
              type="button"
              onClick={() => setOfflineModalOpen(true)}
              className="hover:text-slate-900"
            >
              Kho ngoại tuyến
            </button>
          </div>
        </div>
      </footer>

      <OfflineManagerModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        allTests={READING_TESTS}
        offlineRecords={offlineRecords}
        offlineSimulation={offlineSimulation}
        onToggleOfflineSimulation={handleToggleOfflineSimulation}
        onDownloadAll={handleDownloadAllOffline}
        onRemoveOffline={handleRemoveOffline}
        onExportWorksheet={exportOfflineWorksheet}
        onStartOfflineTest={handleStartTest}
      />

      <OfflineIndicator
        offlineSimulation={offlineSimulation}
        onExitSimulation={handleToggleOfflineSimulation}
      />
    </div>
  );
}
