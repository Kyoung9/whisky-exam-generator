"use client";

import { ArchiveLearningHub } from "./ArchiveLearningHub";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * /archive — 学習ライブラリ（MY EXAMS・誤答復習・過去問演習・PDF）
 */

export default function ArchivePage() {
  return (
    <div className="bg-background-deep text-on-surface relative flex min-h-dvh flex-col pb-with-bottom-nav">
      <AppHeader active="archive" />
      <ArchiveLearningHub />
      <BottomNav active="archive" />
    </div>
  );
}
