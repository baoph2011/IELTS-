import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Eye,
  FileDown,
  Flag,
  Highlighter,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { ReadingQuestion, ReadingTest, TestAttempt, VocabItem } from '../types/ielts';
import {
  QUESTION_TYPE_LABELS,
  SKIM_SIGNPOST_WORDS,
  extractScanTokens,
  formatDuration,
  getTypeBreakdown,
} from '../utils/ieltsScoring';
import { speakEnglishText } from '../utils/vocabPractice';

interface ReadingWorkspaceProps {
  test: ReadingTest;
  initialAttempt: TestAttempt | null;
  savedVocabIds: Set<string>;
  isOfflineActive: boolean;
  onBack: () => void;
  onSubmitAttempt: (answers: Record<string, string>, durationSeconds: number) => TestAttempt;
  onToggleSaveVocab: (item: VocabItem, test: ReadingTest) => void;
  onExportWorksheet: (test: ReadingTest) => void;
  onOpenVocabPractice: () => void;
}

type RightTab = 'questions' | 'vocab';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedParagraph(
  text: string,
  options: {
    evidenceQuote?: string | null;
    skimMode: boolean;
    scanMode: boolean;
    scanKeywords: string[];
  }
): React.ReactNode {
  const { evidenceQuote, skimMode, scanMode, scanKeywords } = options;

  // Priority 1: Exact evidence quote highlight when locating evidence
  if (evidenceQuote && text.includes(evidenceQuote)) {
    const idx = text.indexOf(evidenceQuote);
    const before = text.slice(0, idx);
    const after = text.slice(idx + evidenceQuote.length);
    return (
      <>
        {before}
        <mark
          data-testid="evidence-highlight"
          className="rounded bg-emerald-200/80 px-1 py-0.5 font-medium text-slate-950 ring-1 ring-emerald-500"
        >
          {evidenceQuote}
        </mark>
        {after}
      </>
    );
  }

  const patterns: Array<{ regex: RegExp; kind: 'skim' | 'scan' }> = [];

  if (scanMode) {
    const dynamicTokens = extractScanTokens(text);
    const combinedScan = Array.from(new Set([...scanKeywords, ...dynamicTokens])).filter(
      (t) => t.trim().length >= 2
    );
    if (combinedScan.length > 0) {
      combinedScan.sort((a, b) => b.length - a.length);
      patterns.push({
        regex: new RegExp(`(${combinedScan.map(escapeRegex).join('|')})`, 'gi'),
        kind: 'scan',
      });
    }
  }

  if (skimMode) {
    patterns.push({
      regex: new RegExp(`\\b(${SKIM_SIGNPOST_WORDS.map(escapeRegex).join('|')})\\b`, 'gi'),
      kind: 'skim',
    });
  }

  if (patterns.length === 0) {
    return text;
  }

  // Merge active highlights cleanly in one pass
  const combinedTerms: Array<{ term: string; kind: 'skim' | 'scan' }> = [];
  if (scanMode) {
    const tokens = Array.from(new Set([...scanKeywords, ...extractScanTokens(text)])).filter(
      (t) => t.trim().length >= 2
    );
    for (const t of tokens) combinedTerms.push({ term: t, kind: 'scan' });
  }
  if (skimMode) {
    for (const w of SKIM_SIGNPOST_WORDS) combinedTerms.push({ term: w, kind: 'skim' });
  }

  if (combinedTerms.length === 0) return text;

  const sorted = combinedTerms.sort((a, b) => b.term.length - a.term.length);
  const masterRegex = new RegExp(`(${sorted.map((s) => escapeRegex(s.term)).join('|')})`, 'gi');
  const parts = text.split(masterRegex);

  return parts.map((part, idx) => {
    const lower = part.toLowerCase();
    const matched = sorted.find((s) => s.term.toLowerCase() === lower);
    if (!matched) return <React.Fragment key={idx}>{part}</React.Fragment>;
    if (matched.kind === 'scan') {
      return (
        <mark
          key={idx}
          className="rounded bg-sky-100 px-1 py-0.5 text-sky-950 ring-1 ring-sky-300"
        >
          {part}
        </mark>
      );
    }
    return (
      <mark
        key={idx}
        className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-950 ring-1 ring-amber-300"
      >
        {part}
      </mark>
    );
  });
}

export const ReadingWorkspace: React.FC<ReadingWorkspaceProps> = ({
  test,
  initialAttempt,
  savedVocabIds,
  isOfflineActive,
  onBack,
  onSubmitAttempt,
  onToggleSaveVocab,
  onExportWorksheet,
  onOpenVocabPractice,
}) => {
  const isFullTest = Boolean(test.isFullIeltsTest && test.sections && test.sections.length > 0);

  const [answers, setAnswers] = useState<Record<string, string>>(
    initialAttempt ? { ...initialAttempt.answers } : {}
  );
  const [submittedAttempt, setSubmittedAttempt] = useState<TestAttempt | null>(initialAttempt);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    initialAttempt ? initialAttempt.durationSeconds : 0
  );
  const [isPaused, setIsPaused] = useState(false);
  const [skimMode, setSkimMode] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [activeSectionNumber, setActiveSectionNumber] = useState<1 | 2 | 3>(1);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [focusedQuestionId, setFocusedQuestionId] = useState<string>(
    test.questions[0]?.id ?? ''
  );
  const [activeEvidence, setActiveEvidence] = useState<{
    sectionNumber?: 1 | 2 | 3;
    paragraphRef: string;
    quote: string;
    questionNumber: number;
  } | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('questions');
  const [userHighlights, setUserHighlights] = useState<Set<string>>(new Set());

  const paragraphRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const passageContainerRef = useRef<HTMLElement | null>(null);
  const rightPaneRef = useRef<HTMLElement | null>(null);

  // Reset state if user opens another test
  useEffect(() => {
    setAnswers(initialAttempt ? { ...initialAttempt.answers } : {});
    setSubmittedAttempt(initialAttempt);
    setElapsedSeconds(initialAttempt ? initialAttempt.durationSeconds : 0);
    setIsPaused(false);
    setActiveSectionNumber(1);
    setFlaggedQuestions(new Set());
    setActiveEvidence(null);
    setFocusedQuestionId(test.questions[0]?.id ?? '');
    setRightTab('questions');
  }, [test.id, initialAttempt]);

  useEffect(() => {
    if (submittedAttempt || isPaused) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [submittedAttempt, isPaused]);

  const activeSection = useMemo(() => {
    if (!isFullTest || !test.sections) return null;
    return (
      test.sections.find((s) => s.sectionNumber === activeSectionNumber) ?? test.sections[0]
    );
  }, [isFullTest, test.sections, activeSectionNumber]);

  const activeParagraphs = useMemo(
    () => (activeSection ? activeSection.paragraphs : test.paragraphs),
    [activeSection, test.paragraphs]
  );

  const visibleQuestions = useMemo(() => {
    if (!isFullTest) return test.questions;
    return test.questions.filter((q) => (q.sectionNumber ?? 1) === activeSectionNumber);
  }, [isFullTest, test.questions, activeSectionNumber]);

  const activePassageTitle = activeSection ? activeSection.passageTitle : test.passageTitle;
  const activePassageSubtitle = activeSection
    ? activeSection.passageSubtitle
    : test.passageSubtitle;
  const activeStrategyTip = activeSection ? activeSection.strategyTipVi : test.strategyTipVi;

  const focusedQuestion = useMemo(
    () =>
      test.questions.find((q) => q.id === focusedQuestionId) ??
      visibleQuestions[0] ??
      test.questions[0],
    [test.questions, visibleQuestions, focusedQuestionId]
  );

  const answeredCount = useMemo(
    () => test.questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length,
    [test.questions, answers]
  );

  const totalRecommendedSeconds = test.recommendedMinutes * 60;
  const remainingSeconds = Math.max(0, totalRecommendedSeconds - elapsedSeconds);

  const handleSelectAnswer = (questionId: string, value: string) => {
    if (submittedAttempt) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setFocusedQuestionId(questionId);
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSwitchSection = (secNum: 1 | 2 | 3) => {
    setActiveSectionNumber(secNum);
    const firstInSec = test.questions.find((q) => (q.sectionNumber ?? 1) === secNum);
    if (firstInSec) setFocusedQuestionId(firstInSec.id);
    passageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    rightPaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToQuestion = (q: ReadingQuestion) => {
    const targetSection = q.sectionNumber ?? 1;
    setRightTab('questions');
    setFocusedQuestionId(q.id);
    if (isFullTest && targetSection !== activeSectionNumber) {
      setActiveSectionNumber(targetSection);
    }
    window.setTimeout(() => {
      const qEl = questionRefs.current[q.id];
      const pane = rightPaneRef.current;
      if (qEl && pane) {
        const targetTop = Math.max(0, qEl.offsetTop - pane.offsetTop - 72);
        pane.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }, 40);
  };

  const handleSubmit = () => {
    const attempt = onSubmitAttempt(answers, Math.max(1, elapsedSeconds));
    setSubmittedAttempt(attempt);
    setIsPaused(true);
    window.scrollTo({ top: 0 });
    rightPaneRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmittedAttempt(null);
    setElapsedSeconds(0);
    setIsPaused(false);
    setActiveSectionNumber(1);
    setFlaggedQuestions(new Set());
    setActiveEvidence(null);
    setRightTab('questions');
  };

  const handleLocateEvidence = (q: ReadingQuestion) => {
    const targetSection = q.sectionNumber ?? 1;
    setActiveEvidence({
      sectionNumber: targetSection,
      paragraphRef: q.paragraphRef,
      quote: q.evidenceQuote,
      questionNumber: q.number,
    });
    if (isFullTest && targetSection !== activeSectionNumber) {
      setActiveSectionNumber(targetSection);
    }
    window.setTimeout(() => {
      const key = `${targetSection}-${q.paragraphRef}`;
      const el = paragraphRefs.current[key];
      const container = passageContainerRef.current;
      if (el && container) {
        const targetTop = Math.max(0, el.offsetTop - container.offsetTop - 16);
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }, 45);
  };

  const toggleParagraphHighlight = (highlightKey: string) => {
    setUserHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(highlightKey)) next.delete(highlightKey);
      else next.add(highlightKey);
      return next;
    });
  };

  const reviewBreakdown = useMemo(
    () => (submittedAttempt ? getTypeBreakdown([submittedAttempt]) : []),
    [submittedAttempt]
  );

  const sectionBreakdown = useMemo(() => {
    if (!submittedAttempt || !isFullTest || !test.sections) return [];
    return test.sections.map((sec) => {
      const secQuestions = test.questions.filter((q) => q.sectionNumber === sec.sectionNumber);
      const secQuestionIds = new Set(secQuestions.map((q) => q.id));
      const secCorrect = submittedAttempt.results.filter(
        (r) => secQuestionIds.has(r.questionId) && r.isCorrect
      ).length;
      return {
        sectionNumber: sec.sectionNumber,
        label: sec.label,
        correct: secCorrect,
        total: secQuestions.length,
      };
    });
  }, [submittedAttempt, isFullTest, test.sections, test.questions]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      {/* Workspace Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Quay lại</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span className="font-mono font-semibold text-blue-700">
                Band {test.targetBand.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{test.topic}</span>
              <span aria-hidden="true">·</span>
              <span>{test.questions.length} câu</span>
              {isOfflineActive && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-700">Chế độ ngoại tuyến</span>
                </>
              )}
            </div>
            <h1 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">
              {test.title}
            </h1>
          </div>
        </div>

        {/* Strategy & Timer Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={skimMode}
            onClick={() => setSkimMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              skimMode
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gợi ý Skim</span>
          </button>

          <button
            type="button"
            aria-pressed={scanMode}
            onClick={() => setScanMode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              scanMode
                ? 'border-sky-400 bg-sky-50 text-sky-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gợi ý Scan</span>
          </button>

          <button
            type="button"
            onClick={() => onExportWorksheet(test)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tải file</span>
          </button>

          <div
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold tabular-nums ${
              isFullTest && remainingSeconds <= 300
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}
            data-testid="workspace-timer"
          >
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            {isFullTest ? (
              <>
                <span>Còn {formatDuration(remainingSeconds)}</span>
                <span className="text-slate-400">/ {test.recommendedMinutes}:00</span>
              </>
            ) : (
              <>
                <span>{formatDuration(elapsedSeconds)}</span>
                <span className="text-slate-400">/ {test.recommendedMinutes}:00</span>
              </>
            )}
            {!submittedAttempt && (
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? 'Tiếp tục tính giờ' : 'Tạm dừng tính giờ'}
                className="ml-1 rounded p-0.5 text-slate-600 hover:bg-slate-200"
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full IELTS 3-Passage Switcher Bar */}
      {isFullTest && test.sections && (
        <div
          role="tablist"
          aria-label="Chuyển đổi Passage trong đề thi IELTS"
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {test.sections.map((sec) => {
            const isSelected = activeSectionNumber === sec.sectionNumber;
            const secQuestions = test.questions.filter(
              (q) => q.sectionNumber === sec.sectionNumber
            );
            const secAnswered = secQuestions.filter(
              (q) => (answers[q.id] ?? '').trim().length > 0
            ).length;

            return (
              <button
                key={sec.sectionNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSwitchSection(sec.sectionNumber)}
                className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-blue-700 bg-blue-50/80 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-900">
                    {sec.label} · {sec.bandRange}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{sec.passageTitle}</p>
                </div>
                <span
                  className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                    isSelected ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {secAnswered}/{secQuestions.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Strategy Tip Strip */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700">
        <span className="font-semibold text-slate-900">
          {isFullTest && activeSection
            ? `Chiến lược Passage ${activeSection.sectionNumber}: `
            : 'Chiến lược bài đọc: '}
        </span>
        {activeStrategyTip}
      </div>

      {/* Main Split-Screen Stage */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT PANE: Academic Reading Passage */}
        <section
          ref={passageContainerRef}
          aria-label="Nội dung bài đọc IELTS"
          className={`relative rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7 lg:overflow-y-auto ${
            isFullTest ? 'lg:h-[calc(100vh-345px)]' : 'lg:max-h-[calc(100vh-210px)]'
          }`}
        >
          <div className="border-b border-slate-200 pb-4">
            {isFullTest && activeSection && (
              <p className="mb-1 text-xs font-semibold tracking-wide text-blue-700">
                {activeSection.label} · {activeSection.bandRange}
              </p>
            )}
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              {activePassageTitle}
            </h2>
            <p className="mt-1 text-sm italic text-slate-600">{activePassageSubtitle}</p>
            {(skimMode || scanMode || activeEvidence) && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                {skimMode && (
                  <span>
                    <strong className="text-amber-800">Chế độ Skim:</strong> Hiển thị ý chính từng
                    đoạn &amp; từ nối chuyển hướng.
                  </span>
                )}
                {scanMode && (
                  <span>
                    <strong className="text-sky-800">Chế độ Scan:</strong> Làm nổi bật số liệu, tên
                    riêng &amp; từ khóa câu {focusedQuestion?.number ?? 1}.
                  </span>
                )}
                {activeEvidence && (
                  <span className="font-medium text-emerald-800">
                    Đang hiển thị dẫn chứng cho Câu {activeEvidence.questionNumber} (
                    {isFullTest && activeEvidence.sectionNumber
                      ? `Passage ${activeEvidence.sectionNumber} · `
                      : ''}
                    Đoạn {activeEvidence.paragraphRef})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {activeParagraphs.map((para) => {
              const sectionKey = activeSection ? activeSection.sectionNumber : 1;
              const refKey = `${sectionKey}-${para.id}`;
              const isEvidenceTarget =
                activeEvidence?.paragraphRef === para.id &&
                (!isFullTest || activeEvidence?.sectionNumber === sectionKey);
              const isBookmarked = userHighlights.has(refKey);

              return (
                <div
                  key={refKey}
                  ref={(el) => {
                    paragraphRefs.current[refKey] = el;
                  }}
                  className={`rounded-lg p-3 transition-colors ${
                    isEvidenceTarget
                      ? 'bg-emerald-50/50 ring-1 ring-emerald-300'
                      : isBookmarked
                        ? 'bg-amber-50/40 ring-1 ring-amber-200'
                        : ''
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold tracking-wide text-slate-500">
                      ĐOẠN {para.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleParagraphHighlight(refKey)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      {isBookmarked ? 'Bỏ đánh dấu đoạn' : 'Đánh dấu đoạn'}
                    </button>
                  </div>

                  {skimMode && (
                    <p className="mb-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-medium text-amber-950">
                      Ý chính (Skim): {para.skimTopicSentence}
                    </p>
                  )}

                  <p className="passage-prose">
                    {renderHighlightedParagraph(para.text, {
                      evidenceQuote: isEvidenceTarget ? activeEvidence?.quote : null,
                      skimMode,
                      scanMode,
                      scanKeywords: focusedQuestion?.scanKeywords ?? [],
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT PANE: Questions / Grading Review / Vocabulary */}
        <section
          ref={rightPaneRef}
          aria-label="Câu hỏi và giải thích"
          className={`rounded-xl border border-slate-200 bg-white lg:col-span-5 lg:overflow-y-auto ${
            isFullTest ? 'lg:h-[calc(100vh-345px)]' : 'lg:max-h-[calc(100vh-210px)]'
          }`}
        >
          {/* Right Pane Tabs */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div role="tablist" className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'questions'}
                onClick={() => setRightTab('questions')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  rightTab === 'questions'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {submittedAttempt ? 'Kết quả & Giải thích' : `Câu hỏi (${answeredCount}/${test.questions.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'vocab'}
                onClick={() => setRightTab('vocab')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  rightTab === 'vocab'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                <span>Từ vựng gợi ý ({test.vocabulary.length})</span>
              </button>
            </div>
          </div>

          <div className="p-5">
            {rightTab === 'vocab' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Từ vựng học thuật rút trích từ bài đọc
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Lưu các từ mới để luyện Flashcard, Quiz và Nghe viết chính tả.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenVocabPractice}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Luyện tập từ đã lưu
                  </button>
                </div>

                {test.vocabulary.map((item) => {
                  const isSaved = savedVocabIds.has(item.id);
                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h3 className="text-base font-bold text-slate-900">{item.word}</h3>
                            <button
                              type="button"
                              onClick={() => speakEnglishText(item.word)}
                              aria-label={`Nghe phát âm ${item.word}`}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                            >
                              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="font-mono text-xs text-slate-500">{item.ipa}</span>
                            <span className="text-xs text-slate-500">({item.pos})</span>
                            <span className="font-mono text-xs font-semibold text-blue-700">
                              {item.bandLevel}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-800">{item.meaningVi}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleSaveVocab(item, test)}
                          aria-label={isSaved ? `Bỏ lưu từ ${item.word}` : `Lưu từ ${item.word}`}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            isSaved
                              ? 'border-blue-200 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Đã lưu</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Lưu từ</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="mt-2.5 rounded bg-slate-50 px-3 py-2 font-serif text-xs italic text-slate-700">
                        &ldquo;{item.contextQuote}&rdquo; (
                        {item.sectionNumber ? `Passage ${item.sectionNumber} · ` : ''}Đoạn{' '}
                        {item.paragraphRef})
                      </p>

                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Cụm từ đi kèm: </span>
                        {item.collocations.join(' · ')}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Post-Submit Score & Analysis Header */}
                {submittedAttempt && (
                  <div
                    data-testid="score-summary"
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          {isFullTest
                            ? 'Kết quả quy đổi chuẩn IELTS (40 câu)'
                            : 'Kết quả tự chấm điểm'}
                        </p>
                        <div className="mt-1 flex items-baseline gap-3 tabular-nums">
                          <span className="font-mono text-3xl font-bold text-blue-700">
                            Band {submittedAttempt.estimatedBand.toFixed(1)}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {submittedAttempt.correctCount}/{submittedAttempt.totalQuestions} câu đúng
                            ({submittedAttempt.accuracyPercent}%)
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          Thời gian hoàn thành: {formatDuration(submittedAttempt.durationSeconds)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRetake}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Làm lại</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRightTab('vocab')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Học từ vựng mới</span>
                        </button>
                      </div>
                    </div>

                    {/* Per-passage score breakdown for Full IELTS Test */}
                    {isFullTest && sectionBreakdown.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                        {sectionBreakdown.map((sec) => (
                          <button
                            key={sec.sectionNumber}
                            type="button"
                            onClick={() => handleSwitchSection(sec.sectionNumber)}
                            className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                              activeSectionNumber === sec.sectionNumber
                                ? 'border-blue-300 bg-white'
                                : 'border-slate-200 bg-white/70 hover:bg-white'
                            }`}
                          >
                            <p className="font-semibold text-slate-700">
                              Passage {sec.sectionNumber}
                            </p>
                            <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {sec.correct}/{sec.total}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Accuracy breakdown by question type */}
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
                      {reviewBreakdown.map((item) => (
                        <div
                          key={item.type}
                          className="flex items-center justify-between text-xs text-slate-700 tabular-nums"
                        >
                          <span className="truncate pr-2">{item.labelVi}</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {item.correct}/{item.total} ({item.accuracy}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question List (scoped to active passage in Full Test) */}
                {visibleQuestions.map((q) => {
                  const result = submittedAttempt?.results.find((r) => r.questionId === q.id);
                  const currentValue = answers[q.id] ?? '';
                  const isFlagged = flaggedQuestions.has(q.id);

                  return (
                    <div
                      key={q.id}
                      ref={(el) => {
                        questionRefs.current[q.id] = el;
                      }}
                      onFocus={() => setFocusedQuestionId(q.id)}
                      className={`rounded-lg border p-4 transition-colors ${
                        result
                          ? result.isCorrect
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-red-200 bg-red-50/30'
                          : focusedQuestionId === q.id
                            ? 'border-blue-300 bg-white'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Câu {q.number} · {QUESTION_TYPE_LABELS[q.type]}
                        </span>
                        <div className="flex items-center gap-2">
                          {!result && isFullTest && (
                            <button
                              type="button"
                              onClick={() => handleToggleFlag(q.id)}
                              aria-pressed={isFlagged}
                              aria-label={`Cắm cờ xem lại câu ${q.number}`}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                isFlagged
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                            >
                              <Flag className="h-3 w-3" aria-hidden="true" />
                              <span>{isFlagged ? 'Đã cắm cờ' : 'Cắm cờ'}</span>
                            </button>
                          )}
                          {result && (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                result.isCorrect ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {result.isCorrect ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Đúng</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Sai</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {q.instruction && (
                        <p className="mt-1 text-xs font-semibold text-blue-700">
                          Yêu cầu: {q.instruction}
                        </p>
                      )}

                      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-900">
                        {q.prompt}
                      </p>

                      {/* Answer Input */}
                      {q.type === 'fill_blank' ? (
                        <div className="mt-3">
                          <label htmlFor={`input-${q.id}`} className="sr-only">
                            Đáp án câu {q.number}
                          </label>
                          <input
                            id={`input-${q.id}`}
                            type="text"
                            disabled={Boolean(submittedAttempt)}
                            value={currentValue}
                            onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                            placeholder="Nhập từ chính xác trong bài đọc..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
                          />
                        </div>
                      ) : q.type === 'matching_headings' ? (
                        <div className="mt-3">
                          <label htmlFor={`select-${q.id}`} className="sr-only">
                            Chọn tiêu đề cho {q.prompt}
                          </label>
                          <select
                            id={`select-${q.id}`}
                            disabled={Boolean(submittedAttempt)}
                            value={currentValue}
                            onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
                          >
                            <option value="">-- Chọn tiêu đề phù hợp --</option>
                            {(q.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {(q.options ?? []).map((opt) => {
                            const selected = currentValue === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={Boolean(submittedAttempt)}
                                onClick={() => handleSelectAnswer(q.id, opt)}
                                className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-colors sm:text-sm ${
                                  selected
                                    ? 'border-blue-700 bg-blue-50 text-blue-900 font-semibold'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                } disabled:cursor-default`}
                              >
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Detailed Explanation Panel in Review Mode */}
                      {result && (
                        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <p className="text-slate-700">
                                Bạn trả lời:{' '}
                                <strong className="font-mono text-slate-900">
                                  {result.userAnswer || '(Bỏ trống)'}
                                </strong>
                              </p>
                              <p className="text-emerald-800">
                                Đáp án đúng:{' '}
                                <strong className="font-mono">{result.correctAnswers[0]}</strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLocateEvidence(q)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                Xem dẫn chứng (
                                {isFullTest && q.sectionNumber
                                  ? `Passage ${q.sectionNumber} · `
                                  : ''}
                                Đoạn {q.paragraphRef})
                              </span>
                            </button>
                          </div>

                          <p className="leading-relaxed text-slate-700">
                            <strong className="text-slate-900">Giải thích: </strong>
                            {q.explanationVi}
                          </p>
                          <p className="leading-relaxed text-slate-600">
                            <strong className="text-slate-800">Lưu ý tránh bẫy: </strong>
                            {q.trapNoteVi}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Passage Switch & Submit Controls */}
                {isFullTest && activeSectionNumber < 3 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleSwitchSection((activeSectionNumber + 1) as 1 | 2 | 3)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Sang Passage {activeSectionNumber + 1} →
                    </button>
                  </div>
                )}

                {!submittedAttempt && (
                  <div className="sticky bottom-0 border-t border-slate-200 bg-white pt-4 pb-1">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                    >
                      Nộp bài &amp; Chấm điểm ngay ({answeredCount}/{test.questions.length} câu)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom 40-Question Exam Palette for Full IELTS Test */}
      {isFullTest && (
        <div
          data-testid="full-test-palette"
          className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              Bảng điều hướng 40 câu hỏi (Đang xem Passage {activeSectionNumber})
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span>Đã trả lời: {answeredCount}/40</span>
              <span aria-hidden="true">·</span>
              <span>Đã cắm cờ: {flaggedQuestions.size}</span>
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1 sm:grid-cols-[repeat(20,minmax(0,1fr))]">
            {test.questions.map((q) => {
              const isAnswered = (answers[q.id] ?? '').trim().length > 0;
              const isFlagged = flaggedQuestions.has(q.id);
              const isFocused = focusedQuestionId === q.id;
              const res = submittedAttempt?.results.find((r) => r.questionId === q.id);

              let toneClass =
                'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400';
              if (res) {
                toneClass = res.isCorrect
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-red-600 bg-red-600 text-white';
              } else if (isAnswered) {
                toneClass = 'border-blue-700 bg-blue-700 text-white';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleJumpToQuestion(q)}
                  aria-label={`Đi tới câu ${q.number}${isFlagged ? ' (đã cắm cờ)' : ''}`}
                  className={`rounded border py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors ${toneClass} ${
                    isFlagged ? 'ring-2 ring-amber-400' : ''
                  } ${isFocused ? 'outline-2 outline-slate-900' : ''}`}
                >
                  {q.number}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
