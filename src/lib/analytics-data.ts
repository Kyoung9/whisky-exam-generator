import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// /analytics 用のサーバーサイド集計ローダー。
// dashboard-data より深いビュー: カテゴリ全件、出題タイプ別、日別ヒートマップ、最近のトレンドなど。
// すべて RLS 下で本人のデータのみ。Supabase 未設定 / 未ログイン時は EMPTY を返す。

export type CategoryStat = {
  category: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type TypeStat = {
  type: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type DayStat = {
  date: string; // YYYY-MM-DD
  attempts: number;
  correct: number;
};

export type AnalyticsSnapshot = {
  user: User | null;
  totalAttempts: number;
  totalCorrect: number;
  attempts30d: number;
  correct30d: number;
  studyDays30d: number;
  currentStreak: number; // 連続学習日数 (今日を含む)
  longestStreak: number;
  unresolvedWrongCount: number;
  resolvedWrongCount: number;
  savedSetCount: number;
  categoryStats: CategoryStat[]; // 全カテゴリ (multi 件)
  typeStats: TypeStat[];
  dailyStats: DayStat[]; // 直近 30 日 (空の日も含む)
  recent: { correctRate: number; sampleSize: number }; // 直近 20 件の正答率
};

const EMPTY: AnalyticsSnapshot = {
  user: null,
  totalAttempts: 0,
  totalCorrect: 0,
  attempts30d: 0,
  correct30d: 0,
  studyDays30d: 0,
  currentStreak: 0,
  longestStreak: 0,
  unresolvedWrongCount: 0,
  resolvedWrongCount: 0,
  savedSetCount: 0,
  categoryStats: [],
  typeStats: [],
  dailyStats: [],
  recent: { correctRate: 0, sampleSize: 0 },
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

// 直近 30 日の日付配列 (古い → 新しい)
function build30DayKeys(): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function computeStreaks(daysWithStudy: Set<string>): {
  current: number;
  longest: number;
} {
  if (daysWithStudy.size === 0) return { current: 0, longest: 0 };

  // 今日 (UTC) からさかのぼって連続日数
  let current = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (daysWithStudy.has(key)) {
      current += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (i === 0) {
      // 今日まだ学習してない場合、昨日から数え直す (継続中扱い)
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  // longest: 全期間 (取得済みデータ範囲内) を走査
  const sorted = [...daysWithStudy].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev) {
      const prevDate = new Date(prev + "T00:00:00Z");
      prevDate.setUTCDate(prevDate.getUTCDate() + 1);
      const expected = prevDate.toISOString().slice(0, 10);
      run = key === expected ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }
  return { current, longest };
}

export async function loadAnalytics(): Promise<AnalyticsSnapshot> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return EMPTY;

  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return EMPTY;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const since30d = isoDaysAgo(30);
  const since365d = isoDaysAgo(365);

  // 並列で取得
  const [
    totalAttemptsRes,
    totalCorrectRes,
    attempts30dRes,
    correct30dRes,
    daysRes,
    weakRes,
    typeRes,
    notesAllRes,
    notesUnresolvedRes,
    setsRes,
    recentRes,
  ] = await Promise.all([
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .eq("correct", true),
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d),
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d)
      .eq("correct", true),
    // 連続学習日数の計算用 (1 年分の created_at)
    supabase
      .from("practice_attempts")
      .select("created_at, correct")
      .gte("created_at", since365d),
    supabase
      .from("user_weak_categories")
      .select("category, attempts, correct_count")
      .gt("attempts", 0)
      .order("attempts", { ascending: false }),
    // タイプ別: ビューがないので生データを集計
    supabase
      .from("practice_attempts")
      .select("question_type, correct"),
    supabase
      .from("wrong_answer_notes")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("wrong_answer_notes")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    supabase
      .from("saved_question_sets")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
    supabase
      .from("practice_attempts")
      .select("correct")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // 日別集計
  const rawDays = daysRes.data ?? [];
  const dayMap = new Map<string, { attempts: number; correct: number }>();
  const allDayKeys = new Set<string>();
  for (const row of rawDays) {
    const key = dateKey(row.created_at ?? "");
    if (!key) continue;
    allDayKeys.add(key);
    const cur = dayMap.get(key) ?? { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (row.correct) cur.correct += 1;
    dayMap.set(key, cur);
  }

  const dailyStats: DayStat[] = build30DayKeys().map((date) => ({
    date,
    attempts: dayMap.get(date)?.attempts ?? 0,
    correct: dayMap.get(date)?.correct ?? 0,
  }));

  const studyDays30d = dailyStats.filter((d) => d.attempts > 0).length;
  const { current: currentStreak, longest: longestStreak } =
    computeStreaks(allDayKeys);

  // カテゴリ統計 (ビューから取得済み)
  const categoryStats: CategoryStat[] = (weakRes.data ?? [])
    .map((row) => {
      const attempts = Number(row.attempts ?? 0);
      const correct = Number(row.correct_count ?? 0);
      return {
        category: row.category ?? "unknown",
        attempts,
        correct,
        accuracy: attempts > 0 ? correct / attempts : 0,
      };
    })
    .sort((a, b) => b.attempts - a.attempts);

  // タイプ別 (生データから)
  const rawType = typeRes.data ?? [];
  const typeMap = new Map<string, { attempts: number; correct: number }>();
  for (const row of rawType) {
    const t = (row.question_type ?? "unknown").trim() || "unknown";
    const cur = typeMap.get(t) ?? { attempts: 0, correct: 0 };
    cur.attempts += 1;
    if (row.correct) cur.correct += 1;
    typeMap.set(t, cur);
  }
  const typeStats: TypeStat[] = [...typeMap.entries()]
    .map(([type, v]) => ({
      type,
      attempts: v.attempts,
      correct: v.correct,
      accuracy: v.attempts > 0 ? v.correct / v.attempts : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  // 直近 20 件正答率
  const recentRows = recentRes.data ?? [];
  const recentCorrect = recentRows.filter((r) => r.correct).length;
  const recent = {
    correctRate:
      recentRows.length > 0 ? recentCorrect / recentRows.length : 0,
    sampleSize: recentRows.length,
  };

  return {
    user,
    totalAttempts: totalAttemptsRes.count ?? 0,
    totalCorrect: totalCorrectRes.count ?? 0,
    attempts30d: attempts30dRes.count ?? 0,
    correct30d: correct30dRes.count ?? 0,
    studyDays30d,
    currentStreak,
    longestStreak,
    unresolvedWrongCount: notesUnresolvedRes.count ?? 0,
    resolvedWrongCount:
      (notesAllRes.count ?? 0) - (notesUnresolvedRes.count ?? 0),
    savedSetCount: setsRes.count ?? 0,
    categoryStats,
    typeStats,
    dailyStats,
    recent,
  };
}
