"use client";

import { useMemo, useState } from "react";
import { getPastExamQuestionById } from "@/lib/exams";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type PastExamQuestion,
} from "@/types/question";

type Props = {
  pastExamIds: string[];
  onClose: () => void;
};

function formatPastExamLabel(past: PastExamQuestion): string {
  return `${past.year} 年試験 · 第${past.number}問${
    past.subNumber ? ` (${past.subNumber})` : ""
  }`;
}

// 「問題生成時に参照した過去問」を一覧表示するモーダル
export function PastExamReferencesDialog({
  pastExamIds,
  onClose,
}: Props) {
  const ids = useMemo(
    () => Array.from(new Set(pastExamIds)).filter(Boolean),
    [pastExamIds],
  );

  const [selectedId, setSelectedId] = useState<string | null>(ids[0] ?? null);

  const selected = selectedId ? getPastExamQuestionById(selectedId) : undefined;

  return (
    <div
      className="fixed inset-0 z-[92] flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="past-exam-refs-title"
    >
      <div className="glass-panel w-full max-w-3xl overflow-y-auto overscroll-contain rounded-xl p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-amber-gold"
              aria-hidden="true"
            >
              history
            </span>
            <h3
              id="past-exam-refs-title"
              className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]"
            >
              参照した問題（過去問）
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-on-surface-variant hover:text-amber-gold rounded-full p-2 transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <p className="text-body-sm text-on-surface-variant/80 font-[family-name:var(--font-body-sm)]">
              生成時に参照した過去問の一覧です（バッチ単位）。
            </p>

            <div className="max-h-[45vh] overflow-y-auto overscroll-contain rounded-lg border-glass-stroke border bg-white/[0.02] p-2">
              {ids.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
                  過去問データがありません。
                </p>
              ) : (
                <ul className="space-y-2">
                  {ids.map((id) => {
                    const past = getPastExamQuestionById(id);
                    if (!past) return null;

                    const active = id === selectedId;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                            active
                              ? "border-amber-gold/60 bg-amber-gold/10"
                              : "border-glass-stroke hover:border-amber-gold/40 hover:bg-amber-gold/5"
                          }`}
                        >
                          <div className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                            {formatPastExamLabel(past)}
                          </div>
                          <div className="mt-1 text-body-sm text-on-surface-variant/80 font-[family-name:var(--font-body-sm)]">
                            {past.theme}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-xl border-glass-stroke border bg-white/[0.02] p-4">
            {!selected ? (
              <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
                選択された過去問が見つかりません。
              </p>
            ) : (
              <>
                <p className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                  {formatPastExamLabel(selected)} ·{" "}
                  {QUESTION_TYPE_LABELS[selected.type]} ·{" "}
                  {DIFFICULTY_LABELS[selected.difficulty]}
                </p>

                {selected.type === "map" && (
                  <p className="text-body-sm text-amber-gold/90 border-amber-gold/30 rounded border border-dashed px-3 py-2 font-[family-name:var(--font-body-sm)]">
                    生成された地図問題は、この問題と同じ図版（番号の配置）を使ってい
                    ます。AI は画像ピクセルを見ずテキスト説明のみで番号を推定するため、
                    正解番号は実図とずれることがあります。
                  </p>
                )}

                <div>
                  <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                    テーマ
                  </span>
                  <p className="text-body-sm text-on-surface mt-1 font-[family-name:var(--font-body-sm)]">
                    {selected.theme}
                  </p>
                </div>

                <div>
                  <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                    本文（過去問）
                  </span>
                  <p className="text-body-lg text-on-surface mt-1 whitespace-pre-wrap font-[family-name:var(--font-body-lg)]">
                    {selected.body}
                  </p>
                </div>

                {selected.imageRef && (
                  <figure className="border-glass-stroke overflow-hidden rounded-lg border bg-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.imageRef}
                      alt={selected.imageDescription ?? "過去問の図"}
                      className="mx-auto max-h-72 w-auto"
                    />
                    {selected.imageDescription && (
                      <figcaption className="border-glass-stroke text-body-sm text-on-surface-variant border-t bg-black/30 px-3 py-2 font-[family-name:var(--font-body-sm)]">
                        {selected.imageDescription}
                      </figcaption>
                    )}
                  </figure>
                )}

                {selected.choices && selected.choices.length > 0 && (
                  <div>
                    <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                      選択肢
                    </span>
                    <ol className="mt-1 space-y-2 pl-6">
                      {selected.choices.map((c, i) => (
                        <li
                          key={i}
                          className="text-body-lg text-on-surface list-decimal font-[family-name:var(--font-body-lg)]"
                        >
                          {c}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selected.answer && (
                  <p className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)] whitespace-pre-wrap">
                    <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
                      過去問の正解{" "}
                    </span>
                    {selected.answer}
                  </p>
                )}

                {selected.explanation && (
                  <div>
                    <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                      過去問の解説
                    </span>
                    <p className="text-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap font-[family-name:var(--font-body-sm)]">
                      {selected.explanation}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="amber-cta-outline">
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

