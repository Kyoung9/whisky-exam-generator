import { QuestionsProvider } from "@/lib/store";
import { TastingPractice } from "@/components/tasting/TastingPractice";

/*
 * /tasting — 過去問・生成問題の実演習（セッション設定 + 採点 UI）
 * 生成問題は QuestionsProvider 経由で localStorage と同期される。
 */
export default function TastingPage() {
  return (
    <QuestionsProvider>
      <TastingPractice />
    </QuestionsProvider>
  );
}
