import { GoogleGenerativeAI } from "@google/generative-ai";

// シングルトン化されたクライアント
let cached: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

function getOptionalGeminiTemperature(): number | undefined {
  const raw = process.env.GEMINI_TEMPERATURE?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// OpenAI 側 callJsonChat と同様に JSON オブジェクトを返す
export async function callGeminiJsonChat(params: {
  system: string;
  user: string;
}): Promise<unknown> {
  const client = getGeminiClient();
  const temperature = getOptionalGeminiTemperature();
  const model = client.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: params.system,
    generationConfig: {
      responseMimeType: "application/json",
      ...(temperature !== undefined ? { temperature } : {}),
    },
  });
  const result = await model.generateContent(params.user);
  const text = result.response.text();
  if (!text) {
    throw new Error("AI returned an empty response");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI response is not valid JSON");
  }
}
