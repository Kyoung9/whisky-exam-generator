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
  /** 最終更新（クラウドの updated_at。ローカルのみのときは省略可） */
  updatedAt?: number;
  /** 任意のメモ */
  memo?: string;
  /** カテゴリのハイライト（カードのアバター表示用、最大2件まで描画） */
  categoryHints?: string[];
  /** 保存スナップショット — 元の生成リストから独立して凍結する */
  questions: GeneratedQuestion[];
  /** Supabase: 作成者（一覧・詳細表示用） */
  authorId?: string;
  authorDisplayName?: string | null;
  /** Supabase: 他ユーザーに一覧表示するか（未設定はローカルのみ） */
  isPublic?: boolean;
};
