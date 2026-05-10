import { NextResponse } from "next/server";
import { z } from "zod";

import { callJsonChat } from "@/lib/openai";
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

  const { source, count, mode } = parsed.data;
  const { system, user } = buildSimilarPrompt({
    source: {
      ...source,
      type: source.type as QuestionType,
      difficulty: source.difficulty as Difficulty,
    },
    count,
    mode,
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
