"use client";

import { useState } from "react";
import { ArchiveLibrary } from "./ArchiveLibrary";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * /archive — 学習ライブラリ（Stitch アーカイブ HTML 参照）
 * 検索クエリは AppHeader（md+）と ArchiveLibrary（モバイル）で共有
 */
export default function ArchivePage() {
  const [archiveQuery, setArchiveQuery] = useState("");

  return (
    <div className="bg-background-deep text-on-surface flex min-h-dvh flex-col pb-with-bottom-nav">
      <AppHeader
        active="archive"
        archiveSearchQuery={archiveQuery}
        onArchiveSearchChange={setArchiveQuery}
      />
      <ArchiveLibrary query={archiveQuery} onQueryChange={setArchiveQuery} />
      <BottomNav active="archive" />
    </div>
  );
}
