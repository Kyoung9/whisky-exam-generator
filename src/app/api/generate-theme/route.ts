import { NextResponse } from "next/server";
import { z } from "zod";

import { callJsonChatWithOptionalReview } from "@/lib/ai-question-pipeline";
import {
  getFilteredPastQuestions,
  getPastMapQuestionsWithImage,
  stratifiedSamplePastQuestions,
} from "@/lib/exams";
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
  type PastExamQuestion,
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

  let mapAnchor: PastExamQuestion | null = null;
  if (type === "map") {
    const candidates = getPastMapQuestionsWithImage({
      years: [...EXAM_YEARS],
      categories: categoryFilter,
    }).filter((q) => q.difficulty === difficulty);
    mapAnchor =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]!
        : null;
    if (!mapAnchor) {
      return NextResponse.json(
        {
          error:
            "この難易度・カテゴリに合う画像付きの地図問題がありません。条件を変えてください。",
        },
        { status: 422 },
      );
    }
  }

  const { system, user } = buildThemePrompt({
    theme,
    count,
    difficulty: difficulty as Difficulty,
    category: category as Category | undefined,
    type: type as QuestionType | undefined,
    pastQuestionSamples,
    mapAnchor: type === "map" ? mapAnchor : undefined,
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

  const questions = toGeneratedQuestions(aiParsed.data, {
    mapImageFrom:
      type === "map" && mapAnchor?.imageRef
        ? {
            imageRef: mapAnchor.imageRef,
            imageSourcePage: mapAnchor.imageSourcePage,
            imageDescription: mapAnchor.imageDescription,
          }
        : undefined,
  });
  return NextResponse.json({ questions });
}
