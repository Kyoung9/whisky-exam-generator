"use client";

import { useState } from "react";
import { GenerateForm } from "@/components/GenerateForm";
import { PdfDownloadButton } from "@/components/PdfDownloadButton";
import { QuestionList } from "@/components/QuestionList";
import { SimilarQuestionDialog } from "@/components/SimilarQuestionDialog";
import { ThemeGenerateForm } from "@/components/ThemeGenerateForm";
import { QuestionsProvider, useQuestions } from "@/lib/store";
import type { GeneratedQuestion } from "@/types/question";

const AI_DISCLAIMER = "AIが生成した問題・解答・解説は必ず確認してください。";

function HomeInner() {
  const { append, appendAfter, hydrated, questions } = useQuestions();
  const [similarSource, setSimilarSource] = useState<GeneratedQuestion | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          ウイスキーエキスパート 予想問題ジェネレーター
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          過去問題データをもとに AI が予想問題を生成し、PDF 問題集としてダウンロードできます。
        </p>
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {AI_DISCLAIMER}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">予想問題を生成</h2>
            <GenerateForm onGenerated={(qs) => append(qs)} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">問題一覧・編集</h2>
              {hydrated && <PdfDownloadButton questions={questions} />}
            </div>
            {hydrated ? (
              <QuestionList onGenerateSimilar={(q) => setSimilarSource(q)} />
            ) : null}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <ThemeGenerateForm onGenerated={(qs) => append(qs)} />
        </aside>
      </div>

      {similarSource && (
        <SimilarQuestionDialog
          source={similarSource}
          onClose={() => setSimilarSource(null)}
          onGenerated={(qs) => appendAfter(similarSource.id, qs)}
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <QuestionsProvider>
      <HomeInner />
    </QuestionsProvider>
  );
}
