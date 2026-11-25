import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefinitionMatchBoard,
  buildVocabQuizQuestions,
  checkDictationSpelling,
} from './vocabPractice';
import type { SavedVocabEntry, VocabItem } from '../types/ielts';

const sampleSaved: SavedVocabEntry[] = [
  {
    id: 'w1',
    word: 'triple',
    ipa: '/ˈtrɪp.əl/',
    pos: 'v.',
    bandLevel: 'Band 5.5',
    meaningVi: 'tăng gấp ba lần',
    collocations: ['triple in size'],
    contextQuote: 'beehives tripled between 2015 and 2023',
    paragraphRef: 'A',
    testId: 't1',
    testTitle: 'Test 1',
    savedAt: '2026-11-24T00:00:00Z',
    mastered: false,
  },
  {
    id: 'w2',
    word: 'scarcity',
    ipa: '/ˈskeə.sə.ti/',
    pos: 'n.',
    bandLevel: 'Band 7.5',
    meaningVi: 'sự khan hiếm',
    collocations: ['acute scarcity'],
    contextQuote: 'an acute scarcity of surviving text',
    paragraphRef: 'B',
    testId: 't2',
    testTitle: 'Test 2',
    savedAt: '2026-11-24T00:00:00Z',
    mastered: false,
  },
];

const pool: VocabItem[] = [
  {
    id: 'p1',
    word: 'arid',
    ipa: '/ˈær.ɪd/',
    pos: 'adj.',
    bandLevel: 'Band 7.0',
    meaningVi: 'khô cằn, ít mưa',
    collocations: [],
    contextQuote: '',
    paragraphRef: 'A',
  },
  {
    id: 'p2',
    word: 'moratorium',
    ipa: '/ˌmɒr.əˈtɔː.ri.əm/',
    pos: 'n.',
    bandLevel: 'Band 8.0',
    meaningVi: 'lệnh tạm hoãn',
    collocations: [],
    contextQuote: '',
    paragraphRef: 'D',
  },
];

test('buildVocabQuizQuestions produces 4 unique options including the correct meaning', () => {
  const questions = buildVocabQuizQuestions(sampleSaved, pool, 10);
  assert.equal(questions.length, 2);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.correctMeaning));
    assert.equal(new Set(q.options).size, 4);
  }
});

test('buildDefinitionMatchBoard builds matching left words and shuffled right meanings', () => {
  const board = buildDefinitionMatchBoard(sampleSaved, 6, 3);
  assert.equal(board.pairs.length, 2);
  assert.equal(board.leftWords.length, 2);
  assert.equal(board.rightMeanings.length, 2);
  const ids = new Set(board.rightMeanings.map((r) => r.id));
  assert.ok(ids.has('w1') && ids.has('w2'));
});

test('checkDictationSpelling validates case-insensitive exact spelling and prefix match', () => {
  const exact = checkDictationSpelling('  Scarcity ', 'scarcity');
  assert.equal(exact.isCorrect, true);
  assert.equal(exact.matchingPrefixLength, 8);

  const typo = checkDictationSpelling('scarsity', 'scarcity');
  assert.equal(typo.isCorrect, false);
  assert.equal(typo.matchingPrefixLength, 4);

  const blank = checkDictationSpelling('   ', 'triple');
  assert.equal(blank.isCorrect, false);
});
