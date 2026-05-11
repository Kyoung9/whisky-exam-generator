import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";

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

/** ローカル state / localStorage 用のマージ */
export function applyExamSetPatch(
  s: ExamSet,
  patch: {
    name?: string;
    questions?: GeneratedQuestion[];
    isPublic?: boolean;
  },
): ExamSet {
  const next: ExamSet = { ...s };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.questions !== undefined) {
    next.questions = patch.questions;
    next.categoryHints = topCategories(patch.questions);
  }
  if (patch.isPublic !== undefined) next.isPublic = patch.isPublic;
  next.updatedAt = Date.now();
  return next;
}
