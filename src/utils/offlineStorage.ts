import type {
  ReadingTest,
  ReminderSettings,
  SavedVocabEntry,
  TestAttempt,
  UserProfile,
} from '../types/ielts';

const DB_NAME = 'lexisband_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_tests';

const STORAGE_KEYS = {
  ATTEMPTS: 'lexisband_attempts_v1',
  VOCAB: 'lexisband_saved_vocab_v1',
  REMINDERS: 'lexisband_reminders_v1',
  PROFILE: 'lexisband_profile_v1',
  OFFLINE_FALLBACK: 'lexisband_offline_tests_fallback_v1',
  OFFLINE_SIMULATION: 'lexisband_offline_sim_v1',
};

export interface OfflineTestRecord {
  id: string;
  downloadedAt: string;
  test: ReadingTest;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open error'));
  });
}

export async function getOfflineTests(): Promise<OfflineTestRecord[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineTestRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_FALLBACK);
      return raw ? (JSON.parse(raw) as OfflineTestRecord[]) : [];
    } catch {
      return [];
    }
  }
}

export async function saveOfflineTest(test: ReadingTest): Promise<OfflineTestRecord[]> {
  const record: OfflineTestRecord = {
    id: test.id,
    downloadedAt: new Date().toISOString(),
    test,
  };
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage
  }
  const existing = loadOfflineFallback();
  const next = [record, ...existing.filter((r) => r.id !== test.id)];
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_FALLBACK, JSON.stringify(next));
  } catch {
    // Ignore quota errors
  }
  return getOfflineTests();
}

export async function saveOfflineBatch(tests: ReadingTest[]): Promise<OfflineTestRecord[]> {
  for (const t of tests) {
    await saveOfflineTest(t);
  }
  return getOfflineTests();
}

export async function removeOfflineTest(testId: string): Promise<OfflineTestRecord[]> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(testId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
  const existing = loadOfflineFallback().filter((r) => r.id !== testId);
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_FALLBACK, JSON.stringify(existing));
  } catch {
    // Ignore
  }
  return getOfflineTests();
}

function loadOfflineFallback(): OfflineTestRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_FALLBACK);
    return raw ? (JSON.parse(raw) as OfflineTestRecord[]) : [];
  } catch {
    return [];
  }
}

export function loadAttempts(): TestAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    return raw ? (JSON.parse(raw) as TestAttempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempts(attempts: TestAttempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  } catch {
    // Ignore quota errors
  }
}

export function loadSavedVocab(): SavedVocabEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCAB);
    return raw ? (JSON.parse(raw) as SavedVocabEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedVocab(vocab: SavedVocabEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(vocab));
  } catch {
    // Ignore
  }
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  weeklyTarget: 2,
  enabled: true,
  preferredDays: [3, 6], // Wednesday & Saturday
  reminderTime: '20:00',
  browserNotificationsEnabled: false,
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: 'Học viên LexisBand',
  targetBand: 7.5,
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_USER_PROFILE;
    return { ...DEFAULT_USER_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) };
  } catch {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}

export function loadOfflineSimulation(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.OFFLINE_SIMULATION) === '1';
  } catch {
    return false;
  }
}

export function saveOfflineSimulation(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_SIMULATION, enabled ? '1' : '0');
  } catch {
    // Ignore
  }
}

/**
 * Exports a clean, self-contained HTML study sheet for offline reading & printing on any device.
 */
export function exportOfflineWorksheet(test: ReadingTest): void {
  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const passagesAndQuestionsHtml =
    test.isFullIeltsTest && test.sections && test.sections.length > 0
      ? test.sections
          .map((section) => {
            const sectionQuestions = test.questions.filter(
              (q) => q.sectionNumber === section.sectionNumber
            );
            return `
              <h2>${escapeHtml(section.label)} — ${escapeHtml(section.passageTitle)} (${escapeHtml(section.bandRange)})</h2>
              <p><em>${escapeHtml(section.passageSubtitle)}</em></p>
              ${section.paragraphs
                .map(
                  (p) =>
                    `<div class="para"><strong>[${escapeHtml(p.id)}]</strong> ${escapeHtml(p.text)}</div>`
                )
                .join('\n')}
              <h3>Câu hỏi ${escapeHtml(section.label)}</h3>
              ${sectionQuestions
                .map(
                  (q) =>
                    `<div class="q"><strong>Câu ${q.number}:</strong> ${escapeHtml(q.prompt)}${
                      q.options ? `<br/>Lựa chọn: ${q.options.map(escapeHtml).join(' | ')}` : ''
                    }</div>`
                )
                .join('\n')}
            `;
          })
          .join('\n')
      : `
          <p><em>${escapeHtml(test.passageSubtitle)}</em></p>
          ${test.paragraphs
            .map(
              (p) =>
                `<div class="para"><strong>[${escapeHtml(p.id)}]</strong> ${escapeHtml(p.text)}</div>`
            )
            .join('\n')}
          <h2>Câu hỏi (${test.questions.length} câu)</h2>
          ${test.questions
            .map(
              (q) =>
                `<div class="q"><strong>Câu ${q.number}:</strong> ${escapeHtml(q.prompt)}${
                  q.options ? `<br/>Lựa chọn: ${q.options.map(escapeHtml).join(' | ')}` : ''
                }</div>`
            )
            .join('\n')}
        `;

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(test.passageTitle)} — Band ${test.targetBand.toFixed(1)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #0f172a; line-height: 1.7; }
    h1 { font-family: system-ui, sans-serif; font-size: 26px; margin-bottom: 4px; }
    .meta { font-family: system-ui, sans-serif; font-size: 13px; color: #475569; margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
    .para { margin-bottom: 16px; }
    .para strong { font-family: system-ui, sans-serif; margin-right: 6px; }
    h2 { font-family: system-ui, sans-serif; font-size: 18px; margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    h3 { font-family: system-ui, sans-serif; font-size: 15px; margin-top: 20px; color: #1e293b; }
    .q { margin-bottom: 14px; font-family: system-ui, sans-serif; font-size: 14px; }
    details { margin-top: 24px; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 14px; }
    summary { font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <h1>${escapeHtml(test.isFullIeltsTest ? test.title : test.passageTitle)}</h1>
  <div class="meta">LexisBand Offline Pack · Band ${test.targetBand.toFixed(1)} · ${escapeHtml(test.topic)} · ${test.recommendedMinutes} phút · ${test.questions.length} câu</div>
  ${passagesAndQuestionsHtml}
  <h2>Từ vựng trọng tâm</h2>
  <ul>
    ${test.vocabulary
      .map(
        (v) =>
          `<li><strong>${escapeHtml(v.word)}</strong> ${escapeHtml(v.ipa)} (${escapeHtml(v.pos)})${
            v.sectionNumber ? ` [Passage ${v.sectionNumber}]` : ''
          } — ${escapeHtml(v.meaningVi)}</li>`
      )
      .join('\n')}
  </ul>
  <details>
    <summary>Xem đáp án và giải thích chi tiết</summary>
    <ol>
      ${test.questions
        .map(
          (q) =>
            `<li><strong>${escapeHtml(q.acceptedAnswers[0])}</strong> (${
              q.sectionNumber ? `Passage ${q.sectionNumber} · ` : ''
            }Đoạn ${escapeHtml(q.paragraphRef)}): ${escapeHtml(q.explanationVi)}</li>`
        )
        .join('\n')}
    </ol>
  </details>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lexisband-${test.id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a recurring .ics calendar reminder for at least 2 IELTS Reading sessions per week.
 */
export function downloadWeeklyReminderICS(settings: ReminderSettings): void {
  const dayCodes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const selectedDays =
    settings.preferredDays.length >= 2
      ? settings.preferredDays.map((d) => dayCodes[d]).join(',')
      : 'WE,SA';

  const [hh, mm] = settings.reminderTime.split(':').map((n) => n.padStart(2, '0'));
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LexisBand//IELTS Reading Weekly Reminder//VI',
    'BEGIN:VEVENT',
    `UID:lexisband-weekly-${Date.now()}@lexisband.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${y}${m}${d}T${hh || '20'}${mm || '00'}00`,
    'DURATION:PT25M',
    `RRULE:FREQ=WEEKLY;BYDAY=${selectedDays}`,
    'SUMMARY:Luyện Reading IELTS (Mục tiêu tối thiểu 2 bài/tuần)',
    'DESCRIPTION:Hoàn thành ít nhất 1 bài Reading IELTS trên LexisBand để duy trì phong độ và ghi nhận tiến độ.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lexisband-weekly-reading-reminder.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
