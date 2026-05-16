import Link from "next/link";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import {
  loadDashboard,
  type DashboardSnapshot,
  type SetCard,
  type WeakCategoryRow,
  type WrongNoteCard,
} from "@/lib/dashboard-data";

/**
 * /cellar — ダッシュボード = 「今日の学習ハブ」
 *
 * 役割を明確化:
 *   - 今週/連続学習日の進捗を一目で
 *   - 「次に何をすべきか」を 1 つの強い CTA で提案 (最弱カテゴリ復習 or 新規模試)
 *   - 未解決誤答 と 保存済セット を最近順に少しだけ
 *
 * 深い分析 (全カテゴリ正答率、出題タイプ別、日別ヒートマップ) は
 * /analytics に分離。ここから「もっと見る」リンクで遷移する。
 */

export const dynamic = "force-dynamic";

const NUMBER_FMT = new Intl.NumberFormat("ja-JP");

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
}

export default async function CellarPage() {
  const data = await loadDashboard();

  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="cellar" />

      <main className="mx-auto w-full max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1.5rem)] pb-12 sm:px-6 md:px-16">
        {data.user ? <SignedInDashboard data={data} /> : <SignedOutHero />}
      </main>

      <BottomNav active="cellar" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed-in
// ---------------------------------------------------------------------------

function SignedInDashboard({ data }: { data: DashboardSnapshot }) {
  const user = data.user;
  if (!user) return null;
  const accuracy7d =
    data.attempts7d > 0 ? data.correct7d / data.attempts7d : null;
  const greeting = greetingFor(user);
  const weakest = data.weakCategories[0];
  const fresh = data.totalAttempts === 0;

  return (
    <>
      <section className="mb-8">
        <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
          ダッシュボード
        </p>
        <h1 className="text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg text-amber-gold mb-3 font-[family-name:var(--font-display-lg)]">
          {greeting}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl font-[family-name:var(--font-body-lg)]">
          今週の進捗と、次に挑むべき問題を一目で。
          <Link
            href="/analytics"
            className="text-amber-gold ml-2 inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            もっと深く見る
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          </Link>
        </p>
      </section>

      {/* 強い 1 つの推薦 CTA + KPI 横並び */}
      <NextActionCard
        weakest={weakest}
        unresolved={data.unresolvedWrongCount}
        fresh={fresh}
      />

      <section
        aria-label="今週の指標"
        className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="今週の挑戦"
          value={NUMBER_FMT.format(data.attempts7d)}
          subtitle={`正答 ${data.correct7d}`}
          accent
        />
        <KpiCard label="今週の正答率" value={pct(accuracy7d)} />
        <KpiCard
          label="連続学習"
          value={`${data.currentStreak} 日`}
          subtitle={`今月 ${data.studyDays30d}/30 日学習`}
        />
        <KpiCard
          label="未解決誤答"
          value={NUMBER_FMT.format(data.unresolvedWrongCount)}
          subtitle={
            data.unresolvedWrongCount > 0 ? "復習で解決" : "クリア!"
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <WrongNotesPanel notes={data.wrongNotes} />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <MySetsPanel sets={data.mySets} />
          <QuickActionsPanel />
        </aside>
      </div>
    </>
  );
}

function greetingFor(user: NonNullable<DashboardSnapshot["user"]>): string {
  const meta = user.user_metadata as
    | { full_name?: string; name?: string; display_name?: string }
    | null
    | undefined;
  const name =
    meta?.full_name?.trim() ||
    meta?.name?.trim() ||
    meta?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Scholar";
  const hour = new Date().getHours();
  const slot =
    hour < 5
      ? "こんばんは"
      : hour < 11
        ? "おはよう"
        : hour < 18
          ? "こんにちは"
          : "こんばんは";
  return `${slot}、${name}さん`;
}

// ---------------------------------------------------------------------------
// Next Action: 「次に何をする」を 1 枚で提示する強いカード
// ---------------------------------------------------------------------------

function NextActionCard({
  weakest,
  unresolved,
  fresh,
}: {
  weakest: WeakCategoryRow | undefined;
  unresolved: number;
  fresh: boolean;
}) {
  let icon = "wine_bar";
  let kicker = "次のアクション";
  let title = "新しい模擬試験を始める";
  let body = "ランダム出題で実力をチェックしましょう。";
  let primaryHref = "/tasting";
  let primaryLabel = "模擬試験を始める";
  let secondary: { href: string; label: string } | null = {
    href: "/generate",
    label: "問題を生成",
  };

  if (fresh) {
    icon = "rocket_launch";
    kicker = "ようこそ";
    title = "まずは 1 度、模擬試験を体験";
    body =
      "過去問または生成問題で 5 分の腕試し。終えるとカテゴリ別の弱点が見えるようになります。";
  } else if (unresolved > 0) {
    icon = "task_alt";
    kicker = "今日の優先";
    title = `未解決の誤答ノートが ${unresolved} 件`;
    body = "間違えた問題を復習して、確実に解決済みにしましょう。";
    primaryHref = "/tasting?retry=wrong";
    primaryLabel = "復習を始める";
    secondary = weakest
      ? {
          href: "/analytics",
          label: "弱点を分析",
        }
      : null;
  } else if (weakest && weakest.accuracy < 0.7) {
    icon = "radar";
    kicker = "今日の優先";
    title = `${weakest.category} の正答率は ${Math.round(weakest.accuracy * 100)}%`;
    body = `挑戦 ${weakest.attempts} 回中 ${weakest.correct} 正答。このカテゴリを集中的に練習しましょう。`;
    primaryLabel = "このテーマで練習";
    secondary = {
      href: "/generate",
      label: "AIに問題を作らせる",
    };
  }

  return (
    <section
      aria-label="次のアクション"
      className="border-amber-gold/30 from-amber-gold/10 mb-8 overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            aria-hidden="true"
            className="bg-amber-gold/15 text-amber-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
          >
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-label-caps text-amber-gold/80 mb-1 font-[family-name:var(--font-label-caps)]">
              {kicker}
            </p>
            <h2 className="text-title-md text-on-surface mb-1 font-[family-name:var(--font-title-md)]">
              {title}
            </h2>
            <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
              {body}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={primaryHref}
            className="bg-amber-gold text-cask-brown text-label-caps inline-flex h-12 items-center gap-2 rounded-lg px-5 font-bold transition-all hover:brightness-110 active:scale-[0.98] font-[family-name:var(--font-label-caps)]"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: '"FILL" 1' }}
              aria-hidden="true"
            >
              play_arrow
            </span>
            {primaryLabel}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="border-amber-gold/40 text-amber-gold hover:bg-amber-gold/5 text-label-caps inline-flex h-12 items-center gap-2 rounded-lg border px-5 transition-colors font-[family-name:var(--font-label-caps)]"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

function KpiCard({
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
// 復習が必要な問題 (誤答ノート 最新 5)
// ---------------------------------------------------------------------------

function WrongNotesPanel({ notes }: { notes: WrongNoteCard[] }) {
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-amber-gold text-base"
            aria-hidden="true"
          >
            task_alt
          </span>
          <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
            復習が必要な問題
          </h2>
        </div>
        <Link
          href="/tasting?retry=wrong"
          className="text-label-caps text-amber-gold/70 hover:text-amber-gold font-[family-name:var(--font-label-caps)] text-[10px] underline-offset-4 hover:underline"
        >
          誤答復習へ
        </Link>
      </header>

      {notes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          誤答ノートはありません。よくできています。
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-glass-stroke rounded-lg border p-3 sm:p-4"
            >
              <p className="text-body-sm text-on-surface mb-2 line-clamp-2 font-[family-name:var(--font-body-sm)]">
                {note.body}
              </p>
              <div className="text-label-caps text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-[family-name:var(--font-label-caps)]">
                {note.expectedAnswer && (
                  <span>
                    正答{" "}
                    <span className="text-amber-gold">
                      {note.expectedAnswer}
                    </span>
                  </span>
                )}
                <span>{formatRelative(note.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// My Sets (最近 3 件)
// ---------------------------------------------------------------------------

function MySetsPanel({ sets }: { sets: SetCard[] }) {
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-amber-gold text-base"
            aria-hidden="true"
          >
            bookmarks
          </span>
          <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
            マイ EXAMS
          </h2>
        </div>
        <Link
          href="/sets"
          className="text-label-caps text-amber-gold/70 hover:text-amber-gold font-[family-name:var(--font-label-caps)] text-[10px] underline-offset-4 hover:underline"
        >
          すべて
        </Link>
      </header>

      {sets.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          保存したセットはありません。
          <Link
            href="/generate"
            className="text-amber-gold ml-1 underline-offset-4 hover:underline"
          >
            作成する
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/sets/${encodeURIComponent(set.id)}`}
                className="border-glass-stroke hover:bg-amber-gold/5 hover:border-amber-gold/40 flex items-baseline justify-between gap-2 rounded-lg border p-3 transition-colors"
              >
                <span className="text-body-sm text-on-surface min-w-0 truncate font-medium font-[family-name:var(--font-body-sm)]">
                  {set.title || "Untitled"}
                </span>
                <span className="text-label-caps text-on-surface-variant shrink-0 text-[10px] font-[family-name:var(--font-label-caps)]">
                  {set.count} 問
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

function QuickActionsPanel() {
  return (
    <section
      aria-label="クイックアクション"
      className="glass-panel rounded-xl p-4 sm:p-6"
    >
      <h2 className="text-label-caps text-on-surface-variant mb-4 flex items-center gap-2 font-[family-name:var(--font-label-caps)]">
        <span
          className="material-symbols-outlined text-amber-gold text-base"
          aria-hidden="true"
        >
          bolt
        </span>
        クイックアクション
      </h2>
      <div className="grid grid-cols-1 gap-2">
        <ActionLink href="/generate" icon="science" label="問題を生成" />
        <ActionLink href="/archive" icon="auto_stories" label="過去問を開く" />
        <ActionLink href="/analytics" icon="query_stats" label="深い分析" />
      </div>
    </section>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="border-glass-stroke text-amber-gold hover:bg-amber-gold/5 flex h-12 items-center justify-center gap-2 rounded-lg border bg-transparent font-bold transition-all"
    >
      <span
        className="material-symbols-outlined text-[20px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-label-caps font-[family-name:var(--font-label-caps)]">
        {label}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Signed-out
// ---------------------------------------------------------------------------

function SignedOutHero() {
  const features = [
    {
      icon: "science",
      label: "AI で予想問題を生成",
      desc: "過去問を参照してテーマ・難易度別に作成。",
    },
    {
      icon: "wine_bar",
      label: "模擬試験で演習",
      desc: "過去問と生成問をミックスして採点。",
    },
    {
      icon: "query_stats",
      label: "学習データを分析",
      desc: "サインインすると、カテゴリ別の正答率や連続学習日数がここに集まります。",
    },
    {
      icon: "bookmarks",
      label: "セットをクラウド保存",
      desc: "生成した試験セットを保存・共有 (編集は作者のみ)。",
    },
  ];

  return (
    <>
      <section className="mb-12 max-w-3xl">
        <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
          WhiskyQuest ダッシュボード
        </p>
        <h1 className="text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg text-amber-gold mb-4 font-[family-name:var(--font-display-lg)]">
          今日の学習を、ひと目で。
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-6 max-w-xl font-[family-name:var(--font-body-lg)]">
          サインインすると、今週の挑戦数・正答率・未解決誤答・次に挑むべきカテゴリがここに表示されます。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login?next=/cellar"
            className="bg-amber-gold text-cask-brown text-label-caps inline-flex h-12 items-center gap-2 rounded-lg px-5 font-bold uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(255,191,0,0.15)] transition-all hover:brightness-110 active:scale-[0.98] font-[family-name:var(--font-label-caps)]"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              login
            </span>
            サインイン
          </Link>
          <Link
            href="/signup?next=/cellar"
            className="border-amber-gold text-amber-gold hover:bg-amber-gold/10 text-label-caps inline-flex h-12 items-center gap-2 rounded-lg border px-5 font-bold uppercase tracking-[0.15em] transition-colors font-[family-name:var(--font-label-caps)]"
          >
            アカウント作成
          </Link>
          <Link
            href="/generate"
            className="text-on-surface-variant hover:text-amber-gold inline-flex h-12 items-center gap-2 px-3 underline-offset-4 hover:underline"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              flash_on
            </span>
            サインインせずに試す
          </Link>
        </div>
      </section>

      <section
        aria-label="アプリの主な機能"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {features.map((f) => (
          <article key={f.label} className="glass-panel rounded-xl p-5">
            <span
              className="material-symbols-outlined text-amber-gold mb-3 text-2xl"
              aria-hidden="true"
            >
              {f.icon}
            </span>
            <h3 className="text-title-md text-on-surface mb-1 font-[family-name:var(--font-title-md)]">
              {f.label}
            </h3>
            <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
              {f.desc}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
