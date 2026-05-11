"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { createPortal } from "react-dom";
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

// PDF プレビュー + ダウンロード — ポータルで body 直下に載せフルビューポート相当に
const PREVIEW_ZOOM_OPTIONS = [0.75, 0.9, 1, 1.25, 1.5] as const;

export function PdfPreviewModal({ questions, onClose }: Props) {
  const [title, setTitle] = useState("ウイスキーエキスパート 予想問題集");
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [onlySelected, setOnlySelected] = useState(true);
  /** プレビュー表示倍率（transform: scale。iOS では CSS zoom が iframe と相性悪いため使わない） */
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  const filtered = onlySelected
    ? questions.filter((q) => q.selected)
    : questions;
  const options: QuestionPdfOptions = {
    title,
    includeAnswer,
    includeExplanation,
  };

  const fileName = `${title || "questions"}.pdf`;

  const modal = (
    <div
      className="bg-background-deep/80 fixed inset-0 z-[100] flex flex-col items-center justify-center p-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="pdf-preview-title"
    >
      <div className="glass-panel flex h-[min(100dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-[min(56rem,calc(100vw-1rem))] min-h-0 flex-col overflow-hidden rounded-xl sm:max-h-[min(98dvh,calc(100dvh-2rem))]">
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

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] overflow-hidden lg:grid-cols-[minmax(220px,280px)_1fr] lg:grid-rows-1">
          <aside className="border-glass-stroke max-h-[min(40dvh,320px)] shrink-0 space-y-4 overflow-y-auto border-b p-4 sm:space-y-5 sm:p-5 lg:max-h-none lg:border-r lg:border-b-0">
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
              <label className="wq-checkbox-row wq-checkbox-row--compact text-body-lg font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={includeAnswer}
                  onChange={(e) => setIncludeAnswer(e.target.checked)}
                />
                <span>正解を含める</span>
              </label>
              <label className="wq-checkbox-row wq-checkbox-row--compact text-body-lg font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={includeExplanation}
                  onChange={(e) => setIncludeExplanation(e.target.checked)}
                />
                <span>解説を含める</span>
              </label>
              <label className="wq-checkbox-row wq-checkbox-row--compact text-body-lg font-[family-name:var(--font-body-lg)]">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                />
                <span>選択した問題のみ出力</span>
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

          <div className="bg-surface-container-low/60 flex min-h-0 flex-1 flex-col overflow-hidden">
            {filtered.length > 0 ? (
              <>
                <div className="border-glass-stroke flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-2 sm:px-4">
                  <label className="text-label-caps text-on-surface-variant flex items-center gap-2 font-[family-name:var(--font-label-caps)]">
                    表示倍率
                    <select
                      value={previewZoom}
                      onChange={(e) =>
                        setPreviewZoom(Number(e.target.value) || 1)
                      }
                      className="dark-field text-body-sm rounded px-2 py-1 font-[family-name:var(--font-body-sm)]"
                    >
                      {PREVIEW_ZOOM_OPTIONS.map((z) => (
                        <option key={z} value={z} className="bg-surface-charcoal">
                          {Math.round(z * 100)}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                    プレビューのみ（ダウンロード PDF は常に 100%）
                  </span>
                </div>
                {/* 高さは親 flex + absolute で確定させ、iframe に min-h-[70dvh] を載せない（モバイルで領域外にはみ出すのを防ぐ） */}
                <div className="relative min-h-0 flex-1">
                  <div
                    className="absolute inset-0 overflow-auto [-webkit-overflow-scrolling:touch]"
                    style={{ touchAction: "pan-x pan-y" }}
                  >
                    <div
                      className="box-border"
                      style={{
                        width: `${100 / previewZoom}%`,
                        height: `${100 / previewZoom}%`,
                        transform: `scale(${previewZoom})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <PDFViewer
                        key={`${title}|${includeAnswer}|${includeExplanation}|${onlySelected}|${filtered.length}`}
                        className="block h-full min-h-0 w-full"
                        style={{
                          width: "100%",
                          height: "100%",
                          minHeight: 0,
                          border: "none",
                          display: "block",
                        }}
                        showToolbar={false}
                      >
                        <QuestionPdf questions={filtered} options={options} />
                      </PDFViewer>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-body-sm text-on-surface-variant flex h-full min-h-[200px] items-center justify-center p-6 font-[family-name:var(--font-body-sm)]">
                出力する問題がありません。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
