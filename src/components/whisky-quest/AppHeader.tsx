import Link from "next/link";
import type { NavTabKey } from "./BottomNav";
import { UserAvatarMenu } from "./UserAvatarMenu";

/*
 * WhiskyQuest 共通アプリバー (ログイン後画面用)
 * - 左: ロゴ (→ /) + デスクトップ nav（md+）
 * - /archive 時 (md+): 検索欄（親から query を渡す）
 * - 右: 通知 + 設定 (md+) + アバター (→ /profile)
 *
 * モバイル (md 未満) では中央 nav は隠す。代わりに BottomNav が表示される。
 */

type Props = {
  active?: NavTabKey;
  /** /archive のみ: ヘッダー内検索（md+）と本文検索を同期 */
  archiveSearchQuery?: string;
  onArchiveSearchChange?: (value: string) => void;
};

// 直感ラベル: BottomNav と完全一致させて UI 統一
const HEADER_TABS: { key: NavTabKey; label: string; href: string }[] = [
  { key: "cellar", label: "ダッシュボード", href: "/cellar" },
  { key: "distill", label: "問題生成", href: "/generate" },
  { key: "taste", label: "模擬試験", href: "/tasting" },
  { key: "archive", label: "過去問", href: "/archive" },
  { key: "profile", label: "プロフィール", href: "/profile" },
];

export function AppHeader({
  active,
  archiveSearchQuery,
  onArchiveSearchChange,
}: Props) {
  return (
    <header className="bg-glass-fill border-glass-stroke fixed top-0 left-0 z-50 w-full border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between gap-2 px-4 md:gap-4 md:px-16">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
          <Link
            href="/"
            className="text-headline-lg text-amber-gold shrink-0 tracking-tight font-[family-name:var(--font-headline-lg)]"
          >
            WhiskyQuest
          </Link>

          <nav
            aria-label="メインナビゲーション (デスクトップ)"
            className="hidden shrink-0 items-center gap-6 md:flex"
          >
            {HEADER_TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "text-amber-gold border-amber-gold text-label-caps border-b-2 pb-1 font-[family-name:var(--font-label-caps)]"
                      : "text-on-surface-variant hover:text-primary-fixed text-label-caps font-[family-name:var(--font-label-caps)] transition-colors duration-300"
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {active === "archive" && onArchiveSearchChange != null && (
            <div className="mx-2 hidden min-w-0 max-w-[14rem] flex-1 md:mx-4 md:block lg:max-w-xs">
              <div className="relative">
                <input
                  type="search"
                  value={archiveSearchQuery ?? ""}
                  onChange={(e) => onArchiveSearchChange(e.target.value)}
                  placeholder="アーカイブを検索..."
                  aria-label="アーカイブを検索"
                  className="text-body-sm border-glass-stroke focus:border-amber-gold w-full border-0 border-b bg-transparent py-2 pr-9 pl-1 font-[family-name:var(--font-body-sm)] outline-none ring-0 transition-colors lg:pl-2 lg:pr-10"
                />
                <span
                  className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[18px] lg:right-2"
                  aria-hidden="true"
                >
                  search
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <button
            type="button"
            aria-label="通知"
            className="text-amber-gold flex min-h-11 min-w-11 items-center justify-center transition-opacity hover:opacity-80"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            type="button"
            aria-label="設定"
            className="text-amber-gold hidden min-h-11 min-w-11 items-center justify-center transition-opacity hover:opacity-80 md:inline-flex"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          <UserAvatarMenu />
        </div>
      </div>
    </header>
  );
}
