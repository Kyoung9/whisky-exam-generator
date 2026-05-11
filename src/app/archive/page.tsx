"use client";

import { ArchiveLibrary } from "./ArchiveLibrary";
import { ComingSoonOverlay } from "./ComingSoonOverlay";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * /archive — 過去問 タブ。
 *
 * 既存の ArchiveLibrary (地域・キュレーター・地形図) は将来別用途で再開発する予定。
 * 当面は「開発中」オーバーレイで覆い、デザインは背景として薄く透ける形で残す。
 *
 * - AppHeader の archive 検索 props は渡さない (検索バーを隠す)
 * - ArchiveLibrary は aria-hidden + pointer-events-none で装飾化
 * - ComingSoonOverlay は AppHeader / BottomNav の間 (z-30) に重なる
 *
 * ArchiveLibrary は Client Component で関数 prop (onQueryChange) を受け取るため、
 * このページも Client Component として扱う (Server → Client 関数渡しは不可)。
 */

export default function ArchivePage() {
  return (
    <div className="bg-background-deep text-on-surface relative flex min-h-dvh flex-col pb-with-bottom-nav">
      <AppHeader active="archive" />

      <div
        aria-hidden="true"
        className="pointer-events-none flex flex-1 select-none flex-col"
      >
        <ArchiveLibrary query="" onQueryChange={() => {}} />
      </div>

      <ComingSoonOverlay />

      <BottomNav active="archive" />
    </div>
  );
}
