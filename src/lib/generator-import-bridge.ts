import type { GeneratedQuestion } from "@/types/question";

const KEY = "whisky.pendingGeneratorAppend.v1";

/** /sets/[id] などから /generate へ渡す一時バッファ */
export function stashQuestionsForGeneratorAppend(
  questions: GeneratedQuestion[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(questions));
  } catch {
    // 容量超過など
  }
}

export function takePendingGeneratorAppend(): GeneratedQuestion[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as GeneratedQuestion[];
  } catch {
    return null;
  }
}
