import { redirect } from "next/navigation";

/*
 * /distill は /generate (実機能: 予想問題生成 + PDF) に統合済み。
 * 旧デモ画面に着地したユーザーをそのまま実機能ルートに誘導する。
 */
export default function DistillRedirect(): never {
  redirect("/generate");
}
