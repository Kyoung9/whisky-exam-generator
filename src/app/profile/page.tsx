import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";

/*
 * WhiskyQuest プロフィール / Performance Analytics 画面
 * Source: Stitch design "プロフィール (デスクトップ アナリティクス)"
 * - Hero: 学術的地位 + 円形プログレス (75%)
 * - メインアナリティクス: ナレッジ・ホイール + メトリクス3カード
 * - 強み vs 弱み: 完成された知識 / 要熟成の分野 (進捗バー)
 *
 * モバイルでは 12カラム グリッドが 1 カラムにスタックされる。
 */

const KNOWLEDGE_WHEEL_LABELS = [
  { x: 200, y: 30, anchor: "middle", color: "#FFBF00", label: "熟成の物理学" },
  { x: 365, y: 160, anchor: "start", color: "#ede1d0", label: "蒸留の化学" },
  { x: 365, y: 240, anchor: "start", color: "#ede1d0", label: "地域の歴史" },
  { x: 200, y: 385, anchor: "middle", color: "#FFBF00", label: "法的枠組み" },
  { x: 35, y: 240, anchor: "end", color: "#ede1d0", label: "官能評価" },
  {
    x: 35,
    y: 160,
    anchor: "end",
    color: "#ede1d0",
    label: "ヴィンテージ・キュレーション",
  },
] as const;

// 円形プログレス: r=58, 円周 ≈ 364.42
const PROGRESS_PERCENT = 75;
const RING_RADIUS = 58;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_DASH_OFFSET = RING_CIRCUMFERENCE * (1 - PROGRESS_PERCENT / 100);

// 平均応答時間 ミニバーチャート (高さ %, 不透明度 %)
const RESPONSE_BARS = [
  { height: 40, opacity: 20 },
  { height: 60, opacity: 40 },
  { height: 50, opacity: 30 },
  { height: 90, opacity: 100 },
  { height: 70, opacity: 70 },
];

export default function ProfilePage() {
  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="profile" />

      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1.5rem)] sm:px-6 md:px-16 md:pt-[calc(5rem+env(safe-area-inset-top,0px)+2rem)]">
        {/* Hero: ランクとサマリー */}
        <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="flex flex-col justify-center md:col-span-8">
            <span className="text-label-caps text-amber-gold mb-2 tracking-[0.2em] font-[family-name:var(--font-label-caps)]">
              学術的地位
            </span>
            <h1 className="text-headline-lg md:text-display-lg text-on-surface mb-4 font-[family-name:var(--font-headline-lg)]">
              シニア・ディスティラー
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl font-[family-name:var(--font-body-lg)]">
              熟成プロセスと地域の歴史に対するあなたの卓越した知識は、アーカイブ内での地位を確固たるものにしました。「マスター・オブ・スピリット」への昇格には、官能評価に重点を置いてください。
            </p>
          </div>

          <div className="glass-panel flex flex-col items-center justify-center rounded-xl p-6 text-center md:col-span-4">
            <div className="relative mb-4 h-32 w-32">
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 128 128"
                role="img"
                aria-label={`次のランクまで ${PROGRESS_PERCENT}%`}
              >
                <circle
                  cx="64"
                  cy="64"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(255, 191, 0, 0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="#FFBF00"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_DASH_OFFSET}
                  strokeLinecap="round"
                  strokeWidth="8"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                  {PROGRESS_PERCENT}%
                </span>
                <span className="text-on-surface-variant text-[10px] font-[family-name:var(--font-label-caps)] tracking-[0.08em]">
                  次まで
                </span>
              </div>
            </div>
            <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
              次: マスター・オブ・スピリット
            </span>
          </div>
        </section>

        {/* メインアナリティクス */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* ナレッジ・ホイール */}
          <div className="glass-panel flex flex-col rounded-xl p-8 md:col-span-7">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-headline-lg text-on-surface font-[family-name:var(--font-headline-lg)]">
                  ナレッジ・ホイール
                </h2>
                <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                  分野別習熟度マッピング
                </span>
              </div>
              <span
                className="material-symbols-outlined text-amber-gold text-3xl"
                aria-hidden="true"
              >
                science
              </span>
            </div>

            <div className="flex flex-grow items-center justify-center py-8">
              <div className="flavor-wheel-svg relative aspect-square w-full max-w-md">
                <svg
                  className="h-full w-full"
                  viewBox="0 0 400 400"
                  role="img"
                  aria-label="分野別習熟度ホイール"
                >
                  {/* 同心円 */}
                  <circle
                    cx="200"
                    cy="200"
                    r="40"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="120"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="160"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                  {/* 軸 */}
                  <line
                    x1="200"
                    x2="200"
                    y1="40"
                    y2="360"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <line
                    x1="40"
                    x2="360"
                    y1="200"
                    y2="200"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <line
                    x1="86"
                    x2="314"
                    y1="86"
                    y2="314"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <line
                    x1="86"
                    x2="314"
                    y1="314"
                    y2="86"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  {/* データ多角形 */}
                  <polygon
                    points="200,60 320,130 330,270 200,340 70,270 80,130"
                    fill="rgba(255, 191, 0, 0.2)"
                    stroke="#FFBF00"
                    strokeWidth="2"
                  />
                  {/* ラベル */}
                  {KNOWLEDGE_WHEEL_LABELS.map((l) => (
                    <text
                      key={l.label}
                      x={l.x}
                      y={l.y}
                      fill={l.color}
                      textAnchor={l.anchor}
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                      letterSpacing="0.08em"
                    >
                      {l.label}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* メトリクスサイドパネル */}
          <div className="flex flex-col gap-6 md:col-span-5">
            {/* 正解率 */}
            <div className="glass-panel relative overflow-hidden rounded-xl p-6">
              <div className="relative z-10">
                <span className="text-label-caps text-on-surface-variant mb-1 block font-[family-name:var(--font-label-caps)]">
                  正解率
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-amber-gold text-4xl font-[family-name:var(--font-headline-lg)]">
                    92.4%
                  </span>
                  <span className="text-label-caps font-[family-name:var(--font-label-caps)] text-green-500">
                    +1.2% ↑
                  </span>
                </div>
              </div>
              <div
                className="absolute right-[-20px] bottom-[-20px] opacity-10"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-8xl">
                  analytics
                </span>
              </div>
            </div>

            {/* 得意な地域 */}
            <div className="glass-panel rounded-xl p-6">
              <span className="text-label-caps text-on-surface-variant mb-1 block font-[family-name:var(--font-label-caps)]">
                得意な地域
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-on-surface text-2xl font-[family-name:var(--font-headline-lg)]">
                    アイラ・モルト
                  </span>
                  <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                    45回のトライアル中 98% の精度
                  </p>
                </div>
                <span
                  className="material-symbols-outlined text-amber-gold"
                  aria-hidden="true"
                >
                  landscape
                </span>
              </div>
            </div>

            {/* 平均応答時間 */}
            <div className="glass-panel rounded-xl p-6">
              <span className="text-label-caps text-on-surface-variant mb-1 block font-[family-name:var(--font-label-caps)]">
                平均応答時間
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-on-surface text-3xl font-[family-name:var(--font-headline-lg)]">
                    3.8
                  </span>
                  <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                    秒
                  </span>
                </div>
                <div
                  className="flex h-8 w-24 items-end gap-1"
                  aria-label="直近5回の応答時間トレンド"
                >
                  {RESPONSE_BARS.map((bar, i) => (
                    <div
                      key={i}
                      className="bg-amber-gold w-full rounded-t-sm"
                      style={{
                        height: `${bar.height}%`,
                        opacity: bar.opacity / 100,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 強み vs 弱み */}
        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 完成された知識 */}
          <div className="glass-panel rounded-xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="material-symbols-outlined text-amber-gold"
                aria-hidden="true"
              >
                verified
              </span>
              <h3 className="text-headline-lg-mobile text-on-surface font-[family-name:var(--font-headline-lg)]">
                完成された知識
              </h3>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="text-label-caps flex justify-between font-[family-name:var(--font-label-caps)]">
                  <span className="text-on-surface">法的枠組み</span>
                  <span className="text-amber-gold">マスター</span>
                </div>
                <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-amber-gold h-full w-full shadow-[0_0_8px_rgba(255,191,0,0.5)]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-label-caps flex justify-between font-[family-name:var(--font-label-caps)]">
                  <span className="text-on-surface">蒸留の物理学</span>
                  <span className="text-amber-gold">94%</span>
                </div>
                <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-amber-gold h-full w-[94%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 要熟成 */}
          <div className="glass-panel rounded-xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="material-symbols-outlined text-amber-gold"
                aria-hidden="true"
              >
                hourglass_empty
              </span>
              <h3 className="text-headline-lg-mobile text-on-surface font-[family-name:var(--font-headline-lg)]">
                要熟成の分野
              </h3>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="text-label-caps flex justify-between font-[family-name:var(--font-label-caps)]">
                  <span className="text-on-surface-variant">
                    官能評価 (ピーテッド)
                  </span>
                  <span className="text-on-surface-variant">42%</span>
                </div>
                <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-cask-brown h-full w-[42%]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-label-caps flex justify-between font-[family-name:var(--font-label-caps)]">
                  <span className="text-on-surface-variant">
                    ニューワールド地域
                  </span>
                  <span className="text-on-surface-variant">58%</span>
                </div>
                <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-cask-brown h-full w-[58%]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNav active="profile" />
    </div>
  );
}
