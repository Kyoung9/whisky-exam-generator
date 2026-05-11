"use client";

import { EXAM_YEARS, type ExamYear } from "@/types/question";

type Props = {
  selected: ExamYear[];
  onChange: (next: ExamYear[]) => void;
};

// 過去問題の年度を複数選択するコンポーネント (amber-gold チップ)
export function ExamSelector({ selected, onChange }: Props) {
  const allChecked = selected.length === EXAM_YEARS.length;

  function toggle(year: ExamYear) {
    if (selected.includes(year)) {
      onChange(selected.filter((y) => y !== year));
    } else {
      onChange([...selected, year].sort((a, b) => a - b));
    }
  }

  function toggleAll() {
    onChange(allChecked ? [] : [...EXAM_YEARS]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          過去問題の年度
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)] transition-opacity hover:opacity-80"
        >
          {allChecked ? "全解除" : "全選択"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAM_YEARS.map((year) => {
          const checked = selected.includes(year);
          return (
            <label
              key={year}
              className={`text-label-caps cursor-pointer rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-all ${
                checked
                  ? "border-amber-gold bg-amber-gold text-cask-brown"
                  : "border-glass-stroke text-on-surface-variant hover:border-amber-gold hover:text-amber-gold"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggle(year)}
              />
              {year}年度
            </label>
          );
        })}
      </div>
    </div>
  );
}
