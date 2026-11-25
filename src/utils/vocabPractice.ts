import type { SavedVocabEntry, VocabItem } from '../types/ielts';

export interface VocabQuizQuestion {
  id: string;
  word: string;
  ipa: string;
  pos: string;
  bandLevel: string;
  correctMeaning: string;
  options: string[];
  contextQuote: string;
}

export interface MatchPair {
  id: string;
  word: string;
  ipa: string;
  meaningVi: string;
}

export interface DictationCheckResult {
  isCorrect: boolean;
  normalizedInput: string;
  normalizedTarget: string;
  matchingPrefixLength: number;
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildVocabQuizQuestions(
  savedVocab: SavedVocabEntry[],
  distractorPool: VocabItem[],
  seed: number = 42
): VocabQuizQuestion[] {
  if (savedVocab.length === 0) return [];

  const allMeanings = Array.from(
    new Set([
      ...savedVocab.map((v) => v.meaningVi),
      ...distractorPool.map((v) => v.meaningVi),
    ])
  );

  return savedVocab.map((entry, idx) => {
    const distractors = deterministicShuffle(
      allMeanings.filter((m) => m !== entry.meaningVi),
      seed + idx * 17
    ).slice(0, 3);

    const options = deterministicShuffle(
      [entry.meaningVi, ...distractors],
      seed + idx * 31
    );

    return {
      id: entry.id,
      word: entry.word,
      ipa: entry.ipa,
      pos: entry.pos,
      bandLevel: entry.bandLevel,
      correctMeaning: entry.meaningVi,
      options,
      contextQuote: entry.contextQuote,
    };
  });
}

export function buildDefinitionMatchBoard(
  savedVocab: SavedVocabEntry[],
  maxPairs: number = 6,
  seed: number = 7
): {
  pairs: MatchPair[];
  leftWords: Array<{ id: string; word: string; ipa: string }>;
  rightMeanings: Array<{ id: string; meaningVi: string }>;
} {
  const selected = savedVocab.slice(0, Math.max(1, maxPairs));
  const pairs: MatchPair[] = selected.map((v) => ({
    id: v.id,
    word: v.word,
    ipa: v.ipa,
    meaningVi: v.meaningVi,
  }));

  const leftWords = pairs.map((p) => ({ id: p.id, word: p.word, ipa: p.ipa }));
  const rightMeanings = deterministicShuffle(
    pairs.map((p) => ({ id: p.id, meaningVi: p.meaningVi })),
    seed
  );

  return { pairs, leftWords, rightMeanings };
}

export function checkDictationSpelling(
  userInput: string,
  targetWord: string
): DictationCheckResult {
  const normalizedInput = userInput.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedTarget = targetWord.trim().toLowerCase().replace(/\s+/g, ' ');
  const isCorrect = normalizedInput.length > 0 && normalizedInput === normalizedTarget;

  let matchingPrefixLength = 0;
  const minLen = Math.min(normalizedInput.length, normalizedTarget.length);
  for (let i = 0; i < minLen; i += 1) {
    if (normalizedInput[i] === normalizedTarget[i]) {
      matchingPrefixLength += 1;
    } else {
      break;
    }
  }

  return {
    isCorrect,
    normalizedInput,
    normalizedTarget,
    matchingPrefixLength,
  };
}

export function speakEnglishText(
  text: string,
  options?: { rate?: number; accent?: 'en-GB' | 'en-US' }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const preferredLang = options?.accent ?? 'en-GB';
    utterance.lang = preferredLang;
    utterance.rate = options?.rate ?? 0.95;

    const voices = synth.getVoices();
    const matchedVoice =
      voices.find((v) => v.lang === preferredLang) ??
      voices.find((v) => v.lang.startsWith('en'));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
