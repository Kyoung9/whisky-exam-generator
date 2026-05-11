"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useState } from "react";
import { CollapsibleFilterCard } from "@/components/CollapsibleFilterCard";
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
  user: User | null;
  userLoading: boolean;
};

const LOGIN_NEXT = "/generate";

/*
 * メイン画面の生成フォーム (README §5.1)
 * Stitch 「蒸留設定」mobile デザインのアーカイブ・フィルタ パターンに合わせて
 * 年度・カテゴリー・問題タイプを折りたたみ可能なグラスカード化。
 */

function chipClass(active: boolean): string {
  return [
    "text-label-caps cursor-pointer rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-all",
    active
      ? "border-amber-gold bg-amber-gold text-cask-brown"
      : "border-glass-stroke text-on-surface-variant hover:border-amber-gold hover:text-amber-gold",
  ].join(" ");
}

export function GenerateForm({ onGenerated, user, userLoading }: Props) {
  const [years, setYears] = useState<ExamYear[]>([...EXAM_YEARS]);
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [types, setTypes] = useState<QuestionType[]>([
    "multiple_choice",
    "true_false_count",
  ]);
  const [count, setCount] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginCta, setShowLoginCta] = useState(false);

  function toggle<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function summary(selected: number, total: number): string {
    if (selected === 0) return "未選択";
    if (selected === total) return "全選択";
    return `${selected} / ${total}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (years.length === 0 || categories.length === 0 || types.length === 0) {
      setError("年度・カテゴリー・問題タイプを 1 つ以上選択してください。");
      return;
    }
    if (!Number.isFinite(count) || count < 1) {
      setError("出題数は 1 以上を入力してください。");
      return;
    }
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
        if (res.status === 401) setShowLoginCta(true);
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error ?? `生成に失敗しました (HTTP ${res.status})`,
        );
      }
      const data = (await res.json()) as { questions: GeneratedQuestion[] };
      onGenerated(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const yearsAll = years.length === EXAM_YEARS.length;
  const catsAll = categories.length === CATEGORIES.length;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* アーカイブ・フィルタ (折りたたみカード) */}
      <div className="space-y-3">
        <h3 className="text-label-caps text-amber-gold px-1 font-[family-name:var(--font-label-caps)]">
          アーカイブ・フィルタ
        </h3>

        {/* 年度 — 既定で開いた状態。最重要フィルタ */}
        <CollapsibleFilterCard
          icon="calendar_month"
          title="過去問題の年度"
          summary={summary(years.length, EXAM_YEARS.length)}
          defaultOpen
        >
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setYears(yearsAll ? [] : [...EXAM_YEARS])}
              className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)] transition-opacity hover:opacity-80"
            >
              {yearsAll ? "全解除" : "全選択"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAM_YEARS.map((y) => {
              const checked = years.includes(y);
              return (
                <label key={y} className={chipClass(checked)}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      setYears(
                        checked
                          ? years.filter((v) => v !== y)
                          : [...years, y].sort((a, b) => a - b),
                      )
                    }
                  />
                  {y}年度
                </label>
              );
            })}
          </div>
        </CollapsibleFilterCard>

        {/* カテゴリー — チップ数が多いので折りたたみ */}
        <CollapsibleFilterCard
          icon="category"
          title="カテゴリー"
          summary={summary(categories.length, CATEGORIES.length)}
        >
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setCategories(catsAll ? [] : [...CATEGORIES])}
              className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)] transition-opacity hover:opacity-80"
            >
              {catsAll ? "全解除" : "全選択"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const checked = categories.includes(c);
              return (
                <label key={c} className={chipClass(checked)}>
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
        </CollapsibleFilterCard>

        {/* 問題タイプ */}
        <CollapsibleFilterCard
          icon="quiz"
          title="問題タイプ"
          summary={summary(types.length, QUESTION_TYPES.length)}
        >
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => {
              const checked = types.includes(t);
              return (
                <label key={t} className={chipClass(checked)}>
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
        </CollapsibleFilterCard>
      </div>

      {/* 習熟レベル — 横並びチップ (Stitch 蒸留設定 mobile デザイン) */}
      <div className="space-y-3">
        <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          難易度
        </span>
        <div
          role="radiogroup"
          aria-label="難易度"
          className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDifficulty(d)}
                className={`text-label-caps shrink-0 rounded-full border px-5 py-2.5 font-[family-name:var(--font-label-caps)] transition-all ${
                  active
                    ? "border-amber-gold bg-amber-gold text-cask-brown"
                    : "border-glass-stroke bg-glass-fill text-on-surface-variant hover:border-amber-gold hover:text-amber-gold"
                }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 出題数 — スライダー + バッジ */}
      <div className="border-glass-stroke bg-glass-fill rounded-xl border p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <label
            htmlFor="generate-count"
            className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]"
          >
            出題数
          </label>
          <span className="text-label-caps text-on-surface font-[family-name:var(--font-label-caps)] tabular-nums">
            {count} 問
          </span>
        </div>
          <input
            id="generate-count"
            type="number"
            min={0}
            max={30}
            step={1}
            value={count}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) {
                setCount(0);
                return;
              }
              setCount(Math.max(0, Math.min(30, Math.floor(v))));
            }}
            className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
          />
          <div className="text-on-surface-variant mt-2 flex justify-between text-[10px] font-[family-name:var(--font-label-caps)]">
            <span>0</span>
            <span>30</span>
          </div>

          {count < 1 ? (
            <p className="text-body-sm text-on-surface-variant/70 mt-2 font-[family-name:var(--font-body-sm)]">
              未設定（0 の場合は生成できません。1 以上を入力してください）
            </p>
          ) : (
            <p className="text-body-sm text-on-surface-variant/70 mt-2 font-[family-name:var(--font-body-sm)]">
              入力中：{count} 問を生成します
            </p>
          )}
      </div>

      {/* 解説を含める */}
      <label className="wq-checkbox-row">
        <input
          type="checkbox"
          checked={includeExplanation}
          onChange={(e) => setIncludeExplanation(e.target.checked)}
        />
        <span className="text-body-lg flex-1 font-[family-name:var(--font-body-lg)]">
          解説を含める
        </span>
        <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          {includeExplanation ? "ON" : "OFF"}
        </span>
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

      <button
        type="submit"
        disabled={loading || count < 1}
        className="amber-cta w-full"
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
            <span className="material-symbols-outlined" aria-hidden="true">
              science
            </span>
            予想問題を生成
          </>
        )}
      </button>
    </form>
  );
}
