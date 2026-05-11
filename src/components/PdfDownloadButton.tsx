"use client";

import type { GeneratedQuestion } from "@/types/question";

type Props = {
  questions: GeneratedQuestion[];
  /** 親で PdfPreviewModal を body 付近にマウントし、ここでは開くだけ */
  onOpen: () => void;
};

// アンバーゴールドの四角い一次CTA — PDF プレビューモーダル開閉は親が担当
export function PdfDownloadButton({ questions, onOpen }: Props) {
  const disabled = questions.length === 0;

  return (
    <button
      type="button"
      onClick={() => onOpen()}
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
  );
}
