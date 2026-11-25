import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Eye,
  Trash2,
  Volume2,
} from 'lucide-react';
import type {
  ReminderSettings,
  SavedVocabEntry,
  TestAttempt,
  VocabItem,
  WeeklyProgress,
} from '../types/ielts';
import {
  buildDailyProgressSeries,
  formatDuration,
  getTypeBreakdown,
} from '../utils/ieltsScoring';
import { downloadWeeklyReminderICS } from '../utils/offlineStorage';
import { speakEnglishText } from '../utils/vocabPractice';
import { VocabPracticeLab } from './VocabPracticeLab';

interface ProgressHistoryViewProps {
  attempts: TestAttempt[];
  savedVocab: SavedVocabEntry[];
  distractorPool: VocabItem[];
  weeklyProgress: WeeklyProgress;
  streakDays: number;
  reminderSettings: ReminderSettings;
  onUpdateReminderSettings: (next: ReminderSettings) => void;
  onReviewAttempt: (attempt: TestAttempt) => void;
  onToggleMasteredVocab: (vocabId: string) => void;
  onRemoveVocab: (vocabId: string) => void;
  onSeedSampleVocab: () => void;
  onGoToLibrary: () => void;
}

const WEEKDAYS = [
  { id: 1, label: 'T2' },
  { id: 2, label: 'T3' },
  { id: 3, label: 'T4' },
  { id: 4, label: 'T5' },
  { id: 5, label: 'T6' },
  { id: 6, label: 'T7' },
  { id: 0, label: 'CN' },
];

export const ProgressHistoryView: React.FC<ProgressHistoryViewProps> = ({
  attempts,
  savedVocab,
  distractorPool,
  weeklyProgress,
  streakDays,
  reminderSettings,
  onUpdateReminderSettings,
  onReviewAttempt,
  onToggleMasteredVocab,
  onRemoveVocab,
  onSeedSampleVocab,
  onGoToLibrary,
}) => {
  const [vocabFilter, setVocabFilter] = useState<'all' | 'learning' | 'mastered'>('all');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [notificationFeedback, setNotificationFeedback] = useState<string>('');

  const dailySeries = useMemo(() => buildDailyProgressSeries(attempts, 7), [attempts]);
  const typeBreakdown = useMemo(() => getTypeBreakdown(attempts), [attempts]);

  const filteredVocab = useMemo(() => {
    return savedVocab.filter((item) => {
      if (vocabFilter === 'learning') return !item.mastered;
      if (vocabFilter === 'mastered') return item.mastered;
      return true;
    });
  }, [savedVocab, vocabFilter]);

  const toggleDay = (dayId: number) => {
    const exists = reminderSettings.preferredDays.includes(dayId);
    const nextDays = exists
      ? reminderSettings.preferredDays.filter((d) => d !== dayId)
      : [...reminderSettings.preferredDays, dayId];
    onUpdateReminderSettings({
      ...reminderSettings,
      preferredDays: nextDays,
    });
  };

  const handleRequestBrowserNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationFeedback('Trình duyệt hiện tại không hỗ trợ thông báo đẩy; bạn có thể tải file lịch (.ics).');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateReminderSettings({
          ...reminderSettings,
          browserNotificationsEnabled: true,
        });
        setNotificationFeedback('Đã bật thông báo nhắc nhở học Reading trên trình duyệt.');
        new Notification('LexisBand IELTS Reading', {
          body: `Nhắc nhở tuần: Bạn đã làm ${weeklyProgress.completedThisWeek}/${weeklyProgress.weeklyTarget} bài Reading trong tuần này.`,
        });
      } else {
        setNotificationFeedback('Quyền thông báo chưa được cấp. Bạn vẫn có thể tải lịch nhắc (.ics).');
      }
    } catch {
      setNotificationFeedback('Không thể kích hoạt thông báo trực tiếp; hãy dùng file lịch (.ics).');
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maxDayCount = Math.max(2, ...dailySeries.map((d) => d.count));

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tiến độ học tập &amp; Lịch sử làm bài
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi Band điểm từng ngày, duy trì tối thiểu 2 bài Reading/tuần và ôn tập sổ từ vựng.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToLibrary}
          className="self-start rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
        >
          Làm bài Reading mới
        </button>
      </div>

      {/* Weekly Goal & Reminder Configuration */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {weeklyProgress.isGoalMet ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Nhắc nhở mục tiêu tuần: Tối thiểu 2 bài Reading / tuần
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {weeklyProgress.isGoalMet
                    ? `Tuyệt vời! Bạn đã hoàn thành ${weeklyProgress.completedThisWeek} bài trong tuần này.`
                    : `Bạn đã làm ${weeklyProgress.completedThisWeek}/${weeklyProgress.weeklyTarget} bài tuần này. Hãy hoàn thành thêm ${weeklyProgress.remaining} bài trước Chủ Nhật.`}
                </p>
              </div>
            </div>
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {weeklyProgress.completedThisWeek}/{weeklyProgress.weeklyTarget}
            </span>
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${
                weeklyProgress.isGoalMet ? 'bg-emerald-600' : 'bg-blue-700'
              }`}
              style={{ width: `${weeklyProgress.progressPercent}%` }}
            />
          </div>

          {/* Reminder Controls */}
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-700">
                Chọn ngày nhắc nhở hàng tuần (khuyến nghị ≥ 2 ngày):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = reminderSettings.preferredDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleDay(day.id)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="reminder-time" className="text-xs font-semibold text-slate-700">
                  Giờ nhắc:
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={reminderSettings.reminderTime}
                  onChange={(e) =>
                    onUpdateReminderSettings({
                      ...reminderSettings,
                      reminderTime: e.target.value,
                    })
                  }
                  className="rounded-md border border-slate-300 px-2.5 py-1 font-mono text-xs text-slate-900"
                />
                <label htmlFor="weekly-target-select" className="ml-2 text-xs font-semibold text-slate-700">
                  Mục tiêu/tuần:
                </label>
                <select
                  id="weekly-target-select"
                  value={reminderSettings.weeklyTarget}
                  onChange={(e) =>
                    onUpdateReminderSettings({
                      ...reminderSettings,
                      weeklyTarget: Math.max(2, Number(e.target.value)),
                    })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                >
                  <option value={2}>2 bài (tối thiểu)</option>
                  <option value={3}>3 bài / tuần</option>
                  <option value={4}>4 bài / tuần</option>
                  <option value={5}>5 bài / tuần</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRequestBrowserNotification}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Nhắc trên trình duyệt</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadWeeklyReminderICS(reminderSettings)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tải lịch (.ics)</span>
                </button>
              </div>
            </div>

            {notificationFeedback && (
              <p className="text-xs font-medium text-blue-700">{notificationFeedback}</p>
            )}
          </div>
        </div>

        {/* Daily Progress Chart (7 days) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tiến độ 7 ngày gần nhất</h2>
              <p className="text-xs text-slate-500">Số bài hoàn thành và Band trung bình mỗi ngày</p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
              Chuỗi: {streakDays} ngày
            </span>
          </div>

          <div className="mt-5">
            <svg
              viewBox="0 0 350 150"
              role="img"
              aria-label="Biểu đồ tiến độ làm bài Reading 7 ngày gần nhất"
              className="h-40 w-full"
            >
              <line x1="20" y1="120" x2="335" y2="120" stroke="#e2e8f0" strokeWidth="1" />
              {dailySeries.map((day, idx) => {
                const x = 32 + idx * 45;
                const barH = day.count > 0 ? Math.max(18, (day.count / maxDayCount) * 86) : 6;
                const y = 120 - barH;
                return (
                  <g key={day.dateKey}>
                    <rect
                      x={x}
                      y={y}
                      width="24"
                      height={barH}
                      rx="4"
                      fill={day.count > 0 ? '#1d4ed8' : '#e2e8f0'}
                    />
                    {day.count > 0 && (
                      <text
                        x={x + 12}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#0f172a"
                      >
                        {day.avgBand?.toFixed(1)}
                      </text>
                    )}
                    <text
                      x={x + 12}
                      y="138"
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="IBM Plex Mono, monospace"
                      fill="#64748b"
                    >
                      {day.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Question Type Accuracy Breakdown */}
      {typeBreakdown.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">Độ chính xác theo dạng câu hỏi</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {typeBreakdown.map((item) => (
              <div key={item.type} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-600">{item.labelVi}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {item.accuracy}%
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {item.correct}/{item.total} câu đúng
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Test History Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Lịch sử làm bài</h2>
            <p className="text-xs text-slate-500">
              Nhấn &quot;Xem lại giải thích&quot; để mở lại bài đọc kèm câu trả lời và dẫn chứng.
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            Tổng: {attempts.length} lượt làm bài
          </span>
        </div>

        {attempts.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Bạn chưa hoàn thành bài Reading nào.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Chọn một bài từ Band 4.5 đến 9.0 để hệ thống tự chấm điểm và lưu tiến độ mỗi ngày.
            </p>
            <button
              type="button"
              onClick={onGoToLibrary}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Khám phá kho đề thi
            </button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Ngày giờ</th>
                  <th className="py-2.5 pr-4">Bài đọc</th>
                  <th className="py-2.5 pr-4 text-right">Số câu đúng</th>
                  <th className="py-2.5 pr-4 text-right">Band</th>
                  <th className="py-2.5 pr-4 text-right">Thời gian</th>
                  <th className="py-2.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(attempt.completedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">{attempt.testTitle}</p>
                      <p className="text-xs text-slate-500">
                        Độ khó Band {attempt.targetBand.toFixed(1)} ·{' '}
                        {attempt.isOfflineAttempt ? 'Làm ngoại tuyến' : 'Trực tuyến'}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {attempt.correctCount}/{attempt.totalQuestions} ({attempt.accuracyPercent}%)
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-sm font-bold text-blue-700 tabular-nums whitespace-nowrap">
                      {attempt.estimatedBand.toFixed(1)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDuration(attempt.durationSeconds)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onReviewAttempt(attempt)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Xem giải thích</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Personal Vocabulary Wordbank */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sổ từ vựng từ bài đọc ({savedVocab.length})
            </h2>
            <p className="text-xs text-slate-500">
              Ôn tập dạng flashcard: nhấn vào từng thẻ để xem nghĩa tiếng Việt và ví dụ gốc.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'learning', label: 'Đang học' },
                { id: 'mastered', label: 'Đã thuộc' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVocabFilter(tab.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vocabFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <VocabPracticeLab
          savedVocab={savedVocab}
          distractorPool={distractorPool}
          onToggleMastered={onToggleMasteredVocab}
          onSeedSampleVocab={onSeedSampleVocab}
        />

        {filteredVocab.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-600">
            Chưa có từ vựng nào trong mục này. Mở tab &quot;Từ vựng gợi ý&quot; khi làm hoặc xem lại bài đọc để lưu từ mới.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVocab.map((entry) => {
              const revealed = revealedIds.has(entry.id);
              return (
                <article
                  key={entry.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{entry.word}</h3>
                        <button
                          type="button"
                          onClick={() => speakEnglishText(entry.word)}
                          aria-label={`Nghe phát âm ${entry.word}`}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="font-mono text-xs font-semibold text-blue-700">
                        {entry.bandLevel}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-500">
                      {entry.ipa} · {entry.pos}
                    </p>

                    {revealed ? (
                      <div className="mt-3 space-y-1.5 text-xs">
                        <p className="font-semibold text-slate-900">{entry.meaningVi}</p>
                        <p className="font-serif italic text-slate-600">
                          &ldquo;{entry.contextQuote}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleReveal(entry.id)}
                        className="mt-3 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Nhấn để xem nghĩa &amp; ngữ cảnh
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onToggleMasteredVocab(entry.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        entry.mastered
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {entry.mastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveVocab(entry.id)}
                      aria-label={`Xóa từ ${entry.word}`}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
