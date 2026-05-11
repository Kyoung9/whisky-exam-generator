import type {
  Category,
  Difficulty,
  PastExamQuestion,
  QuestionType,
} from "@/types/question";

// すべてのプロンプトは英語で記述する（コーディングルール）

const BASE_SYSTEM = `You are an expert in Japanese whisky exams (ウイスキーエキスパート).
Your task is to generate practice exam questions in Japanese, modeled after past exam questions.

Strict requirements:
- All natural language fields ("body", "choices", "answer", "explanation", "theme", "category") MUST be written in Japanese.
- The "category" field must be one of: "Scotch Whisky", "Irish Whiskey", "American Whiskey", "Canadian Whisky", "Japanese Whisky", "World Whisky".
- The "type" field must be one of: "multiple_choice", "true_false_count", "map", "timeline", "matching", "table".
- The "difficulty" field must be one of: "easy", "medium", "hard".
- Output MUST be a single valid JSON object of the form: { "questions": [ ... ] }.
- DO NOT include markdown, code fences, comments, or any text outside the JSON.
- Do NOT copy past questions verbatim. Generate new questions with the same intent and format.
- For "multiple_choice", provide 4 plausible "choices" and a single correct "answer" that exactly matches one of the choices.
- For "true_false_count" provide 4 statements as "choices" and put the count of true statements (e.g. "2") in "answer".
- For "matching" / "timeline" / "table": describe the question in "body" using text only, without external image URLs.
- For "map": If the user message includes a "REFERENCE MAP" block, every type="map" question you output is for that SAME printed figure. Write Japanese like real exams (e.g. 右の地図の中から… / 番号を答えなさい). The numbered markers on the figure are fixed — invent NEW place or distillery names appropriate to the map region; do not copy the reference item verbatim. "answer" must be exactly one string that appears in "choices". Do not output image URLs; the app attaches the file.
- For "map", you MUST always include a "choices" array: list every circled marker on the map that the examinee can pick from, lowest to highest, each entry a single label as printed (e.g. ["①", "②", "③", ...]). Derive how many markers and which symbols (circled vs Arabic) from the REFERENCE MAP description and the example stem style in the user message; if the description gives a range like ①〜⑮, include exactly that many strings. This mirrors the map legend for on-screen lists and PDFs even though the real booklet shows numbers on the figure.
- If there is NO reference map in the user message, still include "choices" as a plausible ordered list of map markers (e.g. ① through ⑫) matching what you describe in "body", and set "answer" to one of them.
- DO NOT generate "image_based" questions. We cannot supply visual assets for newly generated questions. If a past question of type "image_based" is provided as inspiration, convert the visual content into a fully text-based question (e.g., type="multiple_choice") that captures the same testing intent without requiring an image.`;

// 過去問題を AI に渡せるサイズに圧縮する。
// 画像が紐づく問題は imageDescription を併記し、画像なしでも文脈が伝わるようにする。
function summarizePastQuestions(qs: PastExamQuestion[]): string {
  if (qs.length === 0) {
    return "(No past questions available. Use general knowledge of Japanese whisky exams.)";
  }
  return qs
    .map((q) => {
      const idTag = `#${q.number}${q.subNumber ? `-${q.subNumber}` : ""}`;
      const lines = [
        `- [${q.year} ${idTag}] (${q.category} / ${q.type} / ${q.difficulty}) theme=${q.theme}`,
        `  Q: ${q.body}`,
      ];
      if (q.imageDescription) {
        lines.push(`  Image (visual context): ${q.imageDescription}`);
      }
      if (q.choices) lines.push(`  choices: ${q.choices.join(" | ")}`);
      if (q.answer) lines.push(`  A: ${q.answer}`);
      return lines.join("\n");
    })
    .join("\n");
}

function mapReferenceUserBlock(anchor: PastExamQuestion): string {
  const idTag = `${anchor.year} #${anchor.number}${anchor.subNumber ? `-${anchor.subNumber}` : ""}`;
  return `
REFERENCE MAP (fixed figure reused for all type="map" questions in this batch):
- Past exam item: ${idTag} (${anchor.category})
- What the map shows (for wording only; do not reveal answers): ${anchor.imageDescription ?? "(no description)"}
- Example stem style from that exam (do not copy the asked location or answer): ${anchor.body.replace(/\n/g, " ").slice(0, 400)}${anchor.body.length > 400 ? "…" : ""}

All generated type="map" questions MUST refer to this same figure (same layout and numbering). Vary only what is being asked (different labels).`;
}

export function buildGeneratePrompt(input: {
  pastQuestions: PastExamQuestion[];
  categories: Category[];
  types: QuestionType[];
  count: number;
  difficulty: Difficulty;
  includeExplanation: boolean;
  /** 画像付き過去 map を 1 問選び、生成 map に同一 imageRef を付与する */
  mapAnchor?: PastExamQuestion | null;
}): { system: string; user: string } {
  const mapBlock =
    input.types.includes("map") && input.mapAnchor
      ? mapReferenceUserBlock(input.mapAnchor)
      : "";

  const user = `Generate ${input.count} new practice questions for the Japanese whisky expert exam.

Constraints:
- Allowed categories: ${input.categories.join(", ")}
- Allowed question types: ${input.types.join(", ")}
- Target difficulty: ${input.difficulty}
- ${input.includeExplanation ? "Include a detailed Japanese 'explanation' for every question." : "You may omit 'explanation' if not needed."}
- Distribute questions across the allowed categories and types as evenly as practical.
${mapBlock}
- Reflect the trend and tone of the following past questions, but produce ORIGINAL questions:

${summarizePastQuestions(input.pastQuestions)}

Return JSON: { "questions": [ ... ] } only.`;
  return { system: BASE_SYSTEM, user };
}

export function buildSimilarPrompt(input: {
  source: {
    body: string;
    type: QuestionType;
    category: string;
    theme: string;
    choices?: string[];
    answer?: string;
    explanation?: string;
    difficulty: Difficulty;
    imageRef?: string;
    imageDescription?: string;
  };
  count: number;
  mode: "similar" | "same_theme" | "same_difficulty" | "same_type";
  includeSourceAnswer?: boolean;
}): { system: string; user: string } {
  const showAnswer = input.includeSourceAnswer !== false;
  const modeInstruction: Record<typeof input.mode, string> = {
    similar:
      "Generate questions that test the same intent and format. Vary surface details (specific distilleries, years, statements) so the new questions are not duplicates.",
    same_theme: `Generate questions on the same theme ("${input.source.theme}"). Vary type and angle freely.`,
    same_difficulty: `Generate questions of the same difficulty ("${input.source.difficulty}"). Vary topic freely within Japanese whisky exam scope.`,
    same_type: `Generate questions of the same type ("${input.source.type}"). Vary topic freely within Japanese whisky exam scope.`,
  };

  const mapRef =
    input.source.type === "map" &&
    (input.source.imageDescription || input.source.imageRef)
      ? `
REFERENCE MAP: The learner sees the SAME printed map as the source.
${input.source.imageDescription ? `Figure (for wording only): ${input.source.imageDescription}` : "Infer the map layout from the source body."}
Generate type="map" items that ask about DIFFERENT places than the source; keep the same numbering style in "answer".`
      : "";

  const user = `Generate ${input.count} new questions modeled on the following source question.

Mode: ${input.mode}
${modeInstruction[input.mode]}
${mapRef}

Source question:
- category: ${input.source.category}
- theme: ${input.source.theme}
- type: ${input.source.type}
- difficulty: ${input.source.difficulty}
- body: ${input.source.body}
${input.source.choices ? `- choices: ${input.source.choices.join(" | ")}` : ""}
${showAnswer && input.source.answer ? `- answer: ${input.source.answer}` : ""}
${showAnswer && input.source.explanation ? `- explanation: ${input.source.explanation}` : ""}

Return JSON: { "questions": [ ... ] } only.`;
  return { system: BASE_SYSTEM, user };
}

export function buildThemePrompt(input: {
  theme: string;
  count: number;
  difficulty: Difficulty;
  category?: Category;
  type?: QuestionType;
  pastQuestionSamples?: PastExamQuestion[];
  mapAnchor?: PastExamQuestion | null;
}): { system: string; user: string } {
  const samplesBlock =
    input.pastQuestionSamples && input.pastQuestionSamples.length > 0
      ? `

Use the tone and difficulty of these real past questions as reference (do not copy verbatim):

${summarizePastQuestions(input.pastQuestionSamples)}`
      : "";

  const mapBlock =
    input.type === "map" && input.mapAnchor
      ? mapReferenceUserBlock(input.mapAnchor)
      : "";

  const user = `Generate ${input.count} new Japanese whisky exam questions focused on the following theme.

- theme: ${input.theme}
- difficulty: ${input.difficulty}
${input.category ? `- category: ${input.category}` : "- category: choose the most appropriate one"}
${input.type ? `- type: ${input.type}` : "- type: choose the most natural type for the theme"}${mapBlock}${samplesBlock}

Return JSON: { "questions": [ ... ] } only.`;
  return { system: BASE_SYSTEM, user };
}
