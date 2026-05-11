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

// 「似た問題」生成ダイアログ (README §3.11) - WhiskyQuest dark トーン
export function SimilarQuestionDialog({
  source,
  onClose,
  onGenerated,
}: Props) {
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
            ...(source.imageRef ? { imageRef: source.imageRef } : {}),
            ...(source.imageSourcePage !== undefined
              ? { imageSourcePage: source.imageSourcePage }
              : {}),
            ...(source.imageDescription
              ? { imageDescription: source.imageDescription }
              : {}),
          },
          count,
          mode,
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
      const tagged = data.questions.map((q) => ({
        ...q,
        sourceQuestionId: source.id,
      }));
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="similar-dialog-title"
    >
      <div className="glass-panel max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] w-full max-w-md space-y-5 overflow-y-auto overscroll-contain rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-amber-gold"
            aria-hidden="true"
          >
            auto_awesome
          </span>
          <h3
            id="similar-dialog-title"
            className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]"
          >
            この問題から追加生成
          </h3>
        </div>

        <div className="border-glass-stroke bg-surface-container-low/60 rounded border-l-2 border-l-amber-gold/40 p-3">
          <p className="text-body-sm text-on-surface-variant line-clamp-3 font-[family-name:var(--font-body-sm)] whitespace-pre-wrap">
            {source.body}
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            モード
          </span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          >
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <option key={m} value={m} className="bg-surface-charcoal">
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
            生成数
          </span>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="text-body-sm text-error border-error/40 bg-error/10 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="amber-cta-outline"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="amber-cta px-6 py-3"
          >
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
              <>
                <span
                  className="material-symbols-outlined text-base"
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
                生成する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
