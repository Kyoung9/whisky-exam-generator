import { callJsonChat } from "@/lib/openai";
import { buildReviewPrompt } from "@/lib/prompts";

/** 2 パス目の査読を有効にする（環境変数 AI_QUESTION_REVIEW_ENABLED=true|1|yes） */
export function isAiQuestionReviewEnabled(): boolean {
  const v = process.env.AI_QUESTION_REVIEW_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * 1 回目の生成のあと、オプションで査読用の 2 回目の JSON 生成を挟む。
 */
export async function callJsonChatWithOptionalReview(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const first = await callJsonChat(params);
  if (!isAiQuestionReviewEnabled()) {
    return first;
  }
  const rawText = typeof first === "string" ? first : JSON.stringify(first);
  const { system, user } = buildReviewPrompt(rawText);
  return callJsonChat({ system, user });
}
