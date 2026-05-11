import Link from "next/link";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * WhiskyQuest セラー画面
 * Source: Stitch design "セラー (Cellar)"
 * - 熟成進捗 (レベル + バーチャート)
 * - 横スクロール統計カード3枚
 * - クイックアクション 2 ボタン
 * - 最近の評価 リスト (ボトル placeholder + 平点 + タグ)
 * - 共通 AppHeader / BottomNav (active=cellar)
 */

type MaturationBar = {
  containerHeight: string;
  fillHeight: string;
  dashed?: boolean;
};

const MATURATION_BARS: MaturationBar[] = [
  { containerHeight: "h-12", fillHeight: "h-1/2" },
  { containerHeight: "h-16", fillHeight: "h-2/3" },
  { containerHeight: "h-20", fillHeight: "h-3/4" },
  { containerHeight: "h-24", fillHeight: "h-4/5" },
  { containerHeight: "h-14", fillHeight: "h-1/3" },
  { containerHeight: "h-10", fillHeight: "h-0", dashed: true },
];

type Stat = {
  label: string;
  value: string;
};

const STATS: Stat[] = [
  { label: "学習時間", value: "128.4" },
  { label: "習得済み", value: "42" },
  { label: "平均評価", value: "8.4" },
];

type Tag = { label: string; primary?: boolean };

type Assessment = {
  name: string;
  region: string;
  score: number;
  tags: Tag[];
};

const ASSESSMENTS: Assessment[] = [
  {
    name: "ラガヴーリン 16年",
    region: "アイラ・シングルモルト",
    score: 94,
    tags: [
      { label: "ピート", primary: true },
      { label: "潮風" },
    ],
  },
  {
    name: "ザ・マッカラン 12年",
    region: "スペイサイド・シングルモルト",
    score: 88,
    tags: [
      { label: "シェリー", primary: true },
      { label: "オーク" },
    ],
  },
  {
    name: "響 JAPANESE HARMONY",
    region: "ジャパニーズ・ブレンデッド",
    score: 91,
    tags: [
      { label: "フローラル", primary: true },
      { label: "ハチミツ" },
    ],
  },
];

export default function CellarPage() {
  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="cellar" />

      <main className="mx-auto max-w-md px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1rem)] sm:px-6">
        {/* 熟成進捗 ヒーロー */}
        <section className="mb-8">
          <h2 className="text-label-caps text-amber-gold mb-4 font-[family-name:var(--font-label-caps)]">
            熟成進捗
          </h2>
          <div className="glass-panel relative flex h-64 items-end justify-between overflow-hidden rounded-xl p-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              aria-hidden="true"
            >
              <div className="maturation-gradient h-full w-full" />
            </div>
            <div className="relative z-10 flex h-full w-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                    レベル 14
                  </p>
                  <p className="text-label-caps font-[family-name:var(--font-label-caps)] tracking-[0.08em] opacity-60">
                    マスターソムリエ・コース
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-amber-gold text-4xl"
                  aria-hidden="true"
                >
                  science
                </span>
              </div>
              <div className="flex h-24 items-end gap-2">
                {MATURATION_BARS.map((bar, idx) => (
                  <div
                    key={idx}
                    className={`bg-cask-brown relative w-full rounded-sm ${bar.containerHeight} ${
                      bar.dashed ? "border-amber-gold border border-dashed" : ""
                    }`}
                  >
                    {!bar.dashed && (
                      <div
                        className={`bg-amber-gold absolute bottom-0 w-full rounded-sm ${bar.fillHeight}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 統計: 横スクロール */}
        <section className="mb-8 -mx-4 overflow-x-auto px-4">
          <div className="flex gap-4 pb-2">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="glass-panel w-40 flex-shrink-0 rounded-xl p-4"
              >
                <p className="text-label-caps text-on-surface-variant mb-1 font-[family-name:var(--font-label-caps)]">
                  {stat.label}
                </p>
                <p className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* クイックアクション */}
        <section className="mb-8">
          <h2 className="text-label-caps text-amber-gold mb-4 font-[family-name:var(--font-label-caps)]">
            クイックアクション
          </h2>
          <div className="space-y-3">
            <Link
              href="/tasting"
              className="bg-amber-gold text-cask-brown flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: '"FILL" 1' }}
                aria-hidden="true"
              >
                wine_bar
              </span>
              <span className="text-label-caps font-[family-name:var(--font-label-caps)]">
                新しいテイスティングを開始
              </span>
            </Link>
            <Link
              href="/archive"
              className="border-glass-stroke bg-glass-fill text-amber-gold flex h-14 w-full items-center justify-center gap-2 rounded-xl border font-bold transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                auto_stories
              </span>
              <span className="text-label-caps font-[family-name:var(--font-label-caps)]">
                アーカイブを開く
              </span>
            </Link>
            <Link
              href="/sets"
              className="border-glass-stroke bg-glass-fill text-amber-gold flex h-14 w-full items-center justify-center gap-2 rounded-xl border font-bold transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                inventory_2
              </span>
              <span className="text-label-caps font-[family-name:var(--font-label-caps)]">
                MY EXAMS（保存セット）
              </span>
            </Link>
          </div>
        </section>

        {/* 最近の評価 */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
              最近の評価
            </h2>
            <button
              type="button"
              className="text-on-surface-variant text-xs font-[family-name:var(--font-label-caps)] tracking-[0.08em] opacity-60 transition-opacity hover:opacity-100"
            >
              すべて見る
            </button>
          </div>
          <div className="space-y-4">
            {ASSESSMENTS.map((item) => (
              <article
                key={item.name}
                className="glass-panel flex gap-4 rounded-xl p-4"
              >
                <div className="bg-surface-container-highest flex h-16 w-16 flex-shrink-0 items-center justify-center rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/whisky-bottle.svg"
                    alt={item.name}
                    className="h-12 w-12 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-title-md text-on-surface font-[family-name:var(--font-title-md)]">
                      {item.name}
                    </p>
                    <p className="text-amber-gold text-sm font-[family-name:var(--font-label-caps)] tracking-[0.08em] whitespace-nowrap">
                      {item.score} pts
                    </p>
                  </div>
                  <p className="text-body-sm mb-2 font-[family-name:var(--font-body-sm)] opacity-60">
                    {item.region}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`rounded border px-2 py-0.5 text-[10px] font-[family-name:var(--font-label-caps)] tracking-[0.08em] ${
                          tag.primary
                            ? "border-amber-gold text-amber-gold"
                            : "border-glass-stroke text-on-surface-variant"
                        }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="cellar" />
    </div>
  );
}
