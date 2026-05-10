"use client";

import { EXAM_YEARS, type ExamYear } from "@/types/question";

type Props = {
  selected: ExamYear[];
  onChange: (next: ExamYear[]) => void;
};

// 過去問題の年度を複数選択するコンポーネント
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">過去問題の年度</span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-primary hover:underline"
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
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition ${
                checked
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:border-primary"
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
