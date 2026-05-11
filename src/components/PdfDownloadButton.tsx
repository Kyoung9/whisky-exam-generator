"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { GeneratedQuestion } from "@/types/question";

// PdfPreviewModal は @react-pdf/renderer を抱えるためクライアント側で遅延ロード
const PdfPreviewModal = dynamic(
  () =>
    import("@/components/PdfPreviewModal").then((m) => m.PdfPreviewModal),
  { ssr: false },
);

type Props = {
  questions: GeneratedQuestion[];
};

// アンバーゴールドの四角い一次CTA — PDF プレビューモーダルを開くトリガー
export function PdfDownloadButton({ questions }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = questions.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="amber-cta w-full"
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
        >
          picture_as_pdf
        </span>
        PDF プレビュー / ダウンロード
      </button>
      {open && (
        <PdfPreviewModal
          questions={questions}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
