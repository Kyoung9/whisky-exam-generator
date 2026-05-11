import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// このモジュールは Server Component / Route Handler 専用。
// browser で使わないことだけ保証する (server-only パッケージ未導入)。

/**
 * /cellar (ダッシュボード) 用のサーバーサイド集計ローダー
 * クエリはすべて RLS 下で走る (本人のデータのみ取得)。
 *
 * Supabase env 未設定 / 未ログインだと user=null で返し、
 * 画面側で「空状態」を表示する。
 */

export type WeakCategoryRow = {
  category: string;
  attempts: number;
  correct: number;
  accuracy: number;
};

export type WrongNoteCard = {
  id: string;
  body: string;
  expectedAnswer: string | null;
  createdAt: string;
};

export type SetCard = {
  id: string;
  title: string;
  count: number;
  updatedAt: string;
};

export type DashboardSnapshot = {
  user: User | null;
  attempts7d: number;
  correct7d: number;
  accuracy30d: number | null;
  totalAttempts: number;
  studyDays30d: number;
  currentStreak: number;
  unresolvedWrongCount: number;
  weakCategories: WeakCategoryRow[];
  wrongNotes: WrongNoteCard[];
  mySets: SetCard[];
};

const EMPTY: DashboardSnapshot = {
  user: null,
  attempts7d: 0,
  correct7d: 0,
  accuracy30d: null,
  totalAttempts: 0,
  studyDays30d: 0,
  currentStreak: 0,
  unresolvedWrongCount: 0,
  weakCategories: [],
  wrongNotes: [],
  mySets: [],
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function pickQuestionBody(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    const obj = snapshot as Record<string, unknown>;
    const body = typeof obj.body === "string" ? obj.body : null;
    const question = typeof obj.question === "string" ? obj.question : null;
    return (body || question || "").trim();
  }
  return "";
}

function pickExpected(snapshot: unknown): string | null {
  if (typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "number" || typeof snapshot === "boolean") {
    return String(snapshot);
  }
  if (Array.isArray(snapshot)) {
    return snapshot.map((v) => String(v)).join(", ") || null;
  }
  if (snapshot && typeof snapshot === "object") {
    const obj = snapshot as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.answer === "string") return obj.answer;
  }
  return null;
}

export async function loadDashboard(): Promise<DashboardSnapshot> {
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

  const since7d = isoDaysAgo(7);
  const since30d = isoDaysAgo(30);

  const [
    attempts7dRes,
    correct7dRes,
    attempts30dRes,
    correct30dRes,
    totalAttemptsRes,
    studyRes,
    unresolvedRes,
    weakRes,
    wrongRes,
    setsRes,
  ] = await Promise.all([
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d)
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
    supabase
      .from("practice_attempts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("practice_attempts")
      .select("created_at")
      .gte("created_at", since30d),
    supabase
      .from("wrong_answer_notes")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    supabase
      .from("user_weak_categories")
      .select("category, attempts, correct_count")
      .gt("attempts", 0)
      .order("attempts", { ascending: false })
      .limit(20),
    supabase
      .from("wrong_answer_notes")
      .select("id, question_snapshot, expected_answer, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("saved_question_sets")
      .select("id, title, questions, updated_at")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const studyRows = studyRes.data ?? [];
  const distinctDays = new Set(
    studyRows
      .map((r) => (r.created_at ?? "").slice(0, 10))
      .filter((d) => d.length > 0),
  );

  // 連続学習日数 (今日を含む / 今日まだ学習してない場合は昨日から数える)
  let currentStreak = 0;
  {
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (distinctDays.has(key)) {
        currentStreak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else if (i === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  const accuracy30d =
    attempts30dRes.count && attempts30dRes.count > 0
      ? (correct30dRes.count ?? 0) / attempts30dRes.count
      : null;

  const weakCategories: WeakCategoryRow[] = (weakRes.data ?? [])
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
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const wrongNotes: WrongNoteCard[] = (wrongRes.data ?? []).map((row) => ({
    id: row.id,
    body:
      pickQuestionBody(row.question_snapshot) ||
      "(\u554f\u984c\u672c\u6587\u306a\u3057)",
    expectedAnswer: pickExpected(row.expected_answer),
    createdAt: row.created_at,
  }));

  const mySets: SetCard[] = (setsRes.data ?? []).map((row) => {
    const arr = Array.isArray(row.questions) ? row.questions : [];
    return {
      id: row.id,
      title: row.title,
      count: arr.length,
      updatedAt: row.updated_at,
    };
  });

  return {
    user,
    attempts7d: attempts7dRes.count ?? 0,
    correct7d: correct7dRes.count ?? 0,
    accuracy30d,
    totalAttempts: totalAttemptsRes.count ?? 0,
    studyDays30d: distinctDays.size,
    currentStreak,
    unresolvedWrongCount: unresolvedRes.count ?? 0,
    weakCategories,
    wrongNotes,
    mySets,
  };
}

