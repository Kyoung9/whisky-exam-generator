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

// インライン編集フォーム（README §3.7）
export function QuestionEditor({ question, onSave, onCancel }: Props) {
  const [body, setBody] = useState(question.body);
  const [category, setCategory] = useState<string>(question.category);
  const [theme, setTheme] = useState(question.theme);
  const [type, setType] = useState<QuestionType>(question.type);
  const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty);
  const [choices, setChoices] = useState<string[]>(question.choices ?? []);
  const [answer, setAnswer] = useState<string>(question.answer ?? "");
  const [explanation, setExplanation] = useState<string>(question.explanation ?? "");

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
      choices: choices.length > 0 ? choices.filter((c) => c.trim().length > 0) : undefined,
      answer: answer.trim().length > 0 ? answer : undefined,
      explanation: explanation.trim().length > 0 ? explanation : undefined,
    });
  }

  return (
    <article className="rounded-2xl border-2 border-primary bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">カテゴリー</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {/* AI が独自カテゴリ名を返す場合に備えて現状値も残す */}
              {!(CATEGORIES as readonly string[]).includes(category) && (
                <option value={category}>{category}</option>
              )}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">問題タイプ</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="w-full rounded-lg border bg-white px-3 py-2"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">テーマ</span>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">難易度</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded-lg border bg-white px-3 py-2"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">問題文</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </label>

        {question.imageRef && (
          <div className="space-y-1 text-sm">
            <span className="font-medium">添付画像 (編集不可)</span>
            <figure className="overflow-hidden rounded-lg border bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.imageRef}
                alt={question.imageDescription ?? "問題画像"}
                className="mx-auto max-h-64 w-auto"
              />
              {question.imageDescription && (
                <figcaption className="border-t bg-white px-3 py-1.5 text-xs text-stone-500">
                  {question.imageDescription}
                </figcaption>
              )}
            </figure>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">選択肢</span>
            <button
              type="button"
              onClick={addChoice}
              className="text-xs text-primary hover:underline"
            >
              + 選択肢を追加
            </button>
          </div>
          {choices.length === 0 && (
            <p className="text-xs text-muted-foreground">選択肢はありません。</p>
          )}
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-xs text-muted-foreground">{i + 1}.</span>
              <input
                value={c}
                onChange={(e) => updateChoice(i, e.target.value)}
                className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeChoice(i)}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          ))}
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">正解</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">解説</span>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm hover:bg-stone-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </article>
  );
}
