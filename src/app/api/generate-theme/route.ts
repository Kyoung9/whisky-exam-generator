import { NextResponse } from "next/server";
import { z } from "zod";

import { callJsonChatWithOptionalReview } from "@/lib/ai-question-pipeline";
import { getFilteredPastQuestions, stratifiedSamplePastQuestions } from "@/lib/exams";
import { buildThemePrompt } from "@/lib/prompts";
import {
  aiResponseSchema,
  themeRequestSchema,
  toGeneratedQuestions,
} from "@/lib/question-schema";
import {
  EXAM_YEARS,
  type Category,
  type Difficulty,
  type QuestionType,
} from "@/types/question";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = themeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: z.treeifyError(parsed.error) },
      { status: 422 }
    );
  }

  const { theme, count, difficulty, category, type } = parsed.data;
  const categoryFilter = category ? [category as Category] : undefined;
  const typeFilter = type ? [type as QuestionType] : undefined;

  const themePool = getFilteredPastQuestions({
    years: [...EXAM_YEARS],
    categories: categoryFilter,
    types: typeFilter,
  }).filter((q) => q.difficulty === difficulty);
  const pastQuestionSamples = stratifiedSamplePastQuestions(
    themePool,
    Math.min(8, themePool.length)
  );

  const { system, user } = buildThemePrompt({
    theme,
    count,
    difficulty: difficulty as Difficulty,
    category: category as Category | undefined,
    type: type as QuestionType | undefined,
    pastQuestionSamples,
  });

  let raw: unknown;
  try {
    raw = await callJsonChatWithOptionalReview({ system, user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI generation failed";
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
