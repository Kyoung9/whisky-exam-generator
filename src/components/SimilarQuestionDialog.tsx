"use client";

import { useState } from "react";
import type { GeneratedQuestion } from "@/types/question";

type Mode = "similar" | "same_theme" | "same_difficulty" | "same_type";

const MODE_LABELS: Record<Mode, string> = {
  similar: "似た問題",
  same_theme: "同じテーマ",
  same_difficulty: "同じ難易度",
  same_type: "同じ問題タイプ",
};

type Props = {
  source: GeneratedQuestion;
  onClose: () => void;
  onGenerated: (questions: GeneratedQuestion[]) => void;
};

// 「似た問題」生成ダイアログ（README §3.11）
export function SimilarQuestionDialog({ source, onClose, onGenerated }: Props) {
  const [mode, setMode] = useState<Mode>("similar");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            body: source.body,
            type: source.type,
            category: source.category,
            theme: source.theme,
            choices: source.choices,
            answer: source.answer,
            explanation: source.explanation,
            difficulty: source.difficulty,
          },
          count,
          mode,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `生成に失敗しました (HTTP ${res.status})`);
      }
      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      const tagged = data.questions.map((q) => ({ ...q, sourceQuestionId: source.id }));
      onGenerated(tagged);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">この問題から追加生成</h3>

        <div className="space-y-2 rounded-lg bg-stone-50 p-3 text-xs text-stone-700">
          <p className="line-clamp-3 whitespace-pre-wrap">{source.body}</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">モード</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full rounded-lg border bg-white px-3 py-2"
          >
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">生成数</span>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="w-full rounded-lg border bg-white px-3 py-2"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded border px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "生成中…" : "生成する"}
          </button>
        </div>
      </div>
    </div>
  );
}
