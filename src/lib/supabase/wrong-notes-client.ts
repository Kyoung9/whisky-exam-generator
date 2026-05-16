import type { Json } from "@/types/database";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** 未解決誤答ノート 1 件（演習デッキ復元用） */
export type WrongNoteRecord = {
  id: string;
  external_question_key: string | null;
  question_snapshot: Json;
  expected_answer: Json | null;
  user_answer: Json | null;
  created_at: string;
};

export async function fetchUnresolvedWrongNotes(): Promise<WrongNoteRecord[]> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("wrong_answer_notes")
      .select(
        "id, external_question_key, question_snapshot, expected_answer, user_answer, created_at",
      )
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[fetchUnresolvedWrongNotes]", error.message);
      return [];
    }
    return data as WrongNoteRecord[];
  } catch {
    return [];
  }
}

export async function fetchUnresolvedWrongNotesCount(): Promise<number> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("wrong_answer_notes")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false);

    if (error) {
      console.error("[fetchUnresolvedWrongNotesCount]", error.message);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markWrongNoteResolved(noteId: string): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("wrong_answer_notes")
      .update({ resolved: true })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[markWrongNoteResolved]", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
