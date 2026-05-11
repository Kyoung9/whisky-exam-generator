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

// テーマ別の追加生成 (README §3.12) - サイドバー用 glass パネル
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
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? `生成に失敗しました (HTTP ${res.status})`,
        );
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
    <form onSubmit={submit} className="glass-panel rounded-xl p-4 sm:p-6">
      <div className="mb-5">
        <h3 className="text-title-md text-amber-gold mb-1 flex items-center gap-2 font-[family-name:var(--font-title-md)]">
          <span
            className="material-symbols-outlined text-base"
            aria-hidden="true"
          >
            auto_awesome
          </span>
          テーマで追加生成
        </h3>
        <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
          例: スコッチの蒸留所所在地、バーボンの製法 など
        </p>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            テーマ
          </span>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="ジャパニーズウイスキーの歴史"
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              数
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
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

        <div className="grid grid-cols-1 gap-3">
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              カテゴリー (任意)
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category | "")}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            >
              <option value="" className="bg-surface-charcoal">
                指定なし
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-surface-charcoal">
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
              問題タイプ (任意)
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType | "")}
              className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
            >
              <option value="" className="bg-surface-charcoal">
                指定なし
              </option>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t} className="bg-surface-charcoal">
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="text-body-sm text-error border-error/40 bg-error/10 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="amber-cta w-full">
          {loading ? (
            <>
              <span
                className="material-symbols-outlined animate-spin"
                aria-hidden="true"
              >
                progress_activity
              </span>
              生成中…
            </>
          ) : (
            "テーマで生成"
          )}
        </button>
      </div>
    </form>
  );
}
