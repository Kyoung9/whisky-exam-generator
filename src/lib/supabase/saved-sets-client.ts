import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";
import type { Json } from "@/types/database";
import { createBrowserSupabaseClient } from "./browser";

/**
 * ブラウザから saved_question_sets を読み書きする。
 * RLS: insert/update/delete は本人のみ、select は is_public または author。
 * MY EXAMS 一覧は author_id で絞る。
 */

function topCategories(questions: GeneratedQuestion[]): string[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    if (!q.category) continue;
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}

function rowToExamSet(row: {
  id: string;
  title: string;
  questions: Json;
  created_at: string;
}): ExamSet {
  const questions = Array.isArray(row.questions)
    ? (row.questions as unknown as GeneratedQuestion[])
    : [];
  return {
    id: row.id,
    name: row.title,
    createdAt: new Date(row.created_at).getTime(),
    questions,
    categoryHints: topCategories(questions),
  };
}

export async function fetchMySavedSets(): Promise<ExamSet[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("saved_question_sets")
      .select("id, title, questions, created_at")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[fetchMySavedSets]", error.message);
      return [];
    }
    return data.map(rowToExamSet);
  } catch {
    return [];
  }
}

export async function insertSavedSet(input: {
  name: string;
  questions: GeneratedQuestion[];
}): Promise<ExamSet> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data, error } = await supabase
    .from("saved_question_sets")
    .insert({
      author_id: user.id,
      title: input.name.trim() || "Untitled",
      questions: input.questions as unknown as Json,
    })
    .select("id, title, questions, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "保存に失敗しました");
  }
  return rowToExamSet(data);
}

export async function deleteSavedSetRemote(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from("saved_question_sets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateSavedSetTitleRemote(
  id: string,
  title: string,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase
    .from("saved_question_sets")
    .update({ title: title.trim() || "Untitled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
