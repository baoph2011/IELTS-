import React, { useState } from 'react';
import { CheckCircle2, Eye, Highlighter, Search } from 'lucide-react';

type DemoMode = 'normal' | 'skim' | 'scan';

const DEMO_PARAGRAPH =
  'In 1928, Scottish bacteriologist Alexander Fleming noticed that a mould called Penicillium notatum prevented bacteria from growing on a laboratory dish. However, turning that observation into a mass-produced medicine required another decade of chemical purification at Oxford University. Consequently, by 1944, Allied field hospitals were treating thousands of wounded soldiers with penicillin.';

const TARGET_SCAN_TOKEN = '1944';

export const SkimScanLabView: React.FC = () => {
  const [demoMode, setDemoMode] = useState<DemoMode>('skim');
  const [drillFound, setDrillFound] = useState(false);

  const renderDemoText = () => {
    if (demoMode === 'normal') {
      return DEMO_PARAGRAPH;
    }

    if (demoMode === 'skim') {
      const signposts = ['However', 'Consequently'];
      const parts = DEMO_PARAGRAPH.split(/(However|Consequently)/g);
      return parts.map((part, idx) => {
        if (signposts.includes(part)) {
          return (
            <mark
              key={idx}
              className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-950 ring-1 ring-amber-300"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      });
    }

    // Scan mode: highlight dates, proper nouns, and make target token clickable
    const scanTokens = ['1928', 'Alexander Fleming', 'Penicillium notatum', 'Oxford University', '1944'];
    const regex = new RegExp(`(${scanTokens.join('|')})`, 'g');
    const parts = DEMO_PARAGRAPH.split(regex);
    return parts.map((part, idx) => {
      if (!scanTokens.includes(part)) {
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      }
      const isTarget = part === TARGET_SCAN_TOKEN;
      return (
        <button
          key={idx}
          type="button"
          onClick={() => {
            if (isTarget) setDrillFound(true);
          }}
          className={`mx-0.5 inline rounded px-1 py-0.5 font-semibold transition-colors ${
            isTarget && drillFound
              ? 'bg-emerald-200 text-emerald-950 ring-1 ring-emerald-500'
              : 'bg-sky-100 text-sky-950 ring-1 ring-sky-300 hover:bg-sky-200'
          }`}
        >
          {part}
        </button>
      );
    });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Chiến lược Skim &amp; Scan để tăng tốc làm bài Reading IELTS
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          IELTS Reading yêu cầu xử lý hơn 2.500 từ trong 60 phút. Kết hợp nhuần nhuyễn Skimming (đọc
          lướt khung ý) và Scanning (quét từ khóa định vị) giúp tiết kiệm 30–40% thời gian và tránh
          bẫy nhiễu.
        </p>
      </div>

      {/* Skimming vs Scanning Comparison */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-amber-800">
            <Highlighter className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">1. Skimming — Đọc lướt lấy bản đồ ý chính</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Dùng trong <strong>60–90 giây đầu tiên</strong> trước khi làm Matching Headings hoặc câu hỏi ý
            chính toàn bài.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>• Đọc tiêu đề chính, tiêu đề phụ và 2 câu đầu tiên của đoạn A.</li>
            <li>• Đọc câu đầu (Topic Sentence) và câu cuối mỗi đoạn để nắm hướng lập luận.</li>
            <li>
              • Chú ý các từ nối chuyển ý: <span className="font-mono text-xs">However, Instead, Consequently, Despite</span>.
            </li>
            <li>• Bỏ qua số liệu chi tiết hoặc ví dụ phụ trong lần đọc lướt đầu tiên.</li>
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sky-800">
            <Search className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">2. Scanning — Đọc quét tìm vị trí chính xác</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Dùng ngay sau khi đọc câu hỏi (TFNG, Điền từ, Trắc nghiệm) để định vị đúng câu chứa đáp
            án.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>• Gạch chân từ khóa khó thay thế trong câu hỏi: năm, phần trăm, tên riêng, thuật ngữ.</li>
            <li>• Di chuyển mắt theo đường zic-zac từ trên xuống dưới, không đọc từng chữ.</li>
            <li>• Khi thấy từ khóa định vị, đọc kỹ trọn vẹn câu trước và câu sau để kiểm tra paraphrase.</li>
            <li>• Nhớ quy luật thứ tự: TFNG/YNNG và Điền từ thường xuất hiện theo thứ tự từ trên xuống.</li>
          </ul>
        </article>
      </section>

      {/* Interactive Live Skim/Scan Lab */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Thực hành trực quan: Chuyển đổi chế độ Skim &amp; Scan
            </h2>
            <p className="text-xs text-slate-600">
              Chuyển giữa các chế độ để quan sát mắt người thi Band 8.5+ tập trung vào vùng thông tin nào.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'normal', label: 'Đọc thường' },
                { id: 'skim', label: 'Mô phỏng Skim' },
                { id: 'scan', label: 'Mô phỏng Scan' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setDemoMode(m.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  demoMode === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
          {demoMode === 'skim' && (
            <p className="mb-3 text-xs font-semibold text-amber-900">
              Gợi ý Skim: Nắm nhanh khung thời gian &rarr; Alexander Fleming phát hiện nấm mốc (1928),
              nhưng phải mất thêm 10 năm tinh chế tại Oxford trước khi dùng rộng rãi.
            </p>
          )}
          {demoMode === 'scan' && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-sky-900">
                Bài tập Scan nhanh: Nhấp chuột vào năm quân đội Đồng Minh bắt đầu dùng penicillin điều trị hàng loạt.
              </span>
              {drillFound && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Chính xác! Năm 1944.</span>
                </span>
              )}
            </div>
          )}
          <p className="passage-prose">{renderDemoText()}</p>
        </div>
      </section>

      {/* Question Type Tactical Playbook */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <h2 className="text-base font-bold text-slate-900">
            Mẹo xử lý từng dạng bài IELTS Reading phổ biến
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">True / False / Not Given &amp; YNNG</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              <strong>FALSE / NO</strong> khi bài đọc có thông tin mâu thuẫn trực tiếp (trái nghĩa, sai số lượng, đảo ngược so sánh).{' '}
              <strong>NOT GIVEN</strong> khi có từ khóa xuất hiện nhưng thiếu mối quan hệ được hỏi — tuyệt đối không tự suy diễn theo kiến thức ngoài bài.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Matching Headings (Nối tiêu đề)</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Làm sau khi Skim câu đầu + câu cuối từng đoạn. Cảnh giác bẫy trùng từ: một tiêu đề chứa y nguyên một từ trong ví dụ phụ của đoạn nhưng không phản ánh ý bao trùm cả đoạn.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Summary / Sentence Completion (Điền từ)</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Xác định trước loại từ cần điền (danh từ số ít/nhiều, động từ V-ing, tính từ) và giới hạn số từ (ONE WORD ONLY). Giữ nguyên chính tả và dạng từ lấy trực tiếp từ bài đọc.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Multiple Choice (Band 7.5–9.0)</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Thường có 1–2 phương án chứa từ khóa giống hệt bài đọc nhưng sai logic ("distractors"). Đáp án đúng hầu như luôn được diễn đạt lại (paraphrase) bằng cấu trúc học thuật tương đương.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
