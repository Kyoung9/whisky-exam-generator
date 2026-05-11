import OpenAI from "openai";

import { callGeminiJsonChat } from "@/lib/gemini-json";

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

function getOptionalOpenAiTemperature(): number | undefined {
  const raw = process.env.OPENAI_TEMPERATURE?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

async function callOpenAIJsonChat(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const client = getOpenAIClient();
  const temperature = getOptionalOpenAiTemperature();
  const completion = await client.chat.completions.create({
    model: getModel(),
    response_format: { type: "json_object" },
    ...(temperature !== undefined ? { temperature } : {}),
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

// Gemini を優先し、失敗時またはキー未設定時は OpenAI にフォールバック
export async function callJsonChat(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  let geminiError: Error | undefined;

  if (hasGemini) {
    try {
      return await callGeminiJsonChat(params);
    } catch (e) {
      geminiError = e instanceof Error ? e : new Error(String(e));
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[callJsonChat] Gemini failed, fallback:",
          geminiError.message,
        );
      }
    }
  }

  if (hasOpenAI) {
    try {
      return await callOpenAIJsonChat(params);
    } catch (e) {
      const openAIError = e instanceof Error ? e : new Error(String(e));
      if (geminiError) {
        throw new Error(
          `Gemini failed (${geminiError.message}); OpenAI failed (${openAIError.message})`
        );
      }
      throw openAIError;
    }
  }

  if (geminiError) {
    throw geminiError;
  }

  throw new Error("Neither OPENAI_API_KEY nor GEMINI_API_KEY is set");
}
