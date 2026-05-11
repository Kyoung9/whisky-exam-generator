"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { QuestionPdf, type QuestionPdfOptions } from "@/lib/pdf/QuestionPdf";
import type { GeneratedQuestion } from "@/types/question";

// SSR で @react-pdf/renderer を読み込まないようクライアント限定
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <PreviewPending /> },
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false },
);

function PreviewPending() {
  return (
    <div className="text-body-sm text-on-surface-variant flex h-full items-center justify-center font-[family-name:var(--font-body-sm)]">
      <span
        className="material-symbols-outlined animate-spin mr-2"
        aria-hidden="true"
      >
        progress_activity
      </span>
      プレビューを準備しています…
    </div>
  );
}

type Props = {
  questions: GeneratedQuestion[];
  onClose: () => void;
};

// PDF プレビュー + ダウンロード (README §3.13 / §3.14 / §5.3) - WhiskyQuest dark トーン
export function PdfPreviewModal({ questions, onClose }: Props) {
  const [title, setTitle] = useState("ウイスキーエキスパート 予想問題集");
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [onlySelected, setOnlySelected] = useState(true);

  const filtered = onlySelected
    ? questions.filter((q) => q.selected)
    : questions;
  const options: QuestionPdfOptions = {
    title,
    includeAnswer,
    includeExplanation,
  };

  const fileName = `${title || "questions"}.pdf`;

  return (
    <div
      className="bg-background-deep/80 fixed inset-0 z-50 flex flex-col items-stretch p-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="pdf-preview-title"
    >
      <div className="glass-panel flex max-h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none sm:max-h-[min(900px,calc(100dvh-2rem))] sm:max-w-5xl sm:flex-initial sm:rounded-xl">
        <header className="border-glass-stroke flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 sm:py-4">
          <h3
            id="pdf-preview-title"
            className="text-headline-lg text-amber-gold flex items-center gap-2 font-[family-name:var(--font-headline-lg)]"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              picture_as_pdf
            </span>
            PDF プレビュー
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-on-surface-variant hover:text-amber-gold rounded-full p-2 transition-colors"
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(200px,1fr)] overflow-hidden lg:grid-cols-[280px_1fr] lg:grid-rows-1">
          <aside className="border-glass-stroke max-h-[42dvh] space-y-4 overflow-y-auto border-b p-4 sm:space-y-5 sm:p-5 lg:max-h-none lg:border-r lg:border-b-0">
            <label className="block space-y-2">
              <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
                PDF タイトル
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
              />
            </label>

            <div className="space-y-3">
              <label className="text-body-lg flex items-center gap-2 font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={includeAnswer}
                  onChange={(e) => setIncludeAnswer(e.target.checked)}
                  className="text-amber-gold border-amber-gold focus:ring-amber-gold h-4 w-4 rounded bg-transparent"
                />
                正解を含める
              </label>
              <label className="text-body-lg flex items-center gap-2 font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={includeExplanation}
                  onChange={(e) => setIncludeExplanation(e.target.checked)}
                  className="text-amber-gold border-amber-gold focus:ring-amber-gold h-4 w-4 rounded bg-transparent"
                />
                解説を含める
              </label>
              <label className="text-body-lg flex items-center gap-2 font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                  className="text-amber-gold border-amber-gold focus:ring-amber-gold h-4 w-4 rounded bg-transparent"
                />
                選択した問題のみ出力
              </label>
            </div>

            <p className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              出力対象: <span className="text-amber-gold">{filtered.length}</span> /{" "}
              {questions.length} 問
            </p>

            {filtered.length > 0 ? (
              <PDFDownloadLink
                document={
                  <QuestionPdf questions={filtered} options={options} />
                }
                fileName={fileName}
                className="amber-cta w-full"
              >
                {({ loading }) =>
                  loading ? (
                    <>
                      <span
                        className="material-symbols-outlined animate-spin"
                        aria-hidden="true"
                      >
                        progress_activity
                      </span>
                      PDF を生成中…
                    </>
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        download
                      </span>
                      PDF をダウンロード
                    </>
                  )
                }
              </PDFDownloadLink>
            ) : (
              <p className="border-glass-stroke text-body-sm text-on-surface-variant rounded border border-dashed px-3 py-2 text-center font-[family-name:var(--font-body-sm)]">
                出力する問題が選択されていません。
              </p>
            )}
          </aside>

          <div className="bg-surface-container-low/60 min-h-[200px] flex-1 overflow-hidden lg:min-h-0">
            {filtered.length > 0 ? (
              <PDFViewer
                key={`${title}|${includeAnswer}|${includeExplanation}|${onlySelected}|${filtered.length}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                showToolbar={false}
              >
                <QuestionPdf questions={filtered} options={options} />
              </PDFViewer>
            ) : (
              <div className="text-body-sm text-on-surface-variant flex h-full items-center justify-center p-6 font-[family-name:var(--font-body-sm)]">
                出力する問題がありません。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
