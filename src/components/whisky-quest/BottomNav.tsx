import Link from "next/link";

/*
 * WhiskyQuest 共通ボトムナビゲーション (5タブ)
 * - active prop で塗りアイコン + 拡大表示に切り替え
 * - 「蒸留」= 予想問題ジェネレーター (/generate) へリンク
 */

export type NavTabKey =
  | "cellar"
  | "distill"
  | "taste"
  | "archive"
  | "analytics";

type NavTab = {
  key: NavTabKey;
  icon: string;
  label: string;
  href?: string;
};

// 役割でタブを分離: ダッシュボード=今日の進捗, アナリティクス=深い分析,
// アカウント設定/マイ EXAMS は右上アバターメニューに集約。
const NAV_TABS: NavTab[] = [
  {
    key: "cellar",
    icon: "today",
    label: "ダッシュボード",
    href: "/cellar",
  },
  { key: "distill", icon: "science", label: "問題生成", href: "/generate" },
  { key: "taste", icon: "wine_bar", label: "模擬試験", href: "/tasting" },
  {
    key: "archive",
    icon: "auto_stories",
    label: "過去問",
    href: "/archive",
  },
  {
    key: "analytics",
    icon: "query_stats",
    label: "アナリティクス",
    href: "/analytics",
  },
];

type Props = {
  active: NavTabKey;
};

export function BottomNav({ active }: Props) {
  return (
    <nav
      aria-label="メインナビゲーション (モバイル)"
      className="bg-glass-fill border-glass-stroke fixed bottom-0 left-0 z-50 flex min-h-[calc(5rem+env(safe-area-inset-bottom,0px))] w-full items-center justify-around border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden"
    >
      {NAV_TABS.map((tab) => {
        const isActive = tab.key === active;
        const baseClass =
          "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center transition-all duration-150";
        const stateClass = isActive
          ? "text-amber-gold font-bold scale-110 active:scale-95"
          : "text-on-surface-variant opacity-60 hover:text-amber-gold hover:opacity-100";

        const inner = (
          <>
            <span
              className="material-symbols-outlined"
              style={
                isActive ? { fontVariationSettings: '"FILL" 1' } : undefined
              }
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            <span className="mt-1 text-[10px] font-[family-name:var(--font-label-caps)] tracking-[0.08em]">
              {tab.label}
            </span>
          </>
        );

        if (tab.href) {
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`${baseClass} ${stateClass}`}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={tab.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={`${baseClass} ${stateClass}`}
          >
            {inner}
          </button>
        );
      })}
    </nav>
  );
}
