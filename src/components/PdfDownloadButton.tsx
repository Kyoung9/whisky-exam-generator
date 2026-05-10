"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { GeneratedQuestion } from "@/types/question";

// PdfPreviewModal は @react-pdf/renderer を抱えるためクライアント側で遅延ロード
const PdfPreviewModal = dynamic(
  () => import("@/components/PdfPreviewModal").then((m) => m.PdfPreviewModal),
  { ssr: false }
);

type Props = {
  questions: GeneratedQuestion[];
};

// PDF プレビューモーダルを開くトリガー
export function PdfDownloadButton({ questions }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = questions.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        PDF プレビュー / ダウンロード
      </button>
      {open && (
        <PdfPreviewModal questions={questions} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
