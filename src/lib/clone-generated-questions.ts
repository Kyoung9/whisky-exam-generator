import type { GeneratedQuestion } from "@/types/question";

/** 取り込み時に id の衝突を避けるため深いコピー + 新 id を付与する */
export function cloneQuestionsWithNewIds(
  questions: GeneratedQuestion[],
): GeneratedQuestion[] {
  return questions.map((q) => ({
    ...q,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  }));
}
