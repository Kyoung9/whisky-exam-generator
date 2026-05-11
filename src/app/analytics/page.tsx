import Link from "next/link";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import {
  loadAnalytics,
  type AnalyticsSnapshot,
  type CategoryStat,
  type DayStat,
  type TypeStat,
} from "@/lib/analytics-data";

/**
 * /analytics — 学習データの「深い分析」ビュー
 *
 * cellar (ダッシュボード) は今日の進捗にフォーカスする一方、
 * ここは累積データを多角的に見せる場所:
 *   - 累積 KPI (挑戦・正答率・連続学習・解決済誤答)
 *   - カテゴリ全件の正答率ランキング
 *   - 出題タイプ別の正答率
 *   - 直近 30 日のヒートマップ + ライン (挑戦数 / 正答率)
 *
 * すべて Supabase から実データを取得 (RLS 下)。
 * 未ログイン or 未集計の場合は空状態。
 */

export const dynamic = "force-dynamic";

const NUMBER_FMT = new Intl.NumberFormat("ja-JP");

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "選択式",
  short_answer: "短答",
  essay: "記述",
  fill_in_the_blank: "穴埋め",
  true_false: "○×",
  unknown: "不明",
};

function typeLabel(t: string): string {
  return QUESTION_TYPE_LABELS[t] ?? t;
}

export default async function AnalyticsPage() {
  const data = await loadAnalytics();

  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="analytics" />

      <main className="mx-auto w-full max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1.5rem)] pb-12 sm:px-6 md:px-16">
        {data.user ? (
          <SignedIn data={data} />
        ) : (
          <SignedOut />
        )}
      </main>

      <BottomNav active="analytics" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed-in
// ---------------------------------------------------------------------------

function SignedIn({ data }: { data: AnalyticsSnapshot }) {
  const overallAccuracy =
    data.totalAttempts > 0 ? data.totalCorrect / data.totalAttempts : null;
  const accuracy30d =
    data.attempts30d > 0 ? data.correct30d / data.attempts30d : null;

  if (data.totalAttempts === 0) {
    return <EmptyForUser />;
  }

  return (
    <>
      <Hero
        accuracy={overallAccuracy}
        attempts={data.totalAttempts}
        streak={data.currentStreak}
      />

      <section
        aria-label="累積指標"
        className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <Kpi
          label="累計挑戦"
          value={NUMBER_FMT.format(data.totalAttempts)}
          subtitle={`正答 ${NUMBER_FMT.format(data.totalCorrect)}`}
          accent
        />
        <Kpi
          label="累計正答率"
          value={pct(overallAccuracy)}
          subtitle={
            data.recent.sampleSize > 0
              ? `直近 ${data.recent.sampleSize} 件 ${pct(data.recent.correctRate)}`
              : undefined
          }
        />
        <Kpi
          label="連続学習日数"
          value={`${data.currentStreak} 日`}
          subtitle={`最長 ${data.longestStreak} 日`}
        />
        <Kpi
          label="解決済誤答"
          value={`${data.resolvedWrongCount} / ${
            data.resolvedWrongCount + data.unresolvedWrongCount
          }`}
          subtitle={`残り ${data.unresolvedWrongCount} 件`}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <CategoryBreakdown rows={data.categoryStats} />
          <DailyTrend
            rows={data.dailyStats}
            studyDays={data.studyDays30d}
            attempts30d={data.attempts30d}
            accuracy30d={accuracy30d}
          />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <TypeBreakdown rows={data.typeStats} />
          <ContextCard
            savedSetCount={data.savedSetCount}
            unresolved={data.unresolvedWrongCount}
          />
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({
  accuracy,
  attempts,
  streak,
}: {
  accuracy: number | null;
  attempts: number;
  streak: number;
}) {
  return (
    <section className="mb-10">
      <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
        アナリティクス
      </p>
      <h1 className="text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg text-amber-gold mb-3 font-[family-name:var(--font-display-lg)]">
        学習データの全体像
      </h1>
      <p className="text-body-lg text-on-surface-variant max-w-2xl font-[family-name:var(--font-body-lg)]">
        累計 {NUMBER_FMT.format(attempts)} 問に挑戦、平均 {pct(accuracy)} の正答率。
        連続 {streak} 日間学習中です。
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

function Kpi({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-panel rounded-xl p-4 sm:p-5">
      <p className="text-label-caps text-on-surface-variant mb-2 font-[family-name:var(--font-label-caps)]">
        {label}
      </p>
      <p
        className={`text-headline-lg font-[family-name:var(--font-headline-lg)] ${
          accent ? "text-amber-gold" : "text-on-surface"
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-body-sm text-on-surface-variant/70 mt-1 font-[family-name:var(--font-body-sm)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// カテゴリ別ブレイクダウン (全件)
// ---------------------------------------------------------------------------

function CategoryBreakdown({ rows }: { rows: CategoryStat[] }) {
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-5 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-amber-gold text-base"
          aria-hidden="true"
        >
          radar
        </span>
        <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          カテゴリ別正答率 (全 {rows.length} カテゴリ)
        </h2>
      </header>

      {rows.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          まだデータがありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-on-surface font-medium font-[family-name:var(--font-body-sm)]">
                  {row.category}
                </span>
                <span className="text-label-caps text-on-surface-variant tabular-nums font-[family-name:var(--font-label-caps)]">
                  {row.correct}/{row.attempts} ({Math.round(row.accuracy * 100)}%)
                </span>
              </div>
              <div
                className="bg-cask-brown/60 h-1.5 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(row.accuracy * 100)}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, Math.round(row.accuracy * 100))}%`,
                    background:
                      row.accuracy >= 0.8
                        ? "var(--amber-gold)"
                        : row.accuracy >= 0.5
                          ? "rgba(255, 191, 0, 0.65)"
                          : "rgba(255, 191, 0, 0.35)",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 直近 30 日トレンド (棒 + ヒートマップ)
// ---------------------------------------------------------------------------

function DailyTrend({
  rows,
  studyDays,
  attempts30d,
  accuracy30d,
}: {
  rows: DayStat[];
  studyDays: number;
  attempts30d: number;
  accuracy30d: number | null;
}) {
  const maxAttempts = rows.reduce((m, r) => Math.max(m, r.attempts), 0);

  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-amber-gold text-base"
            aria-hidden="true"
          >
            calendar_month
          </span>
          <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
            直近 30 日のトレンド
          </h2>
        </div>
        <p className="text-label-caps text-on-surface-variant/70 font-[family-name:var(--font-label-caps)] tabular-nums">
          学習日 {studyDays} / 30 · 挑戦 {NUMBER_FMT.format(attempts30d)} 問 · 正答率 {pct(accuracy30d)}
        </p>
      </header>

      {/* 縦棒チャート (挑戦数) */}
      <div
        className="flex h-32 items-end gap-1 sm:gap-1.5"
        aria-label="日別挑戦数"
      >
        {rows.map((d) => {
          const height =
            maxAttempts > 0 ? Math.max(2, (d.attempts / maxAttempts) * 100) : 2;
          const acc = d.attempts > 0 ? d.correct / d.attempts : 0;
          const tooltip = `${d.date} · ${d.attempts}問 · ${
            d.attempts > 0 ? Math.round(acc * 100) + "%" : "—"
          }`;
          return (
            <div
              key={d.date}
              title={tooltip}
              className="bg-cask-brown/40 hover:bg-amber-gold/40 relative flex flex-1 items-end overflow-hidden rounded-sm transition-colors"
              style={{ minWidth: 0 }}
            >
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: `${height}%`,
                  background:
                    d.attempts === 0
                      ? "transparent"
                      : acc >= 0.7
                        ? "var(--amber-gold)"
                        : acc >= 0.4
                          ? "rgba(255, 191, 0, 0.55)"
                          : "rgba(255, 120, 60, 0.55)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="text-label-caps text-on-surface-variant/70 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-[family-name:var(--font-label-caps)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "var(--amber-gold)" }}
          />
          70%+
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "rgba(255, 191, 0, 0.55)" }}
          />
          40〜69%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "rgba(255, 120, 60, 0.55)" }}
          />
          〜39%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-cask-brown/40 inline-block h-2 w-2 rounded-sm" />
          学習なし
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 出題タイプ別
// ---------------------------------------------------------------------------

function TypeBreakdown({ rows }: { rows: TypeStat[] }) {
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-5 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-amber-gold text-base"
          aria-hidden="true"
        >
          quiz
        </span>
        <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          出題タイプ別
        </h2>
      </header>

      {rows.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          まだデータがありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.type}
              className="border-glass-stroke flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-on-surface truncate font-[family-name:var(--font-body-sm)]">
                  {typeLabel(r.type)}
                </p>
                <p className="text-label-caps text-on-surface-variant/70 mt-0.5 text-[10px] font-[family-name:var(--font-label-caps)]">
                  {r.correct}/{r.attempts} 問
                </p>
              </div>
              <span className="text-amber-gold text-title-md tabular-nums font-[family-name:var(--font-title-md)]">
                {Math.round(r.accuracy * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 文脈カード (関連リンク)
// ---------------------------------------------------------------------------

function ContextCard({
  savedSetCount,
  unresolved,
}: {
  savedSetCount: number;
  unresolved: number;
}) {
  return (
    <section
      aria-label="関連リンク"
      className="glass-panel rounded-xl p-4 sm:p-6"
    >
      <h2 className="text-label-caps text-on-surface-variant mb-4 flex items-center gap-2 font-[family-name:var(--font-label-caps)]">
        <span
          className="material-symbols-outlined text-amber-gold text-base"
          aria-hidden="true"
        >
          link
        </span>
        次のアクション
      </h2>
      <ul className="space-y-2">
        <li>
          <Link
            href="/cellar"
            className="border-glass-stroke hover:border-amber-gold/40 hover:bg-amber-gold/5 flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors"
          >
            <span className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)]">
              今日のダッシュボード
            </span>
            <span
              className="material-symbols-outlined text-amber-gold text-base"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/tasting"
            className="border-glass-stroke hover:border-amber-gold/40 hover:bg-amber-gold/5 flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors"
          >
            <span className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)]">
              {unresolved > 0
                ? `誤答 ${unresolved} 件を復習`
                : "新しい模擬試験を始める"}
            </span>
            <span
              className="material-symbols-outlined text-amber-gold text-base"
              aria-hidden="true"
            >
              wine_bar
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/sets"
            className="border-glass-stroke hover:border-amber-gold/40 hover:bg-amber-gold/5 flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors"
          >
            <span className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)]">
              MY EXAMS ({savedSetCount})
            </span>
            <span
              className="material-symbols-outlined text-amber-gold text-base"
              aria-hidden="true"
            >
              bookmarks
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 空状態
// ---------------------------------------------------------------------------

function EmptyForUser() {
  return (
    <section className="glass-panel max-w-2xl rounded-xl p-8">
      <span
        className="material-symbols-outlined text-amber-gold mb-3 text-3xl"
        aria-hidden="true"
      >
        query_stats
      </span>
      <h1 className="text-headline-lg text-on-surface mb-2 font-[family-name:var(--font-headline-lg)]">
        まだ分析するデータがありません
      </h1>
      <p className="text-body-lg text-on-surface-variant mb-6 font-[family-name:var(--font-body-lg)]">
        模擬試験を 1 度終えると、ここにカテゴリ別の正答率や連続学習日数が表示されます。
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/tasting" className="amber-cta">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
            aria-hidden="true"
          >
            wine_bar
          </span>
          模擬試験を始める
        </Link>
        <Link href="/generate" className="amber-cta-outline">
          問題を生成
        </Link>
      </div>
    </section>
  );
}

function SignedOut() {
  return (
    <section className="glass-panel max-w-2xl rounded-xl p-8">
      <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
        アナリティクス
      </p>
      <h1 className="text-headline-lg text-amber-gold mb-3 font-[family-name:var(--font-headline-lg)]">
        サインインして自分の学習データを分析
      </h1>
      <p className="text-body-lg text-on-surface-variant mb-6 font-[family-name:var(--font-body-lg)]">
        カテゴリ別の正答率、連続学習日数、出題タイプ別の傾向など、
        サインインしたあなたの実データだけがここに表示されます。
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/login?next=/analytics"
          className="amber-cta"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            login
          </span>
          サインイン
        </Link>
        <Link
          href="/signup?next=/analytics"
          className="amber-cta-outline"
        >
          アカウント作成
        </Link>
      </div>
    </section>
  );
}
