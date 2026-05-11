import type { GeneratedQuestion } from "@/types/question";

/**
 * 「保存された試験セット」— /generate で生成した問題群を名前付きで保管したもの。
 * /sets 画面で一覧・PDF出力・削除を行う。
 */
export type ExamSet = {
  id: string;
  name: string;
  /** 作成 (= 保存) UNIX ms */
  createdAt: number;
  /** 任意のメモ */
  memo?: string;
  /** カテゴリのハイライト（カードのアバター表示用、最大2件まで描画） */
  categoryHints?: string[];
  /** 保存スナップショット — 元の生成リストから独立して凍結する */
  questions: GeneratedQuestion[];
};
