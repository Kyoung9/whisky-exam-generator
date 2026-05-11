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

// 画像付きの過去 map 問題（生成時に同一図版を再利用するため）
export function getPastMapQuestionsWithImage(input: {
  years: ExamYear[];
  categories?: Category[];
}): PastExamQuestion[] {
  const all = input.years.flatMap((y) => getQuestionsByYear(y));
  return all.filter((q) => {
    if (isPlaceholder(q)) return false;
    if (q.type !== "map") return false;
    if (!q.imageRef) return false;
    if (input.categories && input.categories.length > 0) {
      if (!input.categories.includes(q.category)) return false;
    }
    return true;
  });
}

export function pickRandomMapAnchor(input: {
  years: ExamYear[];
  categories?: Category[];
}): PastExamQuestion | null {
  const pool = getPastMapQuestionsWithImage(input);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

// テーマ生成用: カテゴリごとに均等に近い件数をサンプルし、偏りを抑える
export function stratifiedSamplePastQuestions(
  pool: PastExamQuestion[],
  n: number
): PastExamQuestion[] {
  if (n <= 0 || pool.length === 0) return [];
  const cap = Math.min(n, pool.length);
  if (cap === pool.length) return [...pool];

  const strata = new Map<string, PastExamQuestion[]>();
  for (const q of pool) {
    const key = q.category;
    const bucket = strata.get(key) ?? [];
    bucket.push(q);
    strata.set(key, bucket);
  }
  for (const list of strata.values()) {
    shuffleInPlace(list);
  }

  const keys = [...strata.keys()];
  const out: PastExamQuestion[] = [];
  let round = 0;
  while (out.length < cap) {
    let added = false;
    for (const k of keys) {
      if (out.length >= cap) break;
      const list = strata.get(k)!;
      if (round < list.length) {
        out.push(list[round]!);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return out;
}
