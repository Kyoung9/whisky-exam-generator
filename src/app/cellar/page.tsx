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
 * /cellar - WhiskyQuest「ダッシュボード」
 *
 * Server Component で Supabase から本人データを集計し、
 * 学習進捗・弱点カテゴリ・オ答ノート・保存セットを表示する。
 * 未ログイン時は「空状態 + サインイン CTA」を出す。
 */

export const dynamic = "force-dynamic";

const NUMBER_FMT = new Intl.NumberFormat("ja-JP");

function formatPercent(value: number | null): string {
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

      <main className="mx-auto w-full max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1.5rem)] sm:px-6 md:px-16">
        {data.user ? (
          <SignedInDashboard data={data} />
        ) : (
          <SignedOutHero />
        )}
      </main>

      <BottomNav active="cellar" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed-in: 本番ダッシュボード
// ---------------------------------------------------------------------------

function SignedInDashboard({ data }: { data: DashboardSnapshot }) {
  const user = data.user;
  if (!user) return null; // caller でガード済みだが TS 絞り込み用
  const accuracy7d =
    data.attempts7d > 0 ? data.correct7d / data.attempts7d : null;

  const greeting = greetingFor(user);

  return (
    <>
      {/* Hero: 挨拶 + 今週サマリー */}
      <section className="mb-10">
        <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
          ダッシュボード
        </p>
        <h1 className="text-headline-lg-mobile sm:text-headline-lg lg:text-display-lg text-amber-gold mb-3 font-[family-name:var(--font-display-lg)]">
          {greeting}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl font-[family-name:var(--font-body-lg)]">
          今週の学習状況と弱点カテゴリ、復習が必要な問題が一目で分かります。
        </p>
      </section>

      {/* KPI 4つ */}
      <section
        aria-label="今週の学習指標"
        className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
      >
        <KpiCard
          label="今週の挑戦数"
          value={NUMBER_FMT.format(data.attempts7d)}
          subtitle={`うち 正答 ${data.correct7d}`}
          accent
        />
        <KpiCard
          label="今週の正答率"
          value={formatPercent(accuracy7d)}
        />
        <KpiCard
          label="30日間の正答率"
          value={formatPercent(data.accuracy30d)}
          subtitle={`累計 ${NUMBER_FMT.format(data.totalAttempts)} 問`}
        />
        <KpiCard
          label="未解決オ答"
          value={NUMBER_FMT.format(data.unresolvedWrongCount)}
          subtitle={`学習日数 ${data.studyDays30d} / 30`}
        />
      </section>

      {/* 2カラム: 左 チャート + オ答ノート / 右 セット + クイック */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <WeakCategoriesPanel rows={data.weakCategories} />
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
// KPI カード
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
// 弱点カテゴリ (user_weak_categories ビュー)
// ---------------------------------------------------------------------------

function WeakCategoriesPanel({ rows }: { rows: WeakCategoryRow[] }) {
  return (
    <section className="glass-panel rounded-xl p-4 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-amber-gold text-base"
            aria-hidden="true"
          >
            radar
          </span>
          <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
            弱点カテゴリ TOP {rows.length || 5}
          </h2>
        </div>
        <Link
          href="/profile"
          className="text-label-caps text-amber-gold/70 hover:text-amber-gold font-[family-name:var(--font-label-caps)] text-[10px] underline-offset-4 hover:underline"
        >
          すべて見る
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          まだデータがありません。
          <Link
            href="/tasting"
            className="text-amber-gold ml-2 underline-offset-4 hover:underline"
          >
            模擬試験を始める
          </Link>
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
                  className="bg-amber-gold h-full rounded-full"
                  style={{
                    width: `${Math.max(4, Math.round(row.accuracy * 100))}%`,
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
// オ答ノート (wrong_answer_notes resolved=false)
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
          href="/tasting"
          className="text-label-caps text-amber-gold/70 hover:text-amber-gold font-[family-name:var(--font-label-caps)] text-[10px] underline-offset-4 hover:underline"
        >
          模擬試験へ
        </Link>
      </header>

      {notes.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant/70 font-[family-name:var(--font-body-sm)]">
          オ答ノートはありません。よくできています。
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
// My Sets
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
            マイセット
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
                href="/sets"
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
        <ActionLink
          href="/tasting"
          icon="wine_bar"
          label="模擬試験を始める"
          primary
        />
        <ActionLink
          href="/generate"
          icon="science"
          label="問題を生成"
        />
        <ActionLink
          href="/archive"
          icon="auto_stories"
          label="過去問を開く"
        />
        <ActionLink
          href="/sets"
          icon="inventory_2"
          label="MY EXAMS"
        />
      </div>
    </section>
  );
}

function ActionLink({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-amber-gold text-cask-brown hover:brightness-110"
    : "border-glass-stroke text-amber-gold hover:bg-amber-gold/5 border bg-transparent";
  return (
    <Link
      href={href}
      className={`flex h-12 items-center justify-center gap-2 rounded-lg font-bold transition-all ${cls}`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={primary ? { fontVariationSettings: '"FILL" 1' } : undefined}
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
// Signed-out: サインイン CTA + アプリ紹介
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
      icon: "radar",
      label: "弱点カテゴリを可視化",
      desc: "ログインすると、学習進捗・正答率・オ答ノートがそのままダッシュボードに。",
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
          学習データを保存して
          <br />
          あなたの弱点を見える化。
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-6 max-w-xl font-[family-name:var(--font-body-lg)]">
          サインインすると、試行・正答率・弱点カテゴリ・オ答ノートがこの画面に表示されます。
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
            サインインしですぐ試す
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
