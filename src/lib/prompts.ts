import type {
  Category,
  Difficulty,
  PastExamQuestion,
  QuestionType,
} from "@/types/question";

// すべてのプロンプトは英語で記述する（コーディングルール）

const QUALITY_RUBRIC = `
Quality and pedagogy (must follow):
- Ground every question in topics that are within the mainstream Japanese whisky expert exam scope (official syllabus tone, widely used textbooks, and association-style knowledge). Avoid inventing precise years, statistics, or obscure claims you are unsure about; prefer well-established facts or clearly qualified wording in Japanese (e.g. 一般的に〜とされる).
- For "multiple_choice": wrong options must be plausible and confusable with the correct answer (same topic family: similar distillery or region names, similar process steps, or numerically close values). Do not use obviously unrelated distractors.
- Difficulty calibration: "easy" = definitions and basic facts; "medium" = comparisons, conditional knowledge, or moderate inference; "hard" = multi-step reasoning, fine-grained regulations, or combining several facts. Align each question's "difficulty" field with this rubric and the requested target difficulty.
- For "true_false_count": each of the 4 statements must be unambiguously true or false on its own. You MUST include a field "statementTruth" on each such question: an array of exactly 4 booleans, where each entry is true if the corresponding statement in "choices" (same order) is true, false if false. The "answer" field MUST be the decimal string count of true statements (e.g. "0", "1", "2", "3", "4") and MUST equal the number of true values in "statementTruth".
- When an "explanation" is required: briefly state why the correct answer is right and why the other options (or false statements) are wrong, in Japanese.`;

const BASE_SYSTEM = `You are an expert in Japanese whisky exams (ウイスキーエキスパート).
Your task is to generate practice exam questions in Japanese, modeled after past exam questions.
${QUALITY_RUBRIC}

Strict requirements:
- All natural language fields ("body", "choices", "answer", "explanation", "theme", "category") MUST be written in Japanese.
- The "category" field must be one of: "Scotch Whisky", "Irish Whiskey", "American Whiskey", "Canadian Whisky", "Japanese Whisky", "World Whisky".
- The "type" field must be one of: "multiple_choice", "true_false_count", "map", "timeline", "matching", "table".
- The "difficulty" field must be one of: "easy", "medium", "hard".
- Output MUST be a single valid JSON object of the form: { "questions": [ ... ] }.
- DO NOT include markdown, code fences, comments, or any text outside the JSON.
- Do NOT copy past questions verbatim. Generate new questions with the same intent and format.
- For "multiple_choice", provide 4 plausible "choices" and a single correct "answer" that exactly matches one of the choices (identical string).
- For "true_false_count" provide 4 statements as "choices", put the count of true statements as a string in "answer", and include "statementTruth" as specified above.
- For "matching" / "timeline" / "table" / "map": describe the question in "body" using text only, without external image URLs.
- For types other than "true_false_count", omit the "statementTruth" field entirely.
- DO NOT generate "image_based" questions. We cannot supply visual assets for newly generated questions. If a past question of type "image_based" is provided as inspiration, convert the visual content into a fully text-based question (e.g., type="multiple_choice") that captures the same testing intent without requiring an image.`;

// 過去問題を AI に渡せるサイズに圧縮する。
// 画像が紐づく問題は imageDescription を併記し、画像なしでも文脈が伝わるようにする。
export function summarizePastQuestions(qs: PastExamQuestion[]): string {
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

export function buildGeneratePrompt(input: {
  pastQuestions: PastExamQuestion[];
  categories: Category[];
  types: QuestionType[];
  count: number;
  difficulty: Difficulty;
  includeExplanation: boolean;
}): { system: string; user: string } {
  const user = `Generate ${input.count} new practice questions for the Japanese whisky expert exam.

Constraints:
- Allowed categories: ${input.categories.join(", ")}
- Allowed question types: ${input.types.join(", ")}
- Target difficulty: ${input.difficulty}
- ${input.includeExplanation ? "Include a detailed Japanese 'explanation' for every question (why correct + why others wrong where applicable)." : "You may omit 'explanation' if not needed."}
- Distribute questions across the allowed categories and types as evenly as practical.
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
  };
  count: number;
  mode: "similar" | "same_theme" | "same_difficulty" | "same_type";
  /** If false, the source answer is omitted so the model cannot parrot the same key. Default true (learning mode). */
  includeSourceAnswer?: boolean;
}): { system: string; user: string } {
  const includeAnswer = input.includeSourceAnswer !== false;

  const modeInstruction: Record<typeof input.mode, string> = {
    similar:
      "Generate questions that test the same intent and format. Vary surface details (specific distilleries, years, statements) so the new questions are not duplicates. Do not reuse the same correct option position pattern or the exact trick of the source; change the substantive fact being tested.",
    same_theme: `Generate questions on the same theme ("${input.source.theme}"). Vary type and angle freely.`,
    same_difficulty: `Generate questions of the same difficulty ("${input.source.difficulty}"). Vary topic freely within Japanese whisky exam scope.`,
    same_type: `Generate questions of the same type ("${input.source.type}"). Vary topic freely within Japanese whisky exam scope.`,
  };

  const user = `Generate ${input.count} new questions modeled on the following source question.

Mode: ${input.mode}
${modeInstruction[input.mode]}

Source question:
- category: ${input.source.category}
- theme: ${input.source.theme}
- type: ${input.source.type}
- difficulty: ${input.source.difficulty}
- body: ${input.source.body}
${input.source.choices ? `- choices: ${input.source.choices.join(" | ")}` : ""}
${includeAnswer && input.source.answer ? `- answer: ${input.source.answer}` : includeAnswer ? "" : "(Source answer withheld on purpose — infer the tested knowledge from the stem and choices only.)"}
${input.source.explanation ? `- explanation (reference): ${input.source.explanation}` : ""}

Return JSON: { "questions": [ ... ] } only.`;
  return { system: BASE_SYSTEM, user };
}

export function buildThemePrompt(input: {
  theme: string;
  count: number;
  difficulty: Difficulty;
  category?: Category;
  type?: QuestionType;
  /** Short stratified samples from real past exams (same difficulty band) to stabilize tone. */
  pastQuestionSamples?: PastExamQuestion[];
}): { system: string; user: string } {
  const samplesBlock =
    input.pastQuestionSamples && input.pastQuestionSamples.length > 0
      ? `
Past exam questions for tone and difficulty reference only (do NOT copy; write new items on the user theme):
${summarizePastQuestions(input.pastQuestionSamples)}
`
      : "";

  const user = `Generate ${input.count} new Japanese whisky exam questions focused on the following theme.

- theme: ${input.theme}
- difficulty: ${input.difficulty}
${input.category ? `- category: ${input.category}` : "- category: choose the most appropriate one"}
${input.type ? `- type: ${input.type}` : "- type: choose the most natural type for the theme"}
${samplesBlock}
Return JSON: { "questions": [ ... ] } only.`;
  return { system: BASE_SYSTEM, user };
}

/** Second-pass reviewer: fix consistency, distractors, and JSON shape. */
export function buildReviewPrompt(rawJsonText: string): { system: string; user: string } {
  const system = `You are a strict editor for Japanese whisky expert exam practice questions.
Your job is to revise a JSON object so it fully complies with the generator rules: Japanese text fields, valid categories and types, strong plausible distractors for multiple_choice, correct "answer" matching one choice exactly for MC, and for true_false_count a correct "statementTruth" array of 4 booleans matching the "answer" count string.
Remove the "statementTruth" field from any question whose type is not "true_false_count".
Do not change the number of questions. Do not add markdown. Output ONLY valid JSON: { "questions": [ ... ] }.`;

  const user = `Revise the following JSON in place. Fix any internal inconsistencies, weak distractors, or mismatches between statementTruth and answer. Preserve the same number of questions.

${rawJsonText}`;

  return { system, user };
}
