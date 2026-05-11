"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GenerateForm } from "@/components/GenerateForm";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { QuestionList } from "@/components/QuestionList";
import { SaveExamSetButton } from "@/components/SaveExamSetButton";
import { SimilarQuestionDialog } from "@/components/SimilarQuestionDialog";
import { ThemeGenerateForm } from "@/components/ThemeGenerateForm";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import { loadExamSets } from "@/lib/exam-set-storage";
import { takePendingGeneratorAppend } from "@/lib/generator-import-bridge";
import { fetchSavedSetById } from "@/lib/supabase/saved-sets-client";
import { useUser } from "@/lib/supabase/use-user";
import { QuestionsProvider, useQuestions } from "@/lib/store";
import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";

const PdfPreviewModal = dynamic(
  () =>
    import("@/components/PdfPreviewModal").then((m) => m.PdfPreviewModal),
  { ssr: false },
);

/*
 * /generate = WhiskyQuest「蒸留 (予想問題ジェネレーター)」画面
 * - 左メイン (lg:col-span-8): 予想問題生成フォーム + 生成済み問題一覧
 * - 右サイドバー (lg:col-span-4, sticky): 構成メトリクス (問題数 + PDF CTA) + テーマ追加生成
 */

const AI_DISCLAIMER =
  "AIが生成した問題・解答・解説は必ず確認してください。";

function GenerateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSetId = searchParams.get("editSet");
  const importPending = searchParams.get("importPending");
  const { user, loading: userLoading } = useUser();
  const { append, appendAfter, hydrated, questions, setQuestions } =
    useQuestions();
  const [similarSource, setSimilarSource] =
    useState<GeneratedQuestion | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    name: string;
    allowOverwrite: boolean;
  } | null>(null);
  const [editBanner, setEditBanner] = useState<string | null>(null);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editSetId) {
      queueMicrotask(() => {
        setEditTarget(null);
        setEditBanner(null);
        setEditLoadError(null);
      });
      return;
    }
    if (userLoading) return;
    // QuestionsProvider の localStorage hydrate より後で上書きしないと、
    // 古い生成バッファが DB から開いたセットを潰す
    if (!hydrated) return;

    let cancelled = false;
    void (async () => {
      setEditLoadError(null);
      setEditBanner(null);
      try {
        let found: ExamSet | null = null;
        if (user) {
          found = await fetchSavedSetById(editSetId);
        }
        if (!found) {
          found = loadExamSets().find((s) => s.id === editSetId) ?? null;
        }
        if (cancelled) return;
        if (!found) {
          setEditTarget(null);
          setEditLoadError("指定されたセットが見つかりません。");
          return;
        }
        const allowOverwrite = !user
          ? true
          : !found.authorId || found.authorId === user.id;
        setEditTarget({
          id: found.id,
          name: found.name,
          allowOverwrite,
        });
        setQuestions(found.questions.map((q) => ({ ...q })));
        setEditBanner(
          allowOverwrite
            ? `編集中: 「${found.name}」 — サイドバーから上書き保存できます。`
            : `「${found.name}」を開きました（他ユーザーのセット）。上書きはできず、別名保存のみ可能です。`,
        );
      } catch {
        if (!cancelled) setEditLoadError("セットの読込に失敗しました。");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSetId, user, userLoading, hydrated, setQuestions]);

  useEffect(() => {
    if (importPending !== "1" || !hydrated) return;
    const incoming = takePendingGeneratorAppend();
    if (incoming?.length) append(incoming);
    router.replace("/generate", { scroll: false });
  }, [importPending, hydrated, append, router]);

  const total = questions.length;
  const selected = questions.filter((q) => q.selected).length;

  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="distill" />

      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+3rem)] sm:px-6 md:px-16">
        {editBanner && (
          <p
            role="status"
            className="text-body-sm text-amber-gold border-amber-gold/40 bg-amber-gold/10 mb-6 rounded border px-4 py-3 font-[family-name:var(--font-body-sm)]"
          >
            {editBanner}
          </p>
        )}
        {editLoadError && (
          <p
            role="alert"
            className="text-body-sm text-error border-error/40 bg-error/10 mb-6 rounded border px-4 py-3 font-[family-name:var(--font-body-sm)]"
          >
            {editLoadError}
          </p>
        )}
        {/* Hero */}
        <header className="mb-8 md:mb-10">
          <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
            カリキュラム・モジュール
          </p>
          <h1 className="text-headline-lg-mobile text-amber-gold mb-2 break-words font-[family-name:var(--font-display-lg)] sm:text-headline-lg lg:text-display-lg">
            蒸留プロセスの開始
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl break-words font-[family-name:var(--font-body-lg)]">
            過去問題データをもとに AI が予想問題を生成し、PDF
            問題集としてダウンロードできます。フィルターで年度やカテゴリーを微調整してください。
          </p>
          <p className="text-body-sm text-amber-gold border-amber-gold/40 bg-amber-gold/10 mt-4 flex w-full max-w-full flex-wrap items-start gap-2 rounded border px-3 py-2 break-words font-[family-name:var(--font-body-sm)]">
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              info
            </span>
            {AI_DISCLAIMER}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* メイン: 生成フォーム + 一覧 */}
          <div className="space-y-6 lg:col-span-8">
            <section className="glass-panel rounded-xl p-4 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                  予想問題を生成
                </h2>
                <span
                  className="material-symbols-outlined text-amber-gold"
                  aria-hidden="true"
                >
                  science
                </span>
              </div>
              <GenerateForm
                onGenerated={(qs) => append(qs)}
                user={user}
                userLoading={userLoading}
              />
            </section>

            <section className="glass-panel rounded-xl p-4 sm:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                  問題一覧 / 編集
                </h2>
                <span
                  className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]"
                  aria-live="polite"
                >
                  {hydrated ? `${total} 問` : "—"}
                </span>
              </div>
              {hydrated ? (
                <QuestionList
                  onGenerateSimilar={(q) => setSimilarSource(q)}
                />
              ) : (
                <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                  読込中…
                </p>
              )}
            </section>
          </div>

          {/* サイドバー: 構成メトリクス + テーマ追加生成
           * sticky をやめてページのスクロールと一緒に流れるようにする (内部スクロールなし) */}
          <aside className="space-y-6 lg:col-span-4">
            {/* 構成メトリクス + PDF CTA */}
            <div className="glass-panel rounded-xl p-4 sm:p-6">
              <h3 className="text-label-caps text-on-surface-variant mb-6 flex items-center gap-2 font-[family-name:var(--font-label-caps)]">
                <span
                  className="material-symbols-outlined text-sm"
                  aria-hidden="true"
                >
                  analytics
                </span>
                構成メトリクス
              </h3>

              <dl className="mb-8 space-y-5">
                <div className="flex items-baseline justify-between">
                  <dt className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                    生成済み
                  </dt>
                  <dd className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                    {hydrated ? total : "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                    選択中
                  </dt>
                  <dd className="text-title-md text-on-surface font-[family-name:var(--font-title-md)]">
                    {hydrated ? selected : "—"}
                  </dd>
                </div>
              </dl>

              <div className="border-glass-stroke border-t pt-6">
                {hydrated ? (
                  <>
                    <PdfDownloadButton
                      questions={questions}
                      onOpen={() => setPdfPreviewOpen(true)}
                    />
                    <SaveExamSetButton
                      questions={questions}
                      editTarget={editTarget}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="amber-cta w-full"
                  >
                    PDF を準備中
                  </button>
                )}
                <p className="text-body-sm text-on-surface-variant mt-3 text-center font-[family-name:var(--font-body-sm)]">
                  問題を 1 問以上生成すると PDF と「セット保存」が利用できます。
                </p>
                <div className="mt-4 flex flex-col gap-1 text-center">
                  <Link
                    href="/sets"
                    className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)] underline-offset-4 hover:underline"
                  >
                    保存済みセット (MY EXAMS) →
                  </Link>
                  <Link
                    href="/tasting"
                    className="text-label-caps text-on-surface-variant hover:text-amber-gold font-[family-name:var(--font-label-caps)] underline-offset-4 hover:underline"
                  >
                    テイスティングで演習する →
                  </Link>
                </div>
              </div>
            </div>

            {/* テーマで追加生成 */}
            <ThemeGenerateForm
              onGenerated={(qs) => append(qs)}
              user={user}
              userLoading={userLoading}
            />
          </aside>
        </div>
      </main>

      <BottomNav active="distill" />

      {similarSource && (
        <SimilarQuestionDialog
          source={similarSource}
          onClose={() => setSimilarSource(null)}
          onGenerated={(qs) => appendAfter(similarSource.id, qs)}
          user={user}
          userLoading={userLoading}
        />
      )}

      {pdfPreviewOpen && (
        <PdfPreviewModal
          questions={questions}
          onClose={() => setPdfPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function GenerateFallback() {
  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="distill" />
      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+3rem)] sm:px-6 md:px-16">
        <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
          読込中…
        </p>
      </main>
      <BottomNav active="distill" />
    </div>
  );
}

export default function GeneratePage() {
  return (
    <QuestionsProvider>
      <Suspense fallback={<GenerateFallback />}>
        <GenerateInner />
      </Suspense>
    </QuestionsProvider>
  );
}
