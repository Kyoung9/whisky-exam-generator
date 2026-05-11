import { callJsonChat } from "@/lib/openai";

// 英語プロンプト（コーディングルール）
const REVIEW_SYSTEM = `You are a strict JSON reviewer for Japanese whisky exam practice generators.
You receive a draft object that MUST stay shaped exactly as: { "questions": [ ... ] }.
Each question must obey:
- Japanese text in body, choices, answer, explanation, theme, category where applicable
- type one of: multiple_choice, true_false_count, map, timeline, matching, table
- category one of: Scotch Whisky, Irish Whiskey, American Whiskey, Canadian Whisky, Japanese Whisky, World Whisky
- difficulty one of: easy, medium, hard
- multiple_choice: exactly 4 choices; answer equals one choice string
- true_false_count: 4 choice strings; answer is the count of true statements as a string digit
Fix only what is needed to satisfy these rules. Preserve intended facts when possible.
Return ONLY valid JSON with no markdown or commentary.`;

function isReviewEnabled(): boolean {
  const v = process.env.AI_QUESTION_REVIEW_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

// 1 回目の生成後、環境変数が有効なら 2 回目で JSON を整える
export async function callJsonChatWithOptionalReview(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const draft = await callJsonChat(params);
  if (!isReviewEnabled()) {
    return draft;
  }

  const user = `Review and correct the following draft. Return the full corrected JSON object only.

${JSON.stringify(draft)}`;
  return callJsonChat({ system: REVIEW_SYSTEM, user });
}
