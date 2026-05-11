"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExamSet } from "@/types/exam-set";
import { loadExamSets, saveExamSets } from "@/lib/exam-set-storage";
import {
  deleteSavedSetRemote,
  fetchMySavedSets,
  insertSavedSet,
  updateSavedSetTitleRemote,
} from "@/lib/supabase/saved-sets-client";
import { useUser } from "@/lib/supabase/use-user";

/*
 * /sets 用の state hook。
 * - ログイン時: Supabase saved_question_sets（RLS）
 * - 未ログイン時: localStorage（従来どおり）
 */

export type UseExamSets = {
  sets: ExamSet[];
  hydrated: boolean;
  /** 新しいセットを末尾に追加して返却（クラウドは非同期） */
  addSet: (input: Omit<ExamSet, "id" | "createdAt">) => Promise<ExamSet>;
  removeSet: (id: string) => void;
  renameSet: (id: string, name: string) => void;
  /** ログイン済みでローカルに残っているセットをクラウドへ一括アップロード */
  migrateLocalSetsToCloud: () => Promise<number>;
};

function makeLocalId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID ===
      "function"
  ) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  return `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useExamSets(): UseExamSets {
  const { user, loading: userLoading } = useUser();
  const [sets, setSets] = useState<ExamSet[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    let cancelled = false;

    async function load() {
      if (user) {
        const remote = await fetchMySavedSets();
        if (!cancelled) {
          setSets(remote);
          setHydrated(true);
        }
      } else {
        if (!cancelled) {
          setSets(loadExamSets());
          setHydrated(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  useEffect(() => {
    if (!hydrated || user) return;
    saveExamSets(sets);
  }, [sets, hydrated, user]);

  const addSet = useCallback<UseExamSets["addSet"]>(
    async (input) => {
      if (user) {
        const created = await insertSavedSet({
          name: input.name,
          questions: input.questions,
        });
        setSets((prev) => [created, ...prev]);
        return created;
      }
      const created: ExamSet = {
        ...input,
        id: makeLocalId(),
        createdAt: Date.now(),
      };
      setSets((prev) => [created, ...prev]);
      return created;
    },
    [user],
  );

  const removeSet = useCallback<UseExamSets["removeSet"]>(
    (id) => {
      if (user) {
        void deleteSavedSetRemote(id).catch((e) =>
          console.error("[removeSet]", e),
        );
      }
      setSets((prev) => prev.filter((s) => s.id !== id));
    },
    [user],
  );

  const renameSet = useCallback<UseExamSets["renameSet"]>(
    (id, name) => {
      if (user) {
        void updateSavedSetTitleRemote(id, name).catch((e) =>
          console.error("[renameSet]", e),
        );
      }
      setSets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      );
    },
    [user],
  );

  const migrateLocalSetsToCloud = useCallback<UseExamSets["migrateLocalSetsToCloud"]>(
    async () => {
      if (!user) return 0;
      const local = loadExamSets();
      if (local.length === 0) return 0;
      let uploaded = 0;
      for (const s of local) {
        try {
          await insertSavedSet({ name: s.name, questions: s.questions });
          uploaded += 1;
        } catch (e) {
          console.error("[migrateLocalSetsToCloud]", e);
        }
      }
      saveExamSets([]);
      const remote = await fetchMySavedSets();
      setSets(remote);
      return uploaded;
    },
    [user],
  );

  return {
    sets,
    hydrated,
    addSet,
    removeSet,
    renameSet,
    migrateLocalSetsToCloud,
  };
}
