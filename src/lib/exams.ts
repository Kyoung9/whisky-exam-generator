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

// Fisher–Yates（非決定的）。試験問題プールの多様なサンプリング用。
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

/**
 * カテゴリ×タイプごとに均等に近づけつつ limit 件を選ぶ（先頭スライスよりバランスが良い）。
 */
export function stratifiedSamplePastQuestions(
  questions: PastExamQuestion[],
  limit: number
): PastExamQuestion[] {
  if (limit <= 0) return [];
  if (questions.length <= limit) {
    const copy = [...questions];
    shuffleInPlace(copy);
    return copy;
  }

  const buckets = new Map<string, PastExamQuestion[]>();
  for (const q of questions) {
    const key = `${q.category}::${q.type}`;
    const arr = buckets.get(key) ?? [];
    arr.push(q);
    buckets.set(key, arr);
  }
  for (const arr of buckets.values()) {
    shuffleInPlace(arr);
  }
  const keys = [...buckets.keys()];
  shuffleInPlace(keys);

  const out: PastExamQuestion[] = [];
  let round = 0;
  for (;;) {
    let addedThisRound = false;
    for (const key of keys) {
      if (out.length >= limit) return out;
      const bucket = buckets.get(key)!;
      if (round < bucket.length) {
        out.push(bucket[round]!);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  if (out.length < limit) {
    const used = new Set(out.map((q) => q.id));
    const rest = questions.filter((q) => !used.has(q.id));
    shuffleInPlace(rest);
    for (const q of rest) {
      if (out.length >= limit) break;
      out.push(q);
    }
  }

  return out;
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
// limit 指定時は層化サンプリングで多様なセットを返す。
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
    return stratifiedSamplePastQuestions(filtered, input.limit);
  }
  return filtered;
}
