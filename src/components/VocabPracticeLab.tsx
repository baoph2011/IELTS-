import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { SavedVocabEntry, VocabItem } from '../types/ielts';
import {
  buildDefinitionMatchBoard,
  buildVocabQuizQuestions,
  checkDictationSpelling,
  speakEnglishText,
  type DictationCheckResult,
} from '../utils/vocabPractice';

export type VocabPracticeMode = 'flashcard' | 'quiz' | 'match' | 'dictation';

interface VocabPracticeLabProps {
  savedVocab: SavedVocabEntry[];
  distractorPool: VocabItem[];
  onToggleMastered: (vocabId: string) => void;
  onSeedSampleVocab: () => void;
}

export const VocabPracticeLab: React.FC<VocabPracticeLabProps> = ({
  savedVocab,
  distractorPool,
  onToggleMastered,
  onSeedSampleVocab,
}) => {
  const [mode, setMode] = useState<VocabPracticeMode>('flashcard');

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizSeed, setQuizSeed] = useState(42);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnsweredCount, setQuizAnsweredCount] = useState(0);

  // Matching game state
  const [matchSeed, setMatchSeed] = useState(7);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [matchErrorMsg, setMatchErrorMsg] = useState<string>('');
  const [matchAttempts, setMatchAttempts] = useState(0);

  // Listening & Dictation state
  const [dictIndex, setDictIndex] = useState(0);
  const [dictInput, setDictInput] = useState('');
  const [dictResult, setDictResult] = useState<DictationCheckResult | null>(null);
  const [dictCorrectCount, setDictCorrectCount] = useState(0);
  const [dictTotalChecked, setDictTotalChecked] = useState(0);
  const [accent, setAccent] = useState<'en-GB' | 'en-US'>('en-GB');
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [showLetterHint, setShowLetterHint] = useState(false);
  const [showIpaHint, setShowIpaHint] = useState(false);
  const [ttsNotice, setTtsNotice] = useState('');

  useEffect(() => {
    if (cardIndex >= savedVocab.length) setCardIndex(0);
    if (quizIndex >= savedVocab.length) setQuizIndex(0);
    if (dictIndex >= savedVocab.length) setDictIndex(0);
  }, [savedVocab.length, cardIndex, quizIndex, dictIndex]);

  const quizQuestions = useMemo(
    () => buildVocabQuizQuestions(savedVocab, distractorPool, quizSeed),
    [savedVocab, distractorPool, quizSeed]
  );

  const matchBoard = useMemo(
    () => buildDefinitionMatchBoard(savedVocab, 6, matchSeed),
    [savedVocab, matchSeed]
  );

  const handleSpeak = (text: string, customRate?: number) => {
    const ok = speakEnglishText(text, {
      accent,
      rate: customRate ?? speechRate,
    });
    if (!ok) {
      setTtsNotice(
        'Trình duyệt không hỗ trợ phát âm thanh tự động; bạn có thể dùng gợi ý IPA và chữ cái đầu.'
      );
    } else {
      setTtsNotice('');
    }
  };

  if (savedVocab.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h3 className="text-base font-bold text-slate-900">
          Chưa có từ vựng nào trong Sổ từ vựng để luyện tập
        </h3>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          Hãy lưu từ mới trong tab &quot;Từ vựng gợi ý&quot; của mỗi bài đọc, hoặc nạp nhanh 6 từ
          học thuật mẫu để trải nghiệm ngay Flashcard, Trắc nghiệm, Ghép nghĩa và Nghe viết chính
          tả tiếng Anh.
        </p>
        <button
          type="button"
          onClick={onSeedSampleVocab}
          className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
        >
          Nạp 6 từ mẫu để luyện tập ngay
        </button>
      </div>
    );
  }

  const currentCard = savedVocab[cardIndex] ?? savedVocab[0];
  const currentQuiz = quizQuestions[quizIndex] ?? quizQuestions[0];
  const currentDictWord = savedVocab[dictIndex] ?? savedVocab[0];

  const handleNextCard = (delta: number) => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + delta + savedVocab.length) % savedVocab.length);
  };

  const handleSelectQuizOption = (option: string) => {
    if (selectedOption !== null || !currentQuiz) return;
    setSelectedOption(option);
    setQuizAnsweredCount((c) => c + 1);
    if (option === currentQuiz.correctMeaning) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleNextQuiz = () => {
    setSelectedOption(null);
    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((i) => i + 1);
    } else {
      setQuizIndex(0);
      setQuizScore(0);
      setQuizAnsweredCount(0);
      setQuizSeed((s) => s + 11);
    }
  };

  const handleClickRightMeaning = (rightId: string) => {
    if (!selectedLeftId || matchedIds.has(rightId)) return;
    setMatchAttempts((a) => a + 1);
    if (selectedLeftId === rightId) {
      const next = new Set(matchedIds);
      next.add(rightId);
      setMatchedIds(next);
      setSelectedLeftId(null);
      setMatchErrorMsg('');
    } else {
      setMatchErrorMsg('Chưa khớp nghĩa — hãy chọn lại từ hoặc nghĩa khác.');
      setSelectedLeftId(null);
    }
  };

  const handleResetMatch = () => {
    setMatchedIds(new Set());
    setSelectedLeftId(null);
    setMatchErrorMsg('');
    setMatchAttempts(0);
    setMatchSeed((s) => s + 5);
  };

  const handleCheckDictation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDictWord || dictInput.trim().length === 0) return;
    const res = checkDictationSpelling(dictInput, currentDictWord.word);
    setDictResult(res);
    setDictTotalChecked((t) => t + 1);
    if (res.isCorrect) {
      setDictCorrectCount((c) => c + 1);
    }
  };

  const handleNextDictation = () => {
    setDictInput('');
    setDictResult(null);
    setShowLetterHint(false);
    setShowIpaHint(false);
    setDictIndex((prev) => (prev + 1) % savedVocab.length);
  };

  const maskedHint = currentDictWord
    ? `${currentDictWord.word[0]} ${'_ '.repeat(Math.max(0, currentDictWord.word.length - 1)).trim()} (${currentDictWord.word.length} chữ cái)`
    : '';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Luyện tập từ vựng tương tác ({savedVocab.length} từ đã lưu)
          </h3>
          <p className="text-xs text-slate-500">
            Ôn tập trí nhớ bằng Flashcard, Trắc nghiệm, Ghép nghĩa và Nghe viết chính tả tiếng Anh.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Chế độ luyện từ vựng"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(
            [
              { id: 'flashcard', label: 'Flashcard' },
              { id: 'quiz', label: 'Trắc nghiệm' },
              { id: 'match', label: 'Ghép nghĩa' },
              { id: 'dictation', label: 'Nghe viết chính tả' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => setMode(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mode === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: FLASHCARDS */}
      {mode === 'flashcard' && currentCard && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
            <span>
              Thẻ {cardIndex + 1}/{savedVocab.length} · {currentCard.bandLevel}
            </span>
            <button
              type="button"
              onClick={() => handleSpeak(currentCard.word)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Volume2 className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
              <span>Nghe phát âm</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center sm:p-8">
            <p className="font-mono text-xs font-medium text-slate-500">
              {currentCard.ipa} · {currentCard.pos}
            </p>
            <h4 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {currentCard.word}
            </h4>

            {isFlipped ? (
              <div className="mx-auto mt-5 max-w-xl space-y-2.5 border-t border-slate-200 pt-4 text-sm">
                <p className="text-base font-bold text-blue-800">{currentCard.meaningVi}</p>
                <p className="font-serif italic text-slate-700">
                  &ldquo;{currentCard.contextQuote}&rdquo;
                </p>
                {currentCard.collocations.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Cụm từ đi kèm: {currentCard.collocations.join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Thử nhớ nghĩa tiếng Việt rồi nhấn nút bên dưới để lật thẻ.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {isFlipped ? 'Ẩn nghĩa' : 'Lật thẻ xem nghĩa'}
              </button>
              <button
                type="button"
                onClick={() => onToggleMastered(currentCard.id)}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold ${
                  currentCard.mastered
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {currentCard.mastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNextCard(-1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Thẻ trước</span>
            </button>
            <button
              type="button"
              onClick={() => handleNextCard(1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>Thẻ tiếp theo</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: MULTIPLE CHOICE QUIZ */}
      {mode === 'quiz' && currentQuiz && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
            <span>
              Câu {quizIndex + 1}/{quizQuestions.length} · Điểm hiện tại:{' '}
              <strong className="font-mono text-slate-900">
                {quizScore}/{quizAnsweredCount}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => handleSpeak(currentQuiz.word)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Volume2 className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
              <span>Nghe từ</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs text-slate-500">
              Chọn nghĩa tiếng Việt đúng cho từ vựng sau ({currentQuiz.pos}):
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
              <h4 className="text-xl font-bold text-slate-900">{currentQuiz.word}</h4>
              <span className="font-mono text-xs text-slate-500">{currentQuiz.ipa}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentQuiz.options.map((opt) => {
                const isChosen = selectedOption === opt;
                const isAnswer = opt === currentQuiz.correctMeaning;
                let style = 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100';
                if (selectedOption !== null) {
                  if (isAnswer) {
                    style = 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold';
                  } else if (isChosen) {
                    style = 'border-red-300 bg-red-50 text-red-900';
                  } else {
                    style = 'border-slate-200 bg-white text-slate-400';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => handleSelectQuizOption(opt)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && (
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {selectedOption === currentQuiz.correctMeaning ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-800">Chính xác!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span className="text-red-800">
                        Chưa đúng. Đáp án: {currentQuiz.correctMeaning}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  {quizIndex + 1 < quizQuestions.length ? 'Câu tiếp theo' : 'Làm vòng Quiz mới'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: DEFINITION MATCHING */}
      {mode === 'match' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
            <span>
              Đã ghép:{' '}
              <strong className="font-mono text-slate-900">
                {matchedIds.size}/{matchBoard.pairs.length} cặp
              </strong>{' '}
              · Số lần chọn: <strong className="font-mono text-slate-900">{matchAttempts}</strong>
            </span>
            <button
              type="button"
              onClick={handleResetMatch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chơi lại bảng ghép</span>
            </button>
          </div>

          {matchErrorMsg && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              {matchErrorMsg}
            </p>
          )}

          {matchedIds.size === matchBoard.pairs.length && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
              <span>
                Hoàn thành bảng ghép {matchBoard.pairs.length} cặp từ trong {matchAttempts} lượt chọn!
              </span>
              <button
                type="button"
                onClick={handleResetMatch}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-800"
              >
                Xáo trộn lại
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">1. Chọn từ tiếng Anh</p>
              {matchBoard.leftWords.map((item) => {
                const isMatched = matchedIds.has(item.id);
                const isSelected = selectedLeftId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => {
                      setSelectedLeftId(item.id);
                      setMatchErrorMsg('');
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : isSelected
                          ? 'border-blue-700 bg-blue-50 text-blue-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">{item.word}</span>
                    <span className="font-mono text-xs text-slate-500">{item.ipa}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">2. Chọn nghĩa tiếng Việt tương ứng</p>
              {matchBoard.rightMeanings.map((item) => {
                const isMatched = matchedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handleClickRightMeaning(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                      isMatched
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium'
                        : selectedLeftId
                          ? 'border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50/40'
                          : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span>{item.meaningVi}</span>
                    {isMatched && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: ENGLISH LISTENING & SPELLING DICTATION */}
      {mode === 'dictation' && currentDictWord && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
            <span>
              Từ {dictIndex + 1}/{savedVocab.length} · Đúng chính tả:{' '}
              <strong className="font-mono text-slate-900">
                {dictCorrectCount}/{dictTotalChecked}
              </strong>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="dictation-accent" className="text-xs font-medium text-slate-600">
                Giọng đọc:
              </label>
              <select
                id="dictation-accent"
                value={accent}
                onChange={(e) => setAccent(e.target.value as 'en-GB' | 'en-US')}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
              >
                <option value="en-GB">Anh - Anh (UK)</option>
                <option value="en-US">Anh - Mỹ (US)</option>
              </select>

              <button
                type="button"
                aria-pressed={speechRate < 0.9}
                onClick={() => setSpeechRate((r) => (r < 0.9 ? 0.95 : 0.72))}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  speechRate < 0.9
                    ? 'border-blue-700 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {speechRate < 0.9 ? 'Tốc độ chậm (0.7x)' : 'Tốc độ chuẩn'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Nghe phát âm tiếng Anh và viết đúng chính tả của từ ({currentDictWord.pos} ·{' '}
                  {currentDictWord.bandLevel}):
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  Nghĩa: {currentDictWord.meaningVi}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSpeak(currentDictWord.word)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  <span>Nghe từ tiếng Anh</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSpeak(currentDictWord.contextQuote)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                >
                  <Volume2 className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span>Nghe câu ví dụ</span>
                </button>
              </div>
            </div>

            {ttsNotice && <p className="text-xs text-amber-800">{ttsNotice}</p>}

            {/* Optional Hints */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLetterHint((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{showLetterHint ? 'Ẩn gợi ý chữ cái' : 'Gợi ý chữ cái đầu'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowIpaHint((v) => !v)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
              >
                {showIpaHint ? 'Ẩn phiên âm IPA' : 'Xem phiên âm IPA'}
              </button>

              {showLetterHint && (
                <span className="font-mono font-semibold text-slate-800">{maskedHint}</span>
              )}
              {showIpaHint && (
                <span className="font-mono font-semibold text-blue-800">{currentDictWord.ipa}</span>
              )}
            </div>

            {/* Dictation Form */}
            <form onSubmit={handleCheckDictation} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="dictation-input" className="sr-only">
                Nhập chính tả tiếng Anh
              </label>
              <input
                id="dictation-input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                disabled={Boolean(dictResult)}
                value={dictInput}
                onChange={(e) => setDictInput(e.target.value)}
                placeholder="Gõ chính tả từ tiếng Anh bạn vừa nghe..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none disabled:bg-slate-100"
              />
              {!dictResult ? (
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Kiểm tra chính tả
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextDictation}
                  className="rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  Từ tiếp theo
                </button>
              )}
            </form>

            {dictResult && (
              <div
                data-testid="dictation-feedback"
                className={`rounded-lg border p-3.5 text-xs ${
                  dictResult.isCorrect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    {dictResult.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        <span>Chính xác! Chính tả: {currentDictWord.word}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                        <span>
                          Chưa đúng (bạn gõ &ldquo;{dictResult.normalizedInput}&rdquo; — đúng{' '}
                          {dictResult.matchingPrefixLength} ký tự đầu). Đáp án đúng:{' '}
                          <strong className="font-mono text-sm">{currentDictWord.word}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMastered(currentDictWord.id)}
                    className="rounded border border-current/25 bg-white px-2.5 py-1 font-semibold hover:bg-slate-50"
                  >
                    {currentDictWord.mastered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
                  </button>
                </div>

                <p className="mt-2 font-serif italic text-slate-700">
                  Ngữ cảnh: &ldquo;{currentDictWord.contextQuote}&rdquo; ({currentDictWord.ipa})
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
