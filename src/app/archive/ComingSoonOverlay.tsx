import Link from "next/link";

/*
 * 過去問 タブの「開発中」オーバーレイ。
 *
 * AppHeader (z-50, 高さ 5rem) と BottomNav (z-50, 高さ 5rem) の間に被せ、
 * 既存 ArchiveLibrary は背景として薄く透ける。
 * タブ移動・ヘッダー操作はオーバーレイ外なので通常通り可能。
 */

export function ComingSoonOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background-deep/80 fixed inset-x-0 z-30 flex items-center justify-center px-4 backdrop-blur-sm"
      style={{
        top: "calc(5rem + env(safe-area-inset-top, 0px))",
        bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="glass-panel border-amber-gold/30 w-full max-w-md rounded-xl border p-6 text-center sm:p-8">
        <div
          aria-hidden="true"
          className="bg-amber-gold/15 text-amber-gold mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        >
          <span className="material-symbols-outlined text-3xl">
            construction
          </span>
        </div>
        <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
          開発中
        </p>
        <h2 className="text-headline-lg-mobile text-on-surface mb-3 font-[family-name:var(--font-headline-lg)]">
          近日、新しい用途で公開予定
        </h2>
        <p className="text-body-lg text-on-surface-variant mb-6 font-[family-name:var(--font-body-lg)]">
          現在この画面は別機能としてリニューアル準備中です。
          準備が整い次第、新しい体験をお届けします。
        </p>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          <Link href="/tasting" className="amber-cta justify-center">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
              aria-hidden="true"
            >
              wine_bar
            </span>
            模擬試験を開く
          </Link>
          <Link
            href="/cellar"
            className="amber-cta-outline justify-center"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              today
            </span>
            ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  );
}
