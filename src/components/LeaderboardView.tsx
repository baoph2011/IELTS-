import React, { useMemo, useState } from 'react';
import { Award, Check } from 'lucide-react';
import type { LeaderboardEntry, UserProfile } from '../types/ielts';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  profile,
  onUpdateProfile,
}) => {
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [targetInput, setTargetInput] = useState(profile.targetBand);
  const [savedNotice, setSavedNotice] = useState(false);
  const [bracketFilter, setBracketFilter] = useState<'all' | 'mid' | 'high'>('all');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim() || 'Học viên LexisBand';
    onUpdateProfile({
      displayName: cleaned,
      targetBand: targetInput,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const filteredEntries = useMemo(() => {
    if (bracketFilter === 'mid') {
      return entries.filter((e) => e.targetBand <= 6.5 || e.isCurrentUser);
    }
    if (bracketFilter === 'high') {
      return entries.filter((e) => e.targetBand >= 7.0 || e.isCurrentUser);
    }
    return entries;
  }, [entries, bracketFilter]);

  const userRow = entries.find((e) => e.isCurrentUser);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bảng xếp hạng luyện Reading IELTS
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Thứ hạng cập nhật tự động ngay khi bạn hoàn thành và chấm điểm bài đọc mới.
          </p>
        </div>

        {userRow && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900 tabular-nums">
            <Award className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <span>
              Hạng hiện tại của bạn: #{userRow.rank} · Band TB{' '}
              {userRow.avgBand > 0 ? userRow.avgBand.toFixed(1) : '—'}
            </span>
          </div>
        )}
      </div>

      {/* Editable Learner Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700">
            Tên hiển thị trên bảng xếp hạng
          </label>
          <input
            id="profile-name"
            type="text"
            maxLength={40}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-48">
          <label htmlFor="profile-target" className="block text-xs font-semibold text-slate-700">
            Mục tiêu Band
          </label>
          <select
            id="profile-target"
            value={targetInput}
            onChange={(e) => setTargetInput(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
          >
            {[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((b) => (
              <option key={b} value={b}>
                Band {b.toFixed(1)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          {savedNotice ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Đã cập nhật</span>
            </>
          ) : (
            <span>Lưu hồ sơ</span>
          )}
        </button>
      </form>

      {/* Bracket Filter */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(
          [
            { id: 'all', label: 'Tất cả học viên' },
            { id: 'mid', label: 'Mục tiêu 4.5–6.5' },
            { id: 'high', label: 'Mục tiêu 7.0–9.0' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBracketFilter(tab.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              bracketFilter === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="px-4 py-3">Hạng</th>
              <th className="px-4 py-3">Học viên</th>
              <th className="px-4 py-3 text-right">Band mục tiêu</th>
              <th className="px-4 py-3 text-right">Band TB</th>
              <th className="px-4 py-3 text-right">Band cao nhất</th>
              <th className="px-4 py-3 text-right">Số bài đã làm</th>
              <th className="px-4 py-3 text-right">Tuần này</th>
              <th className="px-4 py-3 text-right">Chuỗi ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEntries.map((row) => (
              <tr
                key={row.id}
                className={row.isCurrentUser ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'}
              >
                <td className="px-4 py-3 font-mono text-sm font-bold text-slate-900 tabular-nums">
                  #{row.rank}
                </td>
                <td className="px-4 py-3">
                  <span className="text-slate-900 font-semibold">{row.displayName}</span>
                  {row.isCurrentUser && (
                    <span className="ml-2 text-xs font-semibold text-blue-700">(Bạn)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                  {row.targetBand.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-700 tabular-nums">
                  {row.avgBand > 0 ? row.avgBand.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                  {row.bestBand > 0 ? row.bestBand.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                  {row.testsCompleted}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                  {row.weeklyTests}/2
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                  {row.streakDays} ngày
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};
