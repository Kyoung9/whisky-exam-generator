import type { GeneratedQuestion } from "@/types/question";

// localStorage キー（バージョン付与でスキーマ変更時に破棄しやすくする）
const STORAGE_KEY = "whisky.questions.v1";

export function loadQuestions(): GeneratedQuestion[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as GeneratedQuestion[];
  } catch {
    return null;
  }
}

export function saveQuestions(questions: GeneratedQuestion[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch {
    // 容量超過などは無視
  }
}

export function clearQuestions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
