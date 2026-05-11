// 共通の列挙型（README §4 準拠）

export type QuestionType =
  | "multiple_choice"
  | "true_false_count"
  | "map"
  | "timeline"
  | "matching"
  | "table"
  | "image_based";

export const QUESTION_TYPES: readonly QuestionType[] = [
  "multiple_choice",
  "true_false_count",
  "map",
  "timeline",
  "matching",
  "table",
  "image_based",
] as const;

export type Category =
  | "Scotch Whisky"
  | "Irish Whiskey"
  | "American Whiskey"
  | "Canadian Whisky"
  | "Japanese Whisky"
  | "World Whisky";

export const CATEGORIES: readonly Category[] = [
  "Scotch Whisky",
  "Irish Whiskey",
  "American Whiskey",
  "Canadian Whisky",
  "Japanese Whisky",
  "World Whisky",
] as const;

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"] as const;

export type ExamYear = 2021 | 2022 | 2023 | 2024;

export const EXAM_YEARS: readonly ExamYear[] = [2021, 2022, 2023, 2024] as const;

// 画像参照 (image_based 等で問題に画像が紐づく場合)
// imageRef は public/ 配下の静的アセット URL (例: "/exam-images/2024/q024.png")
export type QuestionImage = {
  imageRef: string;
  imageSourcePage?: number;
  imageDescription?: string;
};

// 過去問題データ（README §4.1 を実用拡張）
// subNumber: 同一の主番号に複数のサブ問題がある場合のラベル (例: "a", "b")
export type PastExamQuestion = {
  id: string;
  year: number;
  number: number;
  subNumber?: string;
  category: Category;
  type: QuestionType;
  theme: string;
  body: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  difficulty: Difficulty;
  imageRef?: string;
  imageSourcePage?: number;
  imageDescription?: string;
};

// 生成問題データ（README §4.2）
// 新規生成では画像を提供できないため imageRef は基本入らないが、
// 「類似」モードで原典の画像参照を引き継ぐ場合に備えて optional で保持する。
export type GeneratedQuestion = {
  id: string;
  body: string;
  type: QuestionType;
  category: string;
  theme: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  difficulty: Difficulty;
  selected: boolean;
  sourceQuestionId?: string;
  /**
   * AI が生成に「参照した過去問」集合（バッチ単位）。
   * 現状は個別 1 問ごとの厳密な参照元までは追跡できないため、
   * 生成リクエスト時に渡した過去問 id 群を保持する。
   */
  sourcePastExamIds?: string[];
  /** 地図再利用生成時: 図版の元となった過去問の id（例 we-2021-001-a） */
  pastMapAnchorId?: string;
  imageRef?: string;
  imageSourcePage?: number;
  imageDescription?: string;
};

// 日本語の表示ラベル（UI 用）
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "選択式",
  true_false_count: "正誤判定",
  map: "地図問題",
  timeline: "年表問題",
  matching: "マッチング",
  table: "表形式",
  image_based: "画像問題",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "やさしい",
  medium: "ふつう",
  hard: "むずかしい",
};
