"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { QuestionPdf, type QuestionPdfOptions } from "@/lib/pdf/QuestionPdf";
import type { GeneratedQuestion } from "@/types/question";

// SSR で @react-pdf/renderer を読み込まないようクライアント限定
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <PreviewPending /> }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

function PreviewPending() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      プレビューを準備しています…
    </div>
  );
}

type Props = {
  questions: GeneratedQuestion[];
  onClose: () => void;
};

// PDF プレビュー + ダウンロード（README §3.13 / §3.14 / §5.3）
export function PdfPreviewModal({ questions, onClose }: Props) {
  const [title, setTitle] = useState("ウイスキーエキスパート 予想問題集");
  const [includeAnswer, setIncludeAnswer] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [onlySelected, setOnlySelected] = useState(true);

  const filtered = onlySelected ? questions.filter((q) => q.selected) : questions;
  const options: QuestionPdfOptions = {
    title,
    includeAnswer,
    includeExplanation,
  };

  const fileName = `${title || "questions"}.pdf`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">PDF プレビュー</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-3 py-1 text-sm hover:bg-stone-50"
          >
            閉じる
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 overflow-y-auto border-r p-5">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">PDF タイトル</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border bg-white px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAnswer}
                onChange={(e) => setIncludeAnswer(e.target.checked)}
              />
              正解を含める
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeExplanation}
                onChange={(e) => setIncludeExplanation(e.target.checked)}
              />
              解説を含める
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(e) => setOnlySelected(e.target.checked)}
              />
              選択した問題のみ出力
            </label>

            <p className="text-xs text-muted-foreground">
              出力対象: {filtered.length} 問 / {questions.length} 問
            </p>

            {filtered.length > 0 ? (
              <PDFDownloadLink
                document={<QuestionPdf questions={filtered} options={options} />}
                fileName={fileName}
                className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {({ loading }) => (loading ? "PDF を生成中…" : "PDF をダウンロード")}
              </PDFDownloadLink>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
                出力する問題が選択されていません。
              </p>
            )}
          </aside>

          <div className="flex-1 overflow-hidden bg-stone-100">
            {filtered.length > 0 ? (
              <PDFViewer
                key={`${title}|${includeAnswer}|${includeExplanation}|${onlySelected}|${filtered.length}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                showToolbar={false}
              >
                <QuestionPdf questions={filtered} options={options} />
              </PDFViewer>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                出力する問題がありません。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
