import type { ExamYear, GeneratedQuestion, PastExamQuestion } from "@/types/question";
import { EXAM_YEARS } from "@/types/question";
import type { PracticeItem, PracticeSourceMode } from "@/types/practice";
import { getFilteredPastQuestions } from "@/lib/exams";

/** Fisher–Yates シャッフル */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pastQuestionToPractice(q: PastExamQuestion): PracticeItem {
  return {
    id: `past:${q.id}`,
    source: "past",
    category: q.category,
    year: q.year,
    body: q.body,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    type: q.type,
    imageRef: q.imageRef,
    imageDescription: q.imageDescription,
  };
}

export function generatedQuestionToPractice(q: GeneratedQuestion): PracticeItem {
  return {
    id: `gen:${q.id}`,
    source: "generated",
    category: q.category,
    body: q.body,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    type: q.type,
    imageRef: q.imageRef,
    imageDescription: q.imageDescription,
  };
}

/**
 * 過去問・生成問題から演習デッキを構築する。
 * - 過去問のみ: years が空なら過去問はプールに含めない（UI で 1 年度以上必須）。
 * - ミックスで years が空のときは全年度の過去問を含める。
 * - shuffle が true のときプール全体をシャッフルしてから先頭 count 件を採用。
 */
export function buildPracticeDeck(opts: {
  mode: PracticeSourceMode;
  years: ExamYear[];
  generatedQuestions: GeneratedQuestion[];
  count: number;
  shuffle: boolean;
}): PracticeItem[] {
  const pool: PracticeItem[] = [];

  if (opts.mode === "past" || opts.mode === "mix") {
    const yearsForPast: ExamYear[] =
      opts.mode === "mix" && opts.years.length === 0
        ? ([...EXAM_YEARS] as ExamYear[])
        : opts.years;
    if (yearsForPast.length > 0) {
      const pastQs = getFilteredPastQuestions({ years: yearsForPast });
      for (const q of pastQs) {
        pool.push(pastQuestionToPractice(q));
      }
    }
  }

  if (opts.mode === "generated" || opts.mode === "mix") {
    for (const q of opts.generatedQuestions) {
      pool.push(generatedQuestionToPractice(q));
    }
  }

  let deck = opts.shuffle ? shuffle(pool) : [...pool];
  const n = Math.max(1, Math.min(opts.count, deck.length));
  deck = deck.slice(0, n);
  return deck;
}
