"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import { loadExamSets } from "@/lib/exam-set-storage";
import { useUser } from "@/lib/supabase/use-user";
import { useExamSets } from "@/lib/use-exam-sets";
import type { ExamSet } from "@/types/exam-set";

/*
 * /sets — MY EXAMS（保存された試験セットの一覧）
 * Stitch「試験作成ツール」HTML 参照。
 * - 検索 / 並べ替え / 表示順切替
 * - 各カードから既存の PdfPreviewModal で PDF 出力
 * - 末尾に「新規作成」エンプティカード（→ /generate）
 *
 * BottomNav は archive を強調（5 タブ枠は維持）。/sets はサブ導線扱い。
 */

const PdfPreviewModal = dynamic(
  () => import("@/components/PdfPreviewModal").then((m) => m.PdfPreviewModal),
  { ssr: false },
);

type SortKey = "newest" | "oldest" | "size_desc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "新しい順",
  oldest: "古い順",
  size_desc: "問題数が多い順",
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function avatarInitials(label: string): string {
  // 日本語カテゴリは先頭 1〜2 文字
  const trimmed = label.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2);
}

function tier(count: number): string {
  if (count >= 40) return "Mastery Tier";
  if (count >= 20) return "Scholar Tier";
  if (count >= 10) return "Technical Review";
  return "Foundation";
}

export default function SetsPage() {
  const { user, loading: userLoading } = useUser();
  const { sets, hydrated, removeSet, migrateLocalSetsToCloud } = useExamSets();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [previewSet, setPreviewSet] = useState<ExamSet | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateBanner, setMigrateBanner] = useState<string | null>(null);

  const localSetsCount =
    !userLoading && user && typeof window !== "undefined"
      ? loadExamSets().length
      : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sets.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.memo ?? "").toLowerCase().includes(q) ||
            (s.categoryHints ?? []).some((c) => c.toLowerCase().includes(q)),
        )
      : sets;
    const sorted = [...filtered];
    switch (sortKey) {
      case "newest":
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "size_desc":
        sorted.sort((a, b) => b.questions.length - a.questions.length);
        break;
    }
    return sorted;
  }, [sets, query, sortKey]);

  return (
    <div className="bg-background-deep text-on-surface min-h-dvh pb-with-bottom-nav">
      <AppHeader active="distill" />

      <main className="mx-auto max-w-[1280px] px-4 pt-[calc(5rem+env(safe-area-inset-top,0px)+2rem)] pb-12 sm:px-6 md:px-16">
        {/* Hero */}
        <section className="mb-10 flex flex-col items-stretch justify-between gap-6 md:mb-12 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-label-caps text-amber-gold mb-2 font-[family-name:var(--font-label-caps)]">
              EXAM CREATOR
            </p>
            <h1 className="text-headline-lg text-on-surface mb-2 font-[family-name:var(--font-headline-lg)]">
              試験作成ツール
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl break-words font-[family-name:var(--font-body-lg)]">
              アーカイブされた蒸留データから独自の試験問題セットを構築します。学術的な精度と体系的な評価。
            </p>
          </div>
          <Link
            href="/generate"
            className="bg-amber-gold text-cask-brown shadow-amber-gold/10 group flex items-center justify-center gap-3 rounded-lg px-8 py-4 font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: '"FILL" 1' }}
              aria-hidden="true"
            >
              add_circle
            </span>
            <span className="text-title-md font-[family-name:var(--font-title-md)]">
              新しいセットを作成
            </span>
          </Link>
        </section>

        {hydrated && user && localSetsCount > 0 && (
          <div className="border-amber-gold/30 bg-amber-gold/5 mb-8 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-on-surface font-[family-name:var(--font-body-sm)]">
              このブラウザに保存されたローカルセットが{" "}
              <span className="text-amber-gold font-semibold">{localSetsCount}</span>{" "}
              件あります。クラウドに移すとダッシュボードの MY EXAMS と同期されます。
            </p>
            <button
              type="button"
              disabled={migrating}
              onClick={() => {
                setMigrateBanner(null);
                setMigrating(true);
                void migrateLocalSetsToCloud()
                  .then((n) => {
                    setMigrateBanner(
                      n > 0
                        ? `${n} 件をクラウドに移しました`
                        : "移行できるセットがありませんでした",
                    );
                  })
                  .catch(() => {
                    setMigrateBanner("移行に失敗しました。もう一度お試しください。");
                  })
                  .finally(() => setMigrating(false));
              }}
              className="text-label-caps bg-amber-gold text-cask-brown shrink-0 rounded-lg px-4 py-2 font-bold transition-opacity hover:opacity-90 disabled:opacity-40 font-[family-name:var(--font-label-caps)]"
            >
              {migrating ? "移行中…" : "ローカルセットをクラウドへ移行"}
            </button>
          </div>
        )}
        {migrateBanner && (
          <p
            role="status"
            className="text-body-sm text-amber-gold mb-6 font-[family-name:var(--font-body-sm)]"
          >
            {migrateBanner}
          </p>
        )}

        {/* 検索 + ソート */}
        <div className="border-glass-stroke mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
          <div className="relative min-w-[260px] flex-1">
            <span
              className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="問題セットを検索..."
              aria-label="問題セットを検索"
              className="text-label-caps placeholder:text-on-surface-variant/40 focus:border-amber-gold border-glass-stroke w-full border-0 border-b bg-transparent py-3 pr-3 pl-12 font-[family-name:var(--font-label-caps)] outline-none ring-0 transition-colors"
            />
          </div>
          <div className="relative flex gap-2">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="glass-card text-label-caps text-on-surface-variant hover:text-amber-gold flex items-center gap-2 rounded px-4 py-2 font-[family-name:var(--font-label-caps)] transition-colors"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                aria-hidden="true"
              >
                filter_list
              </span>
              {SORT_LABELS[sortKey]}
            </button>
            {sortOpen && (
              <ul
                role="listbox"
                className="glass-card absolute top-full right-0 z-30 mt-2 w-44 overflow-hidden rounded-lg border"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortKey === key}
                      onClick={() => {
                        setSortKey(key);
                        setSortOpen(false);
                      }}
                      className={`text-label-caps w-full px-3 py-2 text-left font-[family-name:var(--font-label-caps)] transition-colors ${
                        sortKey === key
                          ? "text-amber-gold bg-amber-gold/10"
                          : "text-on-surface hover:bg-white/5"
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* グリッド */}
        {!hydrated ? (
          <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
            読込中…
          </p>
        ) : sets.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((set) => (
              <li key={set.id}>
                <ExamSetCard
                  set={set}
                  onPreview={() => setPreviewSet(set)}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `「${set.name}」を削除しますか？この操作は取り消せません。`,
                      )
                    ) {
                      removeSet(set.id);
                    }
                  }}
                />
              </li>
            ))}
            {/* 末尾の Empty / Create New カード */}
            <li>
              <Link
                href="/generate"
                className="border-glass-stroke hover:border-amber-gold/40 group flex h-full min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white/[0.02] p-8 text-center transition-all"
              >
                <div className="bg-surface-container mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                  <span
                    className="material-symbols-outlined text-amber-gold text-3xl"
                    aria-hidden="true"
                  >
                    add
                  </span>
                </div>
                <h4 className="text-title-md text-on-surface font-[family-name:var(--font-title-md)]">
                  新しい問題セットを作成
                </h4>
                <p className="text-body-sm text-on-surface-variant mt-2 font-[family-name:var(--font-body-sm)]">
                  ジェネレーターで問題を作り、保存します
                </p>
              </Link>
            </li>
          </ul>
        )}

        {visible.length === 0 && hydrated && sets.length > 0 && (
          <p
            className="text-body-sm text-on-surface-variant mt-6 text-center font-[family-name:var(--font-body-sm)]"
            role="status"
          >
            検索条件に一致するセットがありません。
          </p>
        )}
      </main>

      <BottomNav active="distill" />

      {previewSet && (
        <PdfPreviewModal
          questions={previewSet.questions}
          onClose={() => setPreviewSet(null)}
        />
      )}
    </div>
  );
}

type CardProps = {
  set: ExamSet;
  onPreview: () => void;
  onDelete: () => void;
};

function ExamSetCard({ set, onPreview, onDelete }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hints = set.categoryHints ?? [];

  return (
    <article className="glass-card hover:border-amber-gold/50 group relative flex h-full flex-col overflow-hidden rounded-xl p-6 transition-all duration-500 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255, 191, 0, 0.05) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-6 flex items-start justify-between gap-2">
          <span className="border-amber-gold/20 text-amber-gold/60 text-label-caps rounded border px-2 py-0.5 text-[10px] tracking-widest uppercase font-[family-name:var(--font-label-caps)]">
            {tier(set.questions.length)}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="メニュー"
              className="text-on-surface-variant hover:text-amber-gold flex min-h-9 min-w-9 items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="glass-card absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="text-body-sm text-error hover:bg-error/10 w-full px-3 py-2 text-left font-[family-name:var(--font-body-sm)]"
                >
                  削除
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="text-headline-lg-mobile text-on-surface mb-2 break-words font-[family-name:var(--font-headline-lg)]">
          {set.name}
        </h3>
        {set.memo && (
          <p className="text-body-sm text-on-surface-variant mb-6 font-[family-name:var(--font-body-sm)]">
            {set.memo}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-label-caps text-on-surface-variant opacity-60 font-[family-name:var(--font-label-caps)]">
              QUESTIONS
            </span>
            <span className="text-title-md text-amber-gold font-[family-name:var(--font-title-md)]">
              {set.questions.length} 問
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-label-caps text-on-surface-variant opacity-60 font-[family-name:var(--font-label-caps)]">
              CREATED
            </span>
            <span className="text-body-sm font-[family-name:var(--font-body-sm)]">
              {formatDate(set.createdAt)}
            </span>
          </div>
        </div>

        <div className="border-glass-stroke mt-8 flex items-center justify-between gap-2 border-t pt-6">
          <div className="flex -space-x-2">
            {hints.length === 0 ? (
              <div
                className="bg-surface-container-high border-glass-stroke text-on-surface-variant flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-[family-name:var(--font-label-caps)]"
                aria-label="カテゴリ未指定"
              >
                —
              </div>
            ) : (
              hints.slice(0, 2).map((h, i) => (
                <div
                  key={`${h}-${i}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-[family-name:var(--font-label-caps)] ${
                    i === 0
                      ? "bg-cask-brown border-glass-stroke text-on-surface"
                      : "bg-surface-container-high border-glass-stroke text-on-surface-variant"
                  }`}
                  title={h}
                >
                  {avatarInitials(h)}
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onPreview}
            className="text-amber-gold text-label-caps flex min-h-9 items-center gap-2 font-[family-name:var(--font-label-caps)] transition-transform hover:translate-x-1"
          >
            <span>DOWNLOAD PDF</span>
            <span className="material-symbols-outlined" aria-hidden="true">
              download
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="border-glass-stroke flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white/[0.02] p-12 text-center">
      <div className="bg-surface-container mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <span
          className="material-symbols-outlined text-amber-gold text-3xl"
          aria-hidden="true"
        >
          inventory_2
        </span>
      </div>
      <h4 className="text-title-md text-on-surface font-[family-name:var(--font-title-md)]">
        まだ保存されたセットがありません
      </h4>
      <p className="text-body-sm text-on-surface-variant mt-2 max-w-sm font-[family-name:var(--font-body-sm)]">
        ジェネレーターで問題を作成し、サイドバーの「現在のセットを保存」ボタンから保管できます。
      </p>
      <Link
        href="/generate"
        className="amber-cta mt-6 inline-flex items-center gap-2"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: '"FILL" 1' }}
          aria-hidden="true"
        >
          add_circle
        </span>
        ジェネレーターを開く
      </Link>
    </div>
  );
}
