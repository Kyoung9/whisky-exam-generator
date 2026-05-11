import type { Json } from "@/types/database";
import type { PracticeItem, PracticeSourceMode } from "@/types/practice";
import type { ExamYear } from "@/types/question";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AnswerEntry = { submitted: string; correct: boolean };

/**
 * 模擬試験セッション終了時に、ログインユーザーのみ Supabase に記録する。
 * - practice_attempts: 回答済みの各問 1 行（未回答はスキップ）
 * - wrong_answer_notes: 不正解のみ（誤答ノート）
 *
 * env 未設定 / 未ログイン / エラー時は静かに return（UI はそのまま）。
 */
export async function persistPracticeSessionToSupabase(params: {
  deck: PracticeItem[];
  answerLog: (AnswerEntry | undefined)[];
  sessionId: string;
  mode: PracticeSourceMode;
  years: ExamYear[];
  elapsedSec: number;
}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;

  let supabase: ReturnType<typeof createBrowserSupabaseClient>;
  try {
    supabase = createBrowserSupabaseClient();
  } catch {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const attemptRows: {
    user_id: string;
    category: string;
    question_type: string | null;
    correct: boolean;
    external_question_key: string | null;
    metadata: Json;
  }[] = [];

  const noteRows: {
    user_id: string;
    question_snapshot: Json;
    expected_answer: Json | null;
    user_answer: Json | null;
    resolved: boolean;
    external_question_key: string | null;
  }[] = [];

  for (let i = 0; i < params.deck.length; i++) {
    const q = params.deck[i]!;
    const log = params.answerLog[i];
    if (!log) continue;

    attemptRows.push({
      user_id: user.id,
      category: (q.category ?? "unknown").trim() || "unknown",
      question_type: q.type,
      correct: log.correct,
      external_question_key: q.id,
      metadata: {
        session_id: params.sessionId,
        source: q.source,
        year: q.year ?? null,
        mode: params.mode,
        years: params.years,
        position: i,
        elapsed_sec: params.elapsedSec,
      },
    });

    if (!log.correct) {
      noteRows.push({
        user_id: user.id,
        question_snapshot: {
          body: q.body,
          type: q.type,
          source: q.source,
          year: q.year ?? null,
          choices: q.choices ?? null,
        },
        expected_answer: q.answer ?? null,
        user_answer: log.submitted,
        resolved: false,
        external_question_key: q.id,
      });
    }
  }

  if (attemptRows.length > 0) {
    const { error } = await supabase.from("practice_attempts").insert(attemptRows);
    if (error) console.error("[persistPracticeSession] practice_attempts", error.message);
  }

  if (noteRows.length > 0) {
    const { error } = await supabase.from("wrong_answer_notes").insert(noteRows);
    if (error) console.error("[persistPracticeSession] wrong_answer_notes", error.message);
  }
}
