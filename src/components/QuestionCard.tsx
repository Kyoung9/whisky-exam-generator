"use client";

import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type GeneratedQuestion,
} from "@/types/question";

type Props = {
  index: number;
  question: GeneratedQuestion;
  onToggleSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerateSimilar?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

// 表示専用カード (README §3.5 / §5.2) - WhiskyQuest dark / glass トーン
export function QuestionCard({
  index,
  question,
  onToggleSelect,
  onEdit,
  onDelete,
  onGenerateSimilar,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: Props) {
  const selected = question.selected;
  return (
    <article
      className={`glass-card rounded-xl p-5 transition-colors ${
        selected ? "ring-amber-gold/60 ring-1" : ""
      }`}
    >
      {/* メタ ヘッダー */}
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-label-caps bg-amber-gold text-cask-brown rounded px-2 py-1 font-[family-name:var(--font-label-caps)]">
          Q{String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-label-caps border-amber-gold/40 text-amber-gold rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-label-caps)]">
          {question.category}
        </span>
        <span className="text-label-caps border-glass-stroke text-on-surface-variant rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-label-caps)]">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <span className="text-label-caps border-glass-stroke text-on-surface-variant rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-label-caps)]">
          {DIFFICULTY_LABELS[question.difficulty]}
        </span>
        <span className="text-label-caps text-outline font-[family-name:var(--font-label-caps)]">
          THEME · {question.theme}
        </span>
        {onToggleSelect && (
          <label className="text-body-sm text-on-surface-variant ml-auto flex items-center gap-2 font-[family-name:var(--font-body-sm)]">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="text-amber-gold border-amber-gold focus:ring-amber-gold h-4 w-4 rounded bg-transparent"
            />
            PDF に含める
          </label>
        )}
      </header>

      {/* 本文 */}
      <div className="space-y-4">
        <p className="text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap font-[family-name:var(--font-body-lg)]">
          {question.body}
        </p>

        {question.imageRef && (
          <figure className="border-glass-stroke bg-surface-container-low overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.imageRef}
              alt={question.imageDescription ?? "問題画像"}
              className="mx-auto max-h-80 w-auto"
            />
            {question.imageDescription && (
              <figcaption className="border-glass-stroke text-body-sm text-on-surface-variant border-t bg-black/30 px-3 py-1.5 font-[family-name:var(--font-body-sm)]">
                {question.imageDescription}
              </figcaption>
            )}
          </figure>
        )}

        {question.choices && question.choices.length > 0 && (
          <ol className="space-y-2 pl-6">
            {question.choices.map((c, i) => (
              <li
                key={i}
                className="text-body-lg text-on-surface list-decimal font-[family-name:var(--font-body-lg)]"
              >
                {c}
              </li>
            ))}
          </ol>
        )}

        {question.answer && (
          <div className="border-amber-gold/40 bg-amber-gold/10 rounded border-l-2 px-3 py-2">
            <span className="text-label-caps text-amber-gold mr-2 font-[family-name:var(--font-label-caps)]">
              正解
            </span>
            <span className="text-body-lg text-on-surface font-[family-name:var(--font-body-lg)] whitespace-pre-wrap">
              {question.answer}
            </span>
          </div>
        )}

        {question.explanation && (
          <div className="border-glass-stroke bg-surface-container-low/40 rounded-lg border px-3 py-2">
            <span className="text-label-caps text-on-surface-variant mr-2 font-[family-name:var(--font-label-caps)]">
              解説
            </span>
            <span className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)] whitespace-pre-wrap">
              {question.explanation}
            </span>
          </div>
        )}
      </div>

      {/* アクション フッター */}
      <footer className="border-glass-stroke mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            className="text-on-surface-variant border-glass-stroke hover:text-amber-gold hover:border-amber-gold cursor-grab rounded border px-2 py-1 transition-colors active:cursor-grabbing"
            aria-label="ドラッグして並び替え"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              drag_indicator
            </span>
          </button>
        )}
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            aria-label="上へ"
            className="text-on-surface-variant border-glass-stroke hover:text-amber-gold hover:border-amber-gold rounded border px-2 py-1 transition-colors"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              arrow_upward
            </span>
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            aria-label="下へ"
            className="text-on-surface-variant border-glass-stroke hover:text-amber-gold hover:border-amber-gold rounded border px-2 py-1 transition-colors"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              arrow_downward
            </span>
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="amber-cta-outline"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              edit
            </span>
            編集
          </button>
        )}
        {onGenerateSimilar && (
          <button
            type="button"
            onClick={onGenerateSimilar}
            className="amber-cta-outline"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              auto_awesome
            </span>
            似た問題
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-label-caps border-error/60 text-error hover:bg-error/10 ml-auto inline-flex items-center gap-1 rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-colors"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              delete
            </span>
            削除
          </button>
        )}
      </footer>
    </article>
  );
}
