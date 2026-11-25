import React from 'react';
import { BookOpen, WifiOff } from 'lucide-react';

export type AppTab = 'library' | 'progress' | 'leaderboard' | 'strategy';

interface TopNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenOfflineModal: () => void;
  offlineCount: number;
  isOfflineActive: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenOfflineModal,
  offlineCount,
  isOfflineActive,
}) => {
  const navItems: Array<{ id: AppTab; label: string }> = [
    { id: 'library', label: 'Thư viện đề' },
    { id: 'progress', label: 'Tiến độ' },
    { id: 'leaderboard', label: 'Xếp hạng' },
    { id: 'strategy', label: 'Skim & Scan' },
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6">
        {/* Zone 1: Single-element Brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('library')}
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <BookOpen className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <span>LexisBand</span>
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'border-blue-700 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenOfflineModal}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isOfflineActive && <WifiOff className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
            <span>Ngoại tuyến ({offlineCount})</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Điều hướng di động"
        className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 text-xs font-medium"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`rounded-md px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
