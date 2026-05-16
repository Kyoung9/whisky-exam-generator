import type {
  Category,
  ExamYear,
  GeneratedQuestion,
  PastExamQuestion,
  QuestionType,
} from "@/types/question";
import { CATEGORIES, EXAM_YEARS, QUESTION_TYPES } from "@/types/question";
import type { PracticeItem, PracticeSourceMode } from "@/types/practice";
import { getFilteredPastQuestions, getPastExamQuestionById } from "@/lib/exams";
import type { WrongNoteRecord } from "@/lib/supabase/wrong-notes-client";

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

function filterGeneratedByTaxonomy(
  questions: GeneratedQuestion[],
  categories: Category[],
  types: QuestionType[],
): GeneratedQuestion[] {
  return questions.filter((q) => {
    if (
      categories.length > 0 &&
      categories.length < CATEGORIES.length &&
      !categories.includes(q.category as Category)
    ) {
      return false;
    }
    if (
      types.length > 0 &&
      types.length < QUESTION_TYPES.length &&
      !types.includes(q.type)
    ) {
      return false;
    }
    return true;
  });
}

function jsonString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

type SnapshotShape = {
  body?: string;
  type?: QuestionType;
  source?: string;
  year?: number | null;
  choices?: string[] | null;
  category?: string;
  imageRef?: string;
  imageDescription?: string;
};

function practiceItemFromWrongNote(note: WrongNoteRecord): PracticeItem | null {
  const key = note.external_question_key;
  if (key?.startsWith("past:")) {
    const pastId = key.slice("past:".length);
    const past = getPastExamQuestionById(pastId);
    if (past) {
      return { ...pastQuestionToPractice(past), wrongNoteId: note.id };
    }
  }

  const snap = note.question_snapshot as SnapshotShape;
  if (!snap.body || !snap.type) return null;

  const expected = jsonString(note.expected_answer);

  return {
    id: key ?? `wrong:${note.id}`,
    source: snap.source === "past" ? "past" : "generated",
    category: snap.category,
    year: snap.year ?? undefined,
    body: snap.body,
    choices: snap.choices ?? undefined,
    answer: expected,
    type: snap.type,
    imageRef: snap.imageRef,
    imageDescription: snap.imageDescription,
    wrongNoteId: note.id,
  };
}

/** 未解決誤答ノートから演習デッキを構築 */
export function buildPracticeDeckFromWrongNotes(
  notes: WrongNoteRecord[],
  opts?: { shuffle?: boolean },
): PracticeItem[] {
  const items: PracticeItem[] = [];
  for (const note of notes) {
    const item = practiceItemFromWrongNote(note);
    if (item) items.push(item);
  }
  return opts?.shuffle !== false ? shuffle(items) : items;
}

/** 保存セット内の生成問題だけからデッキを作る（テイスティング用） */
export function buildPracticeDeckFromSavedQuestions(opts: {
  questions: GeneratedQuestion[];
  count: number;
  shuffle: boolean;
}): PracticeItem[] {
  let pool = opts.questions.map((q) => generatedQuestionToPractice(q));
  pool = opts.shuffle ? shuffle(pool) : [...pool];
  const n = Math.max(1, Math.min(opts.count, pool.length));
  return pool.slice(0, n);
}

/**
 * 過去問・生成問題から演習デッキを構築する。
 * - 過去問のみ: years が空なら過去問はプールに含めない（UI で 1 年度以上必須）。
 * - ミックスで years が空のときは全年度の過去問を含める。
 * - categories / types が全件選択のときはフィルタしない（従来挙動）。
 */
export function buildPracticeDeck(opts: {
  mode: PracticeSourceMode;
  years: ExamYear[];
  generatedQuestions: GeneratedQuestion[];
  count: number;
  shuffle: boolean;
  categories?: Category[];
  types?: QuestionType[];
}): PracticeItem[] {
  const pool: PracticeItem[] = [];
  const cats =
    opts.categories && opts.categories.length < CATEGORIES.length
      ? opts.categories
      : undefined;
  const types =
    opts.types && opts.types.length < QUESTION_TYPES.length
      ? opts.types
      : undefined;

  if (opts.mode === "past" || opts.mode === "mix") {
    const yearsForPast: ExamYear[] =
      opts.mode === "mix" && opts.years.length === 0
        ? ([...EXAM_YEARS] as ExamYear[])
        : opts.years;
    if (yearsForPast.length > 0) {
      const pastQs = getFilteredPastQuestions({
        years: yearsForPast,
        categories: cats,
        types,
      });
      for (const q of pastQs) {
        pool.push(pastQuestionToPractice(q));
      }
    }
  }

  if (opts.mode === "generated" || opts.mode === "mix") {
    const filtered = filterGeneratedByTaxonomy(
      opts.generatedQuestions,
      cats ?? [...CATEGORIES],
      types ?? [...QUESTION_TYPES],
    );
    for (const q of filtered) {
      pool.push(generatedQuestionToPractice(q));
    }
  }

  let deck = opts.shuffle ? shuffle(pool) : [...pool];
  const n = Math.max(1, Math.min(opts.count, deck.length));
  deck = deck.slice(0, n);
  return deck;
}
