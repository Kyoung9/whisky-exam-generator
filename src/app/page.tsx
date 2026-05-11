import Link from "next/link";
import { LandingHeroSlideshow } from "@/components/LandingHeroSlideshow";

/*
 * WhiskyQuest landing page
 * Source: Stitch design "メイン画面"
 * - Dark whisky / amber gold palette
 * - Glassmorphism quote panel over hero visual
 * - Step indicator, dual CTA, contextual footer
 */
export default function Home() {
  return (
    <div className="bg-background-deep text-on-surface flex min-h-screen flex-col">
      {/* トップナビゲーション */}
      <header className="bg-glass-fill border-glass-stroke fixed top-0 z-50 w-full border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between px-4 md:px-16">
          <h1 className="text-headline-lg text-amber-gold tracking-tight font-[family-name:var(--font-headline-lg)]">
            WhiskyQuest
          </h1>
          <Link
            href="/cellar"
            aria-label="セラーを開く"
            className="text-amber-gold flex min-h-11 min-w-11 items-center justify-center gap-2 transition-opacity hover:opacity-80 sm:min-w-0 sm:px-2"
          >
            <span className="material-symbols-outlined">school</span>
            <span className="text-label-caps hidden font-[family-name:var(--font-label-caps)] sm:inline">
              ENTER
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-stretch pt-[calc(5rem+env(safe-area-inset-top,0px))] md:flex-row">
        {/* ビジュアルカラム — 写真スライドショー (waldrebell ↔ whisky) */}
        <div className="relative min-h-[409px] w-full overflow-hidden md:min-h-0 md:w-1/2">
          <LandingHeroSlideshow />
          <div
            className="from-background-deep absolute inset-0 z-10 bg-gradient-to-t via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="absolute bottom-8 left-4 z-20 md:left-16">
            <div className="glass-panel max-w-sm rounded-xl p-6">
              <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
                SCHOLAR INITIATION
              </p>
              <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)] italic">
                &ldquo;The nose of a master is the library of the
                distillery.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツカラム */}
        <div className="flex w-full flex-col justify-center px-4 py-12 md:w-1/2 md:px-16">
          <div className="mx-auto max-w-xl md:mx-0">
            <div className="mb-12">
              <span className="text-label-caps text-amber-gold border-amber-gold border-b pb-1 font-[family-name:var(--font-label-caps)]">
                LEVEL 01: MATURATION
              </span>
              <h2 className="text-display-lg mt-6 leading-tight font-[family-name:var(--font-display-lg)]">
                Welcome to <br />
                <span className="text-amber-gold">the Quest.</span>
              </h2>
            </div>

            <div className="mb-12 space-y-6">
              <p className="text-body-lg text-on-surface text-xl leading-relaxed opacity-90 md:text-2xl">
                Begin your journey from a Novice to a Master Distiller.
                Calibrate your palate and master the art of spirits.
              </p>
              <p className="text-body-sm text-on-surface-variant max-w-md font-[family-name:var(--font-body-sm)]">
                Access the private archives of global distilleries. Learn the
                technical nuances of maturation, peat profiles, and the
                chemistry of the cask.
              </p>
            </div>

            {/* プログレスインジケーター */}
            <div className="mb-8 flex items-center gap-4">
              <div className="bg-glass-stroke relative h-px flex-1 overflow-hidden">
                <div className="bg-amber-gold absolute inset-0 w-1/3" />
              </div>
              <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
                STEP 01/03
              </span>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Link
                href="/generate"
                className="bg-amber-gold text-cask-brown text-label-caps w-full rounded-lg px-10 py-4 text-center font-[family-name:var(--font-label-caps)] tracking-widest transition-all hover:opacity-90 active:scale-95 sm:w-auto"
              >
                START YOUR MATURATION
              </Link>
              <Link
                href="/archive"
                className="border-glass-stroke text-on-surface text-label-caps hover:bg-glass-fill w-full rounded-lg border px-10 py-4 text-center font-[family-name:var(--font-label-caps)] tracking-widest transition-all sm:w-auto"
              >
                LEARN MORE
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* コンテキスチュアル フッター */}
      <footer className="bg-background-deep px-4 py-8 md:px-16">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="bg-amber-gold h-2 w-2 rounded-full" />
            <p className="text-on-surface-variant text-[10px] font-[family-name:var(--font-label-caps)] tracking-[0.08em] uppercase opacity-50">
              PRIVATE ARCHIVE ACCESS GRANTED
            </p>
          </div>
          <div className="flex gap-6">
            <span
              className="material-symbols-outlined text-on-surface-variant text-lg"
              aria-label="Verified"
            >
              verified
            </span>
            <span
              className="material-symbols-outlined text-on-surface-variant text-lg"
              aria-label="Lock"
            >
              lock
            </span>
            <span
              className="material-symbols-outlined text-on-surface-variant text-lg"
              aria-label="History"
            >
              history_edu
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
