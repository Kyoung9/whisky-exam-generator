"use client";

import type { ReactNode } from "react";

/*
 * 折りたたみ可能なグラスフィルタカード (Stitch 「アーカイブ・フィルタ」)
 * - native <details> + <summary> でアクセシビリティを担保
 * - summary には Material アイコン + タイトル + 件数サマリ + chevron を表示
 */

type Props = {
  /** Material Symbols 名 (例: "calendar_month", "category") */
  icon: string;
  title: string;
  /** 折り畳み時に右側に表示する短い要約 (例: "全選択 / 4 件") */
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleFilterCard({
  icon,
  title,
  summary,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <details
      className="border-glass-stroke bg-glass-fill group rounded-xl border [&[open]>summary_.chev]:rotate-180"
      open={defaultOpen}
    >
      <summary className="flex w-full cursor-pointer list-none items-center gap-3 p-4 text-left sm:p-5 [&::-webkit-details-marker]:hidden">
        <span
          className="material-symbols-outlined text-amber-gold shrink-0"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-body-lg text-on-surface flex-1 truncate font-[family-name:var(--font-body-lg)]">
          {title}
        </span>
        {summary && (
          <span className="text-label-caps text-on-surface-variant truncate font-[family-name:var(--font-label-caps)]">
            {summary}
          </span>
        )}
        <span
          className="material-symbols-outlined text-on-surface-variant chev shrink-0 transition-transform duration-200"
          aria-hidden="true"
        >
          expand_more
        </span>
      </summary>
      <div className="border-glass-stroke border-t p-4 sm:p-5">{children}</div>
    </details>
  );
}
