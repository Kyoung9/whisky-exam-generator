import { z } from "zod";
import {
  CATEGORIES,
  DIFFICULTIES,
  EXAM_YEARS,
  QUESTION_TYPES,
  type GeneratedQuestion,
} from "@/types/question";

// AI 出力検証用スキーマ（README §4.2 と整合）
const questionTypeSchema = z.enum(QUESTION_TYPES as readonly [string, ...string[]]);
const difficultySchema = z.enum(DIFFICULTIES as readonly [string, ...string[]]);

const statementTruthSchema = z.tuple([
  z.boolean(),
  z.boolean(),
  z.boolean(),
  z.boolean(),
]);

// AI が返す各問題の生データ。id と selected はサーバー側で付与する
export const aiQuestionSchema = z
  .object({
    body: z.string().min(8),
    type: questionTypeSchema,
    category: z.string().min(1),
    theme: z.string().min(1),
    choices: z.array(z.string()).optional(),
    answer: z.string().optional(),
    explanation: z.string().optional(),
    difficulty: difficultySchema,
    /** true_false_count のみ。各 choices 文が真なら true。 */
    statementTruth: statementTruthSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "image_based") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "image_based questions are not allowed for generated output",
        path: ["type"],
      });
    }

    if (data.type === "multiple_choice") {
      const choices = data.choices;
      if (!choices || choices.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'multiple_choice requires exactly 4 "choices"',
          path: ["choices"],
        });
        return;
      }
      const uniq = new Set(choices);
      if (uniq.size !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "multiple_choice choices must be unique",
          path: ["choices"],
        });
      }
      const ans = data.answer?.trim();
      if (!ans || !choices.includes(ans)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'multiple_choice "answer" must exactly match one of "choices"',
          path: ["answer"],
        });
      }
      if (data.statementTruth !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "statementTruth must be omitted unless type is true_false_count",
          path: ["statementTruth"],
        });
      }
      return;
    }

    if (data.type === "true_false_count") {
      const choices = data.choices;
      if (!choices || choices.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'true_false_count requires exactly 4 statement strings in "choices"',
          path: ["choices"],
        });
        return;
      }
      if (!data.statementTruth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'true_false_count requires "statementTruth" array of 4 booleans',
          path: ["statementTruth"],
        });
        return;
      }
      const trueCount = data.statementTruth.filter(Boolean).length;
      const expected = String(trueCount);
      const ans = data.answer?.trim();
      if (ans !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `true_false_count "answer" must be "${expected}" to match statementTruth (count of true statements)`,
          path: ["answer"],
        });
      }
      if (!["0", "1", "2", "3", "4"].includes(ans ?? "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'true_false_count "answer" must be "0", "1", "2", "3", or "4"',
          path: ["answer"],
        });
      }
      return;
    }

    if (data.statementTruth !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "statementTruth must be omitted unless type is true_false_count",
        path: ["statementTruth"],
      });
    }
  });

export type AiQuestion = z.infer<typeof aiQuestionSchema>;

export const aiResponseSchema = z.object({
  questions: z.array(aiQuestionSchema).min(1),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;

// 入力リクエスト用スキーマ
const examYearSchema = z
  .number()
  .int()
  .refine((v) => (EXAM_YEARS as readonly number[]).includes(v), {
    message: "invalid exam year",
  });

export const generateRequestSchema = z.object({
  years: z.array(examYearSchema).min(1),
  categories: z
    .array(z.enum(CATEGORIES as readonly [string, ...string[]]))
    .min(1),
  types: z.array(questionTypeSchema).min(1),
  count: z.number().int().min(1).max(30),
  difficulty: difficultySchema,
  includeExplanation: z.boolean(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const similarRequestSchema = z.object({
  source: z.object({
    body: z.string(),
    type: questionTypeSchema,
    category: z.string(),
    theme: z.string(),
    choices: z.array(z.string()).optional(),
    answer: z.string().optional(),
    explanation: z.string().optional(),
    difficulty: difficultySchema,
  }),
  count: z.number().int().min(1).max(10),
  mode: z.enum(["similar", "same_theme", "same_difficulty", "same_type"]),
  /** Default true: source answer is shown (learning). Set false to reduce parroting. */
  includeSourceAnswer: z.boolean().optional(),
});

export type SimilarRequest = z.infer<typeof similarRequestSchema>;

export const themeRequestSchema = z.object({
  theme: z.string().min(1).max(120),
  count: z.number().int().min(1).max(20),
  difficulty: difficultySchema,
  category: z.enum(CATEGORIES as readonly [string, ...string[]]).optional(),
  type: questionTypeSchema.optional(),
});

export type ThemeRequest = z.infer<typeof themeRequestSchema>;

// AI レスポンスを GeneratedQuestion[] に変換するヘルパ
export function toGeneratedQuestions(
  ai: AiResponse,
  options?: { sourceQuestionId?: string }
): GeneratedQuestion[] {
  return ai.questions.map((q) => ({
    id: crypto.randomUUID(),
    body: q.body,
    type: q.type as GeneratedQuestion["type"],
    category: q.category,
    theme: q.theme,
    choices: q.choices,
    answer: q.answer,
    explanation: q.explanation,
    difficulty: q.difficulty as GeneratedQuestion["difficulty"],
    selected: true,
    sourceQuestionId: options?.sourceQuestionId,
  }));
}
