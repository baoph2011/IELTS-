import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileDown,
  Trash2,
} from 'lucide-react';
import type { BandTier, ReadingTest, TestAttempt, WeeklyProgress } from '../types/ielts';

interface LibraryViewProps {
  tests: ReadingTest[];
  attempts: TestAttempt[];
  offlineIds: Set<string>;
  weeklyProgress: WeeklyProgress;
  streakDays: number;
  isOfflineActive: boolean;
  onStartTest: (test: ReadingTest) => void;
  onReviewAttempt: (attempt: TestAttempt) => void;
  onToggleOfflineTest: (test: ReadingTest) => void;
  onDownloadAllOffline: () => void;
  onExportWorksheet: (test: ReadingTest) => void;
  onOpenWeeklySettings: () => void;
}

type LibraryFilter = 'all' | 'full_ielts' | BandTier;

const BAND_FILTERS: Array<{ id: LibraryFilter; label: string }> = [
  { id: 'all', label: 'Tất cả (4.5–9.0)' },
  { id: 'full_ielts', label: 'Đề thi thử IELTS (3 Passages)' },
  { id: '4.5-5.5', label: 'Band 4.5–5.5' },
  { id: '6.0-6.5', label: 'Band 6.0–6.5' },
  { id: '7.0-7.5', label: 'Band 7.0–7.5' },
  { id: '8.0-8.5', label: 'Band 8.0–8.5' },
  { id: '9.0', label: 'Band 9.0' },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  tests,
  attempts,
  offlineIds,
  weeklyProgress,
  streakDays,
  isOfflineActive,
  onStartTest,
  onReviewAttempt,
  onToggleOfflineTest,
  onDownloadAllOffline,
  onExportWorksheet,
  onOpenWeeklySettings,
}) => {
  const [selectedBand, setSelectedBand] = useState<LibraryFilter>('all');
  const [onlyOffline, setOnlyOffline] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const avgBand = useMemo(() => {
    if (attempts.length === 0) return null;
    const sum = attempts.reduce((acc, a) => acc + a.estimatedBand, 0);
    return (Math.round((sum / attempts.length) * 10) / 10).toFixed(1);
  }, [attempts]);

  const latestAttemptByTest = useMemo(() => {
    const map = new Map<string, TestAttempt>();
    for (const attempt of attempts) {
      if (!map.has(attempt.testId)) {
        map.set(attempt.testId, attempt);
      }
    }
    return map;
  }, [attempts]);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (selectedBand === 'full_ielts' && !t.isFullIeltsTest) return false;
      if (selectedBand !== 'all' && selectedBand !== 'full_ielts' && t.bandTier !== selectedBand) {
        return false;
      }
      if (onlyOffline && !offlineIds.has(t.id)) return false;
      if (isOfflineActive && !offlineIds.has(t.id)) return false;
      return true;
    });
  }, [tests, selectedBand, onlyOffline, offlineIds, isOfflineActive]);

  const recommendedNextTest = useMemo(() => {
    return tests.find((t) => !t.isFullIeltsTest && !latestAttemptByTest.has(t.id)) ?? tests[0];
  }, [tests, latestAttemptByTest]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero 2-column stretch section */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-700">
              Lộ trình IELTS Reading chuẩn hóa · Band 4.5 đến 9.0
            </p>
            <h1 className="mt-2.5 max-w-xl text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Luyện đọc hiểu IELTS có giải thích dẫn chứng và học ngoại tuyến
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Hệ thống bài đọc phân tầng từ Band 4.5 đến 9.0 với cơ chế tự chấm điểm, định vị câu
              dẫn chứng trực tiếp trong đoạn văn, gợi ý từ vựng học thuật và chiến lược Skim &amp;
              Scan thực chiến.
            </p>
          </div>

          {/* Weekly Reminder Banner (>= 2 tests/week) */}
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {weeklyProgress.isGoalMet ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {weeklyProgress.isGoalMet
                    ? `Hoàn thành mục tiêu tuần (${weeklyProgress.completedThisWeek}/${weeklyProgress.weeklyTarget} bài Reading)`
                    : `Nhắc nhở tuần: Đã làm ${weeklyProgress.completedThisWeek}/${weeklyProgress.weeklyTarget} bài (cần thêm ${weeklyProgress.remaining} bài)`}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Duy trì ít nhất 2 bài Reading mỗi tuần để giữ nhịp đọc Skim &amp; Scan ổn định.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenWeeklySettings}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                Lịch nhắc
              </button>
              {recommendedNextTest && (
                <button
                  type="button"
                  onClick={() => onStartTest(recommendedNextTest)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0"
                >
                  <span>Làm bài đề xuất</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 lg:col-span-5">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_academic_reading_1795574531761.jpg"
              alt="Bàn học đọc sách học thuật IELTS Reading tại thư viện"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="h-60 w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-60 w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-center text-white lg:h-full">
              <BookOpen className="h-10 w-10 text-blue-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">LexisBand Academic Library</p>
              <p className="mt-1 text-xs text-slate-300">IELTS Reading Band 4.5 – 9.0</p>
            </div>
          )}
        </div>
      </section>

      {/* Full-width 4-column KPI Strip */}
      <section
        aria-label="Chỉ số học tập nhanh"
        className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Band trung bình</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {avgBand ?? '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {attempts.length > 0 ? `${attempts.length} bài đã chấm điểm` : 'Chưa có bài hoàn thành'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Mục tiêu tuần (≥ 2 bài)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {weeklyProgress.completedThisWeek}/{weeklyProgress.weeklyTarget}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {weeklyProgress.isGoalMet ? 'Đã đạt chỉ tiêu tuần' : `Còn ${weeklyProgress.remaining} bài tuần này`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Chuỗi ngày luyện tập</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {streakDays} ngày
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Tự động lưu lịch sử mỗi ngày</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Bài đã tải ngoại tuyến</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {offlineIds.size}/{tests.length}
            </p>
            <button
              type="button"
              onClick={onDownloadAllOffline}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Tải tất cả
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Học không cần kết nối mạng</p>
        </div>
      </section>

      {/* Band Filter Bar & Offline Filter */}
      <section className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Kho đề Reading theo Band</h2>
            <p className="text-xs text-slate-500">
              Chọn trình độ phù hợp hoặc tải bài tập về thiết bị để học ngoại tuyến.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyOffline((v) => !v)}
              aria-pressed={onlyOffline}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                onlyOffline || isOfflineActive
                  ? 'border-blue-700 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Đã tải ngoại tuyến ({offlineIds.size})</span>
            </button>
          </div>
        </div>

        {/* Segmented Band Filter */}
        <div
          role="tablist"
          aria-label="Lọc đề theo Band"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1.5"
        >
          {BAND_FILTERS.map((band) => {
            const active = selectedBand === band.id;
            return (
              <button
                key={band.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedBand(band.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {band.label}
              </button>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTests.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-900">
              {isOfflineActive || onlyOffline
                ? 'Chưa có bài Reading nào được tải ngoại tuyến trong nhóm Band này.'
                : 'Không tìm thấy bài thi phù hợp.'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {onlyOffline
                ? 'Hãy tắt bộ lọc ngoại tuyến hoặc bấm "Tải tất cả" để lưu toàn bộ đề về máy.'
                : 'Thử chọn nhóm Band khác để tiếp tục luyện tập.'}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {onlyOffline && (
                <button
                  type="button"
                  onClick={() => setOnlyOffline(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Xem tất cả đề
                </button>
              )}
              {!isOfflineActive && (
                <button
                  type="button"
                  onClick={onDownloadAllOffline}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Tải tất cả đề ngoại tuyến
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredTests.map((test) => {
              const latestAttempt = latestAttemptByTest.get(test.id);
              const isDownloaded = offlineIds.has(test.id);
              const isFullTest = Boolean(test.isFullIeltsTest && test.sections);

              return (
                <article
                  key={test.id}
                  data-testid={isFullTest ? 'full-ielts-test-card' : undefined}
                  className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
                    isFullTest
                      ? 'border-blue-300 bg-slate-50/70 hover:border-blue-400 md:col-span-2'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Zero-pill inline metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                      <span className="font-mono font-semibold text-blue-700">
                        {isFullTest
                          ? 'Đề thi thử IELTS chuẩn (Band 4.0–9.0)'
                          : `Band ${test.targetBand.toFixed(1)}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{test.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span>{test.questions.length} câu</span>
                      <span aria-hidden="true">·</span>
                      <span>{test.recommendedMinutes} phút</span>
                      {isDownloaded && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-emerald-700">Đã lưu ngoại tuyến</span>
                        </>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-lg font-bold text-slate-900">{test.title}</h3>
                    {!isFullTest && (
                      <p className="mt-1 text-xs font-medium text-slate-500">{test.passageTitle}</p>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{test.subtitle}</p>

                    {isFullTest && test.sections && (
                      <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-200 pt-3 sm:grid-cols-3">
                        {test.sections.map((sec) => (
                          <div key={sec.sectionNumber} className="text-xs">
                            <p className="font-semibold text-slate-900">
                              {sec.label} · {sec.bandRange}
                            </p>
                            <p className="mt-0.5 truncate text-slate-600">{sec.passageTitle}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {latestAttempt && (
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 tabular-nums">
                        <span>
                          Lần gần nhất:{' '}
                          <strong className="font-mono text-slate-900">
                            Band {latestAttempt.estimatedBand.toFixed(1)}
                          </strong>{' '}
                          ({latestAttempt.correctCount}/{latestAttempt.totalQuestions} câu đúng)
                        </span>
                        <button
                          type="button"
                          onClick={() => onReviewAttempt(latestAttempt)}
                          className="font-semibold text-blue-700 hover:underline whitespace-nowrap"
                        >
                          Xem giải thích
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleOfflineTest(test)}
                        aria-label={
                          isDownloaded
                            ? `Xóa bản ngoại tuyến ${test.title}`
                            : `Tải ngoại tuyến ${test.title}`
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          isDownloaded
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Đã tải</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Tải ngoại tuyến</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onExportWorksheet(test)}
                        aria-label={`Xuất file bài tập ${test.title}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Tải file</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartTest(test)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <span>{latestAttempt ? 'Làm lại đề' : 'Làm bài ngay'}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
