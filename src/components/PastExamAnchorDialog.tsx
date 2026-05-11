"use client";

import { getPastExamQuestionById } from "@/lib/exams";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
} from "@/types/question";

type Props = {
  pastExamId: string;
  onClose: () => void;
};

// 地図再利用生成時に紐づいた過去問を表示するモーダル
export function PastExamAnchorDialog({ pastExamId, onClose }: Props) {
  const past = getPastExamQuestionById(pastExamId);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="past-anchor-title"
    >
      <div className="glass-panel max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl p-5 sm:max-w-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-amber-gold"
              aria-hidden="true"
            >
              history_edu
            </span>
            <h3
              id="past-anchor-title"
              className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]"
            >
              参照した過去問
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-on-surface-variant hover:text-amber-gold rounded-full p-2 transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {!past ? (
          <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
            過去問データが見つかりません（id: {pastExamId}）。
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              {past.year} 年試験 · 第{past.number}問
              {past.subNumber ? ` (${past.subNumber})` : ""} ·{" "}
              {QUESTION_TYPE_LABELS[past.type]} ·{" "}
              {DIFFICULTY_LABELS[past.difficulty]}
            </p>
            <p className="text-body-sm text-amber-gold/90 border-amber-gold/30 rounded border border-dashed px-3 py-2 font-[family-name:var(--font-body-sm)]">
              生成された地図問題は、この問題と同じ図版（番号の配置）を使っています。AI
              は画像ピクセルを見ずテキスト説明のみで番号を推定するため、正解番号は実図とずれることがあります。
            </p>
            <div>
              <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                テーマ
              </span>
              <p className="text-body-sm text-on-surface mt-1 font-[family-name:var(--font-body-sm)]">
                {past.theme}
              </p>
            </div>
            <div>
              <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                本文（過去問）
              </span>
              <p className="text-body-lg text-on-surface mt-1 whitespace-pre-wrap font-[family-name:var(--font-body-lg)]">
                {past.body}
              </p>
            </div>
            {past.imageRef && (
              <figure className="border-glass-stroke overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={past.imageRef}
                  alt={past.imageDescription ?? "過去問の地図"}
                  className="mx-auto max-h-72 w-auto bg-black/20"
                />
                {past.imageDescription && (
                  <figcaption className="border-glass-stroke text-body-sm text-on-surface-variant border-t bg-black/30 px-3 py-2 font-[family-name:var(--font-body-sm)]">
                    {past.imageDescription}
                  </figcaption>
                )}
              </figure>
            )}
            {past.answer && (
              <p className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)]">
                <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
                  過去問の正解{" "}
                </span>
                {past.answer}
              </p>
            )}
            {past.explanation && (
              <div>
                <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                  過去問の解説
                </span>
                <p className="text-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap font-[family-name:var(--font-body-sm)]">
                  {past.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="amber-cta-outline">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
