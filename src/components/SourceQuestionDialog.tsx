"use client";

import type { GeneratedQuestion } from "@/types/question";

type Props = {
  source: GeneratedQuestion;
  onClose: () => void;
};

// 似た問題生成の「参照元」問題を閲覧するためのモーダル
export function SourceQuestionDialog({ source, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="source-question-title"
    >
      <div className="glass-panel max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl p-5 sm:max-w-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-amber-gold"
              aria-hidden="true"
            >
              history
            </span>
            <h3
              id="source-question-title"
              className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]"
            >
              参照した問題
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

        <div className="space-y-4">
          <p className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
            カテゴリー · {source.category} / タイプ ·{" "}
            {source.type} / 難易度 · {source.difficulty}
          </p>

          <div>
            <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              テーマ
            </span>
            <p className="text-body-sm text-on-surface mt-1 font-[family-name:var(--font-body-sm)]">
              {source.theme}
            </p>
          </div>

          <div>
            <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              本文
            </span>
            <p className="text-body-lg text-on-surface mt-1 whitespace-pre-wrap font-[family-name:var(--font-body-lg)]">
              {source.body}
            </p>
          </div>

          {source.choices && source.choices.length > 0 && (
            <div>
              <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                選択肢
              </span>
              <ol className="mt-1 space-y-2 pl-6">
                {source.choices.map((c, i) => (
                  <li
                    key={i}
                    className="text-body-lg text-on-surface list-decimal font-[family-name:var(--font-body-lg)]"
                  >
                    {c}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {source.answer && (
            <div className="border-amber-gold/40 bg-amber-gold/10 rounded border-l-2 px-3 py-2">
              <span className="text-label-caps text-amber-gold mr-2 font-[family-name:var(--font-label-caps)]">
                正解
              </span>
              <span className="text-body-lg text-on-surface font-[family-name:var(--font-body-lg)] whitespace-pre-wrap">
                {source.answer}
              </span>
            </div>
          )}

          {source.explanation && (
            <div className="border-glass-stroke bg-surface-container-low/40 rounded-lg border px-3 py-2">
              <span className="text-label-caps text-on-surface-variant mr-2 font-[family-name:var(--font-label-caps)]">
                解説
              </span>
              <span className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)] whitespace-pre-wrap">
                {source.explanation}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="amber-cta-outline">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

