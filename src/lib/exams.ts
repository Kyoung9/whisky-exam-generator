import type { Category, ExamYear, PastExamQuestion, QuestionType } from "@/types/question";

import we2021 from "@/data/exams/we-2021.json";
import we2022 from "@/data/exams/we-2022.json";
import we2023 from "@/data/exams/we-2023.json";
import we2024 from "@/data/exams/we-2024.json";

const RAW: Record<ExamYear, unknown> = {
  2021: we2021,
  2022: we2022,
  2023: we2023,
  2024: we2024,
};

// OCR 未抽出のプレースホルダー body を識別するパターン
const PLACEHOLDER_BODY_RE = /^\(本文未抽出/;

function isPlaceholder(q: PastExamQuestion): boolean {
  return PLACEHOLDER_BODY_RE.test(q.body ?? "");
}

// 静的 JSON を PastExamQuestion[] にキャストする
function asPastExamQuestions(raw: unknown): PastExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw as PastExamQuestion[];
}

export function getQuestionsByYear(year: ExamYear): PastExamQuestion[] {
  return asPastExamQuestions(RAW[year]);
}

// 指定された年の問題を全て集めて、カテゴリ/種別で絞り込む。
// OCR 未抽出のプレースホルダー entry は AI に参照させないため除外する。
export function getFilteredPastQuestions(input: {
  years: ExamYear[];
  categories?: Category[];
  types?: QuestionType[];
  limit?: number;
}): PastExamQuestion[] {
  const all = input.years.flatMap((y) => getQuestionsByYear(y));
  const filtered = all.filter((q) => {
    if (isPlaceholder(q)) return false;
    if (input.categories && input.categories.length > 0) {
      if (!input.categories.includes(q.category)) return false;
    }
    if (input.types && input.types.length > 0) {
      if (!input.types.includes(q.type)) return false;
    }
    return true;
  });
  if (input.limit && filtered.length > input.limit) {
    return filtered.slice(0, input.limit);
  }
  return filtered;
}
