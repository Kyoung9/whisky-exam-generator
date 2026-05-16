"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadExamSets } from "@/lib/exam-set-storage";
import { fetchMySavedSets } from "@/lib/supabase/saved-sets-client";
import { fetchUnresolvedWrongNotesCount } from "@/lib/supabase/wrong-notes-client";
import { useUser } from "@/lib/supabase/use-user";
import type { ExamSet } from "@/types/exam-set";
import { EXAM_YEARS } from "@/types/question";

const PAST_EXAM_PDFS = [
  { year: 2024, href: "/past-exams/2024.pdf" },
  { year: 2023, href: "/past-exams/2023.pdf" },
  { year: 2022, href: "/past-exams/2022.pdf" },
  { year: 2021, href: "/past-exams/2021.pdf" },
] as const;

export function ArchiveLearningHub() {
  const { user, loading: userLoading } = useUser();
  const [sets, setSets] = useState<ExamSet[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    let cancelled = false;

    void (async () => {
      let loaded: ExamSet[] = [];
      if (user) {
        loaded = await fetchMySavedSets();
        const count = await fetchUnresolvedWrongNotesCount();
        if (!cancelled) setWrongCount(count);
      } else {
        loaded = loadExamSets();
        if (!cancelled) setWrongCount(0);
      }
      if (!cancelled) {
        setSets(loaded.slice(0, 3));
        setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  const retryHref = useMemo(() => {
    if (user) return "/tasting?retry=wrong";
    return `/login?next=${encodeURIComponent("/tasting?retry=wrong")}`;
  }, [user]);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-grow px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+1.5rem)] pb-12 sm:px-6 md:px-16">
      <section className="mb-8">
        <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
          ライブラリ
        </p>
        <h1 className="text-headline-lg-mobile text-amber-gold mb-2 font-[family-name:var(--font-headline-lg)] sm:text-headline-lg">
          学習ハブ
        </h1>
        <p className="text-body-sm text-on-surface-variant max-w-2xl font-[family-name:var(--font-body-sm)]">
          保存した試験セット・誤答復習・過去問演習・PDF をここから開けます。
        </p>
      </section>

      <section className="mb-6">
        <SectionHeader
          icon="bookmarks"
          title="マイ EXAMS"
          actionHref="/sets"
          actionLabel="すべて見る"
        />
        {!hydrated ? (
          <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
            読込中…
          </p>
        ) : sets.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
            保存セットがありません。
            <Link href="/generate" className="text-amber-gold ml-1 hover:underline">
              問題を生成
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {sets.map((set) => (
              <li key={set.id}>
                <Link
                  href={`/sets/${encodeURIComponent(set.id)}`}
                  className="glass-card border-glass-stroke hover:border-amber-gold/40 flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
                >
                  <span className="text-body-lg text-on-surface min-w-0 truncate font-[family-name:var(--font-body-lg)]">
                    {set.name || "Untitled"}
                  </span>
                  <span className="text-label-caps text-on-surface-variant shrink-0 font-[family-name:var(--font-label-caps)]">
                    {set.questions.length} 問
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <SectionHeader icon="task_alt" title="誤答復習" />
        <div className="glass-panel rounded-xl p-4 sm:p-5">
          <p className="text-body-sm text-on-surface-variant mb-4 font-[family-name:var(--font-body-sm)]">
            {user
              ? wrongCount > 0
                ? `未解決の誤答が ${wrongCount} 件あります。模擬試験で間違えた問題だけを復習できます。`
                : "未解決の誤答はありません。模擬試験を続けて記録を増やしましょう。"
              : "誤答ノートの復習にはログインが必要です。"}
          </p>
          <Link
            href={retryHref}
            className={`amber-cta inline-flex w-full justify-center sm:w-auto ${
              user && wrongCount === 0 ? "pointer-events-none opacity-40" : ""
            }`}
            aria-disabled={user ? wrongCount === 0 : undefined}
          >
            {user ? "誤答だけ復習する" : "ログインして復習"}
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <SectionHeader icon="wine_bar" title="過去問で練習" />
        <p className="text-body-sm text-on-surface-variant mb-3 font-[family-name:var(--font-body-sm)]">
          年度を選ぶと模擬試験の設定に反映されます。
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAM_YEARS.map((y) => (
            <Link
              key={y}
              href={`/tasting?years=${y}`}
              className="text-label-caps border-amber-gold/50 text-amber-gold hover:bg-amber-gold/10 rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-colors"
            >
              {y}年度
            </Link>
          ))}
          <Link
            href="/tasting"
            className="text-label-caps border-glass-stroke text-on-surface-variant hover:border-amber-gold rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-colors"
          >
            全年度・詳細設定
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <SectionHeader icon="picture_as_pdf" title="過去問 PDF" />
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAST_EXAM_PDFS.map(({ year, href }) => (
            <li key={year}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card border-glass-stroke hover:border-amber-gold/40 flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-colors"
              >
                <span
                  className="material-symbols-outlined text-amber-gold text-2xl"
                  aria-hidden="true"
                >
                  picture_as_pdf
                </span>
                <span className="text-label-caps text-on-surface font-[family-name:var(--font-label-caps)]">
                  {year}年度
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-body-sm text-on-surface-variant/60 text-center font-[family-name:var(--font-body-sm)]">
        地域マップなどの詳細アーカイブは今後追加予定です。
      </p>
    </main>
  );
}

function SectionHeader({
  icon,
  title,
  actionHref,
  actionLabel,
}: {
  icon: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-amber-gold text-base"
          aria-hidden="true"
        >
          {icon}
        </span>
        <h2 className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
          {title}
        </h2>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="text-label-caps text-amber-gold/70 hover:text-amber-gold text-[10px] underline-offset-4 hover:underline font-[family-name:var(--font-label-caps)]"
        >
          {actionLabel}
        </Link>
      )}
    </header>
  );
}
