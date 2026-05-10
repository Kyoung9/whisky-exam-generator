"use client";

import { useState } from "react";
import { ExamSelector } from "@/components/ExamSelector";
import {
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EXAM_YEARS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Category,
  type Difficulty,
  type ExamYear,
  type GeneratedQuestion,
  type QuestionType,
} from "@/types/question";

type Props = {
  onGenerated: (questions: GeneratedQuestion[]) => void;
};

// メイン画面の生成フォーム（README §5.1）
export function GenerateForm({ onGenerated }: Props) {
  const [years, setYears] = useState<ExamYear[]>([...EXAM_YEARS]);
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [types, setTypes] = useState<QuestionType[]>(["multiple_choice", "true_false_count"]);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (years.length === 0 || categories.length === 0 || types.length === 0) {
      setError("年度・カテゴリー・問題タイプを 1 つ以上選択してください。");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          years,
          categories,
          types,
          count,
          difficulty,
          includeExplanation,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `生成に失敗しました (HTTP ${res.status})`);
      }
      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      onGenerated(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <ExamSelector selected={years} onChange={setYears} />

      <div className="space-y-2">
        <span className="text-sm font-medium">カテゴリー</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const checked = categories.includes(c);
            return (
              <label
                key={c}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white hover:border-primary"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => setCategories(toggle(categories, c))}
                />
                {c}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">問題タイプ</span>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => {
            const checked = types.includes(t);
            return (
              <label
                key={t}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white hover:border-primary"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => setTypes(toggle(types, t))}
                />
                {QUESTION_TYPE_LABELS[t]}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-sm font-medium">問題数</span>
          <input
            type="number"
            min={1}
            max={30}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">難易度</span>
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
        <label className="flex items-end space-x-2 pb-2">
          <input
            type="checkbox"
            checked={includeExplanation}
            onChange={(e) => setIncludeExplanation(e.target.checked)}
          />
          <span className="text-sm">解説を含める</span>
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "生成中…" : "予想問題を生成"}
      </button>
    </form>
  );
}
