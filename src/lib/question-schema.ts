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

// AI が返す各問題の生データ。id と selected はサーバー側で付与する
export const aiQuestionSchema = z.object({
  body: z.string().min(1),
  type: questionTypeSchema,
  category: z.string().min(1),
  theme: z.string().min(1),
  choices: z.array(z.string()).optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: difficultySchema,
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
