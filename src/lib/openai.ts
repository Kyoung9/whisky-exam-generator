import OpenAI from "openai";

// シングルトン化された OpenAI クライアント
let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-5-mini";
}

// 共通の chat 呼び出し: 必ず JSON object を返す
export async function callJsonChat(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: getModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("AI returned an empty response");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI response is not valid JSON");
  }
}
