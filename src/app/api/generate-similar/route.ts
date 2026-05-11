import { NextResponse } from "next/server";
import { z } from "zod";

import { callJsonChatWithOptionalReview } from "@/lib/ai-question-pipeline";
import { buildSimilarPrompt } from "@/lib/prompts";
import {
  aiResponseSchema,
  similarRequestSchema,
  toGeneratedQuestions,
} from "@/lib/question-schema";
import type { Difficulty, QuestionType } from "@/types/question";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = similarRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: z.treeifyError(parsed.error) },
      { status: 422 }
    );
  }

  const { source, count, mode, includeSourceAnswer } = parsed.data;
  const { system, user } = buildSimilarPrompt({
    source: {
      ...source,
      type: source.type as QuestionType,
      difficulty: source.difficulty as Difficulty,
      imageRef: source.imageRef,
      imageDescription: source.imageDescription,
    },
    count,
    mode,
    includeSourceAnswer,
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
    pastMapAnchorId:
      source.type === "map" && source.imageRef && source.pastMapAnchorId
        ? source.pastMapAnchorId
        : undefined,
    mapImageFrom:
      source.type === "map" && source.imageRef
        ? {
            imageRef: source.imageRef,
            imageSourcePage: source.imageSourcePage,
            imageDescription: source.imageDescription,
          }
        : undefined,
  });
  return NextResponse.json({ questions });
}
