import React from 'react';
import { Download, FileDown, Trash2, Wifi, WifiOff, X } from 'lucide-react';
import type { ReadingTest } from '../types/ielts';
import type { OfflineTestRecord } from '../utils/offlineStorage';
import { PWAInstallButton } from './PWAInstallButton';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allTests: ReadingTest[];
  offlineRecords: OfflineTestRecord[];
  offlineSimulation: boolean;
  onToggleOfflineSimulation: () => void;
  onDownloadAll: () => void;
  onRemoveOffline: (testId: string) => void;
  onExportWorksheet: (test: ReadingTest) => void;
  onStartOfflineTest: (test: ReadingTest) => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  allTests,
  offlineRecords,
  offlineSimulation,
  onToggleOfflineSimulation,
  onDownloadAll,
  onRemoveOffline,
  onExportWorksheet,
  onStartOfflineTest,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="offline-modal-title" className="text-lg font-bold text-slate-900">
              Kho học ngoại tuyến &amp; Cài đặt PWA
            </h2>
            <p className="text-xs text-slate-500">
              Tải bài đọc vào bộ nhớ thiết bị (IndexedDB) để làm bài, tự chấm điểm và xem giải thích khi không có Internet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại ngoại tuyến"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Đã lưu {offlineRecords.length}/{allTests.length} bài tập trong thiết bị
              </p>
              <p className="text-xs text-slate-600">
                Bao gồm toàn bộ đoạn văn, câu hỏi, đáp án, giải thích chi tiết và từ vựng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PWAInstallButton />
              <button
                type="button"
                onClick={onDownloadAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tải tất cả ({allTests.length} bài)</span>
              </button>
            </div>
          </div>

          {/* Offline Mode Simulation Switch */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              {offlineSimulation ? (
                <WifiOff className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
              ) : (
                <Wifi className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Chế độ giả lập ngoại tuyến (Offline Practice Mode)
                </p>
                <p className="text-xs text-slate-600">
                  Khi bật, ứng dụng chỉ hiển thị và cho phép mở các bài đã tải về để kiểm tra trải nghiệm không có mạng.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={offlineSimulation}
              onClick={onToggleOfflineSimulation}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                offlineSimulation
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {offlineSimulation ? 'Đang bật' : 'Bật chế độ'}
            </button>
          </div>

          {/* Downloaded List */}
          <div>
            <h3 className="text-sm font-bold text-slate-900">Danh sách bài đã tải</h3>
            {offlineRecords.length === 0 ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Chưa có bài tập nào được tải về thiết bị.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nhấn &quot;Tải tất cả&quot; ở trên hoặc chọn &quot;Tải ngoại tuyến&quot; trên từng thẻ bài đọc.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {offlineRecords.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rec.test.title}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Band {rec.test.targetBand.toFixed(1)} · {rec.test.questions.length} câu · Lưu lúc{' '}
                        {new Date(rec.downloadedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onExportWorksheet(rec.test)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>File HTML</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onStartOfflineTest(rec.test);
                          onClose();
                        }}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Mở bài
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveOffline(rec.id)}
                        aria-label={`Xóa bài ngoại tuyến ${rec.test.title}`}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
