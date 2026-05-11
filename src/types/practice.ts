import type { QuestionType } from "@/types/question";

/** テイスティング画面の出題ソース */
export type PracticeSourceMode = "past" | "generated" | "mix";

/** 1 問分の演習用データ（過去問または生成問題を正規化） */
export type PracticeItem = {
  id: string;
  source: "past" | "generated";
  year?: number;
  body: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  type: QuestionType;
  imageRef?: string;
  imageDescription?: string;
};
