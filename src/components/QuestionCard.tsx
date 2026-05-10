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

// 表示専用カード（README §3.5 / §5.2）
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
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-white">
          Q{index + 1}
        </span>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">
          {question.category}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-700">
          {QUESTION_TYPE_LABELS[question.type]}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-700">
          {DIFFICULTY_LABELS[question.difficulty]}
        </span>
        <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-700">
          テーマ: {question.theme}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onToggleSelect && (
            <label className="flex items-center gap-1 text-stone-700">
              <input
                type="checkbox"
                checked={question.selected}
                onChange={onToggleSelect}
              />
              PDF に含める
            </label>
          )}
        </div>
      </header>

      <div className="space-y-3">
        <p className="whitespace-pre-wrap text-base leading-relaxed">{question.body}</p>

        {question.imageRef && (
          <figure className="overflow-hidden rounded-lg border bg-stone-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.imageRef}
              alt={question.imageDescription ?? "問題画像"}
              className="mx-auto max-h-80 w-auto"
            />
            {question.imageDescription && (
              <figcaption className="border-t bg-white px-3 py-1.5 text-xs text-stone-500">
                {question.imageDescription}
              </figcaption>
            )}
          </figure>
        )}

        {question.choices && question.choices.length > 0 && (
          <ol className="space-y-1 pl-5 text-sm" type="1">
            {question.choices.map((c, i) => (
              <li key={i} className="list-decimal">
                {c}
              </li>
            ))}
          </ol>
        )}

        {question.answer && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
            <span className="font-semibold text-emerald-900">正解: </span>
            <span className="whitespace-pre-wrap text-emerald-900">{question.answer}</span>
          </div>
        )}

        {question.explanation && (
          <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            <span className="font-semibold">解説: </span>
            <span className="whitespace-pre-wrap">{question.explanation}</span>
          </div>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {dragHandleProps && (
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab rounded border px-2 py-1 hover:bg-stone-50 active:cursor-grabbing"
            aria-label="ドラッグして並び替え"
          >
            ⋮⋮
          </button>
        )}
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            className="rounded border px-2 py-1 hover:bg-stone-50"
          >
            ↑
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            className="rounded border px-2 py-1 hover:bg-stone-50"
          >
            ↓
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded border px-3 py-1 hover:bg-stone-50"
          >
            編集
          </button>
        )}
        {onGenerateSimilar && (
          <button
            type="button"
            onClick={onGenerateSimilar}
            className="rounded border px-3 py-1 hover:bg-stone-50"
          >
            似た問題を生成
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50"
          >
            削除
          </button>
        )}
      </footer>
    </article>
  );
}
