import type { ExamSet } from "@/types/exam-set";
import type { GeneratedQuestion } from "@/types/question";
import type { Json } from "@/types/database";
import { createBrowserSupabaseClient } from "./browser";

/**
 * ブラウザから saved_question_sets を読み書きする。
 * RLS: insert/update/delete は本人のみ、select は is_public または author。
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

type SavedSetRow = {
  id: string;
  title: string;
  questions: Json;
  created_at: string;
  updated_at: string;
  author_id: string;
  is_public: boolean;
};

function rowToExamSet(
  row: SavedSetRow,
  authorDisplayName?: string | null,
): ExamSet {
  const questions = Array.isArray(row.questions)
    ? (row.questions as unknown as GeneratedQuestion[])
    : [];
  return {
    id: row.id,
    name: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    questions,
    categoryHints: topCategories(questions),
    authorId: row.author_id,
    authorDisplayName: authorDisplayName ?? undefined,
    isPublic: row.is_public,
  };
}

async function fetchDisplayNamesForAuthorIds(
  authorIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(authorIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);

  if (error || !data) {
    if (error) console.error("[fetchDisplayNamesForAuthorIds]", error.message);
    return map;
  }
  for (const row of data) {
    const name =
      typeof row.display_name === "string" && row.display_name.trim()
        ? row.display_name.trim()
        : null;
    if (name) map.set(row.id, name);
  }
  return map;
}

async function rowsToExamSetsWithAuthors(
  rows: SavedSetRow[],
): Promise<ExamSet[]> {
  const nameMap = await fetchDisplayNamesForAuthorIds(
    rows.map((r) => r.author_id),
  );
  return rows.map((r) =>
    rowToExamSet(r, nameMap.get(r.author_id) ?? null),
  );
}

const SELECT_FULL =
  "id, title, questions, created_at, updated_at, author_id, is_public" as const;

export async function fetchMySavedSets(): Promise<ExamSet[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("saved_question_sets")
      .select(SELECT_FULL)
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[fetchMySavedSets]", error.message);
      return [];
    }
    return rowsToExamSetsWithAuthors(data as SavedSetRow[]);
  } catch {
    return [];
  }
}

export async function fetchPublicSavedSets(opts: {
  limit?: number;
  offset?: number;
  q?: string;
  /** 自分の公開セットを一覧から除ける */
  excludeOwn?: boolean;
}): Promise<ExamSet[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const limit = Math.min(100, Math.max(1, opts.limit ?? 48));
    const offset = Math.max(0, opts.offset ?? 0);

    let query = supabase
      .from("saved_question_sets")
      .select(SELECT_FULL)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (opts.excludeOwn) {
      query = query.neq("author_id", user.id);
    }

    const q = opts.q?.trim();
    if (q) {
      query = query.ilike("title", `%${q.replace(/%/g, "\\%")}%`);
    }

    const { data, error } = await query;
    if (error || !data) {
      if (error) console.error("[fetchPublicSavedSets]", error.message);
      return [];
    }
    return rowsToExamSetsWithAuthors(data as SavedSetRow[]);
  } catch {
    return [];
  }
}

export async function fetchSavedSetById(id: string): Promise<ExamSet | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from("saved_question_sets")
      .select(SELECT_FULL)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("[fetchSavedSetById]", error.message);
      return null;
    }
    const rows = await rowsToExamSetsWithAuthors([data as SavedSetRow]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function insertSavedSet(input: {
  name: string;
  questions: GeneratedQuestion[];
  isPublic?: boolean;
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
      is_public: input.isPublic ?? true,
    })
    .select(SELECT_FULL)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "保存に失敗しました");
  }
  const rows = await rowsToExamSetsWithAuthors([data as SavedSetRow]);
  const created = rows[0];
  if (!created) throw new Error("保存に失敗しました");
  return created;
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

export type SavedSetRemotePatch = {
  title?: string;
  questions?: GeneratedQuestion[];
  is_public?: boolean;
};

export async function updateSavedSetRemote(
  id: string,
  patch: SavedSetRemotePatch,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    row.title = patch.title.trim() || "Untitled";
  }
  if (patch.questions !== undefined) {
    row.questions = patch.questions as unknown as Json;
  }
  if (patch.is_public !== undefined) {
    row.is_public = patch.is_public;
  }
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("saved_question_sets")
    .update(row)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
