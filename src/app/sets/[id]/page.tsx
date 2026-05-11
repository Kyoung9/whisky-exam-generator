"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import { cloneQuestionsWithNewIds } from "@/lib/clone-generated-questions";
import { loadExamSets } from "@/lib/exam-set-storage";
import { stashQuestionsForGeneratorAppend } from "@/lib/generator-import-bridge";
import { fetchSavedSetById } from "@/lib/supabase/saved-sets-client";
import { useUser } from "@/lib/supabase/use-user";
import { useExamSets } from "@/lib/use-exam-sets";
import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";

const PdfPreviewModal = dynamic(
  () => import("@/components/PdfPreviewModal").then((m) => m.PdfPreviewModal),
  { ssr: false },
);

/*
 * 保存セット詳細 — 演習・公開切替・フォーク・選択をジェネレータへ
 */

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] ?? "" : "";

  const { user, loading: userLoading } = useUser();
  const { updateSet, addSet } = useExamSets();

  const [set, setSet] = useState<ExamSet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [forking, setForking] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return null;
    let found: ExamSet | null = null;
    if (user) {
      found = await fetchSavedSetById(id);
    }
    if (!found) {
      found = loadExamSets().find((s) => s.id === id) ?? null;
    }
    return found;
  }, [id, user]);

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => {
        setLoading(false);
        setLoadError("無効な ID です");
      });
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const found = await reload();
        if (cancelled) return;
        if (!found) {
          setSet(null);
          setLoadError("セットが見つからないか、閲覧権限がありません。");
        } else {
          setSet(found);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const isOwner = Boolean(
    user && set?.authorId && set.authorId === user.id,
  );

  const isCloudSet = Boolean(set?.authorId);

  const toggleSelect = useCallback((qid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }, []);

  const selectAllToggle = useCallback(() => {
    if (!set) return;
    setSelectedIds((prev) => {
      if (prev.size === set.questions.length) return new Set();
      return new Set(set.questions.map((q) => q.id));
    });
  }, [set]);

  const appendSelectedToGenerator = useCallback(() => {
    if (!set) return;
    const chosen = set.questions.filter((q) => selectedIds.has(q.id));
    if (chosen.length === 0) {
      setActionErr("問題を 1 問以上選択してください");
      return;
    }
    setActionErr(null);
    stashQuestionsForGeneratorAppend(cloneQuestionsWithNewIds(chosen));
    router.push("/generate?importPending=1");
  }, [set, selectedIds, router]);

  const forkFullSet = useCallback(async () => {
    if (!set) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setForking(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await addSet({
        name: `${set.name} (コピー)`,
        questions: cloneQuestionsWithNewIds(set.questions),
        categoryHints: set.categoryHints,
        isPublic: true,
      });
      setActionMsg("マイセットにコピーを保存しました。");
    } catch (e) {
      setActionErr(
        e instanceof Error ? e.message : "コピーに失敗しました",
      );
    } finally {
      setForking(false);
    }
  }, [set, user, router, addSet]);

  const togglePublic = useCallback(async () => {
    if (!set || !isOwner || !isCloudSet) return;
    const next = !(set.isPublic ?? true);
    setTogglingPublic(true);
    setActionErr(null);
    try {
      await updateSet(set.id, { isPublic: next });
      const refreshed = await fetchSavedSetById(set.id);
      if (refreshed) setSet(refreshed);
      setActionMsg(next ? "公開にしました" : "非公開にしました");
    } catch (e) {
      setActionErr(
        e instanceof Error ? e.message : "公開設定の更新に失敗しました",
      );
    } finally {
      setTogglingPublic(false);
    }
  }, [set, isOwner, isCloudSet, updateSet]);

  const practiceHref = useMemo(
    () => `/tasting?practiceSet=${encodeURIComponent(id)}`,
    [id],
  );

  if (!id) {
    return (
      <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
        <AppHeader active="distill" />
        <main className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6 md:px-16">
          <p className="text-body-sm text-error font-[family-name:var(--font-body-sm)]">
            無効な URL です
          </p>
        </main>
        <BottomNav active="distill" />
      </div>
    );
  }

  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="distill" />

      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+2rem)] pb-12 sm:px-6 md:px-16">
        <nav className="text-body-sm text-on-surface-variant mb-6 font-[family-name:var(--font-body-sm)]">
          <Link href="/sets" className="text-amber-gold hover:underline">
            ← 試験作成ツール
          </Link>
        </nav>

        {loading && (
          <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
            読込中…
          </p>
        )}

        {!loading && loadError && (
          <p
            role="alert"
            className="text-body-sm text-error font-[family-name:var(--font-body-sm)]"
          >
            {loadError}
          </p>
        )}

        {!loading && set && (
          <div className="space-y-8">
            <header className="space-y-2">
              <h1 className="text-headline-lg-mobile text-amber-gold break-words font-[family-name:var(--font-headline-lg)] sm:text-headline-lg">
                {set.name}
              </h1>
              <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                {set.questions.length} 問
                {set.authorDisplayName != null && set.authorDisplayName !== ""
                  ? ` · 作成: ${set.authorDisplayName}`
                  : set.authorId
                    ? " · 作成者: 不明"
                    : ""}
              </p>
            </header>

            {actionMsg && (
              <p
                role="status"
                className="text-body-sm text-amber-gold font-[family-name:var(--font-body-sm)]"
              >
                {actionMsg}
              </p>
            )}
            {actionErr && (
              <p
                role="alert"
                className="text-body-sm text-error font-[family-name:var(--font-body-sm)]"
              >
                {actionErr}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href={practiceHref} className="amber-cta inline-flex">
                このセットで演習
              </Link>
              <Link
                href={`/generate?editSet=${encodeURIComponent(set.id)}`}
                className="amber-cta-outline inline-flex"
              >
                ジェネレータで開く
              </Link>
              <button
                type="button"
                onClick={() => setPdfOpen(true)}
                className="amber-cta-outline inline-flex"
              >
                PDF プレビュー
              </button>
              <button
                type="button"
                disabled={forking || !set.questions.length}
                onClick={() => void forkFullSet()}
                className="amber-cta-outline inline-flex disabled:opacity-40"
              >
                {forking ? "コピー中…" : "マイセットに全体コピー"}
              </button>
            </div>

            {isOwner && isCloudSet && (
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={set.isPublic ?? true}
                  disabled={togglingPublic}
                  onChange={() => void togglePublic()}
                />
                <span className="text-body-lg font-[family-name:var(--font-body-lg)]">
                  コミュニティに公開する（{togglingPublic ? "更新中…" : "他ユーザーが一覧から見られます"}）
                </span>
              </label>
            )}

            {!userLoading && !user && (
              <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                クラウドにコピー保存するには{" "}
                <Link href="/login" className="text-amber-gold underline">
                  ログイン
                </Link>{" "}
                が必要です。ローカル保存のセットはこの端末でのみ閲覧できます。
              </p>
            )}

            <section className="glass-panel rounded-xl p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]">
                  問題一覧
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllToggle}
                    className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]"
                  >
                    {set.questions.length > 0 &&
                    selectedIds.size === set.questions.length
                      ? "全解除"
                      : "全選択"}
                  </button>
                  <button
                    type="button"
                    onClick={appendSelectedToGenerator}
                    className="text-label-caps border-amber-gold/50 rounded border px-3 py-1 font-[family-name:var(--font-label-caps)]"
                  >
                    選択をジェネレータに追加
                  </button>
                </div>
              </div>
              <ul className="list-none space-y-3 p-0">
                {set.questions.map((q: GeneratedQuestion, i: number) => (
                  <li
                    key={q.id}
                    className="border-glass-stroke flex gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      aria-label={`問題 ${i + 1} を選択`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                        Q{i + 1}
                      </span>
                      <p className="text-body-sm text-on-surface line-clamp-3 whitespace-pre-wrap break-words font-[family-name:var(--font-body-sm)]">
                        {q.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>

      <BottomNav active="distill" />

      {pdfOpen && set && (
        <PdfPreviewModal
          questions={set.questions}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </div>
  );
}
