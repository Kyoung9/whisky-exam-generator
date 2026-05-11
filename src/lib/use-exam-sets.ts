"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";
import { applyExamSetPatch } from "@/lib/exam-set-merge";
import { loadExamSets, saveExamSets } from "@/lib/exam-set-storage";
import {
  deleteSavedSetRemote,
  fetchMySavedSets,
  insertSavedSet,
  updateSavedSetRemote,
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
  updateSet: (
    id: string,
    patch: {
      name?: string;
      questions?: GeneratedQuestion[];
      isPublic?: boolean;
    },
  ) => Promise<void>;
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

  const updateSet = useCallback<UseExamSets["updateSet"]>(
    async (id, patch) => {
      let snapshotBefore: ExamSet[] = [];
      let applied = false;
      setSets((prev) => {
        snapshotBefore = prev;
        const idx = prev.findIndex((s) => s.id === id);
        if (idx < 0) return prev;
        applied = true;
        const merged = applyExamSetPatch(prev[idx]!, patch);
        const next = [...prev];
        next[idx] = merged;
        if (!user) saveExamSets(next);
        return next;
      });
      if (!applied) return;
      if (!user) return;
      try {
        await updateSavedSetRemote(id, {
          title: patch.name,
          questions: patch.questions,
          is_public: patch.isPublic,
        });
      } catch (e) {
        console.error("[updateSet]", e);
        setSets(snapshotBefore);
        throw e;
      }
    },
    [user],
  );

  const addSet = useCallback<UseExamSets["addSet"]>(
    async (input) => {
      if (user) {
        const created = await insertSavedSet({
          name: input.name,
          questions: input.questions,
          isPublic: input.isPublic ?? true,
        });
        setSets((prev) => [created, ...prev]);
        return created;
      }
      const created: ExamSet = {
        ...input,
        id: makeLocalId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
      setSets((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (!user) saveExamSets(next);
        return next;
      });
    },
    [user],
  );

  const renameSet = useCallback<UseExamSets["renameSet"]>(
    (id, name) => {
      void updateSet(id, { name });
    },
    [updateSet],
  );

  const migrateLocalSetsToCloud = useCallback<UseExamSets["migrateLocalSetsToCloud"]>(
    async () => {
      if (!user) return 0;
      const local = loadExamSets();
      if (local.length === 0) return 0;
      let uploaded = 0;
      for (const s of local) {
        try {
          await insertSavedSet({
            name: s.name,
            questions: s.questions,
            isPublic: s.isPublic ?? true,
          });
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
    updateSet,
    migrateLocalSetsToCloud,
  };
}
