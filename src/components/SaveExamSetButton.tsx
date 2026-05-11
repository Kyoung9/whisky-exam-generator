"use client";

import { useEffect, useState } from "react";
import { useExamSets } from "@/lib/use-exam-sets";
import type { GeneratedQuestion } from "@/types/question";

type Props = {
  questions: GeneratedQuestion[];
  /** /generate?editSet= から開いたときの上書き先（本人セットのみ true） */
  editTarget?: {
    id: string;
    name: string;
    allowOverwrite: boolean;
  } | null;
};

/*
 * 「現在の生成リストを名前付きセットとして保存」する CTA + モーダル。
 * - ログイン時: Supabase saved_question_sets へ insert（MY EXAMS / ダッシュボードと同期）
 * - 未ログイン時: localStorage（従来どおり）
 * - editTarget かつ allowOverwrite: ワンクリックで updateSet（上書き）
 * - 保存後は inline で「保存しました」を 2.5 秒表示
 */

function defaultName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `セット ${y}-${m}-${d} ${hh}:${mm}`;
}

function topCategories(questions: GeneratedQuestion[]): string[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (!q.category) continue;
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}

export function SaveExamSetButton({ questions, editTarget }: Props) {
  const { addSet, updateSet, hydrated } = useExamSets();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const disabled = !hydrated || questions.length === 0;

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(id);
  }, [saved]);

  async function handleOverwrite() {
    if (!editTarget?.allowOverwrite) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSet(editTarget.id, {
        name: editTarget.name,
        questions: questions.map((q) => ({ ...q })),
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmNew() {
    const trimmed = name.trim() || defaultName();
    setSaving(true);
    setSaveError(null);
    try {
      await addSet({
        name: trimmed,
        questions: questions.map((q) => ({ ...q })),
        categoryHints: topCategories(questions),
      });
      setOpen(false);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {editTarget?.allowOverwrite && (
        <button
          type="button"
          onClick={() => void handleOverwrite()}
          disabled={disabled || saving}
          className="bg-amber-gold text-cask-brown hover:brightness-110 mt-3 flex w-full items-center justify-center gap-2 rounded border border-transparent px-4 py-3 font-[family-name:var(--font-label-caps)] text-[12px] tracking-[0.08em] uppercase transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            save
          </span>
          「{editTarget.name}」を更新して保存
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setName(editTarget?.name?.trim() || defaultName());
          setSaveError(null);
          setOpen(true);
        }}
        disabled={disabled}
        className={`border-amber-gold text-amber-gold hover:bg-amber-gold/10 mt-3 flex w-full items-center justify-center gap-2 rounded border px-4 py-3 font-[family-name:var(--font-label-caps)] text-[12px] tracking-[0.08em] uppercase transition-colors disabled:opacity-40 ${
          editTarget?.allowOverwrite ? "" : ""
        }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          bookmark_add
        </span>
        {editTarget?.allowOverwrite
          ? "別名で新しいセットとして保存…"
          : "現在のセットを保存"}
      </button>

      {saved && (
        <p
          role="status"
          className="text-label-caps text-amber-gold mt-2 text-center font-[family-name:var(--font-label-caps)]"
        >
          保存しました
        </p>
      )}

      {open && (
        <div
          className="bg-background-deep/80 fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-set-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-card w-full max-w-md rounded-xl border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="save-set-title"
              className="text-headline-lg-mobile text-amber-gold mb-2 font-[family-name:var(--font-headline-lg)]"
            >
              {editTarget?.allowOverwrite
                ? "新しい名前でセットを保存"
                : "セット名を付けて保存"}
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-4 font-[family-name:var(--font-body-sm)]">
              現在の {questions.length} 問のスナップショットを保存します。
              保存後は MY EXAMS から再ダウンロードできます。
            </p>
            <label className="mb-6 block space-y-2">
              <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
                セット名
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !saving) void handleConfirmNew();
                }}
                className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
              />
            </label>
            {saveError && (
              <p
                role="alert"
                className="text-body-sm text-error border-error/40 bg-error/10 mb-4 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
              >
                {saveError}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="amber-cta-outline w-full sm:w-auto disabled:opacity-40"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmNew()}
                disabled={saving}
                className="amber-cta w-full sm:w-auto disabled:opacity-40"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
