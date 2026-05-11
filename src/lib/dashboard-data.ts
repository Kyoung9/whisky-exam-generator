import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// \u3053\u306e\u30e2\u30b8\u30e5\u30fc\u30eb\u306f Server Component / Route Handler \u5c02\u7528\u3002
// browser \u3067\u4f7f\u308f\u306a\u3044\u3053\u3068\u3060\u3051\u4fdd\u8a3c\u3059\u308b (server-only \u30d1\u30c3\u30b1\u30fc\u30b8\u672a\u5c0e\u5165)\u3002

/**
 * /cellar (\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9) \u7528\u306e\u30b5\u30fc\u30d0\u30fc\u30b5\u30a4\u30c9\u96c6\u8a08\u30ed\u30fc\u30c0\u30fc
 * \u30af\u30a8\u30ea\u306f\u3059\u3079\u3066 RLS \u4e0b\u3067\u8d70\u308b (\u672c\u4eba\u306e\u30c7\u30fc\u30bf\u306e\u307f\u53d6\u5f97)\u3002
 *
 * Supabase env \u672a\u8a2d\u5b9a / \u672a\u30ed\u30b0\u30a4\u30f3\u3060\u3068 user=null \u3067\u8fd4\u3057\u3001
 * \u753b\u9762\u5074\u3067\u300c\u7a7a\u72b6\u614b\u300d\u3092\u8868\u793a\u3059\u308b\u3002
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
    unresolvedWrongCount: unresolvedRes.count ?? 0,
    weakCategories,
    wrongNotes,
    mySets,
  };
}
