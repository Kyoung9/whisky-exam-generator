import { Suspense } from "react";
import { QuestionsProvider } from "@/lib/store";
import { TastingPractice } from "@/components/tasting/TastingPractice";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * /tasting — 過去問・生成問題の実演習（セッション設定 + 採点 UI）
 * 生成問題は QuestionsProvider 経由で localStorage と同期される。
 */
function TastingFallback() {
  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="taste" />
      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+2rem)] sm:px-6 md:px-16">
        <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
          読込中…
        </p>
      </main>
      <BottomNav active="taste" />
    </div>
  );
}

export default function TastingPage() {
  return (
    <QuestionsProvider>
      <Suspense fallback={<TastingFallback />}>
        <TastingPractice />
      </Suspense>
    </QuestionsProvider>
  );
}
