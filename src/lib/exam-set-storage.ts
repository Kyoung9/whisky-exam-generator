import type { ExamSet } from "@/types/exam-set";

/*
 * /sets 用の localStorage 永続化レイヤ。
 * - questions と同じく version 付きキーで管理
 * - SSR 安全 (window 不在時は no-op)
 */

const STORAGE_KEY = "whisky.examsets.v1";

export function loadExamSets(): ExamSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // 軽い形 unknown 検査だけ
    return (parsed as ExamSet[]).filter(
      (s) => typeof s?.id === "string" && Array.isArray(s.questions),
    );
  } catch {
    return [];
  }
}

export function saveExamSets(sets: ExamSet[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // 容量超過などは無視
  }
}
