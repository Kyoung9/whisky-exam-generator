"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
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
  user: User | null;
  userLoading: boolean;
};

const LOGIN_NEXT = "/generate";

// 「似た問題」生成ダイアログ (README §3.11) - WhiskyQuest dark トーン
export function SimilarQuestionDialog({
  source,
  onClose,
  onGenerated,
  user,
  userLoading,
}: Props) {
  const [mode, setMode] = useState<Mode>("similar");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginCta, setShowLoginCta] = useState(false);

  async function submit() {
    if (userLoading) {
      setShowLoginCta(false);
      setError(
        "認証状態を確認しています。少し待ってから再度お試しください。",
      );
      return;
    }
    if (!user) {
      setShowLoginCta(true);
      setError("予想問題の生成にはログインが必要です。");
      return;
    }
    setShowLoginCta(false);
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
            ...(source.pastMapAnchorId
              ? { pastMapAnchorId: source.pastMapAnchorId }
              : {}),
          },
          count,
          mode,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) setShowLoginCta(true);
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
        sourcePastExamIds: source.sourcePastExamIds,
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
          <div
            role="alert"
            className="text-body-sm text-error border-error/40 bg-error/10 space-y-2 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
          >
            <p>{error}</p>
            {showLoginCta ? (
              <Link
                href={`/login?next=${encodeURIComponent(LOGIN_NEXT)}`}
                className="text-label-caps text-amber-gold inline-block font-[family-name:var(--font-label-caps)] underline-offset-4 hover:underline"
              >
                ログインへ
              </Link>
            ) : null}
          </div>
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
