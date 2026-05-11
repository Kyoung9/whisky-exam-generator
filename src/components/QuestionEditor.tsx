"use client";

import { useState } from "react";
import {
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type GeneratedQuestion,
  type QuestionType,
} from "@/types/question";

type Props = {
  question: GeneratedQuestion;
  onSave: (patch: Partial<GeneratedQuestion>) => void;
  onCancel: () => void;
};

// インライン編集フォーム (README §3.7) - WhiskyQuest dark トーン
export function QuestionEditor({ question, onSave, onCancel }: Props) {
  const [body, setBody] = useState(question.body);
  const [category, setCategory] = useState<string>(question.category);
  const [theme, setTheme] = useState(question.theme);
  const [type, setType] = useState<QuestionType>(question.type);
  const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty);
  const [choices, setChoices] = useState<string[]>(question.choices ?? []);
  const [answer, setAnswer] = useState<string>(question.answer ?? "");
  const [explanation, setExplanation] = useState<string>(
    question.explanation ?? "",
  );

  function updateChoice(i: number, value: string) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? value : c)));
  }
  function addChoice() {
    setChoices((prev) => [...prev, ""]);
  }
  function removeChoice(i: number) {
    setChoices((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    onSave({
      body,
      category,
      theme,
      type,
      difficulty,
      choices:
        choices.length > 0
          ? choices.filter((c) => c.trim().length > 0)
          : undefined,
      answer: answer.trim().length > 0 ? answer : undefined,
      explanation: explanation.trim().length > 0 ? explanation : undefined,
    });
  }

  return (
    <article className="glass-card border-amber-gold rounded-xl border p-5 ring-1 ring-amber-gold/40">
      <header className="mb-5 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-amber-gold"
          aria-hidden="true"
        >
          edit_note
        </span>
        <h3 className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]">
          問題を編集
        </h3>
      </header>

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              カテゴリー
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-surface-charcoal">
                  {c}
                </option>
              ))}
              {/* AI が独自カテゴリ名を返す場合に備えて現状値も残す */}
              {!(CATEGORIES as readonly string[]).includes(category) && (
                <option value={category} className="bg-surface-charcoal">
                  {category}
                </option>
              )}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              問題タイプ
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t} className="bg-surface-charcoal">
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              テーマ
            </span>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              難易度
            </span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="bg-surface-charcoal">
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            問題文
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
        </label>

        {question.imageRef && (
          <div className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              添付画像 (編集不可)
            </span>
            <figure className="border-glass-stroke bg-surface-container-low overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.imageRef}
                alt={question.imageDescription ?? "問題画像"}
                className="mx-auto max-h-64 w-auto"
              />
              {question.imageDescription && (
                <figcaption className="border-glass-stroke text-body-sm text-on-surface-variant border-t bg-black/30 px-3 py-1.5 font-[family-name:var(--font-body-sm)]">
                  {question.imageDescription}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              選択肢
            </span>
            <button
              type="button"
              onClick={addChoice}
              className="text-label-caps text-amber-gold inline-flex items-center gap-1 font-[family-name:var(--font-label-caps)] transition-opacity hover:opacity-80"
            >
              <span
                className="material-symbols-outlined text-base"
                aria-hidden="true"
              >
                add
              </span>
              選択肢を追加
            </button>
          </div>
          {choices.length === 0 && (
            <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
              選択肢はありません。
            </p>
          )}
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-label-caps text-on-surface-variant w-6 font-[family-name:var(--font-label-caps)]">
                {i + 1}.
              </span>
              <input
                value={c}
                onChange={(e) => updateChoice(i, e.target.value)}
                className="dark-field text-body-lg flex-1 font-[family-name:var(--font-body-lg)]"
              />
              <button
                type="button"
                onClick={() => removeChoice(i)}
                aria-label={`選択肢 ${i + 1} を削除`}
                className="text-error border-error/60 hover:bg-error/10 rounded border p-1 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-base"
                  aria-hidden="true"
                >
                  delete
                </span>
              </button>
            </div>
          ))}
        </div>

        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            正解
          </span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            解説
          </span>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
        </label>

        <div className="border-glass-stroke flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="amber-cta-outline"
          >
            キャンセル
          </button>
          <button type="button" onClick={submit} className="amber-cta px-6 py-3">
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              save
            </span>
            保存
          </button>
        </div>
      </div>
    </article>
  );
}
