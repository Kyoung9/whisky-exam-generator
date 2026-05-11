"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExamSet } from "@/types/exam-set";
import { loadExamSets, saveExamSets } from "@/lib/exam-set-storage";

/*
 * /sets 用のシンプルな state hook。
 * - QuestionsProvider のような Context は使わず、各画面でローカルに購読
 * - storage 反映は useEffect 経由
 */

export type UseExamSets = {
  sets: ExamSet[];
  hydrated: boolean;
  /** 新しいセットを末尾に追加して返却 */
  addSet: (input: Omit<ExamSet, "id" | "createdAt">) => ExamSet;
  removeSet: (id: string) => void;
  renameSet: (id: string, name: string) => void;
};

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID === "function"
  ) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  return `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useExamSets(): UseExamSets {
  const [sets, setSets] = useState<ExamSet[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSets(loadExamSets());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveExamSets(sets);
  }, [sets, hydrated]);

  const addSet = useCallback<UseExamSets["addSet"]>((input) => {
    const created: ExamSet = {
      ...input,
      id: makeId(),
      createdAt: Date.now(),
    };
    setSets((prev) => [created, ...prev]);
    return created;
  }, []);

  const removeSet = useCallback<UseExamSets["removeSet"]>((id) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSet = useCallback<UseExamSets["renameSet"]>((id, name) => {
    setSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s)),
    );
  }, []);

  return { sets, hydrated, addSet, removeSet, renameSet };
}
