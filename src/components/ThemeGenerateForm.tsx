"use client";

import { useState } from "react";
import {
  CATEGORIES,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Category,
  type Difficulty,
  type GeneratedQuestion,
  type QuestionType,
} from "@/types/question";

type Props = {
  onGenerated: (questions: GeneratedQuestion[]) => void;
};

// テーマ別の追加生成（README §3.12）
export function ThemeGenerateForm({ onGenerated }: Props) {
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [category, setCategory] = useState<Category | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (theme.trim().length === 0) {
      setError("テーマを入力してください。");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.trim(),
          count,
          difficulty,
          category: category || undefined,
          type: type || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `生成に失敗しました (HTTP ${res.status})`);
      }
      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      onGenerated(data.questions);
      setTheme("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm"
    >
      <div>
        <h3 className="text-sm font-semibold">テーマで追加生成</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          例: スコッチの蒸留所所在地、バーボンの製法 など
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">テーマ</span>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="ジャパニーズウイスキーの歴史"
          className="w-full rounded-lg border bg-white px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">数</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
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

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">カテゴリー（任意）</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "")}
            className="w-full rounded-lg border bg-white px-3 py-2"
          >
            <option value="">指定なし</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">問題タイプ（任意）</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType | "")}
            className="w-full rounded-lg border bg-white px-3 py-2"
          >
            <option value="">指定なし</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "生成中…" : "テーマで生成"}
      </button>
    </form>
  );
}
