import { NextResponse } from "next/server";
import { z } from "zod";

import { getFilteredPastQuestions } from "@/lib/exams";
import { callJsonChat } from "@/lib/openai";
import { buildGeneratePrompt } from "@/lib/prompts";
import {
  aiResponseSchema,
  generateRequestSchema,
  toGeneratedQuestions,
} from "@/lib/question-schema";
import type { Category, Difficulty, ExamYear, QuestionType } from "@/types/question";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI トークン削減のため過去問題は最大 N 件まで渡す（README §7.2）
const MAX_PAST_QUESTIONS_FOR_PROMPT = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: z.treeifyError(parsed.error) },
      { status: 422 }
    );
  }

  const { years, categories, types, count, difficulty, includeExplanation } = parsed.data;

  const pastQuestions = getFilteredPastQuestions({
    years: years as ExamYear[],
    categories: categories as Category[],
    types: types as QuestionType[],
    limit: MAX_PAST_QUESTIONS_FOR_PROMPT,
  });

  const { system, user } = buildGeneratePrompt({
    pastQuestions,
    categories: categories as Category[],
    types: types as QuestionType[],
    count,
    difficulty: difficulty as Difficulty,
    includeExplanation,
  });

  let raw: unknown;
  try {
    raw = await callJsonChat({ system, user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const aiParsed = aiResponseSchema.safeParse(raw);
  if (!aiParsed.success) {
    return NextResponse.json(
      { error: "AI returned an invalid shape", details: z.treeifyError(aiParsed.error) },
      { status: 422 }
    );
  }

  const questions = toGeneratedQuestions(aiParsed.data);
  return NextResponse.json({ questions });
}
